import type { AppState, Conference, PipelineStage, Speaker, Task } from '../types'
import { PIPELINE_ORDER } from '../types'
import { dday, daysBetween, pct, today } from './format'

export const activeConference = (s: AppState): Conference =>
  s.conferences.find(c => c.id === s.activeConferenceId) ?? s.conferences[0]

export const speakersOf = (s: AppState) => s.speakers.filter(sp => sp.conferenceId === s.activeConferenceId)
export const tasksOf = (s: AppState) => s.tasks.filter(t => t.conferenceId === s.activeConferenceId)
export const sessionsOf = (s: AppState) => s.sessions.filter(x => x.conferenceId === s.activeConferenceId)
export const commsOf = (s: AppState) => s.communications.filter(c => c.conferenceId === s.activeConferenceId)

/** 변경 이력은 엔터티 소속으로 현재 행사 범위를 판별한다(로그 자체에는 행사 ID가 없다) */
export const auditOf = (s: AppState) => {
  const ids = new Set<string>([
    ...speakersOf(s).map(x => x.id),
    ...sessionsOf(s).map(x => x.id),
    ...tasksOf(s).map(x => x.id),
    s.activeConferenceId,
  ])
  return s.auditLogs.filter(l => ids.has(l.entityId))
}

export const ACTIVE_STAGES: PipelineStage[] = ['수락', '계약완료']
export const isConfirmed = (sp: Speaker) => ACTIVE_STAGES.includes(sp.stage)
/** 초청장을 발송한 적이 있는가 (거절·취소 포함) — 수락률/퍼널 분모 */
export const wasInvited = (sp: Speaker) =>
  PIPELINE_ORDER.indexOf(sp.stage) >= PIPELINE_ORDER.indexOf('공식초청') || ['거절', '취소'].includes(sp.stage)
/** 정산·예산 집계 대상 (자비 참가는 여행비 집계에서 제외) */
export const isSponsored = (sp: Speaker) => sp.sponsorship !== 'Non-Sponsored'

/** 사증 처리에 필요한 총 일수 = 사증 심사 + 사증발급인정서 심사(20일) + 버퍼(7일) */
export const visaLeadDays = (sp: Speaker) => sp.visa.leadTimeDays + (sp.visa.ccviRequired ? 20 : 0) + 7
/** 개막일까지 남은 여유일 (음수면 일정상 불가) */
export const visaSlack = (sp: Speaker, conf: Conference) => dday(conf.startDate) - visaLeadDays(sp)

/* ───────────────────────────── 리스크 엔진 ───────────────────────────── */

export type RiskLevel = 'critical' | 'serious' | 'warning'

export interface Risk {
  id: string
  speakerId: string
  speakerName: string
  level: RiskLevel
  category: '비자' | '항공' | '숙박' | '제출물' | '계약' | '응답' | '여권' | '의전'
  title: string
  detail: string
  /** 조치 마감일 */
  dueDate?: string
}

/**
 * 해외 연사 초청 실무의 대표 리스크를 D-day 역산으로 탐지한다.
 * - 비자: (행사일 - 오늘) < 비자 리드타임 + CCVI 심사(20일) + 버퍼(7일)
 * - 발권: 요금 보장 마감(D-60) 경과 미발권
 * - 여권: 행사 종료일 기준 잔여 유효기간 6개월 미만
 */
