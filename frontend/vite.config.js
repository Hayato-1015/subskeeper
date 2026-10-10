import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // トップページの 3DCG（three.js）は別ファイルで必要なときだけ読み込むので、その大きさは許容する
    chunkSizeWarningLimit: 600,
  },
})
