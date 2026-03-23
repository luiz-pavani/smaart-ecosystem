'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Building2, AlertCircle, CheckCircle2, Loader2, RefreshCw, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface FinData {
  atletas: { total: number; ativos: number; vencidos: number; pendentes: number; vencendo: number }
  academias: { total: number; ativas: number; vencendo: number; vencidas: number }
  novos_por_mes: { mes: string; count: number }[]
}

export default function FinanceiroFederacaoPage() {
  const router = useRouter()
  const [data, setData] = useState<FinData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/federacao/financeiro')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const maxNovos = data ? Math.max(...data.novos_por_mes.map(m => m.count), 1) : 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="w-5 h-5" />Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Financeiro</h1>
              <p className="text-gray-400 mt-1">Visão de filiações e anuidades</p>
            </div>
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
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />Filiações de Atletas
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total" value={data.atletas.total} color="slate" />
                <StatCard label="Plano Válido" value={data.atletas.ativos} color="green" icon={<CheckCircle2 className="w-4 h-4" />} />
                <StatCard label="Vencendo (30d)" value={data.atletas.vencendo} color="yellow" icon={<AlertCircle className="w-4 h-4" />} />
                <StatCard label="Vencido" value={data.atletas.vencidos} color="red" icon={<AlertCircle className="w-4 h-4" />} />
              </div>
              {data.atletas.pendentes > 0 && (
                <p className="mt-2 text-sm text-gray-500">{data.atletas.pendentes} atleta{data.atletas.pendentes > 1 ? 's' : ''} sem plano definido</p>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />Anuidades de Academias
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Total" value={data.academias.total} color="slate" />
                <StatCard label="Vencendo (30d)" value={data.academias.vencendo} color="yellow" icon={<AlertCircle className="w-4 h-4" />} />
                <StatCard label="Vencida" value={data.academias.vencidas} color="red" icon={<AlertCircle className="w-4 h-4" />} />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />Novas Filiações / Mês
              </h3>
              <div className="space-y-3">
                {data.novos_por_mes.map(m => (
                  <div key={m.mes}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300 capitalize">{m.mes}</span>
                      <span className="text-gray-400 font-medium">{m.count}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(m.count / maxNovos) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-300">
              <strong>Nota:</strong> Esta visão mostra o status de filiações e anuidades. Para gestão de pagamentos e receitas, integre com uma solução financeira dedicada.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  const map: Record<string, string> = {
    slate:  'from-slate-500/10 to-slate-600/10 border-slate-500/20 text-slate-300',
    green:  'from-green-500/10 to-green-600/10 border-green-500/20 text-green-400',
    yellow: 'from-yellow-500/10 to-yellow-600/10 border-yellow-500/20 text-yellow-400',
    red:    'from-red-500/10 to-red-600/10 border-red-500/20 text-red-400',
  }
  const parts = (map[color] || map.slate).split(' ')
  return (
    <div className={`bg-gradient-to-br ${parts[0]} ${parts[1]} border ${parts[2]} rounded-lg p-5`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-gray-400 text-xs">{label}</p>
        {icon && <span className={`${parts[3]} opacity-60`}>{icon}</span>}
      </div>
      <p className={`text-3xl font-bold ${parts[3]}`}>{value}</p>
    </div>
  )
}
