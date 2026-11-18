import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Abstract, AppState, Comment, Communication, CreditProgram, Deliverable, Doc,
  ModuleKey, PipelineStage, Registration, Speaker, Sponsor, Task, VisaStage,
} from './types'
import { initialState } from './data/seed'
import { LocalBackend } from './data/backend'
import type { Backend, BackendStatus, Invite } from './data/backend'
import { applyMutations, isLocalOnly, mutationsFor } from './data/mutations'
import { hasSharedBackend, loadConfig } from './config'

export type Action =
  | { type: 'SET_CONFERENCE'; id: string }
  | { type: 'SET_USER'; id: string }
  | { type: 'PATCH_SPEAKER'; id: string; patch: Partial<Speaker>; audit?: { field: string; before?: string; after?: string; memo?: string } }
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
  | { type: 'PATCH_REGISTRATION'; id: string; patch: Partial<Registration> }
  | { type: 'PATCH_SPONSOR'; id: string; patch: Partial<Sponsor> }
  | { type: 'PATCH_CREDIT'; id: string; patch: Partial<CreditProgram> }
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
  reset: () => Promise<void>
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)
  const [status, setStatus] = useState<BackendStatus>(LOCAL_STATUS)
  const backendRef = useRef<Backend | null>(null)
  const stateRef = useRef<AppState>(initialState)
  stateRef.current = state

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
      await backend.start(
        s => setState(s),
        st => setStatus(st),
      )
    })().catch((e: unknown) => {
      setStatus({ mode: '로컬', connected: true, needsSignIn: false, pending: 0, error: `설정 로딩 실패: ${String(e)}` })
      const local = new LocalBackend()
      backendRef.current = local
      void local.start(s => setState(s), st => setStatus(st))
    })
    return () => { disposed = true; backendRef.current?.stop() }
  }, [])

  const dispatch = useCallback((action: Action) => {
    // 화면 전환·사용자 선택처럼 저장이 필요 없는 액션
    if (isLocalOnly(action)) {
      if (action.type === 'SET_CONFERENCE') setState(s => ({ ...s, activeConferenceId: action.id }))
      else if (action.type === 'SET_USER') setState(s => ({ ...s, currentUserId: action.id }))
      else if (action.type === 'RESET') void backendRef.current?.reset?.()
      return
    }
    const muts = mutationsFor(stateRef.current, action)
    if (!muts.length) return
    // 낙관적 반영 — 공유 모드에서도 즉시 화면이 바뀌고, 이후 서버 스냅샷으로 교정된다
    setState(s => applyMutations(s, muts))
    backendRef.current?.write(muts).catch((e: unknown) => {
      setStatus(st => ({ ...st, error: `저장 실패: ${String(e)}` }))
    })
  }, [])

  const signIn = useCallback(async () => { await backendRef.current?.signIn?.() }, [])
  const signOut = useCallback(async () => { await backendRef.current?.signOut?.() }, [])
  const reset = useCallback(async () => { await backendRef.current?.reset?.() }, [])

  const invites = useMemo(() => ({
    supported: status.mode === '공유',
    list: async () => (await backendRef.current?.listInvites?.()) ?? [],
    add: async (invite: Invite) => { await backendRef.current?.invite?.(invite) },
    revoke: async (email: string) => { await backendRef.current?.revokeInvite?.(email) },
  }), [status.mode])

  const value = useMemo<Ctx>(() => ({ state, dispatch, status, signIn, signOut, reset, invites }),
    [state, dispatch, status, signIn, signOut, reset, invites])
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('AppProvider 내부에서만 사용할 수 있습니다.')
  return ctx
}
