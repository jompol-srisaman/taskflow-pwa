'use client'

export default function OfflinePage() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', background: '#1A1917', color: '#E8E6E1',
      fontFamily: 'system-ui, sans-serif', margin: 0,
    }}>
      <div style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>ไม่มีการเชื่อมต่อ</div>
        <div style={{ fontSize: '14px', color: '#9B9691', marginBottom: '24px' }}>
          กรุณาตรวจสอบ Internet แล้วลองใหม่
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px', background: '#6B63FF', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
          }}
        >
          ลองใหม่
        </button>
      </div>
    </div>
  )
}
