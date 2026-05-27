'use client'
import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'
import { createCategory, deleteCategory } from '@/app/actions/categories'
import { checkCalendarConnection } from '@/app/actions/calendar'
import { fetchAllData } from '@/app/actions/tasks'
import type { ThemeType, AccentColor, FontSize } from '@/types'

const ACCENT_OPTIONS: { value: AccentColor; color: string }[] = [
  { value: 'black',  color: '#1A1917' },
  { value: 'blue',   color: '#2471A3' },
  { value: 'green',  color: '#27AE60' },
  { value: 'purple', color: '#7D3C98' },
  { value: 'red',    color: '#C0392B' },
  { value: 'orange', color: '#D35400' },
]

export default function SettingsPage() {
  const { theme, accent, fontSize, name, gcalSync, setTheme, setAccent, setFontSize, setName, setGcalSync } = useUIStore()
  const { categories, setCategories } = useTaskStore()

  const [nameInput, setNameInput]   = useState(name)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6B6760')
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null)
  const [gcalError, setGcalError] = useState<string | null>(null)
  const [gcalTesting, setGcalTesting] = useState(false)

  useEffect(() => { setNameInput(name) }, [name])

  async function testGcalConnection() {
    setGcalTesting(true)
    setGcalError(null)
    const res = await checkCalendarConnection()
    setGcalConnected(res.ok)
    if (!res.ok) setGcalError(res.error || 'Connection failed')
    setGcalTesting(false)
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    await createCategory({
      name: newCatName.trim(),
      color: newCatColor,
      bg_color: `${newCatColor}22`,
      sort_order: categories.length,
    })
    setNewCatName('')
    // Refresh categories
    const { categories: refreshed } = await fetchAllData()
    setCategories(refreshed)
  }

  async function handleDeleteCategory(id: string) {
    const cat = categories.find(c => c.id === id)
    if (!cat || cat.is_preset) return
    if (!confirm(`ลบกลุ่ม "${cat.name}"?`)) return
    await deleteCategory(id)
    const { categories: refreshed } = await fetchAllData()
    setCategories(refreshed)
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.4px' }}>ตั้งค่าระบบ</div>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>ปรับแต่งการใช้งาน</div>
      </div>

      <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column' }}>

        <SettingSection title="โปรไฟล์">
          <SettingRow label="ชื่อผู้ใช้" sub="แสดงใน Sidebar">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font)', fontSize: '13px', color: 'var(--text)', background: 'var(--surface)', width: '160px' }}
              />
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setName(nameInput)}>
                บันทึก
              </button>
            </div>
          </SettingRow>
        </SettingSection>

        <SettingSection title="หน้าตาแอป">
          <SettingRow label="Theme" sub="Light / Dark / Auto">
            <div style={{ display: 'flex', gap: '5px' }}>
              {(['light', 'dark', 'auto'] as ThemeType[]).map(t => (
                <button key={t} onClick={() => setTheme(t)} style={{
                  padding: '5px 11px', border: `1px solid ${theme === t ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                  background: theme === t ? 'var(--accent)' : 'transparent',
                  color: theme === t ? 'var(--surface)' : 'var(--text2)',
                  fontFamily: 'var(--font)', transition: 'all 0.12s',
                }}>
                  {t === 'light' ? '☀ Light' : t === 'dark' ? '🌙 Dark' : '⚙ Auto'}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Accent Color" sub="สีหลักของแอป">
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              {ACCENT_OPTIONS.map(opt => (
                <div key={opt.value} onClick={() => setAccent(opt.value)} style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: opt.color, cursor: 'pointer',
                  border: `3px solid ${accent === opt.value ? 'var(--text)' : 'transparent'}`,
                  transition: 'border-color 0.15s',
                }} />
              ))}
            </div>
          </SettingRow>

          <SettingRow label="ขนาดตัวอักษร" sub="sm / md / lg">
            <div style={{ display: 'flex', gap: '5px' }}>
              {(['sm', 'md', 'lg'] as FontSize[]).map(f => (
                <button key={f} onClick={() => setFontSize(f)} style={{
                  padding: '5px 11px', border: `1px solid ${fontSize === f ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                  background: fontSize === f ? 'var(--accent)' : 'transparent',
                  color: fontSize === f ? 'var(--surface)' : 'var(--text2)',
                  fontFamily: 'var(--font)', transition: 'all 0.12s',
                }}>{f.toUpperCase()}</button>
              ))}
            </div>
          </SettingRow>
        </SettingSection>

        <SettingSection title="กลุ่มงาน">
          {categories.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', flex: 1 }}>{c.name}</span>
              {c.is_preset && <span style={{ fontSize: '11px', color: 'var(--text3)' }}>preset</span>}
              {!c.is_preset && (
                <button onClick={() => handleDeleteCategory(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '14px', padding: '2px 6px' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'}>×</button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
            <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)}
              style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid var(--border)', borderRadius: 'var(--r)', cursor: 'pointer', background: 'var(--surface)' }} />
            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
              placeholder="ชื่อกลุ่มใหม่..."
              style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font)', fontSize: '13px', color: 'var(--text)', background: 'var(--surface)' }}
              onKeyDown={e => { if (e.key === 'Enter') addCategory() }} />
            <button className="btn-primary" style={{ padding: '7px 14px', fontSize: '12px' }} onClick={addCategory}>+ เพิ่ม</button>
          </div>
        </SettingSection>

        <SettingSection title="Google Calendar">
          <SettingRow label="Sync อัตโนมัติ" sub="สร้าง/อัปเดต/ลบ event ใน Google Calendar เมื่อมี deadline">
            <div
              onClick={() => setGcalSync(!gcalSync)}
              style={{
                width: '40px', height: '22px', borderRadius: '11px',
                background: gcalSync ? '#4285F4' : 'var(--border)',
                cursor: 'pointer', transition: 'background 0.2s', position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: '3px',
                left: gcalSync ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: 'white', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,.3)',
              }} />
            </div>
          </SettingRow>
          <SettingRow label="สถานะการเชื่อมต่อ" sub="ตรวจสอบว่า Service Account เข้าถึง Calendar ได้">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {gcalConnected === true && <span style={{ fontSize: '12px', color: 'var(--green)' }}>✓ เชื่อมต่อแล้ว</span>}
                {gcalConnected === false && <span style={{ fontSize: '12px', color: 'var(--red)' }}>✗ ไม่ได้เชื่อมต่อ</span>}
                <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={testGcalConnection} disabled={gcalTesting}>
                  {gcalTesting ? 'กำลังตรวจสอบ...' : 'ทดสอบ'}
                </button>
              </div>
              {gcalError && <div style={{ fontSize: '10px', color: 'var(--red)', maxWidth: '200px', textAlign: 'right' }}>{gcalError}</div>}
            </div>
          </SettingRow>
        </SettingSection>

        <SettingSection title="เกี่ยวกับ">
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
            <div><strong>KhunMeenFlow</strong> v4.1 PWA</div>
            <div style={{ color: 'var(--text3)', fontSize: '12px', marginTop: '4px' }}>
              สร้างด้วย Next.js + Google Sheets API + Vercel<br/>
              Sync ข้ามอุปกรณ์ผ่าน Google Sheets
            </div>
          </div>
        </SettingSection>

      </div>
    </div>
  )
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  )
}

function SettingRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--border)', gap: '16px', flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}
