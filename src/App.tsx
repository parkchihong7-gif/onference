import { useEffect, useState } from 'react'
import { useApp } from './store'
import { go, useRoute } from './lib/router'
import { activeConference, computeRisks, kpis, speakersOf, tasksOf, validateAll } from './lib/metrics'
import { hasModule, labelsOf, needsOverseasModules, overseasSpeakers } from './lib/scope'
import { ddayLabel, today } from './lib/format'
import { Search } from './components/Search'
import { Dashboard } from './pages/Dashboard'
import { Pipeline } from './pages/Pipeline'
import { Workspace } from './pages/Workspace'
import { Speakers } from './pages/Speakers'
import { SpeakerDetail } from './pages/SpeakerDetail'
import { Sessions } from './pages/Sessions'
import { Visa } from './pages/Visa'
import { Travel } from './pages/Travel'
import { Deliverables } from './pages/Deliverables'
import { Onsite } from './pages/Onsite'
import { Settlement } from './pages/Settlement'
import { TasksPage } from './pages/Tasks'
import { Comms } from './pages/Comms'
import { Audit } from './pages/Audit'
import { Settings } from './pages/Settings'
import { Risks } from './pages/Risks'
import { Docs } from './pages/Docs'
import { Calendar } from './pages/Calendar'
import { Abstracts, Credits, Registrations, Sponsors } from './pages/Domestic'
import type { ModuleKey } from './types'

interface Counts { speakers: number; risks: number; tasks: number; visa: number; issues: number; docs: number }
interface NavDef {
  key: string; label: string; icon: string; group: string
  module?: ModuleKey
  /** 해외 연자가 있을 때만 노출 */
  overseasOnly?: boolean
  hold?: boolean
  count?: (n: Counts) => number | undefined
}

const NAV: NavDef[] = [
  { key: 'dashboard', label: '대시보드', icon: '◎', group: '현황' },
  { key: 'risks', label: '리스크·정합성', icon: '⚠', group: '현황', count: c => c.risks || undefined },
  { key: 'calendar', label: '캘린더', icon: '▦', group: '현황', module: '캘린더' },
  { key: 'pipeline', label: '섭외 파이프라인', icon: '⇉', group: '초청 관리' },
  { key: 'workspace', label: '연자 워크스페이스', icon: '▤', group: '초청 관리', count: c => c.issues || undefined },
  { key: 'speakers', label: '연자 목록', icon: '☰', group: '초청 관리', count: c => c.speakers },
  { key: 'sessions', label: '세션·프로그램', icon: '▥', group: '초청 관리', module: '세션·프로그램' },
  { key: 'visa', label: '출입국·사증', icon: '🛂', group: '실무 진행', module: '출입국·사증', overseasOnly: true, hold: true, count: c => c.visa || undefined },
  { key: 'travel', label: '교통·숙박·의전', icon: '✈', group: '실무 진행', module: '교통·숙박' },
  { key: 'deliverables', label: '제출물·콘텐츠', icon: '📎', group: '실무 진행', module: '제출물·콘텐츠' },
  { key: 'onsite', label: '현장 운영', icon: '◧', group: '실무 진행', module: '현장운영' },
  { key: 'abstracts', label: '초록 심사', icon: '📄', group: '학회 운영', module: '초록심사' },
  { key: 'registrations', label: '참가 등록', icon: '🎫', group: '학회 운영', module: '참가등록' },
  { key: 'credits', label: '연수평점', icon: '🏅', group: '학회 운영', module: '연수평점' },
  { key: 'sponsors', label: '후원·전시', icon: '🤝', group: '학회 운영', module: '후원·전시' },
  { key: 'settlement', label: '정산·예산', icon: '₩', group: '정산·사후', module: '정산·예산' },
  { key: 'docs', label: '문서·회의록', icon: '📝', group: '협업', module: '문서·회의록', count: c => c.docs || undefined },
  { key: 'tasks', label: '업무·체크리스트', icon: '✓', group: '협업', count: c => c.tasks || undefined },
  { key: 'comms', label: '커뮤니케이션', icon: '✉', group: '협업' },
  { key: 'audit', label: '변경 이력', icon: '↺', group: '협업' },
  { key: 'settings', label: '행사 설정·모듈', icon: '⚙', group: '설정' },
]

