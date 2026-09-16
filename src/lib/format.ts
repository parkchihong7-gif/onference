import { TODAY } from '../data/seed'

export const today = () => TODAY

export function daysBetween(from: string, to: string): number {
  const a = new Date(from.slice(0, 10) + 'T00:00:00').getTime()
  const b = new Date(to.slice(0, 10) + 'T00:00:00').getTime()
  return Math.round((b - a) / 86_400_000)
}

/** 오늘 기준 D-day (음수 = 경과) */
export const dday = (date: string) => daysBetween(TODAY, date)

export function ddayLabel(date?: string): string {
  if (!date) return '-'
  const n = dday(date)
  if (n === 0) return 'D-DAY'
  return n > 0 ? `D-${n}` : `D+${Math.abs(n)}`
}

export const fmtDate = (v?: string) => (v ? v.slice(0, 10).replace(/-/g, '.') : '-')
export const fmtDateTime = (v?: string) =>
  v ? `${v.slice(0, 10).replace(/-/g, '.')} ${v.slice(11, 16)}` : '-'

export const fmtMD = (v?: string) => (v ? `${Number(v.slice(5, 7))}/${Number(v.slice(8, 10))}` : '-')

export function krw(n?: number): string {
  if (n === undefined || n === null) return '-'
  return `₩${n.toLocaleString('ko-KR')}`
}

export function krwShort(n: number): string {
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만`
  return n.toLocaleString('ko-KR')
}

export function money(n: number, cur: string): string {
  const sym: Record<string, string> = { KRW: '₩', USD: '$', EUR: '€', JPY: '¥', GBP: '£', SGD: 'S$' }
  return `${sym[cur] ?? ''}${n.toLocaleString('en-US')}`
}

export const pct = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 100))

export const initials = (name: string) =>
  name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.)\s/, '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

export const COUNTRY_FLAG: Record<string, string> = {
  영국: '🇬🇧', 프랑스: '🇫🇷', 싱가포르: '🇸🇬', 인도: '🇮🇳', 이집트: '🇪🇬', 독일: '🇩🇪',
  일본: '🇯🇵', 멕시코: '🇲🇽', 베트남: '🇻🇳', 미국: '🇺🇸', 나이지리아: '🇳🇬',
  네덜란드: '🇳🇱', 중국: '🇨🇳', 호주: '🇦🇺', 노르웨이: '🇳🇴', 캐나다: '🇨🇦', 이탈리아: '🇮🇹',
}
export const flag = (c: string) => COUNTRY_FLAG[c] ?? '🌐'

/** 상태 → 시맨틱 톤 (색은 항상 아이콘/라벨과 함께 사용) */
export type Tone = 'good' | 'warning' | 'serious' | 'critical' | 'neutral' | 'info'

export function toneOf(status: string): Tone {
  if (['완료', '검수완료', '발급완료', '서명완료', '수락', '계약완료', '확정', '지급완료', '승인', '회신'].includes(status)) return 'good'
  if (['진행중', '제출', '요청함', '영사관접수', '인터뷰', '사증발급인정서발급', '발송', '청구', '열람', '예정'].includes(status)) return 'info'
  if (['대기', '보류', '요청전', '판정대기', '서류요청', '신청전', '예약'].includes(status)) return 'warning'
  if (['반려', '재신청', '지연', '검수'].includes(status)) return 'serious'
  if (['기한초과', '거절', '취소', '반송'].includes(status)) return 'critical'
  return 'neutral'
}
