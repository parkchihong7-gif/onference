import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { activeConference } from '../lib/metrics'
import { Field, Modal } from './ui'
import { downloadCsv, readCsvObjects } from '../lib/csv'
import { krw, today } from '../lib/format'
import type { Registration } from '../types'

const rid = () => `REG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
const TYPES: Registration['type'][] = ['정회원', '준회원', '비회원', '전공의', '학생', '연자', '스태프', '후원사']
const CHANNELS: Registration['channel'][] = ['사전등록', '현장등록', '초청']
const PAY: NonNullable<Registration['payMethod']>[] = ['카드', '계좌이체', '법인', '면제']

/** 구분별 기본 참가비 — 학회 일반 관행에 맞춘 초기값(등록 화면에서 수정 가능) */
const DEFAULT_FEE: Record<Registration['type'], number> = {
  정회원: 150_000, 준회원: 100_000, 비회원: 200_000, 전공의: 80_000,
  학생: 50_000, 연자: 0, 스태프: 0, 후원사: 0,
}

/** 참가자 직접 등록 / 수정 */
export function RegistrationDialog(
  { open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Registration },
) {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const blank = (): Registration => ({
    id: rid(), conferenceId: conf.id, name: '', affiliation: '', email: '',
    type: '정회원', channel: '사전등록', fee: DEFAULT_FEE['정회원'], paid: false,
    registeredAt: today(), attended: false, badgePrinted: false,
  })
  const [f, setF] = useState<Registration>(blank())
  const [feeTouched, setFeeTouched] = useState(false)
  const [err, setErr] = useState('')
  const set = <K extends keyof Registration>(k: K, v: Registration[K]) => setF(x => ({ ...x, [k]: v }))

  useEffect(() => {
    if (!open) return
    setF(edit ? { ...edit } : blank())
    setFeeTouched(!!edit)
    setErr('')
  }, [open, edit])

  // 구분을 고르면 기본 참가비를 채운다(직접 고치면 그 값을 유지)
  useEffect(() => { if (!feeTouched) setF(x => ({ ...x, fee: DEFAULT_FEE[x.type] })) }, [f.type, feeTouched])

  const save = () => {
    if (!f.name.trim()) { setErr('성명을 입력하세요.'); return }
    if (f.type !== '학생' && !f.affiliation.trim()) { setErr('소속을 입력하세요.'); return }
    if (edit) dispatch({ type: 'PATCH_REGISTRATION', id: edit.id, patch: f })
    else dispatch({ type: 'ADD_REGISTRATIONS', registrations: [f] })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide
      title={edit ? '참가 등록 수정' : '참가자 등록'}
      sub={conf.nameKo}
      footer={
        <>
          {edit && (
            <button className="btn btn-danger" onClick={() => { dispatch({ type: 'DELETE_REGISTRATION', id: edit.id }); onClose() }}>삭제</button>
          )}
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={save}>저장</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="성명">
          <input className="input" value={f.name} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="소속">
          <input className="input" value={f.affiliation} onChange={e => set('affiliation', e.target.value)} />
        </Field>
        <Field label="부서·진료과">
          <input className="input" value={f.department ?? ''} onChange={e => set('department', e.target.value)} />
        </Field>
        <Field label="면허·회원번호" hint="연수평점 부여에 필요합니다">
          <input className="input" value={f.licenseNo ?? ''} onChange={e => set('licenseNo', e.target.value)} />
        </Field>
        <Field label="이메일">
          <input className="input" type="email" value={f.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="연락처">
          <input className="input" value={f.phone ?? ''} onChange={e => set('phone', e.target.value)} />
        </Field>
        <Field label="구분">
          <select className="select" value={f.type} onChange={e => set('type', e.target.value as Registration['type'])}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="등록 경로">
          <select className="select" value={f.channel} onChange={e => set('channel', e.target.value as Registration['channel'])}>
            {CHANNELS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="참가비 (원)" hint={`구분 기본값 ${krw(DEFAULT_FEE[f.type])}`}>
          <input className="input" type="number" min={0} step={10_000} value={f.fee}
            onChange={e => { set('fee', Number(e.target.value)); setFeeTouched(true) }} />
        </Field>
        <Field label="결제 수단">
          <select className="select" value={f.payMethod ?? ''} onChange={e => set('payMethod', (e.target.value || undefined) as Registration['payMethod'])}>
            <option value="">미지정</option>
            {PAY.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="등록일">
          <input className="input" type="date" value={f.registeredAt} onChange={e => set('registeredAt', e.target.value)} />
        </Field>
        <Field label="부여 평점" hint="행사 후 입력">
          <input className="input" type="number" min={0} step={1} value={f.creditsEarned ?? 0}
            onChange={e => set('creditsEarned', Number(e.target.value))} />
        </Field>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.paid} onChange={e => set('paid', e.target.checked)} /> 입금 완료
        </label>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.attended} onChange={e => set('attended', e.target.checked)} /> 현장 출석
        </label>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.badgePrinted} onChange={e => set('badgePrinted', e.target.checked)} /> 배지 출력
        </label>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={!!f.mealTicket} onChange={e => set('mealTicket', e.target.checked)} /> 식권 지급
        </label>
        <Field label="메모" span>
          <input className="input" value={f.memo ?? ''} onChange={e => set('memo', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

/* ─────────────────── 참가 등록 CSV 일괄 등록 ─────────────────── */

const COLS = ['성명', '소속', '부서', '면허번호', '이메일', '연락처', '구분', '등록경로', '참가비', '입금', '등록일'] as const

export function RegistrationImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const fileRef = useRef<HTMLInputElement>(null)
  const [ok, setOk] = useState<Registration[]>([])
  const [errors, setErrors] = useState<{ line: number; reason: string }[]>([])
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => { if (open) { setOk([]); setErrors([]); setFileName(''); setErr('') } }, [open])

  const handle = async (file: File) => {
    setFileName(file.name)
    try {
      const { headers, rows } = readCsvObjects(await file.text())
      if (!rows.length) { setErr('내용이 없는 파일입니다.'); return }
      if (!headers.includes('성명')) { setErr('필수 열이 없습니다: 성명 — 아래 양식을 내려받아 사용하세요.'); return }
      const seen = new Set(state.registrations.filter(r => r.conferenceId === conf.id).map(r => r.email.toLowerCase()).filter(Boolean))
      const good: Registration[] = []
      const bad: { line: number; reason: string }[] = []
      rows.forEach((r, i) => {
        const line = i + 2
        if (!r['성명']) { bad.push({ line, reason: '성명 없음' }); return }
        const email = (r['이메일'] ?? '').toLowerCase()
        if (email && seen.has(email)) { bad.push({ line, reason: `이미 등록된 이메일(${email})` }); return }
        if (email) seen.add(email)
        const type = (TYPES as string[]).includes(r['구분']) ? r['구분'] as Registration['type'] : '비회원'
        const channel = (CHANNELS as string[]).includes(r['등록경로']) ? r['등록경로'] as Registration['channel'] : '사전등록'
        const feeRaw = Number((r['참가비'] ?? '').replace(/[^\d]/g, ''))
        good.push({
          id: rid(), conferenceId: conf.id,
          name: r['성명'], affiliation: r['소속'] ?? '', department: r['부서'] || undefined,
          licenseNo: r['면허번호'] || undefined, email: r['이메일'] ?? '', phone: r['연락처'] || undefined,
          type, channel,
          fee: Number.isFinite(feeRaw) && feeRaw > 0 ? feeRaw : DEFAULT_FEE[type],
          paid: /^(Y|y|예|O|o|TRUE|true|1|완료)$/.test(r['입금'] ?? ''),
          registeredAt: /^\d{4}-\d{2}-\d{2}$/.test(r['등록일'] ?? '') ? r['등록일'] : today(),
          attended: false, badgePrinted: false,
        })
      })
      setOk(good); setErrors(bad); setErr('')
    } catch (e) { setErr(`파일을 읽지 못했습니다: ${String(e)}`) }
  }

  const template = () => downloadCsv('참가등록_일괄등록_양식.csv', [
    [...COLS],
    ['김참가', '한빛대학교병원', '순환기내과', '12345', 'kim@example.org', '010-1234-5678', '정회원', '사전등록', '150000', 'Y', today()],
    ['이참가', '부산대학교병원', '소화기내과', '23456', 'lee@example.org', '010-2345-6789', '전공의', '사전등록', '80000', 'N', today()],
  ])

  return (
    <Modal open={open} onClose={onClose} wide
      title="참가 등록 일괄 등록 (CSV)"
      sub="등록대행사·구글폼에서 받은 파일을 그대로 올립니다"
      footer={
        <>
          <button className="btn" onClick={template}>⬇ 양식 내려받기</button>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" disabled={!ok.length}
            onClick={() => { dispatch({ type: 'ADD_REGISTRATIONS', registrations: ok }); onClose() }}>
            {ok.length ? `${ok.length}건 등록` : '등록'}
          </button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="alert alert-info" style={{ marginBottom: 14 }}>
        <span aria-hidden>ℹ</span>
        <span>
          첫 줄이 머리글이어야 하며 <strong>성명</strong>은 필수입니다. 열 순서는 달라도 됩니다.
          <br />인식하는 열: {COLS.join(' · ')}
          <br />참가비가 비어 있으면 구분별 기본 단가를 넣고, 이메일이 이미 등록돼 있으면 건너뜁니다.
        </span>
      </div>
      <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) void handle(f) }} />
      <div className="row-wrap" style={{ marginBottom: 14 }}>
        <button className="btn" onClick={() => fileRef.current?.click()}>📄 CSV 파일 선택</button>
        {fileName && <span className="small muted">{fileName}</span>}
      </div>
      {(ok.length > 0 || errors.length > 0) && (
        <>
          <div className="row-wrap small" style={{ marginBottom: 10 }}>
            <span className="chip">읽은 건수 {ok.length + errors.length}</span>
            <span className="chip">등록 가능 {ok.length}</span>
            {errors.length > 0 && <span className="chip">건너뜀 {errors.length}</span>}
            <span className="chip">참가비 합계 {krw(ok.reduce((a, r) => a + r.fee, 0))}</span>
          </div>
          {errors.length > 0 && (
            <div className="alert alert-warning" style={{ marginBottom: 12 }}>
              <span aria-hidden>⚠</span>
              <span>{errors.slice(0, 5).map(e => `${e.line}행: ${e.reason}`).join(' · ')}{errors.length > 5 ? ` 외 ${errors.length - 5}건` : ''}</span>
            </div>
          )}
          <div className="table-wrap" style={{ maxHeight: 240, overflow: 'auto' }}>
            <table className="data">
              <thead><tr><th>성명</th><th>소속</th><th>구분</th><th>경로</th><th className="right">참가비</th><th>입금</th></tr></thead>
              <tbody>
                {ok.slice(0, 20).map(r => (
                  <tr key={r.id}>
                    <td className="small">{r.name}</td>
                    <td className="small">{r.affiliation}</td>
                    <td className="small nowrap">{r.type}</td>
                    <td className="small nowrap">{r.channel}</td>
                    <td className="right num">{krw(r.fee)}</td>
                    <td className="small">{r.paid ? '완료' : '미납'}</td>
                  </tr>
                ))}
                {ok.length > 20 && <tr><td colSpan={6} className="empty">… 외 {ok.length - 20}건</td></tr>}
                {!ok.length && <tr><td colSpan={6} className="empty">등록할 수 있는 행이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}
