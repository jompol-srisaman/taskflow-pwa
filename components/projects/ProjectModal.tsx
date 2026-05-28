'use client'
import { useState, useEffect, useRef } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { createProject, updateProject, deleteProject, createPhase, updatePhase, deletePhase, reorderPhases } from '@/app/actions/projects'
import { generateId } from '@/lib/utils'
import type { Project, Phase, ProjectStatus } from '@/types'

const PROJECT_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#6B7280']
const PHASE_COLORS = ['#6B7280','#3B82F6','#F59E0B','#10B981','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316']

// Standard phase templates (สากล)
const PHASE_TEMPLATES: Record<string, { label: string; phases: string[] }> = {
  software:   { label: '💻 Software Dev',   phases: ['Requirement','Design','Development','Testing','Review','Deploy'] },
  agile:      { label: '🔄 Agile/Scrum',    phases: ['Backlog','Sprint Planning','In Progress','Review','Done'] },
  product:    { label: '🚀 Product',         phases: ['Discovery','Define','Design','Build','Test','Launch'] },
  marketing:  { label: '📣 Marketing',       phases: ['Research','Strategy','Creative','Production','Launch','Measure'] },
  design:     { label: '🎨 UI/UX Design',    phases: ['Brief','Research','Ideate','Prototype','Test','Handoff'] },
  general:    { label: '📋 General',         phases: ['Planning','Execution','Monitoring','Review','Closure'] },
  mobile:     { label: '📱 Mobile App',      phases: ['Concept','UI/UX','Development','Alpha','Beta','App Store'] },
  content:    { label: '✍️ Content',         phases: ['Ideation','Research','Outline','Draft','Edit','Publish'] },
  data:       { label: '📊 Data/Analytics',  phases: ['Define','Collect','Clean','Analyze','Visualize','Report'] },
  sales:      { label: '🤝 Sales/CRM',       phases: ['Prospect','Qualify','Propose','Negotiate','Close','Onboard'] },
  hr:         { label: '🏢 HR/Recruit',      phases: ['Job Post','Screening','Interview','Assessment','Offer','Onboarding'] },
  research:   { label: '🔬 Research',        phases: ['Define Problem','Literature Review','Methodology','Data Collection','Analysis','Report'] },
  video:      { label: '🎬 Video/Film',      phases: ['Pre-production','Scripting','Filming','Editing','Review','Publish'] },
  training:   { label: '🎓 Training',        phases: ['Needs Analysis','Content Design','Development','Pilot','Launch','Evaluate'] },
  devops:     { label: '⚙️ DevOps/Infra',    phases: ['Plan','Provision','Configure','Deploy','Monitor','Optimize'] },
  event:      { label: '🎪 Event Mgmt',      phases: ['Concept','Venue & Budget','Promotion','Preparation','Event Day','Follow-up'] },
}

// Individual phase chips (กดเพิ่มทีละอัน)
const PHASE_CHIPS = [
  'Planning','Requirement','Discovery','Research','Strategy',
  'Design','Wireframe','Prototype','Ideate',
  'Development','In Progress','Build','Coding',
  'Testing','QA','UAT','Debug',
  'Review','Approve','Feedback',
  'Deploy','Launch','Release',
  'Monitoring','Maintenance','Done',
]

interface Props {
  project?: Project | null
  onClose: () => void
  onSaved: () => void
}

