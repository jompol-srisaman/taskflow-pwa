'use client'
import { useEffect, useCallback } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useDemoTaskStore, type DemoTaskState } from '@/store/demoTaskStore'
import { DemoTaskModal } from '@/components/tasks/DemoTaskModal'
import { DEMO_TASKS, DEMO_CATEGORIES, DEMO_PROJECTS, DEMO_PHASES, DEMO_ACTIVITY_LOG, DEMO_PROJECT_NOTES } from '@/lib/demoData'

function seedDemoData(store: DemoTaskState) {
  store.setCategories(DEMO_CATEGORIES)
  store.setProjects(DEMO_PROJECTS)
  store.setPhases(DEMO_PHASES)
  store.setActivityLog(DEMO_ACTIVITY_LOG)
  store.setTasks(DEMO_TASKS)
  store.setProjectNotes(DEMO_PROJECT_NOTES)
  store.setCurrentProject(null)
  store.setActiveTab('dashboard')
}

export function DemoShell({ children }: { children: React.ReactNode }) {
  const { theme, accent, fontSize } = useUIStore()
  const demoStore = useDemoTaskStore()

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
    seedDemoData(demoStore)
  }, [])

  const handleReset = useCallback(() => {
    seedDemoData(demoStore)
  }, [demoStore])

  return (
    <>
      {/* Demo Banner */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'linear-gradient(90deg, #F59E0B, #D97706)',
        color: 'white', fontSize: '12px', fontFamily: 'var(--font)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '0 12px', height: '36px', flexShrink: 0,
      }}>
        <span>🧪</span>
        <span style={{ fontWeight: 600 }}>Demo Mode</span>
        <span style={{ opacity: 0.85 }}>— ข้อมูลทั้งหมดจะหายเมื่อ Refresh ไม่มีการบันทึกข้อมูลจริง</span>
        <button
          onClick={handleReset}
          style={{
            marginLeft: '8px', padding: '3px 10px',
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: '20px', color: 'white', fontSize: '11px',
            cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
            transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
        >↺ Reset Demo</button>
      </div>

      {/* Content */}
      <div style={{ paddingTop: '36px', minHeight: '100vh', background: 'var(--bg)' }}>
        <DemoLayout>{children}</DemoLayout>
      </div>

      <DemoTaskModal />
    </>
  )
}

function DemoLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen, setCurrentPage } = useUIStore()
  const { tasks, categories, projects, currentProjectId, setCurrentProject, setActiveTab } = useDemoTaskStore()

  const activeTasks = tasks.filter(t => t.status !== 'done')
  const activeProjects = projects.filter(p => p.status === 'active')

  return (
    <div className="shell" style={{ position: 'relative' }}>
      {/* Demo Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} id="sidebar">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', background: '#F59E0B', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="white"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="4" rx="1"/><rect x="1" y="9" width="6" height="4" rx="1"/><rect x="9" y="7" width="6" height="8" rx="1"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.3px' }}>KhunMeenFlow</div>
              <div style={{ fontSize: '10px', color: '#F59E0B', fontFamily: 'var(--mono)', fontWeight: 600 }}>DEMO</div>
            </div>
          </div>
        </div>

        {/* Project switcher (demo) */}
        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.8px', textTransform: 'uppercase', padding: '0 8px', marginBottom: '4px' }}>Project</div>
          <DemoProjectSwitcher
            projects={activeProjects}
            tasks={tasks}
            currentProjectId={currentProjectId}
            onSelect={id => { setCurrentProject(id); setSidebarOpen(false) }}
          />
        </div>

        <nav style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.8px', textTransform: 'uppercase', padding: '0 8px', marginBottom: '3px' }}>เมนูหลัก</div>
          <DemoNavItem label="Dashboard"   icon="▦" count={undefined}          onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false) }} />
          <DemoNavItem label="งานทั้งหมด" icon="≡" count={activeTasks.length}  onClick={() => { setActiveTab('tasks');     setSidebarOpen(false) }} />
          <DemoNavItem label="Projects"    icon="📁" count={activeProjects.length} onClick={() => { setActiveTab('projects');  setSidebarOpen(false) }} />
          <div style={{ marginTop: '16px', fontSize: '10px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.8px', textTransform: 'uppercase', padding: '0 8px', marginBottom: '3px' }}>กลุ่มงาน</div>
          {categories.map(cat => {
            const count = activeTasks.filter(t => t.category_id === cat.id).length
            return <DemoNavItem key={cat.id} label={cat.name} dot={cat.color} count={count} />
          })}
        </nav>

        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'white' }}>D</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Demo User</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>ทดลองใช้งาน</div>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', zIndex: 48 }}
          onClick={() => setSidebarOpen(false)} />
      )}

      <main className="content">{children}</main>
    </div>
  )
}

function DemoProjectSwitcher({ projects, tasks, currentProjectId, onSelect }: {
  projects: { id: string; name: string; color: string }[]
  tasks: { project_id: string | null; status: string }[]
  currentProjectId: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      <button onClick={() => onSelect(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', border: 'none', width: '100%', textAlign: 'left', background: !currentProjectId ? 'var(--accent)' : 'transparent', color: !currentProjectId ? 'var(--surface)' : 'var(--text2)', fontFamily: 'var(--font)', fontSize: '13px', cursor: 'pointer' }}>
        <span style={{ fontSize: '12px' }}>🌐</span>
        <span style={{ flex: 1 }}>ทุก Project</span>
      </button>
      {projects.map(p => {
        const count = tasks.filter(t => t.project_id === p.id && t.status !== 'done').length
        return (
          <button key={p.id} onClick={() => onSelect(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', border: 'none', borderTop: '1px solid var(--border)', width: '100%', textAlign: 'left', background: currentProjectId === p.id ? 'var(--accent)' : 'transparent', color: currentProjectId === p.id ? 'var(--surface)' : 'var(--text2)', fontFamily: 'var(--font)', fontSize: '13px', cursor: 'pointer' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0, display: 'block' }} />
            <span style={{ flex: 1 }}>{p.name}</span>
            {count > 0 && <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', opacity: 0.7 }}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

function DemoNavItem({ label, icon, dot, count, onClick }: { label: string; icon?: string; dot?: string; count?: number; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--text2)', cursor: onClick ? 'pointer' : 'default' }}>
      {dot ? <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot, flexShrink: 0, display: 'block' }} /> : <span style={{ fontSize: '12px', width: '14px', textAlign: 'center' }}>{icon}</span>}
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && count > 0 && <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{count}</span>}
    </div>
  )
}
