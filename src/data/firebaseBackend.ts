/**
 * Firestore 공유 백엔드
 *
 * - 컬렉션 = AppState 의 배열 필드. 문서 단위로 저장하므로 두 사람이 서로 다른 연자를
 *   동시에 수정해도 덮어쓰지 않는다.
 * - onSnapshot 으로 변경이 즉시 모든 참여자 화면에 반영된다.
 * - 접근 권한은 members/{uid} 문서 존재 여부로 판정한다(초대받지 않은 계정은 읽기 불가).
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect,
  signOut as fbSignOut, type Auth, type User,
} from 'firebase/auth'
import {
  collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, onSnapshot,
  persistentLocalCache, persistentMultipleTabManager, serverTimestamp,
  setDoc, writeBatch, type Firestore,
} from 'firebase/firestore'
import type { AppState, Member } from '../types'
import type { Backend, BackendStatus, Invite, SessionUser } from './backend'
import { COLLECTIONS, type CollectionKey, type Mutation } from './mutations'
import { initialState } from './seed'
import type { FirebaseConfig, RuntimeConfig } from '../config'

/** 상태 배열을 비우고 시작해 구독으로 채운다 */
function emptyState(): AppState {
  const s = { ...initialState }
  COLLECTIONS.forEach(c => { (s as unknown as Record<string, unknown>)[c] = [] })
  return s
}

const ORDERED_DESC: CollectionKey[] = ['auditLogs', 'comments', 'communications']

/**
 * 접속하자마자 받지 않고, 해당 화면을 열 때 처음 받는 컬렉션.
 * 대시보드가 쓰지 않는 데이터만 넣는다(화면에 빈칸이 보이면 안 되므로).
 *   communications → 연자 상세, auditLogs → 변경 이력, comments·attachments → 문서·회의록
 */
const DEFERRED: CollectionKey[] = ['communications', 'auditLogs', 'comments', 'attachments']
const EAGER: CollectionKey[] = COLLECTIONS.filter(c => !DEFERRED.includes(c))

export class FirebaseBackend implements Backend {
  readonly mode = '공유' as const
  private app: FirebaseApp
  private db: Firestore
  private auth: Auth
  private config: RuntimeConfig
  private state: AppState = emptyState()
  private onState?: (s: AppState) => void
  private onStatus?: (st: BackendStatus) => void
  private unsubs: (() => void)[] = []
  private subscribed = new Set<CollectionKey>()
  private wanted = new Set<CollectionKey>()
  private loaded = new Set<CollectionKey>()
  private user?: SessionUser
  private pending = 0

