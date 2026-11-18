#!/usr/bin/env node
/**
 * 데모/초기 데이터를 Firestore 에 올린다.
 *
 * Cloud Shell 에서 실행한다(이미 인증되어 있음):
 *   node scripts/seed-firestore.mjs --project <프로젝트ID> --admin <관리자이메일>
 *
 * 옵션
 *   --project   GCP 프로젝트 ID (생략 시 gcloud 기본 프로젝트)
 *   --admin     사무국(관리자) 권한으로 초대할 이메일. 쉼표로 여러 명 지정 가능
 *   --wipe      기존 문서를 지우고 새로 넣는다(기본은 덮어쓰기만)
 *   --empty     데모 데이터 없이 빈 상태로 시작(초대장과 템플릿만 생성)
 *
 * 주의: 실제 운영 데이터가 들어 있는 프로젝트에 --wipe 를 쓰지 않는다.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}
const flag = name => args.includes(`--${name}`)

const projectId = opt('project') || (() => {
  try { return execSync('gcloud config get-value project', { encoding: 'utf8' }).trim() } catch { return '' }
})()
if (!projectId) {
  console.error('프로젝트를 찾을 수 없습니다. --project <프로젝트ID> 를 지정하세요.')
  process.exit(1)
}

const admins = (opt('admin') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
if (!admins.length) {
  console.error('관리자 이메일이 필요합니다. 예) --admin you@example.org')
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId })
const db = getFirestore()

/* 시드 데이터는 npm run seed:export 가 만든 JSON 을 읽는다
   (import attributes 는 Node 버전에 따라 동작이 달라 파일 읽기로 처리) */
const SEED_PATH = new URL('../dist-seed/seed.json', import.meta.url)
if (!existsSync(SEED_PATH)) {
  console.error('시드 파일이 없습니다. 먼저 실행하세요:  npm run seed:export')
  process.exit(1)
}
const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'))

const COLLECTIONS = [
  'members', 'conferences', 'sessions', 'speakers', 'supportPackages', 'tasks',
  'communications', 'mailTemplates', 'checklistTemplates', 'auditLogs',
  'creditPrograms', 'abstracts', 'registrations', 'sponsors',
  'docs', 'docTemplates', 'comments', 'attachments',
]

async function wipe(col) {
  const snap = await db.collection(col).get()
  let n = 0
  while (n < snap.docs.length) {
    const batch = db.batch()
    snap.docs.slice(n, n + 400).forEach(d => batch.delete(d.ref))
    await batch.commit()
    n += 400
  }
  return snap.size
}

async function put(col, docs) {
  let n = 0
  while (n < docs.length) {
    const batch = db.batch()
    docs.slice(n, n + 400).forEach(d => batch.set(db.collection(col).doc(String(d.id)), d, { merge: true }))
    await batch.commit()
    n += 400
  }
  return docs.length
}

console.log(`▶ 프로젝트: ${projectId}`)

if (flag('wipe')) {
  console.log('▶ 기존 문서 삭제')
  for (const col of COLLECTIONS) {
    const removed = await wipe(col)
    if (removed) console.log(`   - ${col}: ${removed}건 삭제`)
  }
}

if (!flag('empty')) {
  console.log('▶ 데모 데이터 업로드')
  for (const col of COLLECTIONS) {
    const docs = seed[col] ?? []
    if (!docs.length) continue
    const n = await put(col, docs)
    console.log(`   - ${col}: ${n}건`)
  }
} else {
  console.log('▶ 빈 상태로 시작 — 템플릿만 업로드')
  for (const col of ['supportPackages', 'checklistTemplates', 'mailTemplates', 'docTemplates']) {
    await put(col, seed[col] ?? [])
  }
}

console.log('▶ 관리자 초대장 등록')
for (const email of admins) {
  await db.collection('memberInvites').doc(email).set({
    email, name: email.split('@')[0], role: '사무국', org: '사무국', invitedAt: new Date().toISOString(),
  })
  console.log(`   - ${email} (사무국)`)
}

console.log('\n✅ 완료. 배포한 주소에서 구글 계정으로 로그인하면 접근 권한이 부여됩니다.')
console.log('   추가 인원은 앱의 [행사 설정 · 모듈] → 구성원에서 초대하세요.')
