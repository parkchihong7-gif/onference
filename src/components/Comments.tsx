import { useState } from 'react'
import { useApp } from '../store'
import { Badge, Empty } from './ui'
import { fmtDateTime, today } from '../lib/format'
import type { CommentTarget } from '../types'

/** 레코드 단위 코멘트 스레드 — 멘션(@담당자) 지원 */
export function Comments({ targetType, targetId, targetLabel }: {
  targetType: CommentTarget; targetId: string; targetLabel: string
}) {
  const { state, dispatch } = useApp()
  const [body, setBody] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  const list = state.comments
    .filter(c => c.targetType === targetType && c.targetId === targetId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const add = () => {
    if (!body.trim()) return
    dispatch({
      type: 'ADD_COMMENT',
      comment: {
        id: `CM-${Math.random().toString(36).slice(2, 8)}`,
        conferenceId: state.activeConferenceId,
        targetType, targetId, targetLabel,
        authorMemberId: state.currentUserId,
        body: body.trim(), mentions,
        createdAt: `${today()}T${new Date().toTimeString().slice(0, 5)}`,
        resolved: false,
      },
    })
    setBody(''); setMentions([])
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {list.map(c => {
          const author = state.members.find(m => m.id === c.authorMemberId)
          return (
            <div key={c.id} style={{
              border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px',
              background: c.resolved ? 'var(--surface-2)' : 'var(--surface)',
              opacity: c.resolved ? 0.7 : 1,
            }}>
              <div className="row small" style={{ gap: 6, marginBottom: 4 }}>
                <strong>{author?.name ?? '-'}</strong>
                <span className="xsmall muted">{author?.role}</span>
                <span className="xsmall muted">{fmtDateTime(c.createdAt)}</span>
                <span className="spacer" />
                {c.resolved && <Badge tone="good">해결됨</Badge>}
                <button className="btn btn-sm btn-ghost no-print" onClick={() => dispatch({ type: 'TOGGLE_COMMENT', id: c.id })}>
                  {c.resolved ? '다시 열기' : '해결 처리'}
                </button>
              </div>
              <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>
              {c.mentions.length > 0 && (
                <div className="xsmall muted" style={{ marginTop: 4 }}>
                  멘션: {c.mentions.map(id => `@${state.members.find(m => m.id === id)?.name ?? id}`).join(' ')}
                </div>
              )}
            </div>
          )
        })}
        {!list.length && <Empty>코멘트가 없습니다.</Empty>}
      </div>
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <textarea className="input" rows={2} placeholder="코멘트를 입력하세요" value={body} onChange={e => setBody(e.target.value)} />
        <div className="row-wrap" style={{ gap: 6 }}>
          <span className="xsmall muted">멘션</span>
          {state.members.slice(0, 8).map(m => (
            <button key={m.id} className={`chip ${mentions.includes(m.id) ? 't-info' : ''}`} style={{ cursor: 'pointer' }}
              onClick={() => setMentions(p => (p.includes(m.id) ? p.filter(x => x !== m.id) : [...p, m.id]))}>
              @{m.name}
            </button>
          ))}
          <span className="spacer" />
          <button className="btn btn-sm btn-primary" onClick={add}>등록</button>
        </div>
      </div>
    </div>
  )
}