export function computeRisks(state: AppState): Risk[] {
  const conf = activeConference(state)
  const risks: Risk[] = []
  const daysToEvent = dday(conf.startDate)

  speakersOf(state).forEach(sp => {
    if (sp.stage === '거절' || sp.stage === '취소') return
    const name = sp.nameEn
    const push = (r: Omit<Risk, 'id' | 'speakerId' | 'speakerName'>) =>
      risks.push({ ...r, id: `${sp.id}-${r.category}-${risks.length}`, speakerId: sp.id, speakerName: name })

    /* 1. 비자 리드타임 */
    if (sp.visa.required && !['발급완료'].includes(sp.visa.stage)) {
      const need = visaLeadDays(sp)
      if (sp.visa.stage === '거절') {
        push({ level: 'critical', category: '비자', title: '사증 거절 — 대체 시나리오 필요', detail: `${sp.visa.track} 거절. 재신청 또는 온라인 발표 전환 결정 필요.`, dueDate: conf.startDate })
      } else if (daysToEvent < need) {
        push({
          level: 'critical', category: '비자',
          title: `비자 처리 기간 부족 (필요 ${need}일 / 잔여 ${daysToEvent}일)`,
          detail: `${sp.country} · ${sp.visa.track} · 현재 "${sp.visa.stage}"${sp.visa.ccviRequired ? ' · 사증발급인정서 심사 포함' : ''}`,
          dueDate: conf.startDate,
        })
      } else if (daysToEvent - need < 7) {
        // 여유 1주 미만 — 서류 보완·재방문 한 번이면 일정이 무너진다.
        push({
          level: 'critical', category: '비자',
          title: `비자 일정 여유 ${daysToEvent - need}일 — 예비 일정 없음`,
          detail: `${sp.country} · ${sp.visa.track} · 현재 "${sp.visa.stage}" · 온라인 전환 백업 확정 필요`,
          dueDate: conf.startDate,
        })
      } else if (daysToEvent - need < 21) {
        push({ level: 'serious', category: '비자', title: `비자 일정 여유 3주 미만 (여유 ${daysToEvent - need}일)`, detail: `${sp.country} · ${sp.visa.track} · 현재 "${sp.visa.stage}" — 지연 시 복구 불가`, dueDate: conf.startDate })
      } else if (['판정대기', '서류요청'].includes(sp.visa.stage)) {
        push({ level: 'warning', category: '비자', title: '비자 서류 미수취', detail: `${sp.country} · ${sp.visa.track} · 현재 "${sp.visa.stage}"`, dueDate: conf.startDate })
      }
    }

    /* 2. 여권 유효기간 */
    if (sp.passport?.expiryDate && daysBetween(conf.endDate, sp.passport.expiryDate) < 180) {
      push({ level: 'serious', category: '여권', title: '여권 잔여 유효기간 6개월 미만', detail: `만료일 ${sp.passport.expiryDate} — 갱신 후 재수취 필요`, dueDate: sp.passport.expiryDate })
    }

    /* 3. 발권 */
    if (isConfirmed(sp) && sp.attendanceMode !== '온라인') {
      const ticketed = sp.flights.some(f => f.eTicketReceived)
      if (!ticketed && daysToEvent <= 60) {
        push({ level: daysToEvent <= 30 ? 'critical' : 'serious', category: '항공', title: '항공 미발권', detail: sp.flights.length ? '스케줄 확정, e-Ticket 미수령' : '항공 스케줄 미확정 — 요금 보장 마감 경과', dueDate: conf.startDate })
      }
      if (!sp.hotel && daysToEvent <= 55) {
        push({ level: 'warning', category: '숙박', title: '숙박 미확정', detail: '객실 블록 마감 임박', dueDate: conf.startDate })
      }
      if (!sp.transfers.length && daysToEvent <= 14) {
        push({ level: 'warning', category: '의전', title: '공항 배차 미배정', detail: '픽업/샌딩 차량·담당자 미지정', dueDate: conf.startDate })
      }
    }

    /* 4. 제출물 (확정 연사만 — 미수락 연사는 요청 전 상태가 정상) */
    const late = !isConfirmed(sp) ? [] : sp.deliverables.filter(dv => dv.dueDate < today() && !['검수완료', '제출'].includes(dv.status))
    if (late.length) {
      push({
        level: late.length >= 3 ? 'serious' : 'warning',
        category: '제출물',
        title: `제출물 ${late.length}건 기한 경과`,
        detail: late.map(l => l.type).join(', '),
        dueDate: late[0].dueDate,
      })
    }

    /* 5. 계약 */
    if (isConfirmed(sp) && sp.agreementStatus !== '서명완료' && daysToEvent <= 90) {
      push({ level: 'serious', category: '계약', title: 'Speaker Agreement 미서명', detail: `현재 상태: ${sp.agreementStatus}`, dueDate: conf.startDate })
    }

    /* 6. 초청 응답 */
    if (sp.stage === '공식초청' && sp.replyDueAt && sp.replyDueAt < today()) {
      push({ level: 'serious', category: '응답', title: '초청 회신 기한 경과', detail: `회신 기한 ${sp.replyDueAt} — 대체 후보 검토 필요`, dueDate: sp.replyDueAt })
    }
  })

  const order: Record<RiskLevel, number> = { critical: 0, serious: 1, warning: 2 }
  return risks.sort((a, b) => order[a.level] - order[b.level])
}

/* ─────────────────────────── 연사별 준비도 ─────────────────────────── */

