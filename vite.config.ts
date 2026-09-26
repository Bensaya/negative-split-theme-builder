import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Pinned because the Google Fonts API key is restricted by HTTP referrer to
  // http://localhost:5173/*. strictPort makes Vite fail loudly rather than
  // quietly moving to 5174, where every catalogue request would 403.
  server: { port: 5173, strictPort: true },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
})
