'use client'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types'

const GCAL = 'https://www.googleapis.com/calendar/v3'

// Priority → Google Calendar color (11=tomato, 6=banana, 1=lavender, 8=graphite)
const PRIO_COLOR: Record<string, string> = { high: '11', medium: '6', low: '1' }

export async function getProviderToken(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.provider_token ?? null
}

function buildEvent(task: Task) {
  const date = task.deadline!.substring(0, 10)
  // All-day event: end = next day
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  const endDate = nextDay.toISOString().substring(0, 10)

  return {
    summary: task.title,
    description: task.note ? task.note : undefined,
    start: { date },
    end: { date: endDate },
    colorId: task.status === 'done' ? '8' : (PRIO_COLOR[task.priority] ?? '1'),
  }
}

/** Create event → return Google event id, or null on failure */
export async function gcalCreate(task: Task): Promise<string | null> {
  if (!task.deadline) return null
  const token = await getProviderToken()
  if (!token) return null

  try {
    const res = await fetch(`${GCAL}/calendars/primary/events`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildEvent(task)),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.id as string
  } catch {
    return null
  }
}

/** Update existing event (noop if eventId missing or no deadline) */
export async function gcalUpdate(eventId: string, task: Task): Promise<boolean> {
  if (!task.deadline) return false
  const token = await getProviderToken()
  if (!token) return false

  try {
    const res = await fetch(`${GCAL}/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildEvent(task)),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Delete event */
export async function gcalDelete(eventId: string): Promise<boolean> {
  const token = await getProviderToken()
  if (!token) return false

  try {
    const res = await fetch(`${GCAL}/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    return res.status === 204 || res.ok
  } catch {
    return false
  }
}

export interface GCalEvent {
  id: string
  summary: string
  description?: string
  colorId?: string
  htmlLink: string
  start: { date?: string; dateTime?: string }
  end: { date?: string; dateTime?: string }
}

/** Fetch events for a time range (ISO strings) */
export async function gcalFetch(timeMin: string, timeMax: string): Promise<GCalEvent[]> {
  const token = await getProviderToken()
  if (!token) return []

  try {
    const params = new URLSearchParams({
      timeMin, timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '200',
    })
    const res = await fetch(`${GCAL}/calendars/primary/events?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.items ?? []) as GCalEvent[]
  } catch {
    return []
  }
}

/** Check if token is valid (lightweight ping) */
export async function gcalIsConnected(): Promise<boolean> {
  const token = await getProviderToken()
  if (!token) return false
  try {
    const res = await fetch(`${GCAL}/users/me/calendarList/primary`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    return res.ok
  } catch {
    return false
  }
}
