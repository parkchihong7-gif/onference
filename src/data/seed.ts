/**
 * 데모 시드 데이터
 * 실제 국제 컨퍼런스 해외 연사 초청 실무(비자·발권·원천징수·의전)를 반영한 가상 데이터.
 * 인물/기관명은 모두 가상이며, 내부 기능 검증용이다.
 */
import type {
  AppState, ChecklistTemplate, Communication, Conference, Deliverable, DeliverableType,
  Flight, ID, MailTemplate, Member, Session, Speaker, SupportPackage, Task, AuditLog,
} from '../types'
import { PHASES } from '../types'

export const TODAY = '2026-09-16'

const d = (iso: string) => new Date(iso + 'T00:00:00')
export const addDays = (iso: string, n: number): string => {
  const t = d(iso); t.setDate(t.getDate() + n)
  return t.toISOString().slice(0, 10)
}

/* 결정적 의사난수 — 새로고침해도 동일한 데모 데이터를 보장 */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h)
}
const pick = <T,>(seed: string, arr: T[]): T => arr[hash(seed) % arr.length]

/* ─────────────────────────────── 구성원 ─────────────────────────────── */

export const members: Member[] = [
  { id: 'M01', name: '박치홍', role: '사무국', org: '한국스마트도시학회 사무국', email: 'ch.park@sscai.org', phone: '02-555-0101', languages: ['KO', 'EN'] },
  { id: 'M02', name: '김서연', role: '사무국', org: '한국스마트도시학회 사무국', email: 'sy.kim@sscai.org', phone: '02-555-0102', languages: ['KO', 'EN'] },
  { id: 'M03', name: '이도현', role: 'PCO', org: '(주)글로벌컨벤션파트너스', email: 'dh.lee@gcp.co.kr', phone: '02-777-3020', languages: ['KO', 'EN'] },
  { id: 'M04', name: '정하늘', role: 'PCO', org: '(주)글로벌컨벤션파트너스', email: 'hn.jung@gcp.co.kr', phone: '02-777-3021', languages: ['KO', 'EN', 'JP'] },
  { id: 'M05', name: 'Grace Yoon', role: '리에종', org: '사무국 국제협력팀', email: 'grace.yoon@sscai.org', phone: '010-2222-8811', languages: ['KO', 'EN', 'FR'] },
  { id: 'M06', name: '왕첸', role: '리에종', org: '사무국 국제협력팀', email: 'chen.wang@sscai.org', phone: '010-2222-8812', languages: ['KO', 'EN', 'CN'] },
  { id: 'M07', name: '최민규', role: '여행사', org: '유니투어 MICE사업부', email: 'mk.choi@unitour.co.kr', phone: '02-311-4400', languages: ['KO', 'EN'] },
  { id: 'M08', name: '한지우', role: '재무', org: '사무국 경영지원팀', email: 'jw.han@sscai.org', phone: '02-555-0180', languages: ['KO'] },
]

/* ─────────────────────────────── 행사 ──────────────────────────────── */

export const CONF_MAIN = 'CONF-2026-SSC'
const START = '2026-11-18'

export const conferences: Conference[] = [
  {
    id: CONF_MAIN,
    code: 'SSC2026',
    nameKo: '제12회 국제 스마트시티·AI 컨퍼런스',
    nameEn: '12th International Smart City & AI Conference',
    edition: '12th',
    startDate: START,
    endDate: '2026-11-20',
    venue: '코엑스 그랜드볼룸 · 컨퍼런스룸 300~318',
    city: '서울',
    country: '대한민국',
    timezone: 'Asia/Seoul (UTC+9)',
    host: '한국스마트도시학회',
    organizer: '국제스마트시티협의체(GSCC)',
    pco: '(주)글로벌컨벤션파트너스',
    sponsors: ['국토교통부', '서울특별시', '한국관광공사 MICE뷰로', 'KT', 'Hyundai Motor Group'],
    website: 'https://ssc2026.example.org',
    status: '준비',
    expectedAttendees: 2400,
    budgetTotalKRW: 1_850_000_000,
    invitationBudgetKRW: 430_000_000,
    baseCurrency: 'KRW',
    tracks: ['Urban AI', 'Mobility', 'Digital Twin', 'Climate & Energy', 'Governance & Policy'],
    milestones: [
      { id: 'MS1', label: '연사 선정위원회 최종 확정', date: addDays(START, -150), phase: '발굴·선정', owner: 'M01' },
      { id: 'MS2', label: '공식 초청장 발송 완료', date: addDays(START, -140), phase: '초청·계약', owner: 'M02' },
      { id: 'MS3', label: '비자 서류(여권·초청사유서) 수취 마감', date: addDays(START, -90), phase: '출입국·비자', owner: 'M05' },
      { id: 'MS4', label: '사증발급인정서(CCVI) 신청 마감', date: addDays(START, -75), phase: '출입국·비자', owner: 'M06' },
      { id: 'MS5', label: '국제선 발권 마감(요금 보장)', date: addDays(START, -60), phase: '여행·의전', owner: 'M07' },
      { id: 'MS6', label: '초록·약력·사진 수집 마감', date: addDays(START, -60), phase: '콘텐츠·발표', owner: 'M04' },
      { id: 'MS7', label: '프로그램북 인쇄 입고', date: addDays(START, -25), phase: '콘텐츠·발표', owner: 'M03' },
      { id: 'MS8', label: '발표자료 최종 수취', date: addDays(START, -14), phase: '콘텐츠·발표', owner: 'M04' },
      { id: 'MS9', label: '의전·배차 확정', date: addDays(START, -10), phase: '여행·의전', owner: 'M03' },
      { id: 'MS10', label: '강연료 지급 및 원천징수 신고', date: addDays(START, 14), phase: '정산·사후', owner: 'M08' },
    ],
    notes: '해외 연사 14명(6개 타임존). 비자 필요 국가 5개국 · CCVI 대상 3명.',
  },
  {
    id: 'CONF-2027-BIO',
    code: 'GBH2027',
    nameKo: '2027 글로벌 바이오헬스 서밋',
    nameEn: 'Global Bio-Health Summit 2027',
    edition: '5th',
    startDate: '2027-03-10',
    endDate: '2027-03-12',
    venue: '부산 BEXCO 제1전시장',
    city: '부산',
    country: '대한민국',
    timezone: 'Asia/Seoul (UTC+9)',
    host: '대한바이오헬스진흥원',
    organizer: '대한바이오헬스진흥원',
    pco: '(주)글로벌컨벤션파트너스',
    sponsors: ['보건복지부', '부산광역시'],
    website: 'https://gbh2027.example.org',
    status: '기획',
    expectedAttendees: 1500,
    budgetTotalKRW: 980_000_000,
    invitationBudgetKRW: 260_000_000,
    baseCurrency: 'KRW',
    tracks: ['Digital Therapeutics', 'Bio Manufacturing', 'Regulatory'],
    milestones: [
      { id: 'MS1', label: '연사 롱리스트 작성', date: '2026-10-05', phase: '발굴·선정', owner: 'M02' },
      { id: 'MS2', label: '선정위원회 1차', date: '2026-10-26', phase: '발굴·선정', owner: 'M01' },
    ],
  },
  {
    id: 'CONF-2026-MOB',
    code: 'AMF2026',
    nameKo: '2026 아시아 모빌리티 포럼',
    nameEn: 'Asia Mobility Forum 2026',
    edition: '8th',
    startDate: '2026-05-13',
    endDate: '2026-05-14',
    venue: '인천 송도컨벤시아',
    city: '인천',
    country: '대한민국',
    timezone: 'Asia/Seoul (UTC+9)',
    host: '아시아모빌리티협회',
    organizer: '아시아모빌리티협회',
    pco: '(주)글로벌컨벤션파트너스',
    sponsors: ['인천광역시'],
    website: 'https://amf2026.example.org',
    status: '종료',
    expectedAttendees: 900,
    budgetTotalKRW: 620_000_000,
    invitationBudgetKRW: 140_000_000,
    baseCurrency: 'KRW',
    tracks: ['UAM', 'Logistics'],
    milestones: [{ id: 'MS1', label: '정산 마감', date: '2026-06-10', phase: '정산·사후', owner: 'M08' }],
  },
]

/* ───────────────────────── 지원 패키지(초기 세팅 템플릿) ───────────────────────── */

