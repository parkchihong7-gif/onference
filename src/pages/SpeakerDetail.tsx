import { useState } from 'react'
import { useApp } from '../store'
import { activeConference, computeRisks, readiness } from '../lib/metrics'
import { Avatar, Badge, Card, DL, Empty, StatusBadge, TierTag } from '../components/ui'
import { daysBetween, ddayLabel, flag, fmtDate, fmtDateTime, krw, money, today, toneOf } from '../lib/format'
import { go } from '../lib/router'
import { PIPELINE_ORDER } from '../types'
import type { DeliverableStatus, PipelineStage, VisaStage } from '../types'

const VISA_STAGES: VisaStage[] = ['판정대기', '해당없음', '서류요청', '서류수령', '초청장발급', '사증발급인정서신청', '사증발급인정서발급', '영사관접수', '인터뷰', '발급완료', '거절', '재신청']
const DOC_STATUS: DeliverableStatus[] = ['요청전', '요청함', '제출', '검수완료', '반려', '기한초과']
const TABS = ['개요', '초청·계약', '출입국·비자', '여행·의전', '제출물·동의', '정산·세무', '업무·이력']

export function SpeakerDetail({ id }: { id: string }) {
  const { state, dispatch } = useApp()
  const [tab, setTab] = useState('개요')
  const sp = state.speakers.find(s => s.id === id)
  const conf = activeConference(state)
  if (!sp) return <Empty>연사를 찾을 수 없습니다.</Empty>

  const liaison = state.members.find(m => m.id === sp.liaisonMemberId)
  const pkg = state.supportPackages.find(p => p.id === sp.supportPackageId)!
  const r = readiness(sp)
  const risks = computeRisks(state).filter(x => x.speakerId === sp.id)
  const myTasks = state.tasks.filter(t => t.speakerId === sp.id)
  const myComms = state.communications.filter(c => c.speakerId === sp.id)
  const myLogs = state.auditLogs.filter(l => l.entityId === sp.id)
  const sessions = state.sessions.filter(s => sp.sessionIds.includes(s.id))
  // 입국 시 여권 잔여 유효기간 6개월(180일) 이상 권고 — 행사 종료일 기준으로 판정한다.
  const passportOk = !!sp.passport?.expiryDate && daysBetween(conf.endDate, sp.passport.expiryDate) >= 180

  return (
    <>
      <div className="page-head">
        <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
          <Avatar name={sp.nameEn} size="lg" />
          <div>
            <div className="row-wrap" style={{ gap: 8 }}>
              <h1 className="page-title">{flag(sp.country)} {sp.nameEn}</h1>
              <TierTag tier={sp.tier} />
              <StatusBadge status={sp.stage} />
              {sp.attendanceMode === '온라인' && <Badge tone="neutral">온라인 발표</Badge>}
              {sp.tags.map(t => <span className="chip" key={t}>{t}</span>)}
            </div>
            <p className="page-desc">
              {sp.title} · {sp.affiliation}{sp.department ? ` / ${sp.department}` : ''} · {sp.city}, {sp.country} ({sp.timezone})
              <br />{sp.code} · 담당 리에종 {liaison?.name} ({liaison?.email}) · 준비도 {r.score}%
            </p>
          </div>
        </div>
        <div className="row-wrap no-print">
          <button className="btn" onClick={() => go('speakers')}>← 목록</button>
          <button className="btn" onClick={() => window.print()}>🖨 개인 일정표 인쇄</button>
          <select className="select" value={sp.stage}
            onChange={e => dispatch({ type: 'SET_STAGE', id: sp.id, stage: e.target.value as PipelineStage })}>
            {[...PIPELINE_ORDER, '거절', '취소'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {risks.length > 0 && (
        <div className="grid" style={{ gap: 8 }}>
          {risks.map(x => (
            <div key={x.id} className={`alert alert-${x.level === 'warning' ? 'warning' : 'critical'}`}>
              <span aria-hidden>{x.level === 'critical' ? '⛔' : '⚠'}</span>
              <span><strong>[{x.category}] {x.title}</strong> — {x.detail}</span>
            </div>
          ))}
        </div>
      )}

      <div className="row-wrap" style={{ gap: 14 }}>
        {r.items.filter(i => !i.na).map(i => (
          <span key={i.label} className={`badge ${i.done ? 't-good' : 't-warning'}`}>
            {i.done ? '✓' : '○'} {i.label}
          </span>
        ))}
      </div>

      <div className="no-print"><TabsBar tabs={TABS} tab={tab} setTab={setTab} /></div>

      {tab === '개요' && (
        <div className="grid g2">
          <Card title="기본 정보">
            <DL items={[
              ['성명(EN)', sp.nameEn], ['직위', sp.title], ['소속', sp.affiliation],
              ['부서', sp.department], ['국가·도시', `${flag(sp.country)} ${sp.country} · ${sp.city}`],
              ['타임존', sp.timezone], ['이메일', sp.email], ['연락처', sp.phone],
              ['비서/사무실', sp.assistantEmail ? `${sp.assistantName} (${sp.assistantEmail})` : '-'],
              ['사용 언어', sp.languages.join(', ')], ['전문 분야', sp.researchFields.join(' · ')],
              ['프로필', sp.profileUrl ? <a href={sp.profileUrl} target="_blank" rel="noreferrer" className="sec">{sp.profileUrl}</a> : '-'],
            ]} />
          </Card>
          <Card title="배정 세션 및 요구사항">
            {sessions.length ? sessions.map(s => (
              <div key={s.id} style={{ marginBottom: 10 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Badge tone="info">{s.type}</Badge>
                  <strong className="small">{s.title}</strong>
                </div>
                <div className="xsmall muted">{fmtDate(s.date)} {s.startTime}–{s.endTime} · {s.room} · {s.mode} · {s.language}{s.interpretation ? ' · 동시통역' : ''}{s.recorded ? ' · 녹화' : ''}</div>
              </div>
            )) : <div className="small muted" style={{ marginBottom: 10 }}>배정된 세션이 없습니다.</div>}
            <DL items={[
              ['식이 요구', sp.dietary], ['접근성', sp.accessibility],
              ['통역 필요', sp.interpretationNeeded ? '필요' : '불필요'],
              ['동반자', sp.companions.length ? sp.companions.map(c => `${c.name}(${c.relation})${c.supported ? ' · 지원' : ''}`).join(', ') : '없음'],
              ['추천 경로', sp.recommendedBy], ['과거 참여', sp.previousParticipation],
              ['메모', sp.memo],
            ]} />
          </Card>
        </div>
      )}

      {tab === '초청·계약' && (
        <div className="grid g2">
          <Card title="초청 진행" sub="파이프라인 단계별 기록">
            <DL items={[
              ['현재 단계', <StatusBadge status={sp.stage} />],
              ['우선순위', sp.priority], ['최초 접촉', fmtDate(sp.firstContactAt)],
              ['회신 기한', sp.replyDueAt ? `${fmtDate(sp.replyDueAt)} (${ddayLabel(sp.replyDueAt)})` : '-'],
              ['수락일', fmtDate(sp.acceptedAt)],
              ['거절일/사유', sp.declinedAt ? `${fmtDate(sp.declinedAt)} · ${sp.declineReason ?? '-'}` : '-'],
              ['계약 상태', <StatusBadge status={sp.agreementStatus} />],
              ['서명일', fmtDate(sp.agreementSignedAt)],
            ]} />
          </Card>
          <Card title={`지원 패키지 · ${pkg.name}`} sub="등급별 지원 범위 템플릿이 자동 적용됩니다">
            <DL items={[
              ['항공', `${pkg.airCabin} · ${pkg.airTicketedBy}`],
              ['숙박', `${pkg.hotelNights}박 · ${pkg.hotelGrade} · ${pkg.hotelBilling}`],
              ['일비', krw(pkg.perDiemKRW)],
              ['강연료', krw(sp.settlement.honorarium)],
              ['지상교통', pkg.groundTransfer ? '공항 픽업·샌딩 및 의전차량 제공' : '미지원(실비 정산)'],
              ['동반자', pkg.companionSupported ? pkg.companionScope ?? '지원' : '미지원'],
              ['여행자보험', pkg.insurance ? '주최 가입' : '미지원'],
              ['비고', pkg.notes],
            ]} />
          </Card>
        </div>
      )}

      {tab === '출입국·비자' && (
        <div className="grid g2">
          <Card title="사증(비자) 진행" sub="국적 기준 판정 · D-day 역산 경보"
            right={
              <select className="select no-print" value={sp.visa.stage}
                onChange={e => dispatch({ type: 'SET_VISA_STAGE', id: sp.id, stage: e.target.value as VisaStage })}>
                {VISA_STAGES.map(s => <option key={s}>{s}</option>)}
              </select>}>
            <DL items={[
              ['비자 필요', sp.visa.required ? '필요' : '불필요(협정/온라인)'],
              ['사증 종류', sp.visa.track],
              ['현재 단계', <StatusBadge status={sp.visa.stage} />],
              ['K-ETA', sp.visa.ketaRequired ? `대상 · ${sp.visa.ketaStatus}` : '해당없음'],
              ['사증발급인정서', sp.visa.ccviRequired ? `필요 ${sp.visa.ccviNumber ? `· ${sp.visa.ccviNumber}` : '(미신청)'}` : '불필요'],
              ['신원보증서', sp.visa.guaranteeLetterRequired ? '필요' : '불필요'],
              ['재외공관', sp.visa.consulate],
              ['영사 예약', fmtDateTime(sp.visa.appointmentAt)],
              ['접수일', fmtDate(sp.visa.submittedAt)],
              ['발급일', fmtDate(sp.visa.issuedAt)],
              ['사증 만료', fmtDate(sp.visa.visaExpiry)],
              ['예상 소요', `${sp.visa.leadTimeDays}일${sp.visa.ccviRequired ? ' + 인정서 심사 약 20일' : ''}`],
              ['초청장 발급', fmtDate(sp.visa.invitationLetterIssuedAt)],
              ['메모', sp.visa.memo],
            ]} />
          </Card>
          <Card title="여권 정보" sub="원본 문서는 별도 문서고 보관 · 화면에는 마스킹 표시">
            {sp.passport ? (
              <DL items={[
                ['영문 성명', sp.passport.nameEn], ['여권번호', sp.passport.numberMasked],
                ['국적', sp.passport.nationality], ['발급일', fmtDate(sp.passport.issueDate)],
                ['만료일', <>
                  {fmtDate(sp.passport.expiryDate)}{' '}
                  <Badge tone={passportOk ? 'good' : 'serious'}>
                    {passportOk ? '6개월 규정 충족' : '6개월 규정 미달 — 갱신 필요'}
                  </Badge>
                </>],
                ['사본 수령', sp.passport.scanReceived ? '수령 완료' : '미수령'],
              ]} />
            ) : <Empty>여권 정보 미수집 (수락 이후 수집)</Empty>}
            <div className="alert alert-info" style={{ marginTop: 12 }}>
              <span aria-hidden>ℹ</span>
              <span>개인정보(여권·연락처)는 수집 동의 후 저장하며, 행사 종료 후 보유기간 경과 시 파기 대상으로 표시됩니다.</span>
            </div>
          </Card>
        </div>
      )}

      {tab === '여행·의전' && (
        <div className="grid" style={{ gap: 14 }}>
          <Card title="항공 여정">
            {sp.flights.length ? (
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>구분</th><th>편명</th><th>구간</th><th>출발</th><th>도착</th><th>클래스</th><th>PNR</th><th>발권</th><th className="right">운임</th></tr></thead>
                  <tbody>
                    {sp.flights.map(f => (
                      <tr key={f.id}>
                        <td><Badge tone={f.direction === '입국' ? 'info' : 'neutral'}>{f.direction}</Badge></td>
                        <td className="num">{f.flightNo}</td>
                        <td className="num">{f.from} → {f.to}</td>
                        <td className="num nowrap">{fmtDateTime(f.departAt)}</td>
                        <td className="num nowrap">{fmtDateTime(f.arriveAt)}</td>
                        <td className="small">{f.cabin}</td>
                        <td className="num small">{f.pnr ?? '-'}</td>
                        <td><Badge tone={f.eTicketReceived ? 'good' : 'warning'}>{f.eTicketReceived ? 'e-Ticket 수령' : `미발권 (${f.ticketedBy})`}</Badge></td>
                        <td className="right num">{f.fare ? money(f.fare, f.currency) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty>항공 스케줄 미확정</Empty>}
          </Card>
          <div className="grid g2">
            <Card title="숙박">
              {sp.hotel ? (
                <DL items={[
                  ['호텔', sp.hotel.hotel], ['주소', sp.hotel.address],
                  ['체크인/아웃', `${fmtDate(sp.hotel.checkIn)} ~ ${fmtDate(sp.hotel.checkOut)} (${sp.hotel.nights}박)`],
                  ['객실', sp.hotel.roomType], ['정산 방식', sp.hotel.billing],
                  ['예약번호', sp.hotel.confirmationNo ?? '미확정'],
                  ['요금', `${krw(sp.hotel.ratePerNight)} / 박`],
                  ['요청사항', sp.hotel.requests],
                ]} />
              ) : <Empty>숙박 미배정 (온라인 연사 또는 미확정)</Empty>}
            </Card>
            <Card title="의전·차량">
              {sp.transfers.length ? sp.transfers.map(t => (
                <div key={t.id} style={{ marginBottom: 12 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Badge tone={toneOf(t.status)}>{t.kind}</Badge>
                    <span className="small num">{fmtDateTime(t.at)}</span>
                  </div>
                  <div className="xsmall muted">{t.fromPlace} → {t.toPlace} · {t.vehicle}{t.meetingPoint ? ` · 미팅포인트: ${t.meetingPoint}` : ''}</div>
                  <div className="xsmall muted">담당 {state.members.find(m => m.id === t.assignedMemberId)?.name ?? '-'}</div>
                </div>
              )) : <Empty>배차 미배정</Empty>}
            </Card>
          </div>
        </div>
      )}

      {tab === '제출물·동의' && (
        <Card title="제출물 및 동의서" sub="기한 경과 건은 자동 리마인드 대상으로 표시됩니다">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>구분</th><th>기한</th><th>D-day</th><th>상태</th><th>제출일</th><th>파일</th><th>검수자</th><th className="no-print">상태 변경</th></tr></thead>
              <tbody>
                {sp.deliverables.map(dv => (
                  <tr key={dv.id}>
                    <td>{dv.type}</td>
                    <td className="num nowrap">{fmtDate(dv.dueDate)}</td>
                    <td className="num nowrap"><span className={dv.dueDate < today() && dv.status !== '검수완료' ? 'badge t-critical' : 'small muted'}>{ddayLabel(dv.dueDate)}</span></td>
                    <td><StatusBadge status={dv.status} /></td>
                    <td className="num nowrap small">{fmtDate(dv.submittedAt)}</td>
                    <td className="small trunc" style={{ maxWidth: 220 }}>{dv.fileName ?? '-'}{dv.version ? ` (v${dv.version})` : ''}</td>
                    <td className="small">{state.members.find(m => m.id === dv.reviewer)?.name ?? '-'}</td>
                    <td className="no-print">
                      <select className="select btn-sm" value={dv.status}
                        onChange={e => dispatch({ type: 'PATCH_DELIVERABLE', speakerId: sp.id, deliverableId: dv.id, patch: { status: e.target.value as DeliverableStatus, submittedAt: e.target.value === '제출' || e.target.value === '검수완료' ? today() : dv.submittedAt } })}>
                        {DOC_STATUS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === '정산·세무' && (
        <div className="grid g2">
          <Card title="강연료 및 원천징수" sub="비거주자 국내원천소득 원천징수 · 조세조약 적용 시 제한세율">
            <DL items={[
              ['강연료(총액)', krw(sp.settlement.honorarium)],
              ['원천징수율', `${sp.settlement.withholdingRate}%`],
              ['조세조약', sp.settlement.taxTreatyApplied ? `적용 (한-${sp.settlement.treatyCountry})` : '미적용 (기본 22%)'],
              ['거주자증명서', sp.settlement.corReceived ? '수령 완료' : '미수령'],
              ['원천세액', krw(Math.round(sp.settlement.honorarium * sp.settlement.withholdingRate / 100))],
              ['실지급액', krw(sp.settlement.netPayment)],
              ['지급일', fmtDate(sp.settlement.paidAt)],
            ]} />
            {sp.settlement.taxTreatyApplied && !sp.settlement.corReceived && (
              <div className="alert alert-warning" style={{ marginTop: 12 }}>
                <span aria-hidden>⚠</span>
                <span>거주자증명서 미수령 — 제한세율 적용 불가. 미수령 시 기본 22% 적용 후 경정청구 안내 필요.</span>
              </div>
            )}
          </Card>
          <Card title="해외 송금 정보">
            {sp.settlement.remittance ? (
              <DL items={[
                ['수취인', sp.settlement.remittance.beneficiary],
                ['은행', sp.settlement.remittance.bankName],
                ['SWIFT', sp.settlement.remittance.swift],
                ['계좌', sp.settlement.remittance.accountMasked],
                ['수수료 부담', sp.settlement.remittance.feeBearer],
              ]} />
            ) : <Empty>송금 정보 미수집</Empty>}
          </Card>
          <Card title="실비 내역" className="g2" >
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>구분</th><th>내역</th><th className="right">금액</th><th className="right">원화 환산</th><th>증빙</th><th>상태</th></tr></thead>
                <tbody>
                  {sp.settlement.expenses.map(e => (
                    <tr key={e.id}>
                      <td>{e.category}</td><td className="small">{e.description}</td>
                      <td className="right num">{money(e.amount, e.currency)}</td>
                      <td className="right num">{krw(e.amountKRW)}</td>
                      <td>{e.receipt ? '보유' : '-'}</td>
                      <td><StatusBadge status={e.status} /></td>
                    </tr>
                  ))}
                  {!sp.settlement.expenses.length && <tr><td colSpan={6} className="empty">실비 내역 없음</td></tr>}
                  {sp.settlement.expenses.length > 0 && (
                    <tr><td colSpan={3}><strong>합계</strong></td>
                      <td className="right num"><strong>{krw(sp.settlement.expenses.reduce((a, e) => a + e.amountKRW, 0))}</strong></td>
                      <td colSpan={2} /></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === '업무·이력' && (
        <div className="grid g2">
          <Card title={`업무 체크리스트 (${myTasks.filter(t => t.status === '완료').length}/${myTasks.length})`}>
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              {myTasks.map(t => (
                <div key={t.id} className="row" style={{ gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                  <input type="checkbox" checked={t.status === '완료'}
                    onChange={e => dispatch({ type: 'PATCH_TASK', id: t.id, patch: { status: e.target.checked ? '완료' : '대기', completedAt: e.target.checked ? today() : undefined } })} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small trunc" style={{ textDecoration: t.status === '완료' ? 'line-through' : undefined, color: t.status === '완료' ? 'var(--ink-3)' : undefined }}>{t.title}</div>
                    <div className="xsmall muted">{t.phase} · 기한 {fmtDate(t.dueDate)} · {state.members.find(m => m.id === t.ownerMemberId)?.name}</div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          </Card>
          <div className="grid" style={{ gap: 14 }}>
            <Card title="커뮤니케이션 기록">
              {myComms.length ? myComms.slice(0, 8).map(c => (
                <div key={c.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                  <div className="row small" style={{ gap: 8 }}>
                    <Badge tone={c.direction === '수신' ? 'info' : 'neutral'}>{c.direction}</Badge>
                    <span className="trunc" style={{ flex: 1 }}>{c.subject}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="xsmall muted">{fmtDateTime(c.sentAt)} · {state.members.find(m => m.id === c.byMemberId)?.name}{c.followUpAt ? ` · 팔로업 ${fmtDate(c.followUpAt)}` : ''}</div>
                </div>
              )) : <Empty>발송 기록 없음</Empty>}
            </Card>
            <Card title="변경 이력">
              <div className="tl">
                {myLogs.slice(0, 10).map(l => (
                  <div className="tl-item" key={l.id}>
                    <span className="xsmall muted num">{fmtDateTime(l.at).slice(5)}</span>
                    <span className="tl-dot" />
                    <span className="small">
                      {l.field}: <span className="muted">{l.before ?? '-'}</span> → <strong>{l.after ?? '-'}</strong>
                      <br /><span className="xsmall muted">{l.actor}{l.memo ? ` · ${l.memo}` : ''}</span>
                    </span>
                  </div>
                ))}
                {!myLogs.length && <Empty>변경 이력 없음</Empty>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 인쇄용 개인 일정표 */}
      <div className="print-only">
        <h2>{conf.nameKo} — 개인 일정표 / Personal Itinerary</h2>
        <p>{sp.nameEn} ({sp.affiliation}) · {sp.tier} · 담당 {liaison?.name} {liaison?.phone}</p>
        <ul>
          {sp.flights.map(f => <li key={f.id}>{f.direction}: {f.flightNo} {f.from}→{f.to} {fmtDateTime(f.departAt)} ~ {fmtDateTime(f.arriveAt)}</li>)}
          {sp.hotel && <li>숙박: {sp.hotel.hotel} {fmtDate(sp.hotel.checkIn)}~{fmtDate(sp.hotel.checkOut)}</li>}
          {sp.transfers.map(t => <li key={t.id}>{t.kind}: {fmtDateTime(t.at)} {t.fromPlace} → {t.toPlace} ({t.meetingPoint ?? '-'})</li>)}
          {sessions.map(s => <li key={s.id}>세션: {s.title} — {fmtDate(s.date)} {s.startTime}~{s.endTime} @ {s.room}</li>)}
        </ul>
      </div>
    </>
  )
}

function TabsBar({ tabs, tab, setTab }: { tabs: string[]; tab: string; setTab: (t: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => (
        <button key={t} role="tab" aria-selected={t === tab} className="tab" onClick={() => setTab(t)}>{t}</button>
      ))}
    </div>
  )
}
