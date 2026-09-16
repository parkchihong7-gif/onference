import { useApp } from '../store'
import { activeConference } from '../lib/metrics'
import { Badge, Card, DL, StatTile } from '../components/ui'
import { fmtDate, krw } from '../lib/format'

export function Settings() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)

  const reset = () => {
    if (confirm('로컬 저장 데이터를 초기 시드 상태로 되돌립니다. 계속할까요?')) dispatch({ type: 'RESET' })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">행사 설정·템플릿</h1>
          <p className="page-desc">
            행사 기본 정보, 등급별 지원 패키지, 체크리스트 템플릿, 권한(역할) 구성을 관리합니다.
            초기 세팅에서 템플릿을 확정하면 신규 연사 등록 시 업무·제출물·기한이 자동 생성됩니다.
          </p>
        </div>
        <button className="btn no-print" onClick={reset}>↺ 데모 데이터 초기화</button>
      </div>

      <div className="grid g4">
        <StatTile label="등록 행사" value={state.conferences.length} unit="건" foot="진행 중 · 기획 · 종료 포함" />
        <StatTile label="지원 패키지" value={state.supportPackages.length} unit="종" foot="등급별 지원 범위" />
        <StatTile label="체크리스트 템플릿" value={state.checklistTemplates.reduce((a, t) => a + t.items.length, 0)} unit="항목"
          foot={`${state.checklistTemplates.length}개 템플릿`} />
        <StatTile label="구성원" value={state.members.length} unit="명" foot={`${new Set(state.members.map(m => m.role)).size}개 역할`} />
      </div>

      <div className="grid g2">
        <Card title="행사 기본 정보">
          <DL items={[
            ['행사명(국문)', conf.nameKo], ['행사명(영문)', conf.nameEn], ['코드', conf.code],
            ['기간', `${fmtDate(conf.startDate)} ~ ${fmtDate(conf.endDate)}`],
            ['장소', `${conf.venue} · ${conf.city}, ${conf.country}`],
            ['타임존', conf.timezone],
            ['주최/주관', `${conf.host} / ${conf.organizer}`],
            ['운영대행(PCO)', conf.pco],
            ['후원', conf.sponsors.join(', ')],
            ['트랙', conf.tracks.join(' · ')],
            ['예상 참가', `${conf.expectedAttendees.toLocaleString()}명`],
            ['총 예산 / 초청 예산', `${krw(conf.budgetTotalKRW)} / ${krw(conf.invitationBudgetKRW)}`],
            ['상태', <Badge tone="info">{conf.status}</Badge>],
          ]} />
        </Card>
        <Card title="권한(역할) 구성" sub="역할별로 접근 가능한 데이터 범위를 분리합니다">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>이름</th><th>역할</th><th>소속</th><th>연락처</th></tr></thead>
              <tbody>
                {state.members.map(m => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td><Badge tone="neutral">{m.role}</Badge></td>
                    <td className="small">{m.org}</td>
                    <td className="small num">{m.phone ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="xsmall muted" style={{ paddingLeft: 16, marginTop: 10, lineHeight: 1.8 }}>
            <li><strong>사무국</strong> — 전체 데이터 및 예산·정산 접근</li>
            <li><strong>PCO</strong> — 연사 실무(제출물·현장·배차), 정산 금액 비공개</li>
            <li><strong>리에종</strong> — 담당 연사 전체 · 타 연사 열람 제한</li>
            <li><strong>여행사</strong> — 항공·숙박·배차 및 필요한 여권 정보만</li>
            <li><strong>재무</strong> — 정산·세무·송금 정보</li>
            <li><strong>연사</strong> — 본인 제출물·일정 확인(연사 포털)</li>
          </ul>
        </Card>
      </div>

      <Card title="등급별 지원 패키지" sub="초청 시 자동 적용되는 지원 범위 템플릿">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>패키지</th><th>등급</th><th>항공</th><th>발권</th><th>숙박</th><th>정산</th><th className="right">일비</th><th className="right">강연료</th><th>지상교통</th><th>동반자</th><th>보험</th></tr></thead>
            <tbody>
              {state.supportPackages.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong>{p.notes && <div className="xsmall muted">{p.notes}</div>}</td>
                  <td className="small">{p.tier}</td>
                  <td className="small">{p.airCabin}</td>
                  <td className="small nowrap">{p.airTicketedBy}</td>
                  <td className="small nowrap">{p.hotelNights}박 · {p.hotelGrade}</td>
                  <td className="small nowrap">{p.hotelBilling}</td>
                  <td className="right num">{krw(p.perDiemKRW)}</td>
                  <td className="right num">{krw(p.honorariumKRW)}</td>
                  <td className="small">{p.groundTransfer ? '제공' : '-'}</td>
                  <td className="small">{p.companionSupported ? (p.companionScope ?? '지원') : '-'}</td>
                  <td className="small">{p.insurance ? '가입' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {state.checklistTemplates.map(t => (
        <Card key={t.id} title={`체크리스트 템플릿 · ${t.name}`} sub={`${t.items.length}개 항목 · 적용 대상 ${t.appliesTo === 'ALL' ? '전 등급' : (t.appliesTo as string[]).join(', ')}`}>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>#</th><th>업무</th><th>단계</th><th>기한(행사일 기준)</th><th>담당 역할</th></tr></thead>
              <tbody>
                {t.items.map((it, i) => (
                  <tr key={it.title}>
                    <td className="num muted">{i + 1}</td>
                    <td>{it.title}</td>
                    <td className="small muted">{it.phase}</td>
                    <td className="num small">{it.offsetDays >= 0 ? `D+${it.offsetDays}` : `D${it.offsetDays}`}</td>
                    <td className="small"><Badge tone="neutral">{it.ownerRole}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <Card title="데이터 취급 안내">
        <ul className="small sec" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.85 }}>
          <li>본 대시보드는 <strong>내부 운영용(비배포)</strong>으로, 데이터는 브라우저 로컬 스토리지에만 저장됩니다.</li>
          <li>여권번호·계좌번호 등 민감정보는 화면에서 마스킹되며, 원본 문서는 별도 문서고에서 접근 권한을 통제합니다.</li>
          <li>유럽(EEA) 거주 연사 데이터는 GDPR 적용 대상으로, 수집 목적·보유기간 고지와 동의 기록이 필요합니다.</li>
          <li>행사 종료 후 보유기간이 경과한 개인정보는 파기 대상으로 분류합니다.</li>
        </ul>
      </Card>
    </>
  )
}