export const supportPackages: SupportPackage[] = [
  {
    id: 'PKG-KEY', name: '기조연사 패키지 (Keynote)', tier: 'Keynote',
    airCabin: '비즈니스', airTicketedBy: '주최발권', hotelNights: 4, hotelGrade: '5성급 스위트',
    hotelBilling: '주최일괄(Master Bill)', perDiemKRW: 150_000, honorariumKRW: 6_000_000,
    groundTransfer: true, companionSupported: true, companionScope: '동반 1인 숙박 공유 · 항공 미지원',
    insurance: true, notes: '공항 VIP 의전 · 전담 리에종 1:1 배정',
  },
  {
    id: 'PKG-INV', name: '초청연사 패키지 (Invited)', tier: 'Invited',
    airCabin: '프리미엄이코노미', airTicketedBy: '주최발권', hotelNights: 3, hotelGrade: '5성급 디럭스',
    hotelBilling: '주최일괄(Master Bill)', perDiemKRW: 100_000, honorariumKRW: 3_000_000,
    groundTransfer: true, companionSupported: false, insurance: true,
  },
  {
    id: 'PKG-PNL', name: '패널·좌장 패키지 (Panel)', tier: 'Panel',
    airCabin: '이코노미', airTicketedBy: '본인구매후정산', hotelNights: 2, hotelGrade: '4성급 스탠다드',
    hotelBilling: '본인결제후정산', perDiemKRW: 80_000, honorariumKRW: 1_500_000,
    groundTransfer: false, companionSupported: false, insurance: true,
  },
  {
    id: 'PKG-WKS', name: '워크숍 강사 패키지 (Workshop)', tier: 'Workshop',
    airCabin: '이코노미', airTicketedBy: '본인구매후정산', hotelNights: 2, hotelGrade: '4성급 스탠다드',
    hotelBilling: '본인결제후정산', perDiemKRW: 80_000, honorariumKRW: 1_200_000,
    groundTransfer: false, companionSupported: false, insurance: false,
  },
  {
    id: 'PKG-ONL', name: '온라인 연사 패키지 (Remote)', tier: 'Invited',
    airCabin: '이코노미', airTicketedBy: '본인구매후정산', hotelNights: 0, hotelGrade: '-',
    hotelBilling: '본인결제후정산', perDiemKRW: 0, honorariumKRW: 1_000_000,
    groundTransfer: false, companionSupported: false, insurance: false,
    notes: '시차 고려 사전 녹화 옵션 · 테크 리허설 필수',
  },
]

/* ─────────────────────────────── 세션 ──────────────────────────────── */

export const sessions: Session[] = [
  { id: 'S01', conferenceId: CONF_MAIN, title: '개회식 및 환영사', type: '개회식', track: 'Governance & Policy', date: '2026-11-18', startTime: '09:30', endTime: '10:00', room: '그랜드볼룸', mode: '현장', language: 'KO/EN', interpretation: true, chairMemberId: 'M01', speakerIds: [], recorded: true },
  { id: 'S02', conferenceId: CONF_MAIN, title: 'Keynote I — Urban AI and the Next Decade of City Operations', type: '기조연설', track: 'Urban AI', date: '2026-11-18', startTime: '10:00', endTime: '10:50', room: '그랜드볼룸', mode: '현장', language: 'EN', interpretation: true, chairMemberId: 'M01', speakerIds: ['SPK-2026-001'], capacity: 1200, recorded: true },
  { id: 'S03', conferenceId: CONF_MAIN, title: 'Keynote II — Data Sovereignty in Cross-border Smart City Platforms', type: '기조연설', track: 'Governance & Policy', date: '2026-11-18', startTime: '11:00', endTime: '11:50', room: '그랜드볼룸', mode: '현장', language: 'EN', interpretation: true, chairMemberId: 'M02', speakerIds: ['SPK-2026-003'], capacity: 1200, recorded: true },
  { id: 'S04', conferenceId: CONF_MAIN, title: 'Track A — Digital Twin for Urban Resilience', type: '초청강연', track: 'Digital Twin', date: '2026-11-18', startTime: '14:00', endTime: '15:30', room: '컨퍼런스룸 301', mode: '하이브리드', language: 'EN', interpretation: false, chairMemberId: 'M03', speakerIds: ['SPK-2026-002', 'SPK-2026-012'], capacity: 250, recorded: true },
  { id: 'S05', conferenceId: CONF_MAIN, title: 'Track B — Mobility-as-a-Service in Emerging Cities', type: '초청강연', track: 'Mobility', date: '2026-11-19', startTime: '10:00', endTime: '11:30', room: '컨퍼런스룸 305', mode: '현장', language: 'EN', interpretation: true, chairMemberId: 'M03', speakerIds: ['SPK-2026-004', 'SPK-2026-009'], capacity: 250, recorded: true },
  { id: 'S06', conferenceId: CONF_MAIN, title: 'Keynote III — Climate-Adaptive Infrastructure Financing', type: '기조연설', track: 'Climate & Energy', date: '2026-11-19', startTime: '13:00', endTime: '13:50', room: '그랜드볼룸', mode: '현장', language: 'EN', interpretation: true, chairMemberId: 'M01', speakerIds: ['SPK-2026-010'], capacity: 1200, recorded: true },
  { id: 'S07', conferenceId: CONF_MAIN, title: 'Panel — Global South Perspectives on Urban AI Governance', type: '패널토론', track: 'Governance & Policy', date: '2026-11-19', startTime: '15:00', endTime: '16:30', room: '컨퍼런스룸 300', mode: '현장', language: 'EN', interpretation: true, chairMemberId: 'M02', speakerIds: ['SPK-2026-005', 'SPK-2026-011', 'SPK-2026-006', 'SPK-2026-014'], capacity: 300, recorded: true },
  { id: 'S08', conferenceId: CONF_MAIN, title: 'Workshop — Building Open Urban Data Pipelines', type: '워크숍', track: 'Urban AI', date: '2026-11-20', startTime: '09:30', endTime: '12:00', room: '컨퍼런스룸 312', mode: '현장', language: 'EN', interpretation: false, chairMemberId: 'M04', speakerIds: ['SPK-2026-009'], capacity: 60, recorded: false },
  { id: 'S09', conferenceId: CONF_MAIN, title: 'Roundtable — City-to-City AI Policy Alignment', type: '라운드테이블', track: 'Governance & Policy', date: '2026-11-20', startTime: '13:30', endTime: '15:00', room: '컨퍼런스룸 318', mode: '현장', language: 'EN', interpretation: false, chairMemberId: 'M01', speakerIds: ['SPK-2026-007', 'SPK-2026-013'], capacity: 40, recorded: false },
  { id: 'S10', conferenceId: CONF_MAIN, title: 'Gala Dinner & Award Ceremony', type: '만찬', track: 'Governance & Policy', date: '2026-11-19', startTime: '18:30', endTime: '21:00', room: '인터컨티넨탈 하모니볼룸', mode: '현장', language: 'KO/EN', interpretation: true, chairMemberId: 'M01', speakerIds: [], recorded: false },
]

/* ─────────────────── 제출물 / 정산 / 현장 기본값 생성기 ─────────────────── */

const DELIVERABLE_PLAN: { type: DeliverableType; offset: number; euOnly?: boolean; treatyOnly?: boolean; onsiteOnly?: boolean }[] = [
  { type: '강연동의서(Speaker Agreement)', offset: -110 },
  { type: '여권사본', offset: -95, onsiteOnly: true },
  { type: '항공선호정보', offset: -90, onsiteOnly: true },
  { type: '약력(Bio)', offset: -70 },
  { type: 'CV', offset: -70 },
  { type: '증명사진', offset: -70 },
  { type: '발표초록(Abstract)', offset: -60 },
  { type: '녹화·중계 동의서', offset: -60 },
  { type: '개인정보 처리 동의(GDPR)', offset: -60, euOnly: true },
  { type: '해외송금 정보(W-8/은행)', offset: -45 },
  { type: '거주자증명서(CoR)', offset: -45, treatyOnly: true },
  { type: '여행자보험 정보', offset: -30, onsiteOnly: true },
  { type: '발표자료(PPT)', offset: -14 },
]

const EU_COUNTRIES = ['프랑스', '독일', '네덜란드', '노르웨이', '이탈리아']
const STAGE_RANK: Record<string, number> = {
  '후보발굴': 0, '내부승인': 1, '사전타진': 2, '공식초청': 3, '수락': 4, '계약완료': 5, '거절': -1, '취소': -1,
}

function makeDeliverables(code: string, stage: string, country: string, mode: string, treaty: boolean): Deliverable[] {
  const rank = STAGE_RANK[stage] ?? 0
  return DELIVERABLE_PLAN
    .filter(p => (!p.euOnly || EU_COUNTRIES.includes(country)))
    .filter(p => (!p.treatyOnly || treaty))
    .filter(p => (!p.onsiteOnly || mode !== '온라인'))
    .map((p, i) => {
      const dueDate = addDays(START, p.offset)
      const overdue = dueDate < TODAY
      let status: Deliverable['status'] = '요청전'
      let submittedAt: string | undefined
      if (rank >= 4) {
        const r = hash(code + p.type) % 100
        if (overdue) {
          if (r < 68) { status = '검수완료'; submittedAt = addDays(dueDate, -(r % 9)) }
          else if (r < 84) { status = '제출'; submittedAt = addDays(dueDate, -(r % 4)) }
          else if (r < 92) { status = '반려'; submittedAt = addDays(dueDate, -2) }
          else status = '기한초과'
        } else {
          status = r < 55 ? '요청함' : r < 70 ? '제출' : '요청전'
          if (status === '제출') submittedAt = addDays(TODAY, -(r % 12))
        }
        if (rank === 5 && status === '기한초과' && hash(code) % 2 === 0) { status = '검수완료'; submittedAt = dueDate }
      } else if (rank === 3) {
        status = p.offset <= -100 ? '요청함' : '요청전'
      }
      return {
        id: `${code}-D${String(i + 1).padStart(2, '0')}`,
        type: p.type, dueDate, status, submittedAt,
        fileName: submittedAt ? `${code}_${p.type.replace(/[^가-힣A-Za-z]/g, '')}.pdf` : undefined,
        version: submittedAt ? 1 + (hash(code + p.type) % 3) : undefined,
        reviewer: submittedAt ? pick(code + p.type, ['M04', 'M05', 'M06']) : undefined,
      }
    })
}

