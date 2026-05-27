'use client'
import { useDemoTaskStore } from '@/store/demoTaskStore'
import { generateId } from '@/lib/utils'
import type { Task, Subtask } from '@/types'
import type { ImportanceLevel, RecurringType } from '@/types'

export function useDemoActions() {
  const store = useDemoTaskStore()

  function createTask(data: Partial<Task>, subtasks: Subtask[]): Task {
    const id = generateId()
    const ts = new Date().toISOString()
    const category = data.category_id
      ? store.categories.find(c => c.id === data.category_id)
      : undefined
    const project = data.project_id
      ? store.projects.find(p => p.id === data.project_id)
      : undefined
    const phase = data.phase_id
      ? store.phases.find(p => p.id === data.phase_id)
      : undefined

    const task: Task = {
      id, user_id: 'demo',
      category_id: data.category_id ?? null,
      project_id: data.project_id ?? null,
      phase_id: data.phase_id ?? null,
      title: data.title ?? '',
      note: data.note ?? '',
      is_urgent: data.is_urgent ?? false,
      is_important: (data.is_important ?? 'medium') as ImportanceLevel,
      status: 'todo',
      deadline: data.deadline ?? null,
      start_time: data.start_time ?? null,
      end_time: data.end_time ?? null,
      recurring: (data.recurring ?? '') as RecurringType,
      total_time_seconds: 0,
      timer_started_at: null,
      google_event_id: null,
      completed_at: null,
      created_at: ts,
      updated_at: ts,
      category,
      project,
      phase,
      subtasks: subtasks.map((s, i) => ({ ...s, task_id: id, sort_order: i })),
    }
    store.upsertTask(task)
    return task
  }

  function updateTask(existing: Task, data: Partial<Task>, subtasks: Subtask[]): Task {
    const category = (data.category_id !== undefined ? data.category_id : existing.category_id)
      ? store.categories.find(c => c.id === (data.category_id ?? existing.category_id))
      : undefined
    const project = (data.project_id !== undefined ? data.project_id : existing.project_id)
      ? store.projects.find(p => p.id === (data.project_id ?? existing.project_id))
      : undefined
    const phase = (data.phase_id !== undefined ? data.phase_id : existing.phase_id)
      ? store.phases.find(p => p.id === (data.phase_id ?? existing.phase_id))
      : undefined

    const updated: Task = {
      ...existing, ...data,
      updated_at: new Date().toISOString(),
      category,
      project,
      phase,
      subtasks,
    }
    store.upsertTask(updated)
    return updated
  }

  function deleteTask(task: Task): void {
    store.removeTask(task.id)
  }

  function toggleTaskDone(task: Task): Partial<Task> {
    const isDone = task.status !== 'done'
    const completedAt = new Date().toISOString()
    const updates: Partial<Task> = {
      status: isDone ? 'done' : 'todo',
      completed_at: isDone ? completedAt : null,
      updated_at: completedAt,
    }
    store.upsertTask({ ...task, ...updates })
    return updates
  }

  function updateSubtaskDone(task: Task, subtaskId: string, done: boolean): void {
    const subtasks = (task.subtasks ?? []).map(s =>
      s.id === subtaskId ? { ...s, done } : s
    )
    store.updateSubtasks(task.id, subtasks)
  }

  function startTimer(task: Task): void {
    store.upsertTask({ ...task, timer_started_at: new Date().toISOString() })
  }

  function stopTimer(task: Task): number {
    const elapsed = task.timer_started_at
      ? Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
      : 0
    const total = task.total_time_seconds + elapsed
    store.upsertTask({ ...task, total_time_seconds: total, timer_started_at: null })
    return total
  }

  return { createTask, updateTask, deleteTask, toggleTaskDone, updateSubtaskDone, startTimer, stopTimer }
}
