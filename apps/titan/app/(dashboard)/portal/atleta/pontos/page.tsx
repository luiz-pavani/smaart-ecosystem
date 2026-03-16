'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Trophy, Star, Zap, Medal, Crown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface HistoryEntry {
  id: string
  tipo: string
  pontos: number
  descricao: string
  created_at: string
}

interface RankEntry {
  athlete_id: string
  nome: string
  total: number
  rank: number
}

const TIPO_ICONS: Record<string, React.ReactNode> = {
  checkin:   <Zap className="w-4 h-4 text-yellow-400" />,
  avaliacao: <Star className="w-4 h-4 text-purple-400" />,
  indicacao: <Trophy className="w-4 h-4 text-green-400" />,
  promocao:  <Medal className="w-4 h-4 text-blue-400" />,
}

const NIVEL_LABELS = [
  { min: 0,    label: 'Iniciante',   color: 'text-gray-400' },
  { min: 100,  label: 'Bronze',      color: 'text-amber-700' },
  { min: 300,  label: 'Prata',       color: 'text-gray-300' },
  { min: 600,  label: 'Ouro',        color: 'text-yellow-400' },
  { min: 1000, label: 'Platina',     color: 'text-cyan-300' },
  { min: 2000, label: 'Diamante',    color: 'text-blue-400' },
]

function getNivel(pts: number) {
  let nivel = NIVEL_LABELS[0]
  for (const n of NIVEL_LABELS) { if (pts >= n.min) nivel = n }
  const nextIdx = NIVEL_LABELS.indexOf(nivel) + 1
  const next = NIVEL_LABELS[nextIdx]
  return { ...nivel, next, progress: next ? ((pts - nivel.min) / (next.min - nivel.min)) * 100 : 100 }
}

export default function PontosPage() {
  const router = useRouter()
  const supabase = createClient()

  const [total, setTotal] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [ranking, setRanking] = useState<RankEntry[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setMyId(user.id)
      const res = await fetch(`/api/atleta/pontos?athlete_id=${user.id}`)
      if (res.ok) {
        const json = await res.json()
        setTotal(json.total || 0)
        setHistory(json.history || [])
        setRanking(json.ranking || [])
        setMyRank(json.myRank || null)
      }
      setLoading(false)
    }
    load()
  }, [])

  const nivel = getNivel(total)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/atleta')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Meus Pontos</h1>
          <p className="text-gray-400 mt-1">Ganhe pontos por frequência e engajamento</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Points card */}
            <div className="bg-gradient-to-br from-purple-600/30 to-blue-600/20 border border-purple-500/30 rounded-2xl p-8 text-center">
              <p className={`text-lg font-bold mb-1 ${nivel.color}`}>{nivel.label}</p>
              <p className="text-6xl font-black text-white mb-2">{total.toLocaleString('pt-BR')}</p>
              <p className="text-gray-400 text-sm">pontos acumulados</p>
              {myRank && (
                <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm font-medium">
                  <Crown className="w-4 h-4" />
                  #{myRank} na sua academia
                </div>
              )}
              {nivel.next && (
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{nivel.label}</span>
                    <span>{nivel.next.label} ({nivel.next.min} pts)</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-400 rounded-full transition-all"
                      style={{ width: `${Math.min(nivel.progress, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* How to earn */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-white font-semibold mb-4">Como ganhar pontos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { tipo: 'checkin',   pts: 10,  label: 'Check-in' },
                  { tipo: 'avaliacao', pts: 5,   label: 'Avaliar aula' },
                  { tipo: 'indicacao', pts: 50,  label: 'Indicação' },
                  { tipo: 'promocao',  pts: 100, label: 'Promoção' },
                ].map(item => (
                  <div key={item.tipo} className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                    <div className="flex justify-center mb-2">{TIPO_ICONS[item.tipo]}</div>
                    <p className="text-white font-bold text-lg">+{item.pts}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* History */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-white font-semibold mb-4">Histórico Recente</h2>
                {history.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Nenhum ponto ainda</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {history.map(h => (
                      <div key={h.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                        {TIPO_ICONS[h.tipo] || <Zap className="w-4 h-4 text-gray-400" />}
                        <div className="flex-1">
                          <p className="text-gray-300 text-sm">{h.descricao}</p>
                          <p className="text-gray-600 text-xs">
                            {new Date(h.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className="text-green-400 font-semibold text-sm">+{h.pontos}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ranking */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-white font-semibold mb-4">Ranking da Academia</h2>
                {ranking.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Sem dados de ranking</p>
                ) : (
                  <div className="space-y-2">
                    {ranking.map(r => (
                      <div
                        key={r.athlete_id}
                        className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
                          r.athlete_id === myId ? 'bg-purple-500/20 border border-purple-500/30' : 'hover:bg-white/5'
                        }`}
                      >
                        <span className={`w-6 text-center font-bold text-sm ${
                          r.rank === 1 ? 'text-yellow-400' : r.rank === 2 ? 'text-gray-300' : r.rank === 3 ? 'text-amber-600' : 'text-gray-500'
                        }`}>
                          {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `${r.rank}º`}
                        </span>
                        <p className={`flex-1 text-sm font-medium ${r.athlete_id === myId ? 'text-purple-300' : 'text-gray-300'}`}>
                          {r.nome}{r.athlete_id === myId ? ' (você)' : ''}
                        </p>
                        <span className="text-white font-semibold text-sm tabular-nums">{r.total.toLocaleString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