const FX: Record<string, number> = { KRW: 1, USD: 1380, EUR: 1490, JPY: 9.1, GBP: 1750, SGD: 1020 }
export const toKRW = (amount: number, cur: string) => Math.round(amount * (FX[cur] ?? 1))

/* ─────────────────────────────── 초청자(연사) ─────────────────────────── */

type Route = { iata: string; cityEn: string; carrier: string; inNo: string; outNo: string; fare: number; cur: keyof typeof FX; hours: number }

interface Spec {
  n: number
  nameEn: string
  title: string
  affiliation: string
  department?: string
  country: string
  city: string
  tz: string
  tier: Speaker['tier']
  stage: Speaker['stage']
  mode?: Speaker['attendanceMode']
  pkg: string
  liaison: ID
  priority?: Speaker['priority']
  fields: string[]
  langs: string[]
  sessionIds?: string[]
  visa: Speaker['visa']
  route?: Route
  hotelNights?: number
  dietary?: string
  accessibility?: string
  interpretation?: boolean
  companions?: Speaker['companions']
  recommendedBy?: string
  previousParticipation?: string
  treatyRate?: number          // 조세조약 제한세율(%) — 미적용 시 22%
  honorariumKRW?: number
  tags?: string[]
  memo?: string
  declineReason?: string
  passportExpiry?: string
  agreement?: Speaker['agreementStatus']
}

const HOTEL = '인터컨티넨탈 서울 코엑스'

function mk(s: Spec): Speaker {
  const code = `SPK-2026-${String(s.n).padStart(3, '0')}`
  const rank = STAGE_RANK[s.stage] ?? 0
  const mode = s.mode ?? '현장'
  const pkg = supportPackages.find(p => p.id === s.pkg)!
  const treaty = s.treatyRate !== undefined
  const onsite = mode !== '온라인'
  const nights = s.hotelNights ?? pkg.hotelNights
  const flights: Flight[] = []
  const transfers: Speaker['transfers'] = []

  if (s.route && rank >= 4 && onsite) {
    const r = s.route
    const jitter = hash(code) % 5
    const arrDate = addDays(START, -1)
    const depDate = addDays(START, 3)
    flights.push({
      id: `${code}-F1`, direction: '입국', carrier: r.carrier, flightNo: r.inNo,
      from: r.iata, to: 'ICN',
      departAt: `${addDays(arrDate, r.hours > 10 ? -1 : 0)}T${String(9 + jitter).padStart(2, '0')}:40`,
      arriveAt: `${arrDate}T${String(13 + jitter).padStart(2, '0')}:25`,
      cabin: pkg.airCabin, pnr: rank === 5 ? `${r.carrier}${hash(code + 'pnr') % 900000 + 100000}` : undefined,
      ticketedBy: pkg.airTicketedBy, eTicketReceived: rank === 5,
      fare: r.fare, currency: r.cur as Speaker['settlement']['currency'],
      baggage: pkg.airCabin === '비즈니스' ? '2PC 32kg' : '1PC 23kg',
    })
    flights.push({
      id: `${code}-F2`, direction: '출국', carrier: r.carrier, flightNo: r.outNo,
      from: 'ICN', to: r.iata,
      departAt: `${depDate}T${String(10 + jitter).padStart(2, '0')}:15`,
      arriveAt: `${depDate}T${String(16 + jitter).padStart(2, '0')}:05`,
      cabin: pkg.airCabin, pnr: rank === 5 ? `${r.carrier}${hash(code + 'pnr') % 900000 + 100000}` : undefined,
      ticketedBy: pkg.airTicketedBy, eTicketReceived: rank === 5,
      fare: 0, currency: r.cur as Speaker['settlement']['currency'],
    })
    if (pkg.groundTransfer) {
      transfers.push({
        id: `${code}-T1`, kind: '공항픽업', at: `${arrDate}T${String(14 + jitter).padStart(2, '0')}:10`,
        fromPlace: '인천공항 제2터미널 입국장 E', toPlace: HOTEL,
        vehicle: pkg.tier === 'Keynote' ? '카니발 하이리무진' : '카니발 9인승',
        meetingPoint: '입국장 E 게이트 · 연사명 피켓',
        assignedMemberId: s.liaison,
        status: rank === 5 ? '확정' : '예정',
      })
      transfers.push({
        id: `${code}-T2`, kind: '공항샌딩', at: `${depDate}T${String(7 + jitter).padStart(2, '0')}:00`,
        fromPlace: HOTEL, toPlace: '인천공항 제2터미널',
        vehicle: '카니발 9인승', assignedMemberId: s.liaison, status: rank === 5 ? '확정' : '예정',
      })
    }
  }

  const honorarium = s.honorariumKRW ?? pkg.honorariumKRW
  const expenses: Speaker['settlement']['expenses'] = []
  if (rank >= 4 && onsite && s.route) {
    expenses.push({
      id: `${code}-E1`, category: '항공', description: `${s.route.iata}–ICN 왕복 (${pkg.airCabin})`,
      amount: s.route.fare, currency: s.route.cur as Speaker['settlement']['currency'],
      amountKRW: toKRW(s.route.fare, s.route.cur), receipt: rank === 5,
      status: rank === 5 ? '청구' : '예정',
    })
    expenses.push({
      id: `${code}-E2`, category: '숙박', description: `${HOTEL} ${nights}박 (${pkg.hotelGrade})`,
      amount: nights * 320_000, currency: 'KRW', amountKRW: nights * 320_000,
      receipt: false, status: '예정',
    })
    expenses.push({
      id: `${code}-E3`, category: '지상교통', description: '공항 픽업/샌딩 및 행사장 이동',
      amount: pkg.groundTransfer ? 320_000 : 0, currency: 'KRW',
      amountKRW: pkg.groundTransfer ? 320_000 : 0, receipt: false, status: '예정',
    })
    if (s.visa.required) {
      expenses.push({
        id: `${code}-E4`, category: '비자수수료', description: '사증발급인정서 및 사증 수수료',
        amount: 120_000, currency: 'KRW', amountKRW: 120_000, receipt: false, status: '예정',
      })
    }
  }

  return {
    id: code, code, conferenceId: CONF_MAIN,
    nameEn: s.nameEn, title: s.title, affiliation: s.affiliation, department: s.department,
    country: s.country, city: s.city, timezone: s.tz,
    email: `${s.nameEn.split(' ').slice(-1)[0].toLowerCase()}@${s.affiliation.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}.example.org`,
    phone: `+${(hash(code) % 89) + 10}-${hash(code + 'p') % 900 + 100}-${hash(code + 'q') % 9000 + 1000}`,
    assistantName: s.tier === 'Keynote' ? 'Executive Assistant' : undefined,
    assistantEmail: s.tier === 'Keynote' ? `office@${s.affiliation.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}.example.org` : undefined,
    researchFields: s.fields, languages: s.langs,
    profileUrl: `https://scholar.example.org/${s.nameEn.replace(/\s/g, '-').toLowerCase()}`,
    tier: s.tier, stage: s.stage, priority: s.priority ?? (s.tier === 'Keynote' ? '상' : '중'),
    attendanceMode: mode, recommendedBy: s.recommendedBy,
    previousParticipation: s.previousParticipation,
    supportPackageId: s.pkg, liaisonMemberId: s.liaison, sessionIds: s.sessionIds ?? [],
    firstContactAt: rank >= 2 ? addDays(START, -165 + (hash(code) % 10)) : undefined,
    replyDueAt: rank >= 3 ? addDays(START, -135 + (hash(code) % 8)) : undefined,
    acceptedAt: rank >= 4 ? addDays(START, -130 + (hash(code) % 20)) : undefined,
    declinedAt: s.stage === '거절' ? addDays(START, -132) : undefined,
    declineReason: s.declineReason,
    agreementStatus: s.agreement ?? (rank === 5 ? '서명완료' : rank === 4 ? '발송' : '미발송'),
    agreementSignedAt: (s.agreement ?? (rank === 5 ? '서명완료' : '')) === '서명완료' ? addDays(START, -108 + (hash(code) % 12)) : undefined,
    dietary: s.dietary, accessibility: s.accessibility,
    interpretationNeeded: s.interpretation ?? false,
    companions: s.companions ?? [],
    passport: rank >= 4 && onsite ? {
      nameEn: s.nameEn.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.)\s/, '').toUpperCase(),
      numberMasked: `${s.country.slice(0, 1)}${hash(code + 'pp') % 9000000 + 1000000}`.replace(/(\d{3})(\d+)/, '$1****'),
      nationality: s.country,
      issueDate: '2021-0' + ((hash(code) % 8) + 1) + '-1' + (hash(code) % 9),
      expiryDate: s.passportExpiry ?? '2031-0' + ((hash(code) % 8) + 1) + '-1' + (hash(code) % 9),
      scanReceived: true,
    } : undefined,
    visa: s.visa,
    flights,
    hotel: rank >= 4 && onsite ? {
      hotel: HOTEL, address: '서울 강남구 테헤란로 521',
      checkIn: addDays(START, -1), checkOut: addDays(START, -1 + nights), nights,
      roomType: pkg.hotelGrade, billing: pkg.hotelBilling,
      confirmationNo: rank === 5 ? `IC${hash(code + 'h') % 900000 + 100000}` : undefined,
      ratePerNight: 320_000, currency: 'KRW',
      requests: s.dietary ? `조식 ${s.dietary} 대응 요청` : undefined,
    } : undefined,
    transfers,
    deliverables: makeDeliverables(code, s.stage, s.country, mode, treaty),
    settlement: {
      honorarium, currency: 'KRW',
      withholdingRate: s.treatyRate ?? 22,
      taxTreatyApplied: treaty,
      treatyCountry: treaty ? s.country : undefined,
      corReceived: treaty ? rank === 5 && hash(code) % 3 !== 0 : false,
      netPayment: Math.round(honorarium * (1 - (s.treatyRate ?? 22) / 100)),
      remittance: rank >= 4 ? {
        bankName: pick(code + 'bank', ['HSBC', 'Citibank', 'Deutsche Bank', 'DBS Bank', 'BNP Paribas', 'Standard Chartered']),
        swift: `${pick(code + 'sw', ['HSBC', 'CITI', 'DEUT', 'DBSS'])}${s.country.slice(0, 2).toUpperCase()}XX`,
        accountMasked: `****${hash(code + 'acc') % 9000 + 1000}`,
        beneficiary: s.nameEn.replace(/^(Prof\.|Dr\.)\s/, '').toUpperCase(),
        feeBearer: '주최부담(OUR)',
      } : undefined,
      expenses,
    },
    onsite: { badgeIssued: false, rehearsalDone: false, giftHandedOver: false },
    tags: s.tags ?? [],
    memo: s.memo,
    createdAt: addDays(START, -200), updatedAt: addDays(TODAY, -(hash(code) % 14)),
  }
}

