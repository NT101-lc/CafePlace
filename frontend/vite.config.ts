import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // New versions are installed automatically on the next page load.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Quản lý quán cà phê',
        short_name: 'Quán Cà Phê',
        description: 'Quản lý đơn hàng, menu và báo cáo cho quán cà phê',
        lang: 'vi',
        start_url: '/',
        display: 'standalone',
        background_color: '#faf7f2',
        theme_color: '#6f4e37',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache the app shell (UI only). API data for offline use lives in IndexedDB (src/db).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // Any page URL opened offline falls back to the cached SPA...
        navigateFallback: '/index.html',
        // ...but never API calls.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    // During development, forward API calls to Spring Boot so the browser sees one origin.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
