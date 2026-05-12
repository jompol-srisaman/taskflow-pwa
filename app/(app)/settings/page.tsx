'use client'
import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'
import { createClient } from '@/lib/supabase/client'
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
  const { theme, accent, fontSize, setTheme, setAccent, setFontSize } = useUIStore()
  const { categories } = useTaskStore()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6B6760')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        setName(data.user.user_metadata?.full_name || '')
      }
    })
  }, [])

  async function saveProfile() {
    if (!userId) return
    setSaving(true)
    await supabase.from('profiles').update({ name }).eq('id', userId)
    setSaving(false)
  }

  async function addCategory() {
    if (!newCatName.trim() || !userId) return
    await supabase.from('categories').insert({
      user_id: userId,
      name: newCatName.trim(),
      color: newCatColor,
      bg_color: `${newCatColor}22`,
      is_preset: false,
      sort_order: categories.length,
    })
    setNewCatName('')
  }

  async function deleteCategory(id: string) {
    const cat = categories.find(c => c.id === id)
    if (!cat || cat.is_preset) return
    if (!confirm(`ลบกลุ่ม "${cat.name}"?`)) return
    await supabase.from('categories').delete().eq('id', id)
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.4px' }}>ตั้งค่าระบบ</div>
        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>ปรับแต่งการใช้งาน</div>
      </div>

      <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '0' }}>

        {/* Profile */}
        <SettingSection title="โปรไฟล์">
          <SettingRow label="ชื่อผู้ใช้" sub="แสดงใน Sidebar">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font)', fontSize: '13px', color: 'var(--text)', background: 'var(--surface)', width: '160px' }}
              />
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={saveProfile} disabled={saving}>
                {saving ? '...' : 'บันทึก'}
              </button>
            </div>
          </SettingRow>
        </SettingSection>

        {/* Appearance */}
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
                <div
                  key={opt.value}
                  onClick={() => setAccent(opt.value)}
                  style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: opt.color, cursor: 'pointer',
                    border: `3px solid ${accent === opt.value ? 'var(--text)' : 'transparent'}`,
                    transition: 'border-color 0.15s',
                  }}
                />
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
                }}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </SettingRow>
        </SettingSection>

        {/* Categories */}
        <SettingSection title="กลุ่มงาน">
          {categories.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', flex: 1 }}>{c.name}</span>
              {c.is_preset && <span style={{ fontSize: '11px', color: 'var(--text3)' }}>preset</span>}
              {!c.is_preset && (
                <button
                  onClick={() => deleteCategory(c.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '14px', padding: '2px 6px' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'}
                >×</button>
              )}
            </div>
          ))}

          {/* Add category */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
            <input
              type="color"
              value={newCatColor}
              onChange={e => setNewCatColor(e.target.value)}
              style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid var(--border)', borderRadius: 'var(--r)', cursor: 'pointer', background: 'var(--surface)' }}
            />
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="ชื่อกลุ่มใหม่..."
              style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font)', fontSize: '13px', color: 'var(--text)', background: 'var(--surface)' }}
              onKeyDown={e => { if (e.key === 'Enter') addCategory() }}
            />
            <button className="btn-primary" style={{ padding: '7px 14px', fontSize: '12px' }} onClick={addCategory}>+ เพิ่ม</button>
          </div>
        </SettingSection>

        {/* About */}
        <SettingSection title="เกี่ยวกับ">
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
            <div><strong>TaskFlow</strong> v4.0 PWA</div>
            <div style={{ color: 'var(--text3)', fontSize: '12px', marginTop: '4px' }}>
              สร้างด้วย Next.js + Supabase + Vercel<br/>
              Sync ข้ามอุปกรณ์แบบ Real-time
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
