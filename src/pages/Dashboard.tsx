import { useApp } from '../store'
import { activeConference, auditOf, computeRisks, kpis, readiness, speakersOf, tasksOf, validateAll } from '../lib/metrics'
import { Card, Donut, Funnel, Gantt, HBars, StackBar, StatTile, Badge, Progress } from '../components/ui'
import { ddayLabel, flag, fmtDate, fmtDateTime, krwShort, pct, today } from '../lib/format'
import { displayName, hasModule, labelsOf, overseasSpeakers } from '../lib/scope'
import { addDays } from '../data/seed'
import { go } from '../lib/router'
import { PIPELINE_ORDER } from '../types'
import { useState } from 'react'
import { NewSpeakerDialog, NewSessionDialog, NewConferenceDialog } from '../components/Create'

export function Dashboard() {
  const { state } = useApp()
  const [addSpeaker, setAddSpeaker] = useState(false)
  const [addSession, setAddSession] = useState(false)
  const [addConf, setAddConf] = useState(false)
  const conf = activeConference(state)
  const list = speakersOf(state)
  const k = kpis(state)
  const risks = computeRisks(state)
  const tasks = tasksOf(state)
  const labels = labelsOf(conf)
  const overseas = overseasSpeakers(state)
  const regs = state.registrations.filter(r => r.conferenceId === conf.id)
  const abs = state.abstracts.filter(a => a.conferenceId === conf.id)
  const spons = state.sponsors.filter(x => x.conferenceId === conf.id)
  const credits = state.creditPrograms.filter(c => c.conferenceId === conf.id)
  const quality = validateAll(state)
  const qErr = quality.flatMap(x => x.issues).filter(i => i.level === '오류')
  const attendanceSeg = (['참석확정', '참석미정', '불참', '취소'] as const).map((a, i) => ({
    label: a, value: list.filter(s => s.attendance === a).length,
    color: ['var(--s3)', 'var(--s4)', 'var(--s8)', 'var(--surface-3)'][i],
  }))
  const sponsorSeg = (['Sponsored', '부분지원', 'Non-Sponsored'] as const).map((a, i) => ({
    label: a, value: list.filter(s => s.sponsorship === a && s.stage !== '거절').length,
    color: ['var(--s1)', 'var(--s4)', 'var(--surface-3)'][i],
  }))

  const visaCases = list.filter(s => s.visa.required && s.stage !== '거절')
  const visaDist = [
    { label: '발급완료', value: visaCases.filter(s => s.visa.stage === '발급완료').length, color: 'var(--s3)' },
    { label: '영사관 접수·인터뷰', value: visaCases.filter(s => ['영사관접수', '인터뷰'].includes(s.visa.stage)).length, color: 'var(--s1)' },
    { label: '인정서·서류 단계', value: visaCases.filter(s => ['서류수령', '초청장발급', '사증발급인정서신청', '사증발급인정서발급'].includes(s.visa.stage)).length, color: 'var(--s4)' },
    { label: '서류 미수취', value: visaCases.filter(s => ['판정대기', '서류요청'].includes(s.visa.stage)).length, color: 'var(--s8)' },
  ]

  const byCountry = Object.entries(
    list.filter(s => s.stage !== '거절').reduce<Record<string, number>>((a, s) => { a[s.country] = (a[s.country] ?? 0) + 1; return a }, {}),
  ).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ label: `${flag(c)} ${c}`, value: n }))

  const phaseRows = ['기획·세팅', '발굴·선정', '초청·계약', '출입국·비자', '여행·의전', '콘텐츠·발표', '현장운영', '정산·사후']
    .map(p => {
      const t = tasks.filter(x => x.phase === p)
      return {
        phase: p,
        done: t.filter(x => x.status === '완료').length,
        wip: t.filter(x => x.status === '진행중').length,
        late: t.filter(x => x.status === '지연' || (x.status !== '완료' && x.dueDate < today())).length,
        total: t.length,
      }
    }).filter(r => r.total > 0)

  const lowReady = list.filter(s => ['수락', '계약완료'].includes(s.stage))
    .map(s => ({ s, r: readiness(s) })).sort((a, b) => a.r.score - b.r.score).slice(0, 6)

  const ganttRows = list.filter(s => s.flights.length).slice(0, 8).map(s => ({
    label: `${s.residency === '해외' ? flag(s.country) : '🇰🇷'} ${displayName(s).replace(/^(Prof\.|Dr\.)\s/, '')}`,
    from: s.flights[0].arriveAt.slice(0, 10),
    to: s.flights[1]?.departAt.slice(0, 10) ?? conf.endDate,
    color: s.tier === 'Keynote' ? 'var(--s7)' : 'var(--s1)',
    note: `${s.flights[0].flightNo} 도착`,
  }))

  // 간트 범위: 가장 이른 입국 ~ 가장 늦은 출국(없으면 행사 전후 여유) — 월 길이에 의존하지 않는다.
  const ganttStart = ganttRows.length
    ? [...ganttRows.map(r => r.from), addDays(conf.startDate, -3)].sort()[0]
    : addDays(conf.startDate, -14)
  const ganttEnd = ganttRows.length
    ? [...ganttRows.map(r => r.to), addDays(conf.endDate, 3)].sort().slice(-1)[0]
    : addDays(conf.endDate, 7)

  const budgetPct = pct(k.budgetCommitKRW, k.budgetPlanKRW)
  const confSessions = state.sessions.filter(x => x.conferenceId === conf.id)
  /** 새로 만든 행사는 장소·주최가 비어 있을 수 있으므로 빈 값은 구분자와 함께 생략한다 */
  const confMeta = [
    conf.nameEn, conf.venue || conf.city,
    conf.host ? `주최 ${conf.host}${conf.organizer && conf.organizer !== conf.host ? ` / 주관 ${conf.organizer}` : ''}` : '',
    conf.pco ? `운영 ${conf.pco}` : '',
  ].filter(Boolean).join(' · ')

  if (list.length === 0) {
    return (
      <>
        <NewSpeakerDialog open={addSpeaker} onClose={() => setAddSpeaker(false)} />
        <NewSessionDialog open={addSession} onClose={() => setAddSession(false)} />
        <NewConferenceDialog open={addConf} onClose={() => setAddConf(false)} />
        <div className="page-head">
          <div>
            <h1 className="page-title">{conf.nameKo}</h1>
            <p className="page-desc">
              {[conf.scope, conf.venue || conf.city].filter(Boolean).join(' · ')} · 개막 {fmtDate(conf.startDate)} ({ddayLabel(conf.startDate)})
              <br />아직 등록된 {labels.speaker}가 없습니다. 아래 순서대로 행사 준비를 시작하세요.
            </p>
          </div>
        </div>

        <Card title="행사 준비 시작하기" sub="① 행사 정보 → ② 세션/프로그램 → ③ 연자 등록 순으로 진행하면 체크리스트·일정·리스크가 자동 생성됩니다.">
          <div className="start-steps">
            <div className="start-step">
              <div className="start-num">1</div>
              <div style={{ flex: 1 }}>
                <strong>행사 기본 정보 · 모듈</strong>
                <p className="muted small">국내/국제 구분, 사용할 업무 모듈(초록심사·연수평점·참가등록 등), 일정·장소·예산을 확인합니다.</p>
                <div className="row-wrap">
                  <button className="btn btn-sm" onClick={() => go('settings')}>행사 설정 열기</button>
                  <button className="btn btn-sm" onClick={() => setAddConf(true)}>＋ 다른 행사 새로 만들기</button>
                </div>
              </div>
            </div>
            <div className="start-step">
              <div className="start-num">2</div>
              <div style={{ flex: 1 }}>
                <strong>세션 · 프로그램 구성</strong>
                <p className="muted small">
                  현재 {confSessions.length}개 세션. 세션을 먼저 만들면 연자 배정과 제출물 기한이 자동으로 연동됩니다.
                </p>
                <div className="row-wrap">
                  <button className="btn btn-sm btn-primary" onClick={() => setAddSession(true)}>＋ 세션 추가</button>
                  <button className="btn btn-sm" onClick={() => go('sessions')}>세션 목록</button>
                </div>
              </div>
            </div>
            <div className="start-step">
              <div className="start-num">3</div>
              <div style={{ flex: 1 }}>
                <strong>{labels.speaker} 등록</strong>
                <p className="muted small">
                  연자를 등록하면 {conf.scope === '국제' ? '사증·항공·숙박·해외송금' : '교통·숙박·원고·동의서'} 업무와 제출물 체크리스트가 자동 생성됩니다.
                </p>
                <div className="row-wrap">
                  <button className="btn btn-sm btn-primary" onClick={() => setAddSpeaker(true)}>＋ {labels.speaker} 추가</button>
                  <button className="btn btn-sm" onClick={() => go('pipeline')}>초청 파이프라인</button>
                </div>
              </div>
            </div>
            <div className="start-step">
              <div className="start-num">4</div>
              <div style={{ flex: 1 }}>
                <strong>공동 작업자 초대</strong>
                <p className="muted small">사무국·여행사·재무 담당자를 역할별로 초대하면 같은 데이터를 실시간으로 함께 보며 작업합니다.</p>
                <div className="row-wrap">
                  <button className="btn btn-sm" onClick={() => go('settings')}>멤버 초대</button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <NewSpeakerDialog open={addSpeaker} onClose={() => setAddSpeaker(false)} />
      <div className="page-head">
        <div>
          <h1 className="page-title">{conf.nameKo}</h1>
          <p className="page-desc">
            {confMeta}
            {confMeta && <br />}개막 {fmtDate(conf.startDate)} ({ddayLabel(conf.startDate)}) · 예상 참가 {conf.expectedAttendees.toLocaleString()}명 · 트랙 {conf.tracks.length}개
          </p>
        </div>
        <div className="row-wrap no-print">
          <button className="btn btn-primary" onClick={() => setAddSpeaker(true)}>＋ {labels.speaker} 추가</button>
          <button className="btn" onClick={() => go('pipeline')}>초청 파이프라인</button>
          <button className="btn btn-primary" onClick={() => go('risks')}>리스크 점검 ({risks.length})</button>
        </div>
      </div>

      <div className="grid g5">
        <StatTile label={`확정 ${labels.speaker}`} value={k.confirmed} unit="명"
          foot={`${labels.invite} 발송 ${k.invited}명 · 해외 ${overseas.length}명 · 온라인 ${k.onlineCount}명`} bar={pct(k.confirmed, k.invited)} tone="good" />
        <StatTile label={`${labels.invite} 수락률`} value={k.acceptRate} unit="%"
          foot={`응답 완료 기준 · 거절 ${list.filter(s => s.stage === '거절').length}명`} bar={k.acceptRate} tone="info" />
        {k.visaTotal > 0 ? (
          <StatTile label="사증 발급 완료" value={`${k.visaDone}/${k.visaTotal}`}
            foot={`해외 연자 ${overseas.length}명 · 사증 필요 ${k.visaTotal}명`}
            bar={pct(k.visaDone, k.visaTotal)} tone={k.visaDone < k.visaTotal ? 'warning' : 'good'} />
        ) : hasModule(conf, '참가등록') ? (
          <StatTile label="사전 등록" value={regs.filter(r => r.channel === '사전등록').length} unit="명"
            foot={`목표 ${Math.round(conf.expectedAttendees * 0.75)}명 · 수납률 ${pct(regs.filter(r => r.paid).length, regs.length)}%`}
            bar={pct(regs.length, Math.round(conf.expectedAttendees * 0.75))} tone="info" />
        ) : (
          <StatTile label="제출물 검수" value={`${k.docDone}/${k.docTotal}`} bar={pct(k.docDone, k.docTotal)} tone="info" foot="연자 제출 서류" />
        )}
        <StatTile label="교통 확정" value={`${k.flightsTicketed}/${k.flightsNeeded}`}
          foot={overseas.length > 0 ? '국제선 요금 보장 마감 D-60 기준' : 'KTX·국내선·자가용 포함'}
          bar={pct(k.flightsTicketed, k.flightsNeeded)}
          tone={k.flightsTicketed < k.flightsNeeded ? 'serious' : 'good'} />
        <StatTile label="초청 예산 집행(약정)" value={krwShort(k.budgetCommitKRW)} unit="원"
          foot={`계획 ${krwShort(k.budgetPlanKRW)}원 · 집행률 ${budgetPct}%`} bar={budgetPct}
          tone={budgetPct > 95 ? 'critical' : 'info'} />
      </div>

      <div className="grid g23">
        <Card title="초청 파이프라인 퍼널" sub="단계별 누적 인원 (오른쪽 숫자는 직전 단계 대비 이탈)"
          right={<button className="btn btn-sm no-print" onClick={() => go('pipeline')}>보드 열기</button>}>
          <Funnel steps={PIPELINE_ORDER.map(s => ({ label: s, value: k.pipeline.find(p => p.stage === s)?.count ?? 0 }))} />
          <div className="legend" style={{ marginTop: 12 }}>
            <span>거절 {list.filter(s => s.stage === '거절').length}명</span>
            <span>응답 대기 {list.filter(s => s.stage === '공식초청').length}명</span>
            <span>대체 후보 {list.filter(s => ['후보발굴', '내부승인'].includes(s.stage)).length}명</span>
          </div>
        </Card>

        <Card title="긴급 리스크" sub={`즉시 조치 ${risks.filter(r => r.level === 'critical').length}건 · 주의 ${risks.filter(r => r.level === 'serious').length}건`}
          right={<button className="btn btn-sm no-print" onClick={() => go('risks')}>전체</button>}>
          {risks.slice(0, 6).map(r => (
            <div key={r.id} className={`alert alert-${r.level === 'warning' ? 'warning' : 'critical'}`} style={{ marginBottom: 8, cursor: 'pointer' }}
              onClick={() => go('speakers', r.speakerId)}>
              <span aria-hidden>{r.level === 'critical' ? '⛔' : r.level === 'serious' ? '⚠' : '•'}</span>
              <span>
                <strong>{r.speakerName}</strong> · {r.title}
                <br /><span className="xsmall">{r.detail}</span>
              </span>
            </div>
          ))}
          {!risks.length && <div className="empty">감지된 리스크가 없습니다.</div>}
        </Card>
      </div>

      <div className="grid g3">
        {k.visaTotal > 0 ? (
          <Card title="사증·출입국 진행" sub={`해외 연자 ${overseas.length}명 중 사증 필요 ${visaCases.length}명`}>
            <Donut data={visaDist} centerValue={`${k.visaDone}/${k.visaTotal}`} centerLabel="발급 완료" />
          </Card>
        ) : (
          <Card title="제출물 진행" sub="연자 제출 서류 검수 현황">
            <Donut centerValue={`${k.docDone}/${k.docTotal}`} centerLabel="검수 완료" data={[
              { label: '검수완료', value: k.docDone, color: 'var(--s3)' },
              { label: '제출(검수 전)', value: list.flatMap(s => s.deliverables).filter(d => d.status === '제출').length, color: 'var(--s1)' },
              { label: '요청함', value: list.flatMap(s => s.deliverables).filter(d => d.status === '요청함').length, color: 'var(--s4)' },
              { label: '미요청·기한초과', value: list.flatMap(s => s.deliverables).filter(d => ['요청전', '기한초과'].includes(d.status)).length, color: 'var(--s8)' },
            ]} />
          </Card>
        )}
        <Card title="국가·지역 분포" sub="초청 진행 중인 연사 기준">
          {byCountry.length ? <HBars data={byCountry} unit="명" /> : <div className="empty">등록된 초청자가 없습니다.</div>}
        </Card>
        <Card title="준비도 하위 연사" sub="수락·계약 완료 연사의 실무 완료율">
          {!lowReady.length && <div className="empty">수락 완료된 연사가 없습니다.</div>}
          {lowReady.map(({ s, r }) => (
            <div key={s.id} style={{ marginBottom: 10, cursor: 'pointer' }} onClick={() => go('speakers', s.id)}>
              <div className="row small" style={{ justifyContent: 'space-between' }}>
                <span className="trunc">{flag(s.country)} {displayName(s)}</span>
                <span className="num">{r.score}%</span>
              </div>
              <div className="bar"><span style={{ width: `${r.score}%`, background: r.score < 50 ? 'var(--critical)' : r.score < 80 ? 'var(--warning)' : 'var(--good)' }} /></div>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid g23">
        <Card title="연자 체류 일정" sub="입국 ~ 출국 기간 (빨간선 = 오늘)">
          {ganttRows.length ? (
            <Gantt rows={ganttRows} start={ganttStart} end={ganttEnd} todayISO={today()} />
          ) : <div className="empty">발권 확정된 여정이 없습니다.</div>}
          <div className="legend" style={{ marginTop: 10 }}>
            <span><i style={{ background: 'var(--s7)' }} />기조연사</span>
            <span><i style={{ background: 'var(--s1)' }} />초청·패널</span>
          </div>
        </Card>
        <Card title="최근 변경 이력" sub="모든 데이터 변경은 자동 기록됩니다"
          right={<button className="btn btn-sm no-print" onClick={() => go('audit')}>전체</button>}>
          <div className="tl">
            {!auditOf(state).length && <div className="empty">변경 이력이 없습니다.</div>}
            {auditOf(state).slice(0, 7).map(l => (
              <div className="tl-item" key={l.id}>
                <span className="xsmall muted num">{fmtDateTime(l.at).slice(5)}</span>
                <span className="tl-dot" />
                <span className="small">
                  <strong>{l.entityLabel}</strong> · {l.field ?? l.action}
                  {l.before && <> <span className="muted">{l.before}</span> → </>}
                  {l.after && <strong>{l.after}</strong>}
                  <br /><span className="xsmall muted">{l.actor} · {l.entityType}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="업무 단계별 진행" sub={`전체 ${k.taskTotal}건 · 완료 ${k.taskDone}건 · 기한 경과 ${k.taskOverdue}건`}
        right={<button className="btn btn-sm no-print" onClick={() => go('tasks')}>업무 보드</button>}>
        <div className="grid g4">
          {phaseRows.map(r => (
            <div key={r.phase}>
              <div className="row small" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>{r.phase}</strong>
                {r.late > 0 ? <Badge tone="critical">지연 {r.late}</Badge> : <Badge tone="good">정상</Badge>}
              </div>
              <StackBar segments={[
                { label: '완료', value: r.done, color: 'var(--s3)' },
                { label: '진행중', value: r.wip, color: 'var(--s1)' },
                { label: '지연', value: r.late, color: 'var(--s8)' },
                { label: '대기', value: Math.max(r.total - r.done - r.wip - r.late, 0), color: 'var(--surface-3)' },
              ]} />
            </div>
          ))}
        </div>
      </Card>

      {(hasModule(conf, '참가등록') || hasModule(conf, '초록심사') || hasModule(conf, '연수평점') || hasModule(conf, '후원·전시')) && (
        <div className="grid g4">
          {hasModule(conf, '참가등록') && (
            <Card title="참가 등록" sub={`목표 ${Math.round(conf.expectedAttendees * 0.75)}명`}
              right={<button className="btn btn-sm no-print" onClick={() => go('registrations')}>열기</button>}>
              <div className="stat">
                <div className="stat-value">{regs.length}<span className="stat-unit">명</span></div>
                <div className="bar"><span style={{ width: `${Math.min(100, pct(regs.length, Math.round(conf.expectedAttendees * 0.75)))}%` }} /></div>
                <div className="stat-foot">사전 {regs.filter(r => r.channel === '사전등록').length} · 미납 {regs.filter(r => !r.paid && r.fee > 0).length}건</div>
              </div>
            </Card>
          )}
          {hasModule(conf, '초록심사') && (
            <Card title="초록 심사" sub={`채택률 ${pct(abs.filter(a => a.status === '채택').length, abs.length)}%`}
              right={<button className="btn btn-sm no-print" onClick={() => go('abstracts')}>열기</button>}>
              <div className="stat">
                <div className="stat-value">{abs.filter(a => a.status === '채택').length}<span className="stat-unit">/{abs.length}편</span></div>
                <div className="bar"><span style={{ width: `${pct(abs.filter(a => a.status === '채택').length, abs.length)}%`, background: 'var(--s3)' }} /></div>
                <div className="stat-foot">심사 미완 {abs.filter(a => ['심사중', '수정요청'].includes(a.status)).length}편</div>
              </div>
            </Card>
          )}
          {hasModule(conf, '연수평점') && (
            <Card title="연수평점" sub={conf.creditAuthority}
              right={<button className="btn btn-sm no-print" onClick={() => go('credits')}>열기</button>}>
              <div className="stat">
                <div className="stat-value">{credits.filter(c => c.status === '승인').reduce((a, c) => a + (c.approvedCredits ?? 0), 0)}<span className="stat-unit">평점</span></div>
                <div className="stat-foot">
                  심사 중 {credits.filter(c => ['신청', '심사중'].includes(c.status)).length}건 ·
                  면허번호 누락 {regs.filter(r => !r.licenseNo && !['학생', '스태프', '후원사'].includes(r.type)).length}명
                </div>
              </div>
            </Card>
          )}
          {hasModule(conf, '후원·전시') && (
            <Card title="후원·전시" sub={`${spons.length}개사`}
              right={<button className="btn btn-sm no-print" onClick={() => go('sponsors')}>열기</button>}>
              <div className="stat">
                <div className="stat-value">{krwShort(spons.filter(x => x.contractStatus === '입금완료').reduce((a, x) => a + x.amount, 0))}<span className="stat-unit">원</span></div>
                <div className="bar"><span style={{ width: `${pct(spons.filter(x => x.contractStatus === '입금완료').reduce((a, x) => a + x.amount, 0), spons.reduce((a, x) => a + x.amount, 0))}%`, background: 'var(--s3)' }} /></div>
                <div className="stat-foot">미계약 {spons.filter(x => ['제안', '협의'].includes(x.contractStatus)).length}건</div>
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="grid g2">
        <Card title="참석 · 지원 구분 현황" sub="초청 수락과 별개로 실제 참석 여부를 따로 관리합니다">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div className="small sec" style={{ marginBottom: 6 }}>참석 상태</div>
              <StackBar height={12} segments={attendanceSeg} valueFormat={n => `${n}명`} />
            </div>
            <div>
              <div className="small sec" style={{ marginBottom: 6 }}>비용 지원 구분</div>
              <StackBar height={12} segments={sponsorSeg} valueFormat={n => `${n}명`} />
            </div>
            <div className="dl">
              <dt>동반자</dt><dd>{list.reduce((a, s) => a + s.companions.length, 0)}명 (별도 객실 {list.flatMap(s => s.companions).filter(c => !c.shareRoom).length}건)</dd>
              <dt>프로그램 등록</dt><dd>{list.flatMap(s => s.programs).filter(p => p.status === '등록').length}건 · 대기 {list.flatMap(s => s.programs).filter(p => p.status === '대기').length}건</dd>
            </div>
          </div>
        </Card>
        <Card title={`데이터 정합성 ${qErr.length ? `오류 ${qErr.length}건` : quality.length ? `확인 ${quality.flatMap(x => x.issues).length}건` : '이상 없음'}`}
          sub="여권명↔항공 탑승자명, 체류↔숙박 기간 등 교차 검증"
          right={<button className="btn btn-sm no-print" onClick={() => go('risks')}>전체</button>}>
          {quality.slice(0, 5).map(({ speaker, issues }) => (
            <div key={speaker.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
              onClick={() => go('speakers', speaker.id)}>
              <div className="row small" style={{ justifyContent: 'space-between' }}>
                <span className="trunc">{flag(speaker.country)} {displayName(speaker)}</span>
                <span className="row" style={{ gap: 4 }}>
                  {issues.some(i => i.level === '오류') && <Badge tone="critical">오류 {issues.filter(i => i.level === '오류').length}</Badge>}
                  {issues.some(i => i.level !== '오류') && <Badge tone="warning">확인 {issues.filter(i => i.level !== '오류').length}</Badge>}
                </span>
              </div>
              <div className="xsmall muted trunc">{issues[0].field} · {issues[0].message}</div>
            </div>
          ))}
          {!quality.length && <div className="empty">검증 오류가 없습니다.</div>}
        </Card>
      </div>

      <div className="grid g2">
        <Card title="마일스톤" sub="행사 기준 역산 일정">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>일정</th><th>D-day</th><th>마일스톤</th><th>단계</th><th>담당</th></tr></thead>
              <tbody>
                {[...conf.milestones].sort((a, b) => a.date.localeCompare(b.date)).map(m => (
                  <tr key={m.id}>
                    <td className="num nowrap">{fmtDate(m.date)}</td>
                    <td className="num nowrap"><Badge tone={m.date < today() ? 'neutral' : 'info'}>{ddayLabel(m.date)}</Badge></td>
                    <td>{m.label}</td>
                    <td className="small muted nowrap">{m.phase}</td>
                    <td className="small nowrap">{state.members.find(x => x.id === m.owner)?.name ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="제출물·정산 요약">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Progress label="제출물 검수 완료" value={k.docDone} total={k.docTotal} tone="info" />
            <Progress label="업무 완료" value={k.taskDone} total={k.taskTotal} tone="good" />
            <div className="dl" style={{ marginTop: 4 }}>
              <dt>강연료 합계</dt><dd className="num">{krwShort(k.honorariumKRW)}원</dd>
              <dt>원천징수 예상</dt><dd className="num">{krwShort(k.withholdingKRW)}원 <span className="xsmall muted">(조세조약 적용 반영)</span></dd>
              <dt>실비 약정</dt><dd className="num">{krwShort(k.budgetCommitKRW - k.honorariumKRW)}원</dd>
              <dt>예산 잔액</dt><dd className="num">{krwShort(k.budgetPlanKRW - k.budgetCommitKRW)}원</dd>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
