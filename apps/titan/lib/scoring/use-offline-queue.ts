'use client'

import { useEffect, useState, useCallback } from 'react'
import { flushQueue, getQueueSize } from './offline-queue'

/**
 * Hook que monitora estado online + tamanho da fila + auto-flush quando volta.
 */
export function useOfflineQueue() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [queueSize, setQueueSize] = useState<number>(0)
  const [flushing, setFlushing] = useState<boolean>(false)
  const [lastFlush, setLastFlush] = useState<{ sent: number; failed: number; removed: number } | null>(null)

  const refreshQueueSize = useCallback(() => {
    setQueueSize(getQueueSize())
  }, [])

  const flush = useCallback(async () => {
    if (flushing) return
    setFlushing(true)
    try {
      const result = await flushQueue()
      setLastFlush(result)
      refreshQueueSize()
    } finally {
      setFlushing(false)
    }
  }, [flushing, refreshQueueSize])

  useEffect(() => {
    refreshQueueSize()

    const onOnline = () => {
      setOnline(true)
      // dá um respiro pro browser estabelecer a conexão de novo
      setTimeout(() => { flush() }, 500)
    }
    const onOffline = () => setOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // Re-flush periódico (a cada 30s) — cobre casos onde navigator.onLine
    // mente (alguns sistemas reportam online mas request falha).
    const interval = setInterval(() => {
      if (navigator.onLine && getQueueSize() > 0) flush()
      refreshQueueSize()
    }, 30000)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      clearInterval(interval)
    }
  }, [flush, refreshQueueSize])

  return { online, queueSize, flushing, lastFlush, flush, refreshQueueSize }
}
