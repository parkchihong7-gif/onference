import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { activeConference, speakersOf } from '../lib/metrics'
import { displayName } from '../lib/scope'
import { Field, Modal } from './ui'
import { today } from '../lib/format'
import { PHASES } from '../types'
import type {
  Deliverable, DeliverableStatus, Expense, ExpenseCategory, Member, Passport, RoleKey, Speaker,
  SupportPackage, Task, TaskStatus, VisaStage, VisaTrack,
} from '../types'

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
const TASK_STATUS: TaskStatus[] = ['대기', '진행중', '완료', '보류', '지연']
const ROLES: RoleKey[] = ['사무국', 'PCO', '리에종', '여행사', '재무', '연사']
const DOC_STATUS: DeliverableStatus[] = ['요청전', '요청함', '제출', '검수완료', '반려', '기한초과']
const VISA_TRACKS: VisaTrack[] = ['국내(해당없음)', '면제(무비자)', 'K-ETA', 'C-3-1 단기방문', 'C-3-4 단기상용', 'C-4 단기취업', '기타']
const VISA_STAGES: VisaStage[] = ['판정대기', '해당없음', '서류요청', '서류수령', '초청장발급', '사증발급인정서신청', '사증발급인정서발급', '영사관접수', '인터뷰', '발급완료', '거절', '재신청']

/* ─────────────────────────────── 업무 ─────────────────────────────── */

