'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, FileSearch } from 'lucide-react'

interface AuditEvent {
  id: number
  action: string
  delta: Record<string, unknown> | null
  clock_seconds: number | null
  golden_score: boolean | null
  created_at: string
  user: { id: string; nome_completo: string | null } | null
}

interface Props {
  eventoId: string
  bracketId: string
  matchId: string | null
  onClose: () => void
}

const ACTION_LABEL: Record<string, string> = {
  hajime: '▶ Hajime',
  matte: '⏸ Matte',
  golden_score: 'Golden Score iniciado',
  finish: '🏁 Encerrar luta',
  osaekomi_start_1: 'Osaekomi (judogi 1)',
  osaekomi_start_2: 'Osaekomi (judogi 2)',
  osaekomi_stop: 'Fim do osaekomi',
  wazaari_1: 'Waza-ari (1)',
  wazaari_2: 'Waza-ari (2)',
  yuko_1: 'Yuko (1)',
  yuko_2: 'Yuko (2)',
  shido_1: 'Shido (1)',
  shido_2: 'Shido (2)',
  undo_wazaari_1: '↶ Remove waza-ari (1)',
  undo_wazaari_2: '↶ Remove waza-ari (2)',
  undo_yuko_1: '↶ Remove yuko (1)',
  undo_yuko_2: '↶ Remove yuko (2)',
  undo_shido_1: '↶ Remove shido (1)',
  undo_shido_2: '↶ Remove shido (2)',
  swap_athletes: 'Trocar judogis',
}

function formatClock(sec: number | null): string {
  if (sec === null || sec === undefined) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso
  }
}

export default function MatchAuditModal({ eventoId, bracketId, matchId, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!matchId) return
    setLoading(true)
    setError(null)
    fetch(`/api/eventos/${eventoId}/brackets/${bracketId}/matches/${matchId}/audit`)
      .then(r => r.json().then(json => ({ ok: r.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) {
          setError(json.error || 'Erro ao carregar histórico')
          setEvents([])
        } else {
          setEvents(json.events || [])
        }
      })
      .catch(() => setError('Erro de rede'))
      .finally(() => setLoading(false))
  }, [eventoId, bracketId, matchId])

  if (!matchId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-cyan-400" />
            Histórico da luta
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              Sem ações registradas para esta luta ainda.
            </div>
          )}

          {!loading && events.length > 0 && (
            <ol className="space-y-1">
              {events.map(ev => {
                const label = ACTION_LABEL[ev.action] || ev.action
                const user = ev.user?.nome_completo || 'Operador'
                return (
                  <li
                    key={ev.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm"
                  >
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 w-16">
                      {formatTime(ev.created_at)}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono shrink-0 w-14">
                      {formatClock(ev.clock_seconds)}
                      {ev.golden_score && <span className="text-amber-400 ml-1">GS</span>}
                    </span>
                    <span className="flex-1 text-slate-200 truncate">{label}</span>
                    <span className="text-[10px] text-slate-500 shrink-0 truncate max-w-[140px]">
                      {user}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
