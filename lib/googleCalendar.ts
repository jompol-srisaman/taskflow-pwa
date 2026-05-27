import { getCalendarClient, CALENDAR_ID } from '@/lib/sheets'
import type { Task } from '@/types'

const TZ = 'Asia/Bangkok'

function buildEvent(task: Task) {
  const date = task.deadline!.substring(0, 10)
  
  // Eisenhower Matrix Color mapping for Calendar
  // Urgent + Important (Do first) -> Red (11)
  // Not Urgent + Important (Schedule) -> Purple (3)
  // Urgent + Not Important (Delegate) -> Orange (6)
  // Not Urgent + Not Important (Eliminate) -> Gray (8)
  let colorId = '1' // default
  if (task.status === 'done') {
    colorId = '8' // Gray
  } else if (task.is_urgent && task.is_important === 'high') {
    colorId = '11' // Red — ด่วน & สำคัญ
  } else if (!task.is_urgent && task.is_important === 'high') {
    colorId = '3'  // Purple — สำคัญ ไม่ด่วน
  } else if (task.is_urgent) {
    colorId = '6'  // Orange — ด่วน ปานกลาง/ต่ำ
  } else if (task.is_important === 'medium') {
    colorId = '9'  // Blueberry — ปานกลาง
  }

  if (task.start_time) {
    return {
      summary: task.title,
      description: task.note || undefined,
      start: { dateTime: `${date}T${task.start_time}:00`, timeZone: TZ },
      end: { dateTime: `${date}T${task.end_time || task.start_time}:00`, timeZone: TZ },
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
    const listRes = await cal.calendarList.list({ minAccessRole: 'reader' })
    const calendarIds = (listRes.data.items ?? []).map(c => c.id!).filter(Boolean)
    if (!calendarIds.includes(CALENDAR_ID)) calendarIds.push(CALENDAR_ID)

    const results = await Promise.all(
      calendarIds.map(calendarId =>
        cal.events.list({
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 500,
        }).then(r => r.data.items ?? []).catch(() => [])
      )
    )

    const seen = new Set<string>()
    const merged: GCalEvent[] = []
    for (const events of results) {
      for (const ev of events) {
        if (ev.id && !seen.has(ev.id)) {
          seen.add(ev.id)
          merged.push(ev as GCalEvent)
        }
      }
    }
    return merged
  } catch {
    return []
  }
}

export async function gcalIsConnected(): Promise<boolean> {
  const cal = getCalendarClient()
  await cal.calendarList.get({ calendarId: CALENDAR_ID })
  return true
}
