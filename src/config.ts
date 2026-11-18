/**
 * 실행 설정 로딩
 *
 * 배포 서버가 `/config.json` 을 내려 주면 공유 모드(Firestore)로 동작하고,
 * 없으면 로컬 모드로 동작한다. 덕분에 같은 빌드 산출물을
 * "혼자 쓰는 단일 HTML"과 "팀이 함께 쓰는 서버 배포"에 모두 쓸 수 있다.
 */
export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  storageBucket?: string
  messagingSenderId?: string
}

export interface RuntimeConfig {
  firebase?: FirebaseConfig
  /** 로그인 허용 도메인 (예: "example.org") — 비우면 제한하지 않는다 */
  allowedDomain?: string
  /** 화면 상단에 표시할 배포 환경 라벨 */
  environmentLabel?: string
}

let cached: RuntimeConfig | null = null

export async function loadConfig(): Promise<RuntimeConfig> {
  if (cached) return cached
  // 단일 HTML 을 파일로 연 경우에는 설정 요청 자체가 불가능하므로 바로 로컬 모드로 간다
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    cached = {}
    return cached
  }
  try {
    const res = await fetch('config.json', { cache: 'no-store' })
    if (res.ok) {
      const json = (await res.json()) as RuntimeConfig
      const fb = json.firebase
      cached = fb?.apiKey && fb.projectId && fb.appId ? json : {}
      return cached
    }
  } catch { /* 설정 파일이 없으면 로컬 모드 */ }
  cached = {}
  return cached
}

export const hasSharedBackend = (c: RuntimeConfig) => Boolean(c.firebase?.projectId)
