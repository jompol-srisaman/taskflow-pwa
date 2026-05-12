'use client'
import { useState, useMemo, useEffect } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useUIStore } from '@/store/uiStore'
import { gcalFetch, gcalIsConnected, type GCalEvent } from '@/lib/googleCalendar'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO, addMonths, subMonths, isAfter, startOfDay } from 'date-fns'
import { th } from 'date-fns/locale'
import type { Task } from '@/types'

const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const PRIO_COLOR = { high: 'var(--red)', medium: 'var(--orange)', low: 'var(--blue)' }

export default function CalendarPage() {
  const { tasks } = useTaskStore()
  const { openTaskModal } = useUIStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([])
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null) // null = loading
  const [showGcal, setShowGcal] = useState(true)

  // All tasks with deadlines (active + done)
  const tasksWithDeadline = tasks.filter(t => t.deadline)

  // Fetch Google Calendar events when month changes
  useEffect(() => {
    async function loadGcal() {
      setGcalConnected(null)
      const connected = await gcalIsConnected()
      setGcalConnected(connected)
      if (!connected) { setGcalEvents([]); return }

      const start = startOfMonth(currentMonth)
      const end   = endOfMonth(currentMonth)
      // Extend by a day on each side for timezone safety
      start.setDate(start.getDate() - 1)
      end.setDate(end.getDate() + 1)
      const events = await gcalFetch(start.toISOString(), end.toISOString())
      setGcalEvents(events)
    }
    loadGcal()
  }, [currentMonth])

  // Build calendar
  const calDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end   = endOfMonth(currentMonth)
    const days  = eachDayOfInterval({ start, end })
    const prefix: (Date | null)[] = Array(start.getDay()).fill(null)
    return [...prefix, ...days]
  }, [currentMonth])

  // Map: "yyyy-MM-dd" → tasks[]
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    tasksWithDeadline.forEach(t => {
      const k = t.deadline!.substring(0, 10)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(t)
    })
    return map
  }, [tasksWithDeadline])

  // Map: "yyyy-MM-dd" → gcal events[] (all-day and timed)
  const gcalByDate = useMemo(() => {
    const map = new Map<string, GCalEvent[]>()
    if (!showGcal) return map
    gcalEvents.forEach(ev => {
      const date = ev.start.date ?? ev.start.dateTime?.substring(0, 10)
      if (!date) return
      if (!map.has(date)) map.set(date, [])
      map.get(date)!.push(ev)
    })
    return map
  }, [gcalEvents, showGcal])

  const selectedDayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null
  const selectedDayTasks = selectedDayKey ? (tasksByDate.get(selectedDayKey) || []) : []
  const selectedDayGcal = selectedDayKey ? (gcalByDate.get(selectedDayKey) || []) : []

  // Upcoming tasks (next deadlines, active only)
  const upcomingTasks = useMemo(() => {
    const today = startOfDay(new Date())
    return tasks
      .filter(t => t.status !== 'done' && t.deadline)
      .filter(t => {
        const d = startOfDay(parseISO(t.deadline!.substring(0, 10)))
        return !isAfter(today, d) || isSameDay(d, today)
      })
      .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
      .slice(0, 10)
  }, [tasks])

  // Tasks without deadline
  const noDeadlineTasks = useMemo(() =>
    tasks.filter(t => !t.deadline && t.status !== 'done').slice(0, 5)
  , [tasks])

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.4px' }}>ปฏิทิน</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
            {tasksWithDeadline.length} งานมี deadline · {tasks.filter(t => t.status !== 'done').length} งานค้างอยู่
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Google Calendar toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', cursor: 'pointer' }}
            onClick={() => setShowGcal(v => !v)}>
            <GoogleIcon />
            <span style={{ fontSize: '11px', color: 'var(--text2)' }}>Google Cal</span>
            <div style={{
              width: '26px', height: '14px', borderRadius: '7px',
              background: showGcal && gcalConnected ? '#4285F4' : 'var(--border)',
              position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: '2px',
                left: showGcal && gcalConnected ? '14px' : '2px',
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'white', transition: 'left 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,.3)',
              }} />
            </div>
          </div>
          <button className="btn-primary desktop-only" onClick={() => openTaskModal()}>+ เพิ่มงาน</button>
        </div>
      </div>

      {/* Google Calendar connection status */}
      {gcalConnected === false && (
        <div style={{
          padding: '10px 14px', marginBottom: '14px',
          background: 'var(--orange-bg)', border: '1px solid var(--orange)',
          borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--orange)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <GoogleIcon />
          <span>Google Calendar ยังไม่ได้เชื่อมต่อ — ออกจากระบบแล้วเข้าใหม่เพื่อให้สิทธิ์ได้เลย</span>
        </div>
      )}
      {gcalConnected === true && showGcal && (
        <div style={{
          padding: '7px 12px', marginBottom: '14px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r)', fontSize: '11px', color: 'var(--text3)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <GoogleIcon />
          <span>เชื่อมต่อ Google Calendar แล้ว · {gcalEvents.length} events เดือนนี้</span>
        </div>
      )}

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <button className="btn-ghost" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>← ก่อนหน้า</button>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>
          {format(currentMonth, 'MMMM yyyy', { locale: th })}
        </div>
        <button className="btn-ghost" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>ถัดไป →</button>
      </div>

      {/* Calendar grid */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '14px', marginBottom: '16px' }}>
        <div className="cal-grid" style={{ marginBottom: '8px' }}>
          {DAY_LABELS.map(d => <div key={d} className="cal-hd">{d}</div>)}
        </div>
        <div className="cal-grid">
          {calDays.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const key = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDate.get(key) || []
            const dayGcal = gcalByDate.get(key) || []
            const activeDayTasks = dayTasks.filter(t => t.status !== 'done')
            const doneDayTasks = dayTasks.filter(t => t.status === 'done')
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            const todayDay = isToday(day)
            const inMonth = isSameMonth(day, currentMonth)

            return (
              <div
                key={key}
                className={`cal-day${todayDay ? ' today' : ''}${!inMonth ? ' other-month' : ''}`}
                style={isSelected ? { borderColor: 'var(--accent)', background: 'rgba(var(--accent-rgb),.07)' } : {}}
                onClick={() => setSelectedDay(isSelected ? null : day)}
              >
                <div className="cal-day-num">{format(day, 'd')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px' }}>
                  {activeDayTasks.slice(0, 3).map(t => (
                    <div key={t.id} className="cal-dot" style={{ background: PRIO_COLOR[t.priority] }} />
                  ))}
                  {doneDayTasks.slice(0, 1).map(t => (
                    <div key={t.id} className="cal-dot" style={{ background: 'var(--green)', opacity: 0.5 }} />
                  ))}
                  {/* Google Calendar events (blue dots) */}
                  {dayGcal.slice(0, 2).map(ev => (
                    <div key={ev.id} className="cal-dot" style={{ background: '#4285F4', opacity: 0.7 }} />
                  ))}
                  {(dayTasks.length + dayGcal.length) > 5 && (
                    <span style={{ fontSize: '9px', color: 'var(--text3)', fontFamily: 'var(--mono)', lineHeight: 1 }}>+{dayTasks.length + dayGcal.length - 5}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--red)', label: 'ด่วน (สูง)' },
          { color: 'var(--orange)', label: 'ปานกลาง' },
          { color: 'var(--blue)', label: 'ต่ำ' },
          { color: 'var(--green)', label: 'เสร็จแล้ว', opacity: 0.5 },
          { color: '#4285F4', label: 'Google Cal', opacity: 0.7 },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, opacity: item.opacity ?? 1 }} />
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div style={{ marginBottom: '20px' }}>
          <div className="section-header">
            <div className="section-dot" style={{ background: 'var(--accent)' }} />
            <span className="section-title">วันที่ {format(selectedDay, 'd MMMM yyyy', { locale: th })}</span>
            <span className="section-count">{selectedDayTasks.length + selectedDayGcal.length}</span>
          </div>
          {selectedDayTasks.length === 0 && selectedDayGcal.length === 0 ? (
            <div className="empty" style={{ padding: '24px 20px' }}>
              <div className="empty-icon">📭</div>
              <div className="empty-title">ไม่มีงาน deadline หรือ events วันนี้</div>
              <button className="btn-primary" style={{ marginTop: '12px' }} onClick={() => openTaskModal()}>+ เพิ่มงาน</button>
            </div>
          ) : (
            <>
              {selectedDayTasks.map(task => (
                <CalendarTaskItem key={task.id} task={task} onEdit={() => openTaskModal(task.id)} />
              ))}
              {selectedDayGcal.map(ev => (
                <GCalEventItem key={ev.id} event={ev} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Two columns: upcoming + no-deadline */}
      <div className="chart-row">
        {/* Upcoming */}
        <div className="chart-box">
          <div className="chart-title">งานที่กำลังจะครบ deadline</div>
          {upcomingTasks.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: '13px', padding: '8px 0' }}>ไม่มีงานที่กำลังจะครบ</div>
          ) : (
            upcomingTasks.map(task => <CalendarTaskItem key={task.id} task={task} onEdit={() => openTaskModal(task.id)} />)
          )}
        </div>

        {/* No deadline */}
        <div className="chart-box">
          <div className="chart-title">งานที่ยังไม่ได้ตั้ง deadline</div>
          {noDeadlineTasks.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: '13px', padding: '8px 0' }}>
              {tasks.filter(t => !t.deadline && t.status !== 'done').length === 0 ? 'ทุกงานมี deadline แล้ว 🎉' : 'ไม่มีงานค้าง'}
            </div>
          ) : (
            <>
              {noDeadlineTasks.map(task => <CalendarTaskItem key={task.id} task={task} onEdit={() => openTaskModal(task.id)} showDeadline={false} />)}
              {tasks.filter(t => !t.deadline && t.status !== 'done').length > 5 && (
                <div style={{ fontSize: '12px', color: 'var(--text3)', padding: '8px 4px', borderTop: '1px solid var(--border)', marginTop: '4px' }}>
                  และอีก {tasks.filter(t => !t.deadline && t.status !== 'done').length - 5} งาน
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CalendarTaskItem({ task, onEdit, showDeadline = true }: { task: Task; onEdit: () => void; showDeadline?: boolean }) {
  const prio = { high: { bg: 'var(--red-bg)', color: 'var(--red)', label: 'สูง' }, medium: { bg: 'var(--orange-bg)', color: 'var(--orange)', label: 'กลาง' }, low: { bg: 'var(--blue-bg)', color: 'var(--blue)', label: 'ต่ำ' } }[task.priority]
  const isDone = task.status === 'done'

  return (
    <div onClick={onEdit} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '9px 10px', background: 'var(--surface2)',
      border: '1px solid var(--border)', borderRadius: 'var(--r)',
      marginBottom: '6px', cursor: 'pointer', transition: 'border-color 0.15s',
      opacity: isDone ? 0.65 : 1,
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
    >
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isDone ? 'var(--green)' : PRIO_COLOR[task.priority], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</div>
        <div style={{ display: 'flex', gap: '5px', marginTop: '2px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="badge" style={{ background: prio.bg, color: prio.color }}>{prio.label}</span>
          {task.category && <span className="badge" style={{ background: task.category.bg_color, color: task.category.color }}>{task.category.name}</span>}
          {showDeadline && task.deadline && (
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
              📅 {format(parseISO(task.deadline.substring(0, 10)), 'd MMM', { locale: th })}
            </span>
          )}
          {isDone && <span style={{ fontSize: '11px', color: 'var(--green)' }}>✓ เสร็จแล้ว</span>}
          {task.google_event_id && <span style={{ fontSize: '10px', color: '#4285F4' }}>G</span>}
        </div>
      </div>
    </div>
  )
}

function GCalEventItem({ event }: { event: GCalEvent }) {
  const date = event.start.date ?? event.start.dateTime?.substring(0, 10)

  return (
    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '9px 10px', background: 'rgba(66,133,244,.06)',
      border: '1px solid rgba(66,133,244,.25)', borderRadius: 'var(--r)',
      marginBottom: '6px', cursor: 'pointer', transition: 'border-color 0.15s',
      textDecoration: 'none', color: 'inherit',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(66,133,244,.5)'}
      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(66,133,244,.25)'}
    >
      <GoogleIcon />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.summary}</div>
        {event.description && (
          <div style={{ fontSize: '11px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{event.description}</div>
        )}
      </div>
      <span style={{ fontSize: '10px', color: '#4285F4', fontFamily: 'var(--mono)', flexShrink: 0 }}>
        {event.start.dateTime ? format(new Date(event.start.dateTime), 'HH:mm') : 'all-day'}
      </span>
    </a>
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
