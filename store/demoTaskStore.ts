'use client'
import { create } from 'zustand'
import type { Task, Category, Subtask, ActivityLog, Project, Phase, ProjectNote } from '@/types'

export type DemoActiveTab = 'dashboard' | 'tasks' | 'projects'

export interface DemoTaskState {
  tasks: Task[]
  categories: Category[]
  activityLog: ActivityLog[]
  projects: Project[]
  phases: Phase[]
  projectNotes: ProjectNote[]
  currentProjectId: string | null
  activeTab: DemoActiveTab
  loading: boolean
  setTasks: (tasks: Task[]) => void
  setCategories: (categories: Category[]) => void
  setActivityLog: (log: ActivityLog[]) => void
  setProjects: (projects: Project[]) => void
  setPhases: (phases: Phase[]) => void
  setProjectNotes: (notes: ProjectNote[]) => void
  setCurrentProject: (id: string | null) => void
  setActiveTab: (tab: DemoActiveTab) => void
  setLoading: (loading: boolean) => void
  upsertTask: (task: Task) => void
  removeTask: (id: string) => void
  updateSubtasks: (taskId: string, subtasks: Subtask[]) => void
  upsertProject: (project: Project) => void
  removeProject: (id: string) => void
  upsertPhase: (phase: Phase) => void
  removePhase: (id: string) => void
  upsertProjectNote: (note: ProjectNote) => void
  removeProjectNote: (id: string) => void
}

export const useDemoTaskStore = create<DemoTaskState>()((set) => ({
  tasks: [],
  categories: [],
  activityLog: [],
  projects: [],
  phases: [],
  projectNotes: [],
  currentProjectId: null,
  activeTab: 'dashboard',
  loading: false,

  setTasks: (tasks) => set({ tasks }),
  setCategories: (categories) => set({ categories }),
  setActivityLog: (activityLog) => set({ activityLog }),
  setProjects: (projects) => set({ projects }),
  setPhases: (phases) => set({ phases }),
  setProjectNotes: (projectNotes) => set({ projectNotes }),
  setCurrentProject: (currentProjectId) => set({ currentProjectId }),
  setActiveTab: (activeTab) => set({ activeTab }),
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

  updateSubtasks: (taskId, subtasks) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, subtasks } : t)),
    })),

  upsertProject: (project) =>
    set((s) => {
      const idx = s.projects.findIndex((p) => p.id === project.id)
      if (idx >= 0) {
        const next = [...s.projects]
        next[idx] = project
        return { projects: next }
      }
      return { projects: [...s.projects, project] }
    }),

  removeProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
    })),

  upsertPhase: (phase) =>
    set((s) => {
      const idx = s.phases.findIndex((p) => p.id === phase.id)
      if (idx >= 0) {
        const next = [...s.phases]
        next[idx] = phase
        return { phases: next }
      }
      return { phases: [...s.phases, phase] }
    }),

  removePhase: (id) =>
    set((s) => ({ phases: s.phases.filter((p) => p.id !== id) })),

  upsertProjectNote: (note) =>
    set((s) => {
      const idx = s.projectNotes.findIndex((n) => n.id === note.id)
      if (idx >= 0) {
        const next = [...s.projectNotes]
        next[idx] = note
        return { projectNotes: next }
      }
      return { projectNotes: [note, ...s.projectNotes] }
    }),

  removeProjectNote: (id) =>
    set((s) => ({ projectNotes: s.projectNotes.filter((n) => n.id !== id) })),
}))
