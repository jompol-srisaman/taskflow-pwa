'use client'

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', flexDirection: 'column', gap: '16px',
      fontFamily: 'var(--font)', color: 'var(--text2)',
    }}>
      <div style={{ fontSize: '32px' }}>⚠️</div>
      <div style={{ fontSize: '14px' }}>เกิดข้อผิดพลาด กรุณาลองใหม่</div>
      <button
        onClick={reset}
        style={{
          padding: '8px 20px', background: 'var(--accent)', color: 'white',
          border: 'none', borderRadius: 'var(--r)', fontSize: '13px', cursor: 'pointer',
        }}
      >ลองใหม่</button>
    </div>
  )
}
