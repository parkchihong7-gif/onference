import { useState } from 'react'
import { useApp } from '../store'
import { activeConference, commsOf, speakersOf } from '../lib/metrics'
import { Badge, Card, Drawer, StatTile, StatusBadge } from '../components/ui'
import { fmtDate, fmtDateTime, flag, today } from '../lib/format'
import { go } from '../lib/router'
import type { MailTemplate } from '../types'

export function Comms() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const comms = commsOf(state)
  const list = speakersOf(state)
  const [preview, setPreview] = useState<MailTemplate | null>(null)
  const [target, setTarget] = useState(list[0]?.id ?? '')

  const followUps = comms.filter(c => c.followUpAt && c.followUpAt <= today() && c.status !== '회신')

  const send = (tpl: MailTemplate) => {
    const sp = state.speakers.find(s => s.id === target)
    if (!sp) return
    dispatch({
      type: 'ADD_COMM',
      comm: {
        id: `C-${Math.random().toString(36).slice(2, 8)}`, conferenceId: conf.id, speakerId: sp.id,
        channel: '이메일', direction: '발신', templateId: tpl.id,
        subject: tpl.subject.replace('{{conference_en}}', conf.nameEn).replace('{{speaker_name}}', sp.nameEn),
        sentAt: new Date().toISOString().slice(0, 16), byMemberId: state.currentUserId, status: '발송완료',
      },
    })
    setPreview(null)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">커뮤니케이션</h1>
          <p className="page-desc">
            초청·비자·항공·제출물·정산 단계별 메일 템플릿과 발송 이력을 관리합니다. 회신 기한이 지난 건은
            팔로업 대상으로 자동 분류되며, 발송 내역은 연사 상세에도 함께 표시됩니다.
          </p>
        </div>
      </div>

      <div className="grid g4">
        <StatTile label="총 발송" value={comms.filter(c => c.direction === '발신').length} unit="건" foot={`수신 ${comms.filter(c => c.direction === '수신').length}건`} />
        <StatTile label="회신 완료" value={comms.filter(c => c.status === '회신').length} unit="건" tone="good"
          bar={(comms.filter(c => c.status === '회신').length / Math.max(comms.length, 1)) * 100} />
        <StatTile label="팔로업 필요" value={followUps.length} unit="건" tone="warning" foot="회신 기한 경과" />
        <StatTile label="템플릿" value={state.mailTemplates.length} unit="종" foot="단계별 표준 문안" />
      </div>

      {followUps.length > 0 && (
        <Card title="팔로업 대상" sub="회신 기한이 지난 발송 건">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>연사</th><th>제목</th><th>발송일</th><th>팔로업 기한</th><th>상태</th><th className="no-print">조치</th></tr></thead>
              <tbody>
                {followUps.map(c => {
                  const sp = state.speakers.find(s => s.id === c.speakerId)
                  return (
                    <tr key={c.id}>
                      <td className="clickable" onClick={() => sp && go('speakers', sp.id)}>{sp ? `${flag(sp.country)} ${sp.nameEn}` : '-'}</td>
                      <td className="small">{c.subject}</td>
                      <td className="num small nowrap">{fmtDateTime(c.sentAt)}</td>
                      <td className="num small nowrap"><Badge tone="critical">{fmtDate(c.followUpAt)}</Badge></td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="no-print">
                        <button className="btn btn-sm" onClick={() => {
                          dispatch({
                            type: 'ADD_COMM',
                            comm: { ...c, id: `C-${Math.random().toString(36).slice(2, 8)}`, subject: `[Reminder] ${c.subject}`, sentAt: new Date().toISOString().slice(0, 16), status: '발송완료', followUpAt: undefined },
                          })
                        }}>✉ 리마인드</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="메일 템플릿" sub="클릭하면 본문과 치환 변수·자동 발송 조건을 확인할 수 있습니다">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>템플릿</th><th>단계</th><th>언어</th><th>제목</th><th>자동 발송 조건</th></tr></thead>
            <tbody>
              {state.mailTemplates.map(t => (
                <tr key={t.id} className="clickable" onClick={() => setPreview(t)}>
                  <td><strong>{t.name}</strong></td>
                  <td className="small muted">{t.phase}</td>
                  <td className="small">{t.language}</td>
                  <td className="small trunc" style={{ maxWidth: 320 }}>{t.subject}</td>
                  <td className="xsmall muted">{t.trigger ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="발송 이력" sub="최근 순">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>일시</th><th>구분</th><th>연사</th><th>채널</th><th>제목</th><th>담당</th><th>상태</th></tr></thead>
            <tbody>
              {comms.slice(0, 80).map(c => {
                const sp = state.speakers.find(s => s.id === c.speakerId)
                return (
                  <tr key={c.id}>
                    <td className="num small nowrap">{fmtDateTime(c.sentAt)}</td>
                    <td><Badge tone={c.direction === '수신' ? 'info' : 'neutral'}>{c.direction}</Badge></td>
                    <td className="small nowrap clickable" onClick={() => sp && go('speakers', sp.id)}>{sp ? `${flag(sp.country)} ${sp.nameEn}` : '-'}</td>
                    <td className="small">{c.channel}</td>
                    <td className="small trunc" style={{ maxWidth: 360 }}>{c.subject}</td>
                    <td className="small nowrap">{state.members.find(m => m.id === c.byMemberId)?.name}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer open={!!preview} onClose={() => setPreview(null)}>
        {preview && (
          <>
            <div className="drawer-head">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 17 }}>{preview.name}</h2>
                  <div className="small muted">{preview.phase} · {preview.language}</div>
                </div>
                <button className="btn btn-ghost" onClick={() => setPreview(null)}>✕</button>
              </div>
            </div>
            <div className="drawer-body">
              <Card title="제목"><div className="small">{preview.subject}</div></Card>
              <Card title="본문">
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, margin: 0, color: 'var(--ink-2)' }}>{preview.body}</pre>
              </Card>
              <Card title="치환 변수">
                <div className="row-wrap">{preview.variables.map(v => <span className="chip" key={v}>{`{{${v}}}`}</span>)}</div>
              </Card>
              <Card title="발송 시뮬레이션" sub="실제 메일 발송은 연동되지 않으며, 로그만 기록됩니다">
                <div className="row-wrap">
                  <select className="select" value={target} onChange={e => setTarget(e.target.value)}>
                    {list.map(s => <option key={s.id} value={s.id}>{s.nameEn} · {s.stage}</option>)}
                  </select>
                  <button className="btn btn-primary" onClick={() => send(preview)}>✉ 발송 기록 추가</button>
                </div>
              </Card>
            </div>
          </>
        )}
      </Drawer>
    </>
  )
}
