'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Trophy, Medal, Zap, RefreshCw, Download, Shield } from 'lucide-react'

interface Result {
  id: string
  categoria: string
  colocacao: number
  medal: string | null
  atleta_nome: string
  academia_nome: string
}

interface MedalEntry {
  academia: string
  gold: number
  silver: number
  bronze: number
  total: number
}

const MEDAL_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  gold: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: '🥇' },
  silver: { bg: 'bg-slate-400/20', text: 'text-slate-300', icon: '🥈' },
  bronze: { bg: 'bg-orange-600/20', text: 'text-orange-400', icon: '🥉' },
}

export default function ResultadosPage() {
  const router = useRouter()
  const params = useParams()
  const eventoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [medalBoard, setMedalBoard] = useState<MedalEntry[]>([])
  const [eventoNome, setEventoNome] = useState('')
  const [tab, setTab] = useState<'medalhas' | 'categorias'>('medalhas')

  const load = useCallback(async () => {
    try {
      const [rRes, eRes] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/resultados`),
        fetch(`/api/eventos/${eventoId}`),
      ])
      const rJson = await rRes.json()
      const eJson = await eRes.json()
      if (rRes.ok) { setResults(rJson.results || []); setMedalBoard(rJson.medal_board || []) }
      if (eRes.ok) setEventoNome(eJson.evento?.nome || '')
    } catch { /* silent */ } finally { setLoading(false) }
  }, [eventoId])

  useEffect(() => { load() }, [load])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/resultados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) await load()
      else {
        const json = await res.json()
        alert(json.error || 'Erro ao gerar resultados')
      }
    } catch { /* silent */ } finally { setGenerating(false) }
  }

  // Group results by category
  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    if (!acc[r.categoria]) acc[r.categoria] = []
    acc[r.categoria].push(r)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button onClick={() => router.push(`/portal/eventos/${eventoId}`)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar ao Evento
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Trophy className="w-8 h-8 text-amber-400" />Resultados & Medalhas
              </h1>
              <p className="text-slate-400 text-sm mt-1">{eventoNome}</p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Gerar Resultados
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum resultado</h3>
            <p className="text-slate-400 mb-4">Finalize as chaves e clique em "Gerar Resultados" para criar o quadro de medalhas.</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
              <button onClick={() => setTab('medalhas')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'medalhas' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'}`}>
                <Shield className="w-4 h-4 inline mr-1" />Quadro de Medalhas
              </button>
              <button onClick={() => setTab('categorias')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'categorias' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}>
                <Medal className="w-4 h-4 inline mr-1" />Por Categoria
              </button>
            </div>

            {tab === 'medalhas' ? (
              /* Medal Board */
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-8">#</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Academia</th>
                      <th className="px-4 py-3 text-xs font-semibold text-amber-400 uppercase text-center">Ouro</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-300 uppercase text-center">Prata</th>
                      <th className="px-4 py-3 text-xs font-semibold text-orange-400 uppercase text-center">Bronze</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medalBoard.map((entry, i) => (
                      <tr key={entry.academia} className="border-b border-white/5 hover:bg-white/[0.03]">
                        <td className="px-4 py-3 text-sm font-bold text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-bold text-white">{entry.academia}</td>
                        <td className="px-4 py-3 text-center">
                          {entry.gold > 0 ? <span className="text-lg font-black text-amber-400">{entry.gold}</span> : <span className="text-slate-600">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {entry.silver > 0 ? <span className="text-lg font-black text-slate-300">{entry.silver}</span> : <span className="text-slate-600">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {entry.bronze > 0 ? <span className="text-lg font-black text-orange-400">{entry.bronze}</span> : <span className="text-slate-600">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-white">{entry.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Results by category */
              <div className="space-y-4">
                {Object.entries(grouped).map(([cat, catResults]) => (
                  <div key={cat} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-black/20 border-b border-white/10">
                      <h4 className="text-sm font-bold text-white">{cat}</h4>
                    </div>
                    <div className="divide-y divide-white/5">
                      {catResults.sort((a, b) => a.colocacao - b.colocacao).map(r => {
                        const mc = r.medal ? MEDAL_COLORS[r.medal] : null
                        return (
                          <div key={r.id} className="flex items-center gap-4 px-4 py-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${mc ? mc.bg : 'bg-white/5'} ${mc ? mc.text : 'text-slate-500'}`}>
                              {mc ? mc.icon : r.colocacao}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white truncate">{r.atleta_nome}</div>
                              <div className="text-xs text-slate-500 truncate">{r.academia_nome}</div>
                            </div>
                            <div className={`text-xs font-bold ${mc ? mc.text : 'text-slate-500'}`}>
                              {r.colocacao}o lugar
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
