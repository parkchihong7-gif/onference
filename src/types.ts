/**
 * ONFERENCE 도메인 모델
 * 국제 컨퍼런스 해외 연사(초청자) 초청 업무 전 주기를 표현한다.
 * 단계: 발굴 → 초청 → 계약 → 출입국(비자) → 여행/의전 → 콘텐츠 → 현장 → 정산/사후
 */

export type ID = string
export type ISODate = string      // 2026-04-21
export type ISODateTime = string  // 2026-04-21T09:30

export type Currency = 'KRW' | 'USD' | 'EUR' | 'JPY' | 'GBP' | 'SGD'

/* ───────────────────────── 행사 성격 / 모듈 ─────────────────────────
   설계 축이 둘이다.
   ① 행사 축(scope)  — 국내 학회 / 국제 컨퍼런스. 활성 모듈과 메뉴 구성을 결정한다.
   ② 참가자 축(residency) — 국내 연자 / 해외 연자. 출입국·해외송금·국제선은
      '행사가 국제라서'가 아니라 '그 사람이 해외에서 와서' 붙는다.
   따라서 국내 학회에 해외 연자가 1명 있어도, 국제 컨퍼런스에 국내 좌장이 있어도
   초청→계약→교통→숙박→제출물→현장→정산의 공통 경로는 하나로 돌아간다. */

export type ConferenceScope = '국내' | '국제'
export type Residency = '국내' | '해외'
export type Industry = '의료·학회' | '학술' | '기업' | '공공' | '협회'

export type ModuleKey =
  | '초청·연자'            // 공통 — 항상 활성
  | '세션·프로그램'
  | '제출물·콘텐츠'
  | '교통·숙박'
  | '현장운영'
  | '정산·예산'
  | '문서·회의록'
  | '캘린더'
  | '출입국·사증'          // 해외 연자가 1명이라도 있으면 활성
  | '해외송금·조세조약'
  | '의전'
  | '연수평점'             // 국내 학회(의료·간호 등) 전용
  | '초록심사'
  | '참가등록'
  | '후원·전시'

export const CORE_MODULES: ModuleKey[] = [
  '초청·연자', '세션·프로그램', '제출물·콘텐츠', '교통·숙박', '현장운영', '정산·예산', '문서·회의록', '캘린더',
]
/** 해외 연자가 있을 때만 의미가 있는 모듈 (현재 실행 검증 전 — Hold 표시) */
export const OVERSEAS_MODULES: ModuleKey[] = ['출입국·사증', '해외송금·조세조약', '의전']
/** 국내 학회에서 주로 쓰는 모듈 */
export const DOMESTIC_MODULES: ModuleKey[] = ['연수평점', '초록심사', '참가등록', '후원·전시']

/* ────────────────────────────── 조직 / 권한 ───────────────────────────── */

export type RoleKey =
  | '사무국'      // 주최 사무국 (전체 권한)
  | 'PCO'        // 운영대행사
  | '리에종'      // 연사 전담 담당자
  | '여행사'      // 항공/숙박 담당
  | '재무'        // 정산/세무
  | '연사'        // 연사 본인 포털

export interface Member {
  id: ID
  name: string
  role: RoleKey
  org: string
  email: string
  phone?: string
  languages?: string[]
}

/* ────────────────────────────── 행사 / 세션 ───────────────────────────── */

export type ConferenceStatus = '기획' | '준비' | '진행' | '종료'

export interface Conference {
  id: ID
  code: string
  /** 행사 성격 — 메뉴·용어·기본 모듈을 결정한다 */
  scope: ConferenceScope
  industry: Industry
  /** 활성 모듈 (설정 화면에서 토글) */
  modules: ModuleKey[]
  /** 연수평점 인정 기관 (의료·간호 학회 등) */
  creditAuthority?: string
  nameKo: string
  nameEn: string
  edition: string
  startDate: ISODate
  endDate: ISODate
  venue: string
  city: string
  country: string
  timezone: string
  host: string          // 주최
  organizer: string     // 주관
  pco: string           // 운영대행
  sponsors: string[]
  website: string
  status: ConferenceStatus
  expectedAttendees: number
  budgetTotalKRW: number
  invitationBudgetKRW: number   // 초청 관련 예산
  baseCurrency: Currency
  tracks: string[]
  /** 비자·항공 발권 등 역산 기준일(행사 시작일 D-day) */
  milestones: Milestone[]
  notes?: string
}

