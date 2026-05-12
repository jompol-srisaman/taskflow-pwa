'use client'
import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useTasks, useTaskActions } from '@/hooks/useTasks'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { BottomNav } from '@/components/layout/BottomNav'
import { TaskModal } from '@/components/tasks/TaskModal'
import type { Profile } from '@/types'

interface AppShellProps {
  children: React.ReactNode
  profile: Profile | null
  userId: string
}

export function AppShell({ children, profile, userId }: AppShellProps) {
  const { theme, accent, fontSize, sidebarOpen, setSidebarOpen } = useUIStore()
  const { ensurePresetCategories } = useTaskActions(userId)

  useTasks(userId)

  useEffect(() => {
    ensurePresetCategories()
  }, [userId])

  useEffect(() => {
    const html = document.documentElement
    const resolvedTheme = theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
    html.setAttribute('data-theme', resolvedTheme)
    html.setAttribute('data-accent', accent === 'black' ? '' : accent)
    html.setAttribute('data-fs', fontSize)
  }, [theme, accent, fontSize])

  return (
    <>
      {/* Responsive styles */}
      <style>{`
        .mobile-header-bar { display: none; }
        .bottom-nav-bar    { display: none; }
        .desktop-only      { display: inline-flex; }
        @media (max-width: 768px) {
          .mobile-header-bar { display: flex !important; }
          .bottom-nav-bar    { display: flex !important; }
          .desktop-only      { display: none !important; }
          .sidebar           { transform: translateX(-100%); }
          .sidebar.open      { transform: translateX(0); }
        }
      `}</style>

      {/* Mobile header */}
      <MobileHeader />

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', top: '50px', left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,.4)', zIndex: 39,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="shell">
        <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <Sidebar profile={profile} />
        </div>
        <main className="content">
          {children}
        </main>
      </div>

      <BottomNav />
      <TaskModal userId={userId} />
    </>
  )
}