export interface Readiness {
  score: number
  items: { label: string; done: boolean; na?: boolean }[]
}

export function readiness(sp: Speaker): Readiness {
  const online = sp.attendanceMode === '온라인'
  const docsDone = sp.deliverables.filter(d => d.status === '검수완료').length
  const items = [
    { label: '초청 수락', done: ['수락', '계약완료'].includes(sp.stage) },
    { label: '계약 서명', done: sp.agreementStatus === '서명완료' },
    { label: '비자/입국', done: !sp.visa.required ? sp.visa.ketaStatus !== '신청전' : sp.visa.stage === '발급완료', na: online },
    { label: '항공 발권', done: sp.flights.some(f => f.eTicketReceived), na: online },
    { label: '숙박 확정', done: !!sp.hotel?.confirmationNo, na: online },
    { label: '배차 확정', done: sp.transfers.some(t => t.status === '확정'), na: online || !sp.transfers.length },
    { label: '제출물 검수', done: docsDone >= Math.ceil(sp.deliverables.length * 0.8) },
    { label: '발표자료', done: sp.deliverables.some(d => d.type === '발표자료(PPT)' && ['제출', '검수완료'].includes(d.status)) },
    { label: '정산 정보', done: !!sp.settlement.remittance },
  ]
  const valid = items.filter(i => !i.na)
  return { score: pct(valid.filter(i => i.done).length, valid.length), items }
}

/* ─────────────────────────── 대시보드 지표 ─────────────────────────── */

export interface Kpi {
  confirmed: number
  invited: number
  pipeline: { stage: PipelineStage; count: number }[]
  acceptRate: number
  visaTotal: number
  visaDone: number
  docTotal: number
  docDone: number
  flightsTicketed: number
  flightsNeeded: number
  taskTotal: number
  taskDone: number
  taskOverdue: number
  countries: number
  onlineCount: number
  budgetPlanKRW: number
  budgetCommitKRW: number
  honorariumKRW: number
  withholdingKRW: number
}

export function kpis(state: AppState): Kpi {
  const list = speakersOf(state)
  const conf = activeConference(state)
  const confirmed = list.filter(isConfirmed)
  // 거절·취소 연사도 '공식초청' 단계까지는 실제로 도달했으므로 누적 집계에 포함한다.
  const reachedIdx = (sp: Speaker) =>
    ['거절', '취소'].includes(sp.stage) ? PIPELINE_ORDER.indexOf('공식초청') : PIPELINE_ORDER.indexOf(sp.stage)
  const pipeline = PIPELINE_ORDER.map((stage, target) => ({
    stage,
    count: list.filter(sp => reachedIdx(sp) >= target).length,
  }))
  const responded = list.filter(sp => ['수락', '계약완료', '거절'].includes(sp.stage))
  const visaCases = list.filter(sp => sp.visa.required && sp.stage !== '거절')
  const docs = confirmed.flatMap(sp => sp.deliverables)
  const needFlights = confirmed.filter(sp => sp.attendanceMode !== '온라인')
  const tasks = tasksOf(state)
  const expenses = confirmed.flatMap(sp => sp.settlement.expenses)
  const honorarium = confirmed.reduce((a, sp) => a + sp.settlement.honorarium, 0)

  return {
    confirmed: confirmed.length,
    invited: list.filter(wasInvited).length,
    pipeline,
    acceptRate: pct(list.filter(sp => isConfirmed(sp)).length, responded.length),
    visaTotal: visaCases.length,
    visaDone: visaCases.filter(sp => sp.visa.stage === '발급완료').length,
    docTotal: docs.length,
    docDone: docs.filter(d => d.status === '검수완료').length,
    flightsTicketed: needFlights.filter(sp => sp.flights.some(f => f.eTicketReceived)).length,
    flightsNeeded: needFlights.length,
    taskTotal: tasks.length,
    taskDone: tasks.filter(t => t.status === '완료').length,
    taskOverdue: tasks.filter(t => t.status !== '완료' && t.dueDate < today()).length,
    countries: new Set(list.filter(sp => sp.stage !== '거절').map(sp => sp.country)).size,
    onlineCount: list.filter(sp => sp.attendanceMode === '온라인' && isConfirmed(sp)).length,
    budgetPlanKRW: conf.invitationBudgetKRW,
    budgetCommitKRW: expenses.reduce((a, e) => a + e.amountKRW, 0) + honorarium,
    honorariumKRW: honorarium,
    withholdingKRW: confirmed.reduce((a, sp) => a + Math.round(sp.settlement.honorarium * sp.settlement.withholdingRate / 100), 0),
  }
}

