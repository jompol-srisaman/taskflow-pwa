'use client'
import { useMemo } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { formatDateTime, formatDate } from '@/lib/utils'
import { parseISO, format, startOfMonth, endOfMonth } from 'date-fns'
import { th } from 'date-fns/locale'
import * as XLSX from 'xlsx'

const ACTION_LABEL = { created: 'สร้าง', completed: 'เสร็จ', updated: 'แก้ไข', deleted: 'ลบ' }
const ACTION_COLOR = { created: 'var(--blue)', completed: 'var(--green)', updated: 'var(--orange)', deleted: 'var(--red)' }
const ACTION_ICON  = { created: '✦', completed: '✓', updated: '✎', deleted: '✕' }

export default function HistoryPage() {
  const { tasks, activityLog, categories } = useTaskStore()

  const doneTasks = useMemo(() => tasks.filter(t => t.status === 'done' && t.completed_at).sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()), [tasks])

  const totalTime = useMemo(() => tasks.reduce((sum, t) => sum + (t.total_time_seconds || 0), 0), [tasks])

  // Group done tasks by month
  const byMonth = useMemo(() => {
    const map = new Map<string, typeof doneTasks>()
    doneTasks.forEach(t => {
      const k = format(parseISO(t.completed_at!), 'yyyy-MM')
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(t)
    })
    return map
  }, [doneTasks])

  function exportExcel() {
    const rows = tasks.map(t => ({
      'ชื่องาน': t.title,
      'กลุ่ม': categories.find(c => c.id === t.category_id)?.name || '',
      'ความสำคัญ': t.priority === 'high' ? 'สูง' : t.priority === 'medium' ? 'กลาง' : 'ต่ำ',
      'สถานะ': t.status === 'done' ? 'เสร็จแล้ว' : t.status === 'in_progress' ? 'กำลังทำ' : 'รอทำ',
      'Deadline': t.deadline || '',
      'โน้ต': t.note || '',
      'เวลาที่ใช้ (นาที)': Math.floor((t.total_time_seconds || 0) / 60),
      'วันที่สร้าง': formatDate(t.created_at),
      'วันที่เสร็จ': t.completed_at ? formatDate(t.completed_at) : '',
      'งานซ้ำ': t.recurring || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks')
    XLSX.writeFile(wb, `taskflow_export_${format(new Date(), 'yyyyMMdd')}.xlsx`)
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
        <button className="btn-ghost" onClick={exportExcel}>📊 Export Excel</button>
      </div>

      {/* Summary stats */}
      <div className="stats-row" style={{ marginBottom: '24px' }}>
        {[
          { num: tasks.length, label: 'งานทั้งหมด' },
          { num: doneTasks.length, label: 'เสร็จแล้ว' },
          { num: tasks.filter(t => t.status !== 'done').length, label: 'ยังไม่เสร็จ' },
          { num: h > 0 ? `${h}h ${m}m` : `${m}m`, label: 'เวลาที่ใช้ไป' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '14px 16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'var(--mono)', letterSpacing: '-1px', lineHeight: 1, marginBottom: '4px' }}>{s.num}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Activity timeline */}
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
                }}>
                  {ACTION_ICON[log.action as keyof typeof ACTION_ICON]}
                </div>
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

        {/* Category performance */}
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
                    <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: '2px' }}>
                      {catDone}/{catTasks.length} งาน
                    </div>
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
