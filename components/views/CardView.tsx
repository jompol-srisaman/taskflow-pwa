'use client'
import { TaskCard } from '@/components/tasks/TaskCard'
import type { Task } from '@/types'

interface CardViewProps {
  userId: string
  tasks: Task[]
}

export function CardView({ userId, tasks }: CardViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">📋</div>
        <div className="empty-title">ไม่มีงานที่ตรงเงื่อนไข</div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '10px',
    }}>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} userId={userId} />
      ))}
    </div>
  )
}
