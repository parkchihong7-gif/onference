import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { Field, Modal } from './ui'
import { displayName } from '../lib/scope'
import type { BookingStatus, Flight, HotelBooking, Speaker, TravelMode } from '../types'

const MODES: TravelMode[] = ['국제선', '국내선', 'KTX', '고속버스', '자가용', '셔틀']
const STATUSES: BookingStatus[] = ['미정', '요청', '가예약', '확정', '변경요청', '취소']

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
const nights = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))

/**
 * 이동(항공·KTX 등) 등록 / 수정
 * 국내 연자는 KTX·자가용이 기본이고, 해외 연자는 국제선이 기본이다.
 */
export function FlightDialog(
  { open, onClose, speaker, edit }:
  { open: boolean; onClose: () => void; speaker: Speaker; edit?: Flight },
) {
  const { dispatch } = useApp()
  const overseas = speaker.residency === '해외'
  const blank = (): Flight => ({
    id: rid('FL'),
    direction: overseas ? '입국' : '출발',
    mode: overseas ? '국제선' : 'KTX',
    carrier: '', flightNo: '', from: '', fromCity: '', to: '', toCity: '',
    departAt: '', arriveAt: '', cabin: overseas ? 'Business' : '일반실',
    ticketedBy: '주최발권', eTicketReceived: false, status: '요청',
    fare: 0, currency: 'KRW',
  })
  const [f, setF] = useState<Flight>(blank())
  const [err, setErr] = useState('')
  const set = <K extends keyof Flight>(k: K, v: Flight[K]) => setF(x => ({ ...x, [k]: v }))

  useEffect(() => { if (open) { setF(edit ? { ...edit } : blank()); setErr('') } }, [open, edit])

  const save = () => {
    if (!f.departAt) { setErr('출발 일시를 입력하세요.') ; return }
    if (f.arriveAt && f.arriveAt < f.departAt) { setErr('도착이 출발보다 빠릅니다.'); return }
    const list = edit
      ? speaker.flights.map(x => (x.id === edit.id ? f : x))
      : [...speaker.flights, f]
    dispatch({
      type: 'PATCH_SPEAKER', id: speaker.id, patch: { flights: list },
      audit: { field: '이동 일정', after: `${f.direction} ${f.mode} ${f.flightNo || ''} ${f.departAt}`.trim(), memo: edit ? '수정' : '등록' },
    })
    onClose()
  }

  const remove = () => {
    if (!edit) return
    dispatch({
      type: 'PATCH_SPEAKER', id: speaker.id,
      patch: { flights: speaker.flights.filter(x => x.id !== edit.id) },
      audit: { field: '이동 일정', before: `${edit.direction} ${edit.flightNo || edit.mode}`, memo: '삭제' },
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide
      title={edit ? '이동 일정 수정' : '이동 일정 등록'}
      sub={displayName(speaker)}
      footer={
        <>
          {edit && <button className="btn btn-danger" onClick={remove}>삭제</button>}
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={save}>저장</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="구분">
          <select className="select" value={f.direction} onChange={e => set('direction', e.target.value as Flight['direction'])}>
            {(overseas ? ['입국', '출국'] : ['출발', '귀가']).map(d => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="수단">
          <select className="select" value={f.mode} onChange={e => set('mode', e.target.value as TravelMode)}>
            {MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label={f.mode === 'KTX' ? '열차 운영사' : '항공사·운송사'}>
          <input className="input" value={f.carrier} onChange={e => set('carrier', e.target.value)} placeholder={f.mode === 'KTX' ? '코레일' : '대한항공'} />
        </Field>
        <Field label={f.mode === 'KTX' ? '열차번호' : '편명'} hint="자가용이면 비워 둡니다">
          <input className="input" value={f.flightNo} onChange={e => set('flightNo', e.target.value)} placeholder={f.mode === 'KTX' ? 'KTX 101' : 'KE001'} />
        </Field>
        <Field label="출발지">
          <input className="input" value={f.fromCity} onChange={e => set('fromCity', e.target.value)} placeholder={overseas ? 'San Francisco' : '부산'} />
        </Field>
        <Field label="도착지">
          <input className="input" value={f.toCity} onChange={e => set('toCity', e.target.value)} placeholder="서울" />
        </Field>
        <Field label="출발 일시">
          <input className="input" type="datetime-local" value={f.departAt} onChange={e => set('departAt', e.target.value)} />
        </Field>
        <Field label="도착 일시">
          <input className="input" type="datetime-local" value={f.arriveAt} onChange={e => set('arriveAt', e.target.value)} />
        </Field>
        <Field label="등급">
          <input className="input" value={f.cabin} onChange={e => set('cabin', e.target.value)} placeholder={overseas ? 'Business' : '일반실'} />
        </Field>
        <Field label="예약번호(PNR)">
          <input className="input" value={f.pnr ?? ''} onChange={e => set('pnr', e.target.value)} />
        </Field>
        <Field label="발권 주체">
          <select className="select" value={f.ticketedBy} onChange={e => set('ticketedBy', e.target.value as Flight['ticketedBy'])}>
            {['주최발권', '본인구매후정산'].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="상태">
          <select className="select" value={f.status} onChange={e => set('status', e.target.value as BookingStatus)}>
            {STATUSES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="운임 (원)">
          <input className="input" type="number" min={0} step={10000} value={f.fare} onChange={e => set('fare', Number(e.target.value))} />
        </Field>
        <Field label="탑승자 영문명" hint="여권 영문명과 일치해야 합니다">
          <input className="input" value={f.passengerName ?? ''} onChange={e => set('passengerName', e.target.value)} />
        </Field>
        <label className="row small" style={{ gap: 8, gridColumn: '1 / -1' }}>
          <input type="checkbox" checked={f.eTicketReceived} onChange={e => set('eTicketReceived', e.target.checked)} />
          e-Ticket(승차권) 수령 완료
        </label>
        <Field label="메모" span>
          <input className="input" value={f.memo ?? ''} onChange={e => set('memo', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

/** 숙박 등록 / 수정 — 연자당 한 건을 관리한다 */
export function HotelDialog(
  { open, onClose, speaker }: { open: boolean; onClose: () => void; speaker: Speaker },
) {
  const { dispatch } = useApp()
  const blank = (): HotelBooking => ({
    hotel: '', checkIn: '', checkOut: '', nights: 0, roomType: '스탠다드', guests: 1,
    breakfastIncluded: true, billing: '주최일괄(Master Bill)', status: '요청',
    ratePerNight: 0, currency: 'KRW',
  })
  const [h, setH] = useState<HotelBooking>(blank())
  const [err, setErr] = useState('')
  const set = <K extends keyof HotelBooking>(k: K, v: HotelBooking[K]) => setH(x => ({ ...x, [k]: v }))

  useEffect(() => { if (open) { setH(speaker.hotel ? { ...speaker.hotel } : blank()); setErr('') } }, [open, speaker])

  const save = () => {
    if (!h.hotel.trim()) { setErr('숙소명을 입력하세요.'); return }
    if (!h.checkIn || !h.checkOut) { setErr('체크인·체크아웃 날짜를 입력하세요.'); return }
    if (h.checkOut <= h.checkIn) { setErr('체크아웃이 체크인보다 빠르거나 같습니다.'); return }
    const next = { ...h, nights: nights(h.checkIn, h.checkOut) }
    dispatch({
      type: 'PATCH_SPEAKER', id: speaker.id, patch: { hotel: next },
      audit: { field: '숙박', after: `${next.hotel} ${next.checkIn}~${next.checkOut} (${next.nights}박)` },
    })
    onClose()
  }

  const remove = () => {
    dispatch({ type: 'PATCH_SPEAKER', id: speaker.id, patch: { hotel: undefined }, audit: { field: '숙박', memo: '예약 삭제' } })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide
      title={speaker.hotel ? '숙박 수정' : '숙박 등록'}
      sub={displayName(speaker)}
      footer={
        <>
          {speaker.hotel && <button className="btn btn-danger" onClick={remove}>삭제</button>}
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={save}>저장</button>
        </>
      }>
      {err && <div className="alert alert-critical" style={{ marginBottom: 12 }}><span aria-hidden>⛔</span><span>{err}</span></div>}
      <div className="form-grid">
        <Field label="숙소명" span>
          <input className="input" value={h.hotel} onChange={e => set('hotel', e.target.value)} placeholder="그랜드 하얏트 서울" />
        </Field>
        <Field label="체크인">
          <input className="input" type="date" value={h.checkIn} onChange={e => set('checkIn', e.target.value)} />
        </Field>
        <Field label="체크아웃">
          <input className="input" type="date" value={h.checkOut} onChange={e => set('checkOut', e.target.value)} />
        </Field>
        <Field label="객실 유형">
          <input className="input" value={h.roomType} onChange={e => set('roomType', e.target.value)} />
        </Field>
        <Field label="투숙 인원">
          <input className="input" type="number" min={1} value={h.guests} onChange={e => set('guests', Number(e.target.value))} />
        </Field>
        <Field label="1박 요금 (원)">
          <input className="input" type="number" min={0} step={10000} value={h.ratePerNight} onChange={e => set('ratePerNight', Number(e.target.value))} />
        </Field>
        <Field label="정산 방식">
          <select className="select" value={h.billing} onChange={e => set('billing', e.target.value as HotelBooking['billing'])}>
            {['주최일괄(Master Bill)', '본인결제후정산'].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="예약번호">
          <input className="input" value={h.confirmationNo ?? ''} onChange={e => set('confirmationNo', e.target.value)} />
        </Field>
        <Field label="상태">
          <select className="select" value={h.status} onChange={e => set('status', e.target.value as BookingStatus)}>
            {STATUSES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <label className="row small" style={{ gap: 8, gridColumn: '1 / -1' }}>
          <input type="checkbox" checked={h.breakfastIncluded} onChange={e => set('breakfastIncluded', e.target.checked)} /> 조식 포함
        </label>
        <Field label="요청 사항" span hint="식이·접근성 등">
          <input className="input" value={h.requests ?? ''} onChange={e => set('requests', e.target.value)} />
        </Field>
      </div>
      {h.checkIn && h.checkOut && h.checkOut > h.checkIn && (
        <div className="alert alert-info" style={{ marginTop: 14 }}>
          <span aria-hidden>ℹ</span>
          <span>{nights(h.checkIn, h.checkOut)}박 · 예상 숙박비 {(nights(h.checkIn, h.checkOut) * h.ratePerNight).toLocaleString()}원</span>
        </div>
      )}
    </Modal>
  )
}
