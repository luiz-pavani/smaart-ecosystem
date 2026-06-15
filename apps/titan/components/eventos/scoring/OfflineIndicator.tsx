'use client'

import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useOfflineQueue } from '@/lib/scoring/use-offline-queue'

/**
 * Badge compacto no canto: estado online + tamanho da fila.
 *
 * - Online + fila vazia: nada visível (não polui o placar).
 * - Online + fila > 0: ícone de sync + N na fila + spinner se flushing.
 * - Offline: ícone vermelho + "Offline — N ações na fila".
 */
export default function OfflineIndicator() {
  const { online, queueSize, flushing, flush } = useOfflineQueue()

  // Esconde quando tudo OK
  if (online && queueSize === 0 && !flushing) return null

  const label = !online
    ? `Offline — ${queueSize} ação${queueSize !== 1 ? 'ões' : ''} na fila`
    : flushing
      ? `Enviando ${queueSize} ação${queueSize !== 1 ? 'ões' : ''}…`
      : `${queueSize} ação${queueSize !== 1 ? 'ões' : ''} aguardando envio`

  const colorClass = !online
    ? 'bg-red-500/20 border-red-500/40 text-red-200'
    : 'bg-amber-500/20 border-amber-500/40 text-amber-100'

  return (
    <button
      onClick={() => online && flush()}
      disabled={!online || flushing}
      className={`fixed top-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium shadow-lg ${colorClass} disabled:cursor-default`}
    >
      {flushing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : !online ? (
        <WifiOff className="w-3.5 h-3.5" />
      ) : (
        <Wifi className="w-3.5 h-3.5" />
      )}
      <span>{label}</span>
    </button>
  )
}