export interface Milestone {
  id: ID
  label: string
  date: ISODate
  /** 해당 마일스톤이 커버하는 업무 단계 */
  phase: PhaseKey
  owner?: string
}

export type SessionType = '기조연설' | '초청강연' | '패널토론' | '워크숍' | '라운드테이블' | '튜토리얼' | '개회식' | '만찬'
export type DeliveryMode = '현장' | '온라인' | '하이브리드'

export interface Session {
  id: ID
  conferenceId: ID
  title: string
  type: SessionType
  track: string
  date: ISODate
  startTime: string
  endTime: string
  room: string
  mode: DeliveryMode
  language: string
  interpretation: boolean       // 동시통역 여부
  chairMemberId?: ID
  speakerIds: ID[]
  capacity?: number
  recorded: boolean
}

/* ────────────────────────────── 초청 파이프라인 ───────────────────────── */

export type PipelineStage =
  | '후보발굴'
  | '내부승인'
  | '사전타진'
  | '공식초청'
  | '수락'
  | '계약완료'
  | '거절'
  | '취소'

export const PIPELINE_ORDER: PipelineStage[] = [
  '후보발굴', '내부승인', '사전타진', '공식초청', '수락', '계약완료',
]

export type SpeakerTier = 'Keynote' | 'Invited' | 'Panel' | 'Moderator' | 'Chair' | 'Workshop'

/** 참석 확정 상태 — 초청 수락과 별개로 "실제 참석" 여부를 따로 관리한다 */
export type AttendanceStatus = '참석확정' | '참석미정' | '불참' | '취소'

/** 비용 지원 구분 — 자비 참가(Non-Sponsored) 연사를 구분해 정산 대상에서 제외한다 */
export type Sponsorship = 'Sponsored' | '부분지원' | 'Non-Sponsored'

/** 예약 상태 공통 코드 (항공·숙박·의전·이동·프로그램) */
export type BookingStatus = '미정' | '요청' | '가예약' | '확정' | '변경요청' | '취소'

/** 지원 패키지(초기 세팅 템플릿) — 등급별 지원 범위를 템플릿으로 고정 */
export interface SupportPackage {
  id: ID
  name: string
  tier: SpeakerTier
  /** 국제선 좌석 등급 또는 국내 교통 등급(KTX 특실 등) */
  airCabin: string
  airTicketedBy: '주최발권' | '본인구매후정산'
  hotelNights: number
  hotelGrade: string
  hotelBilling: '주최일괄(Master Bill)' | '본인결제후정산'
  perDiemKRW: number
  honorariumKRW: number
  groundTransfer: boolean
  companionSupported: boolean
  companionScope?: string
  insurance: boolean
  notes?: string
}

/* ────────────────────────────── 출입국 / 비자 ─────────────────────────── */

export type VisaTrack =
  | '국내(해당없음)'
  | '면제(무비자)'
  | 'K-ETA'
  | 'C-3-1 단기방문'
  | 'C-3-4 단기상용'
  | 'C-4 단기취업'
  | '기타'

export type VisaStage =
  | '판정대기'
  | '해당없음'
  | '서류요청'
  | '서류수령'
  | '초청장발급'
  | '사증발급인정서신청'   // CCVI (법무부)
  | '사증발급인정서발급'
  | '영사관접수'
  | '인터뷰'
  | '발급완료'
  | '거절'
  | '재신청'

export interface Passport {
  nameEn: string
  /** 내부용 마스킹 저장 (원본은 문서고에 보관) */
  numberMasked: string
  nationality: string
  issueDate?: ISODate
  expiryDate?: ISODate
  scanReceived: boolean
}

export interface VisaCase {
  required: boolean
  track: VisaTrack
  stage: VisaStage
  ketaRequired: boolean
  ketaStatus?: '해당없음' | '신청전' | '승인' | '반려'
  ccviRequired: boolean          // 사증발급인정서 필요 여부
  ccviNumber?: string
  consulate?: string             // 재외공관
  appointmentAt?: ISODateTime
  submittedAt?: ISODate
  issuedAt?: ISODate
  visaExpiry?: ISODate
  /** 비자 발급 소요 예상일 — D-day 역산 경보에 사용 */
  leadTimeDays: number
  invitationLetterIssuedAt?: ISODate
  guaranteeLetterRequired: boolean  // 신원보증서
  rejectionReason?: string
  memo?: string
}

