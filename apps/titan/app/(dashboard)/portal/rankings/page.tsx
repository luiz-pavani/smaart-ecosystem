'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Trophy, Medal, Filter, Search } from 'lucide-react'

interface RankEntry {
  atleta_id: string
  nome: string
  academia: string
  total_pontos: number
  eventos: number
  ouros: number
  pratas: number
  bronzes: number
}

export default function RankingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [ranking, setRanking] = useState<RankEntry[]>([])
  const [genero, setGenero] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (genero) qs.set('genero', genero)
      const res = await fetch(`/api/rankings?${qs}`)
      const json = await res.json()
      setRanking(json.ranking || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [genero])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? ranking.filter(r => r.nome.toLowerCase().includes(search.toLowerCase()) || r.academia.toLowerCase().includes(search.toLowerCase()))
    : ranking

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Trophy className="w-7 h-7 text-yellow-400" />Ranking de Atletas
          </h1>
          <p className="text-slate-400 text-sm mt-1">Pontuação acumulada em todos os eventos</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar atleta ou academia..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500"
            />
          </div>
          <select value={genero} onChange={e => setGenero(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">Todos</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dado de ranking disponível</p>
            <p className="text-xs mt-1">Gere os pontos de ranking na página de resultados de cada evento</p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-12">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Atleta</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Academia</th>
                  <th className="px-4 py-3 text-xs font-semibold text-yellow-400 uppercase text-center">Pts</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase text-center">Eventos</th>
                  <th className="px-4 py-3 text-xs font-semibold text-amber-400 uppercase text-center">🥇</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-300 uppercase text-center">🥈</th>
                  <th className="px-4 py-3 text-xs font-semibold text-orange-400 uppercase text-center">🥉</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.atleta_id} className={`border-b border-white/5 hover:bg-white/[0.03] ${i < 3 ? 'bg-yellow-500/5' : ''}`}>
                    <td className="px-4 py-3 text-sm font-bold text-slate-500">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-white">{r.nome}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{r.academia || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-black text-yellow-400">{r.total_pontos}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-400">{r.eventos}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-amber-400">{r.ouros || '-'}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-slate-300">{r.pratas || '-'}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-orange-400">{r.bronzes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
