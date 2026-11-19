/**
 * 신규 레코드 생성기
 * 새 행사·연자·세션을 만들 때 필요한 기본값과 파생 데이터(업무·제출물·마일스톤)를 함께 만든다.
 * 빈 행사를 만들어도 바로 운영을 시작할 수 있도록, 체크리스트 템플릿에서 업무가 자동 생성된다.
 */
import type {
  AppState, ChecklistTemplate, Conference, ConferenceScope, Deliverable, DeliverableType,
  DeliveryMode, Industry, Member, Milestone, ModuleKey, Session, Speaker, SpeakerTier, Sponsorship, Task,
} from '../types'
import { CORE_MODULES, DOMESTIC_MODULES, OVERSEAS_MODULES } from '../types'
import { addDays } from '../data/base'
import { today } from './format'

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

/**
 * 데모 데이터를 모두 비우고 새로 만든 행사 하나만 남긴 상태를 만든다.
 * 멤버·메일/제출물 템플릿·체크리스트 템플릿은 재사용 자산이므로 유지한다.
 */
export function freshState(
  state: AppState,
  created: { conference: Conference; sessions: Session[]; tasks: Task[] },
): AppState {
  return {
    ...state,
    activeConferenceId: created.conference.id,
    conferences: [created.conference],
    sessions: created.sessions,
    tasks: created.tasks,
    speakers: [],
    communications: [],
    auditLogs: [],
    creditPrograms: [],
    abstracts: [],
    registrations: [],
    sponsors: [],
    docs: [],
    comments: [],
    attachments: [],
  }
}

/* ─────────────────────────────── 행사 ─────────────────────────────── */

export interface NewConferenceInput {
  nameKo: string
  nameEn?: string
  code: string
  scope: ConferenceScope
  industry: Industry
  startDate: string
  endDate: string
  venue: string
  city: string
  host: string
  organizer?: string
  pco?: string
  expectedAttendees: number
  budgetTotalKRW: number
  invitationBudgetKRW: number
  tracks: string[]
  creditAuthority?: string
  modules: ModuleKey[]
  /** 기존 행사를 본떠 만들 때 */
  copyFrom?: string
  copy?: { sessions: boolean; packages: boolean; templates: boolean }
}

export const defaultModules = (scope: ConferenceScope, industry: Industry): ModuleKey[] => [
  ...CORE_MODULES,
  ...(scope === '국내' ? DOMESTIC_MODULES.filter(m => m !== '연수평점' || industry === '의료·학회') : []),
  ...(scope === '국제' ? OVERSEAS_MODULES : []),
]

/** 행사 성격에 맞는 기본 마일스톤 (개막일 기준 역산) */
/** 업무 단계별 기본 담당 역할 — 마일스톤 담당자 자동 배정에 쓴다 */
const PHASE_ROLE: Record<string, string> = {
  '기획·세팅': '사무국', '발굴·선정': '사무국', '초청·계약': '리에종',
  '출입국·비자': '사무국', '여행·의전': '여행사', '콘텐츠·발표': 'PCO',
  '현장운영': 'PCO', '정산·사후': '재무',
}

function defaultMilestones(start: string, scope: ConferenceScope, modules: ModuleKey[], members: Member[] = []): Milestone[] {
  const base: [string, number, Milestone['phase']][] = scope === '국제'
    ? [
      ['연사 선정위원회 확정', -150, '발굴·선정'],
      ['공식 초청장 발송 완료', -140, '초청·계약'],
      ['사증 서류 수취 마감', -90, '출입국·비자'],
      ['국제선 발권 마감', -60, '여행·의전'],
      ['초록·약력·사진 수집 마감', -60, '콘텐츠·발표'],
      ['프로그램북 인쇄 입고', -25, '콘텐츠·발표'],
      ['발표자료 최종 수취', -14, '콘텐츠·발표'],
      ['의전·배차 확정', -10, '여행·의전'],
      ['사례비 지급 및 원천징수 신고', 14, '정산·사후'],
    ]
    : [
      ['연자 선정 및 학술위원회 확정', -90, '발굴·선정'],
      ['연자 초청 공문 발송', -70, '초청·계약'],
      ['초록 투고 마감', -45, '콘텐츠·발표'],
      ['초록 심사 완료 및 채택 통보', -32, '콘텐츠·발표'],
      ['연수평점 신청 마감', -38, '기획·세팅'],
      ['후원·부스 계약 마감', -28, '기획·세팅'],
      ['사전등록 마감(할인 종료)', -10, '현장운영'],
      ['프로그램북 인쇄 입고', -7, '콘텐츠·발표'],
      ['발표자료 최종 수취', -5, '콘텐츠·발표'],
      ['사례비 지급 및 원천징수 신고', 12, '정산·사후'],
    ]
  return base
    .filter(([label]) => {
      if (label.includes('연수평점')) return modules.includes('연수평점')
      if (label.includes('초록')) return modules.includes('초록심사') || modules.includes('콘텐츠·발표' as ModuleKey)
      if (label.includes('후원')) return modules.includes('후원·전시')
      if (label.includes('사전등록')) return modules.includes('참가등록')
      return true
    })
    .map(([label, off, phase], i) => {
      const role = PHASE_ROLE[phase] ?? '사무국'
      const owner = members.find(m => m.role === role)?.id ?? members.find(m => m.role === '사무국')?.id ?? members[0]?.id
      return { id: `MS-${i + 1}`, label, date: addDays(start, off), phase, ...(owner ? { owner } : {}) }
    })
}

