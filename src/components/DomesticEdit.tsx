import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { activeConference, sessionsOf } from '../lib/metrics'
import { Field, Modal } from './ui'
import type { CreditProgram, Sponsor } from '../types'

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
const TIERS: Sponsor['tier'][] = ['Diamond', 'Platinum', 'Gold', 'Silver', '부스only']
const CONTRACT: Sponsor['contractStatus'][] = ['제안', '협의', '계약완료', '입금완료', '취소']
const CREDIT_STATUS: CreditProgram['status'][] = ['준비', '신청', '심사중', '승인', '보완요청', '반려']

/** 후원사 등록 / 수정 */
export function SponsorDialog(
  { open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Sponsor },
) {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const blank = (): Sponsor => ({
    id: rid('SPN'), conferenceId: conf.id, company: '', tier: 'Gold', amount: 0,
    contactName: '', contactEmail: '', contractStatus: '제안', benefits: [],
    ownerMemberId: state.members.find(m => m.role === '사무국')?.id ?? state.members[0]?.id ?? '',
  })
  const [f, setF] = useState<Sponsor>(blank())
  const [benefits, setBenefits] = useState('')
  const [err, setErr] = useState('')
  const set = <K extends keyof Sponsor>(k: K, v: Sponsor[K]) => setF(x => ({ ...x, [k]: v }))

  useEffect(() => {
    if (!open) return
    setF(edit ? { ...edit } : blank())
    setBenefits((edit?.benefits ?? []).join(', '))
    setErr('')
  }, [open, edit])

  const save = () => {
    if (!f.company.trim()) { setErr('업체명을 입력하세요.'); return }
    const next: Sponsor = { ...f, benefits: benefits.split(',').map(x => x.trim()).filter(Boolean) }
    if (edit) dispatch({ type: 'PATCH_SPONSOR', id: edit.id, patch: next })
    else dispatch({ type: 'ADD_SPONSOR', sponsor: next })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide
      title={edit ? '후원사 수정' : '후원사 등록'}
      sub={conf.nameKo}
      footer={
        <>
          {edit && (
            <button className="btn btn-danger" onClick={() => { dispatch({ type: 'DELETE_SPONSOR', id: edit.id }); onClose() }}>
              삭제
            </button>
          )}
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={save}>저장</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="업체명" span>
          <input className="input" value={f.company} onChange={e => set('company', e.target.value)} placeholder="예) 한빛제약" />
        </Field>
        <Field label="등급">
          <select className="select" value={f.tier} onChange={e => set('tier', e.target.value as Sponsor['tier'])}>
            {TIERS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="후원 금액 (원)">
          <input className="input" type="number" min={0} step={1_000_000} value={f.amount} onChange={e => set('amount', Number(e.target.value))} />
        </Field>
        <Field label="담당자">
          <input className="input" value={f.contactName} onChange={e => set('contactName', e.target.value)} />
        </Field>
        <Field label="담당자 이메일">
          <input className="input" type="email" value={f.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
        </Field>
        <Field label="부스 번호">
          <input className="input" value={f.boothNo ?? ''} onChange={e => set('boothNo', e.target.value)} placeholder="A-01" />
        </Field>
        <Field label="부스 규모">
          <input className="input" value={f.boothSize ?? ''} onChange={e => set('boothSize', e.target.value)} placeholder="3m x 3m" />
        </Field>
        <Field label="계약 상태">
          <select className="select" value={f.contractStatus} onChange={e => set('contractStatus', e.target.value as Sponsor['contractStatus'])}>
            {CONTRACT.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="마감일">
          <input className="input" type="date" value={f.dueDate ?? ''} onChange={e => set('dueDate', e.target.value)} />
        </Field>
        <Field label="제공 항목" span hint="쉼표로 구분 — 예) 런천심포지엄, 프로그램북 광고, 부스">
          <input className="input" value={benefits} onChange={e => setBenefits(e.target.value)} />
        </Field>
        <Field label="메모" span>
          <input className="input" value={f.memo ?? ''} onChange={e => set('memo', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

/** 연수평점 신청 등록 / 수정 */
export function CreditDialog(
  { open, onClose, edit }: { open: boolean; onClose: () => void; edit?: CreditProgram },
) {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const sessions = sessionsOf(state)
  const blank = (): CreditProgram => ({
    id: rid('CRD'), conferenceId: conf.id,
    authority: conf.creditAuthority ?? '대한의사협회 연수교육',
    category: '필수', appliedCredits: 0, sessionIds: [], status: '준비',
    ownerMemberId: state.members.find(m => m.role === '사무국')?.id ?? state.members[0]?.id ?? '',
  })
  const [f, setF] = useState<CreditProgram>(blank())
  const [err, setErr] = useState('')
  const set = <K extends keyof CreditProgram>(k: K, v: CreditProgram[K]) => setF(x => ({ ...x, [k]: v }))

  useEffect(() => { if (open) { setF(edit ? { ...edit } : blank()); setErr('') } }, [open, edit])

  const save = () => {
    if (!f.authority.trim()) { setErr('인정 기관을 입력하세요.'); return }
    if (f.appliedCredits <= 0) { setErr('신청 평점을 입력하세요.'); return }
    if (edit) dispatch({ type: 'PATCH_CREDIT', id: edit.id, patch: f })
    else dispatch({ type: 'ADD_CREDIT', credit: f })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide
      title={edit ? '연수평점 신청 수정' : '연수평점 신청 등록'}
      sub={conf.nameKo}
      footer={
        <>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={save}>저장</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="인정 기관" span>
          <input className="input" value={f.authority} onChange={e => set('authority', e.target.value)} placeholder="대한의사협회 연수교육" />
        </Field>
        <Field label="평점 구분">
          <input className="input" value={f.category} onChange={e => set('category', e.target.value)} placeholder="필수 / 선택 / 윤리" />
        </Field>
        <Field label="신청 평점">
          <input className="input" type="number" min={0} step={1} value={f.appliedCredits} onChange={e => set('appliedCredits', Number(e.target.value))} />
        </Field>
        <Field label="승인 평점" hint="결과 통보 후 입력">
          <input className="input" type="number" min={0} step={1} value={f.approvedCredits ?? 0} onChange={e => set('approvedCredits', Number(e.target.value))} />
        </Field>
        <Field label="신청번호">
          <input className="input" value={f.applicationNo ?? ''} onChange={e => set('applicationNo', e.target.value)} />
        </Field>
        <Field label="상태">
          <select className="select" value={f.status} onChange={e => set('status', e.target.value as CreditProgram['status'])}>
            {CREDIT_STATUS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="제출일">
          <input className="input" type="date" value={f.submittedAt ?? ''} onChange={e => set('submittedAt', e.target.value)} />
        </Field>
        <Field label="대상 세션" span hint="복수 선택 가능">
          <select className="select" multiple size={4} value={f.sessionIds}
            onChange={e => set('sessionIds', [...e.target.selectedOptions].map(o => o.value))}>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.date} · {s.title}</option>)}
          </select>
        </Field>
        <Field label="부여 조건" span hint="예) 세션 전체 출석 및 입·퇴장 태깅">
          <input className="input" value={f.condition ?? ''} onChange={e => set('condition', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