export const taskGroupsByPhase = (tasks: Task[]) => {
  const map = new Map<string, Task[]>()
  tasks.forEach(t => { const arr = map.get(t.phase) ?? []; arr.push(t); map.set(t.phase, arr) })
  return map
}

/* ───────────────────── 데이터 정합성 검증 (휴먼에러 방지) ─────────────────────
   엑셀 취합 과정에서 발생하던 오류(이름 불일치·기간 불일치·누락)를 규칙으로 고정한다.
   ──────────────────────────────────────────────────────────────────────────── */

export type IssueLevel = '오류' | '경고' | '확인'

export interface DataIssue {
  id: string
  level: IssueLevel
  field: string
  message: string
  action: string
}

export function validateSpeaker(sp: Speaker, conf: Conference): DataIssue[] {
  const out: DataIssue[] = []
  const push = (level: IssueLevel, field: string, message: string, action: string) =>
    out.push({ id: `${sp.id}-${out.length}`, level, field, message, action })

  const inbound = sp.flights.find(f => f.direction === '입국')
  const outbound = sp.flights.find(f => f.direction === '출국')
  const online = sp.attendanceMode === '온라인'

  /* 1. 항공 탑승자명 vs 여권 영문명 */
  sp.flights.forEach(f => {
    if (sp.passport && f.passengerName && f.passengerName.replace(/\s/g, '') !== sp.passport.nameEn.replace(/\s/g, '')) {
      push('오류', '항공 탑승자명',
        `${f.flightNo} 탑승자명 "${f.passengerName}" 이 여권 영문명 "${sp.passport.nameEn}" 과 다릅니다.`,
        '항공사에 이름 정정 요청(발권 후 정정 수수료 발생 가능) 후 e-Ticket 재수령')
    }
  })

  /* 2. 송금 수취인명 vs 여권 영문명 */
  const bene = sp.settlement.remittance?.beneficiary
  if (bene && sp.passport && bene.replace(/\s/g, '') !== sp.passport.nameEn.replace(/\s/g, '')) {
    push('오류', '송금 수취인명',
      `송금 수취인 "${bene}" 이 여권 영문명과 다릅니다. 해외 송금이 반송될 수 있습니다.`,
      '연사에게 은행 계좌 영문명 재확인')
  }

  /* 3. 여권 없이 발권 */
  if (!online && sp.flights.length && !sp.passport?.scanReceived) {
    push('오류', '여권 사본',
      '여권 사본 미수취 상태에서 항공 예약이 생성되었습니다.',
      '여권 사본 수취 후 예약 정보(영문명·번호) 대조')
  }

  /* 4. 숙박 기간이 체류 기간을 덮지 못함 */
  if (sp.hotel && inbound && sp.hotel.checkIn > inbound.arriveAt.slice(0, 10)) {
    push('경고', '숙박 기간',
      `입국일(${inbound.arriveAt.slice(0, 10)})보다 체크인(${sp.hotel.checkIn})이 늦습니다. 도착 당일 숙소가 없습니다.`,
      '체크인 일자 조정 또는 도착 편 변경')
  }
  if (sp.hotel && outbound && sp.hotel.checkOut < outbound.departAt.slice(0, 10)) {
    push('경고', '숙박 기간',
      `출국일(${outbound.departAt.slice(0, 10)})보다 체크아웃(${sp.hotel.checkOut})이 빠릅니다.`,
      '체크아웃 연장 또는 레이트 체크아웃 요청')
  }

  /* 5. 세션 일정과 체류 기간 불일치 */
  const mySessions = conf ? sp.programs.filter(p => p.sessionId) : []
  mySessions.forEach(p => {
    if (inbound && p.date < inbound.arriveAt.slice(0, 10)) {
      push('오류', '세션 일정',
        `배정 세션(${p.date})이 입국일(${inbound.arriveAt.slice(0, 10)})보다 빠릅니다.`,
        '항공 일정 또는 세션 배정 변경')
    }
    if (outbound && p.date > outbound.departAt.slice(0, 10)) {
      push('오류', '세션 일정',
        `배정 세션(${p.date})이 출국일(${outbound.departAt.slice(0, 10)}) 이후입니다.`,
        '출국 편 변경 또는 세션 재배정')
    }
  })

  /* 5-1. 프로그램 시각과 항공 시각 충돌 (같은 날이라도 시간대가 어긋나는 경우) */
  const startOf = (t?: string) => (t ? t.split('–')[0].trim() : '00:00')
  const endOf = (t?: string) => (t ? (t.split('–')[1] ?? t.split('–')[0]).trim() : '23:59')
  sp.programs.forEach(p => {
    if (inbound && p.date === inbound.arriveAt.slice(0, 10) && startOf(p.time) < inbound.arriveAt.slice(11, 16)) {
      push('오류', '일정 충돌',
        `${p.name} 시작(${startOf(p.time)})이 입국 도착(${inbound.arriveAt.slice(11, 16)})보다 빠릅니다.`,
        '이전 편으로 변경하거나 프로그램 시간 조정')
    }
    if (outbound && p.date === outbound.departAt.slice(0, 10) && endOf(p.time) > outbound.departAt.slice(11, 16)) {
      push('오류', '일정 충돌',
        `${p.name} 종료(${endOf(p.time)}) 전에 출국편이 출발합니다(${outbound.departAt.slice(11, 16)}).`,
        '출국 편 변경 또는 프로그램 재배정')
    }
  })

  /* 5-2. 지원 한도 초과 숙박 */
  if (sp.hotel && isSponsored(sp) && sp.hotel.nights > sp.supportedNights) {
    push('확인', '숙박 지원 한도',
      `실제 ${sp.hotel.nights}박이나 지원 한도는 ${sp.supportedNights}박입니다. 초과 ${sp.hotel.nights - sp.supportedNights}박의 부담 주체를 확정해야 합니다.`,
      '초과분 승인(예산 반영) 또는 연사 자비 부담 안내')
  }

  /* 6. 동반자 객실·서류 */
  sp.companions.forEach(c => {
    if (c.shareRoom && sp.hotel && sp.hotel.guests < 2) {
      push('경고', '동반자 객실',
        `동반자(${c.name})가 객실을 공유하나 예약 인원이 ${sp.hotel.guests}명입니다.`,
        '호텔에 투숙 인원 변경 통보(조식·침대 타입 포함)')
    }
    if (!c.shareRoom && c.supported && sp.hotel) {
      push('확인', '동반자 객실',
        `동반자(${c.name}) 별도 객실이 필요합니다. 현재 예약에 포함되어 있지 않습니다.`,
        '추가 객실 예약 및 예산 반영')
    }
    if (c.visaRequired && !c.passportReceived) {
      push('경고', '동반자 서류',
        `동반자(${c.name}) 사증이 필요하나 여권 사본이 미수취입니다.`,
        '동반자 여권 사본 요청 및 초청장 별도 발급')
    }
  })

  /* 7. 지원 구분과 예약/정산 정합성 */
  if (sp.sponsorship === 'Non-Sponsored' && sp.settlement.expenses.length) {
    push('경고', '비용 지원 구분',
      '자비 참가(Non-Sponsored)로 등록되어 있으나 주최 부담 실비가 입력되어 있습니다.',
      '지원 구분 또는 실비 내역 수정')
  }
  if (isSponsored(sp) && isConfirmed(sp) && !online && !sp.flights.length) {
    push('경고', '항공',
      '주최 지원 대상이나 항공 예약이 없습니다.',
      '여행사에 스케줄 요청(요금 보장 마감 확인)')
  }

  /* 8. 정산 정보 */
  if (isConfirmed(sp) && sp.settlement.honorarium > 0 && !sp.settlement.remittance) {
    push('경고', '송금 정보',
      '강연료 지급 대상이나 해외 송금 정보가 없습니다.',
      '송금 정보 양식 발송(은행·SWIFT·수취인)')
  }
  if (sp.settlement.taxTreatyApplied && !sp.settlement.corReceived) {
    push('확인', '조세조약',
      '조세조약 제한세율이 적용되어 있으나 거주자증명서가 미수령입니다.',
      '거주자증명서·제한세율 적용 신청서 수령(미수령 시 22% 적용)')
  }

  /* 9. 사증 유효기간 */
  if (sp.visa.required && sp.visa.visaExpiry && inbound && sp.visa.visaExpiry < inbound.arriveAt.slice(0, 10)) {
    push('오류', '사증 유효기간',
      `사증 만료일(${sp.visa.visaExpiry})이 입국 예정일보다 빠릅니다.`,
      '사증 재발급 신청')
  }

  /* 10. 온라인 연사에 오프라인 데이터 */
  if (online && (sp.flights.length || sp.hotel)) {
    push('경고', '참가 형태',
      '온라인 발표 연사에게 항공·숙박 데이터가 입력되어 있습니다.',
      '참가 형태 또는 예약 데이터 정정')
  }

  /* 11. 참석 상태 */
  if (sp.attendance === '참석미정' && dday(conf.startDate) <= 30) {
    push('확인', '참석 확정',
      `개막 ${dday(conf.startDate)}일 전까지 참석 여부가 확정되지 않았습니다.`,
      '참석 확정 재확인 후 프로그램북·현장 운영 반영')
  }
  return out
}

