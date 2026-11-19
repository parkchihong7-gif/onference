const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
const S='/tmp/claude-0/-home-user-onference/e38320a4-d3a3-59a3-9397-a5fbdbbb1d85/scratchpad/walk'
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1500,height:1000} })
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,140))})
const log = (...a) => console.log(...a)
await p.goto('file:///home/user/onference/onference-dashboard.html'); await p.waitForSelector('.page-title')

/* STEP 1 — 전체 비우고 새 행사 시작 */
await p.getByRole('button', { name: /행사 설정·모듈/ }).click(); await p.waitForTimeout(400)
await p.getByRole('button', { name: '⌦ 전체 비우고 새 행사 시작' }).click(); await p.waitForSelector('.modal-box')
const F = async (name, v) => { const l = p.getByRole('textbox', { name }); if (await l.count()) await l.first().fill(v) }
await F('행사명 (국문)', '제38차 한국임상내과연구학회 동계학술대회')
await F('행사명 (영문)', 'The 38th Winter Congress of KCIM')
await F('행사 코드', 'KCIM38W')
await F('장소', '그랜드 하얏트 서울 그랜드볼룸')
await F('주최', '한국임상내과연구학회')
await F('운영대행(PCO)', '메디컬컨벤션')
await F('트랙', '순환기, 소화기, 내분비, 호흡기')
const dates = p.locator('.modal-box input[type="date"]')
await dates.nth(0).fill('2027-02-06'); await dates.nth(1).fill('2027-02-07')
// 연수평점 기관 (국내+의료학회면 노출)
const modalText = await p.locator('.modal-box').innerText()
log('STEP1 모듈 안내:', modalText.split('활성 모듈:')[1]?.trim().slice(0,120) ?? '(없음)')
if (modalText.includes('연수평점 인정 기관')) await F('연수평점 인정 기관', '대한의사협회 연수교육')
await p.screenshot({ path: S+'/01-new-conf.png' })
await p.getByRole('button', { name: '전체 비우고 시작' }).click(); await p.waitForTimeout(1200)
log('STEP1 결과 화면:', (await p.locator('.page-title').first().textContent()).slice(0,40))
await p.getByRole('button', { name: /대시보드/ }).click(); await p.waitForTimeout(500)
await p.screenshot({ path: S+'/02-dash-empty.png', fullPage: true })
const dash = await p.locator('body').innerText()
log('STEP1 대시보드:', dash.split('\n').filter(l=>l.trim()).slice(3,10).join(' | ').slice(0,200))
log('STEP1 메뉴 수:', await p.locator('.nav-item').count())

/* STEP 2 — 자동 생성된 업무 점검 (신규 행사인데 지연 뱃지가 떠 있다) */
await p.getByRole('button', { name: /업무·체크리스트/ }).click(); await p.waitForTimeout(500)
await p.screenshot({ path: S+'/03-tasks.png', fullPage: true })
const taskRows = await p.locator('table.data tbody tr').allInnerTexts()
log('\nSTEP2 업무 총', taskRows.length, '건')
const late = taskRows.filter(t => /지연/.test(t))
log('STEP2 지연 업무:', late.length, '건')
late.slice(0,4).forEach(t => log('   -', t.replace(/\s+/g,' ').slice(0,110)))
log('STEP2 가장 이른 업무 3건:')
taskRows.slice(0,3).forEach(t => log('   -', t.replace(/\s+/g,' ').slice(0,110)))

