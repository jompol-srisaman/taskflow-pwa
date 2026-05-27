'use client'
import { useEffect } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { isPast, parseISO, isToday } from 'date-fns'

export function useOverdueNotification() {
  const { tasks } = useTaskStore()

  useEffect(() => {
    if (!tasks.length) return

    const overdue = tasks.filter(t =>
      t.status !== 'done' &&
      t.deadline &&
      isPast(parseISO(t.deadline)) &&
      !isToday(parseISO(t.deadline))
    )
    if (!overdue.length) return

    // แจ้งเตือนแค่วันละครั้ง
    const lastNotified = localStorage.getItem('lastOverdueNotif')
    const today = new Date().toDateString()
    if (lastNotified === today) return

    if (!('Notification' in window)) return

    const notify = async () => {
      try {
        // Android Chrome 86+ requires SW notifications — new Notification() throws
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready
          await reg.showNotification('มีงานเกินกำหนด!', {
            body: `${overdue.length} รายการที่เกินกำหนดแล้ว — แตะเพื่อดู`,
            icon: '/icons/icon-192.png',
            tag: 'overdue-tasks',
          })
        } else {
          new Notification('มีงานเกินกำหนด!', {
            body: `${overdue.length} รายการที่เกินกำหนดแล้ว — แตะเพื่อดู`,
            icon: '/icons/icon-192.png',
            tag: 'overdue-tasks',
          })
        }
        localStorage.setItem('lastOverdueNotif', today)
      } catch {
        // Notification failed silently — don't crash the app
      }
    }

    if (Notification.permission === 'granted') {
      notify()
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => { if (p === 'granted') notify() }).catch(() => {})
    }
  }, [tasks])
}
