import { useState } from 'react'
import { useApp } from '../store'
import { activeConference, sessionsOf, speakersOf } from '../lib/metrics'
import { Badge, Card, StatTile } from '../components/ui'
import { flag, fmtDate, fmtDateTime } from '../lib/format'
import { go } from '../lib/router'
import type { Speaker } from '../types'

type Step = keyof Pick<Speaker['onsite'], 'arrivedAirportAt' | 'hotelCheckedInAt' | 'venueCheckInAt' | 'presentedAt' | 'departedAt'>
const STEPS: { key: Step; label: string }[] = [
  { key: 'arrivedAirportAt', label: '공항 도착' },
  { key: 'hotelCheckedInAt', label: '호텔 체크인' },
  { key: 'venueCheckInAt', label: '현장 체크인' },
  { key: 'presentedAt', label: '발표 완료' },
  { key: 'departedAt', label: '출국' },
]

export function Onsite() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const sessions = sessionsOf(state)
  const list = speakersOf(state).filter(s => ['수락', '계약완료'].includes(s.stage))
  const days = [...new Set(sessions.map(s => s.date))].sort()
  const [day, setDay] = useState(days[0])

  const toggle = (sp: Speaker, key: Step) => {
    const cur = sp.onsite[key]
    dispatch({
      type: 'PATCH_SPEAKER', id: sp.id,
      patch: { onsite: { ...sp.onsite, [key]: cur ? undefined : new Date().toISOString().slice(0, 16) } },
      audit: { field: `현장 상태 · ${STEPS.find(s => s.key === key)?.label}`, before: cur ? '완료' : '대기', after: cur ? '대기' : '완료' },
    })
  }

  const onsiteList = list.filter(s => s.attendanceMode !== '온라인')
  const doneCount = (k: Step) => onsiteList.filter(s => s.onsite[k]).length

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">현장 운영</h1>
          <p className="page-desc">
            일자별 런시트와 연사 현장 상태(공항 도착 → 호텔 → 현장 체크인 → 발표 → 출국)를 실시간으로 공유합니다.
            배지·기념품 전달, 테크 리허설, 비상 연락망을 함께 관리합니다.
          </p>
        </div>
        <button className="btn no-print" onClick={() => window.print()}>🖨 런시트 인쇄</button>
      </div>

      <div className="grid g5">
        {STEPS.map(s => (
          <StatTile key={s.key} label={s.label} value={`${doneCount(s.key)}/${onsiteList.length}`}
            bar={(doneCount(s.key) / Math.max(onsiteList.length, 1)) * 100} tone="info" />
        ))}
      </div>

      <Card title="연사 현장 상태 보드" sub="칩을 클릭하면 해당 시각이 기록됩니다(변경 이력 자동 저장)">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>연사</th><th>등급</th><th>세션</th><th>숙소</th>{STEPS.map(s => <th key={s.key}>{s.label}</th>)}<th>배지</th></tr>
            </thead>
            <tbody>
              {onsiteList.map(s => (
                <tr key={s.id}>
                  <td className="clickable" onClick={() => go('speakers', s.id)}>{flag(s.country)} <strong>{s.nameEn}</strong>
                    <div className="xsmall muted">{state.members.find(m => m.id === s.liaisonMemberId)?.name} 담당</div>
                  </td>
                  <td className="small">{s.tier}</td>
                  <td className="xsmall muted">{s.sessionIds.join(', ') || '-'}</td>
                  <td className="xsmall muted">{s.hotel ? `${s.hotel.hotel} · ${fmtDate(s.hotel.checkIn).slice(5)} 입실` : '-'}</td>
                  {STEPS.map(st => (
                    <td key={st.key}>
                      <button className={`badge ${s.onsite[st.key] ? 't-good' : 't-neutral'}`} style={{ cursor: 'pointer' }}
                        onClick={() => toggle(s, st.key)}>
                        {s.onsite[st.key] ? fmtDateTime(s.onsite[st.key]).slice(6, 16) : '대기'}
                      </button>
                    </td>
                  ))}
                  <td>
                    <button className={`badge ${s.onsite.badgeIssued ? 't-good' : 't-warning'}`} style={{ cursor: 'pointer' }}
                      onClick={() => dispatch({ type: 'PATCH_SPEAKER', id: s.id, patch: { onsite: { ...s.onsite, badgeIssued: !s.onsite.badgeIssued } }, audit: { field: '배지 발급', before: String(s.onsite.badgeIssued), after: String(!s.onsite.badgeIssued) } })}>
                      {s.onsite.badgeIssued ? '발급' : '미발급'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="일자별 런시트" sub={`${fmtDate(conf.startDate)} ~ ${fmtDate(conf.endDate)}`}
        right={
          <div className="seg no-print">
            {days.map(d => <button key={d} aria-pressed={d === day} onClick={() => setDay(d)}>{fmtDate(d).slice(5)}</button>)}
          </div>}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>시간</th><th>세션</th><th>유형</th><th>장소</th><th>진행</th><th>연사</th><th>통역/녹화</th></tr></thead>
            <tbody>
              {sessions.filter(s => s.date === day).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(s => (
                <tr key={s.id}>
                  <td className="num nowrap"><strong>{s.startTime}</strong>–{s.endTime}</td>
                  <td>{s.title}</td>
                  <td><Badge tone="info">{s.type}</Badge></td>
                  <td className="small">{s.room}</td>
                  <td className="small">{state.members.find(m => m.id === s.chairMemberId)?.name ?? '-'}</td>
                  <td className="small">
                    {s.speakerIds.map(id => {
                      const sp = state.speakers.find(x => x.id === id)
                      if (!sp) return null
                      return (
                        <span key={id} className="chip" style={{ marginRight: 4, cursor: 'pointer' }} onClick={() => go('speakers', id)}>
                          {flag(sp.country)} {sp.nameEn.replace(/^(Prof\.|Dr\.)\s/, '')}
                          {sp.attendanceMode === '온라인' ? ' (온라인)' : ''}
                        </span>
                      )
                    })}
                    {!s.speakerIds.length && <span className="muted">-</span>}
                  </td>
                  <td className="xsmall muted">{s.interpretation ? '동시통역 ' : ''}{s.recorded ? '녹화' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid g2">
        <Card title="비상 연락망" sub="24시간 대응">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>역할</th><th>이름</th><th>소속</th><th>연락처</th><th>담당 연사</th></tr></thead>
              <tbody>
                {state.members.filter(m => ['리에종', 'PCO', '사무국'].includes(m.role)).map(m => (
                  <tr key={m.id}>
                    <td><Badge tone="neutral">{m.role}</Badge></td>
                    <td>{m.name}</td><td className="small">{m.org}</td>
                    <td className="num small">{m.phone}</td>
                    <td className="xsmall muted">{list.filter(s => s.liaisonMemberId === m.id).length}명</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="온라인 연사 운영" sub="시차·리허설·백업 녹화">
          {list.filter(s => s.attendanceMode === '온라인').map(s => (
            <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="row" style={{ gap: 8 }}>
                <strong className="small">{flag(s.country)} {s.nameEn}</strong>
                <Badge tone="info">{s.timezone}</Badge>
              </div>
              <div className="xsmall muted">{s.memo}</div>
            </div>
          ))}
          <div className="alert alert-info" style={{ marginTop: 12 }}>
            <span aria-hidden>ℹ</span>
            <span>온라인 발표는 현지 시각 기준 발표 시간, 회선 점검, 사전 녹화본 백업을 리허설 시 함께 확인합니다.</span>
          </div>
        </Card>
      </div>
    </>
  )
}
