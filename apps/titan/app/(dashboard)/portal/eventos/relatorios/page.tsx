'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, BarChart3, Loader2, Calendar, Users, TrendingUp, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

interface RelData {
  total_eventos: number; proximos: number; total_inscritos: number
  inscricoes_por_mes: { mes: string; count: number }[]
  eventos_por_mes: { mes: string; count: number }[]
  status_dist: { status: string; count: number }[]
}

export default function RelatoriosEventosPage() {
  const router = useRouter()
  const [data, setData] = useState<RelData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/eventos/relatorios')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const maxInsc = data ? Math.max(...data.inscricoes_por_mes.map(m => m.count), 1) : 1
  const maxEv   = data ? Math.max(...data.eventos_por_mes.map(m => m.count), 1) : 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm">
            <ArrowLeft className="w-5 h-5" />Voltar
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Relatórios de Eventos</h1>
            <button onClick={load} disabled={loading} className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : !data ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-gray-400">Erro ao carregar dados</div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-2"><Calendar className="w-5 h-5 text-blue-400" /><p className="text-gray-400 text-sm">Total de Eventos</p></div>
                <p className="text-3xl font-bold text-blue-400">{data.total_eventos}</p>
                <p className="text-gray-500 text-xs mt-1">{data.proximos} próximos</p>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-green-400" /><p className="text-gray-400 text-sm">Total de Inscrições</p></div>
                <p className="text-3xl font-bold text-green-400">{data.total_inscritos}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-purple-400" /><p className="text-gray-400 text-sm">Média / Evento</p></div>
                <p className="text-3xl font-bold text-purple-400">
                  {data.total_eventos > 0 ? (data.total_inscritos / data.total_eventos).toFixed(1) : '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-5 flex items-center gap-2"><BarChart3 className="w-5 h-5" />Inscrições / Mês</h3>
                <div className="space-y-3">
                  {data.inscricoes_por_mes.map(m => (
                    <div key={m.mes}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300 capitalize">{m.mes}</span>
                        <span className="text-gray-400 font-medium">{m.count}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${(m.count / maxInsc) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-5 flex items-center gap-2"><Calendar className="w-5 h-5" />Eventos / Mês</h3>
                <div className="space-y-3">
                  {data.eventos_por_mes.map(m => (
                    <div key={m.mes}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300 capitalize">{m.mes}</span>
                        <span className="text-gray-400 font-medium">{m.count}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${(m.count / maxEv) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {data.status_dist.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Por status</p>
                    <div className="space-y-2">
                      {data.status_dist.map(s => (
                        <div key={s.status} className="flex justify-between text-sm">
                          <span className="text-gray-400">{s.status}</span>
                          <span className="text-white font-medium">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
