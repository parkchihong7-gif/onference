/**
 * 국내 학회 데모 시드 — 병원(의료) 학회 기준
 * 제38차 한국임상내과연구학회 추계학술대회 (가상 학회·가상 인물·가상 병원)
 *
 * 설계 의도: 국내 행사도 국제 행사와 "같은 모듈"로 돌아간다.
 * 초청→계약→교통·숙박→제출물→현장→정산은 공통이고,
 * 연수평점·초록심사·참가등록·후원/전시가 국내 학회 쪽에 더해지며,
 * 해외 연자 2명에게만 출입국·해외송금이 가지처럼 붙는다.
 */
import type {
  Abstract, Attachment, Comment, Communication, Conference, CreditProgram, Deliverable, DeliverableType,
  Doc, DocTemplate, Flight, ID, Member, ProgramRegistration, Registration, Session, Speaker, Sponsor,
  SupportPackage, Task,
} from '../types'
import { CORE_MODULES, DOMESTIC_MODULES, OVERSEAS_MODULES } from '../types'
import { D_START as S, TODAY, addDays, hash, pick } from './base'

export const DCONF = 'CONF-KCIM-38'
const HOTEL_D = '그랜드 워커힐 서울'

/* ───────────────────────────── 구성원(학회 사무국) ───────────────────────────── */

export const domesticMembers: Member[] = [
  { id: 'M11', name: '조현수', role: '사무국', org: '한국임상내과연구학회 사무국', email: 'hs.cho@kcim.example.org', phone: '02-3456-1101', languages: ['KO'] },
  { id: 'M12', name: '문지현', role: '사무국', org: '학술부 간사', email: 'jh.moon@kcim.example.org', phone: '02-3456-1102', languages: ['KO', 'EN'] },
  { id: 'M13', name: '유상혁', role: '재무', org: '등록·재무팀', email: 'sh.yoo@kcim.example.org', phone: '02-3456-1103', languages: ['KO'] },
  { id: 'M14', name: '서가은', role: '리에종', org: '학술부 (연자 담당)', email: 'ge.seo@kcim.example.org', phone: '010-4455-7788', languages: ['KO', 'EN', 'JP'] },
]

/* ───────────────────────────── 행사 ───────────────────────────── */

export const domesticConference: Conference = {
  id: DCONF,
  code: 'KCIM38',
  scope: '국내',
  industry: '의료·학회',
  modules: [...CORE_MODULES, ...DOMESTIC_MODULES, ...OVERSEAS_MODULES],
  creditAuthority: '대한의사협회 연수교육',
  nameKo: '제38차 한국임상내과연구학회 추계학술대회',
  nameEn: '38th Autumn Congress of the Korean Society of Clinical Internal Medicine Research',
  edition: '38th',
  startDate: S,
  endDate: addDays(S, 1),
  venue: `${HOTEL_D} 비스타홀 · 아카디아`,
  city: '서울',
  country: '대한민국',
  timezone: 'Asia/Seoul (UTC+9)',
  host: '한국임상내과연구학회',
  organizer: '한국임상내과연구학회 학술위원회',
  pco: '(주)글로벌컨벤션파트너스',
  sponsors: ['한빛파마', '대성제약', '메디텍코리아', '그린헬스케어'],
  website: 'https://kcim38.example.org',
  status: '준비',
  expectedAttendees: 1200,
  budgetTotalKRW: 320_000_000,
  invitationBudgetKRW: 68_000_000,
  baseCurrency: 'KRW',
  tracks: ['순환기', '소화기', '내분비', '감염', '의료정책'],
  milestones: [
    { id: 'DM1', label: '초록 투고 마감', date: addDays(S, -45), phase: '콘텐츠·발표', owner: 'M12' },
    { id: 'DM2', label: '초록 심사 완료 및 채택 통보', date: addDays(S, -32), phase: '콘텐츠·발표', owner: 'M12' },
    { id: 'DM3', label: '연수평점 신청 마감(대한의사협회)', date: addDays(S, -30), phase: '기획·세팅', owner: 'M11' },
    { id: 'DM4', label: '후원·부스 계약 마감', date: addDays(S, -28), phase: '기획·세팅', owner: 'M13' },
    { id: 'DM5', label: '사전등록 마감(할인 종료)', date: addDays(S, -10), phase: '현장운영', owner: 'M13' },
    { id: 'DM6', label: '연자 강의계획서·COI 수취 마감', date: addDays(S, -14), phase: '콘텐츠·발표', owner: 'M14' },
    { id: 'DM7', label: '발표자료 최종 수취', date: addDays(S, -5), phase: '콘텐츠·발표', owner: 'M12' },
    { id: 'DM8', label: '프로그램북 인쇄 입고', date: addDays(S, -7), phase: '콘텐츠·발표', owner: 'M11' },
    { id: 'DM9', label: '현장 등록데스크 세팅·리허설', date: addDays(S, -1), phase: '현장운영', owner: 'M03' },
    { id: 'DM10', label: '사례비 지급 및 원천징수 신고', date: addDays(S, 12), phase: '정산·사후', owner: 'M13' },
    { id: 'DM11', label: '연수평점 이수자 명단 제출', date: addDays(S, 7), phase: '정산·사후', owner: 'M11' },
  ],
  notes: '국내 연자 12명 · 해외 연자 2명. 연수평점 6평점 승인. 사전등록 목표 900명.',
}

/* ───────────────────────────── 지원 패키지(국내) ───────────────────────────── */

export const domesticPackages: SupportPackage[] = [
  {
    id: 'PKG-D-KEY', name: '국내 기조강연 패키지', tier: 'Keynote',
    airCabin: 'KTX 특실 / 국내선 이코노미', airTicketedBy: '주최발권', hotelNights: 1, hotelGrade: '디럭스(주최 지정)',
    hotelBilling: '주최일괄(Master Bill)', perDiemKRW: 0, honorariumKRW: 1_000_000,
    groundTransfer: true, companionSupported: false, insurance: false,
    notes: '수도권 거주 시 숙박 미제공(당일 참석) · 의전 차량 지원',
  },
  {
    id: 'PKG-D-INV', name: '국내 초청강연 패키지', tier: 'Invited',
    airCabin: 'KTX 일반실 / 국내선 이코노미', airTicketedBy: '본인구매후정산', hotelNights: 1, hotelGrade: '스탠다드',
    hotelBilling: '주최일괄(Master Bill)', perDiemKRW: 0, honorariumKRW: 500_000,
    groundTransfer: false, companionSupported: false, insurance: false,
    notes: '지방 연자만 숙박 제공 · 교통은 실비 정산(영수증 필수)',
  },
  {
    id: 'PKG-D-CHR', name: '좌장·패널 패키지', tier: 'Moderator',
    airCabin: 'KTX 일반실', airTicketedBy: '본인구매후정산', hotelNights: 1, hotelGrade: '스탠다드',
    hotelBilling: '주최일괄(Master Bill)', perDiemKRW: 0, honorariumKRW: 300_000,
    groundTransfer: false, companionSupported: false, insurance: false,
  },
  {
    id: 'PKG-D-WKS', name: '실습(핸즈온) 강사 패키지', tier: 'Workshop',
    airCabin: 'KTX 일반실', airTicketedBy: '본인구매후정산', hotelNights: 0, hotelGrade: '-',
    hotelBilling: '본인결제후정산', perDiemKRW: 0, honorariumKRW: 400_000,
    groundTransfer: false, companionSupported: false, insurance: false,
    notes: '실습 장비 세팅 위해 1시간 조기 입장',
  },
]

/* ───────────────────────────── 세션 ───────────────────────────── */

