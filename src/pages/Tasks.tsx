import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { activeConference, tasksOf } from '../lib/metrics'
import { Badge, Card, StatTile, StatusBadge } from '../components/ui'
import { ddayLabel, flag, fmtDate, today } from '../lib/format'
import { go } from '../lib/router'
import { PHASES } from '../types'
import type { PhaseKey, TaskStatus } from '../types'

const STATUSES: TaskStatus[] = ['대기', '진행중', '완료', '보류', '지연']

export function TasksPage() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const all = tasksOf(state)
  const [phase, setPhase] = useState<string>('전체')
  const [owner, setOwner] = useState('전체')
  const [status, setStatus] = useState('미완료')
  const [q, setQ] = useState('')
  const [title, setTitle] = useState('')
  const [newPhase, setNewPhase] = useState<PhaseKey>('초청·계약')
  const [due, setDue] = useState(conf.startDate)

  const rows = useMemo(() => all.filter(t => {
    if (phase !== '전체' && t.phase !== phase) return false
    if (owner !== '전체' && t.ownerMemberId !== owner) return false
    if (status === '미완료' && t.status === '완료') return false
    if (status !== '전체' && status !== '미완료' && t.status !== status) return false
    if (q) {
      const sp = state.speakers.find(s => s.id === t.speakerId)
      if (!`${t.title} ${sp?.nameEn ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false
    }
    return true
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [all, phase, owner, status, q, state.speakers])

  const add = () => {
    if (!title.trim()) return
    dispatch({
      type: 'ADD_TASK',
      task: {
        id: `T-${Math.random().toString(36).slice(2, 8)}`, conferenceId: conf.id, phase: newPhase,
        title: title.trim(), ownerMemberId: state.currentUserId, dueDate: due, status: '대기', priority: '중',
      },
    })
    setTitle('')
  }

  const overdue = all.filter(t => t.status !== '완료' && t.dueDate < today())

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">업무·체크리스트</h1>
          <p className="page-desc">
            체크리스트 템플릿으로 연사별 업무가 자동 생성되며, 행사일 기준 D-offset으로 기한이 계산됩니다.
            담당자·단계별로 필터링해 주간 운영 회의 자료로 사용할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="grid g4">
        <StatTile label="전체 업무" value={all.length} unit="건" foot={`연사별 ${all.filter(t => t.speakerId).length}건 · 공통 ${all.filter(t => !t.speakerId).length}건`} />
        <StatTile label="완료" value={all.filter(t => t.status === '완료').length} unit="건" tone="good"
          bar={(all.filter(t => t.status === '완료').length / Math.max(all.length, 1)) * 100} />
        <StatTile label="진행중" value={all.filter(t => t.status === '진행중').length} unit="건" tone="info" />
        <StatTile label="기한 경과" value={overdue.length} unit="건" tone="critical" foot="즉시 확인 필요" />
      </div>

      <Card title="단계별 진행" sub="템플릿 기준 8단계">
        <div className="grid g4">
          {PHASES.map(p => {
            const t = all.filter(x => x.phase === p)
            if (!t.length) return null
            const done = t.filter(x => x.status === '완료').length
            const late = t.filter(x => x.status !== '완료' && x.dueDate < today()).length
            return (
              <div key={p} className="row small" style={{ justifyContent: 'space-between', gap: 8, padding: '6px 0' }}>
                <span className="trunc">{p}</span>
                <span className="num nowrap">
                  {done}/{t.length} {late > 0 && <Badge tone="critical">지연 {late}</Badge>}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="업무 목록" right={<span className="small muted num">{rows.length}건</span>}>
        <div className="row-wrap no-print" style={{ marginBottom: 12 }}>
          <input className="input search" placeholder="업무명·연사 검색" value={q} onChange={e => setQ(e.target.value)} />
          <select className="select" value={phase} onChange={e => setPhase(e.target.value)}>
            <option>전체</option>{PHASES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className="select" value={owner} onChange={e => setOwner(e.target.value)}>
            <option value="전체">담당 전체</option>
            {state.members.map(m => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
          </select>
          <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
            <option>미완료</option><option>전체</option>{STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead><tr><th style={{ width: 34 }}></th><th>업무</th><th>단계</th><th>대상 연사</th><th>담당</th><th>기한</th><th>D-day</th><th>상태</th></tr></thead>
            <tbody>
              {rows.slice(0, 200).map(t => {
                const sp = state.speakers.find(s => s.id === t.speakerId)
                const late = t.status !== '완료' && t.dueDate < today()
                return (
                  <tr key={t.id}>
                    <td>
                      <input type="checkbox" checked={t.status === '완료'}
                        onChange={e => dispatch({ type: 'PATCH_TASK', id: t.id, patch: { status: e.target.checked ? '완료' : '대기', completedAt: e.target.checked ? today() : undefined } })} />
                    </td>
                    <td style={{ textDecoration: t.status === '완료' ? 'line-through' : undefined }}>{t.title}</td>
                    <td className="small muted nowrap">{t.phase}</td>
                    <td className="small nowrap clickable" onClick={() => sp && go('speakers', sp.id)}>
                      {sp ? `${flag(sp.country)} ${sp.nameEn}` : <span className="muted">공통</span>}
                    </td>
                    <td className="small nowrap">{state.members.find(m => m.id === t.ownerMemberId)?.name}</td>
                    <td className="num nowrap small">{fmtDate(t.dueDate)}</td>
                    <td className="num nowrap"><Badge tone={late ? 'critical' : t.status === '완료' ? 'neutral' : 'info'}>{ddayLabel(t.dueDate)}</Badge></td>
                    <td><StatusBadge status={late && t.status !== '완료' ? '지연' : t.status} /></td>
                  </tr>
                )
              })}
              {!rows.length && <tr><td colSpan={8} className="empty">조건에 맞는 업무가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
        {rows.length > 200 && <div className="small muted" style={{ marginTop: 8 }}>상위 200건만 표시됩니다. 필터를 사용하세요.</div>}
      </Card>

      <Card title="업무 추가" className="no-print">
        <div className="row-wrap">
          <input className="input" style={{ flex: 1, minWidth: 260 }} placeholder="업무명" value={title} onChange={e => setTitle(e.target.value)} />
          <select className="select" value={newPhase} onChange={e => setNewPhase(e.target.value as PhaseKey)}>
            {PHASES.map(p => <option key={p}>{p}</option>)}
          </select>
          <input className="input" type="date" value={due} onChange={e => setDue(e.target.value)} />
          <button className="btn btn-primary" onClick={add}>＋ 추가</button>
        </div>
      </Card>
    </>
  )
}
