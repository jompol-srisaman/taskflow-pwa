'use server'
import { gcalIsConnected } from '@/lib/googleCalendar'
import { gcalFetch } from '@/lib/googleCalendar'
import type { GCalEvent } from '@/lib/googleCalendar'

export async function checkCalendarConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const ok = await gcalIsConnected()
    return { ok }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unknown error' }
  }
}

export async function fetchCalendarEvents(timeMin: string, timeMax: string): Promise<GCalEvent[]> {
  return gcalFetch(timeMin, timeMax)
}