export function App() {
  const { state, dispatch } = useApp()
  const route = useRoute()
  const conf = activeConference(state)
  const labels = labelsOf(conf)
  const risks = computeRisks(state)
  const k = kpis(state)
  const overseas = overseasSpeakers(state)
  const [theme, setTheme] = useState(document.documentElement.dataset.theme ?? 'light')
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const counts: Counts = {
    speakers: speakersOf(state).length,
    risks: risks.filter(r => r.level !== 'warning').length,
    tasks: tasksOf(state).filter(t => t.status !== '완료' && t.dueDate < today()).length,
    visa: overseas.filter(s => s.visa.required && s.visa.stage !== '발급완료').length,
    issues: validateAll(state).reduce((a, x) => a + x.issues.filter(i => i.level === '오류').length, 0),
    docs: state.docs.filter(d => d.conferenceId === conf.id).length,
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('onference.theme', next)
    setTheme(next)
  }

  /** 활성 모듈과 해외 연자 유무로 메뉴를 거른다 */
  const visible = NAV.filter(n => {
    if (n.module && !hasModule(conf, n.module)) return false
    if (n.overseasOnly && !needsOverseasModules(state)) return false
    return true
  })
  const groups = [...new Set(visible.map(n => n.group))]
  const nav = (key: string) => visible.some(n => n.key === key)

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <div className="brand-mark">O</div>
          <div>
            <div className="brand-name">ONFERENCE</div>
            <div className="brand-sub">국내외 컨퍼런스 행사 관리</div>
          </div>
        </div>
        {groups.map(g => (
          <div key={g}>
            <div className="nav-group">{g.toUpperCase()}</div>
            {visible.filter(n => n.group === g).map(n => {
              const c = n.count?.(counts)
              return (
                <button key={n.key} className="nav-item" aria-current={route.page === n.key} onClick={() => go(n.key)}>
                  <span className="nav-icon" aria-hidden>{n.icon}</span>
                  <span>{n.label}</span>
                  {n.hold && <span className="chip xsmall" style={{ padding: '0 5px' }}>검증 전</span>}
                  {c !== undefined && <span className="nav-count">{c}</span>}
                </button>
              )
            })}
          </div>
        ))}
        <div className="nav-foot">
          내부 운영용 · 비배포<br />데이터는 브라우저에 로컬 저장됩니다.
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <select className="select" value={state.activeConferenceId}
            onChange={e => dispatch({ type: 'SET_CONFERENCE', id: e.target.value })} aria-label="행사 선택">
            {state.conferences.map(c => (
              <option key={c.id} value={c.id}>[{c.scope}] {c.nameKo} ({c.code})</option>
            ))}
          </select>
          <span className="chip nowrap">{conf.startDate.replace(/-/g, '.')} ~ {conf.endDate.slice(5).replace('-', '.')}</span>
          <span className="chip nowrap" title="행사 시작일까지 남은 일수">개막 {ddayLabel(conf.startDate)}</span>
          <span className="chip nowrap">{conf.venue.split(' ')[0]} · {conf.city}</span>
          <button className="btn btn-sm no-print" onClick={() => setSearchOpen(true)} title="전역 검색 (Ctrl/⌘+K)">🔍 검색</button>
          <span className="spacer" />
          <span className="chip nowrap" title={`확정 ${labels.speaker} 수`}>
            확정 {k.confirmed}명{overseas.length > 0 ? ` · 해외 ${overseas.length}` : ''}
          </span>
          {counts.risks > 0 && (
            <button className="badge t-critical" style={{ cursor: 'pointer' }} onClick={() => go('risks')}>⚠ 위험 {counts.risks}건</button>
          )}
          <select className="select" value={state.currentUserId} onChange={e => dispatch({ type: 'SET_USER', id: e.target.value })} aria-label="사용자(권한) 선택">
            {state.members.map(m => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
          </select>
          <button className="btn btn-sm" onClick={toggleTheme} title="다크 모드 전환">{theme === 'dark' ? '☀' : '☾'}</button>
        </header>

        <main className="page">
          {route.page === 'dashboard' && <Dashboard />}
          {route.page === 'risks' && <Risks />}
          {route.page === 'calendar' && nav('calendar') && <Calendar />}
          {route.page === 'pipeline' && <Pipeline />}
          {route.page === 'workspace' && <Workspace />}
          {route.page === 'speakers' && (route.id ? <SpeakerDetail id={route.id} /> : <Speakers />)}
          {route.page === 'sessions' && nav('sessions') && <Sessions />}
          {route.page === 'visa' && nav('visa') && <Visa />}
          {route.page === 'travel' && nav('travel') && <Travel />}
          {route.page === 'deliverables' && nav('deliverables') && <Deliverables />}
          {route.page === 'onsite' && nav('onsite') && <Onsite />}
          {route.page === 'abstracts' && nav('abstracts') && <Abstracts />}
          {route.page === 'registrations' && nav('registrations') && <Registrations />}
          {route.page === 'credits' && nav('credits') && <Credits />}
          {route.page === 'sponsors' && nav('sponsors') && <Sponsors />}
          {route.page === 'settlement' && nav('settlement') && <Settlement />}
          {route.page === 'docs' && nav('docs') && <Docs />}
          {route.page === 'tasks' && <TasksPage />}
          {route.page === 'comms' && <Comms />}
          {route.page === 'audit' && <Audit />}
          {route.page === 'settings' && <Settings />}
          {!visible.some(n => n.key === route.page) && !['speakers', 'tasks', 'comms', 'audit', 'settings', 'dashboard', 'risks', 'pipeline', 'workspace'].includes(route.page) && (
            <div className="empty">
              이 행사에서 비활성화된 모듈입니다. <button className="btn btn-sm" onClick={() => go('settings')}>행사 설정에서 모듈 변경</button>
            </div>
          )}
        </main>
      </div>

      <Search open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
