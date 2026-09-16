import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { initials, pct, toneOf } from '../lib/format'
import type { Tone } from '../lib/format'

/* ───────────────────────────── 기본 컴포넌트 ───────────────────────────── */

export function Card({ title, sub, right, children, className = '' }: {
  title?: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function StatTile({ label, value, unit, foot, tone, bar }: {
  label: string; value: ReactNode; unit?: string; foot?: ReactNode; tone?: Tone; bar?: number
}) {
  return (
    <div className="card stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}{unit && <span className="stat-unit">{unit}</span>}
      </div>
      {bar !== undefined && (
        <div className="bar" aria-hidden>
          <span style={{ width: `${Math.min(100, bar)}%`, background: barColor(tone) }} />
        </div>
      )}
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  )
}

const barColor = (tone?: Tone) =>
  tone === 'critical' ? 'var(--critical)' : tone === 'serious' ? 'var(--serious)'
    : tone === 'warning' ? 'var(--warning)' : tone === 'good' ? 'var(--good)' : 'var(--seq-400)'

export function Badge({ children, tone, icon }: { children: ReactNode; tone?: Tone; icon?: string }) {
  const t = tone ?? (typeof children === 'string' ? toneOf(children) : 'neutral')
  return (
    <span className={`badge t-${t}`}>
      {icon && <span aria-hidden>{icon}</span>}{children}
    </span>
  )
}

export const StatusBadge = ({ status }: { status: string }) => <Badge tone={toneOf(status)}>{status}</Badge>

export const TierTag = ({ tier }: { tier: string }) => <span className={`tier tier-${tier}`}>{tier}</span>

export function Progress({ value, total, tone, label }: { value: number; total: number; tone?: Tone; label?: string }) {
  const p = pct(value, total)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90 }}>
      <div className="row small num" style={{ justifyContent: 'space-between' }}>
        <span className="muted">{label}</span>
        <span>{value}/{total} · {p}%</span>
      </div>
      <div className="bar"><span style={{ width: `${p}%`, background: barColor(tone) }} /></div>
    </div>
  )
}

export function Avatar({ name, size }: { name: string; size?: 'lg' }) {
  return <div className={`avatar ${size === 'lg' ? 'avatar-lg' : ''}`} title={name}>{initials(name)}</div>
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => (
        <button key={t} role="tab" aria-selected={t === active} className="tab" onClick={() => onChange(t)}>{t}</button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o} aria-pressed={o === value} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  )
}

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">{children}</aside>
    </>
  )
}

export const Empty = ({ children = '데이터가 없습니다.' }: { children?: ReactNode }) => <div className="empty">{children}</div>

