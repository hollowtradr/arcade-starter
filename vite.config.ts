import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    // Phaser is ~1.3MB minified; bump warning threshold accordingly
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Keep Phaser in its own chunk for better caching
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
})