const R = (iata: string, cityEn: string, carrier: string, inNo: string, outNo: string, fare: number, cur: keyof typeof FX, hours: number): Route =>
  ({ iata, cityEn, carrier, inNo, outNo, fare, cur, hours })

export const speakers: Speaker[] = [
  mk({
    n: 1, nameEn: 'Prof. Adrian Mercer', title: 'Director, Centre for Urban Intelligence',
    affiliation: 'Thameside Institute of Technology', department: 'School of Computing',
    country: '영국', city: 'London', tz: 'Europe/London (UTC+0)',
    tier: 'Keynote', stage: '계약완료', pkg: 'PKG-KEY', liaison: 'M05', priority: '상',
    fields: ['Urban AI', 'Digital Twin', 'Public Sector AI'], langs: ['EN'],
    sessionIds: ['S02'], interpretation: true,
    visa: { required: false, track: 'K-ETA', stage: '해당없음', ketaRequired: true, ketaStatus: '승인', ccviRequired: false, leadTimeDays: 3, guaranteeLetterRequired: false, memo: 'K-ETA 승인 완료(유효기간 3년).' },
    route: R('LHR', 'London', 'KE', 'KE908', 'KE907', 4300, 'GBP', 11),
    dietary: '해산물 알러지', companions: [{ id: 'C1', name: 'Helen Mercer', relation: '배우자', visaRequired: false, supported: true, memo: '숙박 공유 · 갈라디너 참석' }],
    recommendedBy: '조직위원장 추천', previousParticipation: 'SSC2023 패널 참여',
    treatyRate: 0, tags: ['VIP', '기조연설', '언론인터뷰'], memo: '개회 기조연설. 도착일 언론 인터뷰 1건 예정(11/17 16:00).',
  }),
  mk({
    n: 2, nameEn: 'Dr. Leila Haddad', title: 'Senior Research Fellow',
    affiliation: 'Rhone Urban Systems Lab', country: '프랑스', city: 'Lyon', tz: 'Europe/Paris (UTC+1)',
    tier: 'Invited', stage: '계약완료', pkg: 'PKG-INV', liaison: 'M05',
    fields: ['Digital Twin', 'Urban Resilience'], langs: ['EN', 'FR', 'AR'],
    sessionIds: ['S04'],
    visa: { required: false, track: '면제(무비자)', stage: '해당없음', ketaRequired: false, ketaStatus: '해당없음', ccviRequired: false, leadTimeDays: 0, guaranteeLetterRequired: false, memo: '프랑스 국적 90일 무비자.' },
    route: R('CDG', 'Paris', 'AF', 'AF264', 'AF267', 3800, 'EUR', 11),
    dietary: '할랄', treatyRate: 0, tags: ['GDPR'], memo: 'GDPR 동의서 필수 · 발표 영상 공개 범위 제한(사내 아카이브만).',
  }),
  mk({
    n: 3, nameEn: 'Prof. Mei-Ling Chao', title: 'Professor of Public Policy',
    affiliation: 'Marina Bay Policy School', country: '싱가포르', city: 'Singapore', tz: 'Asia/Singapore (UTC+8)',
    tier: 'Keynote', stage: '계약완료', pkg: 'PKG-KEY', liaison: 'M06', priority: '상',
    fields: ['Data Governance', 'Cross-border Data'], langs: ['EN', 'CN'],
    sessionIds: ['S03'], interpretation: true,
    visa: { required: false, track: '면제(무비자)', stage: '해당없음', ketaRequired: false, ketaStatus: '해당없음', ccviRequired: false, leadTimeDays: 0, guaranteeLetterRequired: false },
    route: R('SIN', 'Singapore', 'SQ', 'SQ600', 'SQ603', 2900, 'SGD', 6),
    treatyRate: 15, tags: ['VIP', '기조연설'], memo: '한-싱 조세조약 제한세율 15% 적용 예정 — 거주자증명서 필수.',
  }),
  mk({
    n: 4, nameEn: 'Dr. Rajesh Menon', title: 'Head of Mobility Practice',
    affiliation: 'Deccan Mobility Foundation', country: '인도', city: 'Bengaluru', tz: 'Asia/Kolkata (UTC+5:30)',
    tier: 'Invited', stage: '계약완료', pkg: 'PKG-INV', liaison: 'M06',
    fields: ['MaaS', 'Transit Planning'], langs: ['EN', 'HI'],
    sessionIds: ['S05'],
    visa: {
      required: true, track: 'C-4 단기취업', stage: '영사관접수', ketaRequired: false, ketaStatus: '해당없음',
      ccviRequired: true, ccviNumber: 'CCVI-2026-0418', consulate: '주뭄바이 대한민국 총영사관',
      appointmentAt: '2026-09-24T10:30', submittedAt: '2026-09-24', leadTimeDays: 21,
      invitationLetterIssuedAt: addDays(START, -88), guaranteeLetterRequired: true,
      memo: '강연료 수령으로 C-4(단기취업) 판정. 사증발급인정서 발급 완료 후 영사관 접수됨.',
    },
    route: R('BLR', 'Bengaluru', 'KE', 'KE640', 'KE639', 2400, 'USD', 9),
    dietary: '채식(락토오보)', treatyRate: 10, tags: ['비자진행'], memo: '한-인도 조세조약 사용료·인적용역 10% 적용 검토 중.',
  }),
  mk({
    n: 5, nameEn: 'Dr. Fatima Al-Zahra', title: 'Director of Climate Programmes',
    affiliation: 'Nile Delta Climate Institute', country: '이집트', city: 'Cairo', tz: 'Africa/Cairo (UTC+2)',
    tier: 'Invited', stage: '수락', pkg: 'PKG-INV', liaison: 'M05', priority: '상',
    fields: ['Climate Adaptation', 'Urban Water'], langs: ['EN', 'AR'],
    sessionIds: ['S07'],
    visa: {
      required: true, track: 'C-3-1 단기방문', stage: '서류요청', ketaRequired: false, ketaStatus: '해당없음',
      ccviRequired: true, consulate: '주이집트 대한민국 대사관', leadTimeDays: 30,
      guaranteeLetterRequired: true,
      memo: '⚠ 여권 사본 미수신. CCVI 신청(법무부 심사 약 20일) + 영사 심사 30일 필요 — 일정 위험.',
    },
    route: R('CAI', 'Cairo', 'QR', 'QR1304', 'QR1305', 2800, 'USD', 14),
    dietary: '할랄', interpretation: false, tags: ['비자위험', 'D-day경보'],
    memo: '비자 리드타임 역산 시 즉시 서류 수취 필요. 9/20까지 미수신 시 온라인 발표로 전환 검토.',
  }),
  mk({
    n: 6, nameEn: 'Prof. Johan Brandt', title: 'Chair of Mobility Economics',
    affiliation: 'Rheinland School of Economics', country: '독일', city: 'Köln', tz: 'Europe/Berlin (UTC+1)',
    tier: 'Panel', stage: '계약완료', pkg: 'PKG-PNL', liaison: 'M05',
    fields: ['Mobility Economics', 'Carbon Pricing'], langs: ['EN', 'DE'],
    sessionIds: ['S07'],
    visa: { required: false, track: '면제(무비자)', stage: '해당없음', ketaRequired: false, ketaStatus: '해당없음', ccviRequired: false, leadTimeDays: 0, guaranteeLetterRequired: false },
    route: R('FRA', 'Frankfurt', 'LH', 'LH712', 'LH711', 1900, 'EUR', 11),
    treatyRate: 0, tags: ['GDPR'], memo: '본인 발권 후 정산(영수증 원본 필요).',
  }),
  mk({
    n: 7, nameEn: 'Dr. Yuki Tanaka', title: 'Principal Researcher',
    affiliation: 'Kanto Urban Data Institute', country: '일본', city: 'Tokyo', tz: 'Asia/Tokyo (UTC+9)',
    tier: 'Invited', stage: '계약완료', pkg: 'PKG-INV', liaison: 'M04',
    fields: ['Open Data', 'Civic Tech'], langs: ['EN', 'JP'],
    sessionIds: ['S09'],
    visa: { required: false, track: '면제(무비자)', stage: '해당없음', ketaRequired: false, ketaStatus: '해당없음', ccviRequired: false, leadTimeDays: 0, guaranteeLetterRequired: false },
    route: R('HND', 'Tokyo', 'OZ', 'OZ1085', 'OZ1074', 95000, 'JPY', 2),
    hotelNights: 2, treatyRate: 0, tags: [], memo: '11/19 오후 입국, 11/20 저녁 출국(단기 체류).',
  }),
  mk({
    n: 8, nameEn: 'Prof. Carlos Ibarra', title: 'Professor of Urban Planning',
    affiliation: 'Anahuac Metropolitan University', country: '멕시코', city: 'Mexico City', tz: 'America/Mexico_City (UTC-6)',
    tier: 'Panel', stage: '공식초청', pkg: 'PKG-PNL', liaison: 'M06',
    fields: ['Informal Settlements', 'Urban Governance'], langs: ['EN', 'ES'],
    visa: { required: false, track: 'K-ETA', stage: '판정대기', ketaRequired: true, ketaStatus: '신청전', ccviRequired: false, leadTimeDays: 3, guaranteeLetterRequired: false, memo: '수락 확정 시 K-ETA 안내 예정.' },
    route: R('MEX', 'Mexico City', 'AM', 'AM90', 'AM91', 4200, 'USD', 16),
    tags: ['응답대기'], memo: '공식 초청장 발송 후 회신 대기(마감 D-135). 1차 리마인드 발송 완료.',
  }),
  mk({
    n: 9, nameEn: 'Dr. Nguyen Thi Mai', title: 'Lead Data Engineer',
    affiliation: 'Red River Urban Tech Center', country: '베트남', city: 'Hanoi', tz: 'Asia/Ho_Chi_Minh (UTC+7)',
    tier: 'Workshop', stage: '수락', pkg: 'PKG-WKS', liaison: 'M06',
    fields: ['Data Pipeline', 'Open Source'], langs: ['EN', 'VI'],
    sessionIds: ['S05', 'S08'],
    visa: {
      required: true, track: 'C-3-4 단기상용', stage: '서류수령', ketaRequired: false, ketaStatus: '해당없음',
      ccviRequired: true, consulate: '주베트남 대한민국 대사관(하노이)', leadTimeDays: 25,
      invitationLetterIssuedAt: addDays(TODAY, -4), guaranteeLetterRequired: true,
      memo: '여권·재직증명 수령 완료. 금주 중 사증발급인정서 신청 예정.',
    },
    route: R('HAN', 'Hanoi', 'VN', 'VN408', 'VN409', 950, 'USD', 5),
    tags: ['비자진행', '워크숍'], memo: '워크숍 사전 실습 환경(노트북 40대) 사전 세팅 필요.',
  }),
  mk({
    n: 10, nameEn: 'Dr. Sarah Whitfield', title: 'Chief Investment Officer',
    affiliation: 'Atlantic Climate Capital', country: '미국', city: 'Boston', tz: 'America/New_York (UTC-5)',
    tier: 'Keynote', stage: '계약완료', pkg: 'PKG-KEY', liaison: 'M05', priority: '상',
    fields: ['Climate Finance', 'Infrastructure'], langs: ['EN'],
    sessionIds: ['S06'], interpretation: true,
    visa: { required: false, track: 'K-ETA', stage: '해당없음', ketaRequired: true, ketaStatus: '승인', ccviRequired: false, leadTimeDays: 3, guaranteeLetterRequired: false },
    route: R('BOS', 'Boston', 'KE', 'KE082', 'KE081', 5200, 'USD', 14),
    accessibility: '휠체어 접근 필요(무대 램프)', treatyRate: 0,
    tags: ['VIP', '기조연설', '접근성'],
    memo: '한-미 조세조약 독립적 인적용역 면제 — 거주자증명서 수령 완료. 무대 램프·전용 대기실 필요.',
  }),
  mk({
    n: 11, nameEn: 'Prof. Olusegun Adeyemi', title: 'Professor of Development Studies',
    affiliation: 'Lagos Institute of Development', country: '나이지리아', city: 'Lagos', tz: 'Africa/Lagos (UTC+1)',
    tier: 'Invited', stage: '수락', pkg: 'PKG-INV', liaison: 'M06', priority: '상',
    fields: ['Global South Governance', 'Digital Inclusion'], langs: ['EN'],
    sessionIds: ['S07'],
    visa: {
      required: true, track: 'C-3-1 단기방문', stage: '인터뷰', ketaRequired: false, ketaStatus: '해당없음',
      ccviRequired: true, ccviNumber: 'CCVI-2026-0455', consulate: '주나이지리아 대한민국 대사관',
      appointmentAt: '2026-09-29T09:00', leadTimeDays: 35, invitationLetterIssuedAt: addDays(START, -80),
      guaranteeLetterRequired: true, rejectionReason: undefined,
      memo: '2024년 타 학회 초청 시 사증 거절 이력 — 초청사유서·신원보증서·재정보증 강화 제출.',
    },
    route: R('LOS', 'Lagos', 'ET', 'ET801', 'ET802', 3100, 'USD', 18),
    tags: ['비자위험', '고위험'], memo: '영사 인터뷰 9/29. 거절 시 온라인 발표 백업 시나리오 준비(사전 녹화).',
  }),
  mk({
    n: 12, nameEn: 'Dr. Anya Sokolova', title: 'Head of Digital Twin Programme',
    affiliation: 'Randstad Digital Twin Center', country: '네덜란드', city: 'Rotterdam', tz: 'Europe/Amsterdam (UTC+1)',
    tier: 'Invited', stage: '계약완료', mode: '온라인', pkg: 'PKG-ONL', liaison: 'M04',
    fields: ['Digital Twin', 'Simulation'], langs: ['EN', 'NL'],
    sessionIds: ['S04'],
    visa: { required: false, track: '면제(무비자)', stage: '해당없음', ketaRequired: false, ketaStatus: '해당없음', ccviRequired: false, leadTimeDays: 0, guaranteeLetterRequired: false, memo: '온라인 발표 — 출입국 해당 없음.' },
    treatyRate: 0, tags: ['온라인', 'GDPR'],
    memo: '현지 14:00(KST 22:00) 발표 — 시차로 인해 사전 녹화 + 실시간 Q&A 방식. 테크 리허설 11/13 예정.',
  }),
  mk({
    n: 13, nameEn: 'Prof. Zhang Wei', title: 'Deputy Director, Smart City Research',
    affiliation: 'Beijing Metropolitan Research Academy', country: '중국', city: 'Beijing', tz: 'Asia/Shanghai (UTC+8)',
    tier: 'Invited', stage: '계약완료', pkg: 'PKG-INV', liaison: 'M06',
    fields: ['Smart City Standards', 'IoT'], langs: ['EN', 'CN'],
    sessionIds: ['S09'], interpretation: true,
    visa: {
      required: true, track: 'C-3-4 단기상용', stage: '발급완료', ketaRequired: false, ketaStatus: '해당없음',
      ccviRequired: false, consulate: '주중국 대한민국 대사관(베이징)', submittedAt: addDays(TODAY, -38),
      issuedAt: addDays(TODAY, -12), visaExpiry: '2027-03-15', leadTimeDays: 15,
      invitationLetterIssuedAt: addDays(TODAY, -50), guaranteeLetterRequired: false,
      memo: '복수사증 발급 완료(유효 3개월, 체류 30일).',
    },
    route: R('PEK', 'Beijing', 'CA', 'CA123', 'CA124', 980, 'USD', 2),
    treatyRate: 15, tags: ['비자완료'], memo: '통역(한↔중) 필요 — 라운드테이블 순차통역 배정.',
  }),
  mk({
    n: 14, nameEn: "Dr. Liam O'Connor", title: 'Program Director',
    affiliation: 'Harbour City Futures Agency', country: '호주', city: 'Sydney', tz: 'Australia/Sydney (UTC+11)',
    tier: 'Moderator', stage: '사전타진', pkg: 'PKG-PNL', liaison: 'M05',
    fields: ['Urban Governance', 'Participatory Design'], langs: ['EN'],
    sessionIds: ['S07'],
    visa: { required: false, track: 'K-ETA', stage: '판정대기', ketaRequired: true, ketaStatus: '신청전', ccviRequired: false, leadTimeDays: 3, guaranteeLetterRequired: false },
    route: R('SYD', 'Sydney', 'KE', 'KE122', 'KE121', 2200, 'USD', 10),
    tags: ['좌장후보'], memo: '패널 좌장 후보. 사전 타진 메일 회신 대기 중(응답 기한 D-135).',
  }),
  mk({
    n: 15, nameEn: 'Prof. Ingrid Haugen', title: 'Professor of Energy Systems',
    affiliation: 'Nordic Energy Research School', country: '노르웨이', city: 'Oslo', tz: 'Europe/Oslo (UTC+1)',
    tier: 'Invited', stage: '내부승인', pkg: 'PKG-INV', liaison: 'M05',
    fields: ['District Energy', 'Decarbonisation'], langs: ['EN', 'NO'],
    visa: { required: false, track: '면제(무비자)', stage: '판정대기', ketaRequired: false, ketaStatus: '해당없음', ccviRequired: false, leadTimeDays: 0, guaranteeLetterRequired: false },
    tags: ['대체후보'], memo: '선정위 승인 완료 — 기후 트랙 결원 발생 시 즉시 초청 발송.',
  }),
  mk({
    n: 16, nameEn: 'Dr. Priya Ramesh', title: 'Senior Policy Advisor',
    affiliation: 'Ontario Urban Policy Council', country: '캐나다', city: 'Toronto', tz: 'America/Toronto (UTC-5)',
    tier: 'Panel', stage: '후보발굴', pkg: 'PKG-PNL', liaison: 'M06',
    fields: ['Housing Policy', 'Equity'], langs: ['EN', 'FR'],
    visa: { required: false, track: 'K-ETA', stage: '판정대기', ketaRequired: true, ketaStatus: '신청전', ccviRequired: false, leadTimeDays: 3, guaranteeLetterRequired: false },
    recommendedBy: '프로그램위원 3인 추천', tags: ['롱리스트'],
    memo: '다양성(지역·성별) 밸런스 보완 후보. 선정위 2차 안건.',
  }),
  mk({
    n: 17, nameEn: 'Prof. Marco Benetti', title: 'Director, Urban Robotics Lab',
    affiliation: 'Lombardy Polytechnic Institute', country: '이탈리아', city: 'Milan', tz: 'Europe/Rome (UTC+1)',
    tier: 'Keynote', stage: '거절', pkg: 'PKG-KEY', liaison: 'M05',
    fields: ['Urban Robotics'], langs: ['EN', 'IT'],
    visa: { required: false, track: '면제(무비자)', stage: '해당없음', ketaRequired: false, ketaStatus: '해당없음', ccviRequired: false, leadTimeDays: 0, guaranteeLetterRequired: false },
    declineReason: '동일 기간 타 국제행사 기조연설 일정 중복',
    tags: ['차기후보'], memo: '차기(2027) 행사 우선 초청 대상으로 후보풀 이관.',
  }),
]