/* STEP 3 — 세션 구성 */
await p.getByRole('button', { name: /세션·프로그램/ }).click(); await p.waitForTimeout(400)
const addSession = async (title, type, track, date, st, et, room) => {
  await p.getByRole('button', { name: '＋ 세션 추가' }).click(); await p.waitForSelector('.modal-box')
  await p.getByRole('textbox', { name: '세션명' }).fill(title)
  await p.locator('.modal-box select').nth(0).selectOption(type)
  await p.locator('.modal-box select').nth(1).selectOption(track)
  await p.locator('.modal-box input[type="date"]').fill(date)
  await p.locator('.modal-box input[type="time"]').nth(0).fill(st)
  await p.locator('.modal-box input[type="time"]').nth(1).fill(et)
  await p.getByRole('textbox', { name: '장소' }).fill(room)
  await p.getByRole('button', { name: '추가', exact: true }).click(); await p.waitForTimeout(450)
  const err = await p.locator('.modal-box .alert-critical').count()
  if (err) log('   ! 세션 추가 거부:', (await p.locator('.modal-box .alert-critical').innerText()).slice(0,70))
}
await addSession('개회식 및 회장 인사', '개회식', '순환기', '2027-02-06', '09:00', '09:20', '그랜드볼룸')
await addSession('Session I — 심부전 최신 치료 전략', '초청강연', '순환기', '2027-02-06', '09:30', '11:00', '그랜드볼룸')
await addSession('Session II — 염증성 장질환 진료지침 개정', '초청강연', '소화기', '2027-02-06', '13:00', '14:30', '다이아몬드홀')
await addSession('Keynote — Precision Medicine in Internal Medicine', '기조연설', '내분비', '2027-02-07', '09:30', '10:30', '그랜드볼룸')
await p.waitForTimeout(400)
await p.screenshot({ path: S+'/04-sessions.png', fullPage: true })
log('\nSTEP3 세션 수:', await p.locator('table.data tbody tr').count())


/* STEP 4 — 연자 등록 (국내 2 + 해외 1) */
await p.getByRole('button', { name: /연자 목록/ }).click(); await p.waitForTimeout(400)
const addSpeaker = async (o) => {
  await p.getByRole('button', { name: /＋ 연자 추가/ }).click(); await p.waitForSelector('.modal-box')
  await p.locator('.modal-box select').nth(0).selectOption(o.residency)
  await p.locator('.modal-box select').nth(1).selectOption(o.tier)
  const M = p.locator('.modal-box')
  await M.getByRole('textbox', { name: /^성명/ }).first().fill(o.nameKo)
  await M.getByRole('textbox', { name: '성명(영문)' }).fill(o.nameEn ?? '')
  await M.getByRole('textbox', { name: '직위' }).fill(o.title)
  await M.getByRole('textbox', { name: '소속', exact: true }).fill(o.affiliation)
  await M.getByRole('textbox', { name: '부서·진료과' }).fill(o.dept ?? '')
  if (o.residency === '해외') { const c = M.getByRole('textbox', { name: '국가' }); if (await c.count()) await c.fill(o.country) }
  else { const ph = M.getByRole('textbox', { name: '연락처' }); if (await ph.count()) await ph.fill(o.phone ?? '') }
  await M.getByRole('textbox', { name: '이메일' }).fill(o.email)
  const hon = p.locator('.modal-box input[type="number"]').first()
  await hon.fill(String(o.honorarium))
  // 세션 배정
  const ms = p.locator('.modal-box select[multiple]')
  if (await ms.count() && o.sessionIdx != null) {
    const opts = await ms.locator('option').allTextContents()
    await ms.selectOption({ index: o.sessionIdx })
    log('   세션 배정:', opts[o.sessionIdx]?.slice(0,34))
  }
  await M.getByRole('button', { name: '등록', exact: true }).click(); await p.waitForTimeout(500)
  const e = await p.locator('.modal-box .alert-critical').count()
  if (e) log('   ! 등록 거부:', (await p.locator('.modal-box .alert-critical').innerText()).slice(0,70))
}
log('\nSTEP4 연자 등록')
await addSpeaker({ residency:'국내', tier:'Invited', nameKo:'김도현', nameEn:'Do-hyun Kim', title:'교수', affiliation:'서울대학교병원', dept:'순환기내과', phone:'010-1234-5678', email:'dhkim@snuh.org', honorarium:500000, sessionIdx:1 })
await addSpeaker({ residency:'국내', tier:'Chair', nameKo:'이수진', nameEn:'Su-jin Lee', title:'교수', affiliation:'부산대학교병원', dept:'소화기내과', phone:'010-2345-6789', email:'sjlee@pnuh.or.kr', honorarium:300000, sessionIdx:2 })
await addSpeaker({ residency:'해외', tier:'Keynote', nameKo:'Michael Chen', nameEn:'Michael Chen', title:'Professor', affiliation:'Stanford University', dept:'Endocrinology', country:'미국', email:'mchen@stanford.edu', honorarium:3000000, sessionIdx:3 })
await p.waitForTimeout(400)
await p.screenshot({ path: S+'/05-speakers.png', fullPage: true })
const spRows = await p.locator('table.data tbody tr').allInnerTexts()
log('STEP4 연자 수:', spRows.length)
spRows.forEach(r => log('   -', r.replace(/\s+/g,' ').slice(0,100)))

