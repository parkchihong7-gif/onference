import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { activeConference } from '../lib/metrics'
import { Modal } from './ui'
import { ddayFrom, fmtDate } from '../lib/format'
import { PHASES } from '../types'
import type { Milestone } from '../types'

const rid = () => `MS-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

/**
 * 마일스톤 관리 — 행사의 기준 일정을 직접 더하고 고친다.
 * 담당자는 업무 단계에 맞춰 자동 배정되지만 여기서 바꿀 수 있다.
 */
export function MilestoneDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const [rows, setRows] = useState<Milestone[]>([])
  const [err, setErr] = useState('')

  useEffect(() => { if (open) { setRows([...conf.milestones]); setErr('') } }, [open, conf])

  const patch = (id: string, p: Partial<Milestone>) =>
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...p } : r)))

  const add = () => setRows(rs => [...rs, {
    id: rid(), label: '', date: conf.startDate, phase: '기획·세팅',
    owner: state.members.find(m => m.role === '사무국')?.id,
  }])

  const save = () => {
    const cleaned = rows.filter(r => r.label.trim() && r.date)
    if (cleaned.length !== rows.length) { setErr('이름과 일정이 비어 있는 줄이 있습니다. 채우거나 삭제하세요.'); return }
    dispatch({
      type: 'PATCH_CONFERENCE', id: conf.id,
      patch: { milestones: [...cleaned].sort((a, b) => a.date.localeCompare(b.date)) },
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide
      title="마일스톤 관리"
      sub={`${conf.nameKo} · 개막 ${fmtDate(conf.startDate)} 기준`}
      footer={
        <>
          <button className="btn" onClick={add}>＋ 줄 추가</button>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={save}>저장</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="table-wrap" style={{ maxHeight: 420, overflow: 'auto' }}>
        <table className="data">
          <thead>
            <tr><th style={{ minWidth: 210 }}>마일스톤</th><th>일정</th><th>개막 기준</th><th>단계</th><th>담당</th><th className="no-print"></th></tr>
          </thead>
          <tbody>
            {rows.map(m => (
              <tr key={m.id}>
                <td><input className="input" value={m.label} onChange={e => patch(m.id, { label: e.target.value })} placeholder="예) 초록 투고 마감" /></td>
                <td><input className="input" type="date" value={m.date} onChange={e => patch(m.id, { date: e.target.value })} /></td>
                <td className="small muted num nowrap">{ddayFrom(conf.startDate, m.date)}</td>
                <td>
                  <select className="select" value={m.phase} onChange={e => patch(m.id, { phase: e.target.value as Milestone['phase'] })}>
                    {PHASES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td>
                  <select className="select" value={m.owner ?? ''} onChange={e => patch(m.id, { owner: e.target.value || undefined })}>
                    <option value="">미지정</option>
                    {state.members.map(x => <option key={x.id} value={x.id}>{x.name} · {x.role}</option>)}
                  </select>
                </td>
                <td className="no-print">
                  <button className="btn btn-sm" title="삭제" onClick={() => setRows(rs => rs.filter(r => r.id !== m.id))}>🗑</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="empty">마일스톤이 없습니다. 「＋ 줄 추가」로 만드세요.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="alert alert-info" style={{ marginTop: 14 }}>
        <span aria-hidden>ℹ</span>
        <span>저장하면 대시보드의 마일스톤 표와 캘린더에 즉시 반영됩니다. 단계는 업무 진행 집계와 연결됩니다.</span>
      </div>
    </Modal>
  )
}
