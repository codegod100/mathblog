import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 6080,
  },
  preview: {
    host: '127.0.0.1',
    port: 6080,
  },
  optimizeDeps: {
    exclude: ['@panproto/core'],
  },
  build: {
    target: 'esnext',
  },
})
