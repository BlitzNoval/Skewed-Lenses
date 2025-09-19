import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: false,
    cors: true
  },
  build: {
    sourcemap: false,
    minify: false
  },
  esbuild: {
    target: 'es2020'
  }
})
