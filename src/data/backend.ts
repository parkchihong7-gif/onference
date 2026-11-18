/**
 * 데이터 백엔드 추상화
 *
 * - 로컬 모드: 브라우저에만 저장(1인용·데모). 설정이 없으면 자동으로 이 모드가 된다.
 * - 공유 모드: Firestore 에 저장. 여러 담당자가 같은 데이터를 실시간으로 함께 본다.
 *
 * 두 모드 모두 같은 Mutation 목록을 받아 처리하므로 화면 코드는 동일하다.
 */
import type { AppState } from '../types'
import type { Mutation } from './mutations'
import { applyMutations } from './mutations'
import { initialState } from './seed'

export type BackendMode = '로컬' | '공유'

export interface SessionUser {
  uid: string
  name: string
  email: string
  photo?: string
  /** members 컬렉션에 등록된 역할 (미등록이면 접근 불가) */
  role?: string
  memberId?: string
}

export interface BackendStatus {
  mode: BackendMode
  /** 공유 모드에서 데이터 구독이 살아 있는가 */
  connected: boolean
  /** 로그인 필요 여부 (공유 모드 전용) */
  needsSignIn: boolean
  user?: SessionUser
  /** 저장 대기 중인 변경 수 — 네트워크가 끊겨도 Firestore 가 큐에 쌓아 둔다 */
  pending: number
  error?: string
  /** 공유 모드에서 최근 활동 중인 사용자 */
  activeUsers?: { name: string; at: string }[]
}

export interface Invite {
  email: string
  name: string
  role: string
  org?: string
  invitedAt?: string
}

export interface Backend {
  readonly mode: BackendMode
  start(onState: (s: AppState) => void, onStatus: (st: BackendStatus) => void): Promise<void>
  write(muts: Mutation[]): Promise<void>
  signIn?(): Promise<void>
  signOut?(): Promise<void>
  reset?(): Promise<void>
  /** 공유 모드 전용 — 구성원 초대·회수 */
  listInvites?(): Promise<Invite[]>
  invite?(invite: Invite): Promise<void>
  revokeInvite?(email: string): Promise<void>
  stop(): void
}

/* ─────────────────────────── 로컬(브라우저) 백엔드 ─────────────────────────── */

const STORAGE_KEY = 'onference.state.v2'
/** 같은 브라우저의 다른 탭과는 즉시 동기화한다(동일 기기 한정) */
const CHANNEL = 'onference.sync'

export class LocalBackend implements Backend {
  readonly mode = '로컬' as const
  private state: AppState = initialState
  private onState?: (s: AppState) => void
  private onStatus?: (st: BackendStatus) => void
  private channel?: BroadcastChannel

  async start(onState: (s: AppState) => void, onStatus: (st: BackendStatus) => void) {
    this.onState = onState
    this.onStatus = onStatus
    void this.onStatus
    this.state = this.load()
    onState(this.state)
    onStatus({ mode: '로컬', connected: true, needsSignIn: false, pending: 0 })
    try {
      this.channel = new BroadcastChannel(CHANNEL)
      this.channel.onmessage = ev => {
        if (ev.data?.type === 'state') {
          this.state = ev.data.state as AppState
          this.onState?.(this.state)
        }
      }
    } catch { /* BroadcastChannel 미지원 환경은 무시 */ }
  }

  async write(muts: Mutation[]) {
    this.state = applyMutations(this.state, muts)
    this.onState?.(this.state)
    this.persist()
    try { this.channel?.postMessage({ type: 'state', state: this.state }) } catch { /* noop */ }
  }

  async reset() {
    this.state = initialState
    this.onState?.(this.state)
    this.persist()
  }

  stop() { try { this.channel?.close() } catch { /* noop */ } }

  private load(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return initialState
      const parsed = JSON.parse(raw) as AppState
      if (parsed.version !== initialState.version) return initialState
      return parsed
    } catch { return initialState }
  }

  private persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)) } catch { /* 저장 실패는 무시 */ }
  }
}
