import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function readBackendPort() {
  const portFile = path.resolve(__dirname, '../.backend-port')
  try {
    const raw = fs.readFileSync(portFile, 'utf8').trim()
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : 8000
  } catch {
    return 8000
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        router: () => `http://127.0.0.1:${readBackendPort()}`,
      },
    },
  },
})
