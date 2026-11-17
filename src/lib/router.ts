import { useEffect, useState } from 'react'

/**
 * 메모리 기반 라우터.
 * 아티팩트 뷰어는 `#/path` 형태의 해시를 전달하지 않으므로(평문 #name 만 허용),
 * 라우팅 상태를 모듈 메모리에 두고 구독자에게 알린다. 로컬 파일·개발 서버에서도 동일하게 동작한다.
 */
export interface Route { page: string; id?: string }

let current: Route = { page: 'dashboard' }
const subscribers = new Set<(r: Route) => void>()

/** 첫 로드 시 주소에 #/path 가 남아 있으면(개발 서버·북마크) 한 번만 반영한다 */
try {
  const raw = window.location.hash.replace(/^#\/?/, '')
  if (raw) {
    const [page, id] = raw.split('/')
    if (page) current = { page, id: id || undefined }
  }
} catch { /* 주소 접근 불가 환경은 기본값 사용 */ }

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(current)
  useEffect(() => {
    subscribers.add(setRoute)
    return () => { subscribers.delete(setRoute) }
  }, [])
  return route
}

export const go = (page: string, id?: string) => {
  current = { page, id }
  subscribers.forEach(fn => fn(current))
  try { window.scrollTo({ top: 0 }) } catch { /* noop */ }
}
