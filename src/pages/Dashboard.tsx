import { useApp } from '../store'
import { activeConference, computeRisks, kpis, readiness, speakersOf, tasksOf } from '../lib/metrics'
import { Card, Donut, Funnel, Gantt, HBars, StackBar, StatTile, Badge, Progress } from '../components/ui'
import { ddayLabel, flag, fmtDate, fmtDateTime, krwShort, pct, today } from '../lib/format'
import { go } from '../lib/router'
import { PIPELINE_ORDER } from '../types'

export function Dashboard() {
  const { state } = useApp()
  const conf = activeConference(state)
  const list = speakersOf(state)
  const k = kpis(state)
  const risks = computeRisks(state)
  const tasks = tasksOf(state)

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
    label: `${flag(s.country)} ${s.nameEn.replace(/^(Prof\.|Dr\.)\s/, '')}`,
    from: s.flights[0].arriveAt.slice(0, 10),
    to: s.flights[1]?.departAt.slice(0, 10) ?? conf.endDate,
    color: s.tier === 'Keynote' ? 'var(--s7)' : 'var(--s1)',
    note: `${s.flights[0].flightNo} 도착`,
  }))

  const budgetPct = pct(k.budgetCommitKRW, k.budgetPlanKRW)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{conf.nameKo}</h1>
          <p className="page-desc">
            {conf.nameEn} · {conf.venue} · 주최 {conf.host} / 주관 {conf.organizer} · 운영 {conf.pco}
            <br />개막 {fmtDate(conf.startDate)} ({ddayLabel(conf.startDate)}) · 예상 참가 {conf.expectedAttendees.toLocaleString()}명 · 트랙 {conf.tracks.length}개
          </p>
        </div>
        <div className="row-wrap no-print">
          <button className="btn" onClick={() => go('pipeline')}>초청 파이프라인</button>
          <button className="btn btn-primary" onClick={() => go('risks')}>리스크 점검 ({risks.length})</button>
        </div>
      </div>

      <div className="grid g5">
        <StatTile label="확정 연사" value={k.confirmed} unit="명"
          foot={`초청 발송 ${k.invited}명 · ${k.countries}개국 · 온라인 ${k.onlineCount}명`} bar={pct(k.confirmed, k.invited)} tone="good" />
        <StatTile label="초청 수락률" value={k.acceptRate} unit="%"
          foot={`응답 완료 기준 · 거절 ${list.filter(s => s.stage === '거절').length}명`} bar={k.acceptRate} tone="info" />
        <StatTile label="비자 발급 완료" value={`${k.visaDone}/${k.visaTotal}`}
          foot={`비자 필요 ${k.visaTotal}명 · 사증발급인정서 대상 ${visaCases.filter(s => s.visa.ccviRequired).length}명`}
          bar={pct(k.visaDone, k.visaTotal)} tone={k.visaDone < k.visaTotal ? 'warning' : 'good'} />
        <StatTile label="항공 발권" value={`${k.flightsTicketed}/${k.flightsNeeded}`}
          foot="요금 보장 마감 D-60 기준" bar={pct(k.flightsTicketed, k.flightsNeeded)}
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
        <Card title="비자·출입국 진행" sub={`비자 필요 ${visaCases.length}명 / 무비자·K-ETA ${list.filter(s => !s.visa.required && s.stage !== '거절').length}명`}>
          <Donut data={visaDist} centerValue={`${k.visaDone}/${k.visaTotal}`} centerLabel="발급 완료" />
        </Card>
        <Card title="국가·지역 분포" sub="초청 진행 중인 연사 기준">
          <HBars data={byCountry} unit="명" />
        </Card>
        <Card title="준비도 하위 연사" sub="수락·계약 완료 연사의 실무 완료율">
          {lowReady.map(({ s, r }) => (
            <div key={s.id} style={{ marginBottom: 10, cursor: 'pointer' }} onClick={() => go('speakers', s.id)}>
              <div className="row small" style={{ justifyContent: 'space-between' }}>
                <span className="trunc">{flag(s.country)} {s.nameEn}</span>
                <span className="num">{r.score}%</span>
              </div>
              <div className="bar"><span style={{ width: `${r.score}%`, background: r.score < 50 ? 'var(--critical)' : r.score < 80 ? 'var(--warning)' : 'var(--good)' }} /></div>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid g23">
        <Card title="연사 체류 일정" sub="입국 ~ 출국 기간 (빨간선 = 오늘)">
          {ganttRows.length ? (
            <Gantt rows={ganttRows} start={conf.startDate.slice(0, 8) + '01'} end={conf.endDate.slice(0, 8) + '30'} todayISO={today()} />
          ) : <div className="empty">발권 확정된 여정이 없습니다.</div>}
          <div className="legend" style={{ marginTop: 10 }}>
            <span><i style={{ background: 'var(--s7)' }} />기조연사</span>
            <span><i style={{ background: 'var(--s1)' }} />초청·패널</span>
          </div>
        </Card>
        <Card title="최근 변경 이력" sub="모든 데이터 변경은 자동 기록됩니다"
          right={<button className="btn btn-sm no-print" onClick={() => go('audit')}>전체</button>}>
          <div className="tl">
            {state.auditLogs.slice(0, 7).map(l => (
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

      <div className="grid g2">
        <Card title="마일스톤" sub="행사 기준 역산 일정">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>일정</th><th>D-day</th><th>마일스톤</th><th>단계</th><th>담당</th></tr></thead>
              <tbody>
                {conf.milestones.map(m => (
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
