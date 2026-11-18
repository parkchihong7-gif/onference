import { activeConference } from '../lib/metrics'
import { useEffect, useMemo, useState } from 'react'
import { useApp, useEnsure } from '../store'
import { go } from '../lib/router'
import { displayName, labelsOf } from '../lib/scope'
import { fmtDate } from '../lib/format'

interface Hit { kind: string; title: string; sub: string; page: string; id?: string }

/** 전역 검색 — 연자·문서·세션·업무·초록·등록·후원·코멘트를 한 번에 찾는다 (Ctrl/⌘+K) */
export function Search({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useApp()
  const labels = labelsOf(activeConference(state))
  // 검색창은 항상 떠 있으므로, 실제로 열었을 때만 코멘트를 받아온다
  useEnsure(open ? ['comments'] : [])
  const [q, setQ] = useState('')
  const conf = state.activeConferenceId

  useEffect(() => { if (open) setQ('') }, [open])
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [onClose])

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase()
    if (t.length < 1) return []
    const has = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' ').toLowerCase().includes(t)
    const out: Hit[] = []
    state.speakers.filter(s => s.conferenceId === conf && has(s.nameKo, s.nameEn, s.affiliation, s.department, s.title, s.tags.join(' ')))
      .slice(0, 8).forEach(s => out.push({ kind: labels.speaker, title: displayName(s), sub: `${s.affiliation} · ${s.tier} · ${s.stage}`, page: 'speakers', id: s.id }))
    state.docs.filter(d => d.conferenceId === conf && has(d.title, d.body, d.tags.join(' ')))
      .slice(0, 6).forEach(d => out.push({ kind: '문서', title: d.title, sub: `${d.type} · ${fmtDate(d.updatedAt)}`, page: 'docs' }))
    state.sessions.filter(s => s.conferenceId === conf && has(s.title, s.track, s.room))
      .slice(0, 6).forEach(s => out.push({ kind: '세션', title: s.title, sub: `${fmtDate(s.date)} ${s.startTime} · ${s.room}`, page: 'sessions' }))
    state.tasks.filter(x => x.conferenceId === conf && has(x.title))
      .slice(0, 6).forEach(x => out.push({ kind: '업무', title: x.title, sub: `${x.phase} · 기한 ${fmtDate(x.dueDate)} · ${x.status}`, page: 'tasks' }))
    state.abstracts.filter(a => a.conferenceId === conf && has(a.title, a.authorName, a.code, a.affiliation))
      .slice(0, 6).forEach(a => out.push({ kind: '초록', title: a.title, sub: `${a.code} · ${a.authorName} · ${a.status}`, page: 'abstracts' }))
    state.registrations.filter(r => r.conferenceId === conf && has(r.name, r.affiliation, r.licenseNo))
      .slice(0, 5).forEach(r => out.push({ kind: '등록', title: r.name, sub: `${r.affiliation} · ${r.type} · ${r.paid ? '납부완료' : '미납'}`, page: 'registrations' }))
    state.sponsors.filter(s => s.conferenceId === conf && has(s.company, s.contactName, s.boothNo))
      .slice(0, 5).forEach(s => out.push({ kind: '후원', title: s.company, sub: `${s.tier} · ${s.contractStatus}`, page: 'sponsors' }))
    state.comments.filter(c => c.conferenceId === conf && has(c.body, c.targetLabel))
      .slice(0, 5).forEach(c => out.push({ kind: '코멘트', title: c.body.slice(0, 50), sub: `${c.targetType} · ${c.targetLabel}`, page: c.targetType === '문서' ? 'docs' : 'workspace' }))
    return out
  }, [q, state, conf])

  if (!open) return null
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <div role="dialog" aria-modal="true" style={{
        position: 'fixed', top: '12vh', left: '50%', transform: 'translateX(-50%)', zIndex: 50,
        width: 'min(680px, 92vw)', background: 'var(--surface)', border: '1px solid var(--line-strong)',
        borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
      }}>
        <input autoFocus className="input" placeholder={`${labels.speaker} · 문서 · 세션 · 업무 · 초록 · 등록 · 후원 검색`}
          value={q} onChange={e => setQ(e.target.value)}
          style={{ width: '100%', border: 0, borderBottom: '1px solid var(--line)', borderRadius: 0, padding: '14px 16px', fontSize: 15 }} />
        <div style={{ maxHeight: '56vh', overflowY: 'auto' }}>
          {hits.map((h, i) => (
            <button key={i} onClick={() => { go(h.page, h.id); onClose() }}
              style={{
                display: 'flex', gap: 10, alignItems: 'center', width: '100%', textAlign: 'left',
                padding: '10px 16px', border: 0, borderBottom: '1px solid var(--line)', background: 'none', cursor: 'pointer',
              }}>
              <span className="chip nowrap">{h.kind}</span>
              <span style={{ minWidth: 0 }}>
                <span className="small trunc" style={{ display: 'block', fontWeight: 600 }}>{h.title}</span>
                <span className="xsmall muted trunc" style={{ display: 'block' }}>{h.sub}</span>
              </span>
            </button>
          ))}
          {q && !hits.length && <div className="empty">검색 결과가 없습니다.</div>}
          {!q && <div className="empty">검색어를 입력하세요. 단축키: Ctrl/⌘ + K</div>}
        </div>
      </div>
    </>
  )
}
