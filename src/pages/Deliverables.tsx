import { useState } from 'react'
import { useApp } from '../store'
import { activeConference, speakersOf } from '../lib/metrics'
import { Badge, Card, StatTile, StackBar } from '../components/ui'
import { ddayLabel, flag, fmtDate, pct, today } from '../lib/format'
import { go } from '../lib/router'
import { downloadCsv } from '../lib/csv'
import type { DeliverableStatus } from '../types'

/** 매트릭스 헤더용 축약 라벨 */
const SHORT: Record<string, string> = {
  '강연동의서(Speaker Agreement)': '강연동의서',
  '개인정보 처리 동의(GDPR)': 'GDPR 동의',
  '해외송금 정보(W-8/은행)': '송금정보',
  '거주자증명서(CoR)': '거주자증명서',
  '발표초록(Abstract)': '발표초록',
  '발표자료(PPT)': '발표자료',
  '약력(Bio)': '약력',
  '녹화·중계 동의서': '녹화동의서',
  '여행자보험 정보': '보험정보',
}

const CELL: Record<DeliverableStatus, { bg: string; mark: string; tone: string }> = {
  '검수완료': { bg: 'var(--good-bg)', mark: '✓', tone: 'good' },
  '제출': { bg: 'var(--info-bg)', mark: '↑', tone: 'info' },
  '요청함': { bg: 'var(--warning-bg)', mark: '…', tone: 'warning' },
  '요청전': { bg: 'var(--surface-2)', mark: '·', tone: 'neutral' },
  '반려': { bg: 'var(--serious-bg)', mark: '↺', tone: 'serious' },
  '기한초과': { bg: 'var(--critical-bg)', mark: '!', tone: 'critical' },
}

