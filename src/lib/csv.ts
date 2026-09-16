/** Excel 호환 CSV 내보내기 (UTF-8 BOM 포함 — 한글 깨짐 방지) */
export function downloadCsv(filename: string, rows: (string | number | undefined)[][]) {
  const esc = (v: string | number | undefined) => {
    const s = v === undefined || v === null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = rows.map(r => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
