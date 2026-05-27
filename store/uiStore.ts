'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ViewMode, TaskFilter, ThemeType, AccentColor, FontSize } from '@/types'

interface UIState {
  // Theme
  theme: ThemeType
  accent: AccentColor
  fontSize: FontSize
  // App settings
  name: string
  gcalSync: boolean
  // View
  viewMode: ViewMode
  currentPage: string
  sidebarOpen: boolean
  // Filter
  filter: TaskFilter
  // Modal
  taskModalOpen: boolean
  editingTaskId: string | null
  // Actions
  setTheme: (t: ThemeType) => void
  setAccent: (a: AccentColor) => void
  setFontSize: (f: FontSize) => void
  setName: (n: string) => void
  setGcalSync: (v: boolean) => void
  setViewMode: (v: ViewMode) => void
  setCurrentPage: (p: string) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setFilter: (f: Partial<TaskFilter>) => void
  resetFilter: () => void
  openTaskModal: (taskId?: string) => void
  closeTaskModal: () => void
}

const defaultFilter: TaskFilter = {
  status: 'all',
  is_urgent: 'all',
  is_important: 'all' as const,
  categoryId: 'all',
  projectId: 'all',
  search: '',
  dateFilter: 'all',
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      accent: 'black',
      fontSize: 'md',
      name: 'ผู้ใช้',
      gcalSync: false,
      viewMode: 'list',
      currentPage: 'dashboard',
      sidebarOpen: false,
      filter: defaultFilter,
      taskModalOpen: false,
      editingTaskId: null,

      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setFontSize: (fontSize) => set({ fontSize }),
      setName: (name) => set({ name }),
      setGcalSync: (gcalSync) => set({ gcalSync }),
      setViewMode: (viewMode) => set({ viewMode }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f } })),
      resetFilter: () => set({ filter: defaultFilter }),
      openTaskModal: (taskId) => set({ taskModalOpen: true, editingTaskId: taskId ?? null }),
      closeTaskModal: () => set({ taskModalOpen: false, editingTaskId: null }),
    }),
    {
      name: 'taskflow-ui',
      partialize: (s) => ({ theme: s.theme, accent: s.accent, fontSize: s.fontSize, viewMode: s.viewMode, name: s.name, gcalSync: s.gcalSync }),
    }
  )
)