/* ────────────────────────────── 여행 / 의전 ──────────────────────────── */

/** 이동 수단 — 국제선·국내선·KTX·버스·자가용을 한 구조로 담는다 */
export type TravelMode = '국제선' | '국내선' | 'KTX' | '고속버스' | '자가용' | '셔틀'

export interface Flight {
  id: ID
  /** 국제: 입국/출국 · 국내: 출발/귀가 */
  direction: '입국' | '출국' | '출발' | '귀가'
  mode: TravelMode
  carrier: string
  flightNo: string
  from: string          // IATA
  fromCity: string
  to: string
  toCity: string
  departAt: ISODateTime
  arriveAt: ISODateTime
  boardingTime?: string       // 탑승 시각 (현지)
  cabin: string               // Cabin Class (Business / Economy ...)
  bookingClass?: string       // 예약 등급 코드 (BZ200 등)
  seat?: string
  terminal?: string
  gate?: string
  passengerName?: string      // 탑승자 영문명 — 여권 영문명과 일치해야 함
  passportNumber?: string
  pnr?: string
  ticketedBy: '주최발권' | '본인구매후정산'
  eTicketReceived: boolean
  status: BookingStatus
  fare: number
  currency: Currency
  baggage?: string
  memo?: string
}

export interface HotelBooking {
  hotel: string
  address?: string
  checkIn: ISODate
  checkInTime?: string
  checkOut: ISODate
  checkOutTime?: string
  nights: number
  roomNumber?: string
  roomType: string
  bedType?: string
  guests: number
  breakfastIncluded: boolean
  specialMeal?: string          // 알러지·종교식 등
  billing: '주최일괄(Master Bill)' | '본인결제후정산'
  confirmationNo?: string
  status: BookingStatus
  ratePerNight: number
  currency: Currency
  requests?: string
}

export interface Transfer {
  id: ID
  kind: '공항픽업' | '공항샌딩' | '행사장이동' | '의전차량'
  at: ISODateTime
  fromPlace: string
  toPlace: string
  vehicle?: string
  driver?: string
  driverPhone?: string
  meetingPoint?: string
  assignedMemberId?: ID
  status: BookingStatus | '완료'
  flightNo?: string
  memo?: string
}

/** 의전(Protocol) — 영접·의전 서열·라운지·기념품 */
export interface Protocol {
  level: 'VVIP' | 'VIP' | '일반'
  greeterMemberId?: ID          // 영접 담당
  greetingPoint?: string        // 영접 위치(공항 게이트·호텔 로비)
  loungeAccess: boolean
  seatingOrder?: number         // 갈라디너 의전 서열
  giftPrepared: boolean
  photoSession: boolean
  escortVehicle?: string
  status: BookingStatus
  note?: string
}

/** 프로그램 등록(Program Registration) — 세션·만찬·투어 등 참가 등록 */
export interface ProgramRegistration {
  id: ID
  name: string
  type: '세션발표' | '좌장' | '만찬' | '리셉션' | '투어' | '워크숍' | '기자간담회'
  sessionId?: ID
  date: ISODate
  time?: string
  place?: string
  status: '등록' | '미등록' | '대기' | '불참'
  seat?: string
  note?: string
}

/* ────────────────────────────── 제출물 / 동의 ────────────────────────── */

export type DeliverableType =
  | '여권사본'
  | '항공선호정보'
  | '약력(Bio)'
  | 'CV'
  | '증명사진'
  | '발표초록(Abstract)'
  | '발표자료(PPT)'
  | '강연동의서(Speaker Agreement)'
  | '녹화·중계 동의서'
  | '개인정보 처리 동의(GDPR)'
  | '거주자증명서(CoR)'
  | '해외송금 정보(W-8/은행)'
  | '여행자보험 정보'
  | '강의계획서'                  // 연수평점 신청 근거
  | '이해관계 선언(COI)'          // 의료·제약 관련 학회 필수
  | '사례비 지급정보(통장·신분증)'

export type DeliverableStatus = '요청전' | '요청함' | '제출' | '검수완료' | '반려' | '기한초과'

