#!/usr/bin/env node
/**
 * ONFERENCE 정적 서버 (의존성 0 — Node 18+ 만 있으면 동작)
 *
 *   node deploy/server.mjs [배포폴더] [포트]
 *   PORT=8080 ROOT=dist node deploy/server.mjs
 *
 * 환경 변수
 *   PORT        수신 포트 (기본 8080)
 *   HOST        바인드 주소 (기본 0.0.0.0)
 *   ROOT        정적 파일 폴더 (기본 dist)
 *   AUTH_USER   설정 시 Basic 인증 활성화 (AUTH_PASS 와 함께)
 *   AUTH_PASS
 *
 * 내부용 도구이므로 공개 주소에 올릴 때는 AUTH_USER/AUTH_PASS 를 설정하거나
 * 앞단(nginx/Caddy)에서 접근 제어를 거는 것을 전제로 한다.
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { timingSafeEqual } from 'node:crypto'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream'

const PORT = Number(process.env.PORT ?? process.argv[3] ?? 8080)
const HOST = process.env.HOST ?? '0.0.0.0'
const ROOT = resolve(process.env.ROOT ?? process.argv[2] ?? 'dist')
const USER = process.env.AUTH_USER ?? ''
const PASS = process.env.AUTH_PASS ?? ''
const AUTH_ON = Boolean(USER && PASS)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

/** 길이가 달라도 비교 시간이 값에 의존하지 않도록 한다 */
function safeEqual(a, b) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  if (x.length !== y.length) return false
  return timingSafeEqual(x, y)
}

/**
 * Basic 인증 자격증명의 문자 인코딩은 브라우저마다 다르다.
 * RFC 7617 의 charset="UTF-8" 을 따르는 브라우저는 UTF-8 로, 과거 방식의 브라우저는
 * ISO-8859-1(latin1) 로 보낸다. 한글 비밀번호는 이 차이 때문에 한쪽에서만 통과하므로
 * 두 해석을 모두 확인한다.
 */
function authorized(req) {
  if (!AUTH_ON) return true
  const header = req.headers.authorization ?? ''
  if (!header.startsWith('Basic ')) return false
  let raw
  try { raw = Buffer.from(header.slice(6), 'base64') } catch { return false }
  for (const enc of ['utf8', 'latin1']) {
    const decoded = raw.toString(enc)
    const i = decoded.indexOf(':')
    if (i < 0) continue
    if (safeEqual(decoded.slice(0, i), USER) && safeEqual(decoded.slice(i + 1), PASS)) return true
  }
  return false
}

/**
 * 배포 환경 설정을 /config.json 으로 내려 준다.
 * 환경변수가 없으면 빈 설정을 반환하고, 앱은 로컬(1인) 모드로 동작한다.
 * 같은 이미지를 환경변수만 바꿔 여러 프로젝트에 쓸 수 있다.
 */
function runtimeConfig() {
  const fb = {
    apiKey: process.env.FIREBASE_API_KEY ?? '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID ?? ''}.firebaseapp.com`,
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    appId: process.env.FIREBASE_APP_ID ?? '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.FIREBASE_SENDER_ID ?? '',
  }
  const ready = fb.apiKey && fb.projectId && fb.appId
  return {
    ...(ready ? { firebase: fb } : {}),
    allowedDomain: process.env.ALLOWED_DOMAIN || undefined,
    environmentLabel: process.env.ENVIRONMENT_LABEL || undefined,
  }
}

const server = createServer((req, res) => {
  if (!authorized(req)) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="ONFERENCE", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    })
    return res.end('인증이 필요합니다.')
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    return res.end()
  }

  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0])

  if (urlPath === '/config.json') {
    const body = JSON.stringify(runtimeConfig())
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store',
    })
    return res.end(req.method === 'HEAD' ? undefined : body)
  }
  // 상위 경로 탈출 방지
  const rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '')
  let file = join(ROOT, rel)
  if (!file.startsWith(ROOT + sep) && file !== ROOT) file = ROOT

  if (!existsSync(file) || statSync(file).isDirectory()) file = join(ROOT, 'index.html')
  if (!existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('404 Not Found')
  }

  const ext = extname(file).toLowerCase()
  const immutable = file.includes(`${sep}assets${sep}`)   // 해시가 붙은 산출물만 장기 캐시
  const type = MIME[ext] ?? 'application/octet-stream'
  const size = statSync(file).size
  // 텍스트 자산은 gzip 으로 보낸다 (번들 544KB → 약 145KB)
  const compressible = /text\/|javascript|json|svg/.test(type) && size > 1024
  const wantsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')
  const gzip = compressible && wantsGzip

  res.writeHead(200, {
    'Content-Type': type,
    ...(gzip ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : { 'Content-Length': size }),
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  })
  if (req.method === 'HEAD') return res.end()

  const stream = createReadStream(file)
  if (!gzip) return stream.pipe(res)
  pipeline(stream, createGzip(), res, err => { if (err) res.destroy() })
})

server.listen(PORT, HOST, () => {
  console.log(`ONFERENCE → http://${HOST}:${PORT}  (root: ${ROOT}${AUTH_ON ? ', Basic 인증 켜짐' : ', 인증 없음'})`)
  // 한글 비밀번호는 브라우저·OS 조합에 따라 입력 자체가 어긋날 수 있어 미리 알려 준다
  if (AUTH_ON && /[^\x20-\x7E]/.test(USER + PASS)) {
    console.warn('⚠ 아이디/비밀번호에 영문·숫자 외 문자가 있습니다. 브라우저에 따라 로그인이 실패할 수 있으니 영문+숫자 조합을 권장합니다.')
  }
})
