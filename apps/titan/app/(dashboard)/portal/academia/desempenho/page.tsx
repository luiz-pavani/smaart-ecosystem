'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, BarChart3, Loader2, TrendingUp, Users, Activity, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSelectedAcademiaId } from '@/lib/portal/resolveAcademiaId'

const BELT_COLORS: Record<string, string> = {
  'Branca':   '#e5e7eb',
  'Cinza':    '#9ca3af',
  'Amarela':  '#facc15',
  'Laranja':  '#f97316',
  'Verde':    '#22c55e',
  'Azul':     '#3b82f6',
  'Roxa':     '#a855f7',
  'Marrom':   '#92400e',
  'Preta':    '#374151',
  'Vermelha': '#ef4444',
  'Coral':    '#fb7185',
  'Sem faixa':'#6b7280',
}

interface Desempenho {
  total_atletas: number
  atletas_ativos: number
  aulas_ativas: number
  aulas_mes: number
  frequencia_media: number
  retencao: number
  por_faixa: { cor_faixa: string; count: number }[]
  crescimento: { mes: string; novos: number }[]
}

export default function DesempenhoAcademiaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [data, setData] = useState<Desempenho | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const academiaId = getSelectedAcademiaId() || ''
      const params = academiaId ? `?academia_id=${academiaId}` : ''
      const res = await fetch(`/api/academia/desempenho${params}`)
      if (!res.ok) throw new Error((await res.json()).error || 'Erro')
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const maxNovos = data ? Math.max(...data.crescimento.map(m => m.novos), 1) : 1
  const maxFaixa = data ? Math.max(...data.por_faixa.map(f => f.count), 1) : 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/academia')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Desempenho</h1>
              <p className="text-gray-400 mt-1">Visão analítica da evolução da academia</p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center text-red-400">
            {error}
          </div>
        ) : data && (
          <div className="space-y-8">
            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total de Atletas" value={data.total_atletas} color="blue" icon={<Users className="w-5 h-5" />} />
              <StatCard label="Atletas Ativos" value={data.atletas_ativos} color="green" icon={<Activity className="w-5 h-5" />} />
              <StatCard
                label="Freq. Média / Mês"
                value={data.frequencia_media}
                suffix="treinos"
                color="purple"
                icon={<BarChart3 className="w-5 h-5" />}
              />
              <StatCard
                label="Taxa Retenção"
                value={data.retencao}
                suffix="%"
                color="yellow"
                icon={<TrendingUp className="w-5 h-5" />}
              />
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">Turmas Ativas</p>
                <p className="text-2xl font-bold text-white mt-1">{data.aulas_ativas}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">Sessões (30 dias)</p>
                <p className="text-2xl font-bold text-white mt-1">{data.aulas_mes}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Atletas por Faixa */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Atletas por Faixa
                </h3>
                {data.por_faixa.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Sem dados de graduação</p>
                ) : (
                  <div className="space-y-3">
                    {data.por_faixa.map(f => (
                      <div key={f.cor_faixa}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300 flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full inline-block border border-white/20"
                              style={{ background: BELT_COLORS[f.cor_faixa] || '#6b7280' }}
                            />
                            {f.cor_faixa}
                          </span>
                          <span className="text-gray-400 font-medium">{f.count}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${(f.count / maxFaixa) * 100}%`,
                              background: BELT_COLORS[f.cor_faixa] || '#6b7280',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Crescimento Mensal */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Novos Atletas / Mês
                </h3>
                <div className="space-y-3">
                  {data.crescimento.map(m => (
                    <div key={m.mes}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300 capitalize">{m.mes}</span>
                        <span className="text-gray-400 font-medium">{m.novos}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${(m.novos / maxNovos) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {data.crescimento.every(m => m.novos === 0) && (
                  <p className="text-gray-500 text-sm text-center pt-2">
                    Nenhum atleta com data de adesão registrada
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label, value, suffix, color, icon,
}: {
  label: string
  value: number
  suffix?: string
  color: 'blue' | 'green' | 'purple' | 'yellow'
  icon: React.ReactNode
}) {
  const colors = {
    blue:   'from-blue-500/10 to-blue-600/10 border-blue-500/20 text-blue-400',
    green:  'from-green-500/10 to-green-600/10 border-green-500/20 text-green-400',
    purple: 'from-purple-500/10 to-purple-600/10 border-purple-500/20 text-purple-400',
    yellow: 'from-yellow-500/10 to-yellow-600/10 border-yellow-500/20 text-yellow-400',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-5`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-400 text-xs">{label}</p>
        <span className={`opacity-60 ${colors[color].split(' ')[3]}`}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${colors[color].split(' ')[3]}`}>
        {value}
        {suffix && <span className="text-base font-normal ml-1 text-gray-400">{suffix}</span>}
      </p>
    </div>
  )
}
