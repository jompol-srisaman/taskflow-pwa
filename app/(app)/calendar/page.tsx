'use client'
import { useState, useMemo } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useUIStore } from '@/store/uiStore'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO, addMonths, subMonths } from 'date-fns'
import { th } from 'date-fns/locale'
import type { Task } from '@/types'

const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export default function CalendarPage() {
  const { tasks } = useTaskStore()
  const { openTaskModal } = useUIStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const activeTasks = tasks.filter(t => t.status !== 'done' && t.deadline)

  // Build calendar days
  const calDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end   = endOfMonth(currentMonth)
    const days  = eachDayOfInterval({ start, end })
    const startDow = start.getDay() // 0=Sun
    const prefix: (Date | null)[] = Array(startDow).fill(null)
    return [...prefix, ...days]
  }, [currentMonth])

  // Tasks by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    activeTasks.forEach(t => {
      if (t.deadline) {
        const k = t.deadline
        if (!map.has(k)) map.set(k, [])
        map.get(k)!.push(t)
      }
    })
    return map
  }, [activeTasks])

  const selectedDayTasks = selectedDay
    ? (tasksByDate.get(format(selectedDay, 'yyyy-MM-dd')) || [])
    : []

  const PRIO_COLOR = { high: 'var(--red)', medium: 'var(--orange)', low: 'var(--blue)' }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.4px' }}>ปฏิทิน</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{activeTasks.length} งานที่มี deadline</div>
        </div>
        <button className="btn-primary desktop-only" onClick={() => openTaskModal()}>+ เพิ่มงาน</button>
      </div>

      {/* Calendar nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <button className="btn-ghost" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>← ก่อนหน้า</button>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>
          {format(currentMonth, 'MMMM yyyy', { locale: th })}
        </div>
        <button className="btn-ghost" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>ถัดไป →</button>
      </div>

      {/* Calendar grid */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '16px', marginBottom: '16px' }}>
        <div className="cal-grid" style={{ marginBottom: '8px' }}>
          {DAY_LABELS.map(d => (
            <div key={d} className="cal-hd">{d}</div>
          ))}
        </div>
        <div className="cal-grid">
          {calDays.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const key = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDate.get(key) || []
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            const todayDay = isToday(day)
            const inMonth = isSameMonth(day, currentMonth)

            return (
              <div
                key={key}
                className={`cal-day${todayDay ? ' today' : ''}${!inMonth ? ' other-month' : ''}`}
                style={isSelected ? { borderColor: 'var(--accent)', background: 'var(--surface2)' } : {}}
                onClick={() => setSelectedDay(isSelected ? null : day)}
              >
                <div className="cal-day-num">{format(day, 'd')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {dayTasks.slice(0, 4).map(t => (
                    <div key={t.id} className="cal-dot" style={{ background: PRIO_COLOR[t.priority] }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day tasks */}
      {selectedDay && (
        <div>
          <div className="section-header">
            <div className="section-dot" style={{ background: 'var(--accent)' }} />
            <span className="section-title">
              งานวันที่ {format(selectedDay, 'd MMMM yyyy', { locale: th })}
            </span>
            <span className="section-count">{selectedDayTasks.length}</span>
          </div>

          {selectedDayTasks.length === 0 ? (
            <div className="empty" style={{ padding: '24px 20px' }}>
              <div className="empty-icon">📭</div>
              <div className="empty-title">ไม่มีงานวันนี้</div>
            </div>
          ) : (
            selectedDayTasks.map(task => {
              const prio = { high: { bg: 'var(--red-bg)', color: 'var(--red)', label: 'สูง' }, medium: { bg: 'var(--orange-bg)', color: 'var(--orange)', label: 'กลาง' }, low: { bg: 'var(--blue-bg)', color: 'var(--blue)', label: 'ต่ำ' } }[task.priority]
              return (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 'var(--r2)', marginBottom: '6px',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{task.title}</div>
                    <div style={{ display: 'flex', gap: '5px', marginTop: '3px' }}>
                      <span className="badge" style={{ background: prio.bg, color: prio.color }}>{prio.label}</span>
                      {task.category && <span className="badge" style={{ background: task.category.bg_color, color: task.category.color }}>{task.category.name}</span>}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
