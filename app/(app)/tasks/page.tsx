'use client'
import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTaskStore } from '@/store/taskStore'
import { useUIStore } from '@/store/uiStore'
import { ListView } from '@/components/views/ListView'
import { CardView } from '@/components/views/CardView'
import { KanbanView } from '@/components/views/KanbanView'
import { isPast, parseISO, isToday, differenceInDays } from 'date-fns'
import type { Task } from '@/types'

// Passed from layout as a prop via a provider would be ideal,
// but for simplicity we'll get userId from Supabase client
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function TasksPage() {
  const { tasks, categories, loading } = useTaskStore()
  const { viewMode, setViewMode, filter, setFilter, resetFilter, openTaskModal } = useUIStore()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id) })
  }, [])

  // Apply URL param filters
  useEffect(() => {
    const status = searchParams.get('status')
    const cat = searchParams.get('category')
    const f = searchParams.get('filter')
    if (status === 'done') setFilter({ status: 'done' })
    if (cat) setFilter({ categoryId: cat })
    if (f === 'soon' || f === 'today' || f === 'overdue') setFilter({ status: 'active' })
  }, [searchParams])

  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    // URL filter shortcuts
    const urlFilter = searchParams.get('filter')
    if (urlFilter === 'overdue') {
      return result.filter(t => t.status !== 'done' && t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline)))
    }
    if (urlFilter === 'today') {
      return result.filter(t => t.status !== 'done' && t.deadline && isToday(parseISO(t.deadline)))
    }
    if (urlFilter === 'soon') {
      return result.filter(t => {
        if (t.status === 'done' || !t.deadline) return false
        const d = differenceInDays(parseISO(t.deadline), new Date())
        return d >= 0 && d <= 3
      })
    }

    // Status filter
    if (filter.status === 'active') result = result.filter(t => t.status !== 'done')
    else if (filter.status === 'done') result = result.filter(t => t.status === 'done')

    // Category filter
    if (filter.categoryId !== 'all') result = result.filter(t => t.category_id === filter.categoryId)

    // Priority filter
    if (filter.priority !== 'all') result = result.filter(t => t.priority === filter.priority)

    // Search
    if (filter.search) {
      const q = filter.search.toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q))
    }

    return result
  }, [tasks, filter, searchParams])

  const urlFilter = searchParams.get('filter')
  const pageTitle = urlFilter === 'overdue' ? 'Deadline เกินกำหนด' : urlFilter === 'today' ? 'ครบกำหนดวันนี้' : urlFilter === 'soon' ? 'Deadline ใกล้ครบ' : searchParams.get('category') ? (categories.find(c => c.id === searchParams.get('category'))?.name || 'งาน') : 'งานทั้งหมด'

  return (
    <div className="fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.4px' }}>{pageTitle}</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{filteredTasks.length} รายการ</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', flexShrink: 0 }}>
            {(['list', 'card', 'kanban'] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                style={{
                  padding: '6px 12px', border: 'none',
                  background: viewMode === v ? 'var(--accent)' : 'transparent',
                  color: viewMode === v ? 'var(--surface)' : 'var(--text2)',
                  fontFamily: 'var(--font)', fontSize: '12px',
                  cursor: 'pointer', transition: 'all 0.12s',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  borderLeft: v !== 'list' ? '1px solid var(--border)' : 'none',
                }}
              >
                {v === 'list' ? '☰ List' : v === 'card' ? '▦ Card' : '⊞ Kanban'}
              </button>
            ))}
          </div>
          <button className="btn-primary desktop-only" onClick={() => openTaskModal()}>+ เพิ่มงาน</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <button className={`filter-btn${filter.status === 'all' ? ' active' : ''}`} onClick={() => setFilter({ status: 'all' })}>ทั้งหมด</button>
        <button className={`filter-btn${filter.status === 'active' ? ' active' : ''}`} onClick={() => setFilter({ status: 'active' })}>กำลังทำ</button>
        <button className={`filter-btn${filter.status === 'done' ? ' active' : ''}`} onClick={() => setFilter({ status: 'done' })}>เสร็จแล้ว</button>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <input
          type="search"
          placeholder="ค้นหางาน..."
          value={filter.search}
          onChange={e => setFilter({ search: e.target.value })}
          style={{
            padding: '6px 12px', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', background: 'var(--surface)',
            fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--font)',
            width: '180px',
          }}
          onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border2)'}
          onBlur={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Views */}
      {userId && (
        <>
          {viewMode === 'list'   && <ListView   userId={userId} tasks={filteredTasks} />}
          {viewMode === 'card'   && <CardView   userId={userId} tasks={filteredTasks} />}
          {viewMode === 'kanban' && <KanbanView userId={userId} tasks={filteredTasks} />}
        </>
      )}
    </div>
  )
}