/* ───────────────────── 체크리스트 템플릿(초기 세팅) ───────────────────── */

export const checklistTemplates: ChecklistTemplate[] = [
  {
    id: 'CLT-STD', name: '해외 연사 표준 체크리스트 (전 등급 공통)', appliesTo: 'ALL',
    items: [
      { title: '후보 프로파일·이해충돌 검토', phase: '발굴·선정', offsetDays: -180, ownerRole: '사무국' },
      { title: '선정위원회 승인 및 등급(Tier) 확정', phase: '발굴·선정', offsetDays: -170, ownerRole: '사무국' },
      { title: '사전 타진(Save-the-date) 메일 발송', phase: '초청·계약', offsetDays: -160, ownerRole: '사무국' },
      { title: '공식 초청장(Invitation Letter) 발송', phase: '초청·계약', offsetDays: -140, ownerRole: '사무국' },
      { title: '강연 조건 합의 및 Speaker Agreement 서명', phase: '초청·계약', offsetDays: -110, ownerRole: '사무국' },
      { title: '여권 사본·개인정보 수집(동의 포함)', phase: '출입국·비자', offsetDays: -95, ownerRole: '리에종' },
      { title: '비자 필요 여부 판정 / K-ETA 안내', phase: '출입국·비자', offsetDays: -90, ownerRole: '리에종' },
      { title: '초청사유서·신원보증서 발급', phase: '출입국·비자', offsetDays: -80, ownerRole: '사무국' },
      { title: '사증발급인정서(CCVI) 신청', phase: '출입국·비자', offsetDays: -75, ownerRole: '사무국' },
      { title: '영사관 예약·접수 및 진행 모니터링', phase: '출입국·비자', offsetDays: -55, ownerRole: '리에종' },
      { title: '항공 스케줄 확정 및 발권', phase: '여행·의전', offsetDays: -60, ownerRole: '여행사' },
      { title: '숙박 예약 확정(정산 방식 지정)', phase: '여행·의전', offsetDays: -55, ownerRole: '여행사' },
      { title: '여행자보험 가입 및 증서 발송', phase: '여행·의전', offsetDays: -30, ownerRole: '여행사' },
      { title: '약력·사진·초록 수령 및 프로그램북 반영', phase: '콘텐츠·발표', offsetDays: -60, ownerRole: 'PCO' },
      { title: '녹화·중계 및 개인정보 동의서 수령', phase: '콘텐츠·발표', offsetDays: -60, ownerRole: 'PCO' },
      { title: '발표자료 수령 및 기술 검수(폰트·영상·해상도)', phase: '콘텐츠·발표', offsetDays: -14, ownerRole: 'PCO' },
      { title: '공항 픽업·샌딩 배차 확정', phase: '여행·의전', offsetDays: -10, ownerRole: 'PCO' },
      { title: '개인 일정표(Itinerary) 및 현장 안내 발송', phase: '여행·의전', offsetDays: -7, ownerRole: '리에종' },
      { title: '테크 리허설 진행(온라인 연사 시차 확인)', phase: '현장운영', offsetDays: -1, ownerRole: 'PCO' },
      { title: '현장 체크인·배지·기념품 전달', phase: '현장운영', offsetDays: 0, ownerRole: 'PCO' },
      { title: '강연료 지급 및 원천징수 신고', phase: '정산·사후', offsetDays: 14, ownerRole: '재무' },
      { title: '실비 정산·증빙 마감', phase: '정산·사후', offsetDays: 21, ownerRole: '재무' },
      { title: '감사 서한·만족도 설문 발송 및 후보풀 업데이트', phase: '정산·사후', offsetDays: 7, ownerRole: '사무국' },
    ],
  },
  {
    id: 'CLT-VISA', name: '비자 필요 국가 추가 체크리스트', appliesTo: 'ALL',
    items: [
      { title: '국적별 사증 종류 판정(C-3-1 / C-3-4 / C-4)', phase: '출입국·비자', offsetDays: -100, ownerRole: '리에종' },
      { title: '재정보증·재직증명·행사 프로그램 영문본 준비', phase: '출입국·비자', offsetDays: -85, ownerRole: '사무국' },
      { title: '사증 발급 지연 대비 온라인 발표 백업 확정', phase: '출입국·비자', offsetDays: -30, ownerRole: 'PCO' },
    ],
  },
]

