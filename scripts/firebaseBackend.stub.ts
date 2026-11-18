/**
 * 단일 HTML(1인 모드) 빌드용 대체 모듈.
 * 이 빌드에는 공유 백엔드가 포함되지 않으므로 용량을 줄이기 위해 비워 둔다.
 * (공유 모드는 서버 배포본에서만 동작한다)
 */
export class FirebaseBackend {
  constructor() {
    throw new Error('이 빌드에는 공유 백엔드가 포함되어 있지 않습니다. 서버 배포본을 사용하세요.')
  }
}