export const validateAll = (state: AppState): { speaker: Speaker; issues: DataIssue[] }[] => {
  const conf = activeConference(state)
  return speakersOf(state)
    .filter(sp => !['거절', '취소'].includes(sp.stage))
    .map(sp => ({ speaker: sp, issues: validateSpeaker(sp, conf) }))
    .filter(x => x.issues.length > 0)
}

/* ───────────────────────── 개인 일정(Itinerary) ───────────────────────── */

export interface ItineraryEvent {
  at: string          // ISODateTime
  time: string
  kind: '항공' | '픽업' | '숙박' | '프로그램' | '리허설' | '이동' | '의전'
  title: string
  detail?: string
  status?: string
}

/** 항공·숙박·배차·프로그램을 하나의 개인 일정으로 합성한다 */
export function buildItinerary(sp: Speaker): { date: string; events: ItineraryEvent[] }[] {
  const ev: ItineraryEvent[] = []
  sp.flights.forEach(f => {
    const at = f.direction === '입국' ? f.arriveAt : f.departAt
    ev.push({
      at, time: at.slice(11, 16), kind: '항공',
      title: `${f.direction} ${f.flightNo} (${f.from} → ${f.to})`,
      detail: `${f.cabin}${f.seat ? ` · 좌석 ${f.seat}` : ''}${f.terminal ? ` · ${f.terminal}` : ''}${f.pnr ? ` · PNR ${f.pnr}` : ''}`,
      status: f.status,
    })
  })
  sp.transfers.forEach(t => {
    ev.push({
      at: t.at, time: t.at.slice(11, 16), kind: t.kind === '행사장이동' ? '이동' : '픽업',
      title: `${t.kind} — ${t.toPlace}`,
      detail: `${t.fromPlace} → ${t.toPlace}${t.vehicle ? ` · ${t.vehicle}` : ''}${t.meetingPoint ? ` · ${t.meetingPoint}` : ''}`,
      status: t.status,
    })
  })
  if (sp.hotel) {
    ev.push({
      at: `${sp.hotel.checkIn}T${sp.hotel.checkInTime ?? '15:00'}`, time: sp.hotel.checkInTime ?? '15:00', kind: '숙박',
      title: `체크인 — ${sp.hotel.hotel}`,
      detail: `${sp.hotel.roomType}${sp.hotel.roomNumber ? ` · ${sp.hotel.roomNumber}호` : ''} · ${sp.hotel.nights}박 · ${sp.hotel.guests}인`,
      status: sp.hotel.status,
    })
    ev.push({
      at: `${sp.hotel.checkOut}T${sp.hotel.checkOutTime ?? '11:00'}`, time: sp.hotel.checkOutTime ?? '11:00', kind: '숙박',
      title: `체크아웃 — ${sp.hotel.hotel}`,
      detail: sp.hotel.billing, status: sp.hotel.status,
    })
  }
  sp.programs.forEach(p => {
    ev.push({
      at: `${p.date}T${(p.time ?? '09:00').slice(0, 5)}`, time: p.time ?? '-', kind: '프로그램',
      title: `${p.type} — ${p.name}`,
      detail: `${p.place ?? ''}${p.seat ? ` · ${p.seat}` : ''}${p.note ? ` · ${p.note}` : ''}`,
      status: p.status,
    })
  })
  const byDate = new Map<string, ItineraryEvent[]>()
  ev.sort((a, b) => (a.at < b.at ? -1 : 1)).forEach(e => {
    const d = e.at.slice(0, 10)
    byDate.set(d, [...(byDate.get(d) ?? []), e])
  })
  return [...byDate.entries()].map(([date, events]) => ({ date, events }))
}
