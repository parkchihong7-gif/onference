import { useEffect, useState } from 'react'
import { useApp } from '../store'
import type { Invite } from '../data/backend'
import { ConferenceDialog } from '../components/Create'
import { activeConference } from '../lib/metrics'
import { Badge, Card, DL, StatTile } from '../components/ui'
import { CORE_MODULES, DOMESTIC_MODULES, OVERSEAS_MODULES } from '../types'
import { needsOverseasModules, labelsOf } from '../lib/scope'
import type { ModuleKey } from '../types'
import { fmtDate, krw } from '../lib/format'

const ROLES = ['사무국', 'PCO', '리에종', '여행사', '재무', '연사'] as const

export function Settings() {
  const { state, dispatch, status, invites } = useApp()
  const labels = labelsOf(activeConference(state))
  const conf = activeConference(state)
  const [inviteList, setInviteList] = useState<Invite[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<string>('리에종')
  const [msg, setMsg] = useState('')
  const [newConf, setNewConf] = useState(false)
  const [freshConf, setFreshConf] = useState(false)
  const [editConf, setEditConf] = useState(false)
  const canInvite = invites.supported && status.user?.role === '사무국'

  useEffect(() => {
    if (!invites.supported) return
    invites.list().then(setInviteList).catch(() => setInviteList([]))
  }, [invites])

  /** 권한 오류는 원인이 서로 달라 메시지를 구분해 준다 */
  const reason = (e: unknown) => {
    const m = String((e as { message?: string })?.message ?? e)
    return m.includes('permission-denied')
      ? '권한이 없습니다. 사무국 역할로 로그인했는지 확인하세요.'
      : m.replace(/^FirebaseError:\s*/, '')
  }

  const refreshInvites = async () => {
    try { setInviteList(await invites.list()) } catch { /* 목록은 못 가져와도 초대 자체는 유효하다 */ }
  }

  const addInvite = async () => {
    if (!email.includes('@')) { setMsg('이메일 형식을 확인하세요.'); return }
    // 등록과 목록 조회를 한 묶음으로 처리하면, 목록 조회 실패가 '초대 실패'로 잘못 보인다
    try {
      await invites.add({ email, name: name || email.split('@')[0], role, org: '' })
    } catch (e) { setMsg(`초대 실패: ${reason(e)}`); return }
    setEmail(''); setName(''); setMsg('초대했습니다. 해당 계정으로 로그인하면 바로 접근됩니다.')
    await refreshInvites()
  }

  const revoke = async (target: string) => {
    try {
      await invites.revoke(target)
    } catch (e) { setMsg(`회수 실패: ${reason(e)}`); return }
    setMsg(`${target} 초대를 회수했습니다.`)
    await refreshInvites()
  }

  const reset = () => {
    if (confirm('로컬 저장 데이터를 초기 시드 상태로 되돌립니다. 계속할까요?')) dispatch({ type: 'RESET' })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">행사 설정 · 모듈</h1>
          <p className="page-desc">
            행사 성격(국내/국제)과 활성 모듈, 지원 패키지, 체크리스트 템플릿, 권한 구성을 관리합니다.
            모듈을 끄면 해당 메뉴가 숨겨지고, 켜면 즉시 나타납니다. 초기 세팅에서 템플릿을 확정하면
            신규 {labels.speaker} 등록 시 업무·제출물·기한이 자동 생성됩니다.
          </p>
        </div>
        <div className="row-wrap no-print">
          <button className="btn btn-primary" onClick={() => setNewConf(true)}>＋ 새 행사 만들기</button>
          <button className="btn" onClick={() => setFreshConf(true)}>⌦ 전체 비우고 새 행사 시작</button>
          <button className="btn" onClick={() => reset()}>↺ 데모 데이터로 되돌리기</button>
        </div>
      </div>

      <div className="grid g4">
        <StatTile label="등록 행사" value={state.conferences.length} unit="건"
          foot={`국내 ${state.conferences.filter(c => c.scope === '국내').length} · 국제 ${state.conferences.filter(c => c.scope === '국제').length}`} />
        <StatTile label="지원 패키지" value={state.supportPackages.length} unit="종" foot="등급별 지원 범위" />
        <StatTile label="체크리스트 템플릿" value={state.checklistTemplates.reduce((a, t) => a + t.items.length, 0)} unit="항목"
          foot={`${state.checklistTemplates.length}개 템플릿`} />
        <StatTile label="구성원" value={state.members.length} unit="명" foot={`${new Set(state.members.map(m => m.role)).size}개 역할`} />
      </div>

      <ConferenceDialog open={newConf} onClose={() => setNewConf(false)} />
      <ConferenceDialog fresh open={freshConf} onClose={() => setFreshConf(false)} />
      <ConferenceDialog edit={conf} open={editConf} onClose={() => setEditConf(false)} />

      <Card title="데이터 저장 방식"
        sub={status.mode === '공유' ? '여러 담당자가 같은 데이터를 실시간으로 함께 봅니다' : '이 브라우저에만 저장됩니다'}>
        <div className="row-wrap" style={{ gap: 10, marginBottom: 12 }}>
          <Badge tone={status.mode === '공유' ? 'good' : 'warning'}>
            {status.mode === '공유' ? '공유 백엔드 연결됨' : '1인 모드(로컬 저장)'}
          </Badge>
          {status.mode === '공유' && status.user && (
            <span className="chip">{status.user.name} · {status.user.role} · {status.user.email}</span>
          )}
          {status.pending > 0 && <span className="chip">저장 대기 {status.pending}건</span>}
          {status.error && <Badge tone="critical">{status.error}</Badge>}
        </div>
        {status.mode === '로컬' ? (
          <div className="alert alert-warning">
            <span aria-hidden>⚠</span>
            <span>
              <strong>지금은 공동 작업이 되지 않습니다.</strong> 입력한 내용이 이 브라우저에만 남아
              다른 담당자에게 보이지 않습니다. 서버에 Firestore 설정을 넣어 배포하면 같은 화면이
              공유 모드로 전환됩니다 — <code>deploy/GOOGLE_CLOUD.md</code> 의 "공동 작업 설정" 참고.
            </span>
          </div>
        ) : (
          <div className="alert alert-info">
            <span aria-hidden>ℹ</span>
            <span>
              모든 변경은 문서 단위로 저장되어 다른 담당자 화면에 즉시 반영됩니다.
              역할에 따라 수정할 수 있는 영역이 다릅니다(여행사는 교통·숙박, 재무는 정산 등).
            </span>
          </div>
        )}
      </Card>

      {invites.supported && (
        <Card title="구성원 · 접근 권한"
          sub={canInvite ? '초대한 구글 계정만 이 데이터를 열 수 있습니다' : '초대 관리는 사무국 권한에서만 가능합니다'}>
          {canInvite && (
            <div className="row-wrap no-print" style={{ marginBottom: 12 }}>
              <input className="input" style={{ flex: '2 1 220px' }} placeholder="초대할 구글 계정 이메일"
                value={email} onChange={e => setEmail(e.target.value)} />
              <input className="input" style={{ flex: '1 1 140px' }} placeholder="이름(선택)"
                value={name} onChange={e => setName(e.target.value)} />
              <select className="select" value={role} onChange={e => setRole(e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
              <button className="btn btn-primary" onClick={() => void addInvite()}>＋ 초대</button>
            </div>
          )}
          {msg && <div className="small sec" style={{ marginBottom: 10 }}>{msg}</div>}
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>이메일</th><th>이름</th><th>역할</th><th>상태</th>{canInvite && <th className="no-print">관리</th>}</tr></thead>
              <tbody>
                {inviteList.map(iv => {
                  const joined = state.members.some(m => m.email === iv.email)
                  return (
                    <tr key={iv.email}>
                      <td className="small">{iv.email}</td>
                      <td className="small">{iv.name}</td>
                      <td><Badge tone="neutral">{iv.role}</Badge></td>
                      <td>{joined ? <Badge tone="good">사용 중</Badge> : <Badge tone="warning">초대됨(미접속)</Badge>}</td>
                      {canInvite && (
                        <td className="no-print">
                          <button className="btn btn-sm" onClick={() => void revoke(iv.email)}>회수</button>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {!inviteList.length && <tr><td colSpan={5} className="empty">초대된 계정이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="모듈 구성" sub="행사 성격에 따라 기본값이 적용되며, 필요에 따라 켜고 끌 수 있습니다">
        <div className="grid g3">
          {([['공통 모듈', CORE_MODULES], ['국내 학회 모듈', DOMESTIC_MODULES], [`해외 ${labels.speaker} 모듈 (검증 전)`, OVERSEAS_MODULES]] as [string, ModuleKey[]][]).map(([group, keys]) => (
            <div key={group}>
              <div className="small sec" style={{ marginBottom: 8, fontWeight: 600 }}>{group}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {keys.map(k => {
                  const on = conf.modules.includes(k)
                  const isOverseas = OVERSEAS_MODULES.includes(k)
                  return (
                    <label key={k} className="row small" style={{ gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={on}
                        onChange={() => dispatch({ type: 'TOGGLE_MODULE', conferenceId: conf.id, module: k })} />
                      <span style={{ flex: 1 }}>{k}</span>
                      {isOverseas && !needsOverseasModules(state) && <span className="chip xsmall">해외 {labels.speaker} 없음</span>}
                      {isOverseas && <span className="chip xsmall">검증 전</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="alert alert-info" style={{ marginTop: 14 }}>
          <span aria-hidden>ℹ</span>
          <span>
            출입국·사증, 해외송금·조세조약은 <strong>해외에서 오는 {labels.speaker}가 있을 때만</strong> 메뉴에 표시됩니다.
            국내 학회에 해외 {labels.speaker} 1명이 있어도 동일하게 적용되며, 그 외 과정(섭외·계약·교통·숙박·제출물·현장·정산)은
            국내 {labels.speaker}와 같은 모듈로 처리됩니다.
          </span>
        </div>
      </Card>

      <div className="grid g2">
        <Card title="행사 기본 정보"
          right={<button className="btn btn-sm no-print" onClick={() => setEditConf(true)}>✎ 수정</button>}>
          <DL items={[
            ['행사 성격', <><Badge tone={conf.scope === '국내' ? 'info' : 'neutral'}>{conf.scope}</Badge> <span className="chip">{conf.industry}</span></>],
            ['행사명(국문)', conf.nameKo], ['행사명(영문)', conf.nameEn], ['코드', conf.code],
            ['기간', `${fmtDate(conf.startDate)} ~ ${fmtDate(conf.endDate)}`],
            ['장소', `${conf.venue} · ${conf.city}, ${conf.country}`],
            ['타임존', conf.timezone],
            ['주최/주관', `${conf.host} / ${conf.organizer}`],
            ['운영대행(PCO)', conf.pco],
            ['후원', conf.sponsors.join(', ')],
            ['트랙', conf.tracks.join(' · ')],
            ['예상 참가', `${conf.expectedAttendees.toLocaleString()}명`],
            ['총 예산 / 초청 예산', `${krw(conf.budgetTotalKRW)} / ${krw(conf.invitationBudgetKRW)}`],
            ['연수평점 기관', conf.creditAuthority ?? '해당 없음'],
            ['활성 모듈', `${conf.modules.length}개`],
            ['상태', <Badge tone="info">{conf.status}</Badge>],
          ]} />
        </Card>
        <Card title="권한(역할) 구성" sub="역할별로 접근 가능한 데이터 범위를 분리합니다">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>이름</th><th>역할</th><th>소속</th><th>연락처</th></tr></thead>
              <tbody>
                {state.members.map(m => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td><Badge tone="neutral">{m.role}</Badge></td>
                    <td className="small nowrap">{m.org}</td>
                    <td className="small num">{m.phone ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="xsmall muted" style={{ paddingLeft: 16, marginTop: 10, lineHeight: 1.8 }}>
            <li><strong>사무국</strong> — 전체 데이터 및 예산·정산 접근</li>
            <li><strong>PCO</strong> — {labels.speaker} 실무(제출물·현장·배차), 정산 금액 비공개</li>
            <li><strong>리에종</strong> — 담당 {labels.speaker} 전체 · 타 {labels.speaker} 열람 제한</li>
            <li><strong>여행사</strong> — 항공·숙박·배차 및 필요한 여권 정보만</li>
            <li><strong>재무</strong> — 정산·세무·송금 정보</li>
            <li><strong>연사</strong> — 본인 제출물·일정 확인(본인 포털). 역할 이름은 데이터 값이라 행사 성격과 무관하게 고정입니다.</li>
          </ul>
        </Card>
      </div>

      <Card title="등급별 지원 패키지" sub="초청 시 자동 적용되는 지원 범위 템플릿">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>패키지</th><th>등급</th><th>항공</th><th>발권</th><th>숙박</th><th>정산</th><th className="right">일비</th><th className="right">강연료</th><th>지상교통</th><th>동반자</th><th>보험</th></tr></thead>
            <tbody>
              {state.supportPackages.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong>{p.notes && <div className="xsmall muted">{p.notes}</div>}</td>
                  <td className="small">{p.tier}</td>
                  <td className="small">{p.airCabin}</td>
                  <td className="small nowrap">{p.airTicketedBy}</td>
                  <td className="small nowrap">{p.hotelNights}박 · {p.hotelGrade}</td>
                  <td className="small nowrap">{p.hotelBilling}</td>
                  <td className="right num">{krw(p.perDiemKRW)}</td>
                  <td className="right num">{krw(p.honorariumKRW)}</td>
                  <td className="small">{p.groundTransfer ? '제공' : '-'}</td>
                  <td className="small">{p.companionSupported ? (p.companionScope ?? '지원') : '-'}</td>
                  <td className="small">{p.insurance ? '가입' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {state.checklistTemplates.map(t => (
        <Card key={t.id} title={`체크리스트 템플릿 · ${t.name}`} sub={`${t.items.length}개 항목 · 적용 대상 ${t.appliesTo === 'ALL' ? '전 등급' : (t.appliesTo as string[]).join(', ')}`}>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>#</th><th>업무</th><th>단계</th><th>기한(행사일 기준)</th><th>담당 역할</th></tr></thead>
              <tbody>
                {t.items.map((it, i) => (
                  <tr key={it.title}>
                    <td className="num muted">{i + 1}</td>
                    <td>{it.title}</td>
                    <td className="small muted">{it.phase}</td>
                    <td className="num small">{it.offsetDays >= 0 ? `D+${it.offsetDays}` : `D${it.offsetDays}`}</td>
                    <td className="small"><Badge tone="neutral">{it.ownerRole}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <Card title="데이터 취급 안내">
        <ul className="small sec" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.85 }}>
          <li>본 대시보드는 <strong>내부 운영용(비배포)</strong>으로, 데이터는 브라우저 로컬 스토리지에만 저장됩니다.</li>
          <li>여권번호·계좌번호 등 민감정보는 화면에서 마스킹되며, 원본 문서는 별도 문서고에서 접근 권한을 통제합니다.</li>
          <li>유럽(EEA) 거주 {labels.speaker} 데이터는 GDPR 적용 대상으로, 수집 목적·보유기간 고지와 동의 기록이 필요합니다.</li>
          <li>행사 종료 후 보유기간이 경과한 개인정보는 파기 대상으로 분류합니다.</li>
        </ul>
      </Card>
    </>
  )
}
