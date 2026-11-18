#!/usr/bin/env node
/**
 * 접근 권한 점검 — "초대되지 않았습니다" 가 뜰 때 원인을 찾는다.
 *
 * Cloud Shell 에서 실행한다(이미 인증되어 있음):
 *   node scripts/check-access.mjs                          # 현재 상태만 확인
 *   node scripts/check-access.mjs --invite you@gmail.com   # 사무국 권한으로 초대장 생성
 *
 * 옵션
 *   --project   GCP 프로젝트 ID (생략 시 gcloud 기본 프로젝트)
 *   --invite    사무국으로 초대할 이메일 (쉼표로 여러 명)
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i+1] && !args[i+1].startsWith('--') ? args[i+1] : d }

const projectId = opt('project') || (() => {
  try { return execSync('gcloud config get-value project', { encoding: 'utf8' }).trim() } catch { return '' }
})()
if (!projectId) { console.error('프로젝트를 찾을 수 없습니다. --project <프로젝트ID>'); process.exit(1) }

initializeApp({ credential: applicationDefault(), projectId })
const db = getFirestore()

console.log(`▶ 프로젝트: ${projectId}\n`)

const invites = await db.collection('memberInvites').get()
console.log(`● 초대장(memberInvites): ${invites.size}건`)
invites.forEach(d => console.log(`   - ${d.id}  역할: ${d.data().role ?? '(없음)'}`))
if (!invites.size) console.log('   ⚠ 초대장이 하나도 없습니다. 이래서 "초대되지 않았습니다" 가 뜹니다.')

const members = await db.collection('members').get()
console.log(`\n● 구성원(members): ${members.size}건`)
members.forEach(d => console.log(`   - ${d.id}  ${d.data().name ?? ''} / ${d.data().role ?? ''} / ${d.data().email ?? ''}`))

console.log('\n● 데이터 적재 상태')
for (const col of ['conferences', 'speakers', 'sessions', 'tasks']) {
  const s = await db.collection(col).count().get()
  console.log(`   - ${col}: ${s.data().count}건`)
}

const add = (opt('invite') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
if (add.length) {
  console.log('\n▶ 초대장 등록')
  for (const email of add) {
    await db.collection('memberInvites').doc(email).set({
      email, name: email.split('@')[0], role: '사무국', org: '사무국', invitedAt: new Date().toISOString(),
    })
    console.log(`   - ${email} (사무국) 등록 완료`)
  }
  console.log('\n✅ 브라우저에서 새로고침한 뒤 다시 구글 로그인하세요.')
} else if (invites.size) {
  console.log('\n초대장은 있습니다. 로그인한 구글 계정의 이메일이 위 목록과 정확히 같은지 확인하세요.')
  console.log('다른 계정으로 들어가야 한다면:  node scripts/check-access.mjs --invite <그 이메일>')
}