/* ───────────────────────────── 업무(Task) ───────────────────────────── */

const ROLE_OWNER: Record<string, ID> = { '사무국': 'M02', 'PCO': 'M04', '리에종': 'M05', '여행사': 'M07', '재무': 'M08', '연사': 'M01' }

function makeTasks(): Task[] {
  const out: Task[] = []
  const tpl = checklistTemplates[0]
  speakers.forEach(sp => {
    const rank = STAGE_RANK[sp.stage] ?? 0
    if (rank < 0) return
    tpl.items.forEach((item, i) => {
      const due = addDays(START, item.offsetDays)
      const h = hash(sp.code + item.title)
      // 단계(rank)에 따라 진척도를 다르게 부여 — 데모 현실감
      const reachable = rank >= 4 ? 1 : rank >= 3 ? 0.35 : rank >= 2 ? 0.2 : 0.1
      const progressed = (h % 100) / 100 < reachable
      let status: Task['status'] = '대기'
      let completedAt: string | undefined
      if (due < TODAY) {
        if (progressed && h % 100 < 78) { status = '완료'; completedAt = addDays(due, -(h % 6)) }
        else if (progressed) status = '지연'
        else status = h % 3 === 0 ? '지연' : '대기'
      } else if (due <= addDays(TODAY, 21)) {
        status = progressed && h % 2 === 0 ? '진행중' : '대기'
      }
      if (sp.attendanceMode === '온라인' && /항공|숙박|픽업|보험|배차|여권/.test(item.title)) return
      if (!sp.visa.required && /사증발급인정서|영사관|신원보증/.test(item.title)) return
      out.push({
        id: `${sp.code}-T${String(i + 1).padStart(2, '0')}`,
        conferenceId: CONF_MAIN, speakerId: sp.id, phase: item.phase,
        title: item.title, ownerMemberId: ROLE_OWNER[item.ownerRole] ?? 'M02',
        dueDate: due, status,
        priority: sp.tier === 'Keynote' ? '상' : item.phase === '출입국·비자' ? '상' : '중',
        fromTemplate: tpl.id, completedAt,
      })
    })
  })
  // 행사 단위 공통 업무
  const common: [string, Task['phase'], number, ID, Task['status']][] = [
    ['연사 초청 예산 계획 수립 및 집행 승인', '기획·세팅', -200, 'M01', '완료'],
    ['등급별 지원 패키지(Support Package) 확정', '기획·세팅', -190, 'M01', '완료'],
    ['초청 대상 롱리스트 100인 작성(지역·성별 밸런스)', '발굴·선정', -185, 'M02', '완료'],
    ['프로그램북 연사 페이지 조판 및 교정', '콘텐츠·발표', -25, 'M03', '대기'],
    ['동시통역사(EN↔KO, CN↔KO) 배정 및 자료 사전 전달', '콘텐츠·발표', -20, 'M04', '진행중'],
    ['스피커 레디룸·VIP 라운지 운영 계획 수립', '현장운영', -15, 'M03', '대기'],
    ['갈라디너 좌석 배치(의전 서열) 확정', '현장운영', -10, 'M01', '대기'],
    ['비상 대응 시나리오(비자 거절·항공 결항) 점검', '현장운영', -12, 'M03', '진행중'],
    ['원천징수 이행상황 신고 및 지급명세서 제출', '정산·사후', 30, 'M08', '대기'],
    ['초청 성과 리포트 작성 및 차기 후보풀 이관', '정산·사후', 35, 'M02', '대기'],
  ]
  common.forEach(([title, phase, off, owner, status], i) => {
    out.push({
      id: `CONF-T${String(i + 1).padStart(2, '0')}`, conferenceId: CONF_MAIN, phase,
      title, ownerMemberId: owner, dueDate: addDays(START, off), status, priority: '중',
    })
  })
  return out
}

