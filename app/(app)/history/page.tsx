'use client'
import { useState, useMemo } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { formatDateTime, formatDate } from '@/lib/utils'
import { parseISO, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { th } from 'date-fns/locale'
import * as XLSX from 'xlsx'

const ACTION_LABEL = { created: 'สร้าง', completed: 'เสร็จ', updated: 'แก้ไข', deleted: 'ลบ' }
const ACTION_COLOR = { created: 'var(--blue)', completed: 'var(--green)', updated: 'var(--orange)', deleted: 'var(--red)' }
const ACTION_ICON  = { created: '✦', completed: '✓', updated: '✎', deleted: '✕' }

const FIELD_OPTIONS = [
  { key: 'title',       label: 'ชื่องาน',           default: true },
  { key: 'category',    label: 'กลุ่มงาน',          default: true },
  { key: 'priority',    label: 'ความสำคัญ',         default: true },
  { key: 'status',      label: 'สถานะ',             default: true },
  { key: 'deadline',    label: 'Deadline',           default: true },
  { key: 'note',        label: 'โน้ต',              default: false },
  { key: 'time',        label: 'เวลาที่ใช้ (นาที)', default: false },
  { key: 'created_at',  label: 'วันที่สร้าง',       default: true },
  { key: 'completed_at',label: 'วันที่เสร็จ',       default: true },
  { key: 'recurring',   label: 'งานซ้ำ',            default: false },
]

export default function HistoryPage() {
  const { tasks, activityLog, categories } = useTaskStore()
  const [showExport, setShowExport] = useState(false)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(FIELD_OPTIONS.filter(f => f.default).map(f => f.key))
  )
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exportScope, setExportScope] = useState<'all' | 'done' | 'active'>('all')

  const doneTasks = useMemo(() =>
    tasks.filter(t => t.status === 'done' && t.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
  , [tasks])

  const totalTime = useMemo(() => tasks.reduce((sum, t) => sum + (t.total_time_seconds || 0), 0), [tasks])

  const byMonth = useMemo(() => {
    const map = new Map<string, typeof doneTasks>()
    doneTasks.forEach(t => {
      const k = format(parseISO(t.completed_at!), 'yyyy-MM')
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(t)
    })
    return map
  }, [doneTasks])

  function toggleField(key: string) {
    setSelectedFields(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function doExport() {
    let exportTasks = [...tasks]

    // Filter by scope
    if (exportScope === 'done') exportTasks = exportTasks.filter(t => t.status === 'done')
    else if (exportScope === 'active') exportTasks = exportTasks.filter(t => t.status !== 'done')

    // Filter by date range (using created_at)
    if (dateFrom || dateTo) {
      const from = dateFrom ? startOfDay(parseISO(dateFrom)) : new Date(0)
      const to   = dateTo   ? endOfDay(parseISO(dateTo))     : new Date(9999999999999)
      exportTasks = exportTasks.filter(t => {
        const d = parseISO(t.created_at)
        return isWithinInterval(d, { start: from, end: to })
      })
    }

    // Build rows with selected fields
    const rows = exportTasks.map(t => {
      const row: Record<string, string | number> = {}
      if (selectedFields.has('title'))        row['ชื่องาน'] = t.title
      if (selectedFields.has('category'))     row['กลุ่ม'] = categories.find(c => c.id === t.category_id)?.name || ''
      if (selectedFields.has('priority')) {
        row['ด่วน'] = t.is_urgent ? 'ใช่' : 'ไม่'
        row['สำคัญ'] = t.is_important ? 'ใช่' : 'ไม่'
      }
      if (selectedFields.has('status'))       row['สถานะ'] = t.status === 'done' ? 'เสร็จแล้ว' : t.status === 'in_progress' ? 'กำลังทำ' : 'รอทำ'
      if (selectedFields.has('deadline'))     row['Deadline'] = t.deadline || ''
      if (selectedFields.has('note'))         row['โน้ต'] = t.note || ''
      if (selectedFields.has('time'))         row['เวลา (นาที)'] = Math.floor((t.total_time_seconds || 0) / 60)
      if (selectedFields.has('created_at'))   row['วันที่สร้าง'] = formatDate(t.created_at)
      if (selectedFields.has('completed_at')) row['วันที่เสร็จ'] = t.completed_at ? formatDate(t.completed_at) : ''
      if (selectedFields.has('recurring'))    row['งานซ้ำ'] = t.recurring || ''
      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks')
    XLSX.writeFile(wb, `KhunMeenFlow_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`)
    setShowExport(false)
  }

  const h = Math.floor(totalTime / 3600)
  const m = Math.floor((totalTime % 3600) / 60)

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.4px' }}>ประวัติ & รายงาน</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>เสร็จแล้ว {doneTasks.length} งาน</div>
        </div>
        <button className="btn-ghost" onClick={() => setShowExport(true)}>📊 Export Excel</button>
      </div>

      {/* Export Dialog */}
      {showExport && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }} onClick={e => { if (e.target === e.currentTarget) setShowExport(false) }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--r3)',
            padding: '24px', width: '100%', maxWidth: '480px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '18px' }}>📊 Export ข้อมูลงาน</div>

            {/* Scope */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: '8px' }}>งานที่ต้องการ Export</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {([['all', 'ทั้งหมด'], ['done', 'เสร็จแล้วเท่านั้น'], ['active', 'ยังไม่เสร็จ']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setExportScope(val)} style={{
                    padding: '5px 12px', border: `1px solid ${exportScope === val ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                    background: exportScope === val ? 'var(--accent)' : 'transparent',
                    color: exportScope === val ? 'var(--surface)' : 'var(--text2)',
                    fontFamily: 'var(--font)',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: '8px' }}>ช่วงวันที่สร้าง (ไม่บังคับ)</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ flex: 1, minWidth: '130px', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font)', fontSize: '13px', color: 'var(--text)', background: 'var(--surface)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>ถึง</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ flex: 1, minWidth: '130px', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font)', fontSize: '13px', color: 'var(--text)', background: 'var(--surface)' }} />
              </div>
            </div>

            {/* Fields */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.3px' }}>คอลัมน์ที่ต้องการ</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setSelectedFields(new Set(FIELD_OPTIONS.map(f => f.key)))} style={{ fontSize: '11px', color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer' }}>เลือกทั้งหมด</button>
                  <button onClick={() => setSelectedFields(new Set())} style={{ fontSize: '11px', color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>ล้าง</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {FIELD_OPTIONS.map(f => (
                  <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 8px', borderRadius: 'var(--r)', border: `1px solid ${selectedFields.has(f.key) ? 'var(--accent)' : 'var(--border)'}`, background: selectedFields.has(f.key) ? 'rgba(var(--accent-rgb),.07)' : 'transparent', transition: 'all 0.12s' }}>
                    <input type="checkbox" checked={selectedFields.has(f.key)} onChange={() => toggleField(f.key)} style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowExport(false)}>ยกเลิก</button>
              <button className="btn-primary" onClick={doExport} disabled={selectedFields.size === 0}>
                📥 Export {selectedFields.size > 0 ? `(${selectedFields.size} คอลัมน์)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="stats-row" style={{ marginBottom: '24px' }}>
        {[
          { num: tasks.length,                              label: 'งานทั้งหมด' },
          { num: doneTasks.length,                         label: 'เสร็จแล้ว' },
          { num: tasks.filter(t => t.status !== 'done').length, label: 'ยังไม่เสร็จ' },
          { num: h > 0 ? `${h}h ${m}m` : `${m}m`,         label: 'เวลาที่ใช้ไป' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '14px 16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'var(--mono)', letterSpacing: '-1px', lineHeight: 1, marginBottom: '4px' }}>{s.num}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="chart-row">
        <div className="chart-box">
          <div className="chart-title">กิจกรรมล่าสุด</div>
          {activityLog.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: '13px' }}>ยังไม่มีกิจกรรม</div>
          ) : (
            activityLog.slice(0, 10).map(log => (
              <div key={log.id} style={{ display: 'flex', gap: '10px', padding: '6px 4px', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  background: ACTION_COLOR[log.action as keyof typeof ACTION_COLOR] || 'var(--text3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', color: 'white', fontWeight: 'bold', marginTop: '1px',
                }}>{ACTION_ICON[log.action as keyof typeof ACTION_ICON]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ACTION_LABEL[log.action as keyof typeof ACTION_LABEL]} — {log.task_title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: '1px' }}>
                    {formatDateTime(log.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="chart-box">
          <div className="chart-title">สรุปตามกลุ่ม</div>
          {categories.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: '13px' }}>ยังไม่มีกลุ่มงาน</div>
          ) : (
            categories.map(c => {
              const catTasks = tasks.filter(t => t.category_id === c.id)
              const catDone  = catTasks.filter(t => t.status === 'done').length
              const pct = catTasks.length ? Math.round((catDone / catTasks.length) * 100) : 0
              return (
                <div key={c.id} className="bar-row" style={{ marginBottom: '6px' }}>
                  <span className="bar-name" style={{ color: c.color }}>{c.name}</span>
                  <div style={{ flex: 1 }}>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ background: c.color, width: `${pct}%` }}>
                        <span className="bar-val">{pct}%</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: '2px' }}>{catDone}/{catTasks.length} งาน</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Done tasks by month */}
      <div>
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div className="section-dot" style={{ background: 'var(--green)' }} />
          <span className="section-title">งานที่เสร็จแล้ว</span>
          <span className="section-count">{doneTasks.length}</span>
        </div>

        {doneTasks.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">ยังไม่มีงานที่เสร็จแล้ว</div>
          </div>
        ) : (
          Array.from(byMonth.entries()).map(([monthKey, monthTasks]) => {
            const monthDate = parseISO(`${monthKey}-01`)
            return (
              <div key={monthKey} style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                  {format(monthDate, 'MMMM yyyy', { locale: th })} · {monthTasks.length} งาน
                </div>
                {monthTasks.map(t => {
                  const cat = categories.find(c => c.id === t.category_id)
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'line-through', color: 'var(--text2)' }}>{t.title}</span>
                      {cat && <span className="badge" style={{ background: cat.bg_color, color: cat.color }}>{cat.name}</span>}
                      {t.completed_at && <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>{formatDate(t.completed_at)}</span>}
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
