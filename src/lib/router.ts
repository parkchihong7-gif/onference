import { useEffect, useState } from 'react'

export interface Route { page: string; id?: string }

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [page, id] = raw.split('/')
  return { page: page || 'dashboard', id: id || undefined }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse)
  useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export const go = (page: string, id?: string) => {
  window.location.hash = `#/${page}${id ? `/${id}` : ''}`
  window.scrollTo({ top: 0 })
}
