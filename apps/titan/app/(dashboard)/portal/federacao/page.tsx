'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Users, Trophy, TrendingUp, UserCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TopList } from '@/components/dashboard/TopList'

interface DashboardData {
  totalAcademias: number
  academiasAtivas: number
  totalFiliados: number
  filiadosAtivos: number
  deltaFiliados: number
  crescimentoPct: number
  totalAnoPassado: number
  ativosPorFiliada: { name: string; value: number; subtitle: string }[]
  topAcademias: { name: string; value: number; subtitle: string }[]
}

function BarChart({ data, title }: { data: { name: string; value: number; subtitle: string }[]; title: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-5">{title}</h3>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300 truncate max-w-[200px]" title={item.name}>{item.name}</span>
              <span className="text-sm font-semibold text-white tabular-nums ml-2">{item.value}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            {item.subtitle && <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PortalFederacaoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfilArr } = await supabase
        .from('stakeholders')
        .select('role, federacao_id')
        .eq('id', user.id)
        .limit(1)

      const perfil = perfilArr?.[0]
      if (!perfil) return

      const isMaster = perfil.role === 'master_access'
      if (!isMaster && !perfil.federacao_id) return

      // Use API route with supabaseAdmin to bypass RLS
      const params = new URLSearchParams()
      if (!isMaster && perfil.federacao_id) params.set('federacao_id', perfil.federacao_id)

      const res = await fetch(`/api/federacao/dashboard?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar stats')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const anoPassadoLabel = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Portal da Federação</h1>
          <p className="text-slate-400">Visão geral e gestão da federação</p>
        </div>
        <button
          onClick={() => router.push('/portal')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10
                   text-slate-300 hover:text-white transition-all border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {/* Quick Access Grid */}
      <div className="pt-4">
        <h2 className="text-xl font-semibold text-white mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/portal/federacao/academias')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5
                     hover:from-blue-500/20 hover:to-blue-600/10 border border-blue-500/20 hover:border-blue-500/40
                     transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Academias</h3>
            <p className="text-sm text-slate-400">Gerenciar academias filiadas</p>
          </button>

          <button
            onClick={() => router.push('/portal/federacao/atletas')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-green-500/10 to-green-600/5
                     hover:from-green-500/20 hover:to-green-600/10 border border-green-500/20 hover:border-green-500/40
                     transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Atletas</h3>
            <p className="text-sm text-slate-400">Ver todos os atletas filiados</p>
          </button>

          <button
            onClick={() => router.push('/portal/federacao/competicoes')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5
                     hover:from-yellow-500/20 hover:to-yellow-600/10 border border-yellow-500/20 hover:border-yellow-500/40
                     transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Competições</h3>
            <p className="text-sm text-slate-400">Organizar campeonatos</p>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando dados...</div>
      ) : data ? (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total de Academias"
              value={data.totalAcademias}
              icon={Building2}
              color="blue"
              onClick={() => router.push('/portal/federacao/academias')}
            />
            <MetricCard
              title="Academias Ativas"
              value={data.academiasAtivas}
              icon={Trophy}
              color="green"
              onClick={() => router.push('/portal/federacao/academias')}
            />
            <MetricCard
              title="Filiados Ativos"
              value={data.filiadosAtivos.toLocaleString('pt-BR')}
              icon={UserCheck}
              color="purple"
              onClick={() => router.push('/portal/federacao/atletas')}
            />
            <MetricCard
              title="Crescimento Anual"
              value={`${data.deltaFiliados >= 0 ? '+' : ''}${data.deltaFiliados.toLocaleString('pt-BR')}`}
              icon={TrendingUp}
              color="orange"
              trend={{ value: data.crescimentoPct, label: `vs ${data.totalAnoPassado.toLocaleString('pt-BR')} em ${anoPassadoLabel}` }}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarChart
              title="Atletas Ativos por Filiada (Top 10)"
              data={data.ativosPorFiliada}
            />
            <TopList
              title="Top Filiadas por Total de Atletas"
              items={data.topAcademias}
              valueLabel="atletas"
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
