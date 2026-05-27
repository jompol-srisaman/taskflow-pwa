'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTaskStore } from '@/store/taskStore'
import { useUIStore } from '@/store/uiStore'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { useTasks } from '@/hooks/useTasks'
import { addProjectNote, deleteProjectNote, deleteProject, updateProject } from '@/app/actions/projects'
import type { Project, ProjectNote, NoteType } from '@/types'

const STATUS_LABEL = { active: 'Active', on_hold: 'On Hold', archived: 'Archived' }
const STATUS_COLOR: Record<string, string> = {
  active: 'var(--green)',
  on_hold: 'var(--orange)',
  archived: 'var(--text3)',
}
const NOTE_META: Record<NoteType, { icon: string; color: string; label: string }> = {
  blocker:  { icon: '🔴', color: 'var(--red)',    label: 'ติดปัญหา' },
  update:   { icon: '📋', color: 'var(--text2)',  label: 'อัปเดต' },
  resolved: { icon: '✅', color: 'var(--green)',  label: 'แก้ไขแล้ว' },
}

export default function ProjectsPage() {
  const { projects, tasks, phases, projectNotes, setCurrentProject, upsertProject, upsertProjectNote, removeProjectNote, removeProject } = useTaskStore()
  const { setCurrentPage } = useUIStore()
  const { fetchAll } = useTasks()
  const router = useRouter()
  const [modalProject, setModalProject] = useState<Project | null | undefined>(undefined)
  const [showArchived, setShowArchived] = useState(false)

  const activeProjects   = projects.filter(p => p.status === 'active')
  const onHoldProjects   = projects.filter(p => p.status === 'on_hold')
  const archivedProjects = projects.filter(p => p.status === 'archived')

  function getProjectStats(projectId: string) {
    const pt = tasks.filter(t => t.project_id === projectId)
    const done = pt.filter(t => t.status === 'done').length
    return { total: pt.length, done, pct: pt.length ? Math.round((done / pt.length) * 100) : 0 }
  }

  function getPhaseSummary(projectId: string, phaseId: string) {
    const pt = tasks.filter(t => t.project_id === projectId && t.phase_id === phaseId)
    const done = pt.filter(t => t.status === 'done').length
    return { total: pt.length, done, pct: pt.length ? Math.round((done / pt.length) * 100) : 0 }
  }

  // current phase = first phase (by sort_order) that has incomplete tasks
  function getCurrentPhaseId(projectId: string): string | null {
    const sortedPhases = phases
      .filter(p => p.project_id === projectId)
      .sort((a, b) => a.sort_order - b.sort_order)
    for (const phase of sortedPhases) {
      const pt = tasks.filter(t => t.project_id === projectId && t.phase_id === phase.id)
      if (pt.length > 0 && pt.some(t => t.status !== 'done')) return phase.id
    }
    return null
  }

  function renderCard(project: Project) {
    const stats = getProjectStats(project.id)
    const phasesInProject = phases
      .filter(p => p.project_id === project.id)
      .sort((a, b) => a.sort_order - b.sort_order)
    const currentPhaseId = getCurrentPhaseId(project.id)
    const notes = projectNotes
      .filter(n => n.project_id === project.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))

    return (
      <ProjectCard
        key={project.id}
        project={project}
        stats={stats}
        phases={phasesInProject}
        currentPhaseId={currentPhaseId}
        getPhaseSummary={(phaseId) => getPhaseSummary(project.id, phaseId)}
        notes={notes}
        onEdit={() => setModalProject(project)}
        onViewTasks={() => {
          setCurrentProject(project.id)
          setCurrentPage('tasks')
          router.push('/tasks')
        }}
        onAddNote={async (note, type) => {
          const newNote = await addProjectNote({ project_id: project.id, note, type })
          upsertProjectNote(newNote)
        }}
        onDeleteNote={async (noteId) => {
          await deleteProjectNote(noteId)
          removeProjectNote(noteId)
        }}
        onDeleteProject={async () => {
          await deleteProject(project.id)
          removeProject(project.id)
        }}
        onArchive={async () => {
          await updateProject(project.id, { status: 'archived' })
          upsertProject({ ...project, status: 'archived' })
        }}
        onRestore={async () => {
          await updateProject(project.id, { status: 'active' })
          upsertProject({ ...project, status: 'active' })
        }}
      />
    )
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.4px' }}>Projects</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{activeProjects.length} active</div>
        </div>
        <button className="btn-primary" onClick={() => setModalProject(null)}>+ สร้าง Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📁</div>
          <div className="empty-title">ยังไม่มี Project</div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>สร้าง Project เพื่อจัดกลุ่มงานของคุณ</div>
          <button className="btn-primary" onClick={() => setModalProject(null)}>+ สร้าง Project แรก</button>
        </div>
      ) : (
        <>
          {[
            { label: 'กำลังดำเนินการ', items: activeProjects },
            { label: 'พักไว้', items: onHoldProjects },
          ].filter(g => g.items.length > 0).map(group => (
            <div key={group.label} style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: '10px' }}>{group.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {group.items.map(project => renderCard(project))}
              </div>
            </div>
          ))}

          {/* ประวัติ — collapsed by default */}
          {archivedProjects.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <button
                onClick={() => setShowArchived(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font)', padding: '0', marginBottom: showArchived ? '10px' : '0',
                  width: '100%', textAlign: 'left',
                }}
              >
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: showArchived ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}>
                  <path d="M1 1l4 4 4-4" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', letterSpacing: '.8px', textTransform: 'uppercase' }}>
                  ประวัติ Project ({archivedProjects.length})
                </span>
              </button>

              {showArchived && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: 0.8 }}>
                  {archivedProjects.map(project => renderCard(project))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {modalProject !== undefined && (
        <ProjectModal
          project={modalProject}
          onClose={() => setModalProject(undefined)}
          onSaved={fetchAll}
        />
      )}
    </div>
  )
}

