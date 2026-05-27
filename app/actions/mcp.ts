'use server'
import { sheetReadAll, sheetAppend } from '@/lib/sheets'
import { generateId } from '@/lib/utils'
import type { Task, ImportanceLevel } from '@/types'

/**
 * MCP-like Server Actions to allow AI/Tools to interact with the task system
 */

export async function mcpListTasks() {
  const rows = await sheetReadAll('tasks')
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    is_urgent: r.is_urgent === 'true',
    is_important: (['high','medium','low'].includes(r.is_important) ? r.is_important : 'medium') as ImportanceLevel,
    status: r.status,
    deadline: r.deadline
  }))
}

export async function mcpAddTask(title: string, urgent: boolean = false, important: ImportanceLevel = 'medium') {
  const id = generateId()
  const ts = new Date().toISOString()
  const row = {
    id,
    user_id: 'user',
    category_id: '',
    title,
    note: 'Added via MCP',
    is_urgent: String(urgent),
    is_important: important,
    status: 'todo',
    deadline: '',
    start_time: '',
    end_time: '',
    recurring: '',
    total_time_seconds: '0',
    timer_started_at: '',
    google_event_id: '',
    completed_at: '',
    created_at: ts,
    updated_at: ts,
  }
  await sheetAppend('tasks', row)
  return { id, title, is_urgent: urgent, is_important: important }
}
