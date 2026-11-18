#!/usr/bin/env node
/**
 * 시드 데이터를 JSON 으로 내보낸다 (Firestore 업로드용).
 *   npm run seed:export   → dist-seed/seed.json
 */
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

mkdirSync('dist-seed', { recursive: true })
const out = join('dist-seed', 'seed.mjs')
await build({
  entryPoints: ['src/data/seed.ts'],
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
})
const { initialState } = await import(pathToFileURL(out).href)
writeFileSync(join('dist-seed', 'seed.json'), JSON.stringify(initialState, null, 1))
console.log(`✓ dist-seed/seed.json (${Object.keys(initialState).length}개 항목)`)