// --- Project Card ---

function ProjectCard({
  project, stats, phases, currentPhaseId, getPhaseSummary,
  notes, onEdit, onViewTasks, onAddNote, onDeleteNote, onDeleteProject, onArchive, onRestore,
}: {
  project: Project
  stats: { total: number; done: number; pct: number }
  phases: { id: string; name: string; color: string; sort_order: number }[]
  currentPhaseId: string | null
  getPhaseSummary: (phaseId: string) => { total: number; done: number; pct: number }
  notes: ProjectNote[]
  onEdit: () => void
  onViewTasks: () => void
  onAddNote: (note: string, type: NoteType) => Promise<void>
  onDeleteNote: (id: string) => Promise<void>
  onDeleteProject: () => Promise<void>
  onArchive: () => Promise<void>
  onRestore: () => Promise<void>
}) {
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState<NoteType>('update')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleAddNote() {
    if (!noteText.trim()) return
    startTransition(async () => {
      await onAddNote(noteText.trim(), noteType)
      setNoteText('')
      setShowAddNote(false)
    })
  }

  return (
    <div
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r2)', padding: '16px',
        transition: 'border-color .15s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px',
          background: project.color, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: '15px',
        }}>
          {project.name[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{project.name}</div>
            <span style={{
              fontSize: '10px', fontFamily: 'var(--mono)',
              color: STATUS_COLOR[project.status],
              background: `color-mix(in srgb, ${STATUS_COLOR[project.status]} 12%, var(--surface))`,
              padding: '2px 7px', borderRadius: '20px',
              border: `1px solid color-mix(in srgb, ${STATUS_COLOR[project.status]} 30%, transparent)`,
            }}>
              {STATUS_LABEL[project.status]}
            </span>
          </div>
          {project.description && (
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{project.description}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
          {confirmDelete ? (
            <>
              <span style={{ fontSize: '11px', color: 'var(--red)', whiteSpace: 'nowrap' }}>แน่ใจ?</span>
              <button
                style={{ padding: '4px 10px', border: 'none', borderRadius: 'var(--r)', fontSize: '12px', cursor: 'pointer', background: 'var(--red)', color: 'white', fontFamily: 'var(--font)' }}
                onClick={() => startTransition(onDeleteProject)}
                disabled={isPending}
              >{isPending ? '...' : 'ลบ'}</button>
              <button className="btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => setConfirmDelete(false)}>ยกเลิก</button>
            </>
          ) : project.status === 'archived' ? (
            <>
              <button className="btn-ghost" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={onViewTasks}>ดูงาน</button>
              <button
                className="btn-ghost"
                style={{ fontSize: '12px', padding: '5px 10px', color: 'var(--green)' }}
                onClick={() => startTransition(onRestore)}
                disabled={isPending}
                title="นำกลับมา Active"
              >{isPending ? '...' : '↩ คืนค่า'}</button>
              <button
                className="icon-btn"
                onClick={() => setConfirmDelete(true)}
                title="ลบถาวร"
                style={{ color: 'var(--text3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
              >🗑️</button>
            </>
          ) : (
            <>
              <button className="btn-ghost" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={onViewTasks}>ดูงาน</button>
              <button
                className="icon-btn"
                onClick={() => startTransition(onArchive)}
                disabled={isPending}
                title="เสร็จสิ้น — ย้ายไปประวัติ"
                style={{ color: 'var(--text3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
              >{isPending ? '...' : '📦'}</button>
              <button className="icon-btn" onClick={onEdit} title="แก้ไข">✏️</button>
              <button
                className="icon-btn"
                onClick={() => setConfirmDelete(true)}
                title="ลบ Project"
                style={{ color: 'var(--text3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
              >🗑️</button>
            </>
          )}
        </div>
      </div>

      {/* Phase Stepper */}
      {phases.length > 0 && (
        <PhaseStepper
          phases={phases}
          currentPhaseId={currentPhaseId}
          getPhaseSummary={getPhaseSummary}
        />
      )}

      {/* Overall Progress */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>ความคืบหน้ารวม</span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
            {stats.done}/{stats.total} งาน ({stats.pct}%)
          </span>
        </div>
        <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: project.color, width: `${stats.pct}%`, borderRadius: '3px', transition: 'width .5s' }} />
        </div>
      </div>

      {/* Notes */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        {notes.length === 0 && !showAddNote && (
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px' }}>ยังไม่มี Remark</div>
        )}
        {notes.map(note => (
          <NoteRow key={note.id} note={note} onDelete={() => onDeleteNote(note.id)} />
        ))}

        {showAddNote ? (
          <div style={{ marginTop: notes.length > 0 ? '8px' : '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['blocker', 'update', 'resolved'] as NoteType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setNoteType(t)}
                  style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                    border: `1px solid ${noteType === t ? NOTE_META[t].color : 'var(--border)'}`,
                    background: noteType === t ? `color-mix(in srgb, ${NOTE_META[t].color} 12%, var(--surface))` : 'transparent',
                    color: noteType === t ? NOTE_META[t].color : 'var(--text3)',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                  }}
                >
                  {NOTE_META[t].icon} {NOTE_META[t].label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                autoFocus
                type="text"
                placeholder="เขียน Remark..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); if (e.key === 'Escape') setShowAddNote(false) }}
                style={{
                  flex: 1, padding: '6px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--r)', background: 'var(--surface)',
                  fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--font)',
                }}
              />
              <button
                className="btn-primary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={handleAddNote}
                disabled={isPending || !noteText.trim()}
              >
                {isPending ? '...' : 'บันทึก'}
              </button>
              <button
                className="btn-ghost"
                style={{ fontSize: '12px', padding: '6px 10px' }}
                onClick={() => { setShowAddNote(false); setNoteText('') }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddNote(true)}
            style={{
              marginTop: notes.length > 0 ? '8px' : '0',
              fontSize: '12px', color: 'var(--text3)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font)', padding: '0',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
          >
            + เพิ่ม Remark
          </button>
        )}
      </div>
    </div>
  )
}

// --- Phase Stepper ---

function PhaseStepper({
  phases, currentPhaseId, getPhaseSummary,
}: {
  phases: { id: string; name: string; color: string }[]
  currentPhaseId: string | null
  getPhaseSummary: (phaseId: string) => { total: number; done: number; pct: number }
}) {
  return (
    <div style={{
      marginBottom: '14px',
      overflowX: 'auto',
      paddingBottom: '4px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', minWidth: 'max-content' }}>
        {phases.map((phase, i) => {
          const s = getPhaseSummary(phase.id)
          const isDone = s.total > 0 && s.done === s.total
          const isCurrent = phase.id === currentPhaseId
          const isNotStarted = s.total === 0

          const dotColor = isDone ? 'var(--green)' : isCurrent ? 'var(--accent)' : 'var(--border2)'
          const labelColor = isDone ? 'var(--green)' : isCurrent ? 'var(--accent)' : 'var(--text3)'

          return (
            <div key={phase.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* Phase node */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '72px' }}>
                {/* Dot */}
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: isDone ? 'var(--green)' : isCurrent ? 'var(--accent)' : 'var(--surface2)',
                  border: `2px solid ${dotColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', flexShrink: 0,
                  boxShadow: isCurrent ? `0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)` : 'none',
                  transition: 'all .2s',
                }}>
                  {isDone ? (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : isCurrent ? (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                  ) : null}
                </div>
                {/* Label */}
                <div style={{ fontSize: '10px', color: labelColor, fontWeight: isCurrent ? 600 : 400, textAlign: 'center', lineHeight: 1.3, maxWidth: '64px', wordBreak: 'break-word' }}>
                  {phase.name}
                </div>
                {/* Percent */}
                {!isNotStarted && (
                  <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: labelColor }}>
                    {s.pct}%
                  </div>
                )}
                {isCurrent && (
                  <div style={{ fontSize: '9px', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    ← อยู่ที่นี่
                  </div>
                )}
              </div>
              {/* Connector line */}
              {i < phases.length - 1 && (
                <div style={{
                  height: '2px', width: '24px', marginTop: '11px', flexShrink: 0,
                  background: isDone ? 'var(--green)' : 'var(--border)',
                  transition: 'background .2s',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- Note Row ---

function NoteRow({ note, onDelete }: { note: ProjectNote; onDelete: () => void }) {
  const meta = NOTE_META[note.type]
  const [isPending, startTransition] = useTransition()

  const relativeTime = (() => {
    const diff = Date.now() - new Date(note.created_at).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'เมื่อกี้'
    if (hours < 1) return `${mins} นาทีที่แล้ว`
    if (days < 1) return `${hours} ชั่วโมงที่แล้ว`
    return `${days} วันที่แล้ว`
  })()

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      padding: '7px 0',
      borderBottom: '1px solid var(--surface2)',
    }}>
      <span style={{ fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>{note.note}</div>
        <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px', fontFamily: 'var(--mono)' }}>{relativeTime}</div>
      </div>
      <button
        onClick={() => startTransition(onDelete)}
        disabled={isPending}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text3)', fontSize: '14px', padding: '0 2px', flexShrink: 0,
          opacity: isPending ? 0.4 : 1,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
        title="ลบ"
      >×</button>
    </div>
  )
}
