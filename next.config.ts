import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(gstatic|googleapis)\.com\/.*/i,
        handler: 'CacheFirst' as const,
        options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } },
      },
      {
        urlPattern: /\/_next\/static\/.+/i,
        handler: 'CacheFirst' as const,
        options: { cacheName: 'next-static', expiration: { maxEntries: 200, maxAgeSeconds: 86400 } },
      },
      {
        urlPattern: /\/_next\/image\?.+/i,
        handler: 'StaleWhileRevalidate' as const,
        options: { cacheName: 'next-image', expiration: { maxEntries: 64, maxAgeSeconds: 86400 } },
      },
      {
        // HTML pages + RSC — never cache, always fetch fresh from CDN
        urlPattern: ({ sameOrigin, url, request }: { sameOrigin: boolean; url: URL; request: Request }) =>
          sameOrigin && !url.pathname.startsWith('/api/') && (
            request.headers.get('RSC') === '1' ||
            request.destination === 'document' ||
            request.mode === 'navigate'
          ),
        handler: 'NetworkOnly' as const,
      },
    ],
  },
})

const nextConfig: NextConfig = {}

export default withPWA(nextConfig)
