'use client'
import { useState, useEffect, useRef } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'
import { useAuthStore } from '@/store/authStore'
import type { Task as TaskType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { gcalCreate, gcalUpdate } from '@/lib/googleCalendar'
import { PRIORITY_LABEL, RECURRING_LABEL, generateId } from '@/lib/utils'
import type { Subtask, Priority, RecurringType } from '@/types'

export function TaskModal() {
  const { taskModalOpen, editingTaskId, closeTaskModal } = useUIStore()
  const { tasks, categories, upsertTask } = useTaskStore()
  const { userId, profile } = useAuthStore()
  const supabase = createClient()

  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null

  const [title, setTitle]           = useState('')
  const [note, setNote]             = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority]     = useState<Priority>('medium')
  const [deadline, setDeadline]     = useState('')
  const [recurring, setRecurring]   = useState<RecurringType>('')
  const [subtasks, setSubtasks]     = useState<Subtask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [saving, setSaving]         = useState(false)
  const [syncGcal, setSyncGcal]     = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)

  const gcalEnabled = profile?.settings?.googleCalendarSync ?? false

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
        setSyncGcal(!!editingTask.google_event_id || gcalEnabled)
      } else {
        setTitle('')
        setNote('')
        setCategoryId(categories[0]?.id || '')
        setPriority('medium')
        setDeadline('')
        setRecurring('')
        setSubtasks([])
        setSyncGcal(gcalEnabled)
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

  function removeSubtask(id: string) { setSubtasks(prev => prev.filter(s => s.id !== id)) }
  function toggleSubtask(id: string) { setSubtasks(prev => prev.map(s => s.id === id ? { ...s, done: !s.done } : s)) }

  async function handleSave() {
    if (!title.trim()) { titleRef.current?.focus(); return }
    if (!userId) return
    setSaving(true)
    try {
      const taskData = {
        title: title.trim(), note: note.trim(),
        category_id: categoryId || null,
        priority, deadline: deadline || null,
        recurring, user_id: userId,
      }
      let taskId = editingTaskId

      if (editingTask) {
        let googleEventId = editingTask.google_event_id
        // Sync to Google Calendar if enabled and deadline is set
        if (syncGcal && taskData.deadline) {
          const taskForGcal = { ...editingTask, ...taskData, deadline: taskData.deadline } as TaskType
          if (googleEventId) {
            await gcalUpdate(googleEventId, taskForGcal)
          } else {
            googleEventId = await gcalCreate(taskForGcal)
          }
        }
        const updatePayload = { ...taskData, google_event_id: googleEventId }
        await supabase.from('tasks').update(updatePayload).eq('id', editingTask.id)
        taskId = editingTask.id

        // Optimistic update — UI reflects immediately
        const updatedTask: TaskType = {
          ...editingTask,
          ...updatePayload,
          subtasks,
          category: categories.find(c => c.id === (taskData.category_id ?? '')) ?? editingTask.category,
        }
        upsertTask(updatedTask)

        await supabase.from('activity_log').insert({
          user_id: userId, task_id: taskId,
          action: 'updated', task_title: taskData.title,
        })
      } else {
        const { data } = await supabase.from('tasks').insert(taskData).select('*, category:categories(*), subtasks(*)').single()
        taskId = data?.id
        // Sync to Google Calendar if enabled and deadline is set
        if (syncGcal && taskData.deadline && taskId) {
          const taskForGcal = { ...taskData, id: taskId, subtasks: [] } as unknown as TaskType
          const eventId = await gcalCreate(taskForGcal)
          if (eventId) {
            await supabase.from('tasks').update({ google_event_id: eventId }).eq('id', taskId)
          }
        }
        // Optimistic update — add new task to store immediately
        if (data) upsertTask(data as TaskType)

        await supabase.from('activity_log').insert({
          user_id: userId, task_id: taskId,
          action: 'created', task_title: taskData.title,
        })
      }

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

        <div className="field">
          <label>ชื่องาน *</label>
          <input ref={titleRef} type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="เช่น ส่งรายงานประจำเดือน" />
        </div>

        <div className="field">
          <label>โน้ต / รายละเอียด</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="บันทึกรายละเอียด..." />
        </div>

        <div className="field-row">
          <div className="field">
            <label>กลุ่มงาน</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">-- ไม่ระบุ --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>ความสำคัญ</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="field">
            <label>งานซ้ำ (Recurring)</label>
            <select value={recurring} onChange={e => setRecurring(e.target.value as RecurringType)}>
              {Object.entries(RECURRING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Google Calendar sync toggle */}
        {deadline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 'var(--r)', border: '1px solid var(--border)', marginBottom: '4px' }}>
            <div
              onClick={() => setSyncGcal(v => !v)}
              style={{
                width: '32px', height: '18px', borderRadius: '9px',
                background: syncGcal ? '#4285F4' : 'var(--border)',
                cursor: 'pointer', transition: 'background 0.2s', position: 'relative', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: '2px',
                left: syncGcal ? '16px' : '2px',
                width: '14px', height: '14px', borderRadius: '50%',
                background: 'white', transition: 'left 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,.3)',
              }} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <GoogleIcon />
                Sync กับ Google Calendar
              </span>
            </div>
          </div>
        )}

        {/* Subtasks */}
        <div className="field">
          <label>
            Sub-tasks
            {subtasks.length > 0 && <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: '6px' }}>{doneSt}/{subtasks.length}</span>}
          </label>
          {subtasks.length > 0 && (
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {subtasks.map(st => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className={`task-check${st.done ? ' checked' : ''}`} style={{ width: '16px', height: '16px', borderRadius: '3px', marginTop: 0 }} onClick={() => toggleSubtask(st.id)} />
                  <span style={{ fontSize: '13px', flex: 1, color: st.done ? 'var(--text3)' : 'var(--text2)', textDecoration: st.done ? 'line-through' : 'none' }}>{st.title}</span>
                  <button onClick={() => removeSubtask(st.id)} style={{ color: 'var(--text3)', cursor: 'pointer', fontSize: '14px', background: 'none', border: 'none', padding: '0 3px', lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>×</button>
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

function GoogleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
