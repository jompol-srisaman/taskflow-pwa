import { format, isToday, isTomorrow, isPast, differenceInDays, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import type { TaskStatus, Category, ImportanceLevel } from '@/types'

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatDeadline(deadline: string | null): { label: string; status: 'overdue' | 'today' | 'soon' | 'normal' | null } {
  if (!deadline) return { label: '', status: null }
  const date = parseISO(deadline)
  if (isPast(date) && !isToday(date)) {
    const days = Math.abs(differenceInDays(new Date(), date))
    return { label: `เกินกำหนด ${days} วัน`, status: 'overdue' }
  }
  if (isToday(date)) return { label: 'วันนี้', status: 'today' }
  if (isTomorrow(date)) return { label: 'พรุ่งนี้', status: 'soon' }
  const days = differenceInDays(date, new Date())
  if (days <= 3) return { label: `อีก ${days} วัน`, status: 'soon' }
  return { label: format(date, 'd MMM yyyy', { locale: th }), status: 'normal' }
}

export function formatDate(date: string): string {
  return format(parseISO(date), 'd MMM yyyy', { locale: th })
}

export function formatDateTime(date: string): string {
  return format(parseISO(date), 'd MMM yyyy HH:mm', { locale: th })
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function getImportanceLabel(importance: ImportanceLevel): { label: string; color: string; bg: string } {
  if (importance === 'high')   return { label: 'สำคัญ',   color: 'var(--purple)', bg: 'var(--purple-bg)' }
  if (importance === 'medium') return { label: 'ปานกลาง', color: 'var(--blue)',   bg: 'var(--blue-bg)' }
  return { label: 'ต่ำ', color: 'var(--text3)', bg: 'var(--surface2)' }
}

// ใช้ใน Calendar dot colors และ Calendar Google colorId
export function getEisenhowerLabel(urgent: boolean, importance: ImportanceLevel): { label: string; color: string; bg: string } {
  if (urgent && importance === 'high')   return { label: 'ด่วน & สำคัญ',  color: 'var(--red)',    bg: 'var(--red-bg)' }
  if (urgent)                            return { label: 'ด่วน',           color: 'var(--orange)', bg: 'var(--orange-bg)' }
  if (importance === 'high')             return { label: 'สำคัญ',          color: 'var(--purple)', bg: 'var(--purple-bg)' }
  if (importance === 'medium')           return { label: 'ปานกลาง',        color: 'var(--blue)',   bg: 'var(--blue-bg)' }
  return { label: 'ต่ำ', color: 'var(--text3)', bg: 'var(--surface2)' }
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'รอดำเนินการ',
  in_progress: 'กำลังทำ',
  done: 'เสร็จแล้ว',
}

export const RECURRING_LABEL: Record<string, string> = {
  '': 'ไม่ซ้ำ',
  daily: 'ทุกวัน',
  weekly: 'ทุกสัปดาห์',
  monthly: 'ทุกเดือน',
}

export const PRESET_CATEGORIES: Omit<Category, 'id' | 'user_id' | 'created_at'>[] = [
  { name: 'ส่วนตัว', color: '#D35400', bg_color: '#FEF5EE', is_preset: true, sort_order: 0 },
  { name: 'ธุรกิจ', color: '#2471A3', bg_color: '#EBF5FB', is_preset: true, sort_order: 1 },
  { name: 'งาน', color: '#7D3C98', bg_color: '#F5EEF8', is_preset: true, sort_order: 2 },
  { name: 'ครอบครัว', color: '#27AE60', bg_color: '#EDF7F1', is_preset: true, sort_order: 3 },
  { name: 'ภรรยา', color: '#E91E8C', bg_color: '#FDE8F5', is_preset: true, sort_order: 4 },
]

export function getSubtaskProgress(subtasks: { done: boolean }[]): { done: number; total: number; pct: number } {
  if (!subtasks.length) return { done: 0, total: 0, pct: 0 }
  const done = subtasks.filter(s => s.done).length
  return { done, total: subtasks.length, pct: Math.round((done / subtasks.length) * 100) }
}

export function generateId(): string {
  return crypto.randomUUID()
}
