import type { Metadata, Viewport } from 'next'
import { SwUpdater } from '@/components/SwUpdater'
import './globals.css'

export const metadata: Metadata = {
  title: 'KhunMeenFlow',
  description: 'จัดการงานอย่างมืออาชีพ — Personal Task Manager PWA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KhunMeenFlow',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F6F3' },
    { media: '(prefers-color-scheme: dark)',  color: '#111110' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* Runs before any JS bundle — recovers from stale SW cache by reloading when new SW activates */}
        <script dangerouslySetInnerHTML={{ __html: `
          if('serviceWorker'in navigator){
            navigator.serviceWorker.addEventListener('controllerchange',function(){
              if(sessionStorage.getItem('sw-reloaded'))return;
              sessionStorage.setItem('sw-reloaded','1');
              window.location.reload();
            });
            navigator.serviceWorker.getRegistrations().then(function(regs){
              regs.forEach(function(r){r.update();});
            });
          }
        ` }} />
      </head>
      <body suppressHydrationWarning>
        <SwUpdater />
        {children}
      </body>
    </html>
  )
}
