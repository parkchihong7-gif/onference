import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { activeConference, readiness, speakersOf } from '../lib/metrics'
import { Badge, Card, StatusBadge, TierTag } from '../components/ui'
import { flag, fmtDate, krwShort, toneOf } from '../lib/format'
import { go } from '../lib/router'
import { downloadCsv } from '../lib/csv'
import type { Speaker } from '../types'

const STAGES = ['전체', '후보발굴', '내부승인', '사전타진', '공식초청', '수락', '계약완료', '거절'] as const

export function Speakers() {
  const { state } = useApp()
  const conf = activeConference(state)
  const all = speakersOf(state)
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<string>('전체')
  const [tier, setTier] = useState('전체')
  const [liaison, setLiaison] = useState('전체')
  const [visaOnly, setVisaOnly] = useState(false)

  const rows = useMemo(() => all.filter(s => {
    if (stage !== '전체' && s.stage !== stage) return false
    if (tier !== '전체' && s.tier !== tier) return false
    if (liaison !== '전체' && s.liaisonMemberId !== liaison) return false
    if (visaOnly && !s.visa.required) return false
    if (q) {
      const hay = `${s.nameEn} ${s.affiliation} ${s.country} ${s.code} ${s.researchFields.join(' ')} ${s.tags.join(' ')}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  }), [all, q, stage, tier, liaison, visaOnly])

  const exportCsv = () => {
    const header = ['코드', '성명(EN)', '직위', '소속', '국가', '등급', '단계', '참가형태', '담당리에종', '비자여부', '비자단계', '항공발권', '숙박', '제출물검수', '준비도(%)', '강연료(원)', '원천징수율(%)', '이메일']
    const body = rows.map(s => {
      const r = readiness(s)
      return [
        s.code, s.nameEn, s.title, s.affiliation, s.country, s.tier, s.stage, s.attendanceMode,
        state.members.find(m => m.id === s.liaisonMemberId)?.name, s.visa.required ? 'Y' : 'N', s.visa.stage,
        s.flights.some(f => f.eTicketReceived) ? '발권완료' : s.flights.length ? '스케줄확정' : '미확정',
        s.hotel?.confirmationNo ? '확정' : s.hotel ? '가예약' : '-',
        `${s.deliverables.filter(d => d.status === '검수완료').length}/${s.deliverables.length}`,
        r.score, s.settlement.honorarium, s.settlement.withholdingRate, s.email,
      ]
    })
    downloadCsv(`${conf.code}_연사목록_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body])
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">연사·초청자 관리</h1>
          <p className="page-desc">
            초청자 마스터. 한 사람의 초청·계약·출입국·여행·제출물·정산 데이터를 단일 레코드로 관리하며,
            모든 변경은 이력에 자동 기록됩니다. 목록은 Excel 호환(CSV/UTF-8 BOM)으로 내보낼 수 있습니다.
          </p>
        </div>
        <div className="row-wrap no-print">
          <button className="btn" onClick={exportCsv}>⬇ Excel 내보내기</button>
          <button className="btn btn-primary" onClick={() => go('pipeline')}>＋ 후보 등록(파이프라인)</button>
        </div>
      </div>

      <Card>
        <div className="row-wrap no-print" style={{ marginBottom: 12 }}>
          <input className="input search" placeholder="성명·소속·국가·전문분야 검색" value={q} onChange={e => setQ(e.target.value)} />
          <select className="select" value={stage} onChange={e => setStage(e.target.value)}>
            {STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="select" value={tier} onChange={e => setTier(e.target.value)}>
            {['전체', 'Keynote', 'Invited', 'Panel', 'Moderator', 'Workshop'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="select" value={liaison} onChange={e => setLiaison(e.target.value)}>
            <option value="전체">담당 전체</option>
            {state.members.filter(m => ['리에종', 'PCO', '사무국'].includes(m.role)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <label className="chip" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={visaOnly} onChange={e => setVisaOnly(e.target.checked)} /> 비자 대상만
          </label>
          <span className="spacer" />
          <span className="small muted num">{rows.length} / {all.length}명</span>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>연사</th><th>등급</th><th>단계</th><th>세션</th><th>담당</th>
                <th>입국/비자</th><th>항공·숙박</th><th>제출물</th><th>준비도</th><th className="right">강연료</th><th>수정</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(s => <Row key={s.id} s={s} liaisonName={state.members.find(m => m.id === s.liaisonMemberId)?.name ?? '-'} />)}
              {!rows.length && <tr><td colSpan={11} className="empty">조건에 맞는 연사가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

function Row({ s, liaisonName }: { s: Speaker; liaisonName: string }) {
  const r = readiness(s)
  const docs = s.deliverables.filter(d => d.status === '검수완료').length
  const confirmed = ['수락', '계약완료'].includes(s.stage)
  const flight = s.attendanceMode === '온라인' ? '온라인'
    : !confirmed ? '해당없음'
      : s.flights.some(f => f.eTicketReceived) ? '발권완료' : s.flights.length ? '스케줄확정' : '미확정'
  return (
    <tr className="clickable" onClick={() => go('speakers', s.id)}>
      <td>
        <div className="row" style={{ gap: 9 }}>
          <span style={{ fontSize: 17 }} aria-hidden>{flag(s.country)}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 620 }}>{s.nameEn}</div>
            <div className="xsmall muted trunc" style={{ maxWidth: 230 }}>{s.title} · {s.affiliation}</div>
          </div>
        </div>
      </td>
      <td><TierTag tier={s.tier} /></td>
      <td><StatusBadge status={s.stage} /></td>
      <td className="xsmall muted">{s.sessionIds.join(', ') || '-'}</td>
      <td className="small nowrap">{liaisonName}</td>
      <td className="small nowrap">
        {s.attendanceMode === '온라인' ? <Badge tone="neutral">온라인</Badge>
          : s.visa.required ? <Badge tone={toneOf(s.visa.stage)}>{s.visa.stage}</Badge>
            : <Badge tone="good">{s.visa.track}</Badge>}
      </td>
      <td className="small nowrap">
        <Badge tone={flight === '발권완료' ? 'good' : flight === '미확정' ? 'critical' : flight === '스케줄확정' ? 'info' : 'neutral'}>{flight}</Badge>
        {s.hotel && <span className="xsmall muted"> · {s.hotel.nights}박</span>}
      </td>
      <td className="small num nowrap">{docs}/{s.deliverables.length}</td>
      <td style={{ minWidth: 92 }}>
        <div className="row small num" style={{ gap: 6 }}>
          <div className="bar" style={{ width: 52 }}>
            <span style={{ width: `${r.score}%`, background: r.score < 50 ? 'var(--critical)' : r.score < 80 ? 'var(--warning)' : 'var(--good)' }} />
          </div>
          {r.score}%
        </div>
      </td>
      <td className="right num nowrap">{krwShort(s.settlement.honorarium)}</td>
      <td className="xsmall muted nowrap">{fmtDate(s.updatedAt)}</td>
    </tr>
  )
}
