/**
 * 단일 HTML 대시보드 빌드
 * - 번들러/서버 없이 동작하도록 JS·CSS를 index.html 한 파일에 인라인한다.
 * - 모듈(import) 대신 IIFE 로 출력하여 file:// 로 열어도 실행된다.
 * 실행: npm run build:html  →  onference-dashboard.html
 */
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const OUT_DIR = 'dist-single'
const TARGET = 'onference-dashboard.html'

await build({
  configFile: false,
  plugins: [react()],
  base: './',
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: 'index.html',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
})

const read = (f) => fs.readFileSync(path.join(OUT_DIR, f), 'utf8')
let html = read('index.html')
const js = read('app.js').replace(/<\/script/gi, '<\\/script')
const css = read('app.css')

// 치환 문자열의 `$` 해석을 피하기 위해 replacer 함수를 사용한다.
const before = html
html = html
  .replace(/\s*<script[^>]*src="[^"]*app\.js"[^>]*><\/script>/, () => '')
  .replace(/<link[^>]*href="[^"]*app\.css"[^>]*>/, () => `<style>\n${css}\n</style>`)
  // IIFE(클래식 스크립트)는 defer 가 없으므로 body 끝에서 실행되도록 배치한다.
  .replace('</body>', () => `  <script>\n${js}\n  </script>\n  </body>`)

if (before === html || html.includes('app.js') || html.includes('app.css')) {
  throw new Error('인라인 치환 실패 — 빌드 산출물 파일명을 확인하세요.')
}

fs.writeFileSync(TARGET, html)
fs.rmSync(OUT_DIR, { recursive: true, force: true })
const kb = (fs.statSync(TARGET).size / 1024).toFixed(0)
console.log(`✓ ${TARGET} 생성 완료 (${kb} KB · 외부 파일 의존성 없음)`)
