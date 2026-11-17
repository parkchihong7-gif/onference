/**
 * 시드 공용 유틸 — 국제/국내 시드가 함께 쓰는 기준일·날짜 계산·결정적 난수.
 * (seed.ts ↔ seedDomestic.ts 순환 import 를 피하기 위해 별도 모듈로 둔다)
 */

/** 데모 기준일 = 오늘. 모든 행사 일정이 이 날짜 기준 상대 계산되어
    언제 열어도 동일한 상황(D-63 / D-24)이 재현된다. */
export const TODAY = new Date().toISOString().slice(0, 10)

export const addDays = (iso: string, n: number): string => {
  const t = new Date(iso + 'T00:00:00')
  t.setDate(t.getDate() + n)
  return t.toISOString().slice(0, 10)
}

/** 국제 컨퍼런스 개막일 = 오늘 + 63일 (사증·발권 리드타임 데모에 적합) */
export const START = addDays(TODAY, 63)
/** 국내 학회 개막일 = 오늘 + 24일 (사전등록·평점·현장 준비 단계) */
export const D_START = addDays(TODAY, 24)

/* 결정적 의사난수 — 새로고침해도 동일한 데모 데이터를 보장 */
export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h)
}
export const pick = <T,>(seed: string, arr: T[]): T => arr[hash(seed) % arr.length]

/** 원화 환산 환율(데모 고정값) */
export const FX: Record<string, number> = { KRW: 1, USD: 1380, EUR: 1490, JPY: 9.1, GBP: 1750, SGD: 1020 }
export const toKRW = (amount: number, cur: string) => Math.round(amount * (FX[cur] ?? 1))

export const EU_COUNTRIES = ['프랑스', '독일', '네덜란드', '노르웨이', '이탈리아']

/** 여권번호 접두 등 표기에 쓰는 국가 코드 */
export const COUNTRY_CODE: Record<string, string> = {
  영국: 'GB', 프랑스: 'FR', 싱가포르: 'SG', 인도: 'IN', 이집트: 'EG', 독일: 'DE', 일본: 'JP',
  멕시코: 'MX', 베트남: 'VN', 미국: 'US', 나이지리아: 'NG', 네덜란드: 'NL', 중국: 'CN',
  호주: 'AU', 노르웨이: 'NO', 캐나다: 'CA', 이탈리아: 'IT',
}
