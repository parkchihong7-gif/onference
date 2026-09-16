import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 내부 전용(비배포) 대시보드. 사내망에서 `npm run dev` 로 기동한다.
export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173 },
  base: './',
})
