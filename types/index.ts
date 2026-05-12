export type Priority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type RecurringType = '' | 'daily' | 'weekly' | 'monthly'
export type ThemeType = 'light' | 'dark' | 'auto'
export type AccentColor = 'black' | 'blue' | 'green' | 'purple' | 'red' | 'orange'
export type FontSize = 'sm' | 'md' | 'lg'

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
  title: string
  note: string
  priority: Priority
  status: TaskStatus
  deadline: string | null
  recurring: RecurringType
  total_time_seconds: number
  timer_started_at: string | null
  google_event_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // joined
  category?: Category
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
  defaultPriority: Priority
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
  priority: Priority | 'all'
  categoryId: string | 'all'
  search: string
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
