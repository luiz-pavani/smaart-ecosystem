'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Play, Pause, ChevronRight, Users, Clock, RefreshCw, Volume2 } from 'lucide-react'

interface MatchInfo {
  id: string
  match_number: number
  tipo: string
  status: string
  bracket_id: string
  athlete1_registration_id: string | null
  athlete2_registration_id: string | null
  athlete1: { dados_atleta: Record<string, unknown> } | null
  athlete2: { dados_atleta: Record<string, unknown> } | null
  bracket?: { id: string; area_id: number; category: { nome_display: string; tempo_luta_seg: number } | null }
}

interface ScoreInfo {
  match_id: string
  clock_seconds: number
  clock_running: boolean
  status: string
  golden_score: boolean
  pontos_athlete1: { wazaari: number; shido: number }
  pontos_athlete2: { wazaari: number; shido: number }
}

interface AreaData {
  area_id: number
  active_match: MatchInfo | null
  score: ScoreInfo | null
  logos: { athlete1: string | null; athlete2: string | null }
  next_matches: { id: string; match_number: number; categoria: string; athlete1_nome: string; athlete2_nome: string }[]
}

export default function TatamesPage() {
  const router = useRouter()
  const { id: eventoId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [eventoNome, setEventoNome] = useState('')
  const [numAreas, setNumAreas] = useState(1)
  const [areas, setAreas] = useState<AreaData[]>([])
  const [calling, setCalling] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/eventos/${eventoId}/scoring/active-all`)
      const json = await res.json()
      setEventoNome(json.evento_nome || '')
      setNumAreas(json.num_areas || 1)
      setAreas(json.areas || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [eventoId])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const iv = setInterval(load, 10000)
    return () => clearInterval(iv)
  }, [load])

  const getName = (m: MatchInfo, side: 1 | 2) => {
    const athlete = side === 1 ? m.athlete1 : m.athlete2
    if (!athlete) return 'TBD'
    const dados = athlete.dados_atleta || {}
    return (dados.nome_completo as string) || (dados.nome as string) || 'Atleta'
  }

  const getAcademia = (m: MatchInfo, side: 1 | 2) => {
    const athlete = side === 1 ? m.athlete1 : m.athlete2
    if (!athlete) return ''
    return (athlete.dados_atleta?.academia as string) || ''
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleCallNext = async (areaId: number) => {
    setCalling(areaId)
    // Find the first ready match for this area
    const area = areas.find(a => a.area_id === areaId)
    if (!area || area.next_matches.length === 0) {
      setCalling(null)
      return
    }
    const nextMatch = area.next_matches[0]
    // Open the scoring page for the next match
    router.push(`/portal/eventos/${eventoId}/scoring/${nextMatch.id}`)
  }

  const statusBadge = (area: AreaData) => {
    if (!area.active_match) return { label: 'Livre', color: 'bg-gray-600 text-gray-300' }
    if (area.score?.status === 'running' || area.score?.clock_running) return { label: 'Em luta', color: 'bg-red-500 text-white animate-pulse' }
    if (area.score?.golden_score) return { label: 'Golden Score', color: 'bg-yellow-500 text-black' }
    if (area.active_match.status === 'in_progress') return { label: 'Pausado', color: 'bg-orange-500 text-white' }
    return { label: 'Pronto', color: 'bg-green-500 text-white' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button onClick={() => router.push(`/portal/eventos/${eventoId}`)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Users className="w-7 h-7 text-cyan-400" />Gestão de Tatames
              </h1>
              <p className="text-slate-400 text-sm mt-1">{eventoNome} — {numAreas} tatame{numAreas > 1 ? 's' : ''}</p>
            </div>
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:text-white text-sm transition-all">
              <RefreshCw className="w-4 h-4" />Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className={`grid gap-4 ${numAreas <= 2 ? 'grid-cols-1 md:grid-cols-2' : numAreas <= 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {Array.from({ length: numAreas }, (_, i) => i + 1).map(areaId => {
              const area = areas.find(a => a.area_id === areaId) || { area_id: areaId, active_match: null, score: null, logos: { athlete1: null, athlete2: null }, next_matches: [] }
              const badge = statusBadge(area)
              const m = area.active_match

              return (
                <div key={areaId} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-black/20 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">Tatame {areaId}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span>
                    </div>
                    {m && area.score && (
                      <span className={`text-lg font-mono font-bold ${area.score.golden_score ? 'text-yellow-400' : 'text-white'}`}>
                        {formatTime(area.score.clock_seconds)}
                      </span>
                    )}
                  </div>

                  {/* Active match */}
                  {m ? (
                    <div className="p-4">
                      <div className="text-xs text-cyan-400 font-medium mb-2">
                        {m.bracket?.category?.nome_display || ''} — Luta #{m.match_number}
                        {m.tipo !== 'main' && <span className="ml-1 text-purple-400">({m.tipo})</span>}
                      </div>

                      {/* Athletes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                          <div>
                            <div className="text-sm font-medium text-white">{getName(m, 1)}</div>
                            <div className="text-xs text-slate-500">{getAcademia(m, 1)}</div>
                          </div>
                          {area.score && (
                            <div className="text-right">
                              <span className="text-lg font-bold text-white">{area.score.pontos_athlete1?.wazaari || 0}</span>
                              <span className="text-xs text-red-400 ml-1">S{area.score.pontos_athlete1?.shido || 0}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-center text-xs text-slate-600 font-bold">VS</div>
                        <div className="flex items-center justify-between bg-blue-500/10 rounded-lg px-3 py-2">
                          <div>
                            <div className="text-sm font-medium text-blue-300">{getName(m, 2)}</div>
                            <div className="text-xs text-slate-500">{getAcademia(m, 2)}</div>
                          </div>
                          {area.score && (
                            <div className="text-right">
                              <span className="text-lg font-bold text-blue-300">{area.score.pontos_athlete2?.wazaari || 0}</span>
                              <span className="text-xs text-red-400 ml-1">S{area.score.pontos_athlete2?.shido || 0}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => router.push(`/portal/eventos/${eventoId}/scoring/${m.id}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 border border-red-500/30 text-sm transition-all"
                        >
                          <Play className="w-3.5 h-3.5" /> Abrir Placar
                        </button>
                        <button
                          onClick={() => window.open(`/eventos/${eventoId}/placar?area=${areaId}`, '_blank')}
                          className="px-3 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 border border-white/10 text-sm transition-all"
                        >
                          Projeção ↗
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500 py-8">
                      <Pause className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma luta ativa</p>
                    </div>
                  )}

                  {/* Next matches queue */}
                  {area.next_matches.length > 0 && (
                    <div className="border-t border-white/10 px-4 py-3 bg-black/10">
                      <div className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Próximas lutas
                      </div>
                      <div className="space-y-1.5">
                        {area.next_matches.map((nm, i) => (
                          <div key={nm.id} className="flex items-center gap-2 text-xs">
                            <span className="text-slate-600 w-4">{i + 1}.</span>
                            <span className="text-slate-400 flex-1 truncate">{nm.athlete1_nome} × {nm.athlete2_nome}</span>
                            <span className="text-slate-600 truncate max-w-[100px]">{nm.categoria}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => handleCallNext(areaId)}
                        disabled={calling === areaId}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 border border-green-500/30 text-xs font-medium transition-all"
                      >
                        <Volume2 className="w-3 h-3" />
                        {calling === areaId ? 'Carregando...' : 'Chamar Próxima Luta'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
