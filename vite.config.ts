import { defineConfig } from 'vite'

export default defineConfig({
  // Host on 0.0.0.0 so you can preview on mobile during dev
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    // Telegram Mini Apps run inside a sandboxed iframe; keep the bundle lean.
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
  },
})