export function ProjectModal({ project, onClose, onSaved }: Props) {
  const { upsertProject, removeProject, upsertPhase, removePhase } = useTaskStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [status, setStatus] = useState<ProjectStatus>('active')
  const [phases, setPhases] = useState<{ id: string; name: string; color: string; sort_order: number; isNew?: boolean }[]>([])
  const [newPhaseName, setNewPhaseName] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingPhaseId, setDeletingPhaseId] = useState<string | null>(null)
  const [nameError, setNameError] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
      setColor(project.color)
      setStatus(project.status)
      setPhases((project.phases ?? []).map(p => ({ id: p.id, name: p.name, color: p.color, sort_order: p.sort_order })))
    } else {
      setName('')
      setDescription('')
      setColor('#3B82F6')
      setStatus('active')
      setPhases([])
    }
    setNewPhaseName('')
    setConfirmDelete(false)
    setNameError(false)
    setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 80)
  }, [project])

  function addPhaseByName(name: string) {
    const t = name.trim()
    if (!t) return
    setPhases(prev => {
      if (prev.some(p => p.name.toLowerCase() === t.toLowerCase())) return prev
      return [...prev, {
        id: `new_${generateId()}`,
        name: t,
        color: PHASE_COLORS[prev.length % PHASE_COLORS.length],
        sort_order: prev.length,
        isNew: true,
      }]
    })
  }

  function addPhase() {
    addPhaseByName(newPhaseName)
    setNewPhaseName('')
  }

  function applyTemplate(templateKey: string) {
    const tmpl = PHASE_TEMPLATES[templateKey]
    if (!tmpl) return
    setPhases(tmpl.phases.map((name, i) => ({
      id: `new_${generateId()}`,
      name,
      color: PHASE_COLORS[i % PHASE_COLORS.length],
      sort_order: i,
      isNew: true,
    })))
  }

  function removePhaseLocal(id: string) {
    setPhases(prev => prev.filter(p => p.id !== id))
    setDeletingPhaseId(null)
  }

  async function handleSave() {
    if (!name.trim()) {
      setNameError(true)
      nameRef.current?.focus({ preventScroll: true })
      return
    }
    setNameError(false)
    setSaving(true)
    try {
      if (project) {
        // Update existing project
        await updateProject(project.id, { name: name.trim(), description, color, status })
        upsertProject({ ...project, name: name.trim(), description, color, status })

        // Handle phases: delete removed ones, create new ones, update existing
        const existingPhaseIds = new Set((project.phases ?? []).map(p => p.id))
        const currentPhaseIds = new Set(phases.filter(p => !p.id.startsWith('new_')).map(p => p.id))

        // Delete removed phases
        const deletedIds = [...existingPhaseIds].filter(id => !currentPhaseIds.has(id))
        await Promise.all(deletedIds.map(id => deletePhase(id)))
        deletedIds.forEach(id => removePhase(id))

        // Create new phases
        const newPhases = phases.filter(p => p.id.startsWith('new_'))
        await Promise.all(newPhases.map(async (p, i) => {
          const created = await createPhase({
            project_id: project.id,
            name: p.name,
            color: p.color,
            sort_order: phases.indexOf(p),
          })
          upsertPhase(created)
        }))

        // Update sort orders of existing phases
        const existingToUpdate = phases.filter(p => !p.id.startsWith('new_'))
        if (existingToUpdate.length) {
          await reorderPhases(existingToUpdate.map(p => ({ id: p.id, sort_order: p.sort_order })))
        }

      } else {
        // Create new project with phases
        const created = await createProject({
          name: name.trim(),
          description,
          color,
          phases: phases.map((p, i) => ({ name: p.name, color: p.color, sort_order: i })),
        })
        upsertProject(created)
        created.phases?.forEach(ph => upsertPhase(ph))
      }

      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!project) return
    setSaving(true)
    try {
      await deleteProject(project.id)
      removeProject(project.id)
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      {/* flex column: content scrolls, actions fixed at bottom */}
      <div className="modal modal-lg" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', maxHeight: '72vh' }}>

        {/* Scrollable content — minHeight:0 จำเป็นเพื่อให้ flex child scroll ได้ใน flex container */}
        <div ref={modalRef} style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '22px 18px 8px' }}>
          <div className="modal-drag" />
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          {project ? 'แก้ไข Project' : 'สร้าง Project ใหม่'}
        </div>

        {/* Name */}
        <div className="field">
          <label>ชื่อ Project *</label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); if (e.target.value.trim()) setNameError(false) }}
            placeholder="เช่น Website Revamp"
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
            style={nameError ? { borderColor: 'var(--red)' } : undefined}
          />
          {nameError && <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '4px' }}>กรุณาใส่ชื่อ Project</div>}
        </div>

        {/* Description */}
        <div className="field">
          <label>รายละเอียด</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="อธิบาย project..."
            rows={2}
          />
        </div>

        {/* Color + Status */}
        <div className="field-row">
          <div className="field">
            <label>สี</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: c, border: color === c ? '2px solid var(--text)' : '2px solid transparent',
                    cursor: 'pointer', padding: 0,
                    outline: color === c ? '2px solid var(--surface)' : 'none',
                    outlineOffset: '-3px',
                  }}
                />
              ))}
            </div>
          </div>
          {project && (
            <div className="field">
              <label>สถานะ</label>
              <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
        </div>

        {/* Phases */}
        <div className="field">
          <label>Phases / ขั้นตอน</label>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '10px' }}>
            สถานะของแต่ละ Phase จะอัปเดตอัตโนมัติตาม % tasks ที่ tick ✓ เสร็จใน phase นั้น
          </div>

          {/* Templates */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: '6px' }}>Template สำเร็จรูป</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Object.entries(PHASE_TEMPLATES).map(([key, tmpl]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyTemplate(key)}
                  style={{
                    padding: '5px 11px', border: '1px solid var(--border)',
                    borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                    background: 'var(--surface2)', color: 'var(--text2)',
                    fontFamily: 'var(--font)', transition: 'all .12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  title={tmpl.phases.join(' → ')}
                >{tmpl.label}</button>
              ))}
            </div>
          </div>

          {/* Individual chips */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: '6px' }}>เพิ่มทีละขั้นตอน</div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {PHASE_CHIPS.map(chip => {
                const added = phases.some(p => p.name.toLowerCase() === chip.toLowerCase())
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => addPhaseByName(chip)}
                    disabled={added}
                    style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                      border: `1px solid ${added ? 'var(--green)' : 'var(--border)'}`,
                      background: added ? 'color-mix(in srgb, var(--green) 10%, var(--surface))' : 'transparent',
                      color: added ? 'var(--green)' : 'var(--text3)',
                      cursor: added ? 'default' : 'pointer',
                      fontFamily: 'var(--font)', transition: 'all .12s',
                    }}
                    onMouseEnter={e => { if (!added) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' } }}
                    onMouseLeave={e => { if (!added) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' } }}
                  >{added ? '✓ ' : '+ '}{chip}</button>
                )
              })}
            </div>
          </div>

          {/* Current phases list */}
          {phases.length > 0 && (
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: '4px' }}>ลำดับขั้นตอน ({phases.length})</div>
              {phases.map((ph, i) => (
                <div key={ph.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--r)', background: 'var(--surface)',
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--mono)', minWidth: '16px' }}>{i + 1}.</span>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: ph.color, flexShrink: 0 }} />
                  <input
                    type="text"
                    value={ph.name}
                    onChange={e => setPhases(prev => prev.map(p => p.id === ph.id ? { ...p, name: e.target.value } : p))}
                    style={{
                      flex: 1, border: 'none', background: 'transparent',
                      fontFamily: 'var(--font)', fontSize: '13px', color: 'var(--text)',
                      padding: 0, outline: 'none',
                    }}
                    placeholder="ชื่อ phase..."
                  />
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {PHASE_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setPhases(prev => prev.map(p => p.id === ph.id ? { ...p, color: c } : p))}
                        style={{
                          width: '11px', height: '11px', borderRadius: '50%', background: c,
                          border: ph.color === c ? '2px solid var(--text)' : '1px solid transparent',
                          cursor: 'pointer', padding: 0, flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhaseLocal(ph.id)}
                    style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 3px', lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Custom phase input */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font)', fontSize: '13px', background: 'var(--surface)', color: 'var(--text)' }}
              value={newPhaseName}
              onChange={e => setNewPhaseName(e.target.value)}
              placeholder="หรือพิมพ์ขั้นตอนเอง..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhase() } }}
            />
            <button className="btn-ghost" style={{ padding: '7px 12px', fontSize: '12px' }} onClick={addPhase}>+</button>
          </div>
        </div>

        </div>{/* end scrollable content */}

        {/* Actions — always visible, never scrolls */}
        <div style={{
          flexShrink: 0,
          display: 'flex', gap: '8px', justifyContent: 'space-between',
          padding: '14px 18px',
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div>
            {project && !confirmDelete && (
              <button
                className="btn-ghost"
                style={{ color: 'var(--red)', fontSize: '12px' }}
                onClick={() => setConfirmDelete(true)}
              >ลบ Project</button>
            )}
            {confirmDelete && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--red)' }}>แน่ใจ? tasks ทั้งหมดยังอยู่</span>
                <button onClick={handleDelete} disabled={saving}
                  style={{ padding: '4px 10px', border: 'none', borderRadius: 'var(--r)', fontSize: '12px', cursor: 'pointer', background: 'var(--red)', color: 'white', fontFamily: 'var(--font)' }}>
                  {saving ? '...' : 'ลบ'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: '12px', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text2)', fontFamily: 'var(--font)' }}>
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