export const domesticSessions: Session[] = [
  { id: 'DS01', conferenceId: DCONF, title: '개회식 및 회장 인사', type: '개회식', track: '의료정책', date: S, startTime: '09:00', endTime: '09:20', room: '비스타홀', mode: '현장', language: 'KO', interpretation: false, chairMemberId: 'M11', speakerIds: [], recorded: true },
  { id: 'DS02', conferenceId: DCONF, title: '기조강연 — 만성질환 관리의 패러다임 전환', type: '기조연설', track: '의료정책', date: S, startTime: '09:20', endTime: '10:10', room: '비스타홀', mode: '현장', language: 'KO', interpretation: false, chairMemberId: 'M12', speakerIds: ['DSPK-001'], capacity: 700, recorded: true },
  { id: 'DS03', conferenceId: DCONF, title: 'Session I — 심부전 최신 치료 전략', type: '초청강연', track: '순환기', date: S, startTime: '10:30', endTime: '12:00', room: '비스타홀', mode: '현장', language: 'KO', interpretation: false, speakerIds: ['DSPK-005', 'DSPK-002', 'DSPK-011'], capacity: 400, recorded: true },
  { id: 'DS04', conferenceId: DCONF, title: 'Luncheon Symposium (한빛파마 후원)', type: '초청강연', track: '소화기', date: S, startTime: '12:10', endTime: '13:00', room: '아카디아', mode: '현장', language: 'KO', interpretation: false, speakerIds: ['DSPK-003'], capacity: 250, recorded: false },
  { id: 'DS05', conferenceId: DCONF, title: 'Session II — 염증성 장질환 진료 업데이트', type: '초청강연', track: '소화기', date: S, startTime: '13:30', endTime: '15:00', room: '비스타홀', mode: '현장', language: 'KO', interpretation: false, speakerIds: ['DSPK-009', 'DSPK-002'], capacity: 400, recorded: true },
  { id: 'DS06', conferenceId: DCONF, title: 'International Session — Precision Medicine in Internal Medicine', type: '초청강연', track: '내분비', date: S, startTime: '15:20', endTime: '16:40', room: '비스타홀', mode: '하이브리드', language: 'EN', interpretation: true, speakerIds: ['DSPK-013', 'DSPK-014'], capacity: 400, recorded: true },
  { id: 'DS07', conferenceId: DCONF, title: '포스터 발표 및 심사', type: '라운드테이블', track: '순환기', date: S, startTime: '16:40', endTime: '17:40', room: '전시홀', mode: '현장', language: 'KO', interpretation: false, speakerIds: [], recorded: false },
  { id: 'DS08', conferenceId: DCONF, title: '총회 및 학술상 시상 · 만찬', type: '만찬', track: '의료정책', date: S, startTime: '18:00', endTime: '20:00', room: '그랜드볼룸', mode: '현장', language: 'KO', interpretation: false, chairMemberId: 'M11', speakerIds: [], recorded: false },
  { id: 'DS09', conferenceId: DCONF, title: 'Session III — 당뇨병 치료제 선택의 실제', type: '초청강연', track: '내분비', date: addDays(S, 1), startTime: '09:00', endTime: '10:30', room: '비스타홀', mode: '현장', language: 'KO', interpretation: false, speakerIds: ['DSPK-011', 'DSPK-006'], capacity: 400, recorded: true },
  { id: 'DS10', conferenceId: DCONF, title: 'Session IV — 지역사회 감염 관리와 항생제 스튜어드십', type: '초청강연', track: '감염', date: addDays(S, 1), startTime: '10:40', endTime: '12:00', room: '아카디아', mode: '현장', language: 'KO', interpretation: false, speakerIds: ['DSPK-004', 'DSPK-010'], capacity: 250, recorded: true },
  { id: 'DS11', conferenceId: DCONF, title: '핸즈온 워크숍 — 심장·복부 초음파 실습', type: '워크숍', track: '순환기', date: addDays(S, 1), startTime: '13:00', endTime: '15:30', room: '실습실 A/B', mode: '현장', language: 'KO', interpretation: false, speakerIds: ['DSPK-008'], capacity: 40, recorded: false },
  { id: 'DS12', conferenceId: DCONF, title: '패널토의 — 일차의료 강화와 의료전달체계', type: '패널토론', track: '의료정책', date: addDays(S, 1), startTime: '15:40', endTime: '17:00', room: '비스타홀', mode: '현장', language: 'KO', interpretation: false, speakerIds: ['DSPK-012', 'DSPK-007', 'DSPK-010'], capacity: 300, recorded: true },
]

/* ───────────────────────────── 연자 ───────────────────────────── */

const D_DELIVERABLES: { type: DeliverableType; offset: number; overseasOnly?: boolean }[] = [
  { type: '강의계획서', offset: -30 },
  { type: '이해관계 선언(COI)', offset: -21 },
  { type: 'CV', offset: -25 },
  { type: '증명사진', offset: -25 },
  { type: '약력(Bio)', offset: -25 },
  { type: '사례비 지급정보(통장·신분증)', offset: -14 },
  { type: '녹화·중계 동의서', offset: -14 },
  { type: '발표자료(PPT)', offset: -5 },
  { type: '여권사본', offset: -40, overseasOnly: true },
  { type: '해외송금 정보(W-8/은행)', offset: -20, overseasOnly: true },
]

function dDeliverables(code: string, overseas: boolean, contracted: boolean): Deliverable[] {
  return D_DELIVERABLES.filter(p => !p.overseasOnly || overseas).map((p, i) => {
    const dueDate = addDays(S, p.offset)
    const overdue = dueDate < TODAY
    const r = hash(code + p.type) % 100
    let status: Deliverable['status'] = '요청전'
    let submittedAt: string | undefined
    if (overdue) {
      if (r < 70) { status = '검수완료'; submittedAt = addDays(dueDate, -(r % 5)) }
      else if (r < 85) { status = '제출'; submittedAt = addDays(dueDate, -1) }
      else if (r < 93) { status = '요청함' }
      else status = '기한초과'
    } else {
      status = r < 50 ? '요청함' : r < 68 ? '제출' : '요청전'
      if (status === '제출') submittedAt = addDays(TODAY, -(r % 6))
    }
    if (contracted && status === '기한초과' && hash(code) % 2 === 0) { status = '검수완료'; submittedAt = dueDate }
    return {
      id: `${code}-D${String(i + 1).padStart(2, '0')}`,
      type: p.type, dueDate, status, submittedAt,
      fileName: submittedAt ? `${code}_${p.type.replace(/[^가-힣A-Za-z]/g, '')}.pdf` : undefined,
      version: submittedAt ? 1 + (hash(code + p.type) % 2) : undefined,
      reviewer: submittedAt ? pick(code + p.type, ['M12', 'M14']) : undefined,
    }
  })
}

interface DSpec {
  n: number
  nameKo: string
  nameEn: string
  title: string
  affiliation: string
  department: string
  city: string
  region: '수도권' | '지방' | '해외'
  tier: Speaker['tier']
  pkg: string
  sessionIds: string[]
  fields: string[]
  travel: '자가용' | 'KTX' | '국내선' | '국제선' | '도보·대중교통'
  origin?: string
  stage?: Speaker['stage']
  attendance?: Speaker['attendance']
  honorarium?: number
  taxType?: Speaker['settlement']['taxType']
  overseas?: boolean
  country?: string
  needsHotel?: boolean
  dietary?: string
  tags?: string[]
  memo?: string
  liaison?: ID
}

