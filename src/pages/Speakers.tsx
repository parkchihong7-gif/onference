import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { activeConference, readiness, speakersOf } from '../lib/metrics'
import { Badge, Card, StatusBadge, TierTag, Modal } from '../components/ui'
import { flag, fmtDate, krwShort, toneOf } from '../lib/format'
import { displayName, labelsOf } from '../lib/scope'
import { go } from '../lib/router'
import { downloadCsv } from '../lib/csv'
import { SpeakerDialog } from '../components/Create'
import type { Speaker } from '../types'

const STAGES = ['전체', '후보발굴', '내부승인', '사전타진', '공식초청', '수락', '계약완료', '거절'] as const

export function Speakers() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const labels = labelsOf(conf)
  const all = speakersOf(state)
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<string>('전체')
  const [tier, setTier] = useState('전체')
  const [liaison, setLiaison] = useState('전체')
  const [visaOnly, setVisaOnly] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Speaker | undefined>()
  const [removing, setRemoving] = useState<Speaker | undefined>()

  const rows = useMemo(() => all.filter(s => {
    if (stage !== '전체' && s.stage !== stage) return false
    if (tier !== '전체' && s.tier !== tier) return false
    if (liaison !== '전체' && s.liaisonMemberId !== liaison) return false
    if (visaOnly && !s.visa.required) return false
    if (q) {
      const hay = `${displayName(s)} ${s.affiliation} ${s.country} ${s.code} ${s.researchFields.join(' ')} ${s.tags.join(' ')}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  }), [all, q, stage, tier, liaison, visaOnly])

  const exportCsv = () => {
    const header = ['코드', '성명(EN)', '직위', '소속', '국가', '등급', '단계', '참가형태', '담당리에종', '비자여부', '비자단계', '항공발권', '숙박', '제출물검수', '준비도(%)', '강연료(원)', '원천징수율(%)', '이메일']
    const body = rows.map(s => {
      const r = readiness(s)
      return [
        s.code, s.nameEn, s.title, s.affiliation, s.country, s.tier, s.stage, s.attendance, s.sponsorship, s.attendanceMode,
        state.members.find(m => m.id === s.liaisonMemberId)?.name, s.visa.required ? 'Y' : 'N', s.visa.stage,
        s.flights.some(f => f.eTicketReceived) ? '발권완료' : s.flights.length ? '스케줄확정' : '미확정',
        s.hotel?.confirmationNo ? '확정' : s.hotel ? '가예약' : '-',
        `${s.deliverables.filter(d => d.status === '검수완료').length}/${s.deliverables.length}`,
        r.score, s.settlement.honorarium, s.settlement.withholdingRate, s.email,
      ]
    })
    downloadCsv(`${conf.code}_${labels.speaker}목록_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body])
  }

  return (
    <>
      <SpeakerDialog open={adding} onClose={() => setAdding(false)} />
      <SpeakerDialog edit={editing} open={!!editing} onClose={() => setEditing(undefined)} />
      <ConfirmDelete
        target={removing}
        onCancel={() => setRemoving(undefined)}
        onConfirm={() => { if (removing) dispatch({ type: 'DELETE_SPEAKER', id: removing.id }); setRemoving(undefined) }}
        taskCount={removing ? state.tasks.filter(t => t.speakerId === removing.id).length : 0}
        label={labels.speaker} />
      <div className="page-head">
        <div>
          <h1 className="page-title">{labels.speaker}·초청자 관리</h1>
          <p className="page-desc">
            초청자 마스터. 한 사람의 초청·계약·출입국·여행·제출물·정산 데이터를 단일 레코드로 관리하며,
            모든 변경은 이력에 자동 기록됩니다. 목록은 Excel 호환(CSV/UTF-8 BOM)으로 내보낼 수 있습니다.
          </p>
        </div>
        <div className="row-wrap no-print">
          <button className="btn" onClick={exportCsv}>⬇ Excel 내보내기</button>
          <button className="btn" onClick={() => go('pipeline')}>파이프라인 보기</button>
          <button className="btn btn-primary" onClick={() => setAdding(true)}>＋ {labels.speaker} 추가</button>
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
                <th>{labels.speaker}</th><th>등급</th><th>단계</th><th>참석</th><th>지원</th><th>담당</th>
                <th>입국/비자</th><th>항공·숙박</th><th>제출물</th><th>준비도</th><th className="right">{labels.honorarium}</th>
                <th>최근 수정</th><th className="no-print">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(s => (
                <Row key={s.id} s={s}
                  liaisonName={state.members.find(m => m.id === s.liaisonMemberId)?.name ?? '-'}
                  onEdit={() => setEditing(s)}
                  onDelete={() => setRemoving(s)} />
              ))}
              {!rows.length && <tr><td colSpan={12} className="empty">조건에 맞는 {labels.speaker}가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

function Row({ s, liaisonName, onEdit, onDelete }: {
  s: Speaker; liaisonName: string; onEdit: () => void; onDelete: () => void
}) {
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
            <div style={{ fontWeight: 620 }}>{displayName(s)}</div>
            <div className="xsmall muted trunc" style={{ maxWidth: 230 }}>{s.title} · {s.affiliation}</div>
          </div>
        </div>
      </td>
      <td><TierTag tier={s.tier} /></td>
      <td><StatusBadge status={s.stage} /></td>
      <td><Badge tone={s.attendance === '참석확정' ? 'good' : s.attendance === '참석미정' ? 'warning' : 'neutral'}>{s.attendance}</Badge></td>
      <td className="small nowrap">{s.sponsorship === 'Sponsored' ? <span className="chip">전액</span> : s.sponsorship === '부분지원' ? <span className="chip">부분</span> : <span className="chip">자비</span>}</td>
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
      <td className="no-print nowrap">
        {/* 행 클릭(상세 이동)과 겹치지 않도록 버블링을 막는다 */}
        <div className="row" style={{ gap: 4 }} onClick={e => e.stopPropagation()}>
          <button className="btn btn-sm" title="정보 수정" onClick={onEdit}>✎</button>
          <button className="btn btn-sm" title="삭제" onClick={onDelete}>🗑</button>
        </div>
      </td>
    </tr>
  )
}


/** 삭제는 되돌릴 수 없으므로 무엇이 함께 지워지는지 먼저 알린다 */
function ConfirmDelete({ target, onCancel, onConfirm, taskCount, label }: {
  target?: Speaker; onCancel: () => void; onConfirm: () => void; taskCount: number; label: string
}) {
  return (
    <Modal open={!!target} onClose={onCancel}
      title={`${label} 삭제`}
      sub={target ? displayName(target) : ''}
      footer={
        <>
          <button className="btn" onClick={onCancel}>취소</button>
          <button className="btn btn-danger" onClick={onConfirm}>삭제</button>
        </>
      }>
      <p className="small" style={{ lineHeight: 1.8 }}>
        <strong>{target ? displayName(target) : ''}</strong> ({target?.affiliation}) 을(를) 삭제합니다.
        {taskCount > 0 && <><br />연결된 업무 <strong>{taskCount}건</strong>도 함께 삭제됩니다.</>}
        <br />이 작업은 되돌릴 수 없으며, 모든 담당자 화면에 즉시 반영됩니다.
      </p>
    </Modal>
  )
}
