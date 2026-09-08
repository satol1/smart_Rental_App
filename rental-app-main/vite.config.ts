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

  build: {
    rollupOptions: {
      output: {
        /**
         * Разбиение вендоров. Правила:
         * 1. App-код (src/) НЕ группируем — чанки страниц создаёт React.lazy.
         *    Группировка папок src порождает циклы чанков (react-vendor ⇄ admin)
         *    и статические импорты ленивых страниц из entry — белая страница.
         * 2. Каждый модуль node_modules явно расклеймлен (фолбэк 'vendor') —
         *    вендор-чанки физически не могут импортировать app-чанки, циклы исключены.
         */
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')

          if (!normalized.includes('/node_modules/')) {
            return undefined
          }

          // --- Вендоры ---
          if (
            /\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|@remix-run)\//.test(
              normalized,
            )
          ) {
            return 'react-vendor'
          }
          if (normalized.includes('/node_modules/@tanstack/react-query')) {
            return 'query'
          }
          if (
            normalized.includes('/node_modules/recharts') ||
            normalized.includes('/node_modules/d3-') ||
            normalized.includes('/node_modules/victory-vendor') ||
            normalized.includes('/node_modules/react-smooth') ||
            normalized.includes('/node_modules/recharts-scale') ||
            normalized.includes('/node_modules/recharts-resize')
          ) {
            return 'charts'
          }
          if (
            normalized.includes('/node_modules/@radix-ui/') ||
            normalized.includes('/node_modules/cmdk')
          ) {
            return 'radix-ui'
          }
          if (
            normalized.includes('/node_modules/@uiw/') ||
            normalized.includes('/node_modules/@codemirror/') ||
            normalized.includes('/node_modules/@lezer/')
          ) {
            // Тяжёлый markdown-редактор оборудования — отдельный ленивый чанк
            return 'md-editor'
          }
          return 'vendor'
        },
      },
    },
  },
})