export function Deliverables() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const list = speakersOf(state).filter(s => ['수락', '계약완료'].includes(s.stage))
  const [onlyLate, setOnlyLate] = useState(false)

  const types = [...new Set(list.flatMap(s => s.deliverables.map(d => d.type)))]
  const all = list.flatMap(s => s.deliverables.map(d => ({ s, d })))
  const late = all.filter(({ d }) => d.dueDate < today() && !['검수완료', '제출'].includes(d.status))
  const rows = onlyLate ? list.filter(s => late.some(l => l.s.id === s.id)) : list

  const counts = (st: DeliverableStatus) => all.filter(x => x.d.status === st).length

  const exportCsv = () => downloadCsv(`${conf.code}_제출물현황.csv`, [
    ['연사', '국가', '구분', '기한', '상태', '제출일', '파일'],
    ...all.map(({ s, d }) => [s.nameEn, s.country, d.type, d.dueDate, d.status, d.submittedAt, d.fileName]),
  ])

  const remind = (speakerId: string, subject: string) => {
    dispatch({
      type: 'ADD_COMM',
      comm: {
        id: `RM-${Math.random().toString(36).slice(2, 8)}`, conferenceId: conf.id, speakerId,
        channel: '이메일', direction: '발신', templateId: 'MT-05', subject,
        sentAt: new Date().toISOString().slice(0, 16),
        byMemberId: state.currentUserId, status: '발송완료', followUpAt: undefined,
      },
    })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">제출물·콘텐츠 관리</h1>
          <p className="page-desc">
            약력·사진·초록·발표자료와 각종 동의서(녹화·중계, 개인정보, 강연동의서)를 연사 × 항목 매트릭스로 추적합니다.
            기한이 지난 항목은 리마인드 발송 대상으로 표시됩니다.
          </p>
        </div>
        <div className="row-wrap no-print">
          <label className="chip" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyLate} onChange={e => setOnlyLate(e.target.checked)} /> 지연 연사만
          </label>
          <button className="btn" onClick={exportCsv}>⬇ 현황 내보내기</button>
        </div>
      </div>

      <div className="grid g4">
        <StatTile label="검수 완료" value={counts('검수완료')} unit="건" tone="good" bar={pct(counts('검수완료'), all.length)}
          foot={`전체 ${all.length}건 · ${pct(counts('검수완료'), all.length)}%`} />
        <StatTile label="검수 대기(제출)" value={counts('제출')} unit="건" tone="info" foot="담당자 검수 필요" />
        <StatTile label="요청 후 미제출" value={counts('요청함')} unit="건" tone="warning" foot="리마인드 대상" />
        <StatTile label="기한 경과" value={late.length} unit="건" tone="critical" foot={`${new Set(late.map(l => l.s.id)).size}명 관련`} />
      </div>

      <Card title="상태 구성">
        <StackBar segments={(Object.keys(CELL) as DeliverableStatus[]).map(k => ({
          label: k, value: counts(k), color: CELL[k].tone === 'neutral' ? 'var(--surface-3)' : `var(--${CELL[k].tone === 'info' ? 's1' : CELL[k].tone === 'good' ? 's3' : CELL[k].tone === 'warning' ? 's4' : CELL[k].tone === 'serious' ? 's2' : 's8'})`,
        }))} height={12} />
      </Card>

      <Card title="제출물 매트릭스" sub="셀: ✓ 검수완료 · ↑ 제출 · … 요청함 · ↺ 반려 · ! 기한초과 · · 요청전">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th style={{ minWidth: 190 }}>연사</th>
                {types.map(t => (
                  <th key={t} className="xsmall" title={t}
                    style={{ writingMode: 'vertical-rl', height: 116, padding: '8px 3px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {SHORT[t] ?? t}
                  </th>
                ))}
                <th className="right">완료율</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(s => {
                const done = s.deliverables.filter(d => d.status === '검수완료').length
                return (
                  <tr key={s.id}>
                    <td className="clickable" onClick={() => go('speakers', s.id)}>
                      {flag(s.country)} <strong>{s.nameEn}</strong>
                      <div className="xsmall muted">{s.tier} · {s.attendanceMode}</div>
                    </td>
                    {types.map(t => {
                      const d = s.deliverables.find(x => x.type === t)
                      if (!d) return <td key={t} className="muted" style={{ textAlign: 'center' }}>–</td>
                      const isLate = d.dueDate < today() && !['검수완료', '제출'].includes(d.status)
                      const c = CELL[isLate ? '기한초과' : d.status]
                      return (
                        <td key={t} style={{ textAlign: 'center', background: c.bg, cursor: 'pointer' }}
                          title={`${t} · 기한 ${fmtDate(d.dueDate)} (${ddayLabel(d.dueDate)}) · ${d.status}`}
                          onClick={() => dispatch({
                            type: 'PATCH_DELIVERABLE', speakerId: s.id, deliverableId: d.id,
                            patch: { status: d.status === '검수완료' ? '요청함' : '검수완료', submittedAt: d.status === '검수완료' ? undefined : today() },
                          })}>
                          <strong>{c.mark}</strong>
                        </td>
                      )
                    })}
                    <td className="right num">{pct(done, s.deliverables.length)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="기한 경과 항목" sub="리마인드 발송 시 커뮤니케이션 로그에 기록됩니다">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>연사</th><th>제출물</th><th>기한</th><th>경과</th><th>상태</th><th className="no-print">조치</th></tr></thead>
            <tbody>
              {late.map(({ s, d }) => (
                <tr key={d.id}>
                  <td>{flag(s.country)} {s.nameEn}</td>
                  <td>{d.type}</td>
                  <td className="num nowrap">{fmtDate(d.dueDate)}</td>
                  <td className="num"><Badge tone="critical">{ddayLabel(d.dueDate)}</Badge></td>
                  <td><Badge tone="warning">{d.status}</Badge></td>
                  <td className="no-print">
                    <button className="btn btn-sm" onClick={() => remind(s.id, `[Reminder] ${d.type} — due ${d.dueDate}`)}>✉ 리마인드 발송</button>
                  </td>
                </tr>
              ))}
              {!late.length && <tr><td colSpan={6} className="empty">기한 경과 항목이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
