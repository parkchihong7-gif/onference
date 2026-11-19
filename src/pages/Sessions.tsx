import type { Session } from '../types'
import { useApp } from '../store'
import { activeConference, sessionsOf } from '../lib/metrics'
import { Badge, Card, StatTile, Modal } from '../components/ui'
import { flag, fmtDate } from '../lib/format'
import { displayName, labelsOf } from '../lib/scope'
import { go } from '../lib/router'
import { useState } from 'react'
import { SessionDialog } from '../components/Create'

export function Sessions() {
  const { state, dispatch } = useApp()
  const labels = labelsOf(activeConference(state))
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Session | undefined>()
  const [removing, setRemoving] = useState<Session | undefined>()
  const conf = activeConference(state)
  const sessions = sessionsOf(state)
  const days = [...new Set(sessions.map(s => s.date))].sort()
  const assigned = new Set(sessions.flatMap(s => s.speakerIds))
  const unassigned = state.speakers.filter(s => s.conferenceId === conf.id && ['수락', '계약완료'].includes(s.stage) && !assigned.has(s.id))

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">세션·프로그램</h1>
          <p className="page-desc">
            트랙·세션 구성과 {labels.speaker} 배정 현황입니다. 세션에는 진행 방식(현장/온라인/하이브리드), 통역·녹화 여부가 함께
            관리되며 {labels.speaker} 배정은 제출물 기한과 연동됩니다.
          </p>
        </div>
        <div className="row-wrap no-print">
          <button className="btn btn-primary" onClick={() => setAdding(true)}>＋ 세션 추가</button>
        </div>
      </div>

      <SessionDialog open={adding} onClose={() => setAdding(false)} />
      <SessionDialog edit={editing} open={!!editing} onClose={() => setEditing(undefined)} />
      <Modal open={!!removing} onClose={() => setRemoving(undefined)}
        title="세션 삭제" sub={removing?.title}
        footer={
          <>
            <button className="btn" onClick={() => setRemoving(undefined)}>취소</button>
            <button className="btn btn-danger" onClick={() => {
              if (removing) dispatch({ type: 'DELETE_SESSION', id: removing.id })
              setRemoving(undefined)
            }}>삭제</button>
          </>
        }>
        <p className="small" style={{ lineHeight: 1.8 }}>
          <strong>{removing?.title}</strong> 세션을 삭제합니다.
          {!!removing?.speakerIds.length && <><br />배정된 {labels.speaker} {removing.speakerIds.length}명의 배정이 함께 해제됩니다({labels.speaker} 자체는 남습니다).</>}
          <br />되돌릴 수 없으며, 모든 담당자 화면에 즉시 반영됩니다.
        </p>
      </Modal>

      <div className="grid g4">
        <StatTile label="세션" value={sessions.length} unit="개" foot={`${conf.tracks.length}개 트랙 · ${days.length}일`} />
        <StatTile label={`${labels.speaker} 배정`} value={assigned.size} unit="명" foot={`미배정 ${unassigned.length}명`} tone={unassigned.length ? 'warning' : 'good'} />
        <StatTile label="통역 세션" value={sessions.filter(s => s.interpretation).length} unit="개" foot="동시통역 부스 필요" />
        <StatTile label="녹화·중계" value={sessions.filter(s => s.recorded).length} unit="개" foot="녹화 동의서 필수" />
      </div>

      {days.map(day => (
        <Card key={day} title={`${fmtDate(day)} (${['일', '월', '화', '수', '목', '금', '토'][new Date(day).getDay()]})`}
          sub={`${sessions.filter(s => s.date === day).length}개 세션`}>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>시간</th><th>세션</th><th>트랙</th><th>유형</th><th>장소</th><th>방식</th><th>{labels.speaker}</th><th className="no-print">관리</th></tr></thead>
              <tbody>
                {sessions.filter(s => s.date === day).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(s => (
                  <tr key={s.id}>
                    <td className="num nowrap"><strong>{s.startTime}</strong>–{s.endTime}</td>
                    <td>{s.title}<div className="xsmall muted">{s.language}{s.interpretation ? ' · 동시통역' : ''}{s.recorded ? ' · 녹화' : ''}{s.capacity ? ` · ${s.capacity}석` : ''}</div></td>
                    <td className="small">{s.track}</td>
                    <td><Badge tone="info">{s.type}</Badge></td>
                    <td className="small">{s.room}</td>
                    <td className="small">{s.mode}</td>
                    <td>
                      {s.speakerIds.map(id => {
                        const sp = state.speakers.find(x => x.id === id)
                        return sp ? (
                          <span key={id} className="chip" style={{ marginRight: 4, cursor: 'pointer' }} onClick={() => go('speakers', id)}>
                            {flag(sp.country)} {displayName(sp).replace(/^(Prof\.|Dr\.)\s/, '')}
                          </span>
                        ) : null
                      })}
                      {!s.speakerIds.length && <span className="muted small">-</span>}
                    </td>
                    <td className="no-print nowrap">
                      <div className="row" style={{ gap: 4 }}>
                        <button className="btn btn-sm" title="세션 수정" onClick={() => setEditing(s)}>✎</button>
                        <button className="btn btn-sm" title="세션 삭제" onClick={() => setRemoving(s)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {unassigned.length > 0 && (
        <Card title={`세션 미배정 ${labels.speaker}`} sub="프로그램북 조판 전 배정 필요">
          <div className="row-wrap">
            {unassigned.map(s => (
              <span key={s.id} className="chip" style={{ cursor: 'pointer' }} onClick={() => go('speakers', s.id)}>
                {flag(s.country)} {displayName(s)} · {s.tier}
              </span>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
