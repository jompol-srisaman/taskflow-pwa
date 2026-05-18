'use client'
import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useTasks } from '@/hooks/useTasks'
import { ensurePresetCategories } from '@/app/actions/categories'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { BottomNav } from '@/components/layout/BottomNav'
import { TaskModal } from '@/components/tasks/TaskModal'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, accent, fontSize, sidebarOpen, setSidebarOpen } = useUIStore()
  const { fetchAll } = useTasks()

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

  useEffect(() => {
    ensurePresetCategories().then(() => fetchAll())
  }, [])

  return (
    <>
      <MobileHeader />

      <div className="shell">
        <Sidebar />
        {sidebarOpen && (
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', zIndex: 48 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="content">
          {children}
        </main>
      </div>

      <BottomNav />
      <TaskModal onSaved={fetchAll} />
    </>
  )
}
