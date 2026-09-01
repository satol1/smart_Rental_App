import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    strictPort: true,

    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // КРИТИЧНО: передача cookies через proxy
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
      },
    },

  },

  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url))
    }
  },
})