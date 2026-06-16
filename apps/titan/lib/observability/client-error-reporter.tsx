'use client'

import { useEffect } from 'react'

/**
 * Captura window.onerror + unhandledrejection e envia pra /api/_log.
 * Dedup local: throttle 5s por (message, url).
 */
export default function ClientErrorReporter() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const lastSent = new Map<string, number>()
    const DEDUP_MS = 5000

    function send(payload: Record<string, unknown>) {
      const key = `${payload.message}::${payload.url}`
      const now = Date.now()
      const last = lastSent.get(key)
      if (last && now - last < DEDUP_MS) return
      lastSent.set(key, now)
      // beacon = fire-and-forget, não bloqueia unload
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
          navigator.sendBeacon('/api/_log', blob)
        } else {
          fetch('/api/_log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {})
        }
      } catch { /* ignore */ }
    }

    function onError(ev: ErrorEvent) {
      send({
        severity: 'error',
        source: 'window.onerror',
        message: ev.message || 'unknown',
        stack: ev.error?.stack || null,
        url: window.location.href,
      })
    }

    function onRejection(ev: PromiseRejectionEvent) {
      const reason = ev.reason
      let message = 'unhandledrejection'
      let stack: string | null = null
      if (reason instanceof Error) {
        message = reason.message
        stack = reason.stack || null
      } else if (typeof reason === 'string') {
        message = reason
      } else {
        try { message = JSON.stringify(reason).slice(0, 200) } catch { /* ignore */ }
      }
      send({
        severity: 'error',
        source: 'unhandledrejection',
        message,
        stack,
        url: window.location.href,
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
