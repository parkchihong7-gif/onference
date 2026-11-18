import type { ReactNode } from 'react'
import { useApp } from '../store'

/**
 * 공유 모드에서 로그인·권한 상태를 가리는 관문.
 * 로컬(1인) 모드에서는 아무것도 하지 않고 그대로 화면을 보여 준다.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, signIn, signOut } = useApp()

  if (status.mode === '로컬') return <>{children}</>

  if (status.needsSignIn) {
    return (
      <Screen
        title="ONFERENCE"
        sub="국내외 컨퍼런스 행사 관리"
        body={
          <>
            <p className="sec" style={{ marginBottom: 18, lineHeight: 1.7 }}>
              행사 담당자들이 같은 데이터를 함께 보는 공동 작업 환경입니다.<br />
              초대받은 구글 계정으로 로그인하세요.
            </p>
            <button className="btn btn-primary" style={{ padding: '10px 18px', fontSize: 14 }} onClick={() => void signIn()}>
              구글 계정으로 로그인
            </button>
            {status.error && <div className="alert alert-critical" style={{ marginTop: 16 }}><span aria-hidden>⛔</span><span>{status.error}</span></div>}
          </>
        }
      />
    )
  }

  if (status.error && !status.connected) {
    return (
      <Screen
        title="접근 권한이 없습니다"
        sub={status.user?.email}
        body={
          <>
            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              <span aria-hidden>⚠</span><span>{status.error}</span>
            </div>
            <button className="btn" onClick={() => void signOut()}>다른 계정으로 로그인</button>
          </>
        }
      />
    )
  }

  if (!status.connected) {
    return <Screen title="데이터를 불러오는 중" sub="잠시만 기다려 주세요" body={<div className="muted small">공유 백엔드에 연결하고 있습니다.</div>} />
  }

  return <>{children}</>
}

function Screen({ title, sub, body }: { title: string; sub?: string; body: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--page)', padding: 24 }}>
      <div className="card" style={{ width: 'min(460px, 100%)', textAlign: 'center', padding: '32px 28px' }}>
        <div className="brand-mark" style={{ margin: '0 auto 14px', width: 40, height: 40, fontSize: 18 }}>O</div>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>{title}</h1>
        {sub && <div className="small muted" style={{ marginBottom: 20 }}>{sub}</div>}
        {body}
      </div>
    </div>
  )
}
