'use client'
import { useMemo } from 'react'
import { DemoTaskCard } from '@/components/tasks/DemoTaskCard'
import { isPast, parseISO, isToday } from 'date-fns'
import type { Task } from '@/types'

export function DemoListView({ tasks }: { tasks: Task[] }) {
  const sections = useMemo(() => {
    const overdue = tasks.filter(t => t.status !== 'done' && t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline)))
    const active  = tasks.filter(t => t.status !== 'done' && !(t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline))))
    const done    = tasks.filter(t => t.status === 'done')
    return [
      { key: 'overdue', title: 'เกินกำหนด',     color: 'var(--red)',    tasks: overdue },
      { key: 'active',  title: 'กำลังดำเนินการ', color: 'var(--blue)',   tasks: active },
      { key: 'done',    title: 'เสร็จแล้ว',      color: 'var(--green)', tasks: done },
    ].filter(s => s.tasks.length > 0)
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">✅</div>
        <div className="empty-title">ไม่มีงานที่ตรงเงื่อนไข</div>
        <div style={{ fontSize: '13px' }}>ลองเปลี่ยน filter หรือเพิ่มงานใหม่</div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {sections.map(section => (
        <div key={section.key} style={{ marginBottom: '24px' }}>
          <div className="section-header">
            <div className="section-dot" style={{ background: section.color }} />
            <span className="section-title">{section.title}</span>
            <span className="section-count">{section.tasks.length}</span>
          </div>
          {section.tasks.map(task => (
            <DemoTaskCard key={task.id} task={task} />
          ))}
        </div>
      ))}
    </div>
  )
}