const ROLE_OWNER: Record<string, string> = {
  사무국: 'M01', PCO: 'M03', 리에종: 'M05', 여행사: 'M07', 재무: 'M08', 연사: 'M01',
}

/** 체크리스트 템플릿에서 행사 단위 업무를 만든다 */
export function tasksFromTemplate(
  conferenceId: string, start: string, template: ChecklistTemplate, members: Member[], speakerId?: string, speakerName?: string,
): Task[] {
  const ownerFor = (role: string) => members.find(m => m.role === role)?.id ?? ROLE_OWNER[role] ?? members[0]?.id ?? 'M01'
  const now = today()
  return template.items.map((it, i) => {
    const planned = addDays(start, it.offsetDays)
    // 행사를 늦게 등록하면 역산 기한이 이미 지나 있다. 그대로 두면 만들자마자
    // '지연' 으로 표시돼 거짓 경고가 되므로, 지난 기한은 오늘로 당겨 잡고 사유를 남긴다.
    const overdue = planned < now
    return {
      id: `${speakerId ?? conferenceId}-T${String(i + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6)}`,
      conferenceId,
      speakerId,
      phase: it.phase,
      title: speakerName ? `[${speakerName}] ${it.title}` : it.title,
      ownerMemberId: ownerFor(it.ownerRole),
      dueDate: overdue ? now : planned,
      status: '대기' as const,
      priority: overdue || it.offsetDays >= -14 ? ('상' as const) : ('중' as const),
      fromTemplate: template.id,
      ...(overdue ? { detail: `표준 일정상 기한은 ${planned}(D${it.offsetDays})입니다. 행사 등록 시점이 그보다 늦어 기한을 오늘로 조정했습니다.` } : {}),
    }
  })
}

export interface CreatedConference {
  conference: Conference
  sessions: Session[]
  tasks: Task[]
}

export function createConference(state: AppState, input: NewConferenceInput): CreatedConference {
  const id = rid('CONF')
  const source = input.copyFrom ? state.conferences.find(c => c.id === input.copyFrom) : undefined

  const conference: Conference = {
    id,
    code: input.code.trim() || id,
    scope: input.scope,
    industry: input.industry,
    modules: input.modules.length ? input.modules : defaultModules(input.scope, input.industry),
    creditAuthority: input.creditAuthority || undefined,
    nameKo: input.nameKo.trim(),
    nameEn: input.nameEn?.trim() || input.nameKo.trim(),
    edition: source?.edition ?? '',
    startDate: input.startDate,
    endDate: input.endDate || input.startDate,
    venue: input.venue.trim(),
    city: input.city.trim(),
    country: '대한민국',
    timezone: 'Asia/Seoul (UTC+9)',
    host: input.host.trim(),
    organizer: (input.organizer || input.host).trim(),
    pco: input.pco?.trim() ?? '',
    sponsors: [],
    website: '',
    status: '기획',
    expectedAttendees: input.expectedAttendees,
    budgetTotalKRW: input.budgetTotalKRW,
    invitationBudgetKRW: input.invitationBudgetKRW,
    baseCurrency: 'KRW',
    tracks: input.tracks.filter(Boolean),
    milestones: defaultMilestones(input.startDate, input.scope, input.modules, state.members),
    notes: source ? `${source.nameKo} 구성을 본떠 생성` : undefined,
  }

  /* 기존 행사의 세션 구성을 가져올 때는 날짜만 새 행사 일정으로 옮긴다 */
  const sessions: Session[] = []
  if (source && input.copy?.sessions) {
    const srcSessions = state.sessions.filter(s => s.conferenceId === source.id)
    const srcStart = source.startDate
    srcSessions.forEach((s, i) => {
      const offset = Math.round((new Date(s.date).getTime() - new Date(srcStart).getTime()) / 86_400_000)
      sessions.push({
        ...s,
        id: `${id}-S${String(i + 1).padStart(2, '0')}`,
        conferenceId: id,
        date: addDays(input.startDate, offset),
        speakerIds: [],
        chairMemberId: undefined,
      })
    })
  }

  const template = state.checklistTemplates.find(t => (input.scope === '국내' ? t.id === 'CLT-DOM' : t.id === 'CLT-STD'))
    ?? state.checklistTemplates[0]
  const tasks = template ? tasksFromTemplate(id, input.startDate, template, state.members) : []

  return { conference, sessions, tasks }
}

