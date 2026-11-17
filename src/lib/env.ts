/**
 * 실행 환경 판별.
 * 아티팩트 뷰어(프레임 내부)에서는 파일 다운로드와 window.print() 가 동작하지 않으므로,
 * 해당 기능을 숨기거나 대체 동작(복사용 패널)으로 바꾼다.
 */
export const IN_FRAME: boolean = (() => {
  try { return window.self !== window.top } catch { return true }
})()

/** 파일 저장이 가능한 환경인가 (로컬 파일·개발 서버) */
export const CAN_DOWNLOAD = !IN_FRAME
/** 인쇄 대화상자를 띄울 수 있는 환경인가 */
export const CAN_PRINT = !IN_FRAME
