import { useApp } from '../store'
import { activeConference, speakersOf, visaLeadDays, visaSlack } from '../lib/metrics'
import { Badge, Card, StatTile, StatusBadge } from '../components/ui'
import { flag, fmtDate, fmtDateTime } from '../lib/format'
import { go } from '../lib/router'
import { downloadCsv } from '../lib/csv'
import type { VisaStage } from '../types'

const BOARD: VisaStage[] = ['판정대기', '서류요청', '서류수령', '초청장발급', '사증발급인정서신청', '사증발급인정서발급', '영사관접수', '인터뷰', '발급완료']

export function Visa() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const list = speakersOf(state).filter(s => !['거절', '취소'].includes(s.stage))
  const visaCases = list.filter(s => s.visa.required)
  const waiver = list.filter(s => !s.visa.required && s.attendanceMode !== '온라인')

  const need = (s: typeof list[number]) => visaLeadDays(s)
  const slack = (s: typeof list[number]) => visaSlack(s, conf)

  const exportCsv = () => downloadCsv(`${conf.code}_비자진행현황.csv`, [
    ['연사', '국적', '사증종류', '단계', '인정서', '공관', '예약일시', '접수일', '발급일', '예상소요(일)', '여유(일)'],
    ...visaCases.map(s => [s.nameEn, s.country, s.visa.track, s.visa.stage, s.visa.ccviRequired ? 'Y' : 'N',
      s.visa.consulate, s.visa.appointmentAt, s.visa.submittedAt, s.visa.issuedAt, need(s), slack(s)]),
  ])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">출입국·비자 관리</h1>
          <p className="page-desc">
            국적별 사증 종류 판정(C-3-1 단기방문 / C-3-4 단기상용 / C-4 단기취업)과 사증발급인정서(CCVI) 진행,
            K-ETA 대상 여부, 여권 유효기간을 함께 관리합니다. 강연료를 지급받는 연사는 체류자격 판정을 별도로 확인해야 합니다.
          </p>
        </div>
        <button className="btn no-print" onClick={exportCsv}>⬇ 진행현황 내보내기</button>
      </div>

      <div className="grid g4">
        <StatTile label="비자 필요" value={visaCases.length} unit="명" foot={`${new Set(visaCases.map(s => s.country)).size}개국`} />
        <StatTile label="발급 완료" value={visaCases.filter(s => s.visa.stage === '발급완료').length} unit="명" tone="good"
          bar={(visaCases.filter(s => s.visa.stage === '발급완료').length / Math.max(visaCases.length, 1)) * 100} />
        <StatTile label="사증발급인정서 대상" value={visaCases.filter(s => s.visa.ccviRequired).length} unit="명"
          foot="법무부 심사 약 2~3주 소요" tone="info" />
        <StatTile label="일정 여유 3주 미만" value={visaCases.filter(s => s.visa.stage !== '발급완료' && slack(s) < 21).length} unit="명"
          tone="critical" foot="리드타임 역산 기준 · 즉시 조치 대상" />
      </div>

      <Card title="비자 진행 보드" sub="단계별 인원 (칸을 클릭하면 해당 연사 상세로 이동)">
        <div className="kanban">
          {BOARD.map(stage => {
            const cards = visaCases.filter(s => s.visa.stage === stage)
            return (
              <div className="kanban-col" key={stage}>
                <div className="kanban-head"><span className="small">{stage}</span><span className="chip num">{cards.length}</span></div>
                {cards.map(s => (
                  <div className="kanban-card" key={s.id} onClick={() => go('speakers', s.id)}>
                    <div className="row" style={{ gap: 6 }}>
                      <span aria-hidden>{flag(s.country)}</span>
                      <strong className="small trunc" style={{ flex: 1 }}>{s.nameEn}</strong>
                    </div>
                    <div className="xsmall muted">{s.visa.track}</div>
                    <div className="row-wrap" style={{ gap: 4, marginTop: 5 }}>
                      {s.visa.ccviRequired && <Badge tone="info">인정서</Badge>}
                      <Badge tone={slack(s) < 0 ? 'critical' : slack(s) < 21 ? 'serious' : 'good'}>여유 {slack(s)}일</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="비자 대상 상세" sub="여유일 = 개막까지 남은 일수 − (사증 심사 + 인정서 심사 + 버퍼 7일)">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>연사</th><th>국적</th><th>사증 종류</th><th>단계</th><th>인정서</th><th>공관</th><th>영사 예약</th><th>여권 만료</th><th className="right">필요일</th><th className="right">여유</th><th className="no-print">단계 변경</th></tr>
            </thead>
            <tbody>
              {visaCases.map(s => (
                <tr key={s.id}>
                  <td className="clickable" onClick={() => go('speakers', s.id)}><strong>{s.nameEn}</strong><div className="xsmall muted">{s.affiliation}</div></td>
                  <td className="nowrap">{flag(s.country)} {s.country}</td>
                  <td className="small nowrap">{s.visa.track}</td>
                  <td><StatusBadge status={s.visa.stage} /></td>
                  <td className="small">{s.visa.ccviRequired ? (s.visa.ccviNumber ?? '신청 필요') : '-'}</td>
                  <td className="small trunc" style={{ maxWidth: 180 }}>{s.visa.consulate ?? '-'}</td>
                  <td className="small num nowrap">{fmtDateTime(s.visa.appointmentAt)}</td>
                  <td className="small num nowrap">{fmtDate(s.passport?.expiryDate)}</td>
                  <td className="right num">{need(s)}일</td>
                  <td className="right num">
                    <Badge tone={s.visa.stage === '발급완료' ? 'good' : slack(s) < 0 ? 'critical' : slack(s) < 21 ? 'serious' : 'info'}>
                      {s.visa.stage === '발급완료' ? '완료' : `${slack(s)}일`}
                    </Badge>
                  </td>
                  <td className="no-print">
                    <select className="select btn-sm" value={s.visa.stage}
                      onChange={e => dispatch({ type: 'SET_VISA_STAGE', id: s.id, stage: e.target.value as VisaStage })}>
                      {[...BOARD, '거절', '재신청', '해당없음'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid g2">
        <Card title="무비자·K-ETA 대상" sub="사증은 면제되나 전자여행허가·입국 서류 확인이 필요합니다">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>연사</th><th>국적</th><th>구분</th><th>K-ETA</th><th>여권 만료</th><th>입국 예정</th></tr></thead>
              <tbody>
                {waiver.map(s => (
                  <tr key={s.id} className="clickable" onClick={() => go('speakers', s.id)}>
                    <td>{s.nameEn}</td>
                    <td className="nowrap">{flag(s.country)} {s.country}</td>
                    <td className="small">{s.visa.track}</td>
                    <td>{s.visa.ketaRequired ? <StatusBadge status={s.visa.ketaStatus ?? '신청전'} /> : <span className="muted small">해당없음</span>}</td>
                    <td className="small num">{fmtDate(s.passport?.expiryDate)}</td>
                    <td className="small num">{s.flights[0] ? fmtDate(s.flights[0].arriveAt) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="실무 기준 메모" sub="국가·정책 변동 시 설정에서 갱신">
          <ul className="small sec" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.85 }}>
            <li><strong>체류자격 판정</strong> — 강연료·사례비를 수령하면 단순 방문(C-3-1)이 아닌 단기취업(C-4) 대상이 될 수 있어 사전 확인이 필요합니다.</li>
            <li><strong>사증발급인정서(CCVI)</strong> — 초청자(주최기관)가 국내 출입국·외국인청에 신청하며, 발급 후 연사가 현지 공관에서 사증을 받습니다. 심사에 통상 2~3주가 소요됩니다.</li>
            <li><strong>필수 서류</strong> — 초청장, 초청사유서, 신원보증서, 사업자등록증, 행사 개요·프로그램, 재직증명서, 여권 사본.</li>
            <li><strong>여권 유효기간</strong> — 입국일 기준 6개월 이상 잔여를 권고하며, 미달 시 갱신 후 서류를 재수취합니다.</li>
            <li><strong>K-ETA</strong> — 사증 면제 대상 국적자의 전자여행허가로, 면제 대상국은 정책에 따라 변동되므로 매 행사 시 확인이 필요합니다.</li>
            <li><strong>백업 시나리오</strong> — 사증 거절·지연에 대비해 D-30 시점에 온라인 발표 전환 여부를 결정합니다.</li>
          </ul>
          <div className="alert alert-info" style={{ marginTop: 12 }}>
            <span aria-hidden>ℹ</span>
            <span>위 기준은 내부 운영 참고용입니다. 실제 신청 전 출입국·외국인청 및 관할 재외공관의 최신 공지를 확인하세요.</span>
          </div>
        </Card>
      </div>
    </>
  )
}