/* ─────────────────────────────── 연자 ─────────────────────────────── */

export interface NewSpeakerInput {
  nameKo: string
  nameEn?: string
  title: string
  affiliation: string
  department?: string
  residency: '국내' | '해외'
  country?: string
  city?: string
  email: string
  phone?: string
  tier: SpeakerTier
  liaisonMemberId: string
  supportPackageId: string
  honorarium: number
  sessionIds: string[]
  memo?: string
  assistantEmail?: string
  researchFields?: string[]
  languages?: string[]
  dietary?: string
  accessibility?: string
  interpretationNeeded?: boolean
  sponsorship?: Sponsorship
  attendanceMode?: DeliveryMode
}

const DOMESTIC_DOCS: { type: DeliverableType; offset: number }[] = [
  { type: '강의계획서', offset: -30 },
  { type: '이해관계 선언(COI)', offset: -21 },
  { type: 'CV', offset: -25 },
  { type: '증명사진', offset: -25 },
  { type: '약력(Bio)', offset: -25 },
  { type: '사례비 지급정보(통장·신분증)', offset: -14 },
  { type: '녹화·중계 동의서', offset: -14 },
  { type: '발표자료(PPT)', offset: -5 },
]
const OVERSEAS_DOCS: { type: DeliverableType; offset: number }[] = [
  { type: '강연동의서(Speaker Agreement)', offset: -110 },
  { type: '여권사본', offset: -95 },
  { type: '항공선호정보', offset: -90 },
  { type: '약력(Bio)', offset: -70 },
  { type: 'CV', offset: -70 },
  { type: '증명사진', offset: -70 },
  { type: '발표초록(Abstract)', offset: -60 },
  { type: '녹화·중계 동의서', offset: -60 },
  { type: '해외송금 정보(W-8/은행)', offset: -45 },
  { type: '발표자료(PPT)', offset: -14 },
]

