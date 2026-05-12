'use client'
import { useUIStore } from '@/store/uiStore'
import { useRouter, usePathname } from 'next/navigation'

export function BottomNav() {
  const { setCurrentPage } = useUIStore()
  const router = useRouter()
  const pathname = usePathname()

  const items = [
    { page: '/dashboard', label: 'หน้าหลัก', icon: '⊞' },
    { page: '/tasks',     label: 'งาน',       icon: '☰' },
    { page: '/calendar',  label: 'ปฏิทิน',    icon: '📅' },
    { page: '/history',   label: 'รายงาน',    icon: '📊' },
    { page: '/settings',  label: 'ตั้งค่า',   icon: '⚙' },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 30,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      height: '58px',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0)',
      boxShadow: '0 -1px 8px rgba(0,0,0,.06)',
    }} className="bottom-nav-bar">
      {items.map(item => {
        const active = pathname === item.page || (item.page !== '/' && pathname.startsWith(item.page))
        return (
          <button
            key={item.page}
            onClick={() => { setCurrentPage(item.page.slice(1)); router.push(item.page) }}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '2px',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: active ? 'var(--accent)' : 'var(--text3)',
              fontSize: '10px',
              fontFamily: 'var(--font)',
              transition: 'color 0.15s',
              padding: '4px 0',
              minHeight: '44px',
            }}
          >
            <span style={{ fontSize: '17px', lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
