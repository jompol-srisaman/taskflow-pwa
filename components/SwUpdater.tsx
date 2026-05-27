'use client'
import { useEffect } from 'react'

export function SwUpdater() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.update())
    })

    // Auto-reload when a new SW takes over
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [])

  return null
}