function mkD(sp: DSpec): Speaker {
  const code = `DSPK-${String(sp.n).padStart(3, '0')}`
  const overseas = !!sp.overseas
  const stage = sp.stage ?? '계약완료'
  const contracted = stage === '계약완료'
  const pkg = domesticPackages.find(p => p.id === sp.pkg)!
  const liaison = sp.liaison ?? 'M14'
  const needsHotel = sp.needsHotel ?? (sp.region !== '수도권')
  const honorarium = sp.honorarium ?? pkg.honorariumKRW
  const taxType = sp.taxType ?? (overseas ? '비거주자(22%)' : '기타소득(8.8%)')
  const rate = taxType === '사업소득(3.3%)' ? 3.3 : taxType === '기타소득(8.8%)' ? 8.8 : taxType === '조세조약 제한세율' ? 0 : 22

  const sessions = domesticSessions.filter(x => sp.sessionIds.includes(x.id))
  const dates = sessions.map(x => x.date).sort()
  const firstDay = dates[0] ?? S
  const lastDay = dates[dates.length - 1] ?? S

  /* 교통 — 국내는 KTX·국내선·자가용을 같은 구조로 담는다 */
  const legs: Flight[] = []
  const mkLeg = (dir: '출발' | '귀가' | '입국' | '출국', date: string, depTime: string, arrTime: string): Flight => {
    const inbound = dir === '출발' || dir === '입국'
    const origin = sp.origin ?? sp.city
    const base: Flight = {
      id: `${code}-L${inbound ? 1 : 2}`, direction: dir,
      mode: sp.travel === '도보·대중교통' ? '자가용' : sp.travel === '국제선' ? '국제선' : sp.travel as Flight['mode'],
      carrier: sp.travel === 'KTX' ? 'KORAIL' : sp.travel === '국내선' ? 'KE' : sp.travel === '국제선' ? (sp.country === '일본' ? 'OZ' : 'KE') : '-',
      flightNo: sp.travel === 'KTX' ? `KTX ${100 + (hash(code + dir) % 80)}`
        : sp.travel === '국내선' ? `KE${1200 + (hash(code + dir) % 90)}`
          : sp.travel === '국제선' ? (sp.country === '일본' ? `OZ10${hash(code) % 9}` : `KE0${80 + hash(code) % 9}`) : '자차',
      from: inbound ? origin : '서울',
      fromCity: inbound ? origin : '서울',
      to: inbound ? '서울' : origin,
      toCity: inbound ? '서울' : origin,
      departAt: `${date}T${depTime}`,
      arriveAt: `${date}T${arrTime}`,
      cabin: sp.travel === 'KTX' ? (pkg.id === 'PKG-D-KEY' ? '특실' : '일반실') : sp.travel === '국제선' ? '이코노미' : sp.travel === '국내선' ? '이코노미' : '자가용',
      seat: contracted && sp.travel === 'KTX' ? `${(hash(code + dir) % 8) + 1}호차 ${(hash(code + dir) % 15) + 1}${'ABCD'[hash(code) % 4]}` : undefined,
      ticketedBy: pkg.airTicketedBy,
      eTicketReceived: contracted && sp.travel !== '자가용',
      status: contracted ? '확정' : '요청',
      fare: sp.travel === 'KTX' ? 59_800 : sp.travel === '국내선' ? 98_000 : sp.travel === '국제선' ? (sp.country === '일본' ? 420_000 : 1_850_000) : 45_000,
      currency: 'KRW',
      memo: sp.travel === '자가용' ? '유류비·통행료 실비 정산' : undefined,
    }
    if (overseas) {
      base.passengerName = sp.nameEn.toUpperCase()
      base.passportNumber = `${sp.country === '일본' ? 'JP' : 'US'}${hash(code + 'pp') % 900000 + 100000}`.replace(/(\d{3})(\d+)/, '$1***')
      base.terminal = 'T1'
      base.pnr = contracted ? `${base.carrier}${hash(code + 'pnr') % 900000 + 100000}` : undefined
    }
    return base
  }
  if (sp.travel !== '도보·대중교통') {
    legs.push(mkLeg(overseas ? '입국' : '출발', needsHotel ? addDays(firstDay, -1) : firstDay, overseas ? '09:30' : '06:40', overseas ? '12:40' : '09:10'))
    legs.push(mkLeg(overseas ? '출국' : '귀가', lastDay === firstDay && !needsHotel ? firstDay : addDays(lastDay, overseas ? 1 : 0), '18:30', overseas ? '21:10' : '21:00'))
  }

  const programs: ProgramRegistration[] = sessions.map((x, i) => ({
    id: `${code}-P${i + 1}`, name: x.title,
    type: sp.tier === 'Moderator' ? '좌장' : x.type === '워크숍' ? '워크숍' : '세션발표',
    sessionId: x.id, date: x.date, time: `${x.startTime}–${x.endTime}`, place: x.room,
    status: contracted ? '등록' : '대기',
  }))
  if (['Keynote', 'Invited', 'Moderator'].includes(sp.tier)) {
    programs.push({
      id: `${code}-PD`, name: '총회 및 학술상 시상 · 만찬', type: '만찬',
      date: S, time: '18:00–20:00', place: '그랜드볼룸',
      status: contracted ? '등록' : '대기',
      seat: contracted ? `${(hash(code + 'tbl') % 10) + 1}번 테이블` : undefined,
      note: sp.dietary,
    })
  }

  const expenses: Speaker['settlement']['expenses'] = []
  if (legs.length) {
    expenses.push({
      id: `${code}-E1`, category: '항공',
      description: `${sp.travel} 왕복 (${sp.origin ?? sp.city}–서울)`,
      amount: legs[0].fare * 2, currency: 'KRW', amountKRW: legs[0].fare * 2,
      receipt: contracted, status: contracted ? '청구' : '예정',
    })
  }
  if (needsHotel) {
    expenses.push({
      id: `${code}-E2`, category: '숙박', description: `${HOTEL_D} 1박`,
      amount: 180_000, currency: 'KRW', amountKRW: 180_000, receipt: false, status: '예정',
    })
  }

  return {
    id: code, code, conferenceId: DCONF,
    nameEn: sp.nameEn, nameKo: sp.nameKo, title: sp.title,
    affiliation: sp.affiliation, department: sp.department,
    country: sp.country ?? '대한민국', city: sp.city,
    timezone: overseas ? (sp.country === '일본' ? 'Asia/Tokyo (UTC+9)' : 'America/Los_Angeles (UTC-8)') : 'Asia/Seoul (UTC+9)',
    email: `${sp.nameEn.split(' ').slice(-1)[0].toLowerCase().replace(/[^a-z]/g, '')}@${sp.affiliation.includes('병원') ? 'hosp' : 'inst'}${sp.n}.example.org`,
    phone: overseas ? `+${sp.country === '일본' ? 81 : 1}-${hash(code) % 900 + 100}-${hash(code + 'x') % 9000 + 1000}` : `010-${hash(code) % 9000 + 1000}-${hash(code + 'y') % 9000 + 1000}`,
    researchFields: sp.fields, languages: overseas ? ['EN'] : ['KO'],
    tier: sp.tier, residency: overseas ? '해외' : '국내',
    stage, attendance: sp.attendance ?? (contracted ? '참석확정' : '참석미정'),
    sponsorship: 'Sponsored',
    priority: sp.tier === 'Keynote' ? '상' : '중',
    attendanceMode: '현장',
    supportPackageId: sp.pkg, liaisonMemberId: liaison, principalMemberId: 'M11',
    sessionIds: sp.sessionIds,
    firstContactAt: addDays(S, -70), replyDueAt: addDays(S, -55),
    acceptedAt: addDays(S, -52 + (hash(code) % 10)),
    agreementStatus: contracted ? '서명완료' : '발송',
    agreementSignedAt: contracted ? addDays(S, -40 + (hash(code) % 8)) : undefined,
    dietary: sp.dietary,
    interpretationNeeded: overseas,
    companions: [],
    passport: overseas ? {
      nameEn: sp.nameEn.toUpperCase(),
      numberMasked: `${sp.country === '일본' ? 'JP' : 'US'}${hash(code + 'pp') % 900000 + 100000}`.replace(/(\d{3})(\d+)/, '$1***'),
      nationality: sp.country!, issueDate: addDays(TODAY, -1600), expiryDate: addDays(TODAY, 1400), scanReceived: true,
    } : undefined,
    visa: overseas
      ? {
        required: false, track: sp.country === '일본' ? '면제(무비자)' : 'K-ETA',
        stage: '해당없음', ketaRequired: sp.country !== '일본',
        ketaStatus: sp.country !== '일본' ? '승인' : '해당없음',
        ccviRequired: false, leadTimeDays: 3, guaranteeLetterRequired: false,
        memo: '단기 학술 방문 — 사증 면제 대상(입국 시 체류자격 확인).',
      }
      : {
        required: false, track: '국내(해당없음)', stage: '해당없음',
        ketaRequired: false, ketaStatus: '해당없음', ccviRequired: false,
        leadTimeDays: 0, guaranteeLetterRequired: false,
      },
    flights: legs,
    hotel: needsHotel ? {
      hotel: HOTEL_D, address: '서울 광진구 워커힐로 177',
      checkIn: addDays(firstDay, -1), checkInTime: '15:00',
      checkOut: addDays(lastDay, overseas ? 1 : 0), checkOutTime: '11:00',
      nights: Math.max(1, Math.round((new Date(addDays(lastDay, overseas ? 1 : 0)).getTime() - new Date(addDays(firstDay, -1)).getTime()) / 86_400_000)),
      roomNumber: contracted ? `${(hash(code + 'rm') % 12) + 8}0${(hash(code + 'rn') % 8) + 1}` : undefined,
      roomType: pkg.hotelGrade, bedType: 'Double Bed', guests: 1,
      breakfastIncluded: true, specialMeal: sp.dietary,
      billing: pkg.hotelBilling, confirmationNo: contracted ? `WH${hash(code + 'h') % 900000 + 100000}` : undefined,
      status: contracted ? '확정' : '가예약',
      ratePerNight: 180_000, currency: 'KRW',
    } : undefined,
    transfers: sp.tier === 'Keynote' || overseas ? [{
      id: `${code}-T1`, kind: overseas ? '공항픽업' : '의전차량',
      at: `${needsHotel ? addDays(firstDay, -1) : firstDay}T${overseas ? '13:20' : '08:10'}`,
      fromPlace: overseas ? '인천공항 제1터미널 입국장 F' : '자택',
      toPlace: overseas ? HOTEL_D : `${HOTEL_D} 비스타홀`,
      vehicle: '카니발 9인승', meetingPoint: overseas ? '입국장 F · 학회 피켓' : undefined,
      assignedMemberId: liaison, status: contracted ? '확정' : '요청',
    }] : [],
    protocol: {
      level: sp.tier === 'Keynote' ? 'VIP' : '일반',
      greeterMemberId: sp.tier === 'Keynote' || overseas ? liaison : undefined,
      greetingPoint: overseas ? '인천공항 입국장 F' : sp.tier === 'Keynote' ? '호텔 로비' : undefined,
      loungeAccess: ['Keynote', 'Invited'].includes(sp.tier),
      seatingOrder: sp.tier === 'Keynote' ? 1 : undefined,
      giftPrepared: false, photoSession: sp.tier === 'Keynote',
      status: contracted ? '확정' : '요청',
    },
    programs,
    supportedNights: pkg.hotelNights,
    deliverables: dDeliverables(code, overseas, contracted),
    settlement: {
      honorarium, currency: 'KRW', taxType,
      withholdingRate: rate,
      taxTreatyApplied: taxType === '조세조약 제한세율',
      treatyCountry: taxType === '조세조약 제한세율' ? sp.country : undefined,
      corReceived: taxType === '조세조약 제한세율' ? contracted : false,
      netPayment: Math.round(honorarium * (1 - rate / 100)),
      remittance: overseas ? {
        bankName: sp.country === '일본' ? 'MUFG Bank' : 'Wells Fargo',
        swift: sp.country === '일본' ? 'BOTKJPJT' : 'WFBIUS6S',
        accountMasked: `****${hash(code + 'acc') % 9000 + 1000}`,
        beneficiary: sp.nameEn.toUpperCase(), feeBearer: '주최부담(OUR)',
      } : {
        bankName: pick(code + 'bank', ['국민은행', '신한은행', '하나은행', '우리은행', 'NH농협']),
        accountMasked: `****-**-${hash(code + 'acc') % 9000 + 1000}`,
        beneficiary: sp.nameKo, feeBearer: '주최부담(OUR)',
      },
      expenses,
    },
    onsite: { badgeIssued: false, rehearsalDone: false, giftHandedOver: false },
    tags: sp.tags ?? [],
    memo: sp.memo,
    createdAt: addDays(S, -80), updatedAt: addDays(TODAY, -(hash(code) % 9)),
  }
}

