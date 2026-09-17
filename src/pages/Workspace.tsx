import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { activeConference, buildItinerary, readiness, speakersOf, validateSpeaker, visaSlack } from '../lib/metrics'
import type { DataIssue, ItineraryEvent } from '../lib/metrics'
import { Badge, Card, DL, Empty, StatusBadge, TierTag } from '../components/ui'
import { ddayLabel, flag, fmtDate, fmtDateTime, krw, money, toneOf } from '../lib/format'
import { go } from '../lib/router'
import type { AttendanceStatus, Companion, Flight, Speaker } from '../types'

const TABS = ['Personal Information', 'Booking Information', 'Itinerary Information'] as const
const SUB = ['전체 보기', 'Flight', 'Accommodation', 'Protocol', 'Transportation', 'Program Registration'] as const
const ATTENDANCE: AttendanceStatus[] = ['참석확정', '참석미정', '불참', '취소']

/** 레이블 위 / 값 아래 형태의 필드 (레퍼런스 카드 레이아웃) */
const F = ({ label, value, sub, lg }: { label: string; value?: React.ReactNode; sub?: string; lg?: boolean }) => (
  <div className="bk-f">
    <span className="bk-label">{label}</span>
    <span className={lg ? 'bk-value-lg' : 'bk-value'}>{value ?? '-'}</span>
    {sub && <span className="bk-sub">{sub}</span>}
  </div>
)

const BookingCard = ({ title, icon, status, children }: {
  title: string; icon?: string; status?: string; children: React.ReactNode
}) => (
  <div className="bk">
    <div className="bk-head">
      <span>{icon && <span aria-hidden style={{ marginRight: 6 }}>{icon}</span>}{title}</span>
      {status && <StatusBadge status={status} />}
    </div>
    <div className="bk-body">{children}</div>
  </div>
)

