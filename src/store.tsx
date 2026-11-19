import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Abstract, AppState, Comment, Communication, Conference, CreditProgram, Deliverable, Doc,
  ModuleKey, PipelineStage, Registration, Session, Speaker, Sponsor, Task, VisaStage,
} from './types'
import { initialState } from './data/seed'
import { LocalBackend } from './data/backend'
import type { Backend, BackendStatus, Invite } from './data/backend'
import { applyMutations, isLocalOnly, mutationsFor } from './data/mutations'
import type { CollectionKey } from './data/mutations'
import { hasSharedBackend, loadConfig } from './config'

export type Action =
  | { type: 'SET_CONFERENCE'; id: string }
  | { type: 'SET_USER'; id: string }
  // audit.field 를 생략하면 바뀐 항목을 자동으로 찾아 이력에 남긴다
  | { type: 'PATCH_SPEAKER'; id: string; patch: Partial<Speaker>; audit?: { field?: string; before?: string; after?: string; memo?: string } }
  | { type: 'SET_STAGE'; id: string; stage: PipelineStage }
  | { type: 'SET_VISA_STAGE'; id: string; stage: VisaStage }
  | { type: 'PATCH_DELIVERABLE'; speakerId: string; deliverableId: string; patch: Partial<Deliverable> }
  | { type: 'PATCH_TASK'; id: string; patch: Partial<Task> }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'ADD_COMM'; comm: Communication }
  | { type: 'ADD_DOC'; doc: Doc }
  | { type: 'UPDATE_DOC'; id: string; patch: Partial<Doc> }
  | { type: 'DELETE_DOC'; id: string }
  | { type: 'ADD_COMMENT'; comment: Comment }
  | { type: 'TOGGLE_COMMENT'; id: string }
  | { type: 'PATCH_ABSTRACT'; id: string; patch: Partial<Abstract> }
  | { type: 'ADD_ABSTRACTS'; abstracts: Abstract[] }
  | { type: 'DELETE_ABSTRACT'; id: string }
  | { type: 'PATCH_REGISTRATION'; id: string; patch: Partial<Registration> }
  | { type: 'PATCH_SPONSOR'; id: string; patch: Partial<Sponsor> }
  | { type: 'ADD_SPONSOR'; sponsor: Sponsor }
  | { type: 'DELETE_SPONSOR'; id: string }
  | { type: 'ADD_CREDIT'; credit: CreditProgram }
  | { type: 'PATCH_CREDIT'; id: string; patch: Partial<CreditProgram> }
  | { type: 'ADD_CONFERENCE'; conference: Conference; sessions: Session[]; tasks: Task[] }
  | { type: 'PATCH_CONFERENCE'; id: string; patch: Partial<Conference> }
  | { type: 'ADD_SPEAKER'; speaker: Speaker; tasks: Task[] }
  | { type: 'ADD_SESSION'; session: Session }
  | { type: 'PATCH_SESSION'; id: string; patch: Partial<Session> }
  | { type: 'DELETE_SESSION'; id: string }
  | { type: 'DELETE_SPEAKER'; id: string }
  | { type: 'TOGGLE_MODULE'; conferenceId: string; module: ModuleKey }
  | { type: 'RESET' }


/* ───────────────────────────── 저장소(Provider) ─────────────────────────────
   화면은 dispatch 만 호출한다. 액션은 Mutation 으로 바뀌어
   로컬 저장소 또는 공유 백엔드(Firestore)에 동일하게 적용된다. */

interface Ctx {
  state: AppState
  dispatch: (action: Action) => void
  status: BackendStatus
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  reset: (next?: AppState) => Promise<void>
  ensure: (cols: CollectionKey[]) => void
  /** 공유 모드 전용 — 구성원 초대 관리 */
  invites: {
    supported: boolean
    list: () => Promise<Invite[]>
    add: (invite: Invite) => Promise<void>
    revoke: (email: string) => Promise<void>
  }
}

const AppCtx = createContext<Ctx | null>(null)

const LOCAL_STATUS: BackendStatus = { mode: '로컬', connected: true, needsSignIn: false, pending: 0 }

/**
 * 어떤 행사를 보고 있는지 / 누구로 보고 있는지는 "내 화면의 선택"이지 공유 데이터가 아니다.
 * 백엔드 스냅샷에는 다른 사람이 고른 값이 담겨 오므로, 내 선택을 덮어쓰지 않도록 따로 보관한다.
 */