export const domesticSpeakers: Speaker[] = [
  mkD({ n: 1, nameKo: '김영호', nameEn: 'Young-ho Kim', title: '교수 · 학회 부회장', affiliation: '한빛대학교병원', department: '순환기내과', city: '서울', region: '수도권', tier: 'Keynote', pkg: 'PKG-D-KEY', sessionIds: ['DS02'], fields: ['심부전', '만성질환 관리'], travel: '도보·대중교통', honorarium: 1_000_000, tags: ['기조강연', 'VIP'], memo: '개회식 직후 기조강연. 의전 차량 및 대기실 필요.', liaison: 'M14' }),
  mkD({ n: 2, nameKo: '이정민', nameEn: 'Jung-min Lee', title: '교수', affiliation: '남산대학교병원', department: '소화기내과', city: '서울', region: '수도권', tier: 'Invited', pkg: 'PKG-D-INV', sessionIds: ['DS03', 'DS05'], fields: ['염증성 장질환'], travel: '자가용', tags: ['2개 세션'] }),
  mkD({ n: 3, nameKo: '박성우', nameEn: 'Sung-woo Park', title: '과장', affiliation: '부산해원병원', department: '내분비내과', city: '부산', region: '지방', tier: 'Invited', pkg: 'PKG-D-INV', sessionIds: ['DS04'], fields: ['당뇨병'], travel: 'KTX', origin: '부산', taxType: '사업소득(3.3%)', tags: ['런천심포지엄'], memo: '후원사 런천 심포지엄 연자 — COI 선언 필수.' }),
  mkD({ n: 4, nameKo: '최은주', nameEn: 'Eun-ju Choi', title: '교수', affiliation: '대전중앙대학교병원', department: '감염내과', city: '대전', region: '지방', tier: 'Invited', pkg: 'PKG-D-INV', sessionIds: ['DS10'], fields: ['항생제 스튜어드십'], travel: 'KTX', origin: '대전', needsHotel: false, tags: [] }),
  mkD({ n: 5, nameKo: '정민수', nameEn: 'Min-su Jung', title: '교수', affiliation: '광주서온대학교병원', department: '순환기내과', city: '광주', region: '지방', tier: 'Moderator', pkg: 'PKG-D-CHR', sessionIds: ['DS03'], fields: ['부정맥'], travel: 'KTX', origin: '광주', tags: ['좌장'] }),
  mkD({ n: 6, nameKo: '한지영', nameEn: 'Ji-young Han', title: '교수', affiliation: '제주한라병원', department: '내분비내과', city: '제주', region: '지방', tier: 'Invited', pkg: 'PKG-D-INV', sessionIds: ['DS09'], fields: ['갑상선'], travel: '국내선', origin: '제주', dietary: '해산물 알러지', tags: ['국내선'] }),
  mkD({ n: 7, nameKo: '오세훈', nameEn: 'Se-hoon Oh', title: '원장', affiliation: '강남미래내과의원', department: '내과', city: '서울', region: '수도권', tier: 'Panel', pkg: 'PKG-D-CHR', sessionIds: ['DS12'], fields: ['일차의료'], travel: '자가용', taxType: '사업소득(3.3%)', tags: ['개원의'] }),
  mkD({ n: 8, nameKo: '윤서진', nameEn: 'Seo-jin Yoon', title: '교수', affiliation: '인천해솔대학교병원', department: '류마티스내과', city: '인천', region: '수도권', tier: 'Workshop', pkg: 'PKG-D-WKS', sessionIds: ['DS11'], fields: ['근골격 초음파'], travel: '자가용', tags: ['실습'], memo: '초음파 장비 8대 · 실습 보조 2명 필요(사전 세팅 1시간).' }),
  mkD({ n: 9, nameKo: '강태웅', nameEn: 'Tae-woong Kang', title: '교수', affiliation: '대구영남대학교병원', department: '소화기내과', city: '대구', region: '지방', tier: 'Moderator', pkg: 'PKG-D-CHR', sessionIds: ['DS05'], fields: ['내시경'], travel: 'KTX', origin: '대구', tags: ['좌장'] }),
  mkD({ n: 10, nameKo: '신혜원', nameEn: 'Hye-won Shin', title: '교수', affiliation: '한빛대학교병원', department: '감염내과', city: '서울', region: '수도권', tier: 'Panel', pkg: 'PKG-D-CHR', sessionIds: ['DS10', 'DS12'], fields: ['감염관리'], travel: '도보·대중교통', tags: [] }),
  mkD({ n: 11, nameKo: '임동현', nameEn: 'Dong-hyun Lim', title: '교수', affiliation: '수원경기대학교병원', department: '내분비내과', city: '수원', region: '수도권', tier: 'Invited', pkg: 'PKG-D-INV', sessionIds: ['DS03', 'DS09'], fields: ['당뇨병', '비만'], travel: '자가용', stage: '수락', attendance: '참석미정', tags: ['계약대기'], memo: '강의 주제 확정 대기 — 계약서 미서명 상태.' }),
  mkD({ n: 12, nameKo: '배수민', nameEn: 'Su-min Bae', title: '교수 · 정책연구소장', affiliation: '남산대학교병원', department: '의료정책연구소', city: '서울', region: '수도권', tier: 'Moderator', pkg: 'PKG-D-CHR', sessionIds: ['DS12'], fields: ['의료전달체계'], travel: '도보·대중교통', tags: ['좌장'] }),
  mkD({ n: 13, nameKo: '모리타 켄지', nameEn: 'Kenji Morita', title: 'Professor', affiliation: 'Tokyo Metropolitan Medical Center', department: 'Division of Endocrinology', city: 'Tokyo', region: '해외', tier: 'Invited', pkg: 'PKG-D-INV', sessionIds: ['DS06'], fields: ['Precision Medicine'], travel: '국제선', origin: 'HND', overseas: true, country: '일본', honorarium: 800_000, tags: ['해외연자', '통역필요'], memo: '영어 발표 · 동시통역 배정. 사증 면제(일본).' }),
  mkD({ n: 14, nameKo: '에밀리 카터', nameEn: 'Emily Carter', title: 'Director of Clinical Research', affiliation: 'Pacific Clinical Research Institute', department: 'Internal Medicine', city: 'San Francisco', region: '해외', tier: 'Keynote', pkg: 'PKG-D-KEY', sessionIds: ['DS06'], fields: ['Clinical Trials'], travel: '국제선', origin: 'SFO', overseas: true, country: '미국', honorarium: 2_500_000, taxType: '조세조약 제한세율', tags: ['해외연자', 'VIP'], memo: '한-미 조세조약 면제 적용 — 거주자증명서 수령 완료.' }),
]

/* ───────────────────────────── 연수평점 ───────────────────────────── */

