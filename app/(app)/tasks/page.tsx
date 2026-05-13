'use client'
import { useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTaskStore } from '@/store/taskStore'
import { useUIStore } from '@/store/uiStore'
import { ListView } from '@/components/views/ListView'
import { CardView } from '@/components/views/CardView'
import { KanbanView } from '@/components/views/KanbanView'
import { isPast, parseISO, isToday, differenceInDays, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export default function TasksPage() {
  const { tasks, categories, loading } = useTaskStore()
  const { viewMode, setViewMode, filter, setFilter, openTaskModal } = useUIStore()
  const searchParams = useSearchParams()

  // Apply URL param filters on mount
  useEffect(() => {
    const status = searchParams.get('status')
    const cat    = searchParams.get('category')
    const f      = searchParams.get('filter')
    if (status === 'done') setFilter({ status: 'done' })
    if (cat) setFilter({ categoryId: cat })
    if (f === 'soon' || f === 'today' || f === 'overdue') setFilter({ status: 'active' })
  }, [searchParams])

  const filteredTasks = useMemo(() => {
    let result = [...tasks]

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

    if (filter.status === 'active') result = result.filter(t => t.status !== 'done')
    else if (filter.status === 'done') result = result.filter(t => t.status === 'done')

    if (filter.categoryId !== 'all') result = result.filter(t => t.category_id === filter.categoryId)
    if (filter.priority !== 'all') result = result.filter(t => t.priority === filter.priority)

    // Date filter
    if (filter.dateFilter === 'today') {
      result = result.filter(t => t.deadline && isToday(parseISO(t.deadline)))
    } else if (filter.dateFilter === 'this_week') {
      const start = startOfWeek(new Date(), { weekStartsOn: 1 })
      const end   = endOfWeek(new Date(), { weekStartsOn: 1 })
      result = result.filter(t => t.deadline && isWithinInterval(parseISO(t.deadline), { start, end }))
    } else if (filter.dateFilter === 'this_month') {
      const start = startOfMonth(new Date())
      const end   = endOfMonth(new Date())
      result = result.filter(t => t.deadline && isWithinInterval(parseISO(t.deadline), { start, end }))
    }

    if (filter.search) {
      const q = filter.search.toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q))
    }

    return result
  }, [tasks, filter, searchParams])

  const urlFilter = searchParams.get('filter')
  const pageTitle = urlFilter === 'overdue' ? 'Deadline เกินกำหนด'
    : urlFilter === 'today' ? 'ครบกำหนดวันนี้'
    : urlFilter === 'soon' ? 'Deadline ใกล้ครบ'
    : searchParams.get('category') ? (categories.find(c => c.id === searchParams.get('category'))?.name || 'งาน')
    : 'งานทั้งหมด'

  const showSecondFilterRow = !urlFilter && !searchParams.get('category')

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.4px' }}>{pageTitle}</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{filteredTasks.length} รายการ</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', flexShrink: 0 }}>
            {(['list', 'card', 'kanban'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '6px 12px', border: 'none',
                background: viewMode === v ? 'var(--accent)' : 'transparent',
                color: viewMode === v ? 'var(--surface)' : 'var(--text2)',
                fontFamily: 'var(--font)', fontSize: '12px',
                cursor: 'pointer', transition: 'all 0.12s',
                display: 'flex', alignItems: 'center', gap: '5px',
                borderLeft: v !== 'list' ? '1px solid var(--border)' : 'none',
              }}>
                {v === 'list' ? '☰ List' : v === 'card' ? '▦ Card' : '⊞ Kanban'}
              </button>
            ))}
          </div>
          <button className="btn-primary desktop-only" onClick={() => openTaskModal()}>+ เพิ่มงาน</button>
        </div>
      </div>

      {/* Filter bar row 1 — status + search */}
      <div className="filter-bar">
        <button className={`filter-btn${filter.status === 'all' ? ' active' : ''}`} onClick={() => setFilter({ status: 'all' })}>ทั้งหมด</button>
        <button className={`filter-btn${filter.status === 'active' ? ' active' : ''}`} onClick={() => setFilter({ status: 'active' })}>กำลังทำ</button>
        <button className={`filter-btn${filter.status === 'done' ? ' active' : ''}`} onClick={() => setFilter({ status: 'done' })}>เสร็จแล้ว</button>
        <div style={{ flex: 1 }} />
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
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* Filter bar row 2 — date + category (hidden when viewing URL-based filters) */}
      {showSecondFilterRow && (
        <div className="filter-bar" style={{ marginTop: '-8px' }}>
          {/* Date filter */}
          <span style={{ fontSize: '11px', color: 'var(--text3)', flexShrink: 0 }}>📅</span>
          {([
            { value: 'all',        label: 'ทุกวัน' },
            { value: 'today',      label: 'วันนี้' },
            { value: 'this_week',  label: 'สัปดาห์นี้' },
            { value: 'this_month', label: 'เดือนนี้' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              className={`filter-btn${filter.dateFilter === opt.value ? ' active' : ''}`}
              onClick={() => setFilter({ dateFilter: opt.value })}
            >
              {opt.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Category filter */}
          <span style={{ fontSize: '11px', color: 'var(--text3)', flexShrink: 0 }}>🏷️</span>
          <select
            value={filter.categoryId}
            onChange={e => setFilter({ categoryId: e.target.value })}
            style={{
              padding: '5px 10px', border: '1px solid var(--border)',
              borderRadius: '20px', background: 'var(--surface)',
              fontSize: '12px', color: filter.categoryId !== 'all' ? 'var(--text)' : 'var(--text2)',
              fontFamily: 'var(--font)', cursor: 'pointer',
              appearance: 'none', WebkitAppearance: 'none',
              paddingRight: '24px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A09C97' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <option value="all">ทุกกลุ่ม</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '72px', background: 'var(--surface2)', borderRadius: 'var(--r2)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'list'   && <ListView   tasks={filteredTasks} />}
          {viewMode === 'card'   && <CardView   tasks={filteredTasks} />}
          {viewMode === 'kanban' && <KanbanView tasks={filteredTasks} />}
        </>
      )}
    </div>
  )
}
