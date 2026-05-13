'use client'
import { useUIStore } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useUIStore()
  const { tasks, categories } = useTaskStore()
  const { profile } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  function navTo(page: string, url?: string) {
    setCurrentPage(page)
    router.push(url || `/${page}`)
    setSidebarOpen(false)
  }

  function isActive(page: string) {
    return currentPage === page || currentPage.startsWith(`${page}:`)
  }

  const activeTasks = tasks.filter(t => t.status !== 'done')
  const soonCount = activeTasks.filter(t => {
    if (!t.deadline) return false
    const diff = Math.ceil((new Date(t.deadline).getTime() - Date.now()) / 86400000)
    return diff >= 0 && diff <= 3
  }).length

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile?.name ? profile.name[0].toUpperCase() : 'ฉ'

  return (
    <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} id="sidebar">
      {/* Logo */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px',
            background: 'var(--accent)',
            borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
              <rect x="1" y="1" width="6" height="6" rx="1"/>
              <rect x="9" y="1" width="6" height="4" rx="1"/>
              <rect x="1" y="9" width="6" height="4" rx="1"/>
              <rect x="9" y="7" width="6" height="8" rx="1"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.3px' }}>KhunMeenFlow</div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>v4.0</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.8px', textTransform: 'uppercase', padding: '0 8px', marginBottom: '3px' }}>เมนูหลัก</div>
          <NavItem icon={<DashboardIcon />} label="Dashboard" active={isActive('dashboard')} onClick={() => navTo('dashboard')} />
          <NavItem icon={<TasksIcon />} label="งานทั้งหมด" active={isActive('tasks')} onClick={() => navTo('tasks')} count={activeTasks.length} />
          <NavItem
            icon={<ClockIcon />}
            label="Deadline ใกล้ครบ"
            active={currentPage === 'deadline'}
            onClick={() => { setCurrentPage('deadline'); router.push('/tasks?filter=soon'); setSidebarOpen(false) }}
            count={soonCount}
            countColor="var(--orange)"
          />
          <NavItem icon={<CalendarIcon />} label="ปฏิทิน" active={isActive('calendar')} onClick={() => navTo('calendar')} />
          <NavItem icon={<HistoryIcon />} label="ประวัติ & รายงาน" active={isActive('history')} onClick={() => navTo('history')} />
        </div>

        {/* Categories */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.8px', textTransform: 'uppercase', padding: '0 8px', marginBottom: '3px' }}>กลุ่มงาน</div>
          {categories.map(cat => {
            const count = activeTasks.filter(t => t.category_id === cat.id).length
            return (
              <NavItem
                key={cat.id}
                icon={<span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, flexShrink: 0, display: 'block' }} />}
                label={cat.name}
                active={isActive(`cat:${cat.id}`)}
                onClick={() => { setCurrentPage(`cat:${cat.id}`); router.push(`/tasks?category=${cat.id}`); setSidebarOpen(false) }}
                count={count}
              />
            )
          })}
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.8px', textTransform: 'uppercase', padding: '0 8px', marginBottom: '3px' }}>ระบบ</div>
          <NavItem icon={<SettingsIcon />} label="ตั้งค่าระบบ" active={isActive('settings')} onClick={() => navTo('settings')} />
        </div>
      </nav>

      {/* Footer / User */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 600, flexShrink: 0, overflow: 'hidden',
          }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || 'ผู้ใช้'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Admin</div>
          </div>
        </div>
        <button onClick={handleSignOut} style={{
          width: '100%', padding: '8px 12px',
          background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 'var(--r)', cursor: 'pointer',
          fontFamily: 'var(--font)', fontSize: '13px',
          color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'all 0.12s',
          WebkitTapHighlightColor: 'transparent',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-bg)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}

function NavItem({ icon, label, active, onClick, count, countColor }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; count?: number; countColor?: string
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '7px 10px', borderRadius: 'var(--r)',
      cursor: 'pointer', fontSize: '13px',
      color: active ? 'var(--surface)' : 'var(--text2)',
      background: active ? 'var(--accent)' : 'transparent',
      border: 'none', width: '100%', textAlign: 'left',
      fontFamily: 'var(--font)', transition: 'all 0.12s',
      WebkitTapHighlightColor: 'transparent',
    }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: active ? 'rgba(255,255,255,.7)' : (countColor || 'var(--text3)') }}>
          {count}
        </span>
      )}
    </button>
  )
}

function DashboardIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="4" rx="1.5"/><rect x="1" y="9" width="6" height="4" rx="1.5"/><rect x="9" y="7" width="6" height="8" rx="1.5"/></svg> }
function TasksIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}><path d="M2 4h12v1.5H2zM2 8h12v1.5H2zM2 12h8v1.5H2z"/></svg> }
function ClockIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M8 4.5v4l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg> }
function CalendarIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}><rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg> }
function HistoryIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}><path d="M8 2a6 6 0 100 12A6 6 0 008 2zm-.75 2.5v4l3 1.5-.75 1.5L6.5 9.5V4.5h.75z"/></svg> }
function SettingsIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}><path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm-1.2-3.2l-.6 1.8H4.5L3 5.5l1.2 1.5-.6 2 1.8 1 1.2-1.5H8.4l1.2 1.5 1.8-1-.6-2L12 5.5l-1.5-1.4H8.8l-.6-1.8H6.8z"/></svg> }
