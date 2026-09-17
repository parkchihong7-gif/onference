import { useState } from 'react'
import { useApp } from '../store'
import { speakersOf } from '../lib/metrics'
import { Badge, Card, TierTag } from '../components/ui'
import { ddayLabel, flag, fmtDate, krwShort, today } from '../lib/format'
import { go } from '../lib/router'
import { PIPELINE_ORDER } from '../types'
import type { PipelineStage } from '../types'

const COLUMNS: PipelineStage[] = [...PIPELINE_ORDER, '거절']

export function Pipeline() {
  const { state, dispatch } = useApp()
  const list = speakersOf(state)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const drop = (stage: PipelineStage) => {
    if (dragId) dispatch({ type: 'SET_STAGE', id: dragId, stage })
    setDragId(null); setOver(null)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">초청 파이프라인</h1>
          <p className="page-desc">
            후보 발굴부터 계약 완료까지의 단계를 한 화면에서 관리합니다. 카드를 드래그하면 단계가 변경되고
            변경 이력이 자동 기록됩니다. 회신 기한이 지난 카드는 경고로 표시됩니다.
          </p>
        </div>
      </div>

      <div className="kanban">
        {COLUMNS.map(col => {
          const cards = list.filter(s => s.stage === col)
          return (
            <div key={col}
              className={`kanban-col ${over === col ? 'drop' : ''}`}
              onDragOver={e => { e.preventDefault(); setOver(col) }}
              onDragLeave={() => setOver(o => (o === col ? null : o))}
              onDrop={() => drop(col)}>
              <div className="kanban-head">
                <span>{col}</span>
                <span className="chip num">{cards.length}</span>
              </div>
              {cards.map(s => {
                const overdue = s.stage === '공식초청' && !!s.replyDueAt && s.replyDueAt < today()
                return (
                  <div key={s.id} className="kanban-card" draggable
                    onDragStart={() => setDragId(s.id)}
                    onClick={() => go('speakers', s.id)}>
                    <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                      <span aria-hidden>{flag(s.country)}</span>
                      <strong className="small trunc" style={{ flex: 1 }}>{s.nameEn}</strong>
                      <TierTag tier={s.tier} />
                    </div>
                    <div className="xsmall muted trunc">{s.affiliation}</div>
                    <div className="row-wrap" style={{ gap: 4, marginTop: 6 }}>
                      {s.visa.required && <Badge tone="warning">비자</Badge>}
                      {s.attendanceMode === '온라인' && <Badge tone="neutral">온라인</Badge>}
                      {overdue && <Badge tone="critical">회신 지연</Badge>}
                      <span className="chip num">{krwShort(s.settlement.honorarium)}원</span>
                    </div>
                    <div className="xsmall muted" style={{ marginTop: 6 }}>
                      {s.replyDueAt && s.stage === '공식초청' ? `회신 기한 ${fmtDate(s.replyDueAt)} (${ddayLabel(s.replyDueAt)})`
                        : s.acceptedAt ? `수락 ${fmtDate(s.acceptedAt)}`
                          : `등록 ${fmtDate(s.createdAt)}`}
                    </div>
                  </div>
                )
              })}
              {!cards.length && <div className="xsmall muted" style={{ padding: 8 }}>카드를 여기로 드래그</div>}
            </div>
          )
        })}
      </div>

      <div className="grid g3">
        <Card title="단계 정의" sub="사무국 내부 기준">
          <ol className="small sec" style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>후보발굴</strong> — 롱리스트 등재, 이해충돌·중복 초청 확인</li>
            <li><strong>내부승인</strong> — 선정위원회 심의, 등급·예산 배정</li>
            <li><strong>사전타진</strong> — Save-the-date 메일, 일정 가능 여부 확인</li>
            <li><strong>공식초청</strong> — 공식 초청장 발송, 회신 기한 관리</li>
            <li><strong>수락</strong> — 조건 합의, 여권·개인정보 수집 착수</li>
            <li><strong>계약완료</strong> — Speaker Agreement 서명, 실무 착수</li>
          </ol>
        </Card>
        <Card title="다양성·균형 점검" sub="지역·성별·기관 편중 여부를 선정 단계에서 점검">
          <div className="small sec">
            국가 {new Set(list.filter(s => s.stage !== '거절').map(s => s.country)).size}개국 ·
            기관 {new Set(list.map(s => s.affiliation)).size}곳 ·
            온라인 {list.filter(s => s.attendanceMode === '온라인').length}명
            <br />동일 기관 중복: {Object.entries(list.reduce<Record<string, number>>((a, s) => { a[s.affiliation] = (a[s.affiliation] ?? 0) + 1; return a }, {})).filter(([, n]) => n > 1).length}건
          </div>
        </Card>
        <Card title="대체 후보(Backup Pool)" sub="거절·취소 발생 시 즉시 투입">
          {list.filter(s => ['후보발굴', '내부승인'].includes(s.stage)).map(s => (
            <div key={s.id} className="row small" style={{ justifyContent: 'space-between', padding: '4px 0', cursor: 'pointer' }} onClick={() => go('speakers', s.id)}>
              <span className="trunc">{flag(s.country)} {s.nameEn}</span>
              <Badge tone="info">{s.stage}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
