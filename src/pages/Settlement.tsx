import { useApp } from '../store'
import { activeConference, speakersOf } from '../lib/metrics'
import { Badge, Card, HBars, StatTile, StackBar } from '../components/ui'
import { flag, krw, krwShort, pct } from '../lib/format'
import { go } from '../lib/router'
import { downloadCsv } from '../lib/csv'

export function Settlement() {
  const { state } = useApp()
  const conf = activeConference(state)
  const list = speakersOf(state).filter(s => ['수락', '계약완료'].includes(s.stage))

  const honorarium = list.reduce((a, s) => a + s.settlement.honorarium, 0)
  const withholding = list.reduce((a, s) => a + Math.round(s.settlement.honorarium * s.settlement.withholdingRate / 100), 0)
  const expenses = list.flatMap(s => s.settlement.expenses)
  const expTotal = expenses.reduce((a, e) => a + e.amountKRW, 0)
  const committed = honorarium + expTotal
  const byCat = ['항공', '숙박', '지상교통', '비자수수료', '식비', '보험', '기타'].map(c => ({
    label: c, value: Math.round(expenses.filter(e => e.category === c).reduce((a, e) => a + e.amountKRW, 0) / 10000),
  })).filter(x => x.value > 0)

  const treatyApplied = list.filter(s => s.settlement.taxTreatyApplied)
  const corMissing = treatyApplied.filter(s => !s.settlement.corReceived)

  const exportCsv = () => downloadCsv(`${conf.code}_연사정산내역.csv`, [
    ['연사', '국가', '등급', '강연료(원)', '원천징수율(%)', '원천세액(원)', '실지급액(원)', '조세조약', '거주자증명서', '실비합계(원)', '총액(원)', '송금은행', 'SWIFT'],
    ...list.map(s => {
      const exp = s.settlement.expenses.reduce((a, e) => a + e.amountKRW, 0)
      const tax = Math.round(s.settlement.honorarium * s.settlement.withholdingRate / 100)
      return [s.nameEn, s.country, s.tier, s.settlement.honorarium, s.settlement.withholdingRate, tax,
        s.settlement.honorarium - tax, s.settlement.taxTreatyApplied ? 'Y' : 'N', s.settlement.corReceived ? 'Y' : 'N',
        exp, s.settlement.honorarium + exp, s.settlement.remittance?.bankName, s.settlement.remittance?.swift]
    }),
  ])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">정산·예산</h1>
          <p className="page-desc">
            강연료(원천징수·조세조약 반영), 항공·숙박·지상교통 실비, 해외 송금 정보를 연사 단위로 집계합니다.
            비거주자 강연료는 기본 22%를 원천징수하며, 조세조약 제한세율은 거주자증명서 수령 시 적용합니다.
          </p>
        </div>
        <button className="btn no-print" onClick={exportCsv}>⬇ 정산 내역 내보내기</button>
      </div>

      <div className="grid g5">
        <StatTile label="초청 예산" value={krwShort(conf.invitationBudgetKRW)} unit="원" foot={`전체 행사 예산 ${krwShort(conf.budgetTotalKRW)}원`} />
        <StatTile label="약정 집행" value={krwShort(committed)} unit="원" bar={pct(committed, conf.invitationBudgetKRW)}
          tone={pct(committed, conf.invitationBudgetKRW) > 95 ? 'critical' : 'info'} foot={`집행률 ${pct(committed, conf.invitationBudgetKRW)}%`} />
        <StatTile label="강연료 합계" value={krwShort(honorarium)} unit="원" foot={`${list.length}명 · 평균 ${krwShort(Math.round(honorarium / Math.max(list.length, 1)))}원`} />
        <StatTile label="원천세 예상" value={krwShort(withholding)} unit="원" foot={`실지급 ${krwShort(honorarium - withholding)}원`} tone="warning" />
        <StatTile label="예산 잔액" value={krwShort(conf.invitationBudgetKRW - committed)} unit="원"
          tone={conf.invitationBudgetKRW - committed < 0 ? 'critical' : 'good'} foot="약정 기준(미발생 포함)" />
      </div>

      <div className="grid g2">
        <Card title="비목별 실비(약정)" sub="단위: 만원">
          <HBars data={byCat} unit="만원" />
        </Card>
        <Card title="예산 구성" sub="강연료 vs 실비">
          <StackBar height={14} valueFormat={n => `${krwShort(n)}원`} segments={[
            { label: '강연료', value: honorarium, color: 'var(--s1)' },
            { label: '항공', value: expenses.filter(e => e.category === '항공').reduce((a, e) => a + e.amountKRW, 0), color: 'var(--s2)' },
            { label: '숙박', value: expenses.filter(e => e.category === '숙박').reduce((a, e) => a + e.amountKRW, 0), color: 'var(--s3)' },
            { label: '기타', value: expenses.filter(e => !['항공', '숙박'].includes(e.category)).reduce((a, e) => a + e.amountKRW, 0), color: 'var(--s4)' },
            { label: '예산 잔액', value: Math.max(conf.invitationBudgetKRW - committed, 0), color: 'var(--surface-3)' },
          ]} />
          <div className="dl" style={{ marginTop: 16 }}>
            <dt>조세조약 적용</dt><dd>{treatyApplied.length}명 (거주자증명서 미수령 {corMissing.length}명)</dd>
            <dt>지급 예정일</dt><dd>행사 종료 후 14영업일 이내</dd>
            <dt>송금 수수료</dt><dd>주최 부담(OUR) 기준</dd>
          </div>
        </Card>
      </div>

      {corMissing.length > 0 && (
        <div className="alert alert-warning">
          <span aria-hidden>⚠</span>
          <span>
            <strong>거주자증명서 미수령 {corMissing.length}명</strong> — {corMissing.map(s => s.nameEn).join(', ')}.
            미수령 시 제한세율 적용이 불가하여 기본 22% 원천징수 후 경정청구 절차를 안내해야 합니다.
          </span>
        </div>
      )}

      <Card title="연사별 정산 내역">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>연사</th><th>등급</th><th className="right">강연료</th><th className="right">원천징수율</th><th className="right">원천세</th><th className="right">실지급</th>
                <th>조세조약</th><th>증명서</th><th className="right">실비</th><th className="right">총액</th><th>송금 정보</th></tr>
            </thead>
            <tbody>
              {list.map(s => {
                const tax = Math.round(s.settlement.honorarium * s.settlement.withholdingRate / 100)
                const exp = s.settlement.expenses.reduce((a, e) => a + e.amountKRW, 0)
                return (
                  <tr key={s.id} className="clickable" onClick={() => go('speakers', s.id)}>
                    <td>{flag(s.country)} {s.nameEn}</td>
                    <td className="small">{s.tier}</td>
                    <td className="right num">{krw(s.settlement.honorarium)}</td>
                    <td className="right num">{s.settlement.withholdingRate}%</td>
                    <td className="right num">{krw(tax)}</td>
                    <td className="right num">{krw(s.settlement.honorarium - tax)}</td>
                    <td>{s.settlement.taxTreatyApplied ? <Badge tone="good">적용</Badge> : <Badge tone="neutral">미적용</Badge>}</td>
                    <td>{s.settlement.taxTreatyApplied ? (s.settlement.corReceived ? <Badge tone="good">수령</Badge> : <Badge tone="critical">미수령</Badge>) : '-'}</td>
                    <td className="right num">{krw(exp)}</td>
                    <td className="right num"><strong>{krw(s.settlement.honorarium + exp)}</strong></td>
                    <td className="xsmall muted">{s.settlement.remittance ? `${s.settlement.remittance.bankName} · ${s.settlement.remittance.accountMasked}` : '미수집'}</td>
                  </tr>
                )
              })}
              <tr>
                <td colSpan={2}><strong>합계</strong></td>
                <td className="right num"><strong>{krw(honorarium)}</strong></td>
                <td />
                <td className="right num"><strong>{krw(withholding)}</strong></td>
                <td className="right num"><strong>{krw(honorarium - withholding)}</strong></td>
                <td colSpan={2} />
                <td className="right num"><strong>{krw(expTotal)}</strong></td>
                <td className="right num"><strong>{krw(committed)}</strong></td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="정산 실무 체크포인트">
        <ul className="small sec" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.85 }}>
          <li>비거주자에게 지급하는 강연료는 국내원천소득으로 원천징수 대상이며, 소득 구분(기타소득/사업소득)에 따라 세율이 달라집니다.</li>
          <li>조세조약 제한세율·면제를 적용하려면 지급 전까지 거주자증명서와 제한세율 적용 신청서를 수령해야 합니다.</li>
          <li>항공·숙박을 주최가 직접 결제한 경우와 연사가 선지급 후 정산하는 경우의 증빙 요건이 다릅니다(영수증 원본·카드 전표).</li>
          <li>해외 송금 시 수취인 영문명과 여권 영문명이 일치해야 하며, 불일치 시 반송됩니다.</li>
          <li>지급명세서·원천징수이행상황신고는 지급일이 속한 달의 다음 달 10일까지 제출합니다.</li>
        </ul>
      </Card>
    </>
  )
}
