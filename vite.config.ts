import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Pinned because the Google Fonts API key is restricted by HTTP referrer to
  // http://localhost:5173/*. strictPort makes Vite fail loudly rather than
  // quietly moving to 5174, where every catalogue request would 403.
  server: { port: 5173, strictPort: true },
  plugins: [react(), tailwindcss()],
  test: {
    // Vitest's default pattern is **/*.{test,spec}.ts, which also matches the
    // Playwright specs in e2e/. Those use Playwright's own `test` export and
    // throw when Vitest loads them, so unit runs are scoped to src/.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
})
