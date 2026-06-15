'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Trophy, Medal, Download, Loader2 } from 'lucide-react'

interface Result {
  id: string
  categoria: string
  category_id: string
  colocacao: number
  medal: string
  atleta_nome: string
  academia_nome: string
}

interface MedalRow {
  academia_id: string | null
  academia_nome: string
  logo_url: string | null
  colocacao: number
  gold: number
  silver: number
  bronze: number
  total: number
}

interface Evento {
  id: string
  nome: string
  data_evento: string
  local: string
}

export default function ResultadosPublicoPage() {
  const { id } = useParams<{ id: string }>()
  const [evento, setEvento] = useState<Evento | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [medalBoard, setMedalBoard] = useState<MedalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'medalhas' | 'categorias'>('medalhas')
  const [catFilter, setCatFilter] = useState<string>('')

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/eventos/${id}/resultados`).then(r => r.json()),
      fetch(`/api/eventos/${id}/resultados/medalhao`).then(r => r.json()),
      fetch(`/api/eventos/${id}`).then(r => r.json()).catch(() => null),
    ]).then(([resData, medData, evtData]) => {
      setResults(resData.results || [])
      // Novo medalhão (com logos + academia_id agrupado corretamente).
      setMedalBoard(medData.medalhao || [])
      if (evtData?.evento) setEvento(evtData.evento)
      setLoading(false)
    })
  }, [id])

  const categories = [...new Set(results.map(r => r.categoria))].sort()

  const filteredResults = catFilter
    ? results.filter(r => r.categoria === catFilter)
    : results

  // Group by category
  const grouped: Record<string, Result[]> = {}
  for (const r of filteredResults) {
    if (!grouped[r.categoria]) grouped[r.categoria] = []
    grouped[r.categoria].push(r)
  }

  const medalColor = (medal: string) => {
    if (medal === 'gold') return 'text-yellow-400'
    if (medal === 'silver') return 'text-gray-300'
    if (medal === 'bronze') return 'text-amber-600'
    return 'text-gray-500'
  }

  const medalEmoji = (medal: string) => {
    if (medal === 'gold') return '🥇'
    if (medal === 'silver') return '🥈'
    if (medal === 'bronze') return '🥉'
    return ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-600/20 via-gray-900 to-amber-600/20 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl font-bold">Resultados</h1>
          </div>
          {evento && (
            <div className="text-gray-400">
              <p className="text-lg text-white">{evento.nome}</p>
              <p>{evento.data_evento} — {evento.local}</p>
            </div>
          )}
          <div className="flex items-center gap-3 mt-4">
            <a
              href={`/api/eventos/${id}/resultados/pdf`}
              target="_blank"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" /> PDF Geral
            </a>
            {catFilter && (
              <a
                href={`/api/eventos/${id}/resultados/pdf?category=${encodeURIComponent(catFilter)}`}
                target="_blank"
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 rounded text-sm flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" /> PDF Categoria
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('medalhas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'medalhas' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            <Medal className="w-4 h-4 inline mr-1" /> Quadro de Medalhas
          </button>
          <button
            onClick={() => setTab('categorias')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'categorias' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            <Trophy className="w-4 h-4 inline mr-1" /> Por Categoria
          </button>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhum resultado publicado ainda</p>
          </div>
        ) : tab === 'medalhas' ? (
          /* Medal Board */
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-gray-400 text-sm">#</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm">Academia</th>
                  <th className="text-center px-4 py-3 text-yellow-400 text-sm">🥇</th>
                  <th className="text-center px-4 py-3 text-gray-300 text-sm">🥈</th>
                  <th className="text-center px-4 py-3 text-amber-600 text-sm">🥉</th>
                  <th className="text-center px-4 py-3 text-gray-400 text-sm">Total</th>
                </tr>
              </thead>
              <tbody>
                {medalBoard.map((row, i) => {
                  const isTop3 = (row.colocacao ?? i + 1) <= 3
                  const medalEmoji = row.colocacao === 1 ? '🥇' : row.colocacao === 2 ? '🥈' : row.colocacao === 3 ? '🥉' : null
                  return (
                    <tr
                      key={row.academia_id || row.academia_nome}
                      className={`border-b border-gray-800/50 ${isTop3 ? 'bg-yellow-500/5' : ''}`}
                    >
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {medalEmoji ? (
                          <span className="text-base">{medalEmoji}</span>
                        ) : (
                          <span>{row.colocacao ?? i + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {row.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.logo_url} alt="" className="w-8 h-8 rounded-full object-cover bg-gray-800 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 text-xs text-gray-500">
                              {row.academia_nome.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{row.academia_nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-yellow-400 font-bold">{row.gold || '-'}</td>
                      <td className="px-4 py-3 text-center text-gray-300 font-bold">{row.silver || '-'}</td>
                      <td className="px-4 py-3 text-center text-amber-600 font-bold">{row.bronze || '-'}</td>
                      <td className="px-4 py-3 text-center text-white font-bold">{row.total}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Results by Category */
          <div>
            {/* Category filter */}
            <div className="mb-4">
              <select
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Todas as categorias</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catResults]) => (
                <div key={cat} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 font-medium text-sm">
                    {cat}
                  </div>
                  <div className="divide-y divide-gray-800/50">
                    {catResults.sort((a, b) => a.colocacao - b.colocacao).map(r => (
                      <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                        <span className="text-xl">{medalEmoji(r.medal)}</span>
                        <div className="flex-1">
                          <span className={`font-medium ${medalColor(r.medal)}`}>{r.atleta_nome || 'Atleta'}</span>
                          {r.academia_nome && (
                            <span className="text-gray-500 text-sm ml-2">— {r.academia_nome}</span>
                          )}
                        </div>
                        <span className="text-gray-500 text-sm">{r.colocacao}º</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
