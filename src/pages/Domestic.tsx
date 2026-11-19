/**
 * 국내 학회 전용 모듈 — 연수평점 / 초록심사 / 참가등록 / 후원·전시
 * (행사 설정의 모듈 토글에 따라 메뉴에 노출된다)
 */
import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { activeConference, sessionsOf } from '../lib/metrics'
import { Badge, Card, Empty, HBars, StackBar, StatTile, StatusBadge } from '../components/ui'
import { Comments } from '../components/Comments'
import { ddayLabel, fmtDate, krw, krwShort, pct, today } from '../lib/format'
import { downloadCsv } from '../lib/csv'
import type { Abstract, CreditProgram, Registration, Sponsor } from '../types'

/* ────────────────────────────── 연수평점 ────────────────────────────── */

export function Credits() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const list = state.creditPrograms.filter(c => c.conferenceId === conf.id)
  const sessions = sessionsOf(state)
  const regs = state.registrations.filter(r => r.conferenceId === conf.id)
  const approved = list.filter(c => c.status === '승인').reduce((a, c) => a + (c.approvedCredits ?? 0), 0)
  const eligible = regs.filter(r => r.licenseNo && !['학생', '스태프'].includes(r.type))

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">연수평점 관리</h1>
          <p className="page-desc">
            {conf.creditAuthority ?? '인정 기관'} 평점 신청·승인과 부여 조건을 관리합니다.
            평점은 <strong>면허번호가 등록된 참가자</strong>에게만 부여되므로, 등록 단계에서 면허번호 누락을 함께 점검합니다.
          </p>
        </div>
        <button className="btn no-print" onClick={() => downloadCsv(`${conf.code}_연수평점_신청현황.csv`, [
          ['인정기관', '평점구분', '신청평점', '승인평점', '신청번호', '상태', '제출일', '결과일', '부여조건'],
          ...list.map(c => [c.authority, c.category, c.appliedCredits, c.approvedCredits, c.applicationNo, c.status, c.submittedAt, c.resultAt, c.condition]),
        ])}>⬇ 신청현황 내보내기</button>
      </div>

      <div className="grid g4">
        <StatTile label="승인 평점" value={approved} unit="평점" tone="good" foot={`신청 ${list.reduce((a, c) => a + c.appliedCredits, 0)}평점 중`} />
        <StatTile label="심사 중" value={list.filter(c => c.status === '심사중' || c.status === '신청').length} unit="건"
          tone={list.some(c => c.status === '심사중') ? 'warning' : 'neutral'} foot="프로그램북 인쇄 전 확정 필요" />
        <StatTile label="평점 대상 참가자" value={eligible.length} unit="명" foot={`전체 등록 ${regs.length}명`} />
        <StatTile label="면허번호 누락" value={regs.filter(r => !r.licenseNo && !['학생', '스태프', '후원사'].includes(r.type)).length} unit="명"
          tone="critical" foot="평점 부여 불가 — 등록데스크 확인" />
      </div>

      <Card title="평점 신청 현황">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>인정 기관</th><th>구분</th><th className="right">신청</th><th className="right">승인</th><th>신청번호</th><th>제출일</th><th>결과일</th><th>부여 조건</th><th>상태</th><th className="no-print">변경</th></tr></thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id}>
                  <td>{c.authority}</td>
                  <td className="small">{c.category}</td>
                  <td className="right num">{c.appliedCredits}</td>
                  <td className="right num">{c.approvedCredits ?? '-'}</td>
                  <td className="small num">{c.applicationNo ?? '-'}</td>
                  <td className="small num nowrap">{fmtDate(c.submittedAt)}</td>
                  <td className="small num nowrap">{fmtDate(c.resultAt)}</td>
                  <td className="xsmall muted">{c.condition}</td>
                  <td><Badge tone={c.status === '승인' ? 'good' : c.status === '심사중' ? 'warning' : c.status === '반려' ? 'critical' : 'info'}>{c.status}</Badge></td>
                  <td className="no-print">
                    <select className="select btn-sm" value={c.status}
                      onChange={e => dispatch({ type: 'PATCH_CREDIT', id: c.id, patch: { status: e.target.value as CreditProgram['status'] } })}>
                      {['준비', '신청', '심사중', '승인', '보완요청', '반려'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={10}><Empty>등록된 평점 신청이 없습니다.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid g2">
        <Card title="평점 인정 세션" sub="출석(QR) 기록이 있는 세션만 평점에 반영됩니다">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>세션</th><th>일자</th><th>시간</th><th>인정</th></tr></thead>
              <tbody>
                {sessions.map(s => {
                  const inc = list.some(c => c.sessionIds.includes(s.id))
                  return (
                    <tr key={s.id}>
                      <td className="small">{s.title}</td>
                      <td className="num nowrap small">{fmtDate(s.date)}</td>
                      <td className="num nowrap small">{s.startTime}–{s.endTime}</td>
                      <td>{inc ? <Badge tone="good">인정</Badge> : <span className="muted small">미인정</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="운영 체크포인트">
          <ul className="small sec" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.85 }}>
            <li>평점 신청은 통상 행사 1개월 전까지 인정 기관에 제출하며, 승인 결과를 프로그램북·홍보물에 표기한다.</li>
            <li>부여 조건(출석 시간·입퇴장 기록)을 등록데스크·세션장 운영과 일치시켜야 한다.</li>
            <li>면허번호가 없으면 평점 부여가 불가하므로 사전등록 단계에서 필수 입력으로 받는다.</li>
            <li>행사 종료 후 이수자 명단을 기한 내 제출해야 참가자에게 평점이 실제로 반영된다.</li>
          </ul>
          <div className="alert alert-info" style={{ marginTop: 12 }}>
            <span aria-hidden>ℹ</span>
            <span>평점 수량·조건은 인정 기관 규정에 따라 달라집니다. 신청 전 해당 기관의 최신 공지를 확인하세요.</span>
          </div>
        </Card>
      </div>
    </>
  )
}

/* ────────────────────────────── 초록 심사 ────────────────────────────── */

export function Abstracts() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const all = state.abstracts.filter(a => a.conferenceId === conf.id)
  const [status, setStatus] = useState('전체')
  const [track, setTrack] = useState('전체')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)

  const rows = all.filter(a =>
    (status === '전체' || a.status === status) &&
    (track === '전체' || a.track === track) &&
    (!q || `${a.title} ${a.authorName} ${a.affiliation} ${a.code}`.toLowerCase().includes(q.toLowerCase())))
  const avg = (a: Abstract) => (a.scores.length ? a.scores.reduce((x, y) => x + y, 0) / a.scores.length : 0)
  const byTrack = conf.tracks.map(t => ({ label: t, value: all.filter(a => a.track === t).length }))
  const selected = all.find(a => a.id === sel)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">초록 투고·심사</h1>
          <p className="page-desc">
            투고된 초록의 심사 점수와 채택 여부를 관리합니다. 채택 초록은 구연 세션 또는 포스터 세션에 배정되며,
            배정 결과가 프로그램·현장 운영과 연동됩니다.
          </p>
        </div>
        <button className="btn no-print" onClick={() => downloadCsv(`${conf.code}_초록심사결과.csv`, [
          ['초록번호', '제목', '저자', '소속', '트랙', '발표형식', '투고일', '평균점수', '상태', '배정세션'],
          ...all.map(a => [a.code, a.title, a.authorName, a.affiliation, a.track, a.presentType, a.submittedAt, avg(a).toFixed(1), a.status, a.sessionId]),
        ])}>⬇ 심사 결과 내보내기</button>
      </div>

      <div className="grid g4">
        <StatTile label="총 투고" value={all.length} unit="편" foot={`구연 ${all.filter(a => a.presentType === '구연').length} · 포스터 ${all.filter(a => a.presentType === '포스터').length}`} />
        <StatTile label="채택" value={all.filter(a => a.status === '채택').length} unit="편" tone="good"
          bar={pct(all.filter(a => a.status === '채택').length, all.length)} foot={`채택률 ${pct(all.filter(a => a.status === '채택').length, all.length)}%`} />
        <StatTile label="심사 미완" value={all.filter(a => a.status === '심사중' || a.status === '수정요청').length} unit="편" tone="warning" foot="결과 통보 전" />
        <StatTile label="우수초록 후보" value={all.filter(a => a.awardNominated).length} unit="편" foot="평균 8점 이상" />
      </div>

      <div className="grid g23">
        <Card title="초록 목록" right={<span className="small muted num">{rows.length} / {all.length}편</span>}>
          <div className="row-wrap no-print" style={{ marginBottom: 12 }}>
            <input className="input search" placeholder="제목·저자·소속 검색" value={q} onChange={e => setQ(e.target.value)} />
            <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
              {['전체', '접수', '심사중', '채택', '수정요청', '반려', '철회'].map(v => <option key={v}>{v}</option>)}
            </select>
            <select className="select" value={track} onChange={e => setTrack(e.target.value)}>
              {['전체', ...conf.tracks].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>번호</th><th>제목</th><th>저자</th><th>트랙</th><th>형식</th><th className="right">평균</th><th>상태</th><th className="no-print">심사</th></tr></thead>
              <tbody>
                {rows.map(a => (
                  <tr key={a.id} className="clickable" onClick={() => setSel(a.id)}>
                    <td className="num small nowrap">{a.code}</td>
                    <td className="trunc" style={{ maxWidth: 320 }}>{a.title}</td>
                    <td className="small nowrap">{a.authorName}<div className="xsmall muted trunc" style={{ maxWidth: 120 }}>{a.affiliation}</div></td>
                    <td className="small">{a.track}</td>
                    <td className="small">{a.presentType}</td>
                    <td className="right num">{a.scores.length ? avg(a).toFixed(1) : '-'}</td>
                    <td>
                      <Badge tone={a.status === '채택' ? 'good' : a.status === '반려' ? 'critical' : a.status === '수정요청' ? 'serious' : 'warning'}>{a.status}</Badge>
                      {a.awardNominated && <span className="chip" style={{ marginLeft: 4 }}>우수</span>}
                    </td>
                    <td className="no-print" onClick={e => e.stopPropagation()}>
                      <select className="select btn-sm" value={a.status}
                        onChange={e => dispatch({ type: 'PATCH_ABSTRACT', id: a.id, patch: { status: e.target.value as Abstract['status'], decisionAt: today() } })}>
                        {['접수', '심사중', '채택', '수정요청', '반려', '철회'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8}><Empty>조건에 맞는 초록이 없습니다.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid" style={{ gap: 14 }}>
          <Card title="트랙별 투고">
            <HBars data={byTrack} unit="편" empty="접수된 초록이 없습니다. 초록 공모가 시작되면 트랙별로 집계됩니다." />
          </Card>
          <Card title="심사 상태 구성">
            <StackBar height={12} valueFormat={n => `${n}편`} segments={[
              { label: '채택', value: all.filter(a => a.status === '채택').length, color: 'var(--s3)' },
              { label: '수정요청', value: all.filter(a => a.status === '수정요청').length, color: 'var(--s4)' },
              { label: '심사중', value: all.filter(a => a.status === '심사중').length, color: 'var(--s1)' },
              { label: '반려', value: all.filter(a => a.status === '반려').length, color: 'var(--s8)' },
            ]} />
          </Card>
          {selected && (
            <Card title={`${selected.code} 상세`} right={<button className="btn btn-sm no-print" onClick={() => setSel(null)}>닫기</button>}>
              <div className="small" style={{ marginBottom: 8 }}><strong>{selected.title}</strong></div>
              <div className="dl">
                <dt>저자</dt><dd>{selected.authorName} ({selected.affiliation})</dd>
                <dt>트랙·형식</dt><dd>{selected.track} · {selected.presentType}</dd>
                <dt>투고일</dt><dd>{fmtDate(selected.submittedAt)}</dd>
                <dt>심사 점수</dt><dd>{selected.scores.join(' / ') || '미등록'}</dd>
                <dt>배정 세션</dt><dd>{sessionsOf(state).find(s => s.id === selected.sessionId)?.title ?? '미배정'}</dd>
                <dt>비고</dt><dd>{selected.memo ?? '-'}</dd>
              </div>
              <div style={{ marginTop: 12 }}>
                <Comments targetType="초록" targetId={selected.id} targetLabel={selected.code} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

/* ────────────────────────────── 참가 등록 ────────────────────────────── */

export function Registrations() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const all = state.registrations.filter(r => r.conferenceId === conf.id)
  const [type, setType] = useState('전체')
  const [q, setQ] = useState('')
  const [unpaidOnly, setUnpaidOnly] = useState(false)

  const rows = all.filter(r =>
    (type === '전체' || r.type === type) &&
    (!unpaidOnly || !r.paid) &&
    (!q || `${r.name} ${r.affiliation} ${r.email}`.toLowerCase().includes(q.toLowerCase())))

  const revenue = all.filter(r => r.paid).reduce((a, r) => a + r.fee, 0)
  const unpaid = all.filter(r => !r.paid && r.fee > 0)
  const byType = [...new Set(all.map(r => r.type))].map(t => ({ label: t, value: all.filter(r => r.type === t).length }))
  const target = Math.round(conf.expectedAttendees * 0.75)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">참가 등록</h1>
          <p className="page-desc">
            사전·현장 등록과 등록비 수납 현황입니다. 연수평점 부여를 위해 <strong>면허번호</strong>가 필요하며,
            미입력 건은 등록데스크에서 확인하도록 표시됩니다.
          </p>
        </div>
        <button className="btn no-print" onClick={() => downloadCsv(`${conf.code}_참가등록명단.csv`, [
          ['등록번호', '성명', '소속', '진료과', '면허번호', '구분', '경로', '등록비', '납부', '결제수단', '등록일', '식권'],
          ...all.map(r => [r.id, r.name, r.affiliation, r.department, r.licenseNo, r.type, r.channel, r.fee, r.paid ? 'Y' : 'N', r.payMethod, r.registeredAt, r.mealTicket ? 'Y' : 'N']),
        ])}>⬇ 등록 명단 내보내기</button>
      </div>

      <div className="grid g5">
        <StatTile label="총 등록" value={all.length} unit="명" bar={pct(all.length, target)}
          foot={`목표 ${target}명 대비 ${pct(all.length, target)}%`} tone={pct(all.length, target) < 50 ? 'warning' : 'info'} />
        <StatTile label="사전등록" value={all.filter(r => r.channel === '사전등록').length} unit="명"
          foot={`현장 ${all.filter(r => r.channel === '현장등록').length} · 초청 ${all.filter(r => r.channel === '초청').length}`} />
        <StatTile label="등록비 수납" value={krwShort(revenue)} unit="원" tone="good" foot={`납부율 ${pct(all.filter(r => r.paid).length, all.length)}%`} />
        <StatTile label="미납" value={unpaid.length} unit="건" tone={unpaid.length ? 'warning' : 'good'}
          foot={`미수금 ${krwShort(unpaid.reduce((a, r) => a + r.fee, 0))}원`} />
        <StatTile label="면허번호 누락" value={all.filter(r => !r.licenseNo && !['학생', '스태프', '후원사'].includes(r.type)).length} unit="명"
          tone="critical" foot="평점 부여 불가" />
      </div>

      <div className="grid g2">
        <Card title="구분별 등록"><HBars data={byType} unit="명" empty="아직 등록자가 없습니다." /></Card>
        <Card title="사전등록 마감 안내" sub="할인 등록 마감까지">
          <div className="dl">
            <dt>할인 마감</dt><dd>{fmtDate(conf.milestones.find(m => m.label.includes('사전등록'))?.date)} ({ddayLabel(conf.milestones.find(m => m.label.includes('사전등록'))?.date)})</dd>
            <dt>현장 등록비</dt><dd>사전 대비 30% 할증</dd>
            <dt>식권 신청</dt><dd>{all.filter(r => r.mealTicket).length}명</dd>
            <dt>명찰 출력</dt><dd>{all.filter(r => r.badgePrinted).length} / {all.length}명</dd>
          </div>
        </Card>
      </div>

      <Card title="등록자 명단" right={<span className="small muted num">{rows.length} / {all.length}명</span>}>
        <div className="row-wrap no-print" style={{ marginBottom: 12 }}>
          <input className="input search" placeholder="성명·소속·이메일 검색" value={q} onChange={e => setQ(e.target.value)} />
          <select className="select" value={type} onChange={e => setType(e.target.value)}>
            {['전체', '정회원', '준회원', '비회원', '전공의', '학생', '연자', '스태프', '후원사'].map(v => <option key={v}>{v}</option>)}
          </select>
          <label className="chip" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={unpaidOnly} onChange={e => setUnpaidOnly(e.target.checked)} /> 미납만
          </label>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>성명</th><th>소속·진료과</th><th>면허번호</th><th>구분</th><th>경로</th><th className="right">등록비</th><th>납부</th><th>등록일</th><th className="no-print">현장</th></tr></thead>
            <tbody>
              {rows.slice(0, 120).map(r => (
                <tr key={r.id}>
                  <td className="nowrap">{r.name}</td>
                  <td className="small">{r.affiliation}<div className="xsmall muted">{r.department}</div></td>
                  <td className="small num">
                    {r.licenseNo ?? (['학생', '스태프', '후원사'].includes(r.type)
                      ? <span className="muted">해당없음</span>
                      : <Badge tone="critical">누락</Badge>)}
                  </td>
                  <td className="small">{r.type}</td>
                  <td className="small">{r.channel}</td>
                  <td className="right num">{krw(r.fee)}</td>
                  <td>{r.paid ? <Badge tone="good">완료</Badge> : <Badge tone="warning">미납</Badge>}</td>
                  <td className="small num nowrap">{fmtDate(r.registeredAt)}</td>
                  <td className="no-print">
                    <button className={`badge ${r.attended ? 't-good' : 't-neutral'}`} style={{ cursor: 'pointer' }}
                      onClick={() => dispatch({ type: 'PATCH_REGISTRATION', id: r.id, patch: { attended: !r.attended, badgePrinted: !r.attended } })}>
                      {r.attended ? '체크인' : '미체크인'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 120 && <div className="small muted" style={{ marginTop: 8 }}>상위 120명만 표시됩니다. 필터를 사용하세요.</div>}
      </Card>
    </>
  )
}

/* ────────────────────────────── 후원 · 전시 ────────────────────────────── */

export function Sponsors() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const all = state.sponsors.filter(s => s.conferenceId === conf.id)
  const [sel, setSel] = useState<string | null>(null)
  const total = all.reduce((a, s) => a + s.amount, 0)
  const paid = all.filter(s => s.contractStatus === '입금완료').reduce((a, s) => a + s.amount, 0)
  const contracted = all.filter(s => ['계약완료', '입금완료'].includes(s.contractStatus)).reduce((a, s) => a + s.amount, 0)
  const selected = all.find(s => s.id === sel)
  const byTier = useMemo(() => ['Diamond', 'Platinum', 'Gold', 'Silver', '부스only']
    .map(t => ({ label: t, value: all.filter(s => s.tier === t).length })).filter(x => x.value > 0), [all])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">후원 · 전시</h1>
          <p className="page-desc">
            후원 등급별 계약·입금과 전시 부스 배정을 관리합니다. 계약에 포함된 제공 항목(심포지엄·광고·부스)을
            현장 운영과 연결해 누락 없이 이행합니다.
          </p>
        </div>
        <button className="btn no-print" onClick={() => downloadCsv(`${conf.code}_후원전시현황.csv`, [
          ['업체', '등급', '금액', '담당자', '연락처', '부스', '계약상태', '제공항목', '마감일'],
          ...all.map(s => [s.company, s.tier, s.amount, s.contactName, s.contactEmail, s.boothNo, s.contractStatus, s.benefits.join(' / '), s.dueDate]),
        ])}>⬇ 후원 현황 내보내기</button>
      </div>

      <div className="grid g4">
        <StatTile label="후원 총액(제안 포함)" value={krwShort(total)} unit="원" foot={`${all.length}개사`} />
        <StatTile label="계약 완료" value={krwShort(contracted)} unit="원" tone="info" bar={pct(contracted, total)}
          foot={`계약률 ${pct(contracted, total)}%`} />
        <StatTile label="입금 완료" value={krwShort(paid)} unit="원" tone="good" bar={pct(paid, total)}
          foot={`수금률 ${pct(paid, total)}%`} />
        <StatTile label="미계약" value={all.filter(s => ['제안', '협의'].includes(s.contractStatus)).length} unit="건"
          tone="warning" foot="마감 임박 건 우선 확인" />
      </div>

      <div className="grid g23">
        <Card title="후원사 목록">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>업체</th><th>등급</th><th className="right">금액</th><th>부스</th><th>담당자</th><th>마감</th><th>상태</th><th className="no-print">변경</th></tr></thead>
              <tbody>
                {all.map(s => (
                  <tr key={s.id} className="clickable" onClick={() => setSel(s.id)}>
                    <td><strong>{s.company}</strong></td>
                    <td><Badge tone={s.tier === 'Diamond' ? 'info' : 'neutral'}>{s.tier}</Badge></td>
                    <td className="right num">{krwShort(s.amount)}</td>
                    <td className="small num">{s.boothNo ?? '-'}</td>
                    <td className="small">{s.contactName}</td>
                    <td className="small num nowrap">{fmtDate(s.dueDate)} <span className="xsmall muted">{s.dueDate ? ddayLabel(s.dueDate) : ''}</span></td>
                    <td><Badge tone={s.contractStatus === '입금완료' ? 'good' : s.contractStatus === '계약완료' ? 'info' : s.contractStatus === '취소' ? 'critical' : 'warning'}>{s.contractStatus}</Badge></td>
                    <td className="no-print" onClick={e => e.stopPropagation()}>
                      <select className="select btn-sm" value={s.contractStatus}
                        onChange={e => dispatch({ type: 'PATCH_SPONSOR', id: s.id, patch: { contractStatus: e.target.value as Sponsor['contractStatus'] } })}>
                        {['제안', '협의', '계약완료', '입금완료', '취소'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="grid" style={{ gap: 14 }}>
          <Card title="등급 구성"><HBars data={byTier} unit="개사" empty="계약된 후원사가 없습니다." /></Card>
          {selected ? (
            <Card title={selected.company} sub={`${selected.tier} · ${krw(selected.amount)}`}
              right={<button className="btn btn-sm no-print" onClick={() => setSel(null)}>닫기</button>}>
              <div className="dl">
                <dt>담당자</dt><dd>{selected.contactName}<br /><span className="xsmall muted">{selected.contactEmail}</span></dd>
                <dt>부스</dt><dd>{selected.boothNo ?? '-'} {selected.boothSize ? `(${selected.boothSize})` : ''}</dd>
                <dt>계약 상태</dt><dd><StatusBadge status={selected.contractStatus === '입금완료' ? '지급완료' : selected.contractStatus} /></dd>
                <dt>담당</dt><dd>{state.members.find(m => m.id === selected.ownerMemberId)?.name}</dd>
                <dt>비고</dt><dd>{selected.memo ?? '-'}</dd>
              </div>
              <div style={{ marginTop: 10 }}>
                <div className="small sec" style={{ marginBottom: 6 }}>제공 항목</div>
                <div className="row-wrap">{selected.benefits.map(b => <span className="chip" key={b}>{b}</span>)}</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Comments targetType="후원" targetId={selected.id} targetLabel={selected.company} />
              </div>
            </Card>
          ) : (
            <Card title="부스 배치 현황">
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>부스</th><th>업체</th><th>규격</th></tr></thead>
                  <tbody>
                    {all.filter(s => s.boothNo).sort((a, b) => (a.boothNo! < b.boothNo! ? -1 : 1)).map(s => (
                      <tr key={s.id}><td className="num">{s.boothNo}</td><td className="small">{s.company}</td><td className="small">{s.boothSize}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

export type { Registration }
