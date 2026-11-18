/**
 * 액션 → 문서 변경(Mutation) 변환 계층
 *
 * 공동 작업을 위해 상태를 "통째로 저장"하지 않고 문서 단위로 쪼개 기록한다.
 * 같은 구조를 로컬(브라우저 저장)과 Firestore(공유 백엔드)가 함께 쓰므로
 * 두 모드의 동작이 갈리지 않는다.
 */
import type {
  AppState, AuditLog, Comment, Doc, Registration, Speaker, Task,
} from '../types'
import type { Action } from '../store'
import { today } from '../lib/format'

/** AppState 의 배열 필드 = Firestore 컬렉션 이름 */
export type CollectionKey =
  | 'members' | 'conferences' | 'sessions' | 'speakers' | 'supportPackages' | 'tasks'
  | 'communications' | 'mailTemplates' | 'checklistTemplates' | 'auditLogs'
  | 'creditPrograms' | 'abstracts' | 'registrations' | 'sponsors'
  | 'docs' | 'docTemplates' | 'comments' | 'attachments'

export const COLLECTIONS: CollectionKey[] = [
  'members', 'conferences', 'sessions', 'speakers', 'supportPackages', 'tasks',
  'communications', 'mailTemplates', 'checklistTemplates', 'auditLogs',
  'creditPrograms', 'abstracts', 'registrations', 'sponsors',
  'docs', 'docTemplates', 'comments', 'attachments',
]

export type Mutation =
  | { kind: 'set'; col: CollectionKey; id: string; data: Record<string, unknown> }
  | { kind: 'patch'; col: CollectionKey; id: string; data: Record<string, unknown> }
  | { kind: 'delete'; col: CollectionKey; id: string }