export const tasks: Task[] = makeTasks()

/* ───────────────────────── 메일 템플릿 ───────────────────────── */

export const mailTemplates: MailTemplate[] = [
  {
    id: 'MT-01', name: '사전 타진 (Save the Date)', phase: '초청·계약', language: 'EN',
    subject: '[{{conference_en}}] Invitation to speak — {{session_title}}',
    body: `Dear {{speaker_name}},\n\nOn behalf of the Organizing Committee of the {{conference_en}} ({{start_date}}–{{end_date}}, {{venue}}, Seoul, Korea), we would be honoured to invite you as a {{tier}} speaker.\n\nWe would like to confirm your availability before issuing the formal invitation. Kindly reply by {{reply_due}}.\n\nSupport provided: {{support_summary}}\n\nSincerely,\n{{sender_name}} / Secretariat`,
    variables: ['speaker_name', 'conference_en', 'start_date', 'end_date', 'venue', 'tier', 'session_title', 'reply_due', 'support_summary', 'sender_name'],
    trigger: '파이프라인 "사전타진" 진입 시 수동 발송',
  },
  {
    id: 'MT-02', name: '공식 초청장 (Invitation Letter)', phase: '초청·계약', language: 'EN',
    subject: '[Official] Invitation Letter — {{conference_en}}',
    body: `Dear {{speaker_name}},\n\nPlease find attached the official Invitation Letter for {{conference_en}}.\n\nHonorarium: {{honorarium}} (subject to Korean withholding tax {{withholding_rate}}%)\nAir travel: {{air_cabin}}, {{ticketed_by}}\nAccommodation: {{hotel_nights}} nights, {{hotel_grade}}\n\nPlease confirm acceptance by {{reply_due}}.`,
    variables: ['speaker_name', 'conference_en', 'honorarium', 'withholding_rate', 'air_cabin', 'ticketed_by', 'hotel_nights', 'hotel_grade', 'reply_due'],
    trigger: '내부 승인 완료 + 세션 배정 완료 시',
  },
  {
    id: 'MT-03', name: '비자 서류 요청 (Visa Document Request)', phase: '출입국·비자', language: 'EN',
    subject: '[Action required] Visa documents for entry to Korea — {{conference_en}}',
    body: `Dear {{speaker_name}},\n\nYour nationality ({{nationality}}) requires a {{visa_track}} visa for entry to Korea.\nPlease send the following by {{due_date}}:\n1. Passport bio page (valid 6+ months beyond {{end_date}})\n2. Employment certificate\n3. Photo (3.5×4.5cm, white background)\n\nWe will issue the Certificate of Confirmation of Visa Issuance (CCVI) and the letter of guarantee on your behalf. Estimated processing: {{lead_time}} days.`,
    variables: ['speaker_name', 'nationality', 'visa_track', 'due_date', 'end_date', 'lead_time', 'conference_en'],
    trigger: '비자 판정 결과 "필요" 확정 시 자동 발송 · 미회신 시 7일 주기 리마인드',
  },
  {
    id: 'MT-04', name: '항공 선호 정보 요청', phase: '여행·의전', language: 'EN',
    subject: '[Travel] Flight preferences — {{conference_en}}',
    body: `Dear {{speaker_name}},\n\nTo issue your ticket ({{air_cabin}}, departing {{origin_city}}), please confirm:\n- Preferred carrier / frequent flyer number\n- Preferred departure window\n- Seat preference, baggage and meal requirements\n\nTicketing deadline: {{ticketing_deadline}}.`,
    variables: ['speaker_name', 'air_cabin', 'origin_city', 'ticketing_deadline', 'conference_en'],
    trigger: '수락 확정 D-70',
  },
  {
    id: 'MT-05', name: '발표자료 제출 요청 및 리마인드', phase: '콘텐츠·발표', language: 'EN',
    subject: '[Reminder] Presentation file due {{due_date}} — {{conference_en}}',
    body: `Dear {{speaker_name}},\n\nPlease upload your presentation (16:9, PPTX or PDF, embedded fonts and media) by {{due_date}}.\nSession: {{session_title}} — {{session_date}} {{session_time}}, {{room}}.\nRecording/broadcast consent: {{consent_status}}.`,
    variables: ['speaker_name', 'due_date', 'session_title', 'session_date', 'session_time', 'room', 'consent_status', 'conference_en'],
    trigger: '제출물 기한 D-7 / D-3 / D-1 자동 리마인드',
  },
  {
    id: 'MT-06', name: '개인 일정표(Itinerary) 발송', phase: '여행·의전', language: 'EN',
    subject: '[Your itinerary] {{conference_en}} — {{speaker_name}}',
    body: `Dear {{speaker_name}},\n\nYour personal itinerary is attached.\nArrival: {{arrival_flight}} at {{arrival_time}} — pickup at {{meeting_point}} by {{liaison_name}} ({{liaison_phone}}).\nHotel: {{hotel}} ({{check_in}}–{{check_out}}), billed to the organizer.\nSession: {{session_title}}, {{session_date}} {{session_time}}, {{room}}. Tech rehearsal: {{rehearsal_time}}.\n\n24h emergency contact: {{emergency_contact}}`,
    variables: ['speaker_name', 'arrival_flight', 'arrival_time', 'meeting_point', 'liaison_name', 'liaison_phone', 'hotel', 'check_in', 'check_out', 'session_title', 'session_date', 'session_time', 'room', 'rehearsal_time', 'emergency_contact', 'conference_en'],
    trigger: '행사 D-7 자동 발송(항공·숙박·배차 확정 건에 한함)',
  },
  {
    id: 'MT-07', name: '강연료 지급 안내 및 세무 서류 요청', phase: '정산·사후', language: 'EN',
    subject: '[Payment] Honorarium and tax documents — {{conference_en}}',
    body: `Dear {{speaker_name}},\n\nHonorarium: {{honorarium}}. Korean withholding tax of {{withholding_rate}}% applies unless a tax treaty relief is claimed.\nTo apply the reduced/exempt rate under the Korea–{{country}} tax treaty, please return:\n1. Certificate of Residence issued by your tax authority\n2. Application for Entitlement to Reduced Tax Rate\n3. Bank details (beneficiary, SWIFT/IBAN)\n\nPayment will be remitted within {{payment_days}} business days after the event.`,
    variables: ['speaker_name', 'honorarium', 'withholding_rate', 'country', 'payment_days', 'conference_en'],
    trigger: '수락 확정 D-45 · 미회신 시 원천세 22% 기본 적용 안내',
  },
  {
    id: 'MT-08', name: '감사 서한 및 만족도 설문', phase: '정산·사후', language: 'EN',
    subject: 'Thank you for speaking at {{conference_en}}',
    body: `Dear {{speaker_name}},\n\nThank you for your contribution to {{conference_en}}. Your session recorded {{attendance}} attendees and an average rating of {{rating}}.\n\nWe would appreciate 3 minutes for our speaker survey: {{survey_link}}\nSession recording and slides will be archived per your consent ({{consent_scope}}).`,
    variables: ['speaker_name', 'conference_en', 'attendance', 'rating', 'survey_link', 'consent_scope'],
    trigger: '행사 종료 D+7',
  },
]

