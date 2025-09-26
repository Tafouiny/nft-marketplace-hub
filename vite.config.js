import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    proxy: {
      '/ipfs-proxy': {
        target: 'https://gateway.pinata.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ipfs-proxy/, '/ipfs'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    }
  },
  define: {
    global: 'globalThis',
  }
})