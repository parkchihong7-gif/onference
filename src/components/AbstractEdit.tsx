import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store'
import { activeConference, sessionsOf } from '../lib/metrics'
import { Field, Modal } from './ui'
import { downloadCsv, readCsvObjects } from '../lib/csv'
import { today } from '../lib/format'
import type { Abstract } from '../types'

const rid = () => `ABS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
const TYPES: Abstract['presentType'][] = ['구연', '포스터', '비디오']
const STATUS: Abstract['status'][] = ['접수', '심사중', '채택', '수정요청', '반려', '철회']

/** 초록 직접 등록 / 수정 */
export function AbstractDialog(
  { open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Abstract },
) {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const sessions = sessionsOf(state)
  const nextCode = () => {
    const nums = state.abstracts
      .filter(a => a.conferenceId === conf.id)
      .map(a => Number((a.code.match(/(\d+)$/) ?? [])[1] ?? 0))
    return `AB-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
  }
  const blank = (): Abstract => ({
    id: rid(), conferenceId: conf.id, code: nextCode(),
    title: '', authorName: '', affiliation: '', email: '',
    track: conf.tracks[0] ?? '', presentType: '구연',
    submittedAt: today(), reviewerIds: [], scores: [], status: '접수',
  })
  const [f, setF] = useState<Abstract>(blank())
  const [scores, setScores] = useState('')
  const [err, setErr] = useState('')
  const set = <K extends keyof Abstract>(k: K, v: Abstract[K]) => setF(x => ({ ...x, [k]: v }))

  useEffect(() => {
    if (!open) return
    setF(edit ? { ...edit } : blank())
    setScores((edit?.scores ?? []).join(', '))
    setErr('')
  }, [open, edit])

  const save = () => {
    if (!f.title.trim()) { setErr('초록 제목을 입력하세요.'); return }
    if (!f.authorName.trim()) { setErr('발표자(저자)를 입력하세요.'); return }
    const parsed = scores.split(',').map(x => Number(x.trim())).filter(n => !Number.isNaN(n) && n >= 0 && n <= 10)
    const next: Abstract = { ...f, scores: parsed }
    if (edit) dispatch({ type: 'PATCH_ABSTRACT', id: edit.id, patch: next })
    else dispatch({ type: 'ADD_ABSTRACTS', abstracts: [next] })
    onClose()
  }

  const avg = useMemo(() => {
    const p = scores.split(',').map(x => Number(x.trim())).filter(n => !Number.isNaN(n))
    return p.length ? (p.reduce((a, b) => a + b, 0) / p.length).toFixed(1) : null
  }, [scores])

  return (
    <Modal open={open} onClose={onClose} wide
      title={edit ? '초록 수정' : '초록 등록'}
      sub={conf.nameKo}
      footer={
        <>
          {edit && (
            <button className="btn btn-danger" onClick={() => { dispatch({ type: 'DELETE_ABSTRACT', id: edit.id }); onClose() }}>
              삭제
            </button>
          )}
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={save}>저장</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="초록 번호">
          <input className="input" value={f.code} onChange={e => set('code', e.target.value)} />
        </Field>
        <Field label="투고일">
          <input className="input" type="date" value={f.submittedAt} onChange={e => set('submittedAt', e.target.value)} />
        </Field>
        <Field label="제목" span>
          <input className="input" value={f.title} onChange={e => set('title', e.target.value)} placeholder="예) 급성 심부전 환자에서의 조기 중재 효과" />
        </Field>
        <Field label="발표자(저자)">
          <input className="input" value={f.authorName} onChange={e => set('authorName', e.target.value)} />
        </Field>
        <Field label="소속">
          <input className="input" value={f.affiliation} onChange={e => set('affiliation', e.target.value)} />
        </Field>
        <Field label="이메일">
          <input className="input" type="email" value={f.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="트랙">
          <select className="select" value={f.track} onChange={e => set('track', e.target.value)}>
            {(conf.tracks.length ? conf.tracks : ['일반']).map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="발표 형식">
          <select className="select" value={f.presentType} onChange={e => set('presentType', e.target.value as Abstract['presentType'])}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="심사 상태">
          <select className="select" value={f.status} onChange={e => set('status', e.target.value as Abstract['status'])}>
            {STATUS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="심사 점수" hint={`쉼표로 구분 (0~10)${avg ? ` · 평균 ${avg}점` : ''}`}>
          <input className="input" value={scores} onChange={e => setScores(e.target.value)} placeholder="8, 9, 7" />
        </Field>
        <Field label="배정 세션" hint="채택된 초록만 배정합니다">
          <select className="select" value={f.sessionId ?? ''} onChange={e => set('sessionId', e.target.value || undefined)}>
            <option value="">미배정</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.date} · {s.title}</option>)}
          </select>
        </Field>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={!!f.awardNominated} onChange={e => set('awardNominated', e.target.checked)} />
          우수초록 후보
        </label>
        <Field label="메모" span>
          <input className="input" value={f.memo ?? ''} onChange={e => set('memo', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

/* ─────────────────────────── CSV 일괄 등록 ─────────────────────────── */

const COLS = ['초록번호', '제목', '발표자', '소속', '이메일', '트랙', '발표형식', '투고일', '상태', '점수'] as const

type Parsed = { ok: Abstract[]; errors: { line: number; reason: string }[] }

export function AbstractImportDialog(
  { open, onClose }: { open: boolean; onClose: () => void },
) {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<Parsed | undefined>()
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => { if (open) { setParsed(undefined); setFileName(''); setErr('') } }, [open])

  const handle = async (file: File) => {
    setFileName(file.name)
    try {
      const text = await file.text()
      const { headers, rows } = readCsvObjects(text)
      if (!rows.length) { setErr('내용이 없는 파일입니다.'); return }
      const missing = ['제목', '발표자'].filter(c => !headers.includes(c))
      if (missing.length) {
        setErr(`필수 열이 없습니다: ${missing.join(', ')} — 아래 양식을 내려받아 사용하세요.`)
        return
      }
      const used = new Set(state.abstracts.filter(a => a.conferenceId === conf.id).map(a => a.code))
      let seq = state.abstracts.filter(a => a.conferenceId === conf.id).length
      const ok: Abstract[] = []
      const errors: Parsed['errors'] = []
      rows.forEach((r, i) => {
        const line = i + 2
        if (!r['제목']) { errors.push({ line, reason: '제목 없음' }); return }
        if (!r['발표자']) { errors.push({ line, reason: '발표자 없음' }); return }
        const type = (TYPES as string[]).includes(r['발표형식']) ? r['발표형식'] as Abstract['presentType'] : '구연'
        const status = (STATUS as string[]).includes(r['상태']) ? r['상태'] as Abstract['status'] : '접수'
        let code = r['초록번호']?.trim()
        if (!code || used.has(code)) { seq += 1; code = `AB-${String(seq).padStart(3, '0')}` }
        used.add(code)
        const scores = (r['점수'] ?? '').split(/[,;]/).map(x => Number(x.trim()))
          .filter(n => !Number.isNaN(n) && n >= 0 && n <= 10)
        ok.push({
          id: rid(), conferenceId: conf.id, code,
          title: r['제목'], authorName: r['발표자'], affiliation: r['소속'] ?? '', email: r['이메일'] ?? '',
          track: r['트랙'] || conf.tracks[0] || '일반',
          presentType: type,
          submittedAt: /^\d{4}-\d{2}-\d{2}$/.test(r['투고일'] ?? '') ? r['투고일'] : today(),
          reviewerIds: [], scores, status,
        })
      })
      setParsed({ ok, errors })
      setErr('')
    } catch (e) {
      setErr(`파일을 읽지 못했습니다: ${String(e)}`)
    }
  }

  const commit = () => {
    if (!parsed?.ok.length) return
    dispatch({ type: 'ADD_ABSTRACTS', abstracts: parsed.ok })
    onClose()
  }

  const template = () => downloadCsv('초록_일괄등록_양식.csv', [
    [...COLS],
    ['AB-001', '급성 심부전 환자에서의 조기 중재 효과', '김연구', '한빛대학교병원 순환기내과', 'kim@example.org', conf.tracks[0] ?? '순환기', '구연', today(), '접수', '8,9,7'],
    ['AB-002', '염증성 장질환 생물학적 제제 치료 경험', '이연구', '부산대학교병원 소화기내과', 'lee@example.org', conf.tracks[1] ?? '소화기', '포스터', today(), '접수', ''],
  ])

  return (
    <Modal open={open} onClose={onClose} wide
      title="초록 일괄 등록 (CSV)"
      sub="투고 시스템에서 받은 파일을 그대로 올립니다"
      footer={
        <>
          <button className="btn" onClick={template}>⬇ 양식 내려받기</button>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" disabled={!parsed?.ok.length} onClick={commit}>
            {parsed?.ok.length ? `${parsed.ok.length}건 등록` : '등록'}
          </button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}

      <div className="alert alert-info" style={{ marginBottom: 14 }}>
        <span aria-hidden>ℹ</span>
        <span>
          첫 줄이 머리글이어야 하며 <strong>제목·발표자</strong>는 필수입니다. 열 순서는 달라도 됩니다.
          <br />인식하는 열: {COLS.join(' · ')}
          <br />초록번호가 비었거나 중복이면 자동으로 새 번호를 매깁니다.
        </span>
      </div>

      <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) void handle(f) }} />
      <div className="row-wrap" style={{ marginBottom: 14 }}>
        <button className="btn" onClick={() => fileRef.current?.click()}>📄 CSV 파일 선택</button>
        {fileName && <span className="small muted">{fileName}</span>}
      </div>

      {parsed && (
        <>
          <div className="row-wrap small" style={{ marginBottom: 10 }}>
            <span className="chip">읽은 건수 {parsed.ok.length + parsed.errors.length}</span>
            <span className="chip">등록 가능 {parsed.ok.length}</span>
            {parsed.errors.length > 0 && <span className="chip">건너뜀 {parsed.errors.length}</span>}
          </div>
          {parsed.errors.length > 0 && (
            <div className="alert alert-warning" style={{ marginBottom: 12 }}>
              <span aria-hidden>⚠</span>
              <span>{parsed.errors.slice(0, 5).map(e => `${e.line}행: ${e.reason}`).join(' · ')}
                {parsed.errors.length > 5 ? ` 외 ${parsed.errors.length - 5}건` : ''}</span>
            </div>
          )}
          <div className="table-wrap" style={{ maxHeight: 260, overflow: 'auto' }}>
            <table className="data">
              <thead><tr><th>번호</th><th>제목</th><th>발표자</th><th>트랙</th><th>형식</th><th>상태</th></tr></thead>
              <tbody>
                {parsed.ok.slice(0, 20).map(a => (
                  <tr key={a.id}>
                    <td className="num small">{a.code}</td>
                    <td className="small">{a.title}</td>
                    <td className="small">{a.authorName}</td>
                    <td className="small">{a.track}</td>
                    <td className="small">{a.presentType}</td>
                    <td className="small">{a.status}</td>
                  </tr>
                ))}
                {parsed.ok.length > 20 && (
                  <tr><td colSpan={6} className="empty">… 외 {parsed.ok.length - 20}건</td></tr>
                )}
                {!parsed.ok.length && <tr><td colSpan={6} className="empty">등록할 수 있는 행이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}
