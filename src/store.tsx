import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { AppState, AuditLog, Communication, Deliverable, PipelineStage, Speaker, Task, VisaStage } from './types'
import { initialState } from './data/seed'
import { today } from './lib/format'

const STORAGE_KEY = 'onference.state.v1'

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
  | { type: 'RESET' }

/** 감사 로그 시각은 실제 시각, 업무 일자는 데모 기준일(today())을 사용한다 */
const now = () => new Date().toISOString().slice(0, 16)
const bizDate = () => today()

function log(state: AppState, entry: Omit<AuditLog, 'id' | 'at' | 'actor'>): AuditLog {
  const actor = state.members.find(m => m.id === state.currentUserId)?.name ?? '시스템'
  return { id: `AL-${Math.random().toString(36).slice(2, 9)}`, at: now(), actor, ...entry }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CONFERENCE':
      return { ...state, activeConferenceId: action.id }

    case 'SET_USER':
      return { ...state, currentUserId: action.id }

    case 'PATCH_SPEAKER': {
      const sp = state.speakers.find(s => s.id === action.id)
      if (!sp) return state
      const logs = action.audit
        ? [log(state, { action: '수정', entityType: '연사', entityId: sp.id, entityLabel: sp.nameEn, ...action.audit }), ...state.auditLogs]
        : state.auditLogs
      return {
        ...state,
        speakers: state.speakers.map(s => (s.id === action.id ? { ...s, ...action.patch, updatedAt: bizDate() } : s)),
        auditLogs: logs,
      }
    }

    case 'SET_STAGE': {
      const sp = state.speakers.find(s => s.id === action.id)
      if (!sp || sp.stage === action.stage) return state
      const patch: Partial<Speaker> = { stage: action.stage }
      if (action.stage === '수락' && !sp.acceptedAt) patch.acceptedAt = bizDate()
      if (action.stage === '계약완료') { patch.agreementStatus = '서명완료'; patch.agreementSignedAt = bizDate() }
      if (action.stage === '거절') patch.declinedAt = bizDate()
      return {
        ...state,
        speakers: state.speakers.map(s => (s.id === action.id ? { ...s, ...patch, updatedAt: bizDate() } : s)),
        auditLogs: [log(state, { action: '단계변경', entityType: '연사', entityId: sp.id, entityLabel: sp.nameEn, field: '파이프라인 단계', before: sp.stage, after: action.stage }), ...state.auditLogs],
      }
    }

    case 'SET_VISA_STAGE': {
      const sp = state.speakers.find(s => s.id === action.id)
      if (!sp) return state
      const visa = { ...sp.visa, stage: action.stage }
      if (action.stage === '발급완료' && !visa.issuedAt) visa.issuedAt = bizDate()
      return {
        ...state,
        speakers: state.speakers.map(s => (s.id === action.id ? { ...s, visa, updatedAt: bizDate() } : s)),
        auditLogs: [log(state, { action: '수정', entityType: '비자', entityId: sp.id, entityLabel: sp.nameEn, field: '비자 단계', before: sp.visa.stage, after: action.stage }), ...state.auditLogs],
      }
    }

    case 'PATCH_DELIVERABLE': {
      const sp = state.speakers.find(s => s.id === action.speakerId)
      const dv = sp?.deliverables.find(d => d.id === action.deliverableId)
      if (!sp || !dv) return state
      return {
        ...state,
        speakers: state.speakers.map(s =>
          s.id !== sp.id ? s : { ...s, deliverables: s.deliverables.map(d => (d.id === dv.id ? { ...d, ...action.patch } : d)) },
        ),
        auditLogs: action.patch.status
          ? [log(state, { action: '수정', entityType: '제출물', entityId: sp.id, entityLabel: sp.nameEn, field: dv.type, before: dv.status, after: action.patch.status }), ...state.auditLogs]
          : state.auditLogs,
      }
    }

    case 'PATCH_TASK': {
      const t = state.tasks.find(x => x.id === action.id)
      if (!t) return state
      const sp = state.speakers.find(s => s.id === t.speakerId)
      return {
        ...state,
        tasks: state.tasks.map(x => (x.id === action.id ? { ...x, ...action.patch } : x)),
        auditLogs: action.patch.status
          ? [log(state, { action: '수정', entityType: '업무', entityId: t.id, entityLabel: `${sp ? sp.nameEn + ' · ' : ''}${t.title}`, field: '업무 상태', before: t.status, after: action.patch.status }), ...state.auditLogs]
          : state.auditLogs,
      }
    }

    case 'ADD_TASK':
      return { ...state, tasks: [action.task, ...state.tasks] }

    case 'ADD_COMM': {
      const sp = state.speakers.find(s => s.id === action.comm.speakerId)
      return {
        ...state,
        communications: [action.comm, ...state.communications],
        auditLogs: [log(state, { action: '발송', entityType: '커뮤니케이션', entityId: action.comm.speakerId, entityLabel: sp?.nameEn ?? '-', field: action.comm.subject, after: action.comm.status }), ...state.auditLogs],
      }
    }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as AppState
    if (parsed.version !== initialState.version) return initialState
    return parsed
  } catch {
    return initialState
  }
}

interface Ctx { state: AppState; dispatch: React.Dispatch<Action> }
const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* 저장 실패는 무시(내부 데모) */ }
  }, [state])
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('AppProvider 내부에서만 사용할 수 있습니다.')
  return ctx
}