export interface Deliverable {
  id: ID
  type: DeliverableType
  dueDate: ISODate
  status: DeliverableStatus
  submittedAt?: ISODate
  fileName?: string
  version?: number
  reviewer?: string
  memo?: string
}

/* ────────────────────────────── 정산 / 세무 ──────────────────────────── */

export type ExpenseCategory = '항공' | '숙박' | '지상교통' | '식비' | '강연료' | '비자수수료' | '보험' | '기타'

export interface Expense {
  id: ID
  category: ExpenseCategory
  description: string
  amount: number
  currency: Currency
  amountKRW: number
  receipt: boolean
  status: '예정' | '청구' | '검수' | '지급완료'
  spentAt?: ISODate
}

/** 사례비 소득 구분 — 국내 거주자와 비거주자의 원천징수 체계가 다르다 */
export type TaxType =
  | '사업소득(3.3%)'       // 국내 강연·자문 통상
  | '기타소득(8.8%)'       // 일시적 원고·강연료
  | '비거주자(22%)'        // 국내원천소득 원천징수
  | '조세조약 제한세율'
  | '비과세·면세'

export interface Settlement {
  honorarium: number
  currency: Currency
  taxType: TaxType
  /** 국내 지급 시 외국인 기타소득/사업소득 원천징수율(%) */
  withholdingRate: number
  taxTreatyApplied: boolean
  treatyCountry?: string
  corReceived: boolean          // 거주자증명서 수령
  netPayment?: number
  remittance?: {
    bankName: string
    swift?: string
    iban?: string
    accountMasked: string
    beneficiary: string
    feeBearer: '주최부담(OUR)' | '수취인부담(BEN)' | '분담(SHA)'
  }
  paidAt?: ISODate
  expenses: Expense[]
}

/* ────────────────────────────── 현장 운영 ────────────────────────────── */

export interface OnsiteStatus {
  arrivedAirportAt?: ISODateTime
  hotelCheckedInAt?: ISODateTime
  venueCheckInAt?: ISODateTime
  badgeIssued: boolean
  techRehearsalAt?: ISODateTime
  rehearsalDone: boolean
  presentedAt?: ISODateTime
  giftHandedOver: boolean
  departedAt?: ISODateTime
}

/* ────────────────────────────── 초청자(연사) ─────────────────────────── */

export interface Companion {
  id: ID
  name: string
  relation: string
  nationality?: string
  attendance: AttendanceStatus
  visaRequired: boolean
  visaStage?: VisaStage
  passportReceived: boolean
  supported: boolean            // 주최 비용 지원 여부
  shareRoom: boolean            // 객실 공유
  ownFlight: boolean            // 별도 항공 발권
  programIds?: ID[]             // 동반 참석 프로그램
  memo?: string
}

export interface Speaker {
  id: ID
  code: string                  // SPK-2026-001
  conferenceId: ID
  /* 기본 정보 */
  nameEn: string
  nameKo?: string
  pronouns?: string
  title: string                 // 직위
  affiliation: string
  department?: string
  country: string
  city: string
  timezone: string
  email: string
  phone?: string
  assistantName?: string
  assistantEmail?: string
  photoUrl?: string
  researchFields: string[]
  languages: string[]
  profileUrl?: string

  /* 초청 조건 */
  tier: SpeakerTier
  /** 국내/해외 — 출입국·해외송금·국제선 모듈의 적용 여부를 가른다 */
  residency: Residency
  stage: PipelineStage
  /** 실제 참석 확정 여부 (초청 수락과 별도 관리) */
  attendance: AttendanceStatus
  /** 비용 지원 구분 — Non-Sponsored 는 정산 집계에서 제외 */
  sponsorship: Sponsorship
  priority: '상' | '중' | '하'
  attendanceMode: DeliveryMode
  recommendedBy?: string
  previousParticipation?: string
  supportPackageId: ID
  liaisonMemberId: ID
  /** Principal — 초청 책임자(사무국 측 승인·의사결정권자) */
  principalMemberId: ID
  sessionIds: ID[]

  firstContactAt?: ISODate
  replyDueAt?: ISODate
  acceptedAt?: ISODate
  declinedAt?: ISODate
  declineReason?: string
  agreementStatus: '미발송' | '발송' | '서명완료' | '보류'
  agreementSignedAt?: ISODate

  /* 개인 요구사항 */
  dietary?: string
  accessibility?: string
  interpretationNeeded: boolean
  companions: Companion[]

