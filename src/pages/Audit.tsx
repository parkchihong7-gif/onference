import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { Badge, Card, StatTile } from '../components/ui'
import { fmtDateTime } from '../lib/format'
import { go } from '../lib/router'
import { downloadCsv } from '../lib/csv'

export function Audit() {
  const { state } = useApp()
  const [type, setType] = useState('전체')
  const [actor, setActor] = useState('전체')
  const [q, setQ] = useState('')

  const rows = useMemo(() => state.auditLogs.filter(l => {
    if (type !== '전체' && l.entityType !== type) return false
    if (actor !== '전체' && l.actor !== actor) return false
    if (q && !`${l.entityLabel} ${l.field ?? ''} ${l.before ?? ''} ${l.after ?? ''} ${l.memo ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [state.auditLogs, type, actor, q])

  const actors = [...new Set(state.auditLogs.map(l => l.actor))]
  const types = [...new Set(state.auditLogs.map(l => l.entityType))]

  const exportCsv = () => downloadCsv('변경이력.csv', [
    ['일시', '작업자', '동작', '대상 유형', '대상', '항목', '변경 전', '변경 후', '메모'],
    ...rows.map(l => [l.at, l.actor, l.action, l.entityType, l.entityLabel, l.field, l.before, l.after, l.memo]),
  ])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">변경 이력</h1>
          <p className="page-desc">
            연사·비자·여행·제출물·정산 데이터의 모든 변경이 작업자·시각과 함께 기록됩니다.
            운영사·여행사 등 다수 이해관계자가 동시에 작업할 때 “누가 언제 무엇을 바꿨는지”를 추적하기 위한 감사 로그입니다.
          </p>
        </div>
        <button className="btn no-print" onClick={exportCsv}>⬇ 이력 내보내기</button>
      </div>

      <div className="grid g4">
        <StatTile label="전체 변경" value={state.auditLogs.length} unit="건" />
        <StatTile label="오늘 변경" value={state.auditLogs.filter(l => l.at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length} unit="건" tone="info" />
        <StatTile label="작업자" value={actors.length} unit="명" />
        <StatTile label="단계 변경" value={state.auditLogs.filter(l => l.action === '단계변경').length} unit="건" foot="파이프라인·비자 단계" />
      </div>

      <Card title="이력 목록">
        <div className="row-wrap no-print" style={{ marginBottom: 12 }}>
          <input className="input search" placeholder="대상·항목·값 검색" value={q} onChange={e => setQ(e.target.value)} />
          <select className="select" value={type} onChange={e => setType(e.target.value)}>
            <option>전체</option>{types.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="select" value={actor} onChange={e => setActor(e.target.value)}>
            <option>전체</option>{actors.map(a => <option key={a}>{a}</option>)}
          </select>
          <span className="spacer" />
          <span className="small muted num">{rows.length}건</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>일시</th><th>작업자</th><th>동작</th><th>대상</th><th>항목</th><th>변경 전</th><th>변경 후</th><th>메모</th></tr></thead>
            <tbody>
              {rows.slice(0, 200).map(l => (
                <tr key={l.id} className={l.entityId.startsWith('SPK') ? 'clickable' : ''}
                  onClick={() => l.entityId.startsWith('SPK') && go('speakers', l.entityId)}>
                  <td className="num small nowrap">{fmtDateTime(l.at)}</td>
                  <td className="small nowrap">{l.actor}</td>
                  <td><Badge tone={l.action === '단계변경' ? 'info' : l.action === '승인' ? 'good' : 'neutral'}>{l.action}</Badge></td>
                  <td className="small"><span className="chip">{l.entityType}</span> {l.entityLabel}</td>
                  <td className="small">{l.field ?? '-'}</td>
                  <td className="small muted">{l.before ?? '-'}</td>
                  <td className="small"><strong>{l.after ?? '-'}</strong></td>
                  <td className="xsmall muted">{l.memo ?? ''}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="empty">조건에 맞는 이력이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
