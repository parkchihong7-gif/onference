import { CAN_DOWNLOAD } from './env'

type Cell = string | number | undefined

function toCsv(rows: Cell[][]): string {
  const esc = (v: Cell) => {
    const s = v === undefined || v === null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map(r => r.map(esc).join(',')).join('\r\n')
}

/**
 * Excel 호환 CSV 내보내기 (UTF-8 BOM 포함 — 한글 깨짐 방지).
 * 파일 저장이 막힌 환경(아티팩트 뷰어)에서는 대신 복사용 패널을 띄운다.
 */
export function downloadCsv(filename: string, rows: Cell[][]) {
  const body = toCsv(rows)
  if (CAN_DOWNLOAD) {
    const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return
  }
  openCopyPanel(filename, body)
}

/** 다운로드가 불가능한 환경용 — 전체 선택·복사해서 Excel 에 붙여 넣는 패널 */
function openCopyPanel(filename: string, body: string) {
  document.getElementById('onf-copy-panel')?.remove()
  const wrap = document.createElement('div')
  wrap.id = 'onf-copy-panel'
  wrap.setAttribute('role', 'dialog')
  wrap.setAttribute('aria-modal', 'true')
  wrap.innerHTML = `
    <div class="onf-copy-scrim"></div>
    <div class="onf-copy-box">
      <div class="onf-copy-head">
        <div>
          <strong>${filename}</strong>
          <div class="onf-copy-sub">이 환경에서는 파일 저장이 제한됩니다. 아래 내용을 복사해 Excel 에 붙여 넣으세요.</div>
        </div>
        <button class="btn btn-sm" data-close>닫기</button>
      </div>
      <textarea readonly spellcheck="false"></textarea>
      <div class="onf-copy-foot">
        <span class="small muted">${body.split('\r\n').length.toLocaleString('ko-KR')}행</span>
        <button class="btn btn-sm btn-primary" data-copy>전체 복사</button>
      </div>
    </div>`
  const ta = wrap.querySelector('textarea') as HTMLTextAreaElement
  ta.value = body
  const close = () => wrap.remove()
  wrap.querySelector('[data-close]')!.addEventListener('click', close)
  wrap.querySelector('.onf-copy-scrim')!.addEventListener('click', close)
  wrap.querySelector('[data-copy]')!.addEventListener('click', async () => {
    const btn = wrap.querySelector('[data-copy]') as HTMLButtonElement
    try {
      await navigator.clipboard.writeText(body)
      btn.textContent = '복사됨'
    } catch {
      ta.focus(); ta.select()
      btn.textContent = '전체 선택됨 — Ctrl/⌘+C'
    }
  })
  document.body.appendChild(wrap)
  ta.focus(); ta.select()
}

/* ───────────────────────── CSV 읽기 (일괄 등록) ───────────────────────── */

/**
 * CSV 한 줄을 셀로 나눈다. 따옴표 안의 쉼표·줄바꿈과 ""(이스케이프된 따옴표)를 처리한다.
 * 엑셀에서 저장한 파일을 그대로 올릴 수 있어야 하므로 직접 파싱한다.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  // UTF-8 BOM 제거 — 엑셀 저장 파일에 붙는다
  const src = text.replace(/^﻿/, '')

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ }
        else quoted = false
      } else cell += c
      continue
    }
    if (c === '"') { quoted = true; continue }
    if (c === ',') { row.push(cell); cell = ''; continue }
    if (c === '\r') continue
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue }
    cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.some(x => x.trim() !== ''))
}

/**
 * 머리글 행을 읽어 { 열이름: 값 } 목록으로 바꾼다.
 * 열 순서가 달라도 머리글 이름으로 찾으므로, 받은 파일을 그대로 올릴 수 있다.
 */
export function readCsvObjects(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const raw = parseCsv(text)
  if (!raw.length) return { headers: [], rows: [] }
  const headers = raw[0].map(h => h.trim())
  const rows = raw.slice(1).map(r => {
    const o: Record<string, string> = {}
    headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim() })
    return o
  })
  return { headers, rows }
}
