import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Weather GPT',
        short_name: 'Weather',
        description: 'Погода поблизости и избранные города',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0ea5e9',
        background_color: '#0ea5e9',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 3
            }
          },
          {
            urlPattern: /https:\/\/geocoding-api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'geocoding-api',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 3
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    open: true
  }
});
