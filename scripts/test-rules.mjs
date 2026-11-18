#!/usr/bin/env node
/**
 * Firestore 보안 규칙 및 실시간 동기화 검증
 *   npx firebase emulators:exec --only firestore "node scripts/test-rules.mjs"
 *
 * 확인 항목
 *  1) 초대받지 않은 계정은 아무것도 읽을 수 없다
 *  2) 역할별 쓰기 범위가 지켜진다 (여행사는 교통·숙박만, 재무는 정산만)
 *  3) 변경 이력은 생성만 가능하고 수정·삭제할 수 없다
 *  4) 한 사람의 수정이 다른 사람 화면에 실시간으로 도착한다
 */
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, getDocs } from 'firebase/firestore'
import { readFileSync } from 'node:fs'

const env = await initializeTestEnvironment({
  projectId: 'onference-rules-test',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8085 },
})

const results = []
const check = async (name, fn) => {
  try { await fn(); results.push(['PASS', name]) }
  catch (e) { results.push(['FAIL', `${name} — ${e.message?.slice(0, 120)}`]) }
}

/* 사전 데이터: 구성원 4명과 연자 1명을 규칙을 우회해 심는다 */
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore()
  await setDoc(doc(db, 'members', 'u-admin'), { id: 'u-admin', name: '조현수', role: '사무국', org: '사무국', email: 'admin@x.org' })
  await setDoc(doc(db, 'members', 'u-travel'), { id: 'u-travel', name: '최민규', role: '여행사', org: '유니투어', email: 'travel@x.org' })
  await setDoc(doc(db, 'members', 'u-fin'), { id: 'u-fin', name: '유상혁', role: '재무', org: '재무팀', email: 'fin@x.org' })
  await setDoc(doc(db, 'members', 'u-liaison'), { id: 'u-liaison', name: '서가은', role: '리에종', org: '학술부', email: 'liaison@x.org' })
  await setDoc(doc(db, 'speakers', 'SPK-1'), { id: 'SPK-1', nameKo: '김영호', stage: '계약완료', flights: [], settlement: { honorarium: 1000000 } })
  await setDoc(doc(db, 'auditLogs', 'AL-1'), { id: 'AL-1', at: '2026-11-18T10:00', actor: '조현수', action: '수정', entityType: '연사', entityId: 'SPK-1', entityLabel: '김영호' })
  await setDoc(doc(db, 'memberInvites', 'new@x.org'), { email: 'new@x.org', name: '신규', role: '리에종' })
})

const as = uid => env.authenticatedContext(uid, { email: `${uid.replace('u-', '')}@x.org` }).firestore()
const admin = as('u-admin')
const travel = as('u-travel')
const fin = as('u-fin')
const liaison = as('u-liaison')
const stranger = env.authenticatedContext('u-none', { email: 'none@x.org' }).firestore()
const anon = env.unauthenticatedContext().firestore()

/* 1) 접근 제어 */
await check('로그인하지 않은 접근은 차단된다', () => assertFails(getDoc(doc(anon, 'speakers', 'SPK-1'))))
await check('초대받지 않은 계정은 연자를 읽을 수 없다', () => assertFails(getDoc(doc(stranger, 'speakers', 'SPK-1'))))
await check('구성원은 연자를 읽을 수 있다', () => assertSucceeds(getDoc(doc(liaison, 'speakers', 'SPK-1'))))

