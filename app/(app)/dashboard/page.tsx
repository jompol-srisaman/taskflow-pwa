'use client'
import { useMemo } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useUIStore } from '@/store/uiStore'
import { formatDeadline, formatDate } from '@/lib/utils'
import { isToday, isPast, differenceInDays, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { tasks: allTasks, categories, loading, currentProjectId, projects } = useTaskStore()
  const { openTaskModal } = useUIStore()

  // กรองตาม project — ซ่อน tasks จาก archived projects เมื่อไม่ได้เลือก project ใด
  const archivedProjectIds = new Set(projects.filter(p => p.status === 'archived').map(p => p.id))
  const tasks = currentProjectId
    ? allTasks.filter(t => t.project_id === currentProjectId)
    : allTasks.filter(t => !t.project_id || !archivedProjectIds.has(t.project_id))
  const currentProject = projects.find(p => p.id === currentProjectId)
  const router = useRouter()

  const stats = useMemo(() => {
    const active   = tasks.filter(t => t.status !== 'done')
    const done     = tasks.filter(t => t.status === 'done')
    const overdue  = active.filter(t => t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline)))
    const dueToday = active.filter(t => t.deadline && isToday(parseISO(t.deadline)))
    const dueSoon  = active.filter(t => {
      if (!t.deadline) return false
      const d = differenceInDays(parseISO(t.deadline), new Date())
      return d >= 0 && d <= 3
    })
    const eEisenhower = {
      urgentImportant:    active.filter(t => t.is_urgent && t.is_important === 'high').length,
      urgentNotImportant: active.filter(t => t.is_urgent && t.is_important !== 'high').length,
      importantNotUrgent: active.filter(t => !t.is_urgent && t.is_important === 'high').length,
      neither:            active.filter(t => !t.is_urgent && t.is_important !== 'high').length,
    }
    return { total: tasks.length, active: active.length, done: done.length, overdue: overdue.length, dueToday: dueToday.length, dueSoon: dueSoon.length, eisenhower: eEisenhower }
  }, [tasks])

  const recentTasks = useMemo(() =>
    tasks.filter(t => t.status !== 'done').slice(0, 5)
  , [tasks])

  const categoryStats = useMemo(() =>
    categories.map(c => ({
      ...c,
      count: tasks.filter(t => t.category_id === c.id && t.status !== 'done').length,
    })).filter(c => c.count > 0).slice(0, 5)
  , [tasks, categories])

  if (loading) return <LoadingSkeleton />

  const completionPct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.4px' }}>
            {currentProject ? currentProject.name : 'Dashboard'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
            {currentProject ? 'ภาพรวม project' : 'ภาพรวมงานทั้งหมด'}
          </div>
        </div>
        <button className="btn-primary desktop-only" onClick={() => openTaskModal()}>
          + เพิ่มงาน
        </button>
      </div>

      {/* Alerts */}
      {stats.overdue > 0 && (
        <div style={{
          background: 'var(--red-bg)', border: '1px solid var(--red-border)',
          borderRadius: 'var(--r)', padding: '10px 14px',
          marginBottom: '14px', fontSize: '13px', color: 'var(--red)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          ⚠️ มี {stats.overdue} งานที่เกินกำหนดแล้ว
        </div>
      )}

      {/* Stats */}
      <div className="stats-row">
        {[
          { num: stats.active, label: 'งานที่รอทำ', hint: `${stats.overdue} เกินกำหนด`, color: 'var(--accent)', fillColor: 'var(--blue)', pct: stats.total ? (stats.active / stats.total) * 100 : 0, onClick: () => router.push('/tasks') },
          { num: stats.done, label: 'เสร็จแล้ว', hint: `${completionPct}% สำเร็จ`, color: 'var(--green)', fillColor: 'var(--green)', pct: completionPct, onClick: () => router.push('/tasks?status=done') },
          { num: stats.dueToday, label: 'ครบวันนี้', hint: 'ต้องส่งวันนี้', color: 'var(--orange)', fillColor: 'var(--orange)', pct: stats.total ? (stats.dueToday / stats.total) * 100 : 0, onClick: () => router.push('/tasks?filter=today') },
          { num: stats.overdue, label: 'เกินกำหนด', hint: 'ต้องรีบจัดการ', color: 'var(--red)', fillColor: 'var(--red)', pct: stats.total ? (stats.overdue / stats.total) * 100 : 0, onClick: () => router.push('/tasks?filter=overdue') },
        ].map((s, i) => (
          <div key={i} onClick={s.onClick} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r2)', padding: '14px 16px', cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-1px', fontFamily: 'var(--mono)', lineHeight: 1, marginBottom: '4px', color: s.color }}>{s.num}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{s.label}</div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '4px', fontFamily: 'var(--mono)' }}>{s.hint}</div>
            <div style={{ marginTop: '10px', height: '3px', background: 'var(--surface2)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '2px', background: s.fillColor, width: `${Math.min(s.pct, 100)}%`, transition: 'width .5s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="chart-row">
        {/* Eisenhower Matrix */}
        <div className="chart-box" style={{ flex: 1.5 }}>
          <div className="chart-title">Eisenhower Matrix (งานที่ค้าง)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', height: '180px' }}>
            <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 'var(--r)', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--red)' }}>{stats.eisenhower.urgentImportant}</div>
              <div style={{ fontSize: '10px', color: 'var(--red)', textAlign: 'center' }}>ด่วน & สำคัญ<br/>(ทำทันที)</div>
            </div>
            <div style={{ background: 'var(--purple-bg)', border: '1px solid var(--purple)', borderRadius: 'var(--r)', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--purple)' }}>{stats.eisenhower.importantNotUrgent}</div>
              <div style={{ fontSize: '10px', color: 'var(--purple)', textAlign: 'center' }}>สำคัญ ไม่ด่วน<br/>(วางแผน)</div>
            </div>
            <div style={{ background: 'var(--orange-bg)', border: '1px solid var(--orange)', borderRadius: 'var(--r)', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--orange)' }}>{stats.eisenhower.urgentNotImportant}</div>
              <div style={{ fontSize: '10px', color: 'var(--orange)', textAlign: 'center' }}>ด่วน ไม่สำคัญ<br/>(มอบหมาย)</div>
            </div>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text2)' }}>{stats.eisenhower.neither}</div>
              <div style={{ fontSize: '10px', color: 'var(--text2)', textAlign: 'center' }}>ไม่ด่วน ไม่สำคัญ<br/>(ลดละเลิก)</div>
            </div>
          </div>
        </div>

        {/* Completion */}
        <div className="chart-box">
          <div className="chart-title">ความคืบหน้า</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', height: '180px' }}>
            <div style={{ fontSize: '48px', fontWeight: 600, fontFamily: 'var(--mono)', letterSpacing: '-2px', color: 'var(--accent)', lineHeight: 1 }}>
              {completionPct}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
              เสร็จ {stats.done} จาก {stats.total} งาน
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--green)', width: `${completionPct}%`, borderRadius: '3px', transition: 'width .5s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="chart-row">
        {/* Category breakdown */}
        <div className="chart-box">
          <div className="chart-title">งานตามกลุ่ม</div>
          {categoryStats.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: '13px' }}>ยังไม่มีงาน</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categoryStats.map(c => {
                const maxCount = Math.max(...categoryStats.map(x => x.count))
                const pct = maxCount > 0 ? (c.count / maxCount) * 100 : 0
                return (
                  <div key={c.id} className="bar-row">
                    <span className="bar-name" style={{ color: c.color }}>{c.name}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ background: c.color, width: `${pct}%` }}>
                        <span className="bar-val">{c.count}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent tasks */}
      <div>
        <div className="section-header" style={{ marginBottom: '12px' }}>
          <div className="section-dot" style={{ background: 'var(--accent)' }} />
          <span className="section-title">งานที่ต้องทำ</span>
          <span className="section-count">{recentTasks.length}</span>
          <button
            onClick={() => router.push('/tasks')}
            style={{ fontSize: '12px', color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px' }}
          >ดูทั้งหมด →</button>
        </div>

        {recentTasks.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎉</div>
            <div className="empty-title">ไม่มีงานค้าง!</div>
            <div style={{ fontSize: '13px' }}>เพิ่มงานใหม่เพื่อเริ่มต้น</div>
          </div>
        ) : (
          recentTasks.map(task => {
            const { label: dl, status: ds } = formatDeadline(task.deadline)
            return (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 'var(--r2)',
                marginBottom: '6px', transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', flexWrap: 'wrap' }}>
                    {task.category && <span className="badge" style={{ background: task.category.bg_color, color: task.category.color }}>{task.category.name}</span>}
                    {dl && <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: ds === 'overdue' ? 'var(--red)' : ds === 'soon' || ds === 'today' ? 'var(--orange)' : 'var(--text3)' }}>📅 {dl}</span>}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ height: '80px', background: 'var(--surface2)', borderRadius: 'var(--r2)', animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}
