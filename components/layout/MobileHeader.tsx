'use client'
import { useUIStore } from '@/store/uiStore'

export function MobileHeader() {
  const { toggleSidebar, openTaskModal } = useUIStore()

  return (
    <header style={{
      display: 'flex',
      position: 'relative',
      zIndex: 30,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 14px',
      height: '50px',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }} className="mobile-header-bar">
      <button
        onClick={toggleSidebar}
        style={{
          width: '34px', height: '34px',
          border: 'none', background: 'transparent',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '5px', borderRadius: 'var(--r)',
        }}
      >
        <span style={{ display: 'block', width: '18px', height: '2px', background: 'var(--text)', borderRadius: '2px' }} />
        <span style={{ display: 'block', width: '18px', height: '2px', background: 'var(--text)', borderRadius: '2px' }} />
        <span style={{ display: 'block', width: '18px', height: '2px', background: 'var(--text)', borderRadius: '2px' }} />
      </button>

      <span style={{ fontSize: '15px', fontWeight: 600 }}>TaskFlow</span>

      <button
        onClick={() => openTaskModal()}
        style={{
          width: '34px', height: '34px',
          background: 'var(--accent)', color: 'var(--surface)',
          border: 'none', borderRadius: 'var(--r)',
          cursor: 'pointer', fontSize: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}
      >+</button>
    </header>
  )
}