const rid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`
const nowStamp = () => new Date().toISOString().slice(0, 16)

function auditMut(actor: string, entry: Omit<AuditLog, 'id' | 'at' | 'actor'>): Mutation {
  const id = rid('AL')
  return { kind: 'set', col: 'auditLogs', id, data: { id, at: nowStamp(), actor, ...entry } as Record<string, unknown> }
}

/** 화면 전환·사용자 선택처럼 저장할 필요가 없는 액션 */
export const isLocalOnly = (action: Action) =>
  action.type === 'SET_CONFERENCE' || action.type === 'SET_USER' || action.type === 'RESET'

/**
 * 액션 하나를 문서 변경 목록으로 바꾼다.
 * 반환이 비어 있으면 적용할 변경이 없다는 뜻이다(대상 없음 등).
 */
export function mutationsFor(state: AppState, action: Action): Mutation[] {
  const actor = state.members.find(m => m.id === state.currentUserId)?.name ?? '시스템'
  const speaker = (id: string) => state.speakers.find(s => s.id === id)
  const label = (sp?: Speaker) => sp?.nameKo || sp?.nameEn || '-'

  switch (action.type) {
    case 'PATCH_SPEAKER': {
      const sp = speaker(action.id)
      if (!sp) return []
      const muts: Mutation[] = [{
        kind: 'patch', col: 'speakers', id: sp.id,
        data: { ...action.patch, updatedAt: today() } as Record<string, unknown>,
      }]
      if (action.audit) {
        muts.push(auditMut(actor, { action: '수정', entityType: '연사', entityId: sp.id, entityLabel: label(sp), ...action.audit }))
      }
      return muts
    }

    case 'SET_STAGE': {
      const sp = speaker(action.id)
      if (!sp || sp.stage === action.stage) return []
      const patch: Partial<Speaker> = { stage: action.stage, updatedAt: today() }
      if (action.stage === '수락' && !sp.acceptedAt) patch.acceptedAt = today()
      if (action.stage === '계약완료') { patch.agreementStatus = '서명완료'; patch.agreementSignedAt = today() }
      if (action.stage === '거절') patch.declinedAt = today()
      return [
        { kind: 'patch', col: 'speakers', id: sp.id, data: patch as Record<string, unknown> },
        auditMut(actor, { action: '단계변경', entityType: '연사', entityId: sp.id, entityLabel: label(sp), field: '파이프라인 단계', before: sp.stage, after: action.stage }),
      ]
    }

    case 'SET_VISA_STAGE': {
      const sp = speaker(action.id)
      if (!sp) return []
      const visa = { ...sp.visa, stage: action.stage }
      if (action.stage === '발급완료' && !visa.issuedAt) visa.issuedAt = today()
      return [
        { kind: 'patch', col: 'speakers', id: sp.id, data: { visa, updatedAt: today() } },
        auditMut(actor, { action: '수정', entityType: '비자', entityId: sp.id, entityLabel: label(sp), field: '비자 단계', before: sp.visa.stage, after: action.stage }),
      ]
    }

    case 'PATCH_DELIVERABLE': {
      const sp = speaker(action.speakerId)
      const dv = sp?.deliverables.find(d => d.id === action.deliverableId)
      if (!sp || !dv) return []
      const deliverables = sp.deliverables.map(d => (d.id === dv.id ? { ...d, ...action.patch } : d))
      const muts: Mutation[] = [{ kind: 'patch', col: 'speakers', id: sp.id, data: { deliverables, updatedAt: today() } }]
      if (action.patch.status) {
        muts.push(auditMut(actor, { action: '수정', entityType: '제출물', entityId: sp.id, entityLabel: label(sp), field: dv.type, before: dv.status, after: action.patch.status }))
      }
      return muts
    }

    case 'PATCH_TASK': {
      const t = state.tasks.find(x => x.id === action.id)
      if (!t) return []
      const sp = t.speakerId ? speaker(t.speakerId) : undefined
      const muts: Mutation[] = [{ kind: 'patch', col: 'tasks', id: t.id, data: action.patch as Record<string, unknown> }]
      if (action.patch.status) {
        muts.push(auditMut(actor, { action: '수정', entityType: '업무', entityId: t.id, entityLabel: `${sp ? label(sp) + ' · ' : ''}${t.title}`, field: '업무 상태', before: t.status, after: action.patch.status }))
      }
      return muts
    }

    case 'ADD_TASK':
      return [{ kind: 'set', col: 'tasks', id: action.task.id, data: action.task as unknown as Record<string, unknown> }]

    case 'ADD_COMM': {
      const sp = speaker(action.comm.speakerId)
      return [
        { kind: 'set', col: 'communications', id: action.comm.id, data: action.comm as unknown as Record<string, unknown> },
        auditMut(actor, { action: '발송', entityType: '커뮤니케이션', entityId: action.comm.speakerId, entityLabel: label(sp), field: action.comm.subject, after: action.comm.status }),
      ]
    }

    case 'ADD_DOC':
      return [
        { kind: 'set', col: 'docs', id: action.doc.id, data: action.doc as unknown as Record<string, unknown> },
        auditMut(actor, { action: '생성', entityType: '업무', entityId: action.doc.id, entityLabel: action.doc.title, field: action.doc.type, after: '문서 생성' }),
      ]

    case 'UPDATE_DOC': {
      const doc = state.docs.find(d => d.id === action.id)
      if (!doc) return []
      return [
        { kind: 'patch', col: 'docs', id: doc.id, data: { ...action.patch, updatedAt: today() } as Record<string, unknown> },
        auditMut(actor, { action: '수정', entityType: '업무', entityId: doc.id, entityLabel: doc.title, field: '문서 내용', after: '수정됨' }),
      ]
    }

    case 'DELETE_DOC':
      return [{ kind: 'delete', col: 'docs', id: action.id }]

    case 'ADD_COMMENT':
      return [{ kind: 'set', col: 'comments', id: action.comment.id, data: action.comment as unknown as Record<string, unknown> }]

    case 'TOGGLE_COMMENT': {
      const c = state.comments.find(x => x.id === action.id)
      if (!c) return []
      return [{ kind: 'patch', col: 'comments', id: c.id, data: { resolved: !c.resolved } }]
    }

    case 'PATCH_ABSTRACT': {
      const a = state.abstracts.find(x => x.id === action.id)
      if (!a) return []
      const muts: Mutation[] = [{ kind: 'patch', col: 'abstracts', id: a.id, data: action.patch as Record<string, unknown> }]
      if (action.patch.status) {
        muts.push(auditMut(actor, { action: '수정', entityType: '제출물', entityId: a.id, entityLabel: `${a.code} ${a.title.slice(0, 20)}`, field: '초록 심사 상태', before: a.status, after: action.patch.status }))
      }
      return muts
    }

    case 'PATCH_REGISTRATION':
      return [{ kind: 'patch', col: 'registrations', id: action.id, data: action.patch as Record<string, unknown> }]

    case 'PATCH_SPONSOR': {
      const s = state.sponsors.find(x => x.id === action.id)
      if (!s) return []
      const muts: Mutation[] = [{ kind: 'patch', col: 'sponsors', id: s.id, data: action.patch as Record<string, unknown> }]
      if (action.patch.contractStatus) {
        muts.push(auditMut(actor, { action: '수정', entityType: '행사', entityId: s.id, entityLabel: s.company, field: '후원 계약 상태', before: s.contractStatus, after: action.patch.contractStatus }))
      }
      return muts
    }

    case 'PATCH_CREDIT': {
      const c = state.creditPrograms.find(x => x.id === action.id)
      if (!c) return []
      const muts: Mutation[] = [{ kind: 'patch', col: 'creditPrograms', id: c.id, data: action.patch as Record<string, unknown> }]
      if (action.patch.status) {
        muts.push(auditMut(actor, { action: '수정', entityType: '행사', entityId: c.id, entityLabel: `${c.authority} ${c.category}`, field: '평점 신청 상태', before: c.status, after: action.patch.status }))
      }
      return muts
    }

    case 'TOGGLE_MODULE': {
      const conf = state.conferences.find(c => c.id === action.conferenceId)
      if (!conf) return []
      const on = conf.modules.includes(action.module)
      const modules = on ? conf.modules.filter(m => m !== action.module) : [...conf.modules, action.module]
      return [
        { kind: 'patch', col: 'conferences', id: conf.id, data: { modules } },
        auditMut(actor, { action: '수정', entityType: '행사', entityId: conf.id, entityLabel: conf.nameKo, field: `모듈 · ${action.module}`, before: on ? '활성' : '비활성', after: on ? '비활성' : '활성' }),
      ]
    }

    default:
      return []
  }
}

type WithId = { id: string }

/** 문서 변경을 메모리 상태에 적용한다(로컬 저장 모드 · 공유 모드의 낙관적 갱신 공용) */
export function applyMutations(state: AppState, muts: Mutation[]): AppState {
  if (!muts.length) return state
  const next: AppState = { ...state }
  for (const m of muts) {
    const list = [...(next[m.col] as unknown as WithId[])]
    const idx = list.findIndex(x => x.id === m.id)
    if (m.kind === 'delete') {
      if (idx >= 0) list.splice(idx, 1)
    } else if (m.kind === 'set') {
      if (idx >= 0) list[idx] = m.data as unknown as WithId
      // 이력·메모처럼 최신이 위로 와야 하는 목록은 앞에 붙인다
      else if (m.col === 'auditLogs' || m.col === 'comments' || m.col === 'communications' || m.col === 'docs' || m.col === 'tasks') list.unshift(m.data as unknown as WithId)
      else list.push(m.data as unknown as WithId)
    } else {
      if (idx < 0) continue
      list[idx] = { ...list[idx], ...m.data } as WithId
    }
    ;(next as unknown as Record<string, unknown>)[m.col] = list
  }
  return next
}

/** 특정 연사·업무·문서 등이 공동 작업 중 삭제됐을 때를 대비한 안전 접근 */
export const byId = <T extends WithId>(list: T[], id?: string) => (id ? list.find(x => x.id === id) : undefined)

export type { Comment, Doc, Registration, Task }
