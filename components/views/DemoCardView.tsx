'use client'
import { useMemo } from 'react'
import { useDemoTaskStore } from '@/store/demoTaskStore'
import { DemoTaskCard } from '@/components/tasks/DemoTaskCard'
import { isPast, parseISO, isToday } from 'date-fns'
import type { Task } from '@/types'

export function DemoCardView({ tasks }: { tasks: Task[] }) {
  const { categories } = useDemoTaskStore()

  const overdueTasks = useMemo(() =>
    tasks.filter(t => t.status !== 'done' && t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline)))
  , [tasks])

  const groups = useMemo(() => {
    const nonOverdue = tasks.filter(t => !(t.status !== 'done' && t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline))))
    const catMap = new Map<string, Task[]>()
    const uncategorized: Task[] = []

    nonOverdue.forEach(task => {
      if (task.category_id && task.category) {
        if (!catMap.has(task.category_id)) catMap.set(task.category_id, [])
        catMap.get(task.category_id)!.push(task)
      } else {
        uncategorized.push(task)
      }
    })

    const sortedCats = categories.filter(c => catMap.has(c.id)).sort((a, b) => a.sort_order - b.sort_order)
    const result: { id: string; name: string; color: string; bgColor: string; tasks: Task[] }[] = []
    sortedCats.forEach(c => result.push({ id: c.id, name: c.name, color: c.color, bgColor: c.bg_color, tasks: catMap.get(c.id)! }))
    if (uncategorized.length > 0) result.push({ id: 'none', name: 'ไม่ระบุกลุ่ม', color: 'var(--text3)', bgColor: 'var(--surface2)', tasks: uncategorized })
    return result
  }, [tasks, categories])

  if (tasks.length === 0) return (
    <div className="empty"><div className="empty-icon">📋</div><div className="empty-title">ไม่มีงานที่ตรงเงื่อนไข</div></div>
  )

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {overdueTasks.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--red-border)' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--red)' }}>เกินกำหนด</span>
            <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--red)', background: 'var(--red-bg)', padding: '1px 7px', borderRadius: '10px', marginLeft: 'auto' }}>{overdueTasks.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {overdueTasks.map(task => <DemoTaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}
      {groups.map(group => (
        <div key={group.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: group.color, flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: group.color }}>{group.name}</span>
            <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: group.color, background: group.bgColor, padding: '1px 7px', borderRadius: '10px', marginLeft: 'auto' }}>{group.tasks.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {group.tasks.map(task => <DemoTaskCard key={task.id} task={task} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
