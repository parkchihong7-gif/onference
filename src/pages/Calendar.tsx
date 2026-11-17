import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { activeConference, sessionsOf, speakersOf, tasksOf } from '../lib/metrics'
import { Badge, Card, Empty } from '../components/ui'
import { displayName } from '../lib/scope'
import { fmtDate, today } from '../lib/format'
import { go } from '../lib/router'

type EventKind = '세션' | '업무' | '마일스톤' | '여정' | '등록'
interface CalEvent { date: string; kind: EventKind; title: string; sub?: string; id?: string; link?: string }

const COLORS: Record<EventKind, string> = {
  세션: 'var(--s7)', 업무: 'var(--s1)', 마일스톤: 'var(--s2)', 여정: 'var(--s3)', 등록: 'var(--s4)',
}

export function Calendar() {
  const { state } = useApp()
  const conf = activeConference(state)
  const [cursor, setCursor] = useState(() => conf.startDate.slice(0, 7))
  const [filters, setFilters] = useState<EventKind[]>(['세션', '업무', '마일스톤', '여정'])

  const events = useMemo<CalEvent[]>(() => {
    const out: CalEvent[] = []
    sessionsOf(state).forEach(s => out.push({ date: s.date, kind: '세션', title: s.title, sub: `${s.startTime} · ${s.room}` }))
    tasksOf(state).forEach(t => out.push({
      date: t.dueDate, kind: '업무', title: t.title,
      sub: `${state.members.find(m => m.id === t.ownerMemberId)?.name ?? ''} · ${t.status}`,
    }))
    conf.milestones.forEach(m => out.push({ date: m.date, kind: '마일스톤', title: m.label, sub: m.phase }))
    speakersOf(state).forEach(sp => sp.flights.forEach(f => out.push({
      date: (f.direction === '입국' || f.direction === '출발' ? f.arriveAt : f.departAt).slice(0, 10),
      kind: '여정', title: `${displayName(sp)} ${f.direction}`, sub: `${f.flightNo} ${f.from}→${f.to}`, id: sp.id, link: 'speakers',
    })))
    return out
  }, [state, conf])

  const [y, m] = cursor.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const startWeekday = first.getUTCDay()
  const cells: (string | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${cursor}-${String(i + 1).padStart(2, '0')}`),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1))
    setCursor(d.toISOString().slice(0, 7))
  }
  const visible = events.filter(e => filters.includes(e.kind))
  const monthEvents = visible.filter(e => e.date.startsWith(cursor))

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">캘린더</h1>
          <p className="page-desc">
            세션·업무 기한·마일스톤·연자 이동을 한 달력에 모아 봅니다. 날짜 칸의 항목을 누르면 해당 레코드로 이동합니다.
          </p>
        </div>
        <div className="row-wrap no-print">
          <button className="btn" onClick={() => shift(-1)}>‹ 이전</button>
          <strong style={{ minWidth: 92, textAlign: 'center' }}>{y}년 {m}월</strong>
          <button className="btn" onClick={() => shift(1)}>다음 ›</button>
          <button className="btn" onClick={() => setCursor(conf.startDate.slice(0, 7))}>행사 월</button>
        </div>
      </div>

      <Card>
        <div className="row-wrap no-print" style={{ marginBottom: 12 }}>
          {(['세션', '업무', '마일스톤', '여정'] as EventKind[]).map(k => (
            <button key={k} className="ws-subtab" aria-pressed={filters.includes(k)}
              onClick={() => setFilters(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]))}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: COLORS[k], marginRight: 6 }} />
              {k} {visible.filter(e => e.kind === k && e.date.startsWith(cursor)).length}
            </button>
          ))}
          <span className="spacer" />
          <span className="small muted">이번 달 {monthEvents.length}건</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          {['일', '월', '화', '수', '목', '금', '토'].map(d => (
            <div key={d} style={{ background: 'var(--surface-2)', padding: '6px 8px', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', textAlign: 'center' }}>{d}</div>
          ))}
          {cells.map((date, i) => {
            const dayEvents = date ? monthEvents.filter(e => e.date === date) : []
            const isToday = date === today()
            const inEvent = !!date && date >= conf.startDate && date <= conf.endDate
            return (
              <div key={i} style={{
                background: !date ? 'var(--surface-2)' : inEvent ? 'var(--info-bg)' : 'var(--surface)',
                minHeight: 104, padding: 6, display: 'flex', flexDirection: 'column', gap: 3,
                outline: isToday ? '2px solid var(--critical)' : undefined, outlineOffset: -2,
              }}>
                {date && (
                  <div className="row" style={{ gap: 4 }}>
                    <span className="xsmall num" style={{ fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--critical)' : 'var(--ink-3)' }}>
                      {Number(date.slice(8))}
                    </span>
                    {inEvent && <span className="xsmall" style={{ color: 'var(--seq-550)' }}>행사</span>}
                  </div>
                )}
                {dayEvents.slice(0, 4).map((e, j) => (
                  <button key={j} className="xsmall trunc" title={`${e.title}${e.sub ? ` · ${e.sub}` : ''}`}
                    onClick={() => e.link && e.id && go(e.link, e.id)}
                    style={{
                      textAlign: 'left', border: 0, borderRadius: 4, padding: '2px 5px', cursor: e.link ? 'pointer' : 'default',
                      background: 'color-mix(in srgb, var(--surface) 70%, transparent)',
                      borderLeft: `3px solid ${COLORS[e.kind]}`, color: 'var(--ink-2)', width: '100%',
                    }}>
                    {e.title}
                  </button>
                ))}
                {dayEvents.length > 4 && <span className="xsmall muted">+{dayEvents.length - 4}건</span>}
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="다가오는 일정" sub="오늘 이후 14일">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>일자</th><th>구분</th><th>내용</th><th>비고</th></tr></thead>
            <tbody>
              {visible.filter(e => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 18).map((e, i) => (
                <tr key={i} className={e.link ? 'clickable' : ''} onClick={() => e.link && e.id && go(e.link, e.id)}>
                  <td className="num nowrap">{fmtDate(e.date)}</td>
                  <td><Badge tone="neutral">{e.kind}</Badge></td>
                  <td>{e.title}</td>
                  <td className="small muted">{e.sub}</td>
                </tr>
              ))}
              {!visible.filter(e => e.date >= today()).length && <tr><td colSpan={4}><Empty>예정된 일정이 없습니다.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
