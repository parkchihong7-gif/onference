import type { AppState, Conference, PipelineStage, Speaker, Task } from '../types'
import { PIPELINE_ORDER } from '../types'
import { dday, daysBetween, pct, today } from './format'

export const activeConference = (s: AppState): Conference =>
  s.conferences.find(c => c.id === s.activeConferenceId) ?? s.conferences[0]

export const speakersOf = (s: AppState) => s.speakers.filter(sp => sp.conferenceId === s.activeConferenceId)
export const tasksOf = (s: AppState) => s.tasks.filter(t => t.conferenceId === s.activeConferenceId)
export const sessionsOf = (s: AppState) => s.sessions.filter(x => x.conferenceId === s.activeConferenceId)
export const commsOf = (s: AppState) => s.communications.filter(c => c.conferenceId === s.activeConferenceId)

export const ACTIVE_STAGES: PipelineStage[] = ['수락', '계약완료']
export const isConfirmed = (sp: Speaker) => ACTIVE_STAGES.includes(sp.stage)

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
      const need = sp.visa.leadTimeDays + (sp.visa.ccviRequired ? 20 : 0) + 7
      if (sp.visa.stage === '거절') {
        push({ level: 'critical', category: '비자', title: '사증 거절 — 대체 시나리오 필요', detail: `${sp.visa.track} 거절. 재신청 또는 온라인 발표 전환 결정 필요.`, dueDate: conf.startDate })
      } else if (daysToEvent < need) {
        push({
          level: daysToEvent < need * 0.6 ? 'critical' : 'serious',
          category: '비자',
          title: `비자 처리 기간 부족 (필요 ${need}일 / 잔여 ${daysToEvent}일)`,
          detail: `${sp.country} · ${sp.visa.track} · 현재 "${sp.visa.stage}"${sp.visa.ccviRequired ? ' · 사증발급인정서 심사 포함' : ''}`,
          dueDate: conf.startDate,
        })
      } else if (daysToEvent - need < 14) {
        push({ level: 'serious', category: '비자', title: `비자 일정 여유 2주 미만 (여유 ${daysToEvent - need}일)`, detail: `${sp.country} · ${sp.visa.track} · 현재 "${sp.visa.stage}" — 지연 시 복구 불가`, dueDate: conf.startDate })
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
  const pipeline = PIPELINE_ORDER.map(stage => ({
    stage,
    count: list.filter(sp => {
      const idx = PIPELINE_ORDER.indexOf(sp.stage)
      const target = PIPELINE_ORDER.indexOf(stage)
      return idx >= target && idx >= 0
    }).length,
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
    invited: list.filter(sp => PIPELINE_ORDER.indexOf(sp.stage) >= 3 || sp.stage === '거절').length,
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
