'use server'
import { sheetReadAll, sheetAppend, sheetUpdate, sheetDelete, sheetDeleteWhere, ensureSheets } from '@/lib/sheets'
import { gcalCreate, gcalUpdate, gcalDelete } from '@/lib/googleCalendar'
import { ensurePresetCategories } from '@/app/actions/categories'
import { generateId } from '@/lib/utils'
import type { Task, Category, Subtask, ActivityLog, Priority, TaskStatus, RecurringType } from '@/types'

const USER_ID = 'user'

function now() { return new Date().toISOString() }

// --- Fetch ---

export async function fetchAllData(): Promise<{ tasks: Task[]; categories: Category[]; activityLog: ActivityLog[] }> {
  await ensureSheets()
  await ensurePresetCategories()
  const [rawTasks, rawCats, rawSubs, rawLog] = await Promise.all([
    sheetReadAll('tasks'),
    sheetReadAll('categories'),
    sheetReadAll('subtasks'),
    sheetReadAll('activity_log'),
  ])

  const categories: Category[] = rawCats.map(r => ({
    id: r.id, user_id: r.user_id, name: r.name,
    color: r.color, bg_color: r.bg_color,
    is_preset: r.is_preset === 'true',
    sort_order: Number(r.sort_order) || 0,
    created_at: r.created_at,
  }))

  const catById: Record<string, Category> = {}
  for (const c of categories) catById[c.id] = c

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
    title: r.title, note: r.note,
    priority: r.priority as Priority,
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
    subtasks: subsByTask[r.id] ?? [],
  }))

  const activityLog: ActivityLog[] = rawLog.slice(0, 100).map(r => ({
    id: r.id, user_id: r.user_id,
    task_id: r.task_id || null,
    action: r.action as ActivityLog['action'],
    task_title: r.task_title,
    created_at: r.created_at,
  }))

  return { tasks, categories, activityLog }
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
    title: data.title ?? '',
    note: data.note ?? '',
    priority: data.priority ?? 'medium',
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
    title: data.title ?? task.title,
    note: data.note ?? task.note ?? '',
    priority: data.priority ?? task.priority,
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
    category_id: updates.category_id || null,
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

export async function toggleTaskDone(task: Task): Promise<Partial<Task>> {
  const isDone = task.status !== 'done'
  const updates: Record<string, string> = {
    status: isDone ? 'done' : 'todo',
    completed_at: isDone ? now() : '',
    updated_at: now(),
  }

  await sheetUpdate('tasks', task.id, updates)

  if (isDone) {
    await sheetAppend('activity_log', {
      id: generateId(), user_id: USER_ID,
      task_id: task.id, action: 'completed',
      task_title: task.title, created_at: now(),
    })
    // Update Google Calendar event color to indicate done
    if (task.google_event_id && task.deadline) {
      await gcalUpdate(task.google_event_id, { ...task, status: 'done' })
    }
  }

  return {
    status: (isDone ? 'done' : 'todo') as TaskStatus,
    completed_at: isDone ? updates.completed_at : null,
    updated_at: updates.updated_at,
  }
}
