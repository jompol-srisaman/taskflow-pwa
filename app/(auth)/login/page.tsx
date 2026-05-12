'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function signInWithGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          scope: 'openid email profile https://www.googleapis.com/auth/calendar',
        },
      },
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r3)',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'var(--accent)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="white">
              <rect x="1" y="1" width="6" height="6" rx="1"/>
              <rect x="9" y="1" width="6" height="4" rx="1"/>
              <rect x="1" y="9" width="6" height="4" rx="1"/>
              <rect x="9" y="7" width="6" height="8" rx="1"/>
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.4px' }}>TaskFlow</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>v4.0 PWA</div>
          </div>
        </div>

        <div style={{ marginBottom: '8px', fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px' }}>
          ยินดีต้อนรับ
        </div>
        <div style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
          จัดการงานของคุณอย่างมืออาชีพ<br/>sync ข้ามอุปกรณ์ได้ทันที
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: loading ? 'var(--surface2)' : 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--r2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text)',
            fontFamily: 'var(--font)',
            transition: 'all 0.12s',
            marginBottom: '16px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
        </button>

        <p style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.6 }}>
          การเข้าสู่ระบบถือว่าคุณยอมรับข้อกำหนดการใช้งาน
        </p>

        {/* Features list */}
        <div style={{
          marginTop: '28px',
          paddingTop: '24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          textAlign: 'left',
        }}>
          {[
            { icon: '⚡', text: 'Sync ข้ามอุปกรณ์ทันที' },
            { icon: '📅', text: 'Google Calendar sync' },
            { icon: '🔔', text: 'แจ้งเตือน Deadline อัตโนมัติ' },
            { icon: '📱', text: 'Install เป็น App บน iOS/Android' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text2)' }}>
              <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