export const domesticCredits: CreditProgram[] = [
  {
    id: 'CR-01', conferenceId: DCONF, authority: '대한의사협회 연수교육',
    category: '필수 외 평점(학술대회 참가)', appliedCredits: 6, approvedCredits: 6,
    applicationNo: 'KMA-2026-10482',
    sessionIds: ['DS02', 'DS03', 'DS05', 'DS06', 'DS09', 'DS10', 'DS12'],
    submittedAt: addDays(S, -38), resultAt: addDays(S, -24), status: '승인',
    condition: '세션별 출석 체크(입·퇴장 QR) 50분 = 1평점 · 총 6평점 상한',
    ownerMemberId: 'M11',
    note: '이수자 명단은 행사 종료 후 7일 이내 제출 의무.',
  },
  {
    id: 'CR-02', conferenceId: DCONF, authority: '대한의사협회 연수교육',
    category: '의료윤리 평점', appliedCredits: 1, approvedCredits: 1,
    applicationNo: 'KMA-2026-10483', sessionIds: ['DS12'],
    submittedAt: addDays(S, -38), resultAt: addDays(S, -24), status: '승인',
    condition: '패널토의 전체 참석자에 한함', ownerMemberId: 'M11',
  },
  {
    id: 'CR-03', conferenceId: DCONF, authority: '대한내과계열학회 협의체',
    category: '세부전문의 자격 갱신 평점', appliedCredits: 4, applicationNo: 'KAIM-2026-0771',
    sessionIds: ['DS03', 'DS05', 'DS09', 'DS10'],
    submittedAt: addDays(S, -20), status: '심사중',
    condition: '트랙별 2시간 이상 참석', ownerMemberId: 'M12',
    note: '결과 통보 예정일 D-7 — 프로그램북 인쇄 전 확정 필요.',
  },
]

/* ───────────────────────────── 초록 심사 ───────────────────────────── */

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전']
const GIVEN = ['민준', '서연', '도윤', '하은', '지후', '수아', '준서', '예린', '시우', '지아', '현우', '은우', '다인', '태현', '소율', '승민', '하준', '유진', '건우', '채원']
const HOSPITALS = ['한빛대학교병원', '남산대학교병원', '부산해원병원', '대전중앙대학교병원', '광주서온대학교병원', '대구영남대학교병원', '인천해솔대학교병원', '수원경기대학교병원', '제주한라병원', '강남미래내과의원']
const TRACKS = ['순환기', '소화기', '내분비', '감염', '의료정책']
const TOPICS: Record<string, string[]> = {
  순환기: ['심부전 환자의 SGLT2 억제제 사용 경험', '고혈압 환자의 가정혈압 측정 순응도 분석', '심방세동 환자의 항응고 요법 실태'],
  소화기: ['헬리코박터 제균 요법의 1차 치료 성적', '염증성 장질환 환자의 생물학적 제제 반응률', '대장내시경 수검률 향상을 위한 중재 연구'],
  내분비: ['제2형 당뇨병 환자의 연속혈당측정 활용', '갑상선 결절의 초음파 소견과 세침흡인 결과', '비만 환자에서 GLP-1 치료 효과'],
  감염: ['지역사회 획득 폐렴의 원인균 분포', '항생제 스튜어드십 프로그램 도입 효과', '입원환자 혈류감염 감시 결과'],
  의료정책: ['일차의료 만성질환관리 시범사업 참여 경험', '의료전달체계 개선에 대한 내과 의사 인식도', '비대면 진료 이용 실태 분석'],
}

export const domesticAbstracts: Abstract[] = Array.from({ length: 26 }, (_, i) => {
  const seed = `AB${i}`
  const track = TRACKS[i % TRACKS.length]
  const title = `${pick(seed + 't', TOPICS[track])}: ${['단일기관 후향적 연구', '다기관 코호트 분석', '전향적 관찰 연구', '횡단면 설문 연구'][i % 4]}`
  const presentType: Abstract['presentType'] = i % 5 === 0 ? '구연' : i % 7 === 0 ? '비디오' : '포스터'
  const scores = [6 + (hash(seed + 'a') % 5), 5 + (hash(seed + 'b') % 6), 6 + (hash(seed + 'c') % 5)]
  const avg = scores.reduce((a, b) => a + b, 0) / 3
  const status: Abstract['status'] =
    i % 13 === 0 ? '반려' : i % 11 === 0 ? '수정요청' : i % 17 === 0 ? '심사중' : '채택'
  return {
    id: `ABS-${String(i + 1).padStart(3, '0')}`, conferenceId: DCONF,
    code: `KCIM38-A${String(i + 1).padStart(3, '0')}`,
    title,
    authorName: `${pick(seed + 's', SURNAMES)}${pick(seed + 'g', GIVEN)}`,
    affiliation: pick(seed + 'h', HOSPITALS),
    email: `author${i + 1}@hosp.example.org`,
    track, presentType,
    submittedAt: addDays(S, -52 + (hash(seed) % 8)),
    reviewerIds: ['M12', 'M14'],
    scores: status === '심사중' ? scores.slice(0, 1) : scores,
    status,
    decisionAt: status === '심사중' ? undefined : addDays(S, -32),
    sessionId: status === '채택' ? (presentType === '구연' ? pick(seed + 'ss', ['DS03', 'DS05', 'DS09', 'DS10']) : 'DS07') : undefined,
    awardNominated: status === '채택' && avg >= 8,
    memo: status === '수정요청' ? '통계 방법 보완 및 IRB 승인번호 기재 요청' : undefined,
  }
})

/* ───────────────────────────── 참가 등록 ───────────────────────────── */

const REG_TYPES: { type: Registration['type']; fee: number; weight: number }[] = [
  { type: '정회원', fee: 70_000, weight: 38 },
  { type: '준회원', fee: 50_000, weight: 10 },
  { type: '전공의', fee: 30_000, weight: 22 },
  { type: '학생', fee: 20_000, weight: 6 },
  { type: '비회원', fee: 100_000, weight: 12 },
  { type: '연자', fee: 0, weight: 5 },
  { type: '스태프', fee: 0, weight: 4 },
  { type: '후원사', fee: 0, weight: 3 },
]
const REG_POOL = REG_TYPES.flatMap(t => Array(t.weight).fill(t) as typeof REG_TYPES)

export const domesticRegistrations: Registration[] = Array.from({ length: 148 }, (_, i) => {
  const seed = `RG${i}`
  const t = REG_POOL[hash(seed) % REG_POOL.length]
  const onsite = hash(seed + 'c') % 100 < 12
  const paid = t.fee === 0 ? true : hash(seed + 'p') % 100 < 86
  return {
    id: `REG-${String(i + 1).padStart(3, '0')}`, conferenceId: DCONF,
    name: `${pick(seed + 's', SURNAMES)}${pick(seed + 'g', GIVEN)}`,
    affiliation: pick(seed + 'h', HOSPITALS),
    department: pick(seed + 'd', ['내과', '순환기내과', '소화기내과', '내분비내과', '감염내과', '가정의학과']),
    licenseNo: t.type === '학생' ? undefined : `${10000 + (hash(seed + 'l') % 89999)}`,
    email: `reg${i + 1}@hosp.example.org`,
    phone: `010-${hash(seed + 'm') % 9000 + 1000}-${hash(seed + 'n') % 9000 + 1000}`,
    type: t.type,
    channel: onsite ? '현장등록' : t.fee === 0 ? '초청' : '사전등록',
    fee: onsite ? Math.round(t.fee * 1.3) : t.fee,
    paid,
    payMethod: t.fee === 0 ? '면제' : paid ? pick(seed + 'pm', ['카드', '계좌이체', '법인'] as const) : undefined,
    // 등록일은 오늘 이전만 (사전등록 오픈일 ~ 오늘 사이)
    registeredAt: addDays(TODAY, -(hash(seed + 'r') % 34)),
    attended: false, badgePrinted: false,
    mealTicket: hash(seed + 'mt') % 100 < 72,
  }
})

/* ───────────────────────────── 후원 · 전시 ───────────────────────────── */

