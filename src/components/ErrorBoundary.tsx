import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * 렌더링 중 예외가 나면 화면이 통째로 비어 버린다(백지).
 * 무엇이 잘못됐는지 보여 주고 복구 수단을 주기 위한 안전망.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('화면 렌더링 오류:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const msg = this.state.error.message || String(this.state.error)
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--page)', padding: 24 }}>
        <div className="card" style={{ width: 'min(560px, 100%)', padding: '28px 26px' }}>
          <div className="brand-mark" style={{ width: 40, height: 40, fontSize: 18, marginBottom: 14 }}>O</div>
          <h1 style={{ fontSize: 19, marginBottom: 6 }}>화면을 그리지 못했습니다</h1>
          <p className="small muted" style={{ marginBottom: 16, lineHeight: 1.7 }}>
            데이터를 불러오는 중 예기치 못한 상태를 만났습니다. 새로고침으로 대부분 해결됩니다.
          </p>
          <pre className="small" style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
            padding: 12, overflow: 'auto', whiteSpace: 'pre-wrap', marginBottom: 16,
          }}>{msg}</pre>
          <div className="row-wrap">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>새로고침</button>
            <button className="btn" onClick={() => {
              // 브라우저에 남은 화면 상태만 비운다(공유 데이터는 건드리지 않는다)
              try { localStorage.removeItem('onference.view') } catch { /* noop */ }
              window.location.reload()
            }}>화면 설정 초기화 후 새로고침</button>
          </div>
        </div>
      </div>
    )
  }
}
