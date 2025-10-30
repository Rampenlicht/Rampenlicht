import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'icon-192x192.png', 'icon-512x512.png'],
      
      manifest: {
        name: 'Rampenlicht',
        short_name: 'Rampenlicht',
        description: 'Digitale Guthaben-Verwaltung und Zahlungssystem',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['finance', 'business'],
        lang: 'de-DE',
        dir: 'ltr'
      },

      workbox: {
        // Runtime Caching für bessere Offline-Funktionalität
        runtimeCaching: [
          {
            // Supabase API Calls - Network First
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 Minuten
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Bilder - Cache First
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Tage
              }
            }
          },
          {
            // CSS/JS - Stale While Revalidate
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 Tage
              }
            }
          }
        ],
        
        // Clean up old caches
        cleanupOutdatedCaches: true,
        
        // Navigation Preload für schnellere Navigation
        navigationPreload: true,
        
        // Alle wichtigen Assets precachen
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff,woff2}'
        ]
      },

      // Dev Options
      devOptions: {
        enabled: false, // Aktiviere in Produktion
        type: 'module',
        navigateFallback: 'index.html'
      }
    })
  ],
  define: {
    // Build-Datum beim Build-Prozess setzen
    '__BUILD_DATE__': JSON.stringify(
      new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    )
  }
})
