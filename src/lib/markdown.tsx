/**
 * 최소 마크다운 렌더러 — 회의록·공지 등 문서 모듈에서 사용한다.
 * 지원: 제목(#~###), 굵게(**), 목록(-, 1.), 체크박스(- [ ]), 표(|), 구분선(---), 단락
 * 외부 라이브러리 없이 동작하며 HTML 은 주입하지 않는다(모두 React 요소로 생성).
 */
import type { ReactNode } from 'react'

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|`(.+?)`/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(<strong key={`${key}-b${i++}`}>{m[1]}</strong>)
    else if (m[2]) out.push(<code key={`${key}-c${i++}`} style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>{m[2]}</code>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let list: string[] = []
  let ordered = false
  let table: string[] = []

  const flushList = () => {
    if (!list.length) return
    const items = list.map((l, i) => {
      const check = l.match(/^\[([ xX])\]\s*(.*)$/)
      return (
        <li key={i} style={check ? { listStyle: 'none', marginLeft: -18 } : undefined}>
          {check ? <>
            <input type="checkbox" readOnly checked={check[1].toLowerCase() === 'x'} style={{ marginRight: 7 }} />
            {inline(check[2], `l${i}`)}
          </> : inline(l, `l${i}`)}
        </li>
      )
    })
    blocks.push(ordered
      ? <ol key={`b${blocks.length}`} style={{ paddingLeft: 20, margin: '6px 0', lineHeight: 1.8 }}>{items}</ol>
      : <ul key={`b${blocks.length}`} style={{ paddingLeft: 20, margin: '6px 0', lineHeight: 1.8 }}>{items}</ul>)
    list = []
  }

  const flushTable = () => {
    if (!table.length) return
    const rows = table.filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r))
      .map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()))
    const [head, ...body] = rows
    blocks.push(
      <div className="table-wrap" key={`b${blocks.length}`} style={{ margin: '10px 0' }}>
        <table className="data">
          <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>{body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{inline(c, `t${i}${j}`)}</td>)}</tr>)}</tbody>
        </table>
      </div>,
    )
    table = []
  }

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd()
    if (/^\s*\|.*\|\s*$/.test(line)) { flushList(); table.push(line.trim()); return }
    flushTable()
    const li = line.match(/^\s*[-*]\s+(.*)$/)
    const oli = line.match(/^\s*(\d+)\.\s+(.*)$/)
    if (li) { if (ordered) flushList(); ordered = false; list.push(li[1]); return }
    if (oli) { if (!ordered && list.length) flushList(); ordered = true; list.push(oli[2]); return }
    flushList()
    if (!line.trim()) return
    if (line.startsWith('### ')) blocks.push(<h4 key={idx} style={{ margin: '14px 0 4px', fontSize: 13.5 }}>{inline(line.slice(4), `h${idx}`)}</h4>)
    else if (line.startsWith('## ')) blocks.push(<h3 key={idx} style={{ margin: '18px 0 6px', fontSize: 15 }}>{inline(line.slice(3), `h${idx}`)}</h3>)
    else if (line.startsWith('# ')) blocks.push(<h2 key={idx} style={{ margin: '18px 0 8px', fontSize: 17 }}>{inline(line.slice(2), `h${idx}`)}</h2>)
    else if (/^---+$/.test(line)) blocks.push(<hr key={idx} style={{ border: 0, borderTop: '1px solid var(--line)', margin: '14px 0' }} />)
    else blocks.push(<p key={idx} style={{ margin: '6px 0', lineHeight: 1.75 }}>{inline(line, `p${idx}`)}</p>)
  })
  flushList(); flushTable()
  return <div style={{ fontSize: 13.5 }}>{blocks}</div>
}

/** 문서 본문에서 액션 아이템 표를 뽑아낸다 (담당 | 내용 | 기한) */
export function extractActionItems(body: string): { owner: string; title: string; due: string }[] {
  const rows = body.split('\n').filter(l => /^\s*\|/.test(l))
  return rows
    .map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()))
    .filter(c => c.length >= 3 && c[0] && !/^담당$/.test(c[0]) && !/^[-: ]+$/.test(c[0]))
    .map(c => ({ owner: c[0], title: c[1], due: c[2] }))
    .filter(x => x.title)
}
