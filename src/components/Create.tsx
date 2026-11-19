import { labelsOf } from '../lib/scope'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store'
import { Field, Modal } from './ui'
import { activeConference } from '../lib/metrics'
import {
  createConference, createSession, createSpeaker, defaultModules, freshState,
  type NewConferenceInput, type NewSessionInput, type NewSpeakerInput,
} from '../lib/factory'
import { addDays } from '../data/base'
import { today } from '../lib/format'
import type {
  Conference, ConferenceScope, DeliveryMode, Industry, Session, Speaker, SpeakerTier, Sponsorship,
} from '../types'

const INDUSTRIES: Industry[] = ['의료·학회', '학술', '기업', '공공', '협회']
const TIERS: SpeakerTier[] = ['Keynote', 'Invited', 'Panel', 'Moderator', 'Chair', 'Workshop']

/* ───────────────────────────── 새 행사 ───────────────────────────── */

/**
 * 행사 만들기 / 수정하기
 * edit 이 오면 그 행사의 값으로 채워 열리고, 저장하면 변경분만 반영된다.
 * 변경은 공유 데이터에 바로 쓰이므로 다른 담당자 화면에도 즉시 적용된다.
 */
export function ConferenceDialog(
  { open, onClose, fresh = false, edit }:
  { open: boolean; onClose: () => void; fresh?: boolean; edit?: Conference },
) {
  const { state, dispatch, reset: resetAll } = useApp()
  const [scope, setScope] = useState<ConferenceScope>('국내')
  const [industry, setIndustry] = useState<Industry>('의료·학회')
  const [nameKo, setNameKo] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [code, setCode] = useState('')
  const [startDate, setStartDate] = useState(addDays(today(), 90))
  const [endDate, setEndDate] = useState(addDays(today(), 91))
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('서울')
  const [host, setHost] = useState('')
  const [pco, setPco] = useState('')
  const [attendees, setAttendees] = useState(500)
  const [budget, setBudget] = useState(100_000_000)
  const [inviteBudget, setInviteBudget] = useState(30_000_000)
  const [tracks, setTracks] = useState('')
  const [creditAuthority, setCreditAuthority] = useState('')
  const [copyFrom, setCopyFrom] = useState('')
  const [copySessions, setCopySessions] = useState(true)
  const [err, setErr] = useState('')

  // 수정 모드에서는 기존 모듈 구성을 유지한다(성격만 바뀌었다고 모듈을 갈아끼우면 안 된다)
  const modules = useMemo(
    () => (edit ? edit.modules : defaultModules(scope, industry)),
    [edit, scope, industry],
  )
  // 지금 입력 중인 행사 성격을 따라 용어가 바뀐다(국내 학회 = 연자, 국제 컨퍼런스 = 연사)
  const labels = labelsOf({ scope } as Parameters<typeof labelsOf>[0])

  // 열릴 때마다 대상 행사의 현재 값으로 폼을 맞춘다
  useEffect(() => {
    if (!open) return
    if (edit) {
      setScope(edit.scope); setIndustry(edit.industry)
      setNameKo(edit.nameKo); setNameEn(edit.nameEn ?? ''); setCode(edit.code)
      setStartDate(edit.startDate); setEndDate(edit.endDate)
      setVenue(edit.venue ?? ''); setCity(edit.city ?? '')
      setHost(edit.host ?? ''); setPco(edit.pco ?? '')
      setAttendees(edit.expectedAttendees ?? 0)
      setBudget(edit.budgetTotalKRW ?? 0); setInviteBudget(edit.invitationBudgetKRW ?? 0)
      setTracks((edit.tracks ?? []).join(', '))
      setCreditAuthority(edit.creditAuthority ?? '')
    }
    setErr('')
  }, [open, edit])

  const reset = () => {
    setNameKo(''); setNameEn(''); setCode(''); setVenue(''); setHost(''); setPco('')
    setTracks(''); setCreditAuthority(''); setCopyFrom(''); setErr('')
  }

  const submit = () => {
    if (!nameKo.trim()) { setErr('행사명을 입력하세요.'); return }
    if (!startDate) { setErr('개막일을 입력하세요.'); return }
    const trackList = tracks.split(',').map(t => t.trim()).filter(Boolean)

    if (edit) {
      dispatch({
        type: 'PATCH_CONFERENCE', id: edit.id,
        patch: {
          scope, industry, nameKo, nameEn, code: code || edit.code,
          startDate, endDate: endDate || startDate,
          venue, city, host, organizer: host || edit.organizer, pco,
          expectedAttendees: attendees,
          budgetTotalKRW: budget, invitationBudgetKRW: inviteBudget,
          tracks: trackList,
          creditAuthority: creditAuthority || undefined,
        },
      })
      onClose()
      return
    }
    const input: NewConferenceInput = {
      nameKo, nameEn, code: code || nameKo.replace(/\s/g, '').slice(0, 10),
      scope, industry, startDate, endDate: endDate || startDate,
      venue, city, host, organizer: host, pco,
      expectedAttendees: attendees,
      budgetTotalKRW: budget, invitationBudgetKRW: inviteBudget,
      tracks: trackList,
      creditAuthority: modules.includes('연수평점') ? creditAuthority : undefined,
      modules,
      copyFrom: copyFrom || undefined,
      copy: { sessions: copySessions, packages: false, templates: false },
    }
    const created = createConference(state, input)
    if (fresh) {
      void resetAll(freshState(state, created))
    } else {
      dispatch({ type: 'ADD_CONFERENCE', ...created })
    }
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide
      title={edit ? '행사 정보 수정' : fresh ? '전체 비우고 새 행사 시작' : '새 행사 만들기'}
      sub={edit
        ? '저장하면 모든 담당자 화면에 즉시 반영됩니다'
        : fresh
          ? '데모 데이터를 모두 지우고 이 행사만 남깁니다 (멤버·템플릿은 유지)'
          : '행사 성격에 맞는 모듈과 업무 체크리스트가 자동으로 생성됩니다'}
      footer={
        <>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={submit}>{edit ? '저장' : fresh ? '전체 비우고 시작' : '행사 만들기'}</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}

      <div className="form-grid">
        <Field label="행사 성격">
          <select className="select" value={scope} onChange={e => setScope(e.target.value as ConferenceScope)}>
            <option value="국내">국내 행사</option>
            <option value="국제">국제 행사</option>
          </select>
        </Field>
        <Field label="분야">
          <select className="select" value={industry} onChange={e => setIndustry(e.target.value as Industry)}>
            {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
          </select>
        </Field>

        <Field label="행사명 (국문)" span>
          <input className="input" value={nameKo} onChange={e => setNameKo(e.target.value)} placeholder="예) 제39차 한국임상내과연구학회 춘계학술대회" />
        </Field>
        <Field label="행사명 (영문)">
          <input className="input" value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="선택" />
        </Field>
        <Field label="행사 코드" hint="내보내기 파일명 등에 사용">
          <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="예) KCIM39" />
        </Field>

        <Field label="개막일">
          <input className="input" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value) }} />
        </Field>
        <Field label="종료일">
          <input className="input" type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
        </Field>

        <Field label="장소">
          <input className="input" value={venue} onChange={e => setVenue(e.target.value)} placeholder="예) 그랜드 워커힐 서울 비스타홀" />
        </Field>
        <Field label="도시">
          <input className="input" value={city} onChange={e => setCity(e.target.value)} />
        </Field>

        <Field label="주최">
          <input className="input" value={host} onChange={e => setHost(e.target.value)} placeholder="예) 한국임상내과연구학회" />
        </Field>
        <Field label="운영대행(PCO)">
          <input className="input" value={pco} onChange={e => setPco(e.target.value)} placeholder="선택" />
        </Field>

        <Field label="예상 참가 인원">
          <input className="input" type="number" min={0} value={attendees} onChange={e => setAttendees(Number(e.target.value))} />
        </Field>
        <Field label="트랙" hint="쉼표로 구분">
          <input className="input" value={tracks} onChange={e => setTracks(e.target.value)} placeholder="순환기, 소화기, 내분비" />
        </Field>

        <Field label="총 예산 (원)">
          <input className="input" type="number" min={0} step={1_000_000} value={budget} onChange={e => setBudget(Number(e.target.value))} />
        </Field>
        <Field label={`${labels.speaker} ${labels.invite} 예산 (원)`}>
          <input className="input" type="number" min={0} step={1_000_000} value={inviteBudget} onChange={e => setInviteBudget(Number(e.target.value))} />
        </Field>

        {modules.includes('연수평점') && (
          <Field label="연수평점 인정 기관" span hint="예) 대한의사협회 연수교육">
            <input className="input" value={creditAuthority} onChange={e => setCreditAuthority(e.target.value)} />
          </Field>
        )}

        {!fresh && !edit && <Field label="기존 행사 구성 가져오기" span hint="매년 열리는 행사라면 지난 회차를 고르면 세션 구성을 그대로 복사합니다">
          <select className="select" value={copyFrom} onChange={e => setCopyFrom(e.target.value)}>
            <option value="">가져오지 않음 (빈 상태로 시작)</option>
            {state.conferences.map(c => <option key={c.id} value={c.id}>{c.nameKo}</option>)}
          </select>
        </Field>}
        {!fresh && !edit && copyFrom && (
          <label className="row small" style={{ gap: 8, gridColumn: '1 / -1' }}>
            <input type="checkbox" checked={copySessions} onChange={e => setCopySessions(e.target.checked)} />
            세션 구성 복사 (날짜는 새 일정으로 자동 조정 · {labels.speaker} 배정은 비웁니다)
          </label>
        )}
      </div>

      <div className="alert alert-info" style={{ marginTop: 14 }}>
        <span aria-hidden>ℹ</span>
        <span>
          활성 모듈: {modules.join(' · ')}
          <br />{edit
            ? '모듈 구성은 아래 「모듈 구성」에서 켜고 끌 수 있습니다. 날짜를 바꿔도 이미 만들어진 업무 기한은 자동으로 옮겨지지 않습니다.'
            : '개막일 기준으로 마일스톤과 업무 체크리스트가 자동 생성되며, 모듈 구성은 나중에 바꿀 수 있습니다.'}
        </span>
      </div>
    </Modal>
  )
}