/** 업무 추가 / 수정 — 템플릿으로 생성된 업무 외에 직접 만든 일도 관리한다 */
export function TaskDialog(
  { open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Task },
) {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const speakers = speakersOf(state)
  const blank = (): Task => ({
    id: rid('TSK'), conferenceId: conf.id, phase: '기획·세팅', title: '',
    ownerMemberId: state.members.find(m => m.role === '사무국')?.id ?? state.members[0]?.id ?? '',
    dueDate: today(), status: '대기', priority: '중',
  })
  const [f, setF] = useState<Task>(blank())
  const [err, setErr] = useState('')
  const set = <K extends keyof Task>(k: K, v: Task[K]) => setF(x => ({ ...x, [k]: v }))

  useEffect(() => { if (open) { setF(edit ? { ...edit } : blank()); setErr('') } }, [open, edit])

  const save = () => {
    if (!f.title.trim()) { setErr('업무명을 입력하세요.'); return }
    if (edit) dispatch({ type: 'PATCH_TASK', id: edit.id, patch: f })
    else dispatch({ type: 'ADD_TASK', task: f })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide
      title={edit ? '업무 수정' : '업무 추가'} sub={conf.nameKo}
      footer={
        <>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={save}>저장</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="업무명" span>
          <input className="input" value={f.title} onChange={e => set('title', e.target.value)} placeholder="예) 프로그램북 교정 1차" />
        </Field>
        <Field label="단계">
          <select className="select" value={f.phase} onChange={e => set('phase', e.target.value as Task['phase'])}>
            {PHASES.map(p => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="담당">
          <select className="select" value={f.ownerMemberId} onChange={e => set('ownerMemberId', e.target.value)}>
            {state.members.map(m => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
          </select>
        </Field>
        <Field label="기한">
          <input className="input" type="date" value={f.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </Field>
        <Field label="상태">
          <select className="select" value={f.status} onChange={e => set('status', e.target.value as TaskStatus)}>
            {TASK_STATUS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="우선순위">
          <select className="select" value={f.priority} onChange={e => set('priority', e.target.value as Task['priority'])}>
            {(['상', '중', '하'] as const).map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="대상 연자" hint="특정 연자에 붙는 업무면 선택">
          <select className="select" value={f.speakerId ?? ''} onChange={e => set('speakerId', e.target.value || undefined)}>
            <option value="">공통 업무</option>
            {speakers.map(s => <option key={s.id} value={s.id}>{displayName(s)}</option>)}
          </select>
        </Field>
        <Field label="상세" span>
          <input className="input" value={f.detail ?? ''} onChange={e => set('detail', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

/* ───────────────────────── 제출물(연자별 서류) ───────────────────────── */

/** 제출물 기한·상태·검수 메모 수정 */
export function DeliverableDialog(
  { open, onClose, speaker, deliverable }:
  { open: boolean; onClose: () => void; speaker: Speaker; deliverable: Deliverable },
) {
  const { dispatch } = useApp()
  const [d, setD] = useState<Deliverable>(deliverable)
  const set = <K extends keyof Deliverable>(k: K, v: Deliverable[K]) => setD(x => ({ ...x, [k]: v }))
  useEffect(() => { if (open) setD({ ...deliverable }) }, [open, deliverable])

  return (
    <Modal open={open} onClose={onClose}
      title="제출물 수정" sub={`${displayName(speaker)} · ${deliverable.type}`}
      footer={
        <>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => {
            dispatch({ type: 'PATCH_DELIVERABLE', speakerId: speaker.id, deliverableId: d.id, patch: d })
            onClose()
          }}>저장</button>
        </>
      }>
      <div className="form-grid">
        <Field label="상태">
          <select className="select" value={d.status} onChange={e => set('status', e.target.value as DeliverableStatus)}>
            {DOC_STATUS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="제출 기한">
          <input className="input" type="date" value={d.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </Field>
        <Field label="제출일">
          <input className="input" type="date" value={d.submittedAt ?? ''} onChange={e => set('submittedAt', e.target.value || undefined)} />
        </Field>
        <Field label="파일명">
          <input className="input" value={d.fileName ?? ''} onChange={e => set('fileName', e.target.value)} />
        </Field>
        <Field label="검수자">
          <input className="input" value={d.reviewer ?? ''} onChange={e => set('reviewer', e.target.value)} />
        </Field>
        <Field label="메모" span>
          <input className="input" value={d.memo ?? ''} onChange={e => set('memo', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

/* ───────────────────────── 여권 · 사증 ───────────────────────── */

/** 여권 정보와 사증 진행 상세 수정 (해외 연자 전용) */
export function VisaDialog(
  { open, onClose, speaker }: { open: boolean; onClose: () => void; speaker: Speaker },
) {
  const { dispatch } = useApp()
  const blankPassport = (): Passport => ({ nameEn: speaker.nameEn, numberMasked: '', nationality: speaker.country, scanReceived: false })
  const [p, setP] = useState<Passport>(speaker.passport ?? blankPassport())
  const [v, setV] = useState(speaker.visa)
  const setP2 = <K extends keyof Passport>(k: K, val: Passport[K]) => setP(x => ({ ...x, [k]: val }))
  const setV2 = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV(x => ({ ...x, [k]: val }))

  useEffect(() => {
    if (!open) return
    setP(speaker.passport ?? blankPassport())
    setV(speaker.visa)
  }, [open, speaker])

  return (
    <Modal open={open} onClose={onClose} wide
      title="여권 · 사증 수정" sub={displayName(speaker)}
      footer={
        <>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => {
            dispatch({
              type: 'PATCH_SPEAKER', id: speaker.id,
              patch: { passport: p.nameEn || p.numberMasked ? p : undefined, visa: v },
              audit: { field: '여권·사증', after: `${v.track} · ${v.stage}` },
            })
            onClose()
          }}>저장</button>
        </>
      }>
      <div className="form-grid">
        <Field label="여권 영문명" hint="항공 탑승자명과 일치해야 합니다">
          <input className="input" value={p.nameEn} onChange={e => setP2('nameEn', e.target.value)} />
        </Field>
        <Field label="여권번호(마스킹)" hint="원본은 문서고 보관 — 뒤 4자리만">
          <input className="input" value={p.numberMasked} onChange={e => setP2('numberMasked', e.target.value)} placeholder="M****1234" />
        </Field>
        <Field label="국적">
          <input className="input" value={p.nationality} onChange={e => setP2('nationality', e.target.value)} />
        </Field>
        <Field label="여권 만료일" hint="행사 종료 기준 6개월 이상 남아야 합니다">
          <input className="input" type="date" value={p.expiryDate ?? ''} onChange={e => setP2('expiryDate', e.target.value || undefined)} />
        </Field>
        <label className="row small" style={{ gap: 8, gridColumn: '1 / -1' }}>
          <input type="checkbox" checked={p.scanReceived} onChange={e => setP2('scanReceived', e.target.checked)} /> 여권 사본 수령
        </label>

        <Field label="사증 종류">
          <select className="select" value={v.track} onChange={e => setV2('track', e.target.value as VisaTrack)}>
            {VISA_TRACKS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="진행 단계">
          <select className="select" value={v.stage} onChange={e => setV2('stage', e.target.value as VisaStage)}>
            {VISA_STAGES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="처리 소요(일)" hint="공관·시기에 따라 다릅니다">
          <input className="input" type="number" min={0} value={v.leadTimeDays} onChange={e => setV2('leadTimeDays', Number(e.target.value))} />
        </Field>
        <Field label="재외공관">
          <input className="input" value={v.consulate ?? ''} onChange={e => setV2('consulate', e.target.value)} placeholder="주샌프란시스코 총영사관" />
        </Field>
        <Field label="인정서 번호(CCVI)">
          <input className="input" value={v.ccviNumber ?? ''} onChange={e => setV2('ccviNumber', e.target.value)} />
        </Field>
        <Field label="영사 예약">
          <input className="input" type="datetime-local" value={v.appointmentAt ?? ''} onChange={e => setV2('appointmentAt', e.target.value || undefined)} />
        </Field>
        <Field label="접수일">
          <input className="input" type="date" value={v.submittedAt ?? ''} onChange={e => setV2('submittedAt', e.target.value || undefined)} />
        </Field>
        <Field label="발급일">
          <input className="input" type="date" value={v.issuedAt ?? ''} onChange={e => setV2('issuedAt', e.target.value || undefined)} />
        </Field>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={v.required} onChange={e => setV2('required', e.target.checked)} /> 사증 필요
        </label>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={v.ccviRequired} onChange={e => setV2('ccviRequired', e.target.checked)} /> 사증발급인정서 필요
        </label>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={v.ketaRequired} onChange={e => setV2('ketaRequired', e.target.checked)} /> K-ETA 대상
        </label>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={v.guaranteeLetterRequired} onChange={e => setV2('guaranteeLetterRequired', e.target.checked)} /> 신원보증서 필요
        </label>
      </div>
    </Modal>
  )
}

/* ───────────────────────── 구성원 · 지원 패키지 ───────────────────────── */

/** 구성원 추가 / 수정 — 초대와 별개로 명부를 직접 관리한다 */
export function MemberDialog(
  { open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Member },
) {
  const { state, dispatch } = useApp()
  const blank = (): Member => ({ id: rid('M'), name: '', role: '사무국', org: '', email: '' })
  const [f, setF] = useState<Member>(blank())
  const [err, setErr] = useState('')
  const set = <K extends keyof Member>(k: K, v: Member[K]) => setF(x => ({ ...x, [k]: v }))
  useEffect(() => { if (open) { setF(edit ? { ...edit } : blank()); setErr('') } }, [open, edit])

  const used = (id: string) =>
    state.speakers.some(s => s.liaisonMemberId === id || s.principalMemberId === id)
    || state.tasks.some(t => t.ownerMemberId === id)

  return (
    <Modal open={open} onClose={onClose}
      title={edit ? '구성원 수정' : '구성원 추가'}
      sub={edit ? undefined : '명부에만 추가됩니다. 실제 접근 권한은 아래 「구성원·접근 권한」에서 초대하세요.'}
      footer={
        <>
          {edit && (
            <button className="btn btn-danger" disabled={used(edit.id)}
              title={used(edit.id) ? '담당으로 지정된 연자·업무가 있어 삭제할 수 없습니다' : undefined}
              onClick={() => { dispatch({ type: 'DELETE_MEMBER', id: edit.id }); onClose() }}>삭제</button>
          )}
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => {
            if (!f.name.trim()) { setErr('이름을 입력하세요.'); return }
            if (edit) dispatch({ type: 'PATCH_MEMBER', id: edit.id, patch: f })
            else dispatch({ type: 'ADD_MEMBER', member: f })
            onClose()
          }}>저장</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="이름"><input className="input" value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="역할">
          <select className="select" value={f.role} onChange={e => set('role', e.target.value as RoleKey)}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="소속"><input className="input" value={f.org} onChange={e => set('org', e.target.value)} /></Field>
        <Field label="이메일"><input className="input" type="email" value={f.email} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="연락처" span><input className="input" value={f.phone ?? ''} onChange={e => set('phone', e.target.value)} /></Field>
      </div>
      {edit && used(edit.id) && (
        <div className="alert alert-info" style={{ marginTop: 14 }}>
          <span aria-hidden>ℹ</span>
          <span>이 구성원이 담당으로 지정된 연자·업무가 있어 삭제할 수 없습니다. 담당을 먼저 옮기세요.</span>
        </div>
      )}
    </Modal>
  )
}

/** 지원 패키지 수정 — 등급별 지원 범위와 기본 사례비를 정한다 */
export function PackageDialog(
  { open, onClose, edit }: { open: boolean; onClose: () => void; edit?: SupportPackage },
) {
  const { dispatch } = useApp()
  const blank = (): SupportPackage => ({
    id: rid('PKG'), name: '', tier: 'Invited', airCabin: '일반실', airTicketedBy: '주최발권',
    hotelNights: 1, hotelGrade: '스탠다드', hotelBilling: '주최일괄(Master Bill)',
    perDiemKRW: 0, honorariumKRW: 500_000, groundTransfer: false,
    companionSupported: false, insurance: false,
  })
  const [f, setF] = useState<SupportPackage>(blank())
  const [err, setErr] = useState('')
  const set = <K extends keyof SupportPackage>(k: K, v: SupportPackage[K]) => setF(x => ({ ...x, [k]: v }))
  useEffect(() => { if (open) { setF(edit ? { ...edit } : blank()); setErr('') } }, [open, edit])

  return (
    <Modal open={open} onClose={onClose} wide
      title={edit ? '지원 패키지 수정' : '지원 패키지 추가'}
      sub="연자 등록 시 등급에 맞는 패키지가 자동으로 선택되고, 기본 사례비가 채워집니다"
      footer={
        <>
          {edit && <button className="btn btn-danger" onClick={() => { dispatch({ type: 'DELETE_PACKAGE', id: edit.id }); onClose() }}>삭제</button>}
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => {
            if (!f.name.trim()) { setErr('패키지 이름을 입력하세요.'); return }
            if (edit) dispatch({ type: 'PATCH_PACKAGE', id: edit.id, patch: f })
            else dispatch({ type: 'ADD_PACKAGE', pkg: f })
            onClose()
          }}>저장</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="패키지 이름" span>
          <input className="input" value={f.name} onChange={e => set('name', e.target.value)} placeholder="예) 기조연자 패키지 (Keynote)" />
        </Field>
        <Field label="적용 등급">
          <select className="select" value={f.tier} onChange={e => set('tier', e.target.value as SupportPackage['tier'])}>
            {(['Keynote', 'Invited', 'Panel', 'Moderator', 'Chair', 'Workshop'] as const).map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="기본 사례비 (원)">
          <input className="input" type="number" min={0} step={100_000} value={f.honorariumKRW} onChange={e => set('honorariumKRW', Number(e.target.value))} />
        </Field>
        <Field label="교통 등급" hint="국제선 좌석 또는 KTX 등급">
          <input className="input" value={f.airCabin} onChange={e => set('airCabin', e.target.value)} />
        </Field>
        <Field label="발권 주체">
          <select className="select" value={f.airTicketedBy} onChange={e => set('airTicketedBy', e.target.value as SupportPackage['airTicketedBy'])}>
            {['주최발권', '본인구매후정산'].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="숙박 박수">
          <input className="input" type="number" min={0} value={f.hotelNights} onChange={e => set('hotelNights', Number(e.target.value))} />
        </Field>
        <Field label="객실 등급">
          <input className="input" value={f.hotelGrade} onChange={e => set('hotelGrade', e.target.value)} />
        </Field>
        <Field label="숙박 정산">
          <select className="select" value={f.hotelBilling} onChange={e => set('hotelBilling', e.target.value as SupportPackage['hotelBilling'])}>
            {['주최일괄(Master Bill)', '본인결제후정산'].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="일비 (원/일)">
          <input className="input" type="number" min={0} step={10_000} value={f.perDiemKRW} onChange={e => set('perDiemKRW', Number(e.target.value))} />
        </Field>
        <Field label="동반자 지원 범위" hint="지원할 때만 입력">
          <input className="input" value={f.companionScope ?? ''} onChange={e => set('companionScope', e.target.value)} placeholder="항공 1인 + 객실 공유" />
        </Field>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.groundTransfer} onChange={e => set('groundTransfer', e.target.checked)} /> 의전 차량·배차 지원
        </label>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.companionSupported} onChange={e => set('companionSupported', e.target.checked)} /> 동반자 지원
        </label>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.insurance} onChange={e => set('insurance', e.target.checked)} /> 여행자보험 제공
        </label>
        <Field label="비고" span>
          <input className="input" value={f.notes ?? ''} onChange={e => set('notes', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

/* ───────────────────────── 실비(정산) ───────────────────────── */

const EXPENSE_CATS: ExpenseCategory[] = ['항공', '숙박', '지상교통', '식비', '강연료', '비자수수료', '보험', '기타']
const EXPENSE_STATUS: Expense['status'][] = ['예정', '청구', '검수', '지급완료']

/**
 * 연자별 실비 등록 / 수정
 * 항공·숙박은 교통·숙박 화면에서 예약을 넣으면 자동으로 잡히지만,
 * 식비·비자수수료처럼 따로 발생하는 비용은 여기서 직접 넣는다.
 */
export function ExpenseDialog(
  { open, onClose, speaker, edit }:
  { open: boolean; onClose: () => void; speaker: Speaker; edit?: Expense },
) {
  const { dispatch } = useApp()
  const blank = (): Expense => ({
    id: rid('EXP'), category: '식비', description: '', amount: 0,
    currency: 'KRW', amountKRW: 0, receipt: false, status: '예정', spentAt: today(),
  })
  const [f, setF] = useState<Expense>(blank())
  const [err, setErr] = useState('')
  const set = <K extends keyof Expense>(k: K, v: Expense[K]) => setF(x => ({ ...x, [k]: v }))
  useEffect(() => { if (open) { setF(edit ? { ...edit } : blank()); setErr('') } }, [open, edit])

  const save = () => {
    if (!f.description.trim()) { setErr('내용을 입력하세요.'); return }
    if (f.amountKRW <= 0) { setErr('원화 환산 금액을 입력하세요.'); return }
    const list = edit
      ? speaker.settlement.expenses.map(x => (x.id === edit.id ? f : x))
      : [...speaker.settlement.expenses, f]
    dispatch({
      type: 'PATCH_SPEAKER', id: speaker.id,
      patch: { settlement: { ...speaker.settlement, expenses: list } },
      audit: { field: '실비', after: `${f.category} ${f.amountKRW.toLocaleString()}원 · ${f.description}` },
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide
      title={edit ? '실비 수정' : '실비 등록'} sub={displayName(speaker)}
      footer={
        <>
          {edit && (
            <button className="btn btn-danger" onClick={() => {
              dispatch({
                type: 'PATCH_SPEAKER', id: speaker.id,
                patch: { settlement: { ...speaker.settlement, expenses: speaker.settlement.expenses.filter(x => x.id !== edit.id) } },
                audit: { field: '실비', before: `${edit.category} ${edit.amountKRW.toLocaleString()}원`, memo: '삭제' },
              })
              onClose()
            }}>삭제</button>
          )}
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={save}>저장</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="비목">
          <select className="select" value={f.category} onChange={e => set('category', e.target.value as ExpenseCategory)}>
            {EXPENSE_CATS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="상태">
          <select className="select" value={f.status} onChange={e => set('status', e.target.value as Expense['status'])}>
            {EXPENSE_STATUS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="내용" span>
          <input className="input" value={f.description} onChange={e => set('description', e.target.value)} placeholder="예) 공항 리무진 왕복" />
        </Field>
        <Field label="원화 환산 (원)" hint="정산·예산 집계에 쓰이는 금액">
          <input className="input" type="number" min={0} step={10_000} value={f.amountKRW}
            onChange={e => { const v = Number(e.target.value); setF(x => ({ ...x, amountKRW: v, amount: x.currency === 'KRW' ? v : x.amount })) }} />
        </Field>
        <Field label="발생일">
          <input className="input" type="date" value={f.spentAt ?? ''} onChange={e => set('spentAt', e.target.value || undefined)} />
        </Field>
        <label className="row small" style={{ gap: 8, gridColumn: '1 / -1' }}>
          <input type="checkbox" checked={f.receipt} onChange={e => set('receipt', e.target.checked)} /> 증빙(영수증) 수취 완료
        </label>
      </div>
    </Modal>
  )
}

/* ───────────────────────── 현장 운영 상태 ───────────────────────── */

/** 현장 진행 시각을 직접 입력·수정한다(칩 클릭으로는 '지금' 만 찍힌다) */
export function OnsiteDialog(
  { open, onClose, speaker }: { open: boolean; onClose: () => void; speaker: Speaker },
) {
  const { dispatch } = useApp()
  const [o, setO] = useState(speaker.onsite)
  const set = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => setO(x => ({ ...x, [k]: v }))
  useEffect(() => { if (open) setO(speaker.onsite) }, [open, speaker])

  const rows: [keyof typeof o, string][] = [
    ['arrivedAirportAt', '공항 도착'],
    ['hotelCheckedInAt', '호텔 체크인'],
    ['venueCheckInAt', '행사장 체크인'],
    ['techRehearsalAt', '기술 리허설'],
    ['presentedAt', '발표 완료'],
    ['departedAt', '출국·귀가'],
  ]

  return (
    <Modal open={open} onClose={onClose} wide
      title="현장 진행 수정" sub={displayName(speaker)}
      footer={
        <>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => {
            dispatch({ type: 'PATCH_SPEAKER', id: speaker.id, patch: { onsite: o }, audit: { field: '현장 진행' } })
            onClose()
          }}>저장</button>
        </>
      }>
      <div className="form-grid">
        {rows.map(([k, label]) => (
          <Field key={String(k)} label={label}>
            <input className="input" type="datetime-local" value={(o[k] as string) ?? ''}
              onChange={e => set(k, (e.target.value || undefined) as never)} />
          </Field>
        ))}
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={o.badgeIssued} onChange={e => set('badgeIssued', e.target.checked)} /> 배지 발급
        </label>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={o.rehearsalDone} onChange={e => set('rehearsalDone', e.target.checked)} /> 리허설 완료
        </label>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={o.giftHandedOver} onChange={e => set('giftHandedOver', e.target.checked)} /> 기념품 전달
        </label>
      </div>
    </Modal>
  )
}