const VIEW_KEY = 'onference.view'
type View = { conferenceId?: string; userId?: string }
const loadView = (): View => {
  try { return JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}') as View } catch { return {} }
}
const saveView = (v: View) => {
  try { localStorage.setItem(VIEW_KEY, JSON.stringify(v)) } catch { /* 저장 불가 환경은 무시 */ }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)
  const [status, setStatus] = useState<BackendStatus>(LOCAL_STATUS)
  const backendRef = useRef<Backend | null>(null)
  const stateRef = useRef<AppState>(initialState)
  stateRef.current = state
  const viewRef = useRef<View>(loadView())

  /** 백엔드 스냅샷에 내 화면 선택을 덧씌운다(선택한 행사가 사라졌으면 스냅샷 값을 따른다) */
  const applySnapshot = useCallback((s: AppState) => {
    const v = viewRef.current
    const conf = v.conferenceId && s.conferences.some(c => c.id === v.conferenceId)
      ? v.conferenceId : s.activeConferenceId
    const user = v.userId && s.members.some(m => m.id === v.userId)
      ? v.userId : s.currentUserId
    setState({ ...s, activeConferenceId: conf, currentUserId: user })
  }, [])

  useEffect(() => {
    let disposed = false
    let backend: Backend
    ;(async () => {
      const config = await loadConfig()
      if (hasSharedBackend(config)) {
        // 공유 백엔드 모듈은 설정이 있을 때만 불러온다(로컬 전용 빌드의 용량을 늘리지 않기 위해)
        const { FirebaseBackend } = await import('./data/firebaseBackend')
        backend = new FirebaseBackend(config)
      } else {
        backend = new LocalBackend()
      }
      if (disposed) return
      backendRef.current = backend
      await backend.start(applySnapshot, st => setStatus(st))
    })().catch((e: unknown) => {
      setStatus({ mode: '로컬', connected: true, needsSignIn: false, pending: 0, error: `설정 로딩 실패: ${String(e)}` })
      const local = new LocalBackend()
      backendRef.current = local
      void local.start(applySnapshot, st => setStatus(st))
    })
    return () => { disposed = true; backendRef.current?.stop() }
  }, [applySnapshot])

  const dispatch = useCallback((action: Action) => {
    // 화면 전환·사용자 선택처럼 저장이 필요 없는 액션
    if (isLocalOnly(action)) {
      if (action.type === 'SET_CONFERENCE') {
        viewRef.current = { ...viewRef.current, conferenceId: action.id }
        saveView(viewRef.current)
        setState(s => ({ ...s, activeConferenceId: action.id }))
      } else if (action.type === 'SET_USER') {
        viewRef.current = { ...viewRef.current, userId: action.id }
        saveView(viewRef.current)
        setState(s => ({ ...s, currentUserId: action.id }))
      } else if (action.type === 'RESET') {
        viewRef.current = {}
        saveView(viewRef.current)
        void backendRef.current?.reset?.()
      }
      return
    }
    const muts = mutationsFor(stateRef.current, action)
    if (!muts.length) return
    // 새 행사를 만들면 바로 그 행사로 전환한다
    if (action.type === 'ADD_CONFERENCE') {
      const newId = action.conference.id
      viewRef.current = { ...viewRef.current, conferenceId: newId }
      saveView(viewRef.current)
      setState(s => ({ ...applyMutations(s, muts), activeConferenceId: newId }))
      backendRef.current?.write(muts).catch((e: unknown) => setStatus(st => ({ ...st, error: `저장 실패: ${String(e)}` })))
      return
    }
    // 낙관적 반영 — 공유 모드에서도 즉시 화면이 바뀌고, 이후 서버 스냅샷으로 교정된다
    setState(s => applyMutations(s, muts))
    backendRef.current?.write(muts).catch((e: unknown) => {
      setStatus(st => ({ ...st, error: `저장 실패: ${String(e)}` }))
    })
  }, [])

  const ensure = useCallback((cols: CollectionKey[]) => { backendRef.current?.ensure?.(cols) }, [])

  const signIn = useCallback(async () => { await backendRef.current?.signIn?.() }, [])
  const signOut = useCallback(async () => { await backendRef.current?.signOut?.() }, [])
  const reset = useCallback(async (next?: AppState) => {
    // 초기화하면 화면 선택도 함께 비운다(새로 만든 행사가 활성 행사가 된다)
    viewRef.current = next ? { conferenceId: next.activeConferenceId } : {}
    saveView(viewRef.current)
    await backendRef.current?.reset?.(next)
  }, [])

  const invites = useMemo(() => ({
    supported: status.mode === '공유',
    list: async () => (await backendRef.current?.listInvites?.()) ?? [],
    add: async (invite: Invite) => { await backendRef.current?.invite?.(invite) },
    revoke: async (email: string) => { await backendRef.current?.revokeInvite?.(email) },
  }), [status.mode])

  const value = useMemo<Ctx>(() => ({ state, dispatch, status, signIn, signOut, reset, ensure, invites }),
    [state, dispatch, status, signIn, signOut, reset, ensure, invites])
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

/**
 * 이 화면에서만 필요한 컬렉션을 처음 열릴 때 받아온다.
 * 공유 모드에서 접속 시 읽기 횟수를 줄이기 위한 것으로, 로컬 모드에서는 아무 일도 하지 않는다.
 */
export function useEnsure(cols: CollectionKey[]) {
  const { ensure } = useApp()
  const key = cols.filter(Boolean).join(',')
  useEffect(() => {
    if (!key) return
    ensure(key.split(',') as CollectionKey[])
  }, [ensure, key])
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('AppProvider 내부에서만 사용할 수 있습니다.')
  return ctx
}
