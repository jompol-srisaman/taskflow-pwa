'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/store/uiStore'
import { formatDeadline, formatTime, getSubtaskProgress, RECURRING_LABEL } from '@/lib/utils'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  userId: string
  compact?: boolean
}

const PRIORITY_STYLE = {
  high:   { bg: 'var(--red-bg)',    color: 'var(--red)',    label: 'สูง' },
  medium: { bg: 'var(--orange-bg)', color: 'var(--orange)', label: 'กลาง' },
  low:    { bg: 'var(--blue-bg)',   color: 'var(--blue)',   label: 'ต่ำ' },
}

export function TaskCard({ task, userId, compact = false }: TaskCardProps) {
  const { openTaskModal } = useUIStore()
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)

  const isDone = task.status === 'done'
  const prio = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
  const { label: deadlineLabel, status: deadlineStatus } = formatDeadline(task.deadline)
  const subtaskProgress = getSubtaskProgress(task.subtasks || [])

  // Active timer time
  const [timerDisplay] = useState(() => {
    if (!task.timer_started_at) return task.total_time_seconds
    return task.total_time_seconds + Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
  })

  async function toggleDone() {
    const newStatus = isDone ? 'todo' : 'done'
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    }).eq('id', task.id)

    if (newStatus === 'done') {
      await supabase.from('activity_log').insert({
        user_id: userId, task_id: task.id,
        action: 'completed', task_title: task.title,
      })
    }
  }

  async function handleDelete() {
    if (!confirm(`ลบ "${task.title}"?`)) return
    setDeleting(true)
    await supabase.from('activity_log').insert({
      user_id: userId, task_id: task.id,
      action: 'deleted', task_title: task.title,
    })
    await supabase.from('tasks').delete().eq('id', task.id)
  }

  return (
    <div className="task-card fade-in" style={{ opacity: isDone ? 0.65 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        {/* Checkbox */}
        <div
          className={`task-check${isDone ? ' checked' : ''}`}
          style={{ marginTop: '2px' }}
          onClick={toggleDone}
        />

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--fs)', fontWeight: 500, marginBottom: '3px',
            wordBreak: 'break-word',
            textDecoration: isDone ? 'line-through' : 'none',
            color: isDone ? 'var(--text3)' : 'var(--text)',
          }}>{task.title}</div>

          {task.note && !compact && (
            <div style={{
              fontSize: 'var(--fs-sm)', color: 'var(--text2)', marginBottom: '7px',
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{task.note}</div>
          )}

          {/* Meta badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            {/* Priority */}
            <span className="badge" style={{ background: prio.bg, color: prio.color }}>{prio.label}</span>

            {/* Category */}
            {task.category && (
              <span className="badge" style={{
                background: task.category.bg_color,
                color: task.category.color,
              }}>{task.category.name}</span>
            )}

            {/* Deadline */}
            {deadlineLabel && (
              <span style={{
                fontSize: '11px', fontFamily: 'var(--mono)',
                color: deadlineStatus === 'overdue' ? 'var(--red)' : deadlineStatus === 'today' || deadlineStatus === 'soon' ? 'var(--orange)' : 'var(--text3)',
                fontWeight: (deadlineStatus === 'overdue' || deadlineStatus === 'soon') ? 500 : 400,
                display: 'flex', alignItems: 'center', gap: '3px',
              }}>
                📅 {deadlineLabel}
              </span>
            )}

            {/* Recurring */}
            {task.recurring && (
              <span className="badge badge-recur">🔄 {RECURRING_LABEL[task.recurring]}</span>
            )}

            {/* Timer */}
            {timerDisplay > 0 && (
              <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                ⏱ {formatTime(timerDisplay)}
              </span>
            )}
          </div>

          {/* Subtask progress */}
          {subtaskProgress.total > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                  Sub-tasks {subtaskProgress.done}/{subtaskProgress.total}
                </span>
                <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
                  {subtaskProgress.pct}%
                </span>
              </div>
              <div style={{ height: '3px', background: 'var(--surface2)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  background: subtaskProgress.pct === 100 ? 'var(--green)' : 'var(--accent)',
                  width: `${subtaskProgress.pct}%`,
                  transition: 'width .5s ease',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', flexShrink: 0 }}>
          <button className="icon-btn" onClick={() => openTaskModal(task.id)} title="แก้ไข">✏️</button>
          <button className="icon-btn" onClick={handleDelete} disabled={deleting} title="ลบ" style={{ color: 'var(--red)' }}>🗑</button>
        </div>
      </div>
    </div>
  )
}
