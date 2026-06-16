'use client'

import { useState } from 'react'
import { Check, Loader2, Clock, FileSearch } from 'lucide-react'

interface MatchData {
  id: string
  match_number: number
  rodada: number
  posicao: number
  tipo: string
  status: string
  winner_registration_id: string | null
  athlete1_registration_id: string | null
  athlete2_registration_id: string | null
  finished_by?: string | null
  confirmed_by?: string | null
  confirmed_at?: string | null
}

interface SlotData {
  id: string
  rodada: number
  posicao: number
  registration_id: string | null
  registration?: { id: string; dados_atleta: Record<string, unknown> } | null
}

interface Props {
  eventoId: string
  bracketId: string
  matches: MatchData[]
  slots: SlotData[]
  onAfterChange?: () => Promise<void> | void
  onOpenAudit?: (matchId: string) => void
}

function getAthleteName(regId: string | null, slots: SlotData[]): string {
  if (!regId) return '—'
  const slot = slots.find(s => s.registration_id === regId)
  const dados = (slot?.registration?.dados_atleta || {}) as Record<string, unknown>
  return (dados.nome_completo as string) || (dados.nome as string) || 'Atleta'
}

/**
 * Painel lateral que lista matches finalizados aguardando sign-off + permite
 * confirmar (botão Check) ou abrir histórico de audit (botão FileSearch).
 *
 * Só matches com status='finished' E confirmed_by=null aparecem.
 * Matches já confirmados ficam invisíveis aqui (vão pra histórico).
 */
export default function MatchSignOffPanel({
  eventoId,
  bracketId,
  matches,
  slots,
  onAfterChange,
  onOpenAudit,
}: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pending = matches.filter(m => m.status === 'finished' && !m.confirmed_by)

  if (pending.length === 0) return null

  const confirmMatch = async (matchId: string) => {
    setConfirmingId(matchId)
    setError(null)
    try {
      const res = await fetch(
        `/api/eventos/${eventoId}/brackets/${bracketId}/matches/${matchId}/sign-off`,
        { method: 'POST' }
      )
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Erro ao confirmar')
        return
      }
      await onAfterChange?.()
    } catch {
      setError('Erro de rede')
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3 mb-3">
        <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-200">
            {pending.length} luta{pending.length !== 1 ? 's' : ''} aguardando confirmação
          </h3>
          <p className="text-xs text-amber-300/70 mt-0.5">
            Outro membro da mesa precisa confirmar o resultado para considerá-lo oficial.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {pending.map(m => {
          const winnerName = getAthleteName(m.winner_registration_id, slots)
          const a1 = getAthleteName(m.athlete1_registration_id, slots)
          const a2 = getAthleteName(m.athlete2_registration_id, slots)
          const isConfirming = confirmingId === m.id
          return (
            <div
              key={m.id}
              className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3"
            >
              <span className="text-[10px] font-mono text-slate-500 shrink-0 w-8">
                #{m.match_number}
              </span>
              <div className="flex-1 min-w-0 text-xs">
                <div className="text-slate-400 truncate">
                  {a1} <span className="text-slate-600">vs</span> {a2}
                </div>
                <div className="text-green-300 font-medium truncate">
                  Vencedor: {winnerName}
                </div>
              </div>
              {onOpenAudit && (
                <button
                  onClick={() => onOpenAudit(m.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  title="Ver histórico"
                >
                  <FileSearch className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => confirmMatch(m.id)}
                disabled={isConfirming}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/30 rounded-lg text-green-300 text-xs font-medium hover:bg-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Confirmar
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
