'use server'
import { gcalIsConnected } from '@/lib/googleCalendar'
import { gcalFetch } from '@/lib/googleCalendar'
import type { GCalEvent } from '@/lib/googleCalendar'

export async function checkCalendarConnection(): Promise<boolean> {
  return gcalIsConnected()
}

export async function fetchCalendarEvents(timeMin: string, timeMax: string): Promise<GCalEvent[]> {
  return gcalFetch(timeMin, timeMax)
}
