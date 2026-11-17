/**
 * 행사 성격(scope)과 참가자 거주 구분(residency)에 따른 분기 헬퍼
 * - 모듈 활성 여부, 화면 용어, 해외 전용 기능의 노출을 한 곳에서 관리한다.
 */
import type { AppState, Conference, ModuleKey, Speaker } from '../types'

export const hasModule = (conf: Conference, key: ModuleKey) => conf.modules.includes(key)

/** 해외 전용 모듈은 '해외 연자가 실제로 있을 때'만 의미가 있다 */
export const overseasSpeakers = (state: AppState) =>
  state.speakers.filter(s => s.conferenceId === state.activeConferenceId && s.residency === '해외' && !['거절', '취소'].includes(s.stage))

export const needsOverseasModules = (state: AppState) => overseasSpeakers(state).length > 0

/** 화면 용어 — 국내 학회와 국제 컨퍼런스의 호칭이 다르다 */
export interface ScopeLabels {
  speaker: string        // 연자 / 연사
  speakerPlural: string
  invite: string         // 초청 / 섭외
  honorarium: string     // 사례비 / 강연료
  travel: string         // 교통 / 항공
  attendee: string       // 참가자
}

export const labelsOf = (conf: Conference): ScopeLabels =>
  conf.scope === '국내'
    ? { speaker: '연자', speakerPlural: '연자', invite: '섭외', honorarium: '사례비', travel: '교통·숙박', attendee: '참가자' }
    : { speaker: '연사', speakerPlural: '연사', invite: '초청', honorarium: '강연료', travel: '여행·의전', attendee: '참가자' }

/** 표시용 이름 — 국내 연자는 한글명을 우선한다 */
export const displayName = (sp: Pick<Speaker, 'nameKo' | 'nameEn'>) => sp.nameKo || sp.nameEn

/** 이 연자에게 출입국·사증 절차가 필요한가 */
export const needsImmigration = (sp: Speaker) => sp.residency === '해외' && sp.attendanceMode !== '온라인'

/** 이 연자에게 해외 송금이 필요한가 */
export const needsOverseasPayment = (sp: Speaker) => sp.residency === '해외'

/** 원천징수율 — 소득 구분에서 도출 (국내 거주자 3.3% / 8.8%, 비거주자 22%) */
export const rateOf = (sp: Speaker) => sp.settlement.withholdingRate

/** 교통 수단 표기 */
export const travelLabel = (mode: string) =>
  mode === '국제선' ? '국제선 항공' : mode === '국내선' ? '국내선 항공' : mode
