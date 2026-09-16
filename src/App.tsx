import { useState } from 'react'
import { useApp } from './store'
import { go, useRoute } from './lib/router'
import { activeConference, computeRisks, kpis, speakersOf, tasksOf } from './lib/metrics'
import { ddayLabel, today } from './lib/format'
import { Dashboard } from './pages/Dashboard'
import { Pipeline } from './pages/Pipeline'
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

interface NavDef { key: string; label: string; icon: string; group: string; count?: (n: Counts) => number | undefined }
interface Counts { speakers: number; risks: number; tasks: number; visa: number; comms: number }

const NAV: NavDef[] = [
  { key: 'dashboard', label: '대시보드', icon: '◎', group: '현황' },
  { key: 'risks', label: '리스크·경보', icon: '⚠', group: '현황', count: c => c.risks || undefined },
  { key: 'pipeline', label: '초청 파이프라인', icon: '⇉', group: '초청 관리' },
  { key: 'speakers', label: '연사·초청자', icon: '☰', group: '초청 관리', count: c => c.speakers },
  { key: 'sessions', label: '세션·프로그램', icon: '▤', group: '초청 관리' },
  { key: 'visa', label: '출입국·비자', icon: '🛂', group: '실무 진행', count: c => c.visa || undefined },
  { key: 'travel', label: '여행·의전', icon: '✈', group: '실무 진행' },
  { key: 'deliverables', label: '제출물·콘텐츠', icon: '📎', group: '실무 진행' },
  { key: 'onsite', label: '현장 운영', icon: '◧', group: '실무 진행' },
  { key: 'settlement', label: '정산·예산', icon: '₩', group: '정산·사후' },
  { key: 'tasks', label: '업무·체크리스트', icon: '✓', group: '협업', count: c => c.tasks || undefined },
  { key: 'comms', label: '커뮤니케이션', icon: '✉', group: '협업' },
  { key: 'audit', label: '변경 이력', icon: '↺', group: '협업' },
  { key: 'settings', label: '행사 설정·템플릿', icon: '⚙', group: '설정' },
]

export function App() {
  const { state, dispatch } = useApp()
  const route = useRoute()
  const conf = activeConference(state)
  const risks = computeRisks(state)
  const k = kpis(state)
  const [theme, setTheme] = useState(document.documentElement.dataset.theme ?? 'light')

  const counts: Counts = {
    speakers: speakersOf(state).length,
    risks: risks.filter(r => r.level !== 'warning').length,
    tasks: tasksOf(state).filter(t => t.status !== '완료' && t.dueDate < today()).length,
    visa: speakersOf(state).filter(s => s.visa.required && s.visa.stage !== '발급완료' && s.stage !== '거절').length,
    comms: 0,
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('onference.theme', next)
    setTheme(next)
  }

  const groups = [...new Set(NAV.map(n => n.group))]

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <div className="brand-mark">O</div>
          <div>
            <div className="brand-name">ONFERENCE</div>
            <div className="brand-sub">해외 연사 초청자 관리</div>
          </div>
        </div>
        {groups.map(g => (
          <div key={g}>
            <div className="nav-group">{g.toUpperCase()}</div>
            {NAV.filter(n => n.group === g).map(n => {
              const c = n.count?.(counts)
              return (
                <button key={n.key} className="nav-item" aria-current={route.page === n.key}
                  onClick={() => go(n.key)}>
                  <span className="nav-icon" aria-hidden>{n.icon}</span>
                  <span>{n.label}</span>
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
            onChange={e => { dispatch({ type: 'SET_CONFERENCE', id: e.target.value }); }}
            aria-label="행사 선택">
            {state.conferences.map(c => (
              <option key={c.id} value={c.id}>{c.nameKo} ({c.code})</option>
            ))}
          </select>
          <span className="chip nowrap">{conf.startDate.replace(/-/g, '.')} ~ {conf.endDate.slice(5).replace('-', '.')}</span>
          <span className="chip nowrap" title="행사 시작일까지 남은 일수">개막 {ddayLabel(conf.startDate)}</span>
          <span className="chip nowrap">{conf.venue.split(' ')[0]} · {conf.city}</span>
          <span className="spacer" />
          <span className="chip nowrap" title="확정 연사 / 파견 국가 수">확정 {k.confirmed}명 · {k.countries}개국</span>
          {counts.risks > 0 && (
            <button className="badge t-critical" style={{ cursor: 'pointer' }} onClick={() => go('risks')}>
              ⚠ 위험 {counts.risks}건
            </button>
          )}
          <select className="select" value={state.currentUserId} onChange={e => dispatch({ type: 'SET_USER', id: e.target.value })} aria-label="사용자(권한) 선택">
            {state.members.map(m => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
          </select>
          <button className="btn btn-sm" onClick={toggleTheme} title="다크 모드 전환">{theme === 'dark' ? '☀' : '☾'}</button>
        </header>

        <main className="page">
          {route.page === 'dashboard' && <Dashboard />}
          {route.page === 'risks' && <Risks />}
          {route.page === 'pipeline' && <Pipeline />}
          {route.page === 'speakers' && (route.id ? <SpeakerDetail id={route.id} /> : <Speakers />)}
          {route.page === 'sessions' && <Sessions />}
          {route.page === 'visa' && <Visa />}
          {route.page === 'travel' && <Travel />}
          {route.page === 'deliverables' && <Deliverables />}
          {route.page === 'onsite' && <Onsite />}
          {route.page === 'settlement' && <Settlement />}
          {route.page === 'tasks' && <TasksPage />}
          {route.page === 'comms' && <Comms />}
          {route.page === 'audit' && <Audit />}
          {route.page === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}