/* ───────────────────────── 커뮤니케이션 로그 ───────────────────────── */

function makeComms(): Communication[] {
  const out: Communication[] = []
  speakers.forEach(sp => {
    const rank = STAGE_RANK[sp.stage] ?? 0
    const push = (tplId: string, subject: string, offset: number, status: Communication['status'], extra?: Partial<Communication>) => {
      out.push({
        id: `${sp.code}-C${out.length + 1}`, conferenceId: CONF_MAIN, speakerId: sp.id,
        channel: '이메일', direction: '발신', templateId: tplId, subject,
        sentAt: `${addDays(START, offset)}T${String(9 + (hash(sp.code + subject) % 8)).padStart(2, '0')}:${String(hash(subject) % 6)}0`,
        byMemberId: sp.liaisonMemberId, status, ...extra,
      })
    }
    if (rank >= 2 || sp.stage === '거절') push('MT-01', `[SSC2026] Invitation to speak — ${sp.tier}`, -160, '회신', { repliedAt: `${addDays(START, -152)}T11:20` })
    if (rank >= 3 || sp.stage === '거절') push('MT-02', '[Official] Invitation Letter — SSC2026', -140, rank >= 4 ? '회신' : '열람', { followUpAt: addDays(START, -135), openedAt: `${addDays(START, -139)}T08:12` })
    if (sp.stage === '공식초청') push('MT-02', '[Reminder] Invitation response requested', -128, '발송완료', { followUpAt: addDays(TODAY, 3) })
    if (rank >= 4 && sp.visa.required) push('MT-03', '[Action required] Visa documents for entry to Korea', -95, sp.visa.stage === '서류요청' ? '열람' : '회신', { followUpAt: addDays(TODAY, 2) })
    if (rank >= 4 && sp.attendanceMode !== '온라인') push('MT-04', '[Travel] Flight preferences — SSC2026', -70, '회신')
    if (rank >= 4) push('MT-07', '[Payment] Honorarium and tax documents', -45, rank === 5 ? '회신' : '발송완료')
    if (rank === 5) push('MT-05', '[Reminder] Presentation file due', -21, '발송완료', { followUpAt: addDays(START, -14) })
  })
  // 수신 메일(연사 측 문의)
  out.push({
    id: 'IN-01', conferenceId: CONF_MAIN, speakerId: 'SPK-2026-005', channel: '이메일', direction: '수신',
    subject: 'Re: Visa documents — passport renewal in progress',
    body: '여권 갱신 중으로 9/22 이후 사본 송부 가능하다는 회신. CCVI 신청 일정 재조정 필요.',
    sentAt: `${addDays(TODAY, -3)}T21:40`, byMemberId: 'M05', status: '회신', followUpAt: addDays(TODAY, 1),
  })
  out.push({
    id: 'IN-02', conferenceId: CONF_MAIN, speakerId: 'SPK-2026-010', channel: '이메일', direction: '수신',
    subject: 'Re: Accessibility requirements for the keynote stage',
    body: '무대 접근 램프 및 전용 대기실 요청. 현장 실측 후 회신 예정.',
    sentAt: `${addDays(TODAY, -6)}T02:15`, byMemberId: 'M05', status: '회신',
  })
  out.push({
    id: 'IN-03', conferenceId: CONF_MAIN, speakerId: 'SPK-2026-011', channel: '화상미팅', direction: '발신',
    subject: '영사 인터뷰 대비 사전 브리핑(30분)',
    body: '인터뷰 예상 질의·초청 목적 설명 자료 공유. 백업 시나리오(사전 녹화) 합의.',
    sentAt: `${addDays(TODAY, -2)}T17:00`, byMemberId: 'M06', status: '발송완료',
  })
  return out
}

export const communications: Communication[] = makeComms()

/* ───────────────────────── 변경 이력 ───────────────────────── */

function makeAudit(): AuditLog[] {
  const logs: AuditLog[] = []
  const add = (l: Omit<AuditLog, 'id'>) => logs.push({ ...l, id: `AL-${String(logs.length + 1).padStart(3, '0')}` })
  add({ at: `${addDays(TODAY, -1)}T16:42`, actor: 'Grace Yoon', action: '수정', entityType: '비자', entityId: 'SPK-2026-005', entityLabel: 'Dr. Fatima Al-Zahra', field: '비자 단계', before: '초청장발급', after: '서류요청', memo: '여권 갱신 지연으로 서류 재요청' })
  add({ at: `${addDays(TODAY, -1)}T11:05`, actor: '최민규', action: '수정', entityType: '여행', entityId: 'SPK-2026-001', entityLabel: 'Prof. Adrian Mercer', field: '입국 항공편', before: 'KE908 11/16', after: 'KE908 11/17', memo: '언론 인터뷰 일정 반영' })
  add({ at: `${addDays(TODAY, -2)}T09:30`, actor: '왕첸', action: '단계변경', entityType: '연사', entityId: 'SPK-2026-009', entityLabel: 'Dr. Nguyen Thi Mai', field: '비자 단계', before: '서류요청', after: '서류수령' })
  add({ at: `${addDays(TODAY, -2)}T14:20`, actor: '한지우', action: '수정', entityType: '정산', entityId: 'SPK-2026-003', entityLabel: 'Prof. Mei-Ling Chao', field: '원천징수율', before: '22%', after: '15%', memo: '한-싱 조세조약 제한세율 적용(거주자증명서 확인)' })
  add({ at: `${addDays(TODAY, -3)}T18:55`, actor: '정하늘', action: '발송', entityType: '커뮤니케이션', entityId: 'SPK-2026-008', entityLabel: 'Prof. Carlos Ibarra', field: '초청 리마인드', after: '2차 발송', memo: '회신 기한 경과' })
  add({ at: `${addDays(TODAY, -4)}T10:12`, actor: 'Grace Yoon', action: '수정', entityType: '연사', entityId: 'SPK-2026-010', entityLabel: 'Dr. Sarah Whitfield', field: '접근성 요구', before: '-', after: '휠체어 접근 필요(무대 램프)' })
  add({ at: `${addDays(TODAY, -5)}T13:48`, actor: '김서연', action: '승인', entityType: '연사', entityId: 'SPK-2026-015', entityLabel: 'Prof. Ingrid Haugen', field: '선정위 승인', after: '승인(대체후보)' })
  add({ at: `${addDays(TODAY, -6)}T15:30`, actor: '왕첸', action: '수정', entityType: '비자', entityId: 'SPK-2026-013', entityLabel: 'Prof. Zhang Wei', field: '비자 단계', before: '영사관접수', after: '발급완료', memo: '복수사증 발급' })
  add({ at: `${addDays(TODAY, -7)}T09:02`, actor: '이도현', action: '수정', entityType: '세션', entityId: 'S04', entityLabel: 'Track A — Digital Twin', field: '진행 방식', before: '현장', after: '하이브리드', memo: '온라인 연사 배정' })
  add({ at: `${addDays(TODAY, -8)}T17:22`, actor: '박치홍', action: '단계변경', entityType: '연사', entityId: 'SPK-2026-017', entityLabel: 'Prof. Marco Benetti', field: '파이프라인', before: '공식초청', after: '거절', memo: '일정 중복 — 차기 후보풀 이관' })
  speakers.slice(0, 10).forEach((sp, i) => {
    add({
      at: `${addDays(TODAY, -(9 + i))}T${String(9 + (i % 8)).padStart(2, '0')}:${String((i * 7) % 6)}5`,
      actor: members.find(m => m.id === sp.liaisonMemberId)?.name ?? '시스템',
      action: '수정', entityType: '제출물', entityId: sp.id, entityLabel: sp.nameEn,
      field: pick(sp.code + 'aud', ['약력(Bio)', '증명사진', '발표초록(Abstract)', '강연동의서']),
      before: '요청함', after: '검수완료',
    })
  })
  return logs.sort((a, b) => (a.at < b.at ? 1 : -1))
}

export const auditLogs: AuditLog[] = makeAudit()

/* ───────────────────────── 초기 상태 ───────────────────────── */

export const initialState: AppState = {
  version: 1,
  currentUserId: 'M01',
  activeConferenceId: CONF_MAIN,
  members,
  conferences,
  sessions,
  speakers,
  supportPackages,
  tasks,
  communications,
  mailTemplates,
  checklistTemplates,
  auditLogs,
}

export const PHASE_LIST = PHASES