export function createSpeaker(state: AppState, conf: Conference, input: NewSpeakerInput): { speaker: Speaker; tasks: Task[] } {
  const id = rid('SPK')
  const overseas = input.residency === '해외'
  const pkg = state.supportPackages.find(p => p.id === input.supportPackageId)
  const plan = overseas ? OVERSEAS_DOCS : DOMESTIC_DOCS
  // 업무와 같은 이유로, 이미 지난 제출 기한은 오늘로 당겨 잡는다.
  // (등록하자마자 '기한 경과' 로 뜨면 실제 지연과 구분이 되지 않는다)
  const now = today()
  const deliverables: Deliverable[] = plan.map((p, i) => {
    const planned = addDays(conf.startDate, p.offset)
    return {
      id: `${id}-D${String(i + 1).padStart(2, '0')}`,
      type: p.type,
      dueDate: planned < now ? now : planned,
      status: '요청전' as const,
      ...(planned < now ? { memo: `표준 기한 ${planned}(D${p.offset}) 경과 — 등록 시점 기준으로 조정` } : {}),
    }
  })

  const speaker: Speaker = {
    id, code: id, conferenceId: conf.id,
    nameEn: input.nameEn?.trim() || input.nameKo.trim(),
    nameKo: input.nameKo.trim(),
    title: input.title.trim(),
    affiliation: input.affiliation.trim(),
    department: input.department?.trim(),
    country: overseas ? (input.country?.trim() || '기타') : '대한민국',
    city: input.city?.trim() ?? '',
    ...(input.assistantEmail ? { assistantEmail: input.assistantEmail } : {}),
    ...(input.dietary ? { dietary: input.dietary } : {}),
    ...(input.accessibility ? { accessibility: input.accessibility } : {}),
    timezone: overseas ? '' : 'Asia/Seoul (UTC+9)',
    email: input.email.trim(),
    phone: input.phone?.trim(),
    researchFields: input.researchFields ?? [],
    languages: input.languages?.length ? input.languages : (overseas ? ['EN'] : ['KO']),
    tier: input.tier,
    residency: input.residency,
    stage: '후보발굴',
    attendance: '참석미정',
    sponsorship: input.sponsorship ?? 'Sponsored',
    priority: input.tier === 'Keynote' ? '상' : '중',
    attendanceMode: input.attendanceMode ?? '현장',
    supportPackageId: input.supportPackageId,
    liaisonMemberId: input.liaisonMemberId,
    principalMemberId: state.members.find(m => m.role === '사무국')?.id ?? input.liaisonMemberId,
    sessionIds: input.sessionIds,
    agreementStatus: '미발송',
    interpretationNeeded: input.interpretationNeeded ?? overseas,
    companions: [],
    visa: overseas
      ? { required: true, track: '기타', stage: '판정대기', ketaRequired: false, ketaStatus: '해당없음', ccviRequired: false, leadTimeDays: 21, guaranteeLetterRequired: false }
      : { required: false, track: '국내(해당없음)', stage: '해당없음', ketaRequired: false, ketaStatus: '해당없음', ccviRequired: false, leadTimeDays: 0, guaranteeLetterRequired: false },
    flights: [],
    transfers: [],
    protocol: {
      level: input.tier === 'Keynote' ? 'VIP' : '일반',
      loungeAccess: ['Keynote', 'Invited'].includes(input.tier),
      giftPrepared: false, photoSession: false, status: '미정',
    },
    programs: input.sessionIds.map((sid, i) => {
      const s = state.sessions.find(x => x.id === sid)
      return {
        id: `${id}-P${i + 1}`,
        name: s?.title ?? '세션',
        type: input.tier === 'Moderator' ? '좌장' : '세션발표',
        sessionId: sid,
        date: s?.date ?? conf.startDate,
        time: s ? `${s.startTime}–${s.endTime}` : undefined,
        place: s?.room,
        status: '대기',
      }
    }),
    supportedNights: pkg?.hotelNights ?? 0,
    deliverables,
    settlement: {
      honorarium: input.honorarium,
      currency: 'KRW',
      taxType: overseas ? '비거주자(22%)' : '기타소득(8.8%)',
      withholdingRate: overseas ? 22 : 8.8,
      taxTreatyApplied: false,
      corReceived: false,
      netPayment: Math.round(input.honorarium * (1 - (overseas ? 22 : 8.8) / 100)),
      expenses: [],
    },
    onsite: { badgeIssued: false, rehearsalDone: false, giftHandedOver: false },
    tags: [],
    memo: input.memo?.trim(),
    createdAt: today(),
    updatedAt: today(),
  }

  const template = state.checklistTemplates.find(t => (conf.scope === '국내' ? t.id === 'CLT-DOM' : t.id === 'CLT-STD'))
  const speakerItems = template
    ? { ...template, items: template.items.filter(i => ['초청·계약', '콘텐츠·발표', '여행·의전', '정산·사후'].includes(i.phase)) }
    : undefined
  const tasks = speakerItems
    ? tasksFromTemplate(conf.id, conf.startDate, speakerItems, state.members, id, speaker.nameKo || speaker.nameEn)
    : []

  return { speaker, tasks }
}

/* ─────────────────────────────── 세션 ─────────────────────────────── */

export interface NewSessionInput {
  title: string
  type: Session['type']
  track: string
  date: string
  startTime: string
  endTime: string
  room: string
  mode: Session['mode']
  language: string
  interpretation: boolean
  recorded: boolean
  capacity?: number
}

export const createSession = (conf: Conference, input: NewSessionInput): Session => ({
  id: rid('SES'),
  conferenceId: conf.id,
  title: input.title.trim(),
  type: input.type,
  track: input.track,
  date: input.date,
  startTime: input.startTime,
  endTime: input.endTime,
  room: input.room.trim(),
  mode: input.mode,
  language: input.language,
  interpretation: input.interpretation,
  speakerIds: [],
  capacity: input.capacity,
  recorded: input.recorded,
})
