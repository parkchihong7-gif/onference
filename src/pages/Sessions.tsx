import { useApp } from '../store'
import { activeConference, sessionsOf } from '../lib/metrics'
import { Badge, Card, StatTile } from '../components/ui'
import { flag, fmtDate } from '../lib/format'
import { go } from '../lib/router'

export function Sessions() {
  const { state } = useApp()
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
            트랙·세션 구성과 연사 배정 현황입니다. 세션에는 진행 방식(현장/온라인/하이브리드), 통역·녹화 여부가 함께
            관리되며 연사 배정은 제출물 기한과 연동됩니다.
          </p>
        </div>
      </div>

      <div className="grid g4">
        <StatTile label="세션" value={sessions.length} unit="개" foot={`${conf.tracks.length}개 트랙 · ${days.length}일`} />
        <StatTile label="연사 배정" value={assigned.size} unit="명" foot={`미배정 ${unassigned.length}명`} tone={unassigned.length ? 'warning' : 'good'} />
        <StatTile label="통역 세션" value={sessions.filter(s => s.interpretation).length} unit="개" foot="동시통역 부스 필요" />
        <StatTile label="녹화·중계" value={sessions.filter(s => s.recorded).length} unit="개" foot="녹화 동의서 필수" />
      </div>

      {days.map(day => (
        <Card key={day} title={`${fmtDate(day)} (${['일', '월', '화', '수', '목', '금', '토'][new Date(day).getDay()]})`}
          sub={`${sessions.filter(s => s.date === day).length}개 세션`}>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>시간</th><th>세션</th><th>트랙</th><th>유형</th><th>장소</th><th>방식</th><th>연사</th></tr></thead>
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
                            {flag(sp.country)} {sp.nameEn.replace(/^(Prof\.|Dr\.)\s/, '')}
                          </span>
                        ) : null
                      })}
                      {!s.speakerIds.length && <span className="muted small">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {unassigned.length > 0 && (
        <Card title="세션 미배정 연사" sub="프로그램북 조판 전 배정 필요">
          <div className="row-wrap">
            {unassigned.map(s => (
              <span key={s.id} className="chip" style={{ cursor: 'pointer' }} onClick={() => go('speakers', s.id)}>
                {flag(s.country)} {s.nameEn} · {s.tier}
              </span>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
