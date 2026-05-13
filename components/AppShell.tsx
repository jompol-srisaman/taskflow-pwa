'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useTasks, useTaskActions } from '@/hooks/useTasks'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { BottomNav } from '@/components/layout/BottomNav'
import { TaskModal } from '@/components/tasks/TaskModal'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, accent, fontSize, sidebarOpen, setSidebarOpen } = useUIStore()
  const { userId, initialized, setAuth, clearAuth } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  // Client-side auth init — reads session from localStorage (instant, no network call)
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        clearAuth()
        router.replace('/login')
        return
      }
      const uid = session.user.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, settings')
        .eq('id', uid)
        .single()
      setAuth(uid, profile as import('@/types').Profile | null)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearAuth()
        router.replace('/login')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Apply theme/accent/fontSize to <html>
  useEffect(() => {
    const html = document.documentElement
    const resolved = theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
    html.setAttribute('data-theme', resolved)
    html.setAttribute('data-accent', accent === 'black' ? '' : accent)
    html.setAttribute('data-fs', fontSize)
  }, [theme, accent, fontSize])

  const { ensurePresetCategories } = useTaskActions(userId)
  useTasks(userId)

  useEffect(() => {
    if (userId) ensurePresetCategories()
  }, [userId])

  // Show spinner until session is determined
  if (!initialized) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '2.5px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            margin: '0 auto 12px',
          }} />
          <div style={{ fontSize: '12px', color: 'var(--text3)' }}>กำลังโหลด...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <>
      {/* Mobile header (fixed, always on top) */}
      <MobileHeader />

      {/* Overlay when sidebar open on mobile */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,.45)', zIndex: 48,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="shell">
        <Sidebar />
        <main className="content">
          {children}
        </main>
      </div>

      <BottomNav />
      <TaskModal />
    </>
  )
}