  /* 업무 데이터 */
  passport?: Passport
  visa: VisaCase
  flights: Flight[]
  hotel?: HotelBooking
  transfers: Transfer[]
  protocol: Protocol
  programs: ProgramRegistration[]
  /** 지원 패키지상 숙박 지원 한도(박) — 실제 예약 박수와 비교해 초과분을 검증한다 */
  supportedNights: number
  deliverables: Deliverable[]
  settlement: Settlement
  onsite: OnsiteStatus

  tags: string[]
  memo?: string
  createdAt: ISODate
  updatedAt: ISODate
}

/* ────────────────────────────── 업무 / 체크리스트 ────────────────────── */

export type PhaseKey =
  | '기획·세팅'
  | '발굴·선정'
  | '초청·계약'
  | '출입국·비자'
  | '여행·의전'
  | '콘텐츠·발표'
  | '현장운영'
  | '정산·사후'

export const PHASES: PhaseKey[] = [
  '기획·세팅', '발굴·선정', '초청·계약', '출입국·비자',
  '여행·의전', '콘텐츠·발표', '현장운영', '정산·사후',
]

export type TaskStatus = '대기' | '진행중' | '완료' | '보류' | '지연'

export interface Task {
  id: ID
  conferenceId: ID
  speakerId?: ID
  phase: PhaseKey
  title: string
  detail?: string
  ownerMemberId: ID
  dueDate: ISODate
  status: TaskStatus
  priority: '상' | '중' | '하'
  /** 체크리스트 템플릿에서 생성된 항목 여부 */
  fromTemplate?: string
  completedAt?: ISODate
}

/** 체크리스트 템플릿 — 신규 연사 등록 시 일괄 생성 */
export interface ChecklistTemplateItem {
  title: string
  phase: PhaseKey
  /** 행사 시작일 기준 D-offset (음수 = 행사 전) */
  offsetDays: number
  ownerRole: RoleKey
}

export interface ChecklistTemplate {
  id: ID
  name: string
  appliesTo: SpeakerTier[] | 'ALL'
  items: ChecklistTemplateItem[]
}

/* ────────────────────────────── 커뮤니케이션 ─────────────────────────── */

export type CommChannel = '이메일' | '전화' | '화상미팅' | '메신저' | '우편(EMS)'
export type CommDirection = '발신' | '수신'

export interface Communication {
  id: ID
  conferenceId: ID
  speakerId: ID
  channel: CommChannel
  direction: CommDirection
  templateId?: ID
  subject: string
  body?: string
  sentAt: ISODateTime
  byMemberId: ID
  status: '발송완료' | '열람' | '회신' | '반송' | '예약'
  openedAt?: ISODateTime
  repliedAt?: ISODateTime
  /** 회신 기한 · 자동 리마인드 */
  followUpAt?: ISODate
}

export interface MailTemplate {
  id: ID
  name: string
  phase: PhaseKey
  language: 'KO' | 'EN' | 'KO/EN'
  subject: string
  body: string
  /** 치환 변수 */
  variables: string[]
  /** 자동 발송 트리거 조건(설명) */
  trigger?: string
}

/* ────────────────────────────── 변경 이력 ────────────────────────────── */

export interface AuditLog {
  id: ID
  at: ISODateTime
  actor: string
  action: '생성' | '수정' | '삭제' | '단계변경' | '발송' | '승인'
  entityType: '연사' | '행사' | '세션' | '업무' | '제출물' | '비자' | '여행' | '정산' | '커뮤니케이션'
  entityId: ID
  entityLabel: string
  field?: string
  before?: string
  after?: string
  memo?: string
}

/* ──────────────────── 국내 학회 전용 모듈 ──────────────────── */

/** 연수평점 — 의료·간호 등 면허 직군 학회의 필수 과업 */
export interface CreditProgram {
  id: ID
  conferenceId: ID
  authority: string            // 인정 기관 (예: 대한의사협회)
  category: string             // 평점 구분 (필수 / 선택 / 윤리 등)
  appliedCredits: number
  approvedCredits?: number
  applicationNo?: string
  sessionIds: ID[]
  submittedAt?: ISODate
  resultAt?: ISODate
  status: '준비' | '신청' | '심사중' | '승인' | '보완요청' | '반려'
  /** 평점 부여 조건 (출석 시간 등) */
  condition?: string
  ownerMemberId: ID
  note?: string
}

