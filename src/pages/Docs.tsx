import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { activeConference } from '../lib/metrics'
import { Badge, Card, Empty } from '../components/ui'
import { Comments } from '../components/Comments'
import { Markdown, extractActionItems } from '../lib/markdown'
import { fmtDate, today } from '../lib/format'
import { go } from '../lib/router'
import { CAN_PRINT } from '../lib/env'
import type { DocType, PhaseKey } from '../types'

const TYPES: DocType[] = ['회의록', '기획안', '공지', '운영매뉴얼', '체크리스트', '보고서']

export function Docs() {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const docs = useMemo(
    () => state.docs.filter(d => d.conferenceId === conf.id).sort((a, b) => (a.pinned === b.pinned ? (a.updatedAt < b.updatedAt ? 1 : -1) : a.pinned ? -1 : 1)),
    [state.docs, conf.id])
  const [selected, setSelected] = useState(docs[0]?.id ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [type, setType] = useState<string>('전체')

  const rows = docs.filter(d => (type === '전체' || d.type === type) &&
    (!q || `${d.title} ${d.body} ${d.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())))
  const doc = docs.find(d => d.id === selected) ?? rows[0]
  const actions = doc ? extractActionItems(doc.body) : []

  const createFrom = (templateId: string) => {
    const t = state.docTemplates.find(x => x.id === templateId)
    if (!t) return
    const id = `DOC-${Math.random().toString(36).slice(2, 7)}`
    dispatch({
      type: 'ADD_DOC',
      doc: {
        id, conferenceId: conf.id, type: t.type,
        title: `${t.name.replace(' 표준 양식', '')} — ${fmtDate(today())}`,
        body: t.body, authorMemberId: state.currentUserId,
        createdAt: today(), updatedAt: today(), tags: ['신규'],
      },
    })
    setSelected(id); setEditing(true); setDraft(t.body)
  }

  const save = () => {
    if (!doc) return
    dispatch({ type: 'UPDATE_DOC', id: doc.id, patch: { body: draft } })
    setEditing(false)
  }

  const toTask = (a: { owner: string; title: string; due: string }) => {
    const owner = state.members.find(m => m.name === a.owner)
    const dueMatch = a.due.match(/D([+-])(\d+)/)
    const base = conf.startDate
    const due = dueMatch
      ? new Date(new Date(base).getTime() + (dueMatch[1] === '-' ? -1 : 1) * Number(dueMatch[2]) * 86_400_000).toISOString().slice(0, 10)
      : (a.due.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? base)
    dispatch({
      type: 'ADD_TASK',
      task: {
        id: `T-${Math.random().toString(36).slice(2, 8)}`, conferenceId: conf.id,
        phase: '기획·세팅' as PhaseKey, title: `${a.title} (회의록: ${doc?.title ?? ''})`,
        ownerMemberId: owner?.id ?? state.currentUserId, dueDate: due, status: '대기', priority: '중',
      },
    })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">문서 · 회의록</h1>
          <p className="page-desc">
            회의록·기획안·공지·운영매뉴얼을 행사 단위로 모읍니다. 템플릿에서 새 문서를 만들고,
            회의록의 <strong>액션 아이템 표를 업무로 바로 등록</strong>할 수 있습니다. 문서마다 코멘트·멘션이 달립니다.
          </p>
        </div>
        <div className="row-wrap no-print">
          <select className="select" defaultValue="" onChange={e => { if (e.target.value) { createFrom(e.target.value); e.target.value = '' } }}>
            <option value="">＋ 템플릿에서 새 문서</option>
            {state.docTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="ws">
        <aside className="ws-list">
          <div className="ws-list-head">
            <input className="input" placeholder="제목·본문 검색" value={q} onChange={e => setQ(e.target.value)} />
            <div className="ws-subtabs">
              {['전체', ...TYPES].map(t => (
                <button key={t} className="ws-subtab" aria-pressed={type === t} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="ws-list-body">
            {rows.map(d => (
              <div key={d.id} className="ws-card" aria-selected={d.id === doc?.id} onClick={() => { setSelected(d.id); setEditing(false) }}>
                <div className="ws-card-name">
                  {d.pinned && <span aria-hidden title="고정">📌</span>}
                  <span className="trunc">{d.title}</span>
                </div>
                <div className="ws-card-meta">
                  {state.members.find(m => m.id === d.authorMemberId)?.name} · {fmtDate(d.updatedAt)}
                </div>
                <div className="ws-card-foot">
                  <Badge tone="neutral">{d.type}</Badge>
                  {d.tags.map(t => <span className="chip" key={t}>{t}</span>)}
                  {state.comments.filter(c => c.targetType === '문서' && c.targetId === d.id).length > 0 &&
                    <span className="chip">💬 {state.comments.filter(c => c.targetType === '문서' && c.targetId === d.id).length}</span>}
                </div>
              </div>
            ))}
            {!rows.length && <Empty>문서가 없습니다.</Empty>}
          </div>
        </aside>

        <section className="ws-detail">
          {!doc ? <Empty>문서를 선택하세요.</Empty> : (
            <>
              <div className="ws-head">
                <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: 18 }}>{doc.title}</h2>
                    <div className="xsmall muted" style={{ marginTop: 4 }}>
                      {doc.type} · 작성 {state.members.find(m => m.id === doc.authorMemberId)?.name} ·
                      생성 {fmtDate(doc.createdAt)} · 수정 {fmtDate(doc.updatedAt)}
                    </div>
                  </div>
                  <div className="row-wrap no-print">
                    {editing ? (
                      <>
                        <button className="btn" onClick={() => setEditing(false)}>취소</button>
                        <button className="btn btn-primary" onClick={save}>저장</button>
                      </>
                    ) : (
                      <>
                        {CAN_PRINT && <button className="btn" onClick={() => window.print()}>🖨 인쇄</button>}
                        <button className="btn btn-primary" onClick={() => { setDraft(doc.body); setEditing(true) }}>편집</button>
                      </>
                    )}
                  </div>
                </div>
                {doc.linked && doc.linked.length > 0 && (
                  <div className="row-wrap" style={{ gap: 6, marginTop: 10 }}>
                    <span className="xsmall muted">연결</span>
                    {doc.linked.map(l => (
                      <button key={l.id} className="chip" style={{ cursor: 'pointer' }}
                        onClick={() => l.type === '연자' && go('speakers', l.id)}>
                        {l.type} · {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Card>
                {editing
                  ? <textarea className="input" style={{ width: '100%', minHeight: 420, fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}
                      value={draft} onChange={e => setDraft(e.target.value)} />
                  : <Markdown text={doc.body} />}
              </Card>

              {actions.length > 0 && !editing && (
                <Card title={`액션 아이템 ${actions.length}건`} sub="업무 보드로 등록하면 기한·담당이 그대로 반영됩니다">
                  <div className="table-wrap">
                    <table className="data">
                      <thead><tr><th>담당</th><th>내용</th><th>기한</th><th className="no-print">등록</th></tr></thead>
                      <tbody>
                        {actions.map((a, i) => (
                          <tr key={i}>
                            <td className="nowrap">{a.owner}</td>
                            <td>{a.title}</td>
                            <td className="nowrap num">{a.due}</td>
                            <td className="no-print">
                              <button className="btn btn-sm" onClick={() => toTask(a)}>＋ 업무 등록</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              <Card title="코멘트">
                <Comments targetType="문서" targetId={doc.id} targetLabel={doc.title} />
              </Card>
            </>
          )}
        </section>
      </div>
    </>
  )
}
