import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

/**
 * Publishes the app version as a tiny `version.json` marker (and exposes it to
 * the bundle via `__APP_VERSION__`). The running client fetches this marker to
 * detect a deployed MAJOR version bump and offer a reload; minor/patch releases
 * stay silent because the service worker auto-updates them.
 */
const versionMarker: Plugin = {
  name: 'wordcrew-version-marker',
  configureServer(server) {
    server.middlewares.use('/version.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify({ version: pkg.version }))
    })
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ version: pkg.version }),
    })
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  // Relative asset paths so the build works both from a domain root (web/PWA)
  // and from file:// (offline APK packaging).
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    versionMarker,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'WordCrew — Only Talented Guessers',
        short_name: 'WordCrew',
        description:
          'A classroom word game for 2+ players: one describes, the crew guesses. Normal, Hell and Team modes.',
        theme_color: '#1A1A2E',
        background_color: '#1A1A2E',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell (hashed JS/CSS + fonts + icons).
        // Audio is deliberately NOT precached: it is cached on first play so the
        // install stays light, then playback keeps working offline.
        globPatterns: ['**/*.{js,css,html,svg,woff2,png}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/audio/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'wordcrew-audio',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
