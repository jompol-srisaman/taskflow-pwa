'use server'
import { sheetReadAll, sheetAppend, sheetUpdate, sheetDelete, sheetDeleteWhere, ensureSheets } from '@/lib/sheets'
import { generateId } from '@/lib/utils'
import type { Project, Phase, ProjectStatus, ProjectNote, NoteType } from '@/types'

const USER_ID = 'user'
function now() { return new Date().toISOString() }

// --- Fetch ---

export async function fetchProjects(): Promise<{ projects: Project[]; phases: Phase[]; projectNotes: ProjectNote[] }> {
  await ensureSheets()
  const [rawProjects, rawPhases, rawNotes] = await Promise.all([
    sheetReadAll('projects'),
    sheetReadAll('phases'),
    sheetReadAll('project_notes'),
  ])

  const phases: Phase[] = rawPhases.map(r => ({
    id: r.id,
    project_id: r.project_id,
    name: r.name,
    color: r.color || '#6B7280',
    sort_order: Number(r.sort_order) || 0,
    created_at: r.created_at,
  }))

  const phasesByProject: Record<string, Phase[]> = {}
  for (const p of phases) {
    if (!phasesByProject[p.project_id]) phasesByProject[p.project_id] = []
    phasesByProject[p.project_id].push(p)
  }

  const projects: Project[] = rawProjects.map(r => ({
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    description: r.description || '',
    color: r.color || '#3B82F6',
    status: (r.status as ProjectStatus) || 'active',
    sort_order: Number(r.sort_order) || 0,
    created_at: r.created_at,
    phases: phasesByProject[r.id] ?? [],
  }))

  const projectNotes: ProjectNote[] = rawNotes.map(r => ({
    id: r.id,
    project_id: r.project_id,
    note: r.note,
    type: (r.type as NoteType) || 'update',
    created_at: r.created_at,
  }))

  return { projects, phases, projectNotes }
}

// --- Project CRUD ---

export async function createProject(data: {
  name: string
  description?: string
  color?: string
  phases?: { name: string; color: string; sort_order: number }[]
}): Promise<Project> {
  const id = generateId()
  const ts = now()

  const row = {
    id, user_id: USER_ID,
    name: data.name,
    description: data.description ?? '',
    color: data.color ?? '#3B82F6',
    status: 'active',
    sort_order: String(Date.now()),
    created_at: ts,
  }
  await sheetAppend('projects', row)

  const phases: Phase[] = []
  if (data.phases?.length) {
    await Promise.all(
      data.phases.map(async (p, i) => {
        const phaseId = generateId()
        await sheetAppend('phases', {
          id: phaseId,
          project_id: id,
          name: p.name,
          color: p.color,
          sort_order: String(p.sort_order ?? i),
          created_at: ts,
        })
        phases.push({ id: phaseId, project_id: id, name: p.name, color: p.color, sort_order: p.sort_order ?? i, created_at: ts })
      })
    )
  }

  return {
    id, user_id: USER_ID,
    name: row.name,
    description: row.description,
    color: row.color,
    status: 'active',
    sort_order: Number(row.sort_order),
    created_at: ts,
    phases,
  }
}

export async function updateProject(id: string, data: {
  name?: string
  description?: string
  color?: string
  status?: ProjectStatus
}): Promise<void> {
  const updates: Record<string, string> = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.description !== undefined) updates.description = data.description
  if (data.color !== undefined) updates.color = data.color
  if (data.status !== undefined) updates.status = data.status
  await sheetUpdate('projects', id, updates)
}

export async function deleteProject(id: string): Promise<void> {
  // Delete all phases and tasks' project_id reference (set to empty)
  const rawTasks = await sheetReadAll('tasks')
  await Promise.all([
    sheetDeleteWhere('phases', 'project_id', id),
    sheetDelete('projects', id),
    ...rawTasks
      .filter(t => t.project_id === id)
      .map(t => sheetUpdate('tasks', t.id, { project_id: '', phase_id: '' })),
  ])
}

// --- Phase CRUD ---

export async function createPhase(data: {
  project_id: string
  name: string
  color: string
  sort_order: number
}): Promise<Phase> {
  const id = generateId()
  const ts = now()
  const row = {
    id,
    project_id: data.project_id,
    name: data.name,
    color: data.color,
    sort_order: String(data.sort_order),
    created_at: ts,
  }
  await sheetAppend('phases', row)
  return { ...row, sort_order: data.sort_order }
}

export async function updatePhase(id: string, data: {
  name?: string
  color?: string
  sort_order?: number
}): Promise<void> {
  const updates: Record<string, string> = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.color !== undefined) updates.color = data.color
  if (data.sort_order !== undefined) updates.sort_order = String(data.sort_order)
  await sheetUpdate('phases', id, updates)
}

export async function deletePhase(id: string): Promise<void> {
  // Remove phase_id from tasks that use this phase
  const rawTasks = await sheetReadAll('tasks')
  await Promise.all([
    sheetDelete('phases', id),
    ...rawTasks
      .filter(t => t.phase_id === id)
      .map(t => sheetUpdate('tasks', t.id, { phase_id: '' })),
  ])
}

export async function reorderPhases(phases: { id: string; sort_order: number }[]): Promise<void> {
  await Promise.all(
    phases.map(p => sheetUpdate('phases', p.id, { sort_order: String(p.sort_order) }))
  )
}

// --- Project Notes CRUD ---

export async function addProjectNote(data: {
  project_id: string
  note: string
  type: NoteType
}): Promise<ProjectNote> {
  const id = generateId()
  const ts = now()
  await sheetAppend('project_notes', {
    id,
    project_id: data.project_id,
    note: data.note,
    type: data.type,
    created_at: ts,
  })
  return { id, project_id: data.project_id, note: data.note, type: data.type, created_at: ts }
}

export async function deleteProjectNote(id: string): Promise<void> {
  await sheetDelete('project_notes', id)
}
