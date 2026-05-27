'use client'
import { useUIStore } from '@/store/uiStore'
import { useDemoTaskStore } from '@/store/demoTaskStore'
import { useDemoActions } from '@/hooks/useDemoActions'
import { formatDeadline, getSubtaskProgress } from '@/lib/utils'
import type { Task } from '@/types'

const COLUMNS = [
  { status: 'todo',        label: 'รอดำเนินการ', color: 'var(--text3)', icon: '○' },
  { status: 'in_progress', label: 'กำลังทำ',     color: 'var(--blue)',  icon: '◐' },
  { status: 'done',        label: 'เสร็จแล้ว',   color: 'var(--green)', icon: '●' },
] as const

export function DemoKanbanView({ tasks }: { tasks: Task[] }) {
  const { openTaskModal } = useUIStore()
  const actions = useDemoActions()
  const { upsertTask } = useDemoTaskStore()

  function moveTask(task: Task, status: string) {
    upsertTask({ ...task, status: status as Task['status'], updated_at: new Date().toISOString() })
  }

  return (
    <div className="kanban-board fade-in">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status)
        return (
          <div key={col.status} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '12px', minHeight: '120px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: col.color }}>{col.icon}</span>
                {col.label}
              </span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1px 7px', color: 'var(--text3)' }}>{colTasks.length}</span>
            </div>

            {colTasks.map(task => (
              <DemoKanbanCard
                key={task.id} task={task}
                onEdit={() => openTaskModal(task.id)}
                onMove={(id, status) => moveTask(task, status)}
                isFirst={col.status === 'todo'}
                isLast={col.status === 'done'}
                actions={actions}
              />
            ))}

            {col.status === 'todo' && (
              <button onClick={() => openTaskModal()}
                style={{ border: '1px dashed var(--border)', borderRadius: 'var(--r)', padding: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--text3)', cursor: 'pointer', background: 'transparent', width: '100%', fontFamily: 'var(--font)', marginTop: '6px', transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}
              >+ เพิ่มงาน</button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DemoKanbanCard({ task, onEdit, onMove, isFirst, isLast, actions }: {
  task: Task; onEdit: () => void; onMove: (id: string, status: string) => void
  isFirst: boolean; isLast: boolean; actions: ReturnType<typeof useDemoActions>
}) {
  const { label: deadlineLabel, status: deadlineStatus } = formatDeadline(task.deadline)
  const subtasks = task.subtasks || []
  const subtaskProgress = getSubtaskProgress(subtasks)
  const PRIO: Record<string, { bg: string; color: string; label: string }> = {
    high:   { bg: 'var(--purple-bg)', color: 'var(--purple)', label: 'สำคัญ' },
    medium: { bg: 'var(--blue-bg)',   color: 'var(--blue)',   label: 'ปานกลาง' },
    low:    { bg: 'var(--surface2)',  color: 'var(--text3)',  label: 'ต่ำ' },
  }
  const prio = PRIO[task.is_important] ?? PRIO.medium

  function moveLeft() {
    const map: Record<string, string> = { in_progress: 'todo', done: 'in_progress' }
    const next = map[task.status]
    if (next) onMove(task.id, next)
  }
  function moveRight() {
    const map: Record<string, string> = { todo: 'in_progress', in_progress: 'done' }
    const next = map[task.status]
    if (next) onMove(task.id, next)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 11px', marginBottom: '7px', cursor: 'pointer', transition: 'border-color 0.15s', opacity: task.status === 'done' ? 0.65 : 1 }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
      onClick={onEdit}
    >
      <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '5px', lineHeight: 1.4, wordBreak: 'break-word', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: subtasks.length > 0 ? '8px' : '7px' }}>
        <span className="badge" style={{ background: prio.bg, color: prio.color }}>{prio.label}</span>
        {task.category && <span className="badge" style={{ background: task.category.bg_color, color: task.category.color }}>{task.category.name}</span>}
        {deadlineLabel && <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: deadlineStatus === 'overdue' ? 'var(--red)' : 'var(--text3)' }}>📅 {deadlineLabel}</span>}
      </div>

      {subtasks.length > 0 && (
        <div style={{ marginBottom: '8px' }} onClick={e => e.stopPropagation()}>
          <div style={{ height: '2px', background: 'var(--surface2)', borderRadius: '2px', overflow: 'hidden', marginBottom: '5px' }}>
            <div style={{ height: '100%', borderRadius: '2px', background: subtaskProgress.pct === 100 ? 'var(--green)' : 'var(--accent)', width: `${subtaskProgress.pct}%`, transition: 'width .3s ease' }} />
          </div>
          {subtasks.map(st => (
            <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', cursor: 'pointer' }}
              onClick={() => actions.updateSubtaskDone(task, st.id, !st.done)}
            >
              <div className={`task-check${st.done ? ' checked' : ''}`} style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0, marginTop: 0 }} />
              <span style={{ fontSize: '11px', color: st.done ? 'var(--text3)' : 'var(--text2)', textDecoration: st.done ? 'line-through' : 'none' }}>{st.title}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderTop: '1px solid var(--border)', paddingTop: '7px' }} onClick={e => e.stopPropagation()}>
        <button onClick={moveLeft} disabled={isFirst} style={{ width: '24px', height: '24px', border: 'none', background: 'transparent', cursor: isFirst ? 'not-allowed' : 'pointer', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isFirst ? 'var(--surface2)' : 'var(--text3)', fontSize: '12px' }}>◀</button>
        <div style={{ flex: 1 }} />
        <button onClick={onEdit} style={{ width: '24px', height: '24px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '12px' }}>✏️</button>
        <button onClick={moveRight} disabled={isLast} style={{ width: '24px', height: '24px', border: 'none', background: 'transparent', cursor: isLast ? 'not-allowed' : 'pointer', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isLast ? 'var(--surface2)' : 'var(--text3)', fontSize: '12px' }}>▶</button>
      </div>
    </div>
  )
}