export function Workspace() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const list = speakersOf(state)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'전체' | '참석확정' | '참석미정' | '비자대상' | '자비참가'>('전체')
  const [selected, setSelected] = useState<string>(list[0]?.id ?? '')
  const [tab, setTab] = useState<(typeof TABS)[number]>('Personal Information')
  const [sub, setSub] = useState<(typeof SUB)[number]>('전체 보기')
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [companionName, setCompanionName] = useState('')
  const [companionRelation, setCompanionRelation] = useState('배우자')

  const rows = useMemo(() => list.filter(s => {
    if (filter === '참석확정' && s.attendance !== '참석확정') return false
    if (filter === '참석미정' && s.attendance !== '참석미정') return false
    if (filter === '비자대상' && !s.visa.required) return false
    if (filter === '자비참가' && s.sponsorship === 'Sponsored') return false
    if (q && !`${s.nameEn} ${s.affiliation} ${s.country} ${s.email}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [list, q, filter])

  const sp = list.find(s => s.id === selected) ?? rows[0]

  const addCompanion = (target: Speaker) => {
    if (!companionName.trim()) return
    const c: Companion = {
      id: `${target.id}-AC${target.companions.length + 1}`,
      name: companionName.trim(), relation: companionRelation, nationality: target.country,
      attendance: '참석미정', visaRequired: target.visa.required, passportReceived: false,
      supported: false, shareRoom: true, ownFlight: false,
    }
    dispatch({
      type: 'PATCH_SPEAKER', id: target.id, patch: { companions: [...target.companions, c] },
      audit: { field: '동반자 등록', after: `${c.name} (${c.relation})`, memo: '워크스페이스에서 추가' },
    })
    setCompanionName(''); setAddingFor(null)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">초청자 워크스페이스</h1>
          <p className="page-desc">
            초청자 한 명을 선택하면 인적사항 · 예약(항공/숙박/의전/이동/프로그램) · 개인 일정을 한 화면에서 확인하고 수정합니다.
            엑셀로 주고받던 정보를 항목 단위로 나눠 담아, 값이 서로 어긋나면 <strong>정합성 경고</strong>로 즉시 알려 줍니다.
          </p>
        </div>
        <div className="row-wrap no-print">
          <span className="chip">전체 {list.length}명</span>
          <span className="chip">참석확정 {list.filter(s => s.attendance === '참석확정').length}명</span>
          <button className="btn" onClick={() => go('speakers')}>목록(표) 보기</button>
        </div>
      </div>

      <div className="ws">
        <aside className="ws-list">
          <div className="ws-list-head">
            <input className="input" placeholder="이름·소속·국가 검색" value={q} onChange={e => setQ(e.target.value)} />
            <div className="ws-subtabs">
              {(['전체', '참석확정', '참석미정', '비자대상', '자비참가'] as const).map(f => (
                <button key={f} className="ws-subtab" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
          <div className="ws-list-body">
            {rows.map(s => {
              const issues = validateSpeaker(s, conf)
              const errs = issues.filter(i => i.level === '오류').length
              return (
                <div key={s.id}>
                  <div className="ws-card" aria-selected={s.id === sp?.id} onClick={() => setSelected(s.id)}>
                    <div className="ws-card-name">
                      <span aria-hidden>{flag(s.country)}</span>
                      <span className="trunc">{s.nameEn}</span>
                      <span className="spacer" />
                      <Badge tone={s.attendance === '참석확정' ? 'good' : s.attendance === '참석미정' ? 'warning' : 'neutral'}>
                        {s.attendance}
                      </Badge>
                    </div>
                    <div className="ws-card-meta">
                      {s.affiliation}{s.department ? ` / ${s.department}` : ''} / {s.title}
                      <br />{s.email}
                      <br />{s.phone}
                    </div>
                    <div className="ws-card-foot">
                      <TierTag tier={s.tier} />
                      <span className="chip">{s.sponsorship}</span>
                      <span className="chip">Principal {state.members.find(m => m.id === s.principalMemberId)?.name}</span>
                      {errs > 0 && <Badge tone="critical">정합성 {errs}</Badge>}
                    </div>
                    {s.companions.map(c => (
                      <div key={c.id} className="xsmall muted" style={{ paddingLeft: 2 }}>
                        ↳ 동반 {c.name} ({c.relation}) · {c.attendance}{c.shareRoom ? ' · 객실 공유' : ' · 별도 객실'}
                      </div>
                    ))}
                  </div>
                  {addingFor === s.id ? (
                    <div className="row" style={{ gap: 4, marginTop: 4 }}>
                      <input className="input btn-sm" style={{ flex: 1 }} placeholder="동반자 성명"
                        value={companionName} onChange={e => setCompanionName(e.target.value)} />
                      <select className="select btn-sm" value={companionRelation} onChange={e => setCompanionRelation(e.target.value)}>
                        {['배우자', '수행 비서', '통역', '동료 연구자', '가족'].map(r => <option key={r}>{r}</option>)}
                      </select>
                      <button className="btn btn-sm btn-primary" onClick={() => addCompanion(s)}>저장</button>
                    </div>
                  ) : (
                    <button className="ws-accompany" style={{ marginTop: 4 }} onClick={() => setAddingFor(s.id)}>＋ Accompany 추가</button>
                  )}
                </div>
              )
            })}
            {!rows.length && <Empty>조건에 맞는 초청자가 없습니다.</Empty>}
          </div>
        </aside>

        <section className="ws-detail">
          {!sp ? <Empty>초청자를 선택하세요.</Empty> : (
            <>
              <Detail sp={sp} tab={tab} setTab={setTab} sub={sub} setSub={setSub}
                onAttendance={(v) => dispatch({
                  type: 'PATCH_SPEAKER', id: sp.id, patch: { attendance: v },
                  audit: { field: '참석 상태', before: sp.attendance, after: v },
                })}
                onProgram={(pid, status) => dispatch({
                  type: 'PATCH_SPEAKER', id: sp.id,
                  patch: { programs: sp.programs.map(p => (p.id === pid ? { ...p, status } : p)) },
                  audit: { field: `프로그램 등록 · ${sp.programs.find(p => p.id === pid)?.name}`, after: status },
                })}
              />
            </>
          )}
        </section>
      </div>
    </>
  )
}

function Detail({ sp, tab, setTab, sub, setSub, onAttendance, onProgram }: {
  sp: Speaker
  tab: (typeof TABS)[number]; setTab: (t: (typeof TABS)[number]) => void
  sub: (typeof SUB)[number]; setSub: (t: (typeof SUB)[number]) => void
  onAttendance: (v: AttendanceStatus) => void
  onProgram: (pid: string, status: '등록' | '미등록' | '대기' | '불참') => void
}) {
  const { state } = useApp()
  const conf = activeConference(state)
  const issues = validateSpeaker(sp, conf)
  const r = readiness(sp)
  const inbound = sp.flights.find(f => f.direction === '입국')
  const outbound = sp.flights.find(f => f.direction === '출국')
  const itinerary = buildItinerary(sp)
  const showFlight = sub === '전체 보기' || sub === 'Flight'
  const showHotel = sub === '전체 보기' || sub === 'Accommodation'
  const showProtocol = sub === '전체 보기' || sub === 'Protocol'
  const showTransport = sub === '전체 보기' || sub === 'Transportation'
  const showProgram = sub === '전체 보기' || sub === 'Program Registration'

  return (
    <>
      <div className="ws-head">
        <div className="row-wrap" style={{ justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div className="row-wrap" style={{ gap: 8 }}>
              <h2 style={{ fontSize: 19 }}>{flag(sp.country)} {sp.nameEn}</h2>
              <TierTag tier={sp.tier} />
              <StatusBadge status={sp.stage} />
              <span className="chip">{sp.sponsorship}</span>
              {sp.attendanceMode === '온라인' && <Badge tone="neutral">온라인</Badge>}
            </div>
            <div className="small sec" style={{ marginTop: 4 }}>
              {sp.title} · {sp.affiliation}{sp.department ? ` / ${sp.department}` : ''} · {sp.city}, {sp.country} ({sp.timezone})
            </div>
            <div className="xsmall muted" style={{ marginTop: 2 }}>
              {sp.code} · 리에종 {state.members.find(m => m.id === sp.liaisonMemberId)?.name} ·
              Principal {state.members.find(m => m.id === sp.principalMemberId)?.name} · 준비도 {r.score}%
            </div>
          </div>
          <div className="row-wrap no-print">
            <select className="select" value={sp.attendance} onChange={e => onAttendance(e.target.value as AttendanceStatus)} aria-label="참석 상태">
              {ATTENDANCE.map(a => <option key={a}>{a}</option>)}
            </select>
            <button className="btn" onClick={() => go('speakers', sp.id)}>전체 상세</button>
          </div>
        </div>

        <div className="tabs" style={{ marginTop: 14 }} role="tablist">
          {TABS.map(t => (
            <button key={t} className="tab" role="tab" aria-selected={t === tab} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      {issues.length > 0 && (
        <Card title={`데이터 정합성 경고 ${issues.length}건`} sub="엑셀 취합 시 놓치기 쉬운 값 불일치를 자동 검증합니다">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {issues.map(i => <IssueRow key={i.id} issue={i} />)}
          </div>
        </Card>
      )}

      {tab === 'Personal Information' && (
        <div className="grid g2">
          <Card title="인적 사항">
            <DL items={[
              ['성명(EN)', sp.nameEn], ['직위', sp.title],
              ['소속 / 팀', `${sp.affiliation}${sp.department ? ` / ${sp.department}` : ''}`],
              ['국가·도시', `${flag(sp.country)} ${sp.country} · ${sp.city}`],
              ['타임존', sp.timezone], ['이메일', sp.email], ['연락처', sp.phone],
              ['비서/사무실', sp.assistantEmail ?? '-'],
              ['사용 언어', sp.languages.join(', ')],
              ['전문 분야', sp.researchFields.join(' · ')],
            ]} />
          </Card>
          <Card title="여권 · 사증">
            <DL items={[
              ['여권 영문명', sp.passport?.nameEn], ['여권번호', sp.passport?.numberMasked],
              ['여권 만료', fmtDate(sp.passport?.expiryDate)],
              ['사증 필요', sp.visa.required ? `필요 · ${sp.visa.track}` : `불필요 · ${sp.visa.track}`],
              ['사증 단계', <StatusBadge status={sp.visa.stage} />],
              ['처리 여유', sp.visa.required ? `${visaSlack(sp, conf)}일` : '-'],
              ['K-ETA', sp.visa.ketaRequired ? sp.visa.ketaStatus : '해당없음'],
              ['공관', sp.visa.consulate],
            ]} />
          </Card>
          <Card title="요구 사항">
            <DL items={[
              ['식이', sp.dietary], ['접근성', sp.accessibility],
              ['통역', sp.interpretationNeeded ? '필요' : '불필요'],
              ['비용 지원', sp.sponsorship],
              ['참가 형태', sp.attendanceMode],
            ]} />
          </Card>
          <Card title={`동반자 (${sp.companions.length}명)`}>
            {sp.companions.length ? sp.companions.map(c => (
              <div key={c.id} className="bk" style={{ marginBottom: 8 }}>
                <div className="bk-head">
                  <span>{c.name} · {c.relation}</span>
                  <Badge tone={c.attendance === '참석확정' ? 'good' : 'warning'}>{c.attendance}</Badge>
                </div>
                <div className="bk-body">
                  <div className="bk-grid">
                    <F label="국적" value={c.nationality} />
                    <F label="사증" value={c.visaRequired ? (c.visaStage ?? '진행 전') : '불필요'} />
                    <F label="여권 사본" value={c.passportReceived ? '수취' : '미수취'} />
                    <F label="비용 지원" value={c.supported ? '지원' : '자비'} />
                    <F label="객실" value={c.shareRoom ? '공유' : '별도'} />
                    <F label="항공" value={c.ownFlight ? '별도 발권' : '미발권'} />
                  </div>
                  {c.memo && <div className="xsmall muted" style={{ marginTop: 8 }}>{c.memo}</div>}
                </div>
              </div>
            )) : <Empty>등록된 동반자가 없습니다. 좌측 카드에서 추가할 수 있습니다.</Empty>}
          </Card>
        </div>
      )}

      {tab === 'Booking Information' && (
        <>
          <div className="ws-subtabs no-print">
            {SUB.map(s => <button key={s} className="ws-subtab" aria-pressed={sub === s} onClick={() => setSub(s)}>{s}</button>)}
          </div>

          {showFlight && (
            <Card title="Flight" sub="항공 예약 — 탑승자명은 여권 영문명과 반드시 일치해야 합니다">
              {sp.flights.length ? (
                <div className="bk-split">
                  {sp.flights.map(f => <FlightCard key={f.id} f={f} />)}
                </div>
              ) : <Empty>{sp.attendanceMode === '온라인' ? '온라인 발표 — 항공 해당 없음' : '항공 예약이 없습니다.'}</Empty>}
            </Card>
          )}

          {showHotel && (
            <Card title="Accommodation">
              {sp.hotel ? (
                <BookingCard title={sp.hotel.hotel} icon="🏨" status={sp.hotel.status}>
                  <div className="bk-grid" style={{ marginBottom: 14 }}>
                    <F label="Check-in" value={fmtDate(sp.hotel.checkIn)} sub={sp.hotel.checkInTime} lg />
                    <F label="Check-out" value={fmtDate(sp.hotel.checkOut)} sub={sp.hotel.checkOutTime} lg />
                  </div>
                  <div className="bk-grid">
                    <F label="Room Number" value={sp.hotel.roomNumber ?? '배정 전'} />
                    <F label="Room Type" value={sp.hotel.roomType} />
                    <F label="Bed Type" value={sp.hotel.bedType} />
                    <F label="Number of Night" value={`${sp.hotel.nights}박`} />
                    <F label="Number of Guest" value={`${sp.hotel.guests}명`} />
                    <F label="Breakfast" value={sp.hotel.breakfastIncluded ? 'Included' : '불포함'} />
                    <F label="Special Meal" value={sp.hotel.specialMeal ?? '-'} />
                    <F label="정산 방식" value={sp.hotel.billing} />
                    <F label="예약번호" value={sp.hotel.confirmationNo ?? '미확정'} />
                    <F label="요금" value={`${krw(sp.hotel.ratePerNight)} / 박`} />
                  </div>
                </BookingCard>
              ) : <Empty>{sp.attendanceMode === '온라인' ? '온라인 발표 — 숙박 해당 없음' : '숙박 예약이 없습니다.'}</Empty>}
            </Card>
          )}

          {showProtocol && (
            <Card title="Protocol" sub="영접 · 의전 서열 · 라운지 · 기념품">
              <BookingCard title={`의전 등급 ${sp.protocol.level}`} icon="🎖" status={sp.protocol.status}>
                <div className="bk-grid">
                  <F label="영접 담당" value={state.members.find(m => m.id === sp.protocol.greeterMemberId)?.name ?? '미배정'} />
                  <F label="영접 위치" value={sp.protocol.greetingPoint ?? '-'} />
                  <F label="의전 차량" value={sp.protocol.escortVehicle ?? '일반 배차'} />
                  <F label="VIP 라운지" value={sp.protocol.loungeAccess ? '사용' : '미사용'} />
                  <F label="갈라 의전 서열" value={sp.protocol.seatingOrder ? `${sp.protocol.seatingOrder}번` : '-'} />
                  <F label="기념품" value={sp.protocol.giftPrepared ? '준비 완료' : '준비 전'} />
                  <F label="포토 세션" value={sp.protocol.photoSession ? '예정' : '없음'} />
                </div>
                {sp.protocol.note && <div className="xsmall muted" style={{ marginTop: 10 }}>{sp.protocol.note}</div>}
              </BookingCard>
            </Card>
          )}

          {showTransport && (
            <Card title="Transportation" sub="공항 픽업·샌딩 및 행사장 이동">
              {sp.transfers.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sp.transfers.map(t => (
                    <BookingCard key={t.id} title={t.kind} icon="🚘" status={t.status}>
                      <div className="bk-grid">
                        <F label="일시" value={fmtDateTime(t.at)} />
                        <F label="From" value={t.fromPlace} />
                        <F label="To" value={t.toPlace} />
                        <F label="차량" value={t.vehicle} />
                        <F label="미팅 포인트" value={t.meetingPoint ?? '-'} />
                        <F label="연계 항공편" value={t.flightNo ?? '-'} />
                        <F label="담당" value={state.members.find(m => m.id === t.assignedMemberId)?.name ?? '미배정'} />
                      </div>
                    </BookingCard>
                  ))}
                </div>
              ) : <Empty>배차 내역이 없습니다.</Empty>}
            </Card>
          )}

          {showProgram && (
            <Card title="Program Registration" sub="세션·만찬·리셉션 참가 등록 (상태 변경 시 이력 기록)">
              {sp.programs.length ? (
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th>프로그램</th><th>구분</th><th>일자</th><th>시간</th><th>장소</th><th>좌석</th><th>상태</th><th className="no-print">변경</th></tr></thead>
                    <tbody>
                      {sp.programs.map(p => (
                        <tr key={p.id}>
                          <td>{p.name}{p.note && <div className="xsmall muted">{p.note}</div>}</td>
                          <td className="small">{p.type}</td>
                          <td className="num nowrap">{fmtDate(p.date)}</td>
                          <td className="num nowrap small">{p.time ?? '-'}</td>
                          <td className="small">{p.place ?? '-'}</td>
                          <td className="small">{p.seat ?? '-'}</td>
                          <td><Badge tone={p.status === '등록' ? 'good' : p.status === '대기' ? 'warning' : p.status === '불참' ? 'critical' : 'neutral'}>{p.status}</Badge></td>
                          <td className="no-print">
                            <select className="select btn-sm" value={p.status}
                              onChange={e => onProgram(p.id, e.target.value as '등록' | '미등록' | '대기' | '불참')}>
                              {['등록', '대기', '미등록', '불참'].map(v => <option key={v}>{v}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty>등록된 프로그램이 없습니다.</Empty>}
            </Card>
          )}
        </>
      )}

      {tab === 'Itinerary Information' && (
        <Card title="개인 일정 (Itinerary)"
          sub="항공·숙박·배차·프로그램을 합성한 일자별 일정 — 연사에게 발송하는 개인 일정표와 동일한 내용입니다"
          right={<button className="btn btn-sm no-print" onClick={() => window.print()}>🖨 인쇄</button>}>
          {itinerary.length ? itinerary.map(day => (
            <div key={day.date} style={{ marginBottom: 18 }}>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <strong>{fmtDate(day.date)}</strong>
                <span className="chip">{ddayLabel(day.date)}</span>
                <span className="xsmall muted">{day.events.length}개 일정</span>
              </div>
              <div className="tl">
                {day.events.map((e, i) => <ItineraryRow key={i} e={e} />)}
              </div>
            </div>
          )) : <Empty>확정된 일정이 없습니다. 항공·숙박이 확정되면 자동으로 생성됩니다.</Empty>}
          {inbound && outbound && (
            <div className="alert alert-info">
              <span aria-hidden>ℹ</span>
              <span>
                총 체류 {fmtDate(inbound.arriveAt)} ~ {fmtDate(outbound.departAt)} ·
                숙박 {sp.hotel ? `${sp.hotel.nights}박` : '미정'} ·
                프로그램 {sp.programs.filter(p => p.status === '등록').length}건 등록
              </span>
            </div>
          )}
        </Card>
      )}
    </>
  )
}

function FlightCard({ f }: { f: Flight }) {
  return (
    <BookingCard title={f.direction === '입국' ? 'Inbound' : 'Outbound'} icon="✈" status={f.status}>
      <div className="bk-grid" style={{ marginBottom: 14 }}>
        <F label="FROM" value={f.from} sub={f.fromCity} lg />
        <F label="Boarding Time" value={f.boardingTime ?? f.departAt.slice(11, 16)} sub={fmtDate(f.departAt)} />
        <F label="TO" value={f.to} sub={f.toCity} lg />
        <F label="Passenger" value={f.passengerName} sub={`Passport ${f.passportNumber ?? '-'}`} />
      </div>
      <div className="bk-grid">
        <F label="Flight No" value={`${f.carrier} ${f.flightNo}`} />
        <F label="Terminal" value={f.terminal ?? '-'} />
        <F label="Gate" value={f.gate ?? '미정'} />
        <F label="Flight Class" value={f.bookingClass ?? '-'} />
        <F label="Seat" value={f.seat ?? '미배정'} />
        <F label="Cabin Class" value={f.cabin} />
        <F label="PNR" value={f.pnr ?? '-'} />
        <F label="수하물" value={f.baggage ?? '-'} />
        <F label="발권" value={f.eTicketReceived ? 'e-Ticket 수령' : f.ticketedBy} />
        <F label="운임" value={f.fare ? money(f.fare, f.currency) : '왕복 포함'} />
      </div>
      <div className="xsmall muted" style={{ marginTop: 10 }}>
        출발 {fmtDateTime(f.departAt)} → 도착 {fmtDateTime(f.arriveAt)}
      </div>
    </BookingCard>
  )
}

const ItineraryRow = ({ e }: { e: ItineraryEvent }) => (
  <div className="tl-item">
    <span className="xsmall muted num">{e.time}</span>
    <span className="tl-dot" style={{ background: e.kind === '항공' ? 'var(--s1)' : e.kind === '프로그램' ? 'var(--s7)' : e.kind === '숙박' ? 'var(--s3)' : 'var(--s4)' }} />
    <span className="small">
      <strong>{e.title}</strong>{e.status && <> <Badge tone={toneOf(e.status)}>{e.status}</Badge></>}
      {e.detail && <><br /><span className="xsmall muted">{e.detail}</span></>}
    </span>
  </div>
)

const IssueRow = ({ issue }: { issue: DataIssue }) => (
  <div className={`issue issue-${issue.level}`}>
    <span aria-hidden>{issue.level === '오류' ? '⛔' : issue.level === '경고' ? '⚠' : 'ℹ'}</span>
    <span>
      <strong>[{issue.field}] {issue.message}</strong>
      <br /><span className="xsmall">조치: {issue.action}</span>
    </span>
  </div>
)
