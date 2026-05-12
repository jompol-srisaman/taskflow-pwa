'use client'
import { create } from 'zustand'
import type { Task, Category, Subtask, ActivityLog } from '@/types'

interface TaskState {
  tasks: Task[]
  categories: Category[]
  activityLog: ActivityLog[]
  loading: boolean
  // Actions
  setTasks: (tasks: Task[]) => void
  setCategories: (categories: Category[]) => void
  setActivityLog: (log: ActivityLog[]) => void
  setLoading: (loading: boolean) => void
  upsertTask: (task: Task) => void
  removeTask: (id: string) => void
  upsertCategory: (cat: Category) => void
  removeCategory: (id: string) => void
  updateSubtasks: (taskId: string, subtasks: Subtask[]) => void
}

export const useTaskStore = create<TaskState>()((set) => ({
  tasks: [],
  categories: [],
  activityLog: [],
  loading: true,

  setTasks: (tasks) => set({ tasks }),
  setCategories: (categories) => set({ categories }),
  setActivityLog: (activityLog) => set({ activityLog }),
  setLoading: (loading) => set({ loading }),

  upsertTask: (task) =>
    set((s) => {
      const idx = s.tasks.findIndex((t) => t.id === task.id)
      if (idx >= 0) {
        const next = [...s.tasks]
        next[idx] = task
        return { tasks: next }
      }
      return { tasks: [task, ...s.tasks] }
    }),

  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  upsertCategory: (cat) =>
    set((s) => {
      const idx = s.categories.findIndex((c) => c.id === cat.id)
      if (idx >= 0) {
        const next = [...s.categories]
        next[idx] = cat
        return { categories: next }
      }
      return { categories: [...s.categories, cat] }
    }),

  removeCategory: (id) =>
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

  updateSubtasks: (taskId, subtasks) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, subtasks } : t)),
    })),
}))
