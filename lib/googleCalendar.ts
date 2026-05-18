import { getCalendarClient, CALENDAR_ID } from '@/lib/sheets'
import type { Task } from '@/types'

const PRIO_COLOR: Record<string, string> = { high: '11', medium: '6', low: '1' }

function buildEvent(task: Task) {
  const date = task.deadline!.substring(0, 10)
  const colorId = task.status === 'done' ? '8' : (PRIO_COLOR[task.priority] ?? '1')

  if (task.start_time) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return {
      summary: task.title,
      description: task.note || undefined,
      start: { dateTime: `${date}T${task.start_time}:00`, timeZone: tz },
      end: { dateTime: `${date}T${task.end_time || task.start_time}:00`, timeZone: tz },
      colorId,
    }
  }

  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  return {
    summary: task.title,
    description: task.note || undefined,
    start: { date },
    end: { date: nextDay.toISOString().substring(0, 10) },
    colorId,
  }
}

export async function gcalCreate(task: Task): Promise<string | null> {
  if (!task.deadline) return null
  try {
    const cal = getCalendarClient()
    const res = await cal.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: buildEvent(task),
    })
    return res.data.id ?? null
  } catch {
    return null
  }
}

export async function gcalUpdate(eventId: string, task: Task): Promise<boolean> {
  if (!task.deadline) return false
  try {
    const cal = getCalendarClient()
    await cal.events.patch({
      calendarId: CALENDAR_ID,
      eventId,
      requestBody: buildEvent(task),
    })
    return true
  } catch {
    return false
  }
}

export async function gcalDelete(eventId: string): Promise<boolean> {
  try {
    const cal = getCalendarClient()
    await cal.events.delete({ calendarId: CALENDAR_ID, eventId })
    return true
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

export async function gcalFetch(timeMin: string, timeMax: string): Promise<GCalEvent[]> {
  try {
    const cal = getCalendarClient()
    const res = await cal.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 200,
    })
    return (res.data.items ?? []) as GCalEvent[]
  } catch {
    return []
  }
}

export async function gcalIsConnected(): Promise<boolean> {
  try {
    const cal = getCalendarClient()
    await cal.calendarList.get({ calendarId: CALENDAR_ID })
    return true
  } catch {
    return false
  }
}
