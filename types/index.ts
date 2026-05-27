export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type RecurringType = '' | 'daily' | 'weekly' | 'monthly'
export type ImportanceLevel = 'high' | 'medium' | 'low'
export type ThemeType = 'light' | 'dark' | 'auto'
export type AccentColor = 'black' | 'blue' | 'green' | 'purple' | 'red' | 'orange'
export type FontSize = 'sm' | 'md' | 'lg'
export type ProjectStatus = 'active' | 'archived' | 'on_hold'
export type NoteType = 'blocker' | 'update' | 'resolved'

export interface ProjectNote {
  id: string
  project_id: string
  note: string
  type: NoteType
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string
  color: string
  status: ProjectStatus
  sort_order: number
  created_at: string
  // computed
  phases?: Phase[]
  taskCount?: number
  doneCount?: number
}

export interface Phase {
  id: string
  project_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
  // computed
  taskCount?: number
  doneCount?: number
}

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  bg_color: string
  is_preset: boolean
  sort_order: number
  created_at: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  done: boolean
  sort_order: number
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  category_id: string | null
  project_id: string | null
  phase_id: string | null
  title: string
  note: string
  is_urgent: boolean
  is_important: ImportanceLevel
  status: TaskStatus
  deadline: string | null
  start_time: string | null
  end_time: string | null
  recurring: RecurringType
  total_time_seconds: number
  timer_started_at: string | null
  google_event_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // joined
  category?: Category
  project?: Project
  phase?: Phase
  subtasks?: Subtask[]
}

export interface ActivityLog {
  id: string
  user_id: string
  task_id: string | null
  action: 'created' | 'completed' | 'updated' | 'deleted'
  task_title: string
  created_at: string
}

export interface Profile {
  id: string
  name: string
  avatar_url: string | null
  settings: UserSettings
  created_at: string
}

export interface UserSettings {
  theme: ThemeType
  accent: AccentColor
  fs: FontSize
  defaultCategory: string
  defaultUrgent: boolean
  defaultImportant: boolean
  warnDays: number
  weekStart: 'sun' | 'mon'
  showTimer: boolean
  googleCalendarSync: boolean
}

export interface PushSubscription {
  id: string
  user_id: string
  subscription: object
  created_at: string
}

// View types
export type ViewMode = 'list' | 'card' | 'kanban'

// Filter types
export interface TaskFilter {
  status: 'all' | 'active' | 'done'
  is_urgent: boolean | 'all'
  is_important: ImportanceLevel | 'all'
  categoryId: string | 'all'
  projectId: string | 'all'
  search: string
  dateFilter: 'all' | 'today' | 'this_week' | 'this_month'
}

// Stats
export interface DashboardStats {
  total: number
  done: number
  inProgress: number
  overdue: number
  dueToday: number
  dueSoon: number
}
