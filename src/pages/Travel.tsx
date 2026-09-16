import { useState } from 'react'
import { useApp } from '../store'
import { activeConference, speakersOf } from '../lib/metrics'
import { Badge, Card, Empty, Segmented, StatTile, StatusBadge } from '../components/ui'
import { flag, fmtDate, fmtDateTime, krw, krwShort, money } from '../lib/format'
import { go } from '../lib/router'
import { downloadCsv } from '../lib/csv'

export function Travel() {
  const { state } = useApp()
  const conf = activeConference(state)
  const list = speakersOf(state).filter(s => !['거절', '취소'].includes(s.stage))
  const [view, setView] = useState<'항공' | '숙박' | '의전·배차'>('항공')

  const flights = list.flatMap(s => s.flights.map(f => ({ s, f }))).sort((a, b) =>
    (a.f.direction === '입국' ? a.f.arriveAt : a.f.departAt) < (b.f.direction === '입국' ? b.f.arriveAt : b.f.departAt) ? -1 : 1)
  const arrivals = flights.filter(x => x.f.direction === '입국')
  const transfers = list.flatMap(s => s.transfers.map(t => ({ s, t }))).sort((a, b) => (a.t.at < b.t.at ? -1 : 1))
  const hotels = list.filter(s => s.hotel)

  const exportRooming = () => downloadCsv(`${conf.code}_루밍리스트.csv`, [
    ['성명(EN)', '등급', '호텔', '체크인', '체크아웃', '박수', '객실', '정산방식', '예약번호', '요청사항', '동반자'],
    ...hotels.map(s => [s.nameEn, s.tier, s.hotel!.hotel, s.hotel!.checkIn, s.hotel!.checkOut, s.hotel!.nights,
      s.hotel!.roomType, s.hotel!.billing, s.hotel!.confirmationNo, s.hotel!.requests, s.companions.map(c => c.name).join('/')]),
  ])

  const totalAir = list.flatMap(s => s.settlement.expenses).filter(e => e.category === '항공').reduce((a, e) => a + e.amountKRW, 0)
  const totalHotel = hotels.reduce((a, s) => a + s.hotel!.nights * s.hotel!.ratePerNight, 0)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">여행·의전 관리</h1>
          <p className="page-desc">
            항공 발권, 숙박(루밍 리스트), 공항 픽업·샌딩 배차를 한 곳에서 관리합니다. 도착 시각 기준으로 배차와
            담당 리에종을 배정하고, 여행사·PCO와 같은 데이터를 공유합니다.
          </p>
        </div>
        <div className="row-wrap no-print">
          <Segmented options={['항공', '숙박', '의전·배차']} value={view} onChange={setView} />
          <button className="btn" onClick={exportRooming}>⬇ 루밍리스트</button>
        </div>
      </div>

      <div className="grid g4">
        <StatTile label="발권 완료" value={`${list.filter(s => s.flights.some(f => f.eTicketReceived)).length}/${list.filter(s => s.attendanceMode !== '온라인' && ['수락', '계약완료'].includes(s.stage)).length}`}
          foot="e-Ticket 수령 기준" tone="info" />
        <StatTile label="항공 예산(약정)" value={krwShort(totalAir)} unit="원" foot={`원화 환산 합계 · ${krw(totalAir)}`} />
        <StatTile label="객실 확보" value={hotels.reduce((a, s) => a + s.hotel!.nights, 0)} unit="박"
          foot={`${hotels.length}명 · 예상 ${krwShort(totalHotel)}원`} />
        <StatTile label="배차 확정" value={`${transfers.filter(x => x.t.status === '확정').length}/${transfers.length}`}
          foot="공항 픽업·샌딩 기준" tone={transfers.some(x => x.t.status !== '확정') ? 'warning' : 'good'} />
      </div>

      {view === '항공' && (
        <>
          <Card title="입국 일정" sub="도착 순 정렬 · 배차 담당자와 미팅포인트 확인">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>도착</th><th>연사</th><th>편명</th><th>구간</th><th>클래스</th><th>PNR</th><th>발권</th><th>픽업</th></tr></thead>
                <tbody>
                  {arrivals.map(({ s, f }) => {
                    const pickup = s.transfers.find(t => t.kind === '공항픽업')
                    return (
                      <tr key={f.id} className="clickable" onClick={() => go('speakers', s.id)}>
                        <td className="num nowrap"><strong>{fmtDateTime(f.arriveAt)}</strong></td>
                        <td>{flag(s.country)} {s.nameEn}</td>
                        <td className="num">{f.flightNo}</td>
                        <td className="num">{f.from} → {f.to}</td>
                        <td className="small">{f.cabin}</td>
                        <td className="num small">{f.pnr ?? '-'}</td>
                        <td><Badge tone={f.eTicketReceived ? 'good' : 'warning'}>{f.eTicketReceived ? '완료' : '미발권'}</Badge></td>
                        <td className="small">{pickup ? `${state.members.find(m => m.id === pickup.assignedMemberId)?.name} · ${pickup.status}` : '미배정'}</td>
                      </tr>
                    )
                  })}
                  {!arrivals.length && <tr><td colSpan={8} className="empty">확정된 입국 일정이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="전체 항공 여정">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>구분</th><th>연사</th><th>편명</th><th>출발</th><th>도착</th><th>수하물</th><th>발권 주체</th><th className="right">운임</th></tr></thead>
                <tbody>
                  {flights.map(({ s, f }) => (
                    <tr key={f.id}>
                      <td><Badge tone={f.direction === '입국' ? 'info' : 'neutral'}>{f.direction}</Badge></td>
                      <td>{s.nameEn}</td>
                      <td className="num">{f.flightNo}</td>
                      <td className="num nowrap small">{fmtDateTime(f.departAt)} · {f.from}</td>
                      <td className="num nowrap small">{fmtDateTime(f.arriveAt)} · {f.to}</td>
                      <td className="small">{f.baggage ?? '-'}</td>
                      <td className="small">{f.ticketedBy}</td>
                      <td className="right num">{f.fare ? money(f.fare, f.currency) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {view === '숙박' && (
        <Card title="루밍 리스트" sub="호텔 제출용 · Excel 내보내기 지원">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>연사</th><th>등급</th><th>호텔</th><th>체크인</th><th>체크아웃</th><th>박</th><th>객실</th><th>정산</th><th>예약번호</th><th>요청</th></tr></thead>
              <tbody>
                {hotels.map(s => (
                  <tr key={s.id} className="clickable" onClick={() => go('speakers', s.id)}>
                    <td>{flag(s.country)} {s.nameEn}{s.companions.length ? <span className="xsmall muted"> +동반 {s.companions.length}</span> : null}</td>
                    <td className="small">{s.tier}</td>
                    <td className="small">{s.hotel!.hotel}</td>
                    <td className="num nowrap">{fmtDate(s.hotel!.checkIn)}</td>
                    <td className="num nowrap">{fmtDate(s.hotel!.checkOut)}</td>
                    <td className="num">{s.hotel!.nights}</td>
                    <td className="small">{s.hotel!.roomType}</td>
                    <td className="small nowrap">{s.hotel!.billing}</td>
                    <td className="num small">{s.hotel!.confirmationNo ?? <Badge tone="warning">미확정</Badge>}</td>
                    <td className="xsmall muted">{s.hotel!.requests ?? s.dietary ?? '-'}</td>
                  </tr>
                ))}
                {!hotels.length && <tr><td colSpan={10} className="empty">숙박 배정 내역이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === '의전·배차' && (
        <>
          <Card title="배차 스케줄" sub="시간 순 · 차량/기사/미팅포인트/담당자">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>일시</th><th>구분</th><th>연사</th><th>구간</th><th>차량</th><th>미팅포인트</th><th>담당</th><th>상태</th></tr></thead>
                <tbody>
                  {transfers.map(({ s, t }) => (
                    <tr key={t.id} className="clickable" onClick={() => go('speakers', s.id)}>
                      <td className="num nowrap">{fmtDateTime(t.at)}</td>
                      <td className="small nowrap">{t.kind}</td>
                      <td>{flag(s.country)} {s.nameEn}</td>
                      <td className="small trunc" style={{ maxWidth: 260 }}>{t.fromPlace} → {t.toPlace}</td>
                      <td className="small">{t.vehicle ?? '-'}</td>
                      <td className="small">{t.meetingPoint ?? '-'}</td>
                      <td className="small">{state.members.find(m => m.id === t.assignedMemberId)?.name ?? '-'}</td>
                      <td><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                  {!transfers.length && <Empty>배차 내역이 없습니다.</Empty>}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="의전 요구사항 요약" sub="식이·접근성·통역·동반자">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>연사</th><th>등급</th><th>식이</th><th>접근성</th><th>통역</th><th>동반자</th></tr></thead>
                <tbody>
                  {list.filter(s => s.dietary || s.accessibility || s.interpretationNeeded || s.companions.length).map(s => (
                    <tr key={s.id}>
                      <td>{flag(s.country)} {s.nameEn}</td>
                      <td className="small">{s.tier}</td>
                      <td className="small">{s.dietary ?? '-'}</td>
                      <td className="small">{s.accessibility ?? '-'}</td>
                      <td className="small">{s.interpretationNeeded ? '필요' : '-'}</td>
                      <td className="small">{s.companions.map(c => `${c.name}(${c.relation})`).join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  )
}