/* ───────────────────────────── 새 연자 ───────────────────────────── */

/**
 * 연자 등록 / 수정
 * edit 이 오면 그 연자의 값으로 채워 열리고, 저장하면 변경분만 반영된다.
 * (제출물·업무는 등록 시 한 번 생성되며, 수정으로는 다시 만들지 않는다)
 */
export function SpeakerDialog(
  { open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Speaker },
) {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const labels = labelsOf(conf)
  const sessions = state.sessions.filter(s => s.conferenceId === conf.id)
  const packages = state.supportPackages
  const [residency, setResidency] = useState<'국내' | '해외'>(conf.scope === '국제' ? '해외' : '국내')
  const [nameKo, setNameKo] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [title, setTitle] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [department, setDepartment] = useState('')
  const [country, setCountry] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [tier, setTier] = useState<SpeakerTier>('Invited')
  const [liaison, setLiaison] = useState(state.members.find(m => m.role === '리에종')?.id ?? state.members[0]?.id ?? '')
  const [pkg, setPkg] = useState(packages[0]?.id ?? '')
  const [honorarium, setHonorarium] = useState(packages[0]?.honorariumKRW ?? 500_000)
  /** 사용자가 직접 금액을 고친 뒤에는 패키지를 바꿔도 덮어쓰지 않는다 */
  const [honorariumTouched, setHonorariumTouched] = useState(false)
  const [sessionIds, setSessionIds] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const [city, setCity] = useState('')
  const [assistantEmail, setAssistantEmail] = useState('')
  const [researchFields, setResearchFields] = useState('')
  const [langs, setLangs] = useState('')
  const [dietary, setDietary] = useState('')
  const [accessibility, setAccessibility] = useState('')
  const [interpretation, setInterpretation] = useState(false)
  const [sponsorship, setSponsorship] = useState<Sponsorship>('Sponsored')
  const [attendanceMode, setAttendanceMode] = useState<DeliveryMode>('현장')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    if (edit) {
      setCity(edit.city ?? '')
      setAssistantEmail(edit.assistantEmail ?? '')
      setResearchFields((edit.researchFields ?? []).join(', '))
      setLangs((edit.languages ?? []).join(', '))
      setDietary(edit.dietary ?? '')
      setAccessibility(edit.accessibility ?? '')
      setInterpretation(!!edit.interpretationNeeded)
      setSponsorship(edit.sponsorship)
      setAttendanceMode(edit.attendanceMode)
      setResidency(edit.residency); setNameKo(edit.nameKo ?? ''); setNameEn(edit.nameEn ?? '')
      setTitle(edit.title ?? ''); setAffiliation(edit.affiliation ?? ''); setDepartment(edit.department ?? '')
      setCountry(edit.country ?? ''); setEmail(edit.email ?? ''); setPhone(edit.phone ?? '')
      setTier(edit.tier); setLiaison(edit.liaisonMemberId ?? '')
      setPkg(edit.supportPackageId ?? '')
      setHonorarium(edit.settlement?.honorarium ?? 0)
      setHonorariumTouched(true)
      setSessionIds(edit.sessionIds ?? [])
      setMemo(edit.memo ?? '')
    }
    if (!edit) setHonorariumTouched(false)
    setErr('')
  }, [open, edit])

  // 등급·패키지를 고르면 학회 규정 단가를 자동으로 채운다
  useEffect(() => {
    if (honorariumTouched) return
    const p = packages.find(x => x.id === pkg)
    if (p) setHonorarium(p.honorariumKRW)
  }, [pkg, packages, honorariumTouched])

  // 등급을 바꾸면 그 등급의 패키지로 맞춘다(없으면 유지)
  useEffect(() => {
    const byTier = packages.find(p => p.tier === tier)
    if (byTier) setPkg(byTier.id)
  }, [tier, packages])

  const submit = () => {
    if (!nameKo.trim() && !nameEn.trim()) { setErr('성명을 입력하세요.'); return }
    if (!affiliation.trim()) { setErr('소속을 입력하세요.'); return }

    if (edit) {
      dispatch({
        type: 'PATCH_SPEAKER', id: edit.id,
        patch: {
          nameKo: nameKo || nameEn, nameEn, title, affiliation, department,
          residency, country, city, email, phone, tier,
          liaisonMemberId: liaison, supportPackageId: pkg,
          sessionIds, memo, assistantEmail,
          researchFields: researchFields.split(',').map(x => x.trim()).filter(Boolean),
          languages: langs.split(',').map(x => x.trim()).filter(Boolean),
          dietary: dietary || undefined,
          accessibility: accessibility || undefined,
          interpretationNeeded: interpretation,
          sponsorship, attendanceMode,
          settlement: { ...edit.settlement, honorarium },
        },
        audit: { memo: '정보 수정' },
      })
      onClose()
      return
    }
    const input: NewSpeakerInput = {
      nameKo: nameKo || nameEn, nameEn, title, affiliation, department,
      residency, country, city, email, phone, tier,
      liaisonMemberId: liaison, supportPackageId: pkg,
      honorarium, sessionIds, memo,
      assistantEmail,
      researchFields: researchFields.split(',').map(x => x.trim()).filter(Boolean),
      languages: langs.split(',').map(x => x.trim()).filter(Boolean),
      dietary, accessibility, interpretationNeeded: interpretation,
      sponsorship, attendanceMode,
    }
    const created = createSpeaker(state, conf, input)
    dispatch({ type: 'ADD_SPEAKER', ...created })
    setNameKo(''); setNameEn(''); setTitle(''); setAffiliation(''); setDepartment('')
    setEmail(''); setPhone(''); setSessionIds([]); setMemo(''); setErr('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide
      title={`${labels.speaker} ${edit ? '정보 수정' : '추가'}`}
      sub={edit
        ? '저장하면 모든 담당자 화면에 즉시 반영됩니다'
        : '등록하면 제출물 목록과 업무 체크리스트가 함께 생성됩니다'}
      footer={
        <>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={submit}>{edit ? '저장' : '등록'}</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="구분" hint={`해외 ${labels.speaker}에게만 출입국·해외송금이 적용됩니다`}>
          <select className="select" value={residency} onChange={e => setResidency(e.target.value as '국내' | '해외')}>
            <option value="국내">국내 {labels.speaker}</option>
            <option value="해외">해외 {labels.speaker}</option>
          </select>
        </Field>
        <Field label="등급">
          <select className="select" value={tier} onChange={e => setTier(e.target.value as SpeakerTier)}>
            {TIERS.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label={residency === '국내' ? '성명' : '성명(한글 표기)'}>
          <input className="input" value={nameKo} onChange={e => setNameKo(e.target.value)} placeholder="예) 김영호" />
        </Field>
        <Field label="성명(영문)" hint={residency === '해외' ? '여권 영문명과 동일하게' : '선택'}>
          <input className="input" value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="Young-ho Kim" />
        </Field>

        <Field label="직위">
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="예) 교수 / Professor" />
        </Field>
        <Field label="소속">
          <input className="input" value={affiliation} onChange={e => setAffiliation(e.target.value)} placeholder="예) 한빛대학교병원" />
        </Field>

        <Field label="부서·진료과">
          <input className="input" value={department} onChange={e => setDepartment(e.target.value)} placeholder="예) 순환기내과" />
        </Field>
        {residency === '해외'
          ? <Field label="국가"><input className="input" value={country} onChange={e => setCountry(e.target.value)} placeholder="예) 일본" /></Field>
          : <Field label="연락처"><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" /></Field>}

        <Field label="이메일" span>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </Field>

        <Field label="담당 리에종">
          <select className="select" value={liaison} onChange={e => setLiaison(e.target.value)}>
            {state.members.map(m => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
          </select>
        </Field>
        <Field label="지원 패키지">
          <select className="select" value={pkg} onChange={e => setPkg(e.target.value)}>
            {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <Field label={`${labels.honorarium} (원)`}
          hint={`${residency === '국내' ? '기타소득 8.8% 원천징수 기준' : '비거주자 22% 기준'} · 지원 패키지 기본 단가 자동 적용`}>
          <input className="input" type="number" min={0} step={100_000} value={honorarium}
            onChange={e => { setHonorarium(Number(e.target.value)); setHonorariumTouched(true) }} />
        </Field>
        <Field label="배정 세션" hint="복수 선택 가능">
          <select className="select" multiple size={3} value={sessionIds}
            onChange={e => setSessionIds([...e.target.selectedOptions].map(o => o.value))}>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>

        <Field label="도시">
          <input className="input" value={city} onChange={e => setCity(e.target.value)} placeholder={residency === '해외' ? 'Palo Alto' : '서울'} />
        </Field>
        <Field label="비서·사무실 이메일" hint="연락은 비서를 통해 하는 경우">
          <input className="input" type="email" value={assistantEmail} onChange={e => setAssistantEmail(e.target.value)} />
        </Field>

        <Field label="비용 지원 구분">
          <select className="select" value={sponsorship} onChange={e => setSponsorship(e.target.value as Sponsorship)}>
            {(['Sponsored', '부분지원', 'Non-Sponsored'] as Sponsorship[]).map(v => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="참가 형태">
          <select className="select" value={attendanceMode} onChange={e => setAttendanceMode(e.target.value as DeliveryMode)}>
            {(['현장', '온라인', '하이브리드'] as DeliveryMode[]).map(v => <option key={v}>{v}</option>)}
          </select>
        </Field>

        <Field label="전문 분야" hint="쉼표로 구분">
          <input className="input" value={researchFields} onChange={e => setResearchFields(e.target.value)} placeholder="심부전, 중재시술" />
        </Field>
        <Field label="사용 언어" hint="쉼표로 구분">
          <input className="input" value={langs} onChange={e => setLangs(e.target.value)} placeholder={residency === '해외' ? 'EN' : 'KO'} />
        </Field>

        <Field label="식이 요구" hint="알러지·채식·종교식 등">
          <input className="input" value={dietary} onChange={e => setDietary(e.target.value)} />
        </Field>
        <Field label="접근성 요구" hint="휠체어·보조 인력 등">
          <input className="input" value={accessibility} onChange={e => setAccessibility(e.target.value)} />
        </Field>

        <label className="row small" style={{ gap: 8, gridColumn: '1 / -1' }}>
          <input type="checkbox" checked={interpretation} onChange={e => setInterpretation(e.target.checked)} />
          통역 필요
        </label>

        <Field label="메모" span>
          <input className="input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="특이사항·요구사항" />
        </Field>
      </div>
    </Modal>
  )
}

/* ───────────────────────────── 새 세션 ───────────────────────────── */

/** 세션 추가 / 수정 — edit 이 오면 그 세션의 값으로 채워 열린다 */
export function SessionDialog(
  { open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Session },
) {
  const { state, dispatch } = useApp()
  const conf = activeConference(state)
  const [form, setForm] = useState<NewSessionInput>({
    title: '', type: '초청강연', track: conf.tracks[0] ?? '',
    date: conf.startDate, startTime: '09:00', endTime: '10:00',
    room: '', mode: '현장', language: conf.scope === '국제' ? 'EN' : 'KO',
    interpretation: false, recorded: true,
  })
  const set = <K extends keyof NewSessionInput>(k: K, v: NewSessionInput[K]) => setForm(f => ({ ...f, [k]: v }))
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    if (edit) {
      setForm({
        title: edit.title, type: edit.type, track: edit.track ?? '',
        date: edit.date, startTime: edit.startTime, endTime: edit.endTime,
        room: edit.room ?? '', mode: edit.mode, language: edit.language ?? 'KO',
        interpretation: !!edit.interpretation, recorded: !!edit.recorded,
      })
    }
    setErr('')
  }, [open, edit])

  const submit = () => {
    if (!form.title.trim()) { setErr('세션명을 입력하세요.'); return }
    if (form.endTime <= form.startTime) { setErr('종료 시각이 시작 시각보다 빠릅니다.'); return }
    if (form.date < conf.startDate || form.date > conf.endDate) {
      setErr(`세션 일자는 행사 기간(${conf.startDate} ~ ${conf.endDate}) 안이어야 합니다.`); return
    }
    if (edit) {
      dispatch({ type: 'PATCH_SESSION', id: edit.id, patch: { ...form } })
      setErr(''); onClose(); return
    }
    dispatch({ type: 'ADD_SESSION', session: createSession(conf, form) })
    setForm(f => ({ ...f, title: '', room: '' })); setErr('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose}
      title={edit ? '세션 수정' : '세션 추가'}
      sub={`${conf.nameKo} · ${conf.startDate} ~ ${conf.endDate}`}
      footer={
        <>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={submit}>{edit ? '저장' : '추가'}</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="세션명" span>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="예) Session I — 심부전 최신 치료 전략" />
        </Field>
        <Field label="유형">
          <select className="select" value={form.type} onChange={e => set('type', e.target.value as NewSessionInput['type'])}>
            {['기조연설', '초청강연', '패널토론', '워크숍', '라운드테이블', '튜토리얼', '개회식', '만찬'].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="트랙">
          <select className="select" value={form.track} onChange={e => set('track', e.target.value)}>
            {(conf.tracks.length ? conf.tracks : ['일반']).map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="일자">
          <input className="input" type="date" value={form.date} min={conf.startDate} max={conf.endDate} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="장소">
          <input className="input" value={form.room} onChange={e => set('room', e.target.value)} placeholder="예) 비스타홀" />
        </Field>
        <Field label="시작">
          <input className="input" type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
        </Field>
        <Field label="종료">
          <input className="input" type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
        </Field>
        <Field label="진행 방식">
          <select className="select" value={form.mode} onChange={e => set('mode', e.target.value as NewSessionInput['mode'])}>
            {['현장', '온라인', '하이브리드'].map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="언어">
          <select className="select" value={form.language} onChange={e => set('language', e.target.value)}>
            {['KO', 'EN', 'KO/EN'].map(l => <option key={l}>{l}</option>)}
          </select>
        </Field>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={form.interpretation} onChange={e => set('interpretation', e.target.checked)} /> 동시통역
        </label>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={form.recorded} onChange={e => set('recorded', e.target.checked)} /> 녹화·중계
        </label>
      </div>
    </Modal>
  )
}