/** 초록 투고·심사 */
export interface Abstract {
  id: ID
  conferenceId: ID
  code: string
  title: string
  authorName: string
  affiliation: string
  email: string
  track: string
  presentType: '구연' | '포스터' | '비디오'
  submittedAt: ISODate
  reviewerIds: ID[]
  scores: number[]             // 심사위원 점수 (0~10)
  status: '접수' | '심사중' | '채택' | '수정요청' | '반려' | '철회'
  decisionAt?: ISODate
  sessionId?: ID
  awardNominated?: boolean
  memo?: string
}

/** 참가 등록 (사전·현장) */
export interface Registration {
  id: ID
  conferenceId: ID
  name: string
  affiliation: string
  department?: string
  licenseNo?: string           // 면허·회원 번호 (평점 부여용)
  email: string
  phone?: string
  type: '정회원' | '준회원' | '비회원' | '전공의' | '학생' | '연자' | '스태프' | '후원사'
  channel: '사전등록' | '현장등록' | '초청'
  fee: number
  paid: boolean
  payMethod?: '카드' | '계좌이체' | '법인' | '면제'
  registeredAt: ISODate
  attended: boolean
  badgePrinted: boolean
  creditsEarned?: number
  mealTicket?: boolean
  memo?: string
}

/** 후원·전시 */
export interface Sponsor {
  id: ID
  conferenceId: ID
  company: string
  tier: 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | '부스only'
  amount: number
  contactName: string
  contactEmail: string
  boothNo?: string
  boothSize?: string
  contractStatus: '제안' | '협의' | '계약완료' | '입금완료' | '취소'
  benefits: string[]
  dueDate?: ISODate
  ownerMemberId: ID
  memo?: string
}

/* ──────────────────── 문서·협업 (노션형 기능) ──────────────────── */

export type DocType = '회의록' | '기획안' | '공지' | '운영매뉴얼' | '체크리스트' | '보고서'

export interface Doc {
  id: ID
  conferenceId: ID
  type: DocType
  title: string
  /** 마크다운 본문 */
  body: string
  authorMemberId: ID
  createdAt: ISODate
  updatedAt: ISODate
  tags: string[]
  /** 연결된 엔터티 (연자·세션·업무 등) */
  linked?: { type: string; id: ID; label: string }[]
  pinned?: boolean
}

/** 문서 템플릿 — 회의록·공지 등을 같은 틀로 쌓는다 */
export interface DocTemplate {
  id: ID
  name: string
  type: DocType
  body: string
}

export type CommentTarget = '연자' | '업무' | '문서' | '초록' | '후원' | '세션' | '등록'

export interface Comment {
  id: ID
  conferenceId: ID
  targetType: CommentTarget
  targetId: ID
  targetLabel: string
  authorMemberId: ID
  body: string
  mentions: ID[]
  createdAt: ISODateTime
  resolved: boolean
}

/** 첨부 파일 대장 — 실물은 문서고/드라이브, 여기서는 위치와 권한을 관리 */
export interface Attachment {
  id: ID
  conferenceId: ID
  targetType: string
  targetId: ID
  name: string
  kind: '문서' | '이미지' | '발표자료' | '계약서' | '증빙' | '기타'
  location: string             // 보관 위치(경로·드라이브 링크 등)
  sizeKB?: number
  uploadedBy: ID
  uploadedAt: ISODate
  confidential: boolean
}

/* ────────────────────────────── 전체 상태 ────────────────────────────── */

export interface AppState {
  version: number
  currentUserId: ID
  activeConferenceId: ID
  members: Member[]
  conferences: Conference[]
  sessions: Session[]
  speakers: Speaker[]
  supportPackages: SupportPackage[]
  tasks: Task[]
  communications: Communication[]
  mailTemplates: MailTemplate[]
  checklistTemplates: ChecklistTemplate[]
  auditLogs: AuditLog[]
  /* 국내 학회 모듈 */
  creditPrograms: CreditProgram[]
  abstracts: Abstract[]
  registrations: Registration[]
  sponsors: Sponsor[]
  /* 문서·협업 */
  docs: Doc[]
  docTemplates: DocTemplate[]
  comments: Comment[]
  attachments: Attachment[]
}