export function DL({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="dl">
      {items.map(([k, v], i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{k}</dt><dd>{v ?? '-'}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ───────────────────────────── 차트 (직접 렌더링) ─────────────────────────────
   원칙: 축 1개, 시리즈 고정 색, 값은 항상 직접 라벨(색만으로 의미 전달 금지).
   ──────────────────────────────────────────────────────────────────────────── */

export function Donut({ data, size = 132, centerLabel, centerValue }: {
  data: { label: string; value: number; color: string }[]
  size?: number; centerLabel?: string; centerValue?: string
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  const r = size / 2 - 12
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="비율 도넛 차트">
        <g transform={`translate(${size / 2} ${size / 2}) rotate(-90)`}>
          <circle r={r} fill="none" stroke="var(--surface-3)" strokeWidth={13} />
          {data.filter(d => d.value > 0).map(d => {
            const len = (d.value / total) * c
            const el = (
              <circle key={d.label} r={r} fill="none" stroke={d.color} strokeWidth={13}
                strokeDasharray={`${Math.max(len - 2, 0)} ${c - Math.max(len - 2, 0)}`}
                strokeDashoffset={-offset} strokeLinecap="butt">
                <title>{`${d.label}: ${d.value}건 (${Math.round((d.value / total) * 100)}%)`}</title>
              </circle>
            )
            offset += len
            return el
          })}
        </g>
        <text x="50%" y="46%" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--ink)">{centerValue ?? total}</text>
        <text x="50%" y="62%" textAnchor="middle" fontSize="10.5" fill="var(--ink-3)">{centerLabel ?? '건'}</text>
      </svg>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
        {data.map(d => (
          <li key={d.label} className="row small" style={{ justifyContent: 'space-between' }}>
            <span className="row" style={{ gap: 6 }}>
              <i style={{ width: 9, height: 9, borderRadius: 2, background: d.color, display: 'inline-block' }} aria-hidden />
              <span className="sec">{d.label}</span>
            </span>
            <span className="num">{d.value}건 · {Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HBars({ data, unit = '명', color = 'var(--seq-400)' }: {
  data: { label: string; value: number; note?: string; color?: string }[]; unit?: string; color?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '112px 1fr 64px', gap: 10, alignItems: 'center' }}>
          <span className="small trunc sec" title={d.label}>{d.label}</span>
          <div className="bar bar-lg" title={`${d.label}: ${d.value}${unit}`}>
            <span style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? color }} />
          </div>
          <span className="small num right">{d.value}{unit}{d.note ? ` · ${d.note}` : ''}</span>
        </div>
      ))}
    </div>
  )
}

/** 파이프라인 퍼널 — 순서형 단일 색상 램프(연→진) */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(...steps.map(s => s.value), 1)
  const ramp = ['var(--seq-250)', 'var(--seq-400)', 'var(--seq-400)', 'var(--seq-450)', 'var(--seq-550)', 'var(--seq-700)']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map((s, i) => {
        const w = (s.value / max) * 100
        const drop = i > 0 ? steps[i - 1].value - s.value : 0
        return (
          <div key={s.label} style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 10, alignItems: 'center' }}>
            <span className="small sec nowrap">{s.label}</span>
            <div className="row" style={{ gap: 8 }}>
              <div style={{
                width: `${Math.max(w, 6)}%`, height: 26, borderRadius: 5,
                background: ramp[Math.min(i, ramp.length - 1)], color: '#fff',
                display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 12, fontWeight: 650,
              }} title={`${s.label}: ${s.value}명`}>
                {s.value}
              </div>
              {drop > 0 && <span className="xsmall muted nowrap">−{drop}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** 마일스톤/여정 간트 — 기간 막대 + 오늘 기준선 */
export function Gantt({ rows, start, end, todayISO }: {
  rows: { label: string; from: string; to: string; color: string; note?: string }[]
  start: string; end: string; todayISO: string
}) {
  const t0 = new Date(start).getTime()
  const t1 = new Date(end).getTime()
  const span = Math.max(t1 - t0, 1)
  const posOf = (iso: string) => ((new Date(iso).getTime() - t0) / span) * 100
  return (
    <div>
      {rows.map(r => {
        const left = Math.max(0, posOf(r.from))
        const right = Math.min(100, posOf(r.to))
        return (
          <div className="gantt-row" key={r.label + r.from}>
            <span className="small trunc sec" title={r.label}>{r.label}</span>
            <div className="gantt-track">
              <div className="gantt-bar" style={{ left: `${left}%`, width: `${Math.max(right - left, 1.5)}%`, background: r.color }}
                title={`${r.label}: ${r.from} ~ ${r.to}`}>
                {r.note}
              </div>
              <div className="gantt-today" style={{ left: `${posOf(todayISO)}%` }} title={`오늘 ${todayISO}`} />
            </div>
          </div>
        )
      })}
      <div className="row xsmall muted" style={{ justifyContent: 'space-between', marginTop: 6 }}>
        <span>{start}</span><span>오늘 {todayISO}</span><span>{end}</span>
      </div>
    </div>
  )
}

/** 누적 막대(상태 구성) — 세그먼트 사이 2px 여백, 값은 범례에 직접 표기 */
export function StackBar({ segments, height = 10, valueFormat }: {
  segments: { label: string; value: number; color: string }[]; height?: number; valueFormat?: (n: number) => string
}) {
  const fmt = valueFormat ?? ((n: number) => String(n))
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  return (
    <div>
      <div style={{ display: 'flex', gap: 2, height, borderRadius: height / 2, overflow: 'hidden', background: 'var(--surface-3)' }}>
        {segments.filter(s => s.value > 0).map(s => (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${fmt(s.value)} (${Math.round((s.value / total) * 100)}%)`} />
        ))}
      </div>
      <div className="legend" style={{ marginTop: 8 }}>
        {segments.map(s => (
          <span key={s.label}><i style={{ background: s.color }} />{s.label} {fmt(s.value)}</span>
        ))}
      </div>
    </div>
  )
}