/* STEP 5 — 메뉴 변화 (해외 연자가 생기면 출입국 메뉴가 떠야 한다) */
const navNow = await p.locator('.nav-item').allInnerTexts()
log('\nSTEP5 메뉴', navNow.length, '개 · 출입국 노출:', navNow.some(t=>t.includes('출입국')) ? 'O' : 'X')

/* STEP 5b — 파이프라인 단계 진행 (후보발굴 → 계약완료) */
log('\nSTEP5b 파이프라인 진행')
for (const name of ['김도현', '이수진', 'Michael Chen']) {
  await p.getByRole('button', { name: /연자 목록/ }).click(); await p.waitForTimeout(300)
  const row = p.locator('table.data tbody tr', { hasText: name }).first()
  await row.click(); await p.waitForTimeout(450)
  const sel = p.locator('.page-head select').first()
  for (const stage of ['내부승인', '사전타진', '공식초청', '수락', '계약완료']) {
    await sel.selectOption(stage); await p.waitForTimeout(220)
  }
  const after = await p.locator('.page-head').innerText()
  log('   ', name, '→', after.split('\n').filter(l=>/계약완료|수락/.test(l))[0] ?? '(단계 표시 못 찾음)')
}
await p.getByRole('button', { name: /대시보드/ }).click(); await p.waitForTimeout(600)
await p.screenshot({ path: S+'/06-dash-contracted.png', fullPage: true })
const d2 = await p.locator('body').innerText()
const tile = (lbl) => { const i = d2.split('\n').findIndex(l => l.trim() === lbl); return i<0?'(없음)':d2.split('\n').slice(i,i+4).map(x=>x.trim()).join(' ') }
log('   확정 연자:', tile('확정 연자'))
log('   제출물 검수:', tile('제출물 검수'))
log('   교통 확정:', tile('교통 확정'))
log('   초청 예산 집행(약정):', tile('초청 예산 집행(약정)'))

/* STEP 6 — 전 메뉴 순회하며 상태 기록 */
log('\nSTEP6 화면별 상태')
for (const t of navNow) {
  const name = t.replace(/^[^가-힣A-Za-z]+/,'').replace(/\d+$/,'').trim()
  if (!name) continue
  const btn = p.getByRole('button', { name }).first()
  if (!await btn.count()) continue
  await btn.click(); await p.waitForTimeout(320)
  const body = await p.locator('body').innerText()
  const main = body.split('\n').filter(l=>l.trim()).slice(21)
  const empties = main.filter(l => /없습니다|해당 없음|선택하세요|^-$/.test(l)).length
  log(`   ${name.padEnd(12)} 본문 ${String(main.length).padStart(3)}줄 · 빈 안내 ${empties}`)
  await p.screenshot({ path: `${S}/m-${name.replace(/[·\s]/g,'')}.png`, fullPage: true })
}

log('\nERR:', errs.length?errs.slice(0,4):'none')
await b.close()