export const domesticSponsors: Sponsor[] = [
  { id: 'SP-01', conferenceId: DCONF, company: '한빛파마', tier: 'Diamond', amount: 30_000_000, contactName: '정우성 부장', contactEmail: 'sponsor@hanbit-pharma.example.org', boothNo: 'A-01', boothSize: '6m x 3m', contractStatus: '입금완료', benefits: ['런천 심포지엄 1회', '부스 2부스', '프로그램북 표지 광고', '세션 네이밍'], dueDate: addDays(S, -28), ownerMemberId: 'M13' },
  { id: 'SP-02', conferenceId: DCONF, company: '대성제약', tier: 'Platinum', amount: 20_000_000, contactName: '김나래 차장', contactEmail: 'mkt@daesung-pharm.example.org', boothNo: 'A-02', boothSize: '6m x 3m', contractStatus: '입금완료', benefits: ['부스 2부스', '프로그램북 내지 광고', '새틀라이트 세션'], dueDate: addDays(S, -28), ownerMemberId: 'M13' },
  { id: 'SP-03', conferenceId: DCONF, company: '메디텍코리아', tier: 'Gold', amount: 12_000_000, contactName: '박진우 팀장', contactEmail: 'sales@meditech.example.org', boothNo: 'B-05', boothSize: '3m x 3m', contractStatus: '계약완료', benefits: ['부스 1부스', '초음파 실습 장비 협찬'], dueDate: addDays(S, -14), ownerMemberId: 'M13', memo: '워크숍 장비 8대 대여 — 설치 D-1 오후.' },
  { id: 'SP-04', conferenceId: DCONF, company: '그린헬스케어', tier: 'Gold', amount: 12_000_000, contactName: '이수현 과장', contactEmail: 'green@greenhc.example.org', boothNo: 'B-06', boothSize: '3m x 3m', contractStatus: '계약완료', benefits: ['부스 1부스', '가방 삽지'], dueDate: addDays(S, -14), ownerMemberId: 'M13' },
  { id: 'SP-05', conferenceId: DCONF, company: '뉴젠바이오', tier: 'Silver', amount: 6_000_000, contactName: '최동석 대리', contactEmail: 'info@newgenbio.example.org', boothNo: 'C-11', boothSize: '3m x 2m', contractStatus: '계약완료', benefits: ['부스 1부스'], dueDate: addDays(S, -10), ownerMemberId: 'M13' },
  { id: 'SP-06', conferenceId: DCONF, company: '서울의료기', tier: 'Silver', amount: 6_000_000, contactName: '한상민 과장', contactEmail: 'sales@seoulmed.example.org', boothNo: 'C-12', boothSize: '3m x 2m', contractStatus: '협의', benefits: ['부스 1부스'], dueDate: addDays(S, -10), ownerMemberId: 'M13', memo: '부스 위치 변경 요청(출입구 인접) — 배치도 재검토 필요.' },
  { id: 'SP-07', conferenceId: DCONF, company: '케어라인', tier: '부스only', amount: 3_000_000, contactName: '윤가람 매니저', contactEmail: 'care@careline.example.org', boothNo: 'C-13', boothSize: '2m x 2m', contractStatus: '계약완료', benefits: ['부스 1부스'], dueDate: addDays(S, -10), ownerMemberId: 'M13' },
  { id: 'SP-08', conferenceId: DCONF, company: '한국의학출판', tier: '부스only', amount: 2_000_000, contactName: '노경진 팀장', contactEmail: 'book@kmedpub.example.org', contractStatus: '제안', benefits: ['부스 1부스'], dueDate: addDays(S, -5), ownerMemberId: 'M13', memo: '잔여 부스 1자리 — 미계약 시 안내 데스크로 전환.' },
]

/* ───────────────────────── 문서 · 회의록 (노션형 기능) ───────────────────────── */

export const docTemplates: DocTemplate[] = [
  {
    id: 'DT-01', name: '회의록 표준 양식', type: '회의록',
    body: `## 회의 개요
- 일시:
- 장소:
- 참석:
- 작성:

## 논의 안건
1.

## 결정 사항
- [ ]

## 액션 아이템
| 담당 | 내용 | 기한 |
|---|---|---|
|  |  |  |

## 다음 회의
- 일시/안건:`,
  },
  {
    id: 'DT-02', name: '연자 안내문', type: '공지',
    body: `안녕하십니까, {{학회명}} 사무국입니다.

{{연자명}} 선생님의 강연 관련 안내드립니다.

- 세션: {{세션명}} ({{일자}} {{시간}}, {{장소}})
- 발표 시간: 00분 (질의응답 00분 포함)
- 발표자료 제출 기한: {{기한}} (16:9, PPTX 또는 PDF)
- 제출 서류: 강의계획서 · 이해관계 선언(COI) · 사례비 지급정보

문의: 사무국 {{담당자}} ({{연락처}})`,
  },
  {
    id: 'DT-03', name: '현장 운영 매뉴얼', type: '운영매뉴얼',
    body: `## 1. 운영 개요
## 2. 인력 배치 (등록데스크 / 강의장 / 전시홀)
## 3. 시간대별 운영 계획
## 4. 등록·평점 처리 절차
## 5. 비상 대응 (연자 지연, 장비 장애, 응급환자)
## 6. 연락 체계`,
  },
  {
    id: 'DT-04', name: '주간 진행 보고', type: '보고서',
    body: `## 금주 진행
## 지연·이슈
## 다음 주 계획
## 의사결정 요청 사항`,
  },
]

export const domesticDocs: Doc[] = [
  {
    id: 'DOC-01', conferenceId: DCONF, type: '회의록', title: '제3차 조직위원회 회의록',
    authorMemberId: 'M12', createdAt: addDays(TODAY, -6), updatedAt: addDays(TODAY, -6),
    tags: ['조직위', '의사결정'], pinned: true,
    linked: [{ type: '연자', id: 'DSPK-011', label: '임동현 교수' }, { type: '세션', id: 'DS11', label: '핸즈온 워크숍' }],
    body: `## 회의 개요
- 일시: ${addDays(TODAY, -6)} 18:00~19:30
- 장소: 학회 사무국 회의실 / 온라인 병행
- 참석: 조현수(사무국장), 문지현(학술), 유상혁(재무), 서가은(연자), 이도현(PCO)

## 논의 안건
1. 사전등록 현황 및 목표 달성 전망
2. 연수평점(세부전문의 갱신) 심사 지연 건
3. 핸즈온 워크숍 정원 확대 요청
4. 미계약 후원사(한국의학출판) 처리

## 결정 사항
- 사전등록 할인 마감을 **D-10 그대로 유지**한다(연장하지 않음).
- 세부전문의 갱신 평점(CR-03)은 **D-7까지 결과 미통보 시 프로그램북에 "신청 중"으로 표기**한다.
- 핸즈온 워크숍 정원은 장비 8대 기준 **40명 유지**, 대기자 명단만 운영한다.
- 한국의학출판 미계약 시 해당 부스는 **안내 데스크로 전환**한다.

## 액션 아이템
| 담당 | 내용 | 기한 |
|---|---|---|
| 문지현 | 협의체에 평점 심사 진행 상황 확인 | D-10 |
| 서가은 | 임동현 교수 계약서 회수 | D-14 |
| 유상혁 | 후원사 입금 현황 정리 및 미입금 2건 독려 | D-7 |
| 이도현 | 워크숍 대기자 운영 방식 정리 | D-5 |

## 다음 회의
- ${addDays(TODAY, 1)} 18:00 / 현장 운영 최종 점검`,
  },
  {
    id: 'DOC-02', conferenceId: DCONF, type: '회의록', title: 'PCO 주간 운영회의 (D-24)',
    authorMemberId: 'M03', createdAt: addDays(TODAY, -2), updatedAt: addDays(TODAY, -2),
    tags: ['PCO', '현장'],
    body: `## 회의 개요
- 일시: ${addDays(TODAY, -2)} 10:00~11:00
- 참석: 이도현, 정하늘(PCO) / 조현수, 서가은(사무국)

## 논의 안건
1. 강의장 음향·중계 장비 점검 일정
2. 등록데스크 동선 및 QR 출석 체크 운영
3. 전시 부스 배치도 확정

## 결정 사항
- 중계 장비 리허설은 **D-1 14:00** 비스타홀에서 진행한다.
- 출석 체크는 **세션 입·퇴장 QR 스캔** 방식으로 하고, 평점 산정은 입장+퇴장 모두 기록된 건만 인정한다.
- 전시 부스 배치도는 서울의료기 요청(출입구 인접)을 **반영하지 않고 현행 유지**한다.

## 액션 아이템
| 담당 | 내용 | 기한 |
|---|---|---|
| 정하늘 | QR 스캐너 6대 및 백업 2대 확보 | D-10 |
| 이도현 | 배치도 최종본 후원사 일괄 통보 | D-7 |
| 서가은 | 해외 연자 2인 공항 픽업 차량 확정 | D-7 |`,
  },
  {
    id: 'DOC-03', conferenceId: DCONF, type: '기획안', title: '제38차 추계학술대회 기본 계획(안)',
    authorMemberId: 'M11', createdAt: addDays(S, -90), updatedAt: addDays(TODAY, -12),
    tags: ['기획', '승인완료'],
    body: `## 1. 행사 개요
- 명칭: 제38차 한국임상내과연구학회 추계학술대회
- 일시: ${S} ~ ${addDays(S, 1)} (2일)
- 장소: ${HOTEL_D} 비스타홀·아카디아
- 규모: 1,200명 (사전등록 목표 900명)

## 2. 프로그램 구성
- 기조강연 1 · 초청강연 4개 세션 · 국제세션 1 · 패널토의 1 · 핸즈온 워크숍 1 · 포스터 26편

## 3. 연수평점
- 대한의사협회 연수교육 6평점 + 의료윤리 1평점 (승인 완료)
- 세부전문의 갱신 평점 4평점 (심사 중)

## 4. 예산 개요
- 총예산 3.2억 / 연자 초청 예산 6,800만
- 수입: 등록비, 후원·전시 9,100만

## 5. 연자 구성
- 국내 12인(교수·개원의), 해외 2인(일본·미국)
- 해외 연자는 사증 면제 대상이나 체류자격 및 원천징수 요건 별도 확인`,
  },
  {
    id: 'DOC-04', conferenceId: DCONF, type: '운영매뉴얼', title: '현장 운영 매뉴얼 v0.9 (초안)',
    authorMemberId: 'M03', createdAt: addDays(TODAY, -4), updatedAt: addDays(TODAY, -1),
    tags: ['현장', '초안'],
    body: `## 1. 인력 배치
- 등록데스크 6명(사전 4 / 현장 2), 강의장 4명, 전시홀 2명, 총괄 1명

## 2. 시간대별 운영
- 07:30 등록데스크 오픈 · QR 스캐너 점검
- 08:30 참가자 입장 시작
- 09:00 개회식

## 3. 등록·평점 처리
- 사전등록자: QR 제시 → 명찰 출력 → 자료 가방 배부
- 현장등록자: 카드 결제 → 영수증 → 명찰 출력
- 면허번호 미등록자는 평점 부여 불가 → 등록데스크에서 즉시 확인

## 4. 비상 대응
- 연자 지연: 좌장 재량으로 순서 조정, 사무국 즉시 연락
- 장비 장애: 백업 노트북·백업 자료(USB) 사용
- 응급 상황: 호텔 상황실 및 인근 응급실 연락처 확인`,
  },
  {
    id: 'DOC-05', conferenceId: DCONF, type: '공지', title: '[연자 안내] 발표자료 제출 및 COI 선언 안내',
    authorMemberId: 'M14', createdAt: addDays(TODAY, -9), updatedAt: addDays(TODAY, -9),
    tags: ['연자', '발송완료'],
    body: `안녕하십니까, 한국임상내과연구학회 사무국입니다.

제38차 추계학술대회 연자로 참여해 주셔서 감사합니다. 아래 사항을 안내드립니다.

1. **발표자료**: ${addDays(S, -5)}까지 제출 (16:9, PPTX 또는 PDF, 동영상 별도 첨부)
2. **이해관계 선언(COI)**: 모든 연자 필수. 후원사 관련 연구·자문 내역 포함
3. **강의계획서**: 연수평점 신청 근거로 사용되므로 학습목표 3개 이상 기재
4. **사례비 지급정보**: 통장 사본·신분증 사본 (원천징수 후 행사 종료 12일 이내 지급)

제출: 사무국 이메일 또는 연자 포털
문의: 서가은 (010-4455-7788)`,
  },
  {
    id: 'DOC-06', conferenceId: DCONF, type: '보고서', title: '사전등록 중간 집계 (D-24)',
    authorMemberId: 'M13', createdAt: addDays(TODAY, -1), updatedAt: addDays(TODAY, -1),
    tags: ['등록', '주간보고'],
    body: `## 금주 진행
- 사전등록 누적 148명 (목표 900명 대비 16%)
- 등록비 입금 완료 비율 86%
- 후원·전시 9,100만원 중 입금 5,000만원

## 지연·이슈
- 전공의 단체등록(수련병원 3곳) 명단 미회신 → 담당자 재연락 필요
- 미입금 20건 중 법인 결제 12건은 품의 진행 중으로 확인

## 다음 주 계획
- 2차 안내 메일 발송(D-20), 전공의 단체등록 마감 독려

## 의사결정 요청 사항
- 사전등록 목표 미달 시 **할인 마감 연장 여부** — 조직위 판단 요청`,
  },
]

