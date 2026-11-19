import { OVERSEAS_MODULES } from '../types'
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

/** 이력에 넣기 좋은 짧은 문자열로 바꾼다(객체·배열은 요약) */
const brief = (v: unknown): string => {
  if (v === undefined || v === null || v === '') return '-'
  if (Array.isArray(v)) return v.length ? `${v.length}건` : '없음'
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return 'honorarium' in o ? String(o.honorarium) : '변경'
  }
  return String(v)
}

const SPEAKER_FIELD: Record<string, string> = {
  nameKo: '성명', nameEn: '영문명', title: '직위', affiliation: '소속', department: '부서',
  residency: '구분', country: '국가', email: '이메일', phone: '연락처', tier: '등급',
  liaisonMemberId: '담당 리에종', supportPackageId: '지원 패키지', sessionIds: '배정 세션',
  memo: '메모', settlement: '사례비', attendance: '참석 상태', attendanceMode: '참석 방식',
}

/** 변경 이력에 한글 항목명으로 남기기 위한 대응표 */
const SESSION_FIELD: Record<string, string> = {
  title: '세션명', type: '유형', track: '트랙', date: '일자', startTime: '시작', endTime: '종료',
  room: '장소', mode: '진행 방식', language: '언어', interpretation: '동시통역', recorded: '녹화·중계',
  speakerIds: '배정 연자', moderatorId: '좌장',
}

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
        // 어떤 항목이 어떻게 바뀌었는지 남긴다(호출부가 직접 지정하면 그 값을 우선한다)
        const changed = Object.entries(action.patch)
          .filter(([k, v]) => JSON.stringify((sp as unknown as Record<string, unknown>)[k]) !== JSON.stringify(v))
        const auto = changed.length ? {
          field: changed.map(([k]) => SPEAKER_FIELD[k] ?? k).join(', '),
          before: changed.map(([k]) => brief((sp as unknown as Record<string, unknown>)[k])).join(' / '),
          after: changed.map(([, v]) => brief(v)).join(' / '),
        } : {}
        muts.push(auditMut(actor, {
          action: '수정', entityType: '연사', entityId: sp.id, entityLabel: label(sp),
          ...auto, ...Object.fromEntries(Object.entries(action.audit).filter(([, v]) => v !== undefined)),
        }))
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

    case 'ADD_SPONSOR':
      return [
        { kind: 'set', col: 'sponsors', id: action.sponsor.id, data: action.sponsor as unknown as Record<string, unknown> },
        auditMut(actor, {
          action: '생성', entityType: '행사', entityId: action.sponsor.id, entityLabel: action.sponsor.company,
          field: '후원사 등록', after: `${action.sponsor.tier} · ${action.sponsor.amount.toLocaleString()}원`,
        }),
      ]

    case 'DELETE_SPONSOR': {
      const sp = state.sponsors.find(x => x.id === action.id)
      if (!sp) return []
      return [
        { kind: 'delete', col: 'sponsors', id: sp.id },
        auditMut(actor, { action: '삭제', entityType: '행사', entityId: sp.id, entityLabel: sp.company, field: '후원사 삭제' }),
      ]
    }

    case 'ADD_CREDIT':
      return [
        { kind: 'set', col: 'creditPrograms', id: action.credit.id, data: action.credit as unknown as Record<string, unknown> },
        auditMut(actor, {
          action: '생성', entityType: '행사', entityId: action.credit.id, entityLabel: `${action.credit.authority} ${action.credit.category}`,
          field: '연수평점 신청 등록', after: `${action.credit.appliedCredits}평점`,
        }),
      ]

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

    case 'ADD_CONFERENCE': {
      const muts: Mutation[] = [
        { kind: 'set', col: 'conferences', id: action.conference.id, data: action.conference as unknown as Record<string, unknown> },
        ...action.sessions.map(x => ({ kind: 'set' as const, col: 'sessions' as const, id: x.id, data: x as unknown as Record<string, unknown> })),
        ...action.tasks.map(x => ({ kind: 'set' as const, col: 'tasks' as const, id: x.id, data: x as unknown as Record<string, unknown> })),
      ]
      muts.push(auditMut(actor, {
        action: '생성', entityType: '행사', entityId: action.conference.id, entityLabel: action.conference.nameKo,
        field: '행사 생성', after: `${action.conference.scope} · ${action.conference.startDate}`,
        memo: `업무 ${action.tasks.length}건 · 세션 ${action.sessions.length}건 자동 생성`,
      }))
      return muts
    }

    case 'PATCH_CONFERENCE': {
      const conf = state.conferences.find(c => c.id === action.id)
      if (!conf) return []
      return [
        { kind: 'patch', col: 'conferences', id: conf.id, data: action.patch as Record<string, unknown> },
        auditMut(actor, { action: '수정', entityType: '행사', entityId: conf.id, entityLabel: conf.nameKo, field: '행사 정보', after: '수정됨' }),
      ]
    }

    case 'ADD_SPEAKER': {
      const name = action.speaker.nameKo || action.speaker.nameEn
      // 국내 행사라도 해외 연자가 들어오면 출입국·해외송금 업무가 실제로 발생한다.
      // 관련 모듈이 꺼져 있으면 메뉴가 보이지 않아 업무를 놓치므로 함께 켠다.
      const conf = state.conferences.find(c => c.id === action.speaker.conferenceId)
      const needOverseas = action.speaker.residency === '해외' && conf
        ? OVERSEAS_MODULES.filter(m => !conf.modules.includes(m))
        : []
      return [
        ...(needOverseas.length && conf ? [
          { kind: 'patch' as const, col: 'conferences' as const, id: conf.id, data: { modules: [...conf.modules, ...needOverseas] } },
          auditMut(actor, {
            action: '수정', entityType: '행사', entityId: conf.id, entityLabel: conf.nameKo,
            field: '모듈 구성', after: needOverseas.join(', '),
            memo: `해외 ${name} 등록으로 자동 활성화`,
          }),
        ] : []),
        { kind: 'set', col: 'speakers', id: action.speaker.id, data: action.speaker as unknown as Record<string, unknown> },
        ...action.tasks.map(x => ({ kind: 'set' as const, col: 'tasks' as const, id: x.id, data: x as unknown as Record<string, unknown> })),
        auditMut(actor, {
          action: '생성', entityType: '연사', entityId: action.speaker.id, entityLabel: name,
          field: '연자 등록', after: `${action.speaker.tier} · ${action.speaker.residency}`,
          memo: action.tasks.length ? `업무 ${action.tasks.length}건 자동 생성` : undefined,
        }),
      ]
    }

    case 'ADD_SESSION':
      return [
        { kind: 'set', col: 'sessions', id: action.session.id, data: action.session as unknown as Record<string, unknown> },
        auditMut(actor, { action: '생성', entityType: '세션', entityId: action.session.id, entityLabel: action.session.title, field: '세션 등록', after: `${action.session.date} ${action.session.startTime}` }),
      ]

    case 'PATCH_SESSION': {
      const ses = state.sessions.find(x => x.id === action.id)
      if (!ses) return []
      // 바뀐 항목만 이력에 남긴다(값이 같은 필드는 기록하지 않는다)
      const changed = Object.entries(action.patch)
        .filter(([k, v]) => JSON.stringify((ses as unknown as Record<string, unknown>)[k]) !== JSON.stringify(v))
      if (!changed.length) return []
      return [
        { kind: 'patch', col: 'sessions', id: action.id, data: action.patch as Record<string, unknown> },
        auditMut(actor, {
          action: '수정', entityType: '세션', entityId: ses.id, entityLabel: action.patch.title ?? ses.title,
          field: changed.map(([k]) => SESSION_FIELD[k] ?? k).join(', '),
          before: changed.map(([k]) => String((ses as unknown as Record<string, unknown>)[k] ?? '')).join(' / '),
          after: changed.map(([, v]) => String(v ?? '')).join(' / '),
        }),
      ]
    }

    case 'DELETE_SPEAKER': {
      const sp = state.speakers.find(x => x.id === action.id)
      if (!sp) return []
      const tasks = state.tasks.filter(t => t.speakerId === action.id)
      return [
        { kind: 'delete', col: 'speakers', id: sp.id },
        // 담당 업무도 함께 지운다(남겨두면 어느 화면에서도 접근할 수 없는 고아 레코드가 된다)
        ...tasks.map(t => ({ kind: 'delete' as const, col: 'tasks' as const, id: t.id })),
        auditMut(actor, {
          action: '삭제', entityType: '연사', entityId: sp.id, entityLabel: sp.nameKo || sp.nameEn,
          field: '연자 삭제', memo: tasks.length ? `연결된 업무 ${tasks.length}건 함께 삭제` : undefined,
        }),
      ]
    }

    case 'DELETE_SESSION': {
      const ses = state.sessions.find(x => x.id === action.id)
      if (!ses) return []
      return [
        { kind: 'delete', col: 'sessions', id: ses.id },
        auditMut(actor, { action: '삭제', entityType: '세션', entityId: ses.id, entityLabel: ses.title, field: '세션 삭제' }),
      ]
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
