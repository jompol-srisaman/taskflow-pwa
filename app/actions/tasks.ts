'use server'
import { sheetReadAll, sheetAppend, sheetUpdate, sheetDelete, sheetDeleteWhere, ensureSheets } from '@/lib/sheets'
import { gcalCreate, gcalUpdate, gcalDelete } from '@/lib/googleCalendar'
import { ensurePresetCategories } from '@/app/actions/categories'
import { fetchProjects } from '@/app/actions/projects'
import { generateId } from '@/lib/utils'
import { addDays, addWeeks, addMonths, parseISO } from 'date-fns'
import type { Task, Category, Subtask, ActivityLog, TaskStatus, RecurringType, ImportanceLevel, Project, Phase, ProjectNote } from '@/types'

const USER_ID = 'user'

function now() { return new Date().toISOString() }

// --- Fetch ---

export async function fetchAllData(): Promise<{ tasks: Task[]; categories: Category[]; activityLog: ActivityLog[]; projects: Project[]; phases: Phase[]; projectNotes: ProjectNote[] }> {
  try {
    console.log('Fetching all data from Google Sheets...')
    await ensureSheets()
    await ensurePresetCategories()
    const [rawTasks, rawCats, rawSubs, rawLog, projectData] = await Promise.all([
      sheetReadAll('tasks'),
      sheetReadAll('categories'),
      sheetReadAll('subtasks'),
      sheetReadAll('activity_log'),
      fetchProjects(),
    ])

    console.log(`Fetched: ${rawTasks.length} tasks, ${rawCats.length} categories, ${rawSubs.length} subtasks, ${rawLog.length} logs`)

    const categories: Category[] = rawCats.map(r => ({
    id: r.id, user_id: r.user_id, name: r.name,
    color: r.color, bg_color: r.bg_color,
    is_preset: r.is_preset === 'true',
    sort_order: Number(r.sort_order) || 0,
    created_at: r.created_at,
  }))

  const catById: Record<string, Category> = {}
  for (const c of categories) catById[c.id] = c

  const { projects, phases, projectNotes } = projectData
  const projectById: Record<string, Project> = {}
  for (const p of projects) projectById[p.id] = p
  const phaseById: Record<string, Phase> = {}
  for (const p of phases) phaseById[p.id] = p

  const subsByTask: Record<string, Subtask[]> = {}
  for (const r of rawSubs) {
    const s: Subtask = {
      id: r.id, task_id: r.task_id, title: r.title,
      done: r.done === 'true',
      sort_order: Number(r.sort_order) || 0,
      created_at: r.created_at,
    }
    if (!subsByTask[s.task_id]) subsByTask[s.task_id] = []
    subsByTask[s.task_id].push(s)
  }

  const tasks: Task[] = rawTasks.map(r => ({
    id: r.id, user_id: r.user_id,
    category_id: r.category_id || null,
    project_id: r.project_id || null,
    phase_id: r.phase_id || null,
    title: r.title, note: r.note,
    is_urgent: r.is_urgent === 'true',
    is_important: (['high','medium','low'].includes(r.is_important) ? r.is_important : 'medium') as ImportanceLevel,
    status: r.status as TaskStatus,
    deadline: r.deadline || null,
    start_time: r.start_time || null,
    end_time: r.end_time || null,
    recurring: r.recurring as RecurringType,
    total_time_seconds: Number(r.total_time_seconds) || 0,
    timer_started_at: r.timer_started_at || null,
    google_event_id: r.google_event_id || null,
    completed_at: r.completed_at || null,
    created_at: r.created_at,
    updated_at: r.updated_at,
    category: r.category_id ? catById[r.category_id] : undefined,
    project: r.project_id ? projectById[r.project_id] : undefined,
    phase: r.phase_id ? phaseById[r.phase_id] : undefined,
    subtasks: subsByTask[r.id] ?? [],
  }))

  const activityLog: ActivityLog[] = rawLog.slice(0, 100).map(r => ({
    id: r.id, user_id: r.user_id,
    task_id: r.task_id || null,
    action: r.action as ActivityLog['action'],
    task_title: r.task_title,
    created_at: r.created_at,
  }))

  return { tasks, categories, activityLog, projects, phases, projectNotes }
  } catch (error) {
  console.error('Error in fetchAllData:', error)
  throw error
  }
  }
// --- Task CRUD ---

