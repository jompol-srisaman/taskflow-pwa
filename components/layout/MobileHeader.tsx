'use client'
import { useUIStore } from '@/store/uiStore'

export function MobileHeader() {
  const { toggleSidebar, openTaskModal } = useUIStore()

  return (
    <header className="mobile-header-bar" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 14px',
      height: '50px',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <button
        onClick={toggleSidebar}
        style={{
          width: '38px', height: '38px',
          border: 'none', background: 'transparent',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '5px', borderRadius: 'var(--r)',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
        aria-label="เปิดเมนู"
      >
        <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--text)', borderRadius: '2px' }} />
        <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--text)', borderRadius: '2px' }} />
        <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--text)', borderRadius: '2px' }} />
      </button>

      <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.3px' }}>KhunMeenFlow</span>

      <button
        onClick={() => openTaskModal()}
        style={{
          width: '38px', height: '38px',
          background: 'var(--accent)', color: 'var(--surface)',
          border: 'none', borderRadius: 'var(--r)',
          cursor: 'pointer', fontSize: '22px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
        aria-label="เพิ่มงาน"
      >+</button>
    </header>
  )
}
