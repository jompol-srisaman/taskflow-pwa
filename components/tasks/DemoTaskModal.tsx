'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useDemoTaskStore } from '@/store/demoTaskStore'
import { useDemoActions } from '@/hooks/useDemoActions'
import { RECURRING_LABEL, generateId } from '@/lib/utils'
import type { Subtask, RecurringType, ImportanceLevel, Phase } from '@/types'

export function DemoTaskModal() {
  const { taskModalOpen, editingTaskId, closeTaskModal } = useUIStore()
  const { tasks, categories, projects, phases } = useDemoTaskStore()
  const actions = useDemoActions()

  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null

  const [title, setTitle]           = useState('')
  const [note, setNote]             = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [projectId, setProjectId]   = useState('')
  const [phaseId, setPhaseId]       = useState('')
  const [isUrgent, setIsUrgent]     = useState(false)
  const [isImportant, setIsImportant] = useState<ImportanceLevel>('medium')
  const [deadline, setDeadline]     = useState('')
  const [startTime, setStartTime]   = useState('')
  const [endTime, setEndTime]       = useState('')
  const [recurring, setRecurring]   = useState<RecurringType>('')
  const [subtasks, setSubtasks]     = useState<Subtask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [saving, setSaving]         = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const availablePhases: Phase[] = projectId
    ? phases.filter(p => p.project_id === projectId).sort((a, b) => a.sort_order - b.sort_order)
    : []

  useEffect(() => {
    if (taskModalOpen) {
      if (editingTask) {
        setTitle(editingTask.title)
        setNote(editingTask.note || '')
        setCategoryId(editingTask.category_id || '')
        setProjectId(editingTask.project_id || '')
        setPhaseId(editingTask.phase_id || '')
        setIsUrgent(editingTask.is_urgent)
        setIsImportant(editingTask.is_important as ImportanceLevel)
        setDeadline(editingTask.deadline || '')
        setStartTime(editingTask.start_time || '')
        setEndTime(editingTask.end_time || '')
        setRecurring(editingTask.recurring)
        setSubtasks(editingTask.subtasks || [])
      } else {
        setTitle(''); setNote(''); setCategoryId(''); setProjectId(''); setPhaseId('')
        setIsUrgent(false); setIsImportant('medium')
        setDeadline(''); setStartTime(''); setEndTime(''); setRecurring('')
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
      title: t, done: false, sort_order: prev.length, created_at: new Date().toISOString(),
    }])
    setNewSubtask('')
  }

  function handleSave() {
    if (!title.trim()) { titleRef.current?.focus(); return }
    setSaving(true)
    const taskData = {
      title: title.trim(), note: note.trim(),
      category_id: categoryId || null,
      project_id: projectId || null,
      phase_id: phaseId || null,
      is_urgent: isUrgent, is_important: isImportant,
      deadline: deadline || null,
      start_time: startTime || null,
      end_time: endTime || null,
      recurring,
    }
    if (editingTask) {
      actions.updateTask(editingTask, taskData, subtasks)
    } else {
      actions.createTask(taskData, subtasks)
    }
    setSaving(false)
    closeTaskModal()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave()
    if (e.key === 'Escape') closeTaskModal()
  }

  const doneSt = subtasks.filter(s => s.done).length

  return (
    <div className={`overlay${taskModalOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) closeTaskModal() }}>
      <div className="modal modal-lg" onKeyDown={handleKeyDown}>
        <div className="modal-drag" />
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          {editingTask ? 'แก้ไขงาน' : 'เพิ่มงานใหม่'}
          <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text3)', fontWeight: 400 }}>(Demo — ไม่บันทึกจริง)</span>
        </div>

        <div className="field">
          <label>ชื่องาน *</label>
          <input ref={titleRef} type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="เช่น ส่งรายงานประจำเดือน" autoComplete="off" />
        </div>

        <div className="field">
          <label>โน้ต / รายละเอียด</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="บันทึกรายละเอียด..." />
        </div>

        {/* Project + Phase */}
        {projects.length > 0 && (
          <div className="field-row">
            <div className="field">
              <label>Project</label>
              <select value={projectId} onChange={e => { setProjectId(e.target.value); setPhaseId('') }}>
                <option value="">-- ไม่ระบุ --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {availablePhases.length > 0 && (
              <div className="field">
                <label>Phase</label>
                <select value={phaseId} onChange={e => setPhaseId(e.target.value)}>
                  <option value="">-- ไม่ระบุ --</option>
                  {availablePhases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label>กลุ่มงาน</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">-- ไม่ระบุ --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label>ความสำคัญ</label>
            <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
              {([
                { value: 'high',   label: 'สำคัญ',   color: 'var(--purple)', border: 'var(--purple)' },
                { value: 'medium', label: 'ปานกลาง', color: 'var(--blue)',   border: 'var(--blue)' },
                { value: 'low',    label: 'ต่ำ',      color: 'var(--text3)', border: 'var(--border2)' },
              ] as { value: ImportanceLevel; label: string; color: string; border: string }[]).map(opt => (
                <button key={opt.value} type="button" onClick={() => setIsImportant(opt.value)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                    fontFamily: 'var(--font)', transition: 'all 0.12s',
                    border: `1px solid ${isImportant === opt.value ? opt.border : 'var(--border)'}`,
                    background: isImportant === opt.value ? `color-mix(in srgb, ${opt.color} 15%, var(--surface))` : 'transparent',
                    color: isImportant === opt.value ? opt.color : 'var(--text2)',
                    fontWeight: isImportant === opt.value ? 600 : 400,
                  }}>{opt.label}</button>
              ))}
            </div>
            <label style={{ marginTop: '8px' }}>ความด่วน</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              {([
                { value: true,  label: 'ด่วน',    color: 'var(--red)',    border: 'var(--red)' },
                { value: false, label: 'ไม่ด่วน', color: 'var(--text3)', border: 'var(--border2)' },
              ] as { value: boolean; label: string; color: string; border: string }[]).map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => setIsUrgent(opt.value)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                    fontFamily: 'var(--font)', transition: 'all 0.12s',
                    border: `1px solid ${isUrgent === opt.value ? opt.border : 'var(--border)'}`,
                    background: isUrgent === opt.value ? `color-mix(in srgb, ${opt.color} 15%, var(--surface))` : 'transparent',
                    color: isUrgent === opt.value ? opt.color : 'var(--text2)',
                    fontWeight: isUrgent === opt.value ? 600 : 400,
                  }}>{opt.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Deadline</label>
            <input type="date" value={deadline} onChange={e => { setDeadline(e.target.value); if (!e.target.value) { setStartTime(''); setEndTime('') } }} />
          </div>
          <div className="field">
            <label>งานซ้ำ (Recurring)</label>
            <select value={recurring} onChange={e => setRecurring(e.target.value as RecurringType)}>
              {Object.entries(RECURRING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Subtasks */}
        <div className="field">
          <label>Sub-tasks {subtasks.length > 0 && <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: '6px' }}>{doneSt}/{subtasks.length}</span>}</label>
          {subtasks.length > 0 && (
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {subtasks.map(st => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className={`task-check${st.done ? ' checked' : ''}`} style={{ width: '16px', height: '16px', borderRadius: '3px', marginTop: 0 }}
                    onClick={() => setSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, done: !s.done } : s))} />
                  <span style={{ fontSize: '13px', flex: 1, color: st.done ? 'var(--text3)' : 'var(--text2)', textDecoration: st.done ? 'line-through' : 'none' }}>{st.title}</span>
                  <button onClick={() => setSubtasks(prev => prev.filter(s => s.id !== st.id))}
                    style={{ color: 'var(--text3)', cursor: 'pointer', fontSize: '14px', background: 'none', border: 'none', padding: '0 3px', lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font)', fontSize: '13px', background: 'var(--surface)', color: 'var(--text)' }}
              value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
              placeholder="พิมพ์แล้วกด Enter..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
            />
            <button className="btn-ghost" style={{ padding: '7px 12px', fontSize: '12px' }} onClick={addSubtask}>+</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-ghost" onClick={closeTaskModal}>ยกเลิก</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : '💾 บันทึก (Demo)'}
          </button>
        </div>
      </div>
    </div>
  )
}