/* 2) 역할별 쓰기 범위 */
await check('사무국은 연자를 수정할 수 있다', () => assertSucceeds(updateDoc(doc(admin, 'speakers', 'SPK-1'), { stage: '수락' })))
await check('리에종은 연자를 수정할 수 있다', () => assertSucceeds(updateDoc(doc(liaison, 'speakers', 'SPK-1'), { memo: '확인' })))
await check('여행사는 교통·숙박을 수정할 수 있다', () => assertSucceeds(updateDoc(doc(travel, 'speakers', 'SPK-1'), { flights: [{ id: 'F1' }], hotel: { hotel: 'A' } })))
await check('여행사는 사례비를 수정할 수 없다', () => assertFails(updateDoc(doc(travel, 'speakers', 'SPK-1'), { settlement: { honorarium: 9 } })))
await check('재무는 정산을 수정할 수 있다', () => assertSucceeds(updateDoc(doc(fin, 'speakers', 'SPK-1'), { settlement: { honorarium: 2000000 } })))
await check('재무는 항공을 수정할 수 없다', () => assertFails(updateDoc(doc(fin, 'speakers', 'SPK-1'), { flights: [] })))
await check('여행사는 후원 계약을 건드릴 수 없다', () => assertFails(setDoc(doc(travel, 'sponsors', 'SP-9'), { id: 'SP-9', company: 'X' })))
await check('재무는 후원 계약을 등록할 수 있다', () => assertSucceeds(setDoc(doc(fin, 'sponsors', 'SP-9'), { id: 'SP-9', company: 'X' })))

/* 3) 변경 이력 불변 */
await check('구성원은 변경 이력을 기록할 수 있다', () => assertSucceeds(setDoc(doc(liaison, 'auditLogs', 'AL-2'), { id: 'AL-2', at: 'x', actor: '서가은', action: '수정', entityType: '연사', entityId: 'SPK-1', entityLabel: '김영호' })))
await check('변경 이력은 수정할 수 없다', () => assertFails(updateDoc(doc(admin, 'auditLogs', 'AL-1'), { actor: '위조' })))
await check('변경 이력은 삭제할 수 없다', () => assertFails(deleteDoc(doc(admin, 'auditLogs', 'AL-1'))))

/* 4) 초대 흐름 */
await check('사무국만 초대장을 만들 수 있다', () => assertFails(setDoc(doc(liaison, 'memberInvites', 'x@x.org'), { email: 'x@x.org', role: '연사' })))
await check('초대받은 계정은 본인 멤버 문서를 만들 수 있다', async () => {
  const newbie = env.authenticatedContext('u-new', { email: 'new@x.org' }).firestore()
  await assertSucceeds(setDoc(doc(newbie, 'members', 'u-new'), { id: 'u-new', name: '신규', role: '리에종', org: '', email: 'new@x.org' }))
})
await check('초대장에 없는 역할로는 승격할 수 없다', async () => {
  const sneaky = env.authenticatedContext('u-sneak', { email: 'new@x.org' }).firestore()
  await assertFails(setDoc(doc(sneaky, 'members', 'u-sneak'), { id: 'u-sneak', name: '가짜', role: '사무국', org: '', email: 'new@x.org' }))
})

/* 5) 실시간 동기화 — 한 사람의 수정이 다른 사람에게 도착하는가 */
await check('한 담당자의 수정이 다른 담당자 화면에 실시간 반영된다', async () => {
  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('5초 안에 변경이 도착하지 않음')), 5000)
    const unsub = onSnapshot(doc(liaison, 'speakers', 'SPK-1'), snap => {
      if (snap.data()?.memo === '실시간 확인') { clearTimeout(timer); unsub(); resolve(true) }
    })
  })
  await updateDoc(doc(admin, 'speakers', 'SPK-1'), { memo: '실시간 확인' })
  await received
})

/* 6) 목록 구독 */
await check('구성원은 컬렉션 전체를 구독할 수 있다', async () => {
  const snap = await getDocs(collection(liaison, 'speakers'))
  if (snap.empty) throw new Error('연자 목록이 비어 있음')
})

await env.cleanup()

const fails = results.filter(r => r[0] === 'FAIL')
results.forEach(([s, n]) => console.log(`${s === 'PASS' ? '  ✓' : '  ✗'} ${n}`))
console.log(`\n${results.length - fails.length}/${results.length} 통과`)
process.exit(fails.length ? 1 : 0)