export const domesticComments: Comment[] = [
  { id: 'CM-01', conferenceId: DCONF, targetType: '연자', targetId: 'DSPK-011', targetLabel: '임동현 교수', authorMemberId: 'M14', body: '계약서 회수 지연 중입니다. 금주 금요일까지 미회신 시 전화 확인하겠습니다. @조현수 참고 부탁드립니다.', mentions: ['M11'], createdAt: `${addDays(TODAY, -3)}T14:20`, resolved: false },
  { id: 'CM-02', conferenceId: DCONF, targetType: '연자', targetId: 'DSPK-003', targetLabel: '박성우 과장', authorMemberId: 'M12', body: '런천 심포지엄 연자라 COI 선언서가 반드시 필요합니다. 후원사 연구비 수령 내역 포함 요청드렸습니다.', mentions: [], createdAt: `${addDays(TODAY, -5)}T09:40`, resolved: true },
  { id: 'CM-03', conferenceId: DCONF, targetType: '연자', targetId: 'DSPK-008', targetLabel: '윤서진 교수', authorMemberId: 'M03', body: '초음파 장비 8대는 메디텍코리아 협찬으로 확정. 실습실 A/B 전원 용량 확인 필요합니다.', mentions: ['M04'], createdAt: `${addDays(TODAY, -2)}T16:05`, resolved: false },
  { id: 'CM-04', conferenceId: DCONF, targetType: '후원', targetId: 'SP-06', targetLabel: '서울의료기', authorMemberId: 'M13', body: '부스 위치 변경 요청은 운영회의에서 현행 유지로 결정되었습니다. 회신 드렸습니다.', mentions: [], createdAt: `${addDays(TODAY, -2)}T11:15`, resolved: true },
  { id: 'CM-05', conferenceId: DCONF, targetType: '초록', targetId: 'ABS-012', targetLabel: 'KCIM38-A012', authorMemberId: 'M12', body: '통계 방법 보완 요청 회신이 왔습니다. 재심사 배정 부탁드립니다. @서가은', mentions: ['M14'], createdAt: `${addDays(TODAY, -1)}T17:30`, resolved: false },
  { id: 'CM-06', conferenceId: DCONF, targetType: '문서', targetId: 'DOC-06', targetLabel: '사전등록 중간 집계', authorMemberId: 'M11', body: '할인 마감 연장은 하지 않는 것으로 조직위 결정했습니다. 보고서에 반영 바랍니다.', mentions: ['M13'], createdAt: `${addDays(TODAY, -1)}T20:10`, resolved: false },
  { id: 'CM-07', conferenceId: DCONF, targetType: '연자', targetId: 'DSPK-014', targetLabel: 'Emily Carter', authorMemberId: 'M14', body: '거주자증명서 수령 완료. 한-미 조세조약 면제 적용 가능합니다. 재무팀 확인 부탁드립니다.', mentions: ['M13'], createdAt: `${addDays(TODAY, -4)}T13:00`, resolved: true },
  { id: 'CM-08', conferenceId: DCONF, targetType: '세션', targetId: 'DS06', targetLabel: 'International Session', authorMemberId: 'M12', body: '동시통역 부스 설치 및 통역사 2인 배정 완료. 발표자료 사전 전달 필요합니다(D-7).', mentions: ['M04'], createdAt: `${addDays(TODAY, -3)}T10:25`, resolved: false },
]

export const domesticAttachments: Attachment[] = [
  { id: 'AT-01', conferenceId: DCONF, targetType: '연자', targetId: 'DSPK-001', name: '김영호_강의계획서.pdf', kind: '문서', location: '학회 드라이브 / 38차 / 연자 / 강의계획서', sizeKB: 420, uploadedBy: 'M14', uploadedAt: addDays(S, -30), confidential: false },
  { id: 'AT-02', conferenceId: DCONF, targetType: '연자', targetId: 'DSPK-003', name: '박성우_COI선언서.pdf', kind: '문서', location: '학회 드라이브 / 38차 / 연자 / COI', sizeKB: 310, uploadedBy: 'M12', uploadedAt: addDays(S, -22), confidential: true },
  { id: 'AT-03', conferenceId: DCONF, targetType: '행사', targetId: DCONF, name: '연수평점_승인통보서_KMA.pdf', kind: '문서', location: '학회 드라이브 / 38차 / 평점', sizeKB: 180, uploadedBy: 'M11', uploadedAt: addDays(S, -24), confidential: false },
  { id: 'AT-04', conferenceId: DCONF, targetType: '후원', targetId: 'SP-01', name: '한빛파마_후원계약서_서명본.pdf', kind: '계약서', location: '학회 드라이브 / 38차 / 후원', sizeKB: 920, uploadedBy: 'M13', uploadedAt: addDays(S, -30), confidential: true },
  { id: 'AT-05', conferenceId: DCONF, targetType: '행사', targetId: DCONF, name: '전시부스_배치도_v3.pdf', kind: '문서', location: '학회 드라이브 / 38차 / 현장', sizeKB: 2400, uploadedBy: 'M03', uploadedAt: addDays(TODAY, -2), confidential: false },
  { id: 'AT-06', conferenceId: DCONF, targetType: '연자', targetId: 'DSPK-014', name: 'Carter_CoR_certificate.pdf', kind: '증빙', location: '학회 드라이브 / 38차 / 정산 / 조세조약', sizeKB: 260, uploadedBy: 'M13', uploadedAt: addDays(TODAY, -4), confidential: true },
  { id: 'AT-07', conferenceId: DCONF, targetType: '행사', targetId: DCONF, name: '프로그램북_초안_v2.pdf', kind: '문서', location: '학회 드라이브 / 38차 / 인쇄', sizeKB: 8800, uploadedBy: 'M12', uploadedAt: addDays(TODAY, -1), confidential: false },
  { id: 'AT-08', conferenceId: DCONF, targetType: '연자', targetId: 'DSPK-008', name: '윤서진_초음파실습_교안.pptx', kind: '발표자료', location: '학회 드라이브 / 38차 / 발표자료', sizeKB: 15200, uploadedBy: 'M14', uploadedAt: addDays(TODAY, -3), confidential: false },
]

