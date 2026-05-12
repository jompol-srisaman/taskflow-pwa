'use client'
import { useState, useEffect, useRef } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'
import { createClient } from '@/lib/supabase/client'
import { PRIORITY_LABEL, RECURRING_LABEL, generateId } from '@/lib/utils'
import type { Task, Subtask, Priority, RecurringType } from '@/types'

interface TaskModalProps {
  userId: string
}

export function TaskModal({ userId }: TaskModalProps) {
  const { taskModalOpen, editingTaskId, closeTaskModal } = useUIStore()
  const { tasks, categories } = useTaskStore()
  const supabase = createClient()

  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null

  const [title, setTitle]       = useState('')
  const [note, setNote]         = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [deadline, setDeadline] = useState('')
  const [recurring, setRecurring] = useState<RecurringType>('')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [saving, setSaving]     = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (taskModalOpen) {
      if (editingTask) {
        setTitle(editingTask.title)
        setNote(editingTask.note || '')
        setCategoryId(editingTask.category_id || '')
        setPriority(editingTask.priority)
        setDeadline(editingTask.deadline || '')
        setRecurring(editingTask.recurring)
        setSubtasks(editingTask.subtasks || [])
      } else {
        setTitle('')
        setNote('')
        setCategoryId(categories[0]?.id || '')
        setPriority('medium')
        setDeadline('')
        setRecurring('')
        setSubtasks([])
      }
      setNewSubtask('')
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [taskModalOpen, editingTaskId])

  function addSubtask() {
    const t = newSubtask.trim()
    if (!t) return
    setSubtasks(prev => [...prev, {
      id: generateId(), task_id: editingTaskId || '',
      title: t, done: false,
      sort_order: prev.length, created_at: new Date().toISOString(),
    }])
    setNewSubtask('')
  }

  function removeSubtask(id: string) {
    setSubtasks(prev => prev.filter(s => s.id !== id))
  }

  function toggleSubtask(id: string) {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, done: !s.done } : s))
  }

  async function handleSave() {
    if (!title.trim()) { titleRef.current?.focus(); return }
    setSaving(true)

    try {
      const taskData = {
        title: title.trim(),
        note: note.trim(),
        category_id: categoryId || null,
        priority,
        deadline: deadline || null,
        recurring,
        user_id: userId,
      }

      let taskId = editingTaskId

      if (editingTask) {
        await supabase.from('tasks').update(taskData).eq('id', editingTask.id)
        taskId = editingTask.id
        await supabase.from('activity_log').insert({
          user_id: userId, task_id: taskId,
          action: 'updated', task_title: taskData.title,
        })
      } else {
        const { data } = await supabase.from('tasks').insert(taskData).select().single()
        taskId = data?.id
        await supabase.from('activity_log').insert({
          user_id: userId, task_id: taskId,
          action: 'created', task_title: taskData.title,
        })
      }

      // Sync subtasks
      if (taskId) {
        await supabase.from('subtasks').delete().eq('task_id', taskId)
        if (subtasks.length > 0) {
          await supabase.from('subtasks').insert(
            subtasks.map((s, i) => ({ title: s.title, done: s.done, task_id: taskId!, sort_order: i }))
          )
        }
      }

      closeTaskModal()
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave()
    if (e.key === 'Escape') closeTaskModal()
  }

  const doneSt = subtasks.filter(s => s.done).length

  return (
    <div className={`overlay${taskModalOpen ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeTaskModal() }}>
      <div className="modal modal-lg" onKeyDown={handleKeyDown}>
        <div className="modal-drag" />
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          {editingTask ? 'แก้ไขงาน' : 'เพิ่มงานใหม่'}
        </div>

        {/* Title */}
        <div className="field">
          <label>ชื่องาน *</label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="เช่น ส่งรายงานประจำเดือน"
          />
        </div>

        {/* Note */}
        <div className="field">
          <label>โน้ต / รายละเอียด</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="บันทึกรายละเอียด..."
          />
        </div>

        {/* Category + Priority */}
        <div className="field-row">
          <div className="field">
            <label>กลุ่มงาน</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">-- ไม่ระบุ --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>ความสำคัญ</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Deadline + Recurring */}
        <div className="field-row">
          <div className="field">
            <label>Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="field">
            <label>งานซ้ำ (Recurring)</label>
            <select value={recurring} onChange={e => setRecurring(e.target.value as RecurringType)}>
              {Object.entries(RECURRING_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Subtasks */}
        <div className="field">
          <label>
            Sub-tasks
            {subtasks.length > 0 && (
              <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: '6px' }}>
                {doneSt}/{subtasks.length}
              </span>
            )}
          </label>

          {subtasks.length > 0 && (
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {subtasks.map(st => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <div
                    className={`task-check${st.done ? ' checked' : ''}`}
                    style={{ width: '16px', height: '16px', borderRadius: '3px', marginTop: 0 }}
                    onClick={() => toggleSubtask(st.id)}
                  />
                  <span style={{
                    fontSize: '13px', flex: 1, color: st.done ? 'var(--text3)' : 'var(--text2)',
                    textDecoration: st.done ? 'line-through' : 'none',
                  }}>{st.title}</span>
                  <button
                    onClick={() => removeSubtask(st.id)}
                    style={{ color: 'var(--text3)', cursor: 'pointer', fontSize: '14px', background: 'none', border: 'none', padding: '0 3px', lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font)', fontSize: '13px', background: 'var(--surface)', color: 'var(--text)' }}
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              placeholder="พิมพ์แล้วกด Enter..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
            />
            <button className="btn-ghost" style={{ padding: '7px 12px', fontSize: '12px' }} onClick={addSubtask}>+</button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-ghost" onClick={closeTaskModal}>ยกเลิก</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}
