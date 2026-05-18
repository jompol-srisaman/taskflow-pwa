'use client'
import { useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'
import { toggleTaskDone, deleteTask, updateSubtaskDone } from '@/app/actions/tasks'
import { formatDeadline, formatTime, getSubtaskProgress, RECURRING_LABEL } from '@/lib/utils'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  compact?: boolean
}

const PRIORITY_STYLE = {
  high:   { bg: 'var(--red-bg)',    color: 'var(--red)',    label: 'สูง' },
  medium: { bg: 'var(--orange-bg)', color: 'var(--orange)', label: 'กลาง' },
  low:    { bg: 'var(--blue-bg)',   color: 'var(--blue)',   label: 'ต่ำ' },
}

export function TaskCard({ task, compact = false }: TaskCardProps) {
  const { openTaskModal } = useUIStore()
  const { removeTask, upsertTask, updateSubtasks } = useTaskStore()
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isDone = task.status === 'done'
  const prio = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
  const { label: deadlineLabel, status: deadlineStatus } = formatDeadline(task.deadline)
  const subtaskProgress = getSubtaskProgress(task.subtasks || [])

  const [timerDisplay] = useState(() => {
    if (!task.timer_started_at) return task.total_time_seconds
    return task.total_time_seconds + Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
  })

  async function toggleDone() {
    const updates = await toggleTaskDone(task)
    upsertTask({ ...task, ...updates })
  }

  async function toggleSubtaskDone(subtaskId: string) {
    const subtasks = task.subtasks || []
    const sub = subtasks.find(s => s.id === subtaskId)
    if (!sub) return
    const updated = subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s)
    updateSubtasks(task.id, updated)
    await updateSubtaskDone(subtaskId, !sub.done)
  }

  async function handleDelete() {
    setDeleting(true)
    removeTask(task.id)
    setConfirmDelete(false)
    await deleteTask(task)
    setDeleting(false)
  }

  return (
    <div className="task-card fade-in" style={{ opacity: isDone ? 0.65 : 1, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        {/* Checkbox */}
        <div
          className={`task-check${isDone ? ' checked' : ''}`}
          style={{ marginTop: '2px', flexShrink: 0 }}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: prio.bg, color: prio.color }}>{prio.label}</span>
            {task.category && (
              <span className="badge" style={{ background: task.category.bg_color, color: task.category.color }}>{task.category.name}</span>
            )}
            {deadlineLabel && (
              <span style={{
                fontSize: '11px', fontFamily: 'var(--mono)',
                color: deadlineStatus === 'overdue' ? 'var(--red)' : deadlineStatus === 'today' || deadlineStatus === 'soon' ? 'var(--orange)' : 'var(--text3)',
                fontWeight: (deadlineStatus === 'overdue' || deadlineStatus === 'soon') ? 500 : 400,
              }}>📅 {deadlineLabel}</span>
            )}
            {task.recurring && <span className="badge badge-recur">🔄 {RECURRING_LABEL[task.recurring]}</span>}
            {timerDisplay > 0 && (
              <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text3)' }}>⏱ {formatTime(timerDisplay)}</span>
            )}
            {task.google_event_id && (
              <span title="Synced to Google Calendar" style={{ fontSize: '10px', color: '#4285F4', fontFamily: 'var(--mono)' }}>G</span>
            )}
          </div>

          {task.subtasks && task.subtasks.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              {/* Progress bar */}
              <div style={{ height: '3px', background: 'var(--surface2)', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  background: subtaskProgress.pct === 100 ? 'var(--green)' : 'var(--accent)',
                  width: `${subtaskProgress.pct}%`, transition: 'width .3s ease',
                }} />
              </div>
              {/* Subtask list — tappable directly */}
              {task.subtasks.map(st => (
                <div
                  key={st.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '3px 0', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); toggleSubtaskDone(st.id) }}
                >
                  <div
                    className={`task-check${st.done ? ' checked' : ''}`}
                    style={{ width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0, marginTop: 0 }}
                  />
                  <span style={{
                    fontSize: '12px',
                    color: st.done ? 'var(--text3)' : 'var(--text2)',
                    textDecoration: st.done ? 'line-through' : 'none',
                  }}>{st.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', flexShrink: 0 }}>
          <button className="icon-btn" onClick={() => openTaskModal(task.id)} title="แก้ไข">✏️</button>
          <button
            className="icon-btn"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            title="ลบ"
            style={{ color: 'var(--red)' }}
          >🗑</button>
        </div>
      </div>

      {/* Inline delete confirmation — no window.confirm (blocked in PWA standalone) */}
      {confirmDelete && (
        <div style={{
          marginTop: '10px',
          padding: '10px 12px',
          background: 'var(--red-bg)',
          border: '1px solid var(--red-border)',
          borderRadius: 'var(--r)',
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--red)', flex: 1 }}>ลบ "{task.title}" แน่ใจไหม?</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: '12px', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text2)', fontFamily: 'var(--font)' }}
            >ยกเลิก</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ padding: '4px 10px', border: 'none', borderRadius: 'var(--r)', fontSize: '12px', cursor: 'pointer', background: 'var(--red)', color: 'white', fontFamily: 'var(--font)' }}
            >{deleting ? '...' : 'ลบ'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
