import { useApp } from '../store'
import { activeConference, computeRisks, validateAll } from '../lib/metrics'
import { Badge, Card, StatTile } from '../components/ui'
import { ddayLabel, flag, fmtDate } from '../lib/format'
import { go } from '../lib/router'
import { downloadCsv } from '../lib/csv'

const LEVEL_LABEL = { critical: '즉시 조치', serious: '주의', warning: '관찰' } as const
const TONE = { critical: 'critical', serious: 'serious', warning: 'warning' } as const

export function Risks() {
  const { state } = useApp()
  const conf = activeConference(state)
  const risks = computeRisks(state)
  const quality = validateAll(state)
  const qErr = quality.reduce((a, x) => a + x.issues.filter(i => i.level === '오류').length, 0)
  const qWarn = quality.reduce((a, x) => a + x.issues.filter(i => i.level !== '오류').length, 0)
  const byCat = risks.reduce<Record<string, number>>((a, r) => { a[r.category] = (a[r.category] ?? 0) + 1; return a }, {})

  const exportCsv = () => downloadCsv(`${conf.code}_리스크리포트.csv`,
    [['위험도', '분류', '연사', '내용', '상세', '조치기한'],
    ...risks.map(r => [LEVEL_LABEL[r.level], r.category, r.speakerName, r.title, r.detail, r.dueDate])])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">리스크·경보</h1>
          <p className="page-desc">
            비자 처리 소요일, 발권 마감, 여권 유효기간(6개월 규정), 제출물 기한, 계약 서명, 초청 회신 기한을
            행사일(D-{ddayLabel(conf.startDate).replace('D-', '')})에서 역산하여 자동 판정합니다.
          </p>
        </div>
        <button className="btn no-print" onClick={exportCsv}>⬇ 리스크 리포트</button>
      </div>

      <div className="grid g4">
        <StatTile label="즉시 조치" value={risks.filter(r => r.level === 'critical').length} unit="건" tone="critical" foot="일정상 복구 불가 위험" />
        <StatTile label="주의" value={risks.filter(r => r.level === 'serious').length} unit="건" tone="serious" foot="이번 주 내 처리 필요" />
        <StatTile label="관찰" value={risks.filter(r => r.level === 'warning').length} unit="건" tone="warning" foot="담당자 확인 필요" />
        <StatTile label="데이터 정합성 오류" value={qErr} unit="건" tone={qErr ? 'critical' : 'good'}
          foot={`확인 필요 ${qWarn}건 · 영향 ${quality.length}명`} />
      </div>

      <Card title="분류별 발생 건수">
        <div className="row-wrap" style={{ gap: 10 }}>
          {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
            <span key={c} className="chip">{c} <strong className="num">{n}</strong></span>
          ))}
          {!risks.length && <span className="muted small">감지된 리스크가 없습니다.</span>}
        </div>
      </Card>

      <Card title="리스크 목록" sub="위험도 순 정렬 · 행 클릭 시 해당 연사 상세로 이동">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>위험도</th><th>분류</th><th>연사</th><th>내용</th><th>상세</th><th>조치 기한</th></tr></thead>
            <tbody>
              {risks.map(r => {
                const sp = state.speakers.find(s => s.id === r.speakerId)
                return (
                  <tr key={r.id} className="clickable" onClick={() => go('speakers', r.speakerId)}>
                    <td><Badge tone={TONE[r.level]} icon={r.level === 'critical' ? '⛔' : r.level === 'serious' ? '⚠' : '•'}>{LEVEL_LABEL[r.level]}</Badge></td>
                    <td className="nowrap">{r.category}</td>
                    <td className="nowrap">{sp ? flag(sp.country) : ''} {r.speakerName}</td>
                    <td>{r.title}</td>
                    <td className="small muted">{r.detail}</td>
                    <td className="num nowrap">{fmtDate(r.dueDate)} <span className="xsmall muted">{r.dueDate ? ddayLabel(r.dueDate) : ''}</span></td>
                  </tr>
                )
              })}
              {!risks.length && <tr><td colSpan={6} className="empty">감지된 리스크가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="데이터 정합성 검증" sub="엑셀 취합 과정에서 생기던 값 불일치·누락을 규칙으로 자동 점검합니다">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>구분</th><th>초청자</th><th>항목</th><th>내용</th><th>조치</th></tr></thead>
            <tbody>
              {quality.flatMap(({ speaker, issues }) => issues.map(i => (
                <tr key={i.id} className="clickable" onClick={() => go('speakers', speaker.id)}>
                  <td><Badge tone={i.level === '오류' ? 'critical' : i.level === '경고' ? 'warning' : 'info'}>{i.level}</Badge></td>
                  <td className="nowrap">{flag(speaker.country)} {speaker.nameEn}</td>
                  <td className="small nowrap">{i.field}</td>
                  <td className="small">{i.message}</td>
                  <td className="xsmall muted">{i.action}</td>
                </tr>
              )))}
              {!quality.length && <tr><td colSpan={5} className="empty">정합성 오류가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="판정 기준" sub="설정 &gt; 리스크 규칙에서 임계값을 조정합니다">
        <ul className="small sec" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
          <li><strong>비자</strong> — 잔여일 &lt; (사증 심사 리드타임 + 사증발급인정서 심사 20일 + 버퍼 7일) → 즉시 조치 · 여유 7일 미만도 즉시 조치 · 21일 미만 주의</li>
          <li><strong>여권</strong> — 행사 종료일 기준 잔여 유효기간 6개월 미만 → 주의(입국 거부 위험)</li>
          <li><strong>항공</strong> — D-60(요금 보장 마감) 경과 후 미발권 → 주의, D-30 경과 시 즉시 조치</li>
          <li><strong>숙박·의전</strong> — D-55 객실 블록 마감, D-14 배차 미배정 → 관찰</li>
          <li><strong>제출물</strong> — 기한 경과 미제출 3건 이상 → 주의</li>
          <li><strong>계약</strong> — D-90 경과 후 Speaker Agreement 미서명 → 주의(강연료 지급 근거 부재)</li>
          <li><strong>응답</strong> — 공식 초청 회신 기한 경과 → 주의(대체 후보 검토)</li>
          <li><strong>정합성</strong> — 여권 영문명 ↔ 항공 탑승자명/송금 수취인명, 체류 기간 ↔ 숙박 기간,
            세션 일정 ↔ 항공 일정, 동반자 객실·서류, 지원 구분 ↔ 실비, 사증 유효기간을 교차 검증</li>
        </ul>
      </Card>
    </>
  )
}