export async function createTask(
  data: Partial<Task>,
  syncGcal: boolean,
  subtasks: Subtask[],
): Promise<Task> {
  const id = generateId()
  const ts = now()

  const row: Record<string, string> = {
    id, user_id: USER_ID,
    category_id: data.category_id ?? '',
    project_id: data.project_id ?? '',
    phase_id: data.phase_id ?? '',
    title: data.title ?? '',
    note: data.note ?? '',
    is_urgent: String(data.is_urgent ?? false),
    is_important: (data.is_important ?? 'medium') as string,
    status: 'todo',
    deadline: data.deadline ?? '',
    start_time: data.start_time ?? '',
    end_time: data.end_time ?? '',
    recurring: data.recurring ?? '',
    total_time_seconds: '0',
    timer_started_at: '',
    google_event_id: '',
    completed_at: '',
    created_at: ts,
    updated_at: ts,
  }

  await sheetAppend('tasks', row)

  // Subtasks + activity log in parallel
  await Promise.all([
    ...subtasks.map((s, i) => sheetAppend('subtasks', {
      id: generateId(), task_id: id,
      title: s.title,
      done: String(s.done),
      sort_order: String(i),
      created_at: ts,
    })),
    sheetAppend('activity_log', {
      id: generateId(), user_id: USER_ID,
      task_id: id, action: 'created',
      task_title: row.title, created_at: ts,
    }),
  ])

  // Google Calendar sync
  let googleEventId: string | null = null
  if (syncGcal && row.deadline) {
    const taskForGcal = { ...row, id } as unknown as Task
    googleEventId = await gcalCreate(taskForGcal)
    if (googleEventId) await sheetUpdate('tasks', id, { google_event_id: googleEventId })
  }

  return {
    ...row, id, user_id: USER_ID,
    category_id: row.category_id || null,
    project_id: row.project_id || null,
    phase_id: row.phase_id || null,
    deadline: row.deadline || null,
    start_time: row.start_time || null,
    end_time: row.end_time || null,
    google_event_id: googleEventId,
    completed_at: null, timer_started_at: null,
    total_time_seconds: 0,
    subtasks: subtasks.map((s, i) => ({ ...s, task_id: id, sort_order: i })),
  } as Task
}

export async function updateTask(
  task: Task,
  data: Partial<Task>,
  syncGcal: boolean,
  subtasks: Subtask[],
): Promise<Task> {
  const ts = now()
  let googleEventId = task.google_event_id ?? null

  // Google Calendar sync
  if (data.deadline !== undefined || data.title !== undefined) {
    const merged = { ...task, ...data }
    if (syncGcal && merged.deadline) {
      if (googleEventId) {
        await gcalUpdate(googleEventId, merged as Task)
      } else {
        googleEventId = await gcalCreate(merged as Task)
      }
    } else if (!syncGcal && googleEventId) {
      await gcalDelete(googleEventId)
      googleEventId = null
    }
  }

  const updates: Record<string, string> = {
    category_id: data.category_id ?? task.category_id ?? '',
    project_id: data.project_id ?? task.project_id ?? '',
    phase_id: data.phase_id ?? task.phase_id ?? '',
    title: data.title ?? task.title,
    note: data.note ?? task.note ?? '',
    is_urgent: String(data.is_urgent ?? task.is_urgent),
    is_important: (data.is_important ?? task.is_important) as string,
    status: data.status ?? task.status,
    deadline: data.deadline ?? task.deadline ?? '',
    start_time: data.start_time ?? task.start_time ?? '',
    end_time: data.end_time ?? task.end_time ?? '',
    recurring: data.recurring ?? task.recurring ?? '',
    google_event_id: googleEventId ?? '',
    updated_at: ts,
  }

  await sheetUpdate('tasks', task.id, updates)

  // Replace subtasks (delete first, then append in parallel)
  await sheetDeleteWhere('subtasks', 'task_id', task.id)
  await Promise.all([
    ...subtasks.map((s, i) => sheetAppend('subtasks', {
      id: s.id || generateId(), task_id: task.id,
      title: s.title,
      done: String(s.done),
      sort_order: String(i),
      created_at: s.created_at || ts,
    })),
    sheetAppend('activity_log', {
      id: generateId(), user_id: USER_ID,
      task_id: task.id, action: 'updated',
      task_title: updates.title, created_at: ts,
    }),
  ])

  return {
    ...task, ...updates,
    is_urgent: (updates.is_urgent === 'true'),
    is_important: (['high','medium','low'].includes(updates.is_important) ? updates.is_important : 'medium') as ImportanceLevel,
    category_id: updates.category_id || null,
    project_id: updates.project_id || null,
    phase_id: updates.phase_id || null,
    deadline: updates.deadline || null,
    start_time: updates.start_time || null,
    end_time: updates.end_time || null,
    google_event_id: googleEventId,
    subtasks,
  } as Task
}