/* ───────────────────────── 체크리스트 · 업무 · 커뮤니케이션 ───────────────────────── */

export const domesticChecklist = {
  id: 'CLT-DOM',
  name: '국내 학회 표준 체크리스트 (의료·학술)',
  appliesTo: 'ALL' as const,
  items: [
    { title: '학술대회 기본계획 수립 및 이사회 승인', phase: '기획·세팅' as const, offsetDays: -120, ownerRole: '사무국' as const },
    { title: '연자 후보 선정 및 학술위원회 확정', phase: '발굴·선정' as const, offsetDays: -90, ownerRole: '사무국' as const },
    { title: '초록 공모 공고 및 투고 시스템 오픈', phase: '콘텐츠·발표' as const, offsetDays: -75, ownerRole: '사무국' as const },
    { title: '연자 초청 공문 발송', phase: '초청·계약' as const, offsetDays: -70, ownerRole: '사무국' as const },
    { title: '후원·전시 제안서 발송', phase: '기획·세팅' as const, offsetDays: -60, ownerRole: '재무' as const },
    { title: '강연 승낙 회신 수집 및 사례비 조건 합의', phase: '초청·계약' as const, offsetDays: -55, ownerRole: '리에종' as const },
    { title: '초록 투고 마감 및 접수 확인', phase: '콘텐츠·발표' as const, offsetDays: -45, ownerRole: '사무국' as const },
    { title: '사전등록 오픈(할인 등록)', phase: '현장운영' as const, offsetDays: -40, ownerRole: '재무' as const },
    { title: '연수평점 신청서 제출(인정 기관)', phase: '기획·세팅' as const, offsetDays: -38, ownerRole: '사무국' as const },
    { title: '초록 심사 완료 및 채택 통보', phase: '콘텐츠·발표' as const, offsetDays: -32, ownerRole: '사무국' as const },
    { title: '후원 계약 체결 및 입금 확인', phase: '기획·세팅' as const, offsetDays: -28, ownerRole: '재무' as const },
    { title: '연수평점 승인 확인 및 프로그램 반영', phase: '기획·세팅' as const, offsetDays: -24, ownerRole: '사무국' as const },
    { title: '지방·해외 연자 교통·숙박 예약', phase: '여행·의전' as const, offsetDays: -20, ownerRole: 'PCO' as const },
    { title: '강의계획서·이해관계 선언(COI) 수취', phase: '콘텐츠·발표' as const, offsetDays: -14, ownerRole: '리에종' as const },
    { title: '사전등록 할인 마감 및 명단 확정', phase: '현장운영' as const, offsetDays: -10, ownerRole: '재무' as const },
    { title: '프로그램북 인쇄 입고', phase: '콘텐츠·발표' as const, offsetDays: -7, ownerRole: '사무국' as const },
    { title: '명찰·자료 가방·QR 스캐너 준비', phase: '현장운영' as const, offsetDays: -7, ownerRole: 'PCO' as const },
    { title: '발표자료 수취 및 기술 검수', phase: '콘텐츠·발표' as const, offsetDays: -5, ownerRole: 'PCO' as const },
    { title: '현장 인력 배치 및 장비 리허설', phase: '현장운영' as const, offsetDays: -1, ownerRole: 'PCO' as const },
    { title: '등록데스크 운영 및 출석(QR) 체크', phase: '현장운영' as const, offsetDays: 0, ownerRole: 'PCO' as const },
    { title: '연수평점 이수자 명단 제출', phase: '정산·사후' as const, offsetDays: 7, ownerRole: '사무국' as const },
    { title: '사례비 지급 및 원천징수 신고', phase: '정산·사후' as const, offsetDays: 12, ownerRole: '재무' as const },
    { title: '후원사 결과 보고 및 현장 사진 전달', phase: '정산·사후' as const, offsetDays: 14, ownerRole: '사무국' as const },
  ],
}

const D_ROLE_OWNER: Record<string, ID> = { 사무국: 'M11', PCO: 'M03', 리에종: 'M14', 여행사: 'M07', 재무: 'M13', 연사: 'M11' }

export const domesticTasks: Task[] = [
  // 행사 단위 업무
  ...domesticChecklist.items.map((it, i) => {
    const due = addDays(S, it.offsetDays)
    const h = hash('DT' + it.title)
    const status: Task['status'] = due < TODAY
      ? (h % 100 < 86 ? '완료' : '지연')
      : due <= addDays(TODAY, 14) ? (h % 2 === 0 ? '진행중' : '대기') : '대기'
    return {
      id: `DCONF-T${String(i + 1).padStart(2, '0')}`, conferenceId: DCONF, phase: it.phase,
      title: it.title, ownerMemberId: D_ROLE_OWNER[it.ownerRole] ?? 'M11',
      dueDate: due, status, priority: it.offsetDays >= -14 ? '상' : '중',
      fromTemplate: 'CLT-DOM',
      completedAt: status === '완료' ? addDays(due, -(h % 4)) : undefined,
    } satisfies Task
  }),
  // 연자 단위 업무
  ...domesticSpeakers.flatMap(sp => {
    const items: [string, Task['phase'], number, ID][] = [
      ['강연 승낙 및 계약서 회수', '초청·계약', -55, 'M14'],
      ['강의계획서·COI 수취', '콘텐츠·발표', -14, 'M14'],
      ['교통·숙박 예약 확정', '여행·의전', -20, 'M03'],
      ['발표자료 수취 및 검수', '콘텐츠·발표', -5, 'M12'],
      ['사례비 지급 서류 확인 및 지급', '정산·사후', 12, 'M13'],
    ]
    return items
      .filter(([t]) => !(t.includes('교통') && sp.flights.length === 0))
      .map(([title, phase, off, owner], i) => {
        const due = addDays(S, off)
        const h = hash(sp.id + title)
        const status: Task['status'] = due < TODAY
          ? (sp.stage === '계약완료' && h % 100 < 82 ? '완료' : '지연')
          : due <= addDays(TODAY, 14) ? (h % 3 === 0 ? '진행중' : '대기') : '대기'
        return {
          id: `${sp.id}-T${i + 1}`, conferenceId: DCONF, speakerId: sp.id, phase,
          title: `[${sp.nameKo}] ${title}`, ownerMemberId: owner, dueDate: due, status,
          priority: sp.tier === 'Keynote' ? '상' : '중', fromTemplate: 'CLT-DOM',
          completedAt: status === '완료' ? addDays(due, -(h % 3)) : undefined,
        } satisfies Task
      })
  }),
]

export const domesticComms: Communication[] = domesticSpeakers.flatMap((sp, i) => {
  const base: Communication[] = [
    {
      id: `DC-${i}-1`, conferenceId: DCONF, speakerId: sp.id, channel: '이메일', direction: '발신',
      subject: `[제38차 추계학술대회] 강연 초청의 건 — ${sp.nameKo} ${sp.title.split(' ')[0]}님`,
      sentAt: `${addDays(S, -70)}T10:${String(10 + i).padStart(2, '0')}`,
      byMemberId: 'M14', status: '회신', repliedAt: `${addDays(S, -62)}T09:20`,
    },
    {
      id: `DC-${i}-2`, conferenceId: DCONF, speakerId: sp.id, channel: '이메일', direction: '발신',
      subject: '[안내] 강의계획서·COI 선언서 제출 요청',
      sentAt: `${addDays(S, -24)}T14:${String(10 + i).padStart(2, '0')}`,
      byMemberId: 'M14', status: sp.stage === '계약완료' ? '회신' : '열람',
      followUpAt: sp.stage === '계약완료' ? undefined : addDays(TODAY, 2),
    },
  ]
  if (sp.stage === '계약완료') {
    base.push({
      id: `DC-${i}-3`, conferenceId: DCONF, speakerId: sp.id, channel: '이메일', direction: '발신',
      subject: '[안내] 발표자료 제출 및 현장 안내',
      sentAt: `${addDays(TODAY, -3)}T11:${String(10 + i).padStart(2, '0')}`,
      byMemberId: 'M12', status: '발송완료', followUpAt: addDays(S, -5),
    })
  }
  return base
})