  constructor(config: RuntimeConfig) {
    this.config = config
    this.app = initializeApp(config.firebase as FirebaseConfig)
    // 로컬 캐시(IndexedDB)를 켠다. 두 번째 접속부터는 바뀐 문서만 받아오므로
    // 읽기 횟수가 급격히 줄고(= 요금), 새로고침도 즉시 그려진다.
    this.db = initializeFirestore(this.app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
    this.auth = getAuth(this.app)
  }

  async start(onState: (s: AppState) => void, onStatus: (st: BackendStatus) => void) {
    this.onState = onState
    this.onStatus = onStatus
    this.emitStatus({ connected: false, needsSignIn: true })

    onAuthStateChanged(this.auth, async (u: User | null) => {
      this.detach()
      if (!u) {
        this.user = undefined
        this.emitStatus({ connected: false, needsSignIn: true })
        return
      }
      const domain = this.config.allowedDomain
      if (domain && !(u.email ?? '').endsWith(`@${domain}`)) {
        await fbSignOut(this.auth)
        this.emitStatus({ connected: false, needsSignIn: true, error: `${domain} 계정으로만 로그인할 수 있습니다.` })
        return
      }
      // 초대된 사용자인지 확인 (members/{uid}), 없으면 초대장(memberInvites/{email})으로 승격
      let member: Member | undefined
      let joinError = ''
      try {
        const snap = await getDoc(doc(this.db, 'members', u.uid))
        if (snap.exists()) member = snap.data() as Member
        else member = await this.claimInvite(u)
      } catch (e) {
        // 원인을 숨기면 "초대되지 않았습니다" 로만 보여 해결이 어려워진다
        const err = e as { code?: string; message?: string }
        joinError = err.code === 'permission-denied'
          ? '접근 규칙이 이 계정을 거부했습니다. 초대장의 이메일이 로그인한 계정과 같은지 확인하세요.'
          : `확인 중 오류가 발생했습니다 (${err.code ?? ''} ${err.message ?? ''})`.trim()
      }

      this.user = {
        uid: u.uid, name: member?.name ?? u.displayName ?? u.email ?? '사용자',
        email: u.email ?? '', photo: u.photoURL ?? undefined,
        role: member?.role, memberId: member ? u.uid : undefined,
      }
      if (!member) {
        this.emitStatus({
          connected: false, needsSignIn: false,
          error: joinError || '이 계정은 아직 초대되지 않았습니다. 사무국 담당자에게 접근 권한을 요청하세요.',
        })
        return
      }
      this.attach()
      void this.touchPresence()
    })
  }

  /** 초대장이 있으면 본인 멤버 문서를 만들어 접근 권한을 확정한다 */
  private async claimInvite(u: User): Promise<Member | undefined> {
    const email = (u.email ?? '').toLowerCase()
    if (!email) return undefined
    const invite = await getDoc(doc(this.db, 'memberInvites', email))
    if (!invite.exists()) return undefined
    // 여기서부터는 초대장이 확인된 상태이므로, 실패하면 그대로 올려보내 원인을 표시한다
    const data = invite.data() as { name?: string; role: string; org?: string; phone?: string }
    const member: Member = {
      id: u.uid,
      name: data.name || u.displayName || email,
      role: data.role as Member['role'],
      org: data.org ?? '',
      email,
      phone: data.phone,
    }
    await setDoc(doc(this.db, 'members', u.uid), member)
    return member
  }

  /** 화면에 필요한 컬렉션만 구독한다 */
  private attach() {
    this.state = emptyState()
    this.loaded.clear()
    this.subscribed.clear()
    this.subscribe([...EAGER, ...this.wanted])
  }

  /**
   * 아직 받지 않은 컬렉션을 지금 받는다(해당 화면을 처음 열 때 호출된다).
   * 로그인 전이면 요청만 기록해 두고, 로그인 직후 함께 구독한다.
   */
  ensure(cols: CollectionKey[]) {
    const next = cols.filter(c => !this.wanted.has(c))
    next.forEach(c => this.wanted.add(c))
    if (!this.user?.memberId) return
    this.subscribe(next.filter(c => !this.subscribed.has(c)))
  }

  private subscribe(cols: CollectionKey[]) {
    cols.forEach(col => {
      if (this.subscribed.has(col)) return
      this.subscribed.add(col)
      const unsub = onSnapshot(collection(this.db, col),
        snap => {
          const list: Record<string, unknown>[] = snap.docs.map(d => ({ ...(d.data() as Record<string, unknown>), id: d.id }))
          if (ORDERED_DESC.includes(col)) {
            const key = (x: Record<string, unknown>) => String(x.at ?? x.sentAt ?? x.createdAt ?? '')
            list.sort((a, b) => key(b).localeCompare(key(a)))
          }
          ;(this.state as unknown as Record<string, unknown>)[col] = list
          this.loaded.add(col)
          this.pending = snap.metadata.hasPendingWrites ? this.pending : 0
          this.state = { ...this.state }
          // 첫 로딩이 끝나기 전에도 화면을 그린다(빈 목록 → 점진적으로 채워짐)
          this.onState?.(this.withSession(this.state))
          this.emitStatus({ connected: this.loaded.size >= EAGER.length, needsSignIn: false })
        },
        err => this.emitStatus({ connected: false, needsSignIn: false, error: `데이터 구독 실패: ${err.message}` }),
      )
      this.unsubs.push(unsub)
    })
  }

  /** 로그인한 사용자를 현재 사용자로 맞춘다 */
  private withSession(s: AppState): AppState {
    if (!this.user?.memberId) return s
    const exists = s.members.some(m => m.id === this.user!.memberId)
    return { ...s, currentUserId: exists ? this.user.memberId! : s.currentUserId }
  }

  private detach() {
    this.unsubs.forEach(u => { try { u() } catch { /* noop */ } })
    this.unsubs = []
    this.subscribed.clear()
  }

  async write(muts: Mutation[]) {
    if (!muts.length) return
    if (!this.user?.memberId) throw new Error('로그인이 필요합니다.')
    this.pending += muts.length
    this.emitStatus({ connected: true, needsSignIn: false })
    const batch = writeBatch(this.db)
    for (const m of muts) {
      const ref = doc(this.db, m.col, m.id)
      if (m.kind === 'delete') batch.delete(ref)
      else if (m.kind === 'set') batch.set(ref, { ...m.data, _updatedAt: serverTimestamp(), _updatedBy: this.user.name })
      else batch.update(ref, { ...m.data, _updatedAt: serverTimestamp(), _updatedBy: this.user.name })
    }
    try {
      await batch.commit()
    } finally {
      this.pending = Math.max(0, this.pending - muts.length)
      this.emitStatus({ connected: true, needsSignIn: false })
    }
  }

  /** 누가 보고 있는지 표시하기 위한 최소 기록 */
  private async touchPresence() {
    if (!this.user) return
    try {
      await setDoc(doc(this.db, 'presence', this.user.uid), {
        name: this.user.name, at: new Date().toISOString(), role: this.user.role ?? '',
      }, { merge: true })
    } catch { /* presence 는 실패해도 무시 */ }
  }

  async signIn() {
    const provider = new GoogleAuthProvider()
    if (this.config.allowedDomain) provider.setCustomParameters({ hd: this.config.allowedDomain })
    try {
      await signInWithPopup(this.auth, provider)
    } catch {
      // 팝업이 차단되는 환경(모바일 앱 내 브라우저 등)은 리디렉션으로 대체
      await signInWithRedirect(this.auth, provider)
    }
  }

  async signOut() {
    this.detach()
    await fbSignOut(this.auth)
  }

  stop() { this.detach() }

  /* ── 구성원 초대 (사무국 권한) ───────────────────────────────── */

  async listInvites(): Promise<Invite[]> {
    const snap = await getDocs(collection(this.db, 'memberInvites'))
    return snap.docs.map(d => ({ email: d.id, ...(d.data() as Omit<Invite, 'email'>) }))
  }

  async invite(invite: Invite) {
    const email = invite.email.trim().toLowerCase()
    await setDoc(doc(this.db, 'memberInvites', email), {
      ...invite, email, invitedAt: new Date().toISOString(),
    })
  }

  async revokeInvite(email: string) {
    await deleteDoc(doc(this.db, 'memberInvites', email.trim().toLowerCase()))
  }

  private emitStatus(partial: Partial<BackendStatus> & { connected: boolean; needsSignIn: boolean }) {
    this.onStatus?.({
      mode: '공유', user: this.user, pending: this.pending, ...partial,
    })
  }
}