export async function deleteTask(task: Task): Promise<void> {
  const ts = now()
  await Promise.all([
    task.google_event_id ? gcalDelete(task.google_event_id) : Promise.resolve(),
    sheetAppend('activity_log', {
      id: generateId(), user_id: USER_ID,
      task_id: task.id, action: 'deleted',
      task_title: task.title, created_at: ts,
    }),
  ])
  await Promise.all([
    sheetDeleteWhere('subtasks', 'task_id', task.id),
    sheetDelete('tasks', task.id),
  ])
}

export async function updateTaskStatus(taskId: string, status: string): Promise<void> {
  const updates: Record<string, string> = {
    status,
    completed_at: status === 'done' ? now() : '',
    updated_at: now(),
  }
  await sheetUpdate('tasks', taskId, updates)
}

export async function updateSubtaskDone(subtaskId: string, done: boolean): Promise<void> {
  await sheetUpdate('subtasks', subtaskId, { done: String(done) })
}

export async function toggleTaskDone(task: Task): Promise<Partial<Task> & { newRecurringTask?: Task }> {
  const isDone = task.status !== 'done'
  const completedAt = now()
  const updates: Record<string, string> = {
    status: isDone ? 'done' : 'todo',
    completed_at: isDone ? completedAt : '',
    updated_at: completedAt,
  }

  await sheetUpdate('tasks', task.id, updates)

  let newRecurringTask: Task | undefined
  if (isDone) {
    const logPromise = sheetAppend('activity_log', {
      id: generateId(), user_id: USER_ID,
      task_id: task.id, action: 'completed',
      task_title: task.title, created_at: completedAt,
    })
    const gcalPromise = (task.google_event_id && task.deadline)
      ? gcalUpdate(task.google_event_id, { ...task, status: 'done' })
      : Promise.resolve()

    // Auto-create next recurring task
    if (task.recurring && task.deadline) {
      const base = parseISO(task.deadline)
      const nextDate = task.recurring === 'daily' ? addDays(base, 1)
        : task.recurring === 'weekly' ? addWeeks(base, 1)
        : addMonths(base, 1)
      const nextDeadline = nextDate.toISOString().split('T')[0]
      const newId = generateId()
      const ts = completedAt

      const newRow: Record<string, string> = {
        id: newId, user_id: USER_ID,
        category_id: task.category_id ?? '',
        project_id: task.project_id ?? '',
        phase_id: task.phase_id ?? '',
        title: task.title, note: task.note ?? '',
        is_urgent: String(task.is_urgent),
        is_important: task.is_important,
        status: 'todo',
        deadline: nextDeadline,
        start_time: task.start_time ?? '',
        end_time: task.end_time ?? '',
        recurring: task.recurring,
        total_time_seconds: '0', timer_started_at: '',
        google_event_id: '', completed_at: '',
        created_at: ts, updated_at: ts,
      }

      await Promise.all([
        logPromise, gcalPromise,
        sheetAppend('tasks', newRow),
        ...(task.subtasks || []).map((s, i) => sheetAppend('subtasks', {
          id: generateId(), task_id: newId,
          title: s.title, done: 'false',
          sort_order: String(i), created_at: ts,
        })),
      ])

      newRecurringTask = {
        id: newId, user_id: USER_ID,
        category_id: task.category_id,
        project_id: task.project_id ?? null,
        phase_id: task.phase_id ?? null,
        title: task.title, note: task.note ?? '',
        is_urgent: task.is_urgent,
        is_important: task.is_important,
        status: 'todo',
        deadline: nextDeadline,
        start_time: task.start_time, end_time: task.end_time,
        recurring: task.recurring,
        total_time_seconds: 0, timer_started_at: null,
        google_event_id: null, completed_at: null,
        created_at: ts, updated_at: ts,
        category: task.category,
        project: task.project,
        phase: task.phase,
        subtasks: (task.subtasks || []).map((s, i) => ({
          ...s, id: generateId(), task_id: newId,
          done: false, sort_order: i, created_at: ts,
        })),
      }
    } else {
      await Promise.all([logPromise, gcalPromise])
    }
  }

  return {
    status: (isDone ? 'done' : 'todo') as TaskStatus,
    completed_at: isDone ? completedAt : null,
    updated_at: completedAt,
    newRecurringTask,
  }
}

export async function startTimer(taskId: string): Promise<void> {
  await sheetUpdate('tasks', taskId, {
    timer_started_at: new Date().toISOString(),
    updated_at: now(),
  })
}

export async function stopTimer(task: Task): Promise<{ total_time_seconds: number }> {
  const elapsed = task.timer_started_at
    ? Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
    : 0
  const total = task.total_time_seconds + elapsed
  await sheetUpdate('tasks', task.id, {
    total_time_seconds: String(total),
    timer_started_at: '',
    updated_at: now(),
  })
  return { total_time_seconds: total }
}
