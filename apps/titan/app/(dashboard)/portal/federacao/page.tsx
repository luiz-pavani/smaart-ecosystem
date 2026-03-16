'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Users, Trophy, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { PieChart } from '@/components/dashboard/PieChart'
import { TopList } from '@/components/dashboard/TopList'

interface DashboardData {
  totalAcademias: number
  totalAtletas: number
  academiasAtivas: number
  crescimentoMensal: number
  totalAnoPassado: number
  deltaFiliados: number
  atletasPorCidade: { name: string; value: number }[]
  topAcademias: { name: string; value: number; subtitle: string }[]
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

      // Total academias
      const academiasQuery = supabase.from('academias').select('*', { count: 'exact', head: true })
      const { count: totalAcademias } = isMaster
        ? await academiasQuery
        : await academiasQuery.eq('federacao_id', perfil.federacao_id)

      // Academias ativas (ativo = true)
      const academiasAtivasQuery = supabase.from('academias').select('*', { count: 'exact', head: true }).eq('ativo', true)
      const { count: academiasAtivas } = isMaster
        ? await academiasAtivasQuery
        : await academiasAtivasQuery.eq('federacao_id', perfil.federacao_id)

      // Total filiados (user_fed_lrsj, federacao_id=1)
      const { data: filiadosData } = await supabase
        .from('user_fed_lrsj')
        .select('academia_id')
        .eq('federacao_id', 1)
      const totalAtletas = (filiadosData || []).length

      // Total filiados mesmo período ano anterior
      const lastYearDate = new Date()
      lastYearDate.setFullYear(lastYearDate.getFullYear() - 1)
      const lastYearStr = lastYearDate.toISOString().split('T')[0]
      const { data: filiadosAnoPassadoData } = await supabase
        .from('user_fed_lrsj')
        .select('id')
        .eq('federacao_id', 1)
        .lte('data_adesao', lastYearStr)
      const totalAnoPassado = (filiadosAnoPassadoData || []).length
      const deltaFiliados = totalAtletas - totalAnoPassado
      const crescimentoPct = totalAnoPassado > 0
        ? Math.round((deltaFiliados / totalAnoPassado) * 100)
        : 0

      // Atletas por cidade — via academia_id → academias.endereco_cidade
      const academiasFullQuery = supabase.from('academias').select('id, nome, endereco_cidade')
      const { data: academiasFullData } = isMaster
        ? await academiasFullQuery
        : await academiasFullQuery.eq('federacao_id', perfil.federacao_id)

      const academiaIdToCidade = new Map<string, string>()
      const academiaIdToNome = new Map<string, string>()
      ;(academiasFullData || []).forEach((a: any) => {
        academiaIdToCidade.set(a.id, a.endereco_cidade || 'Não definida')
        academiaIdToNome.set(a.id, a.nome)
      })

      const cidadeMap = new Map<string, number>()
      const academiaCountMap = new Map<string, number>()
      ;(filiadosData || []).forEach((a: any) => {
        const cidade = academiaIdToCidade.get(a.academia_id) || 'Não definida'
        cidadeMap.set(cidade, (cidadeMap.get(cidade) || 0) + 1)
        if (a.academia_id) academiaCountMap.set(a.academia_id, (academiaCountMap.get(a.academia_id) || 0) + 1)
      })

      const atletasPorCidade = Array.from(cidadeMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      const topAcademias = Array.from(academiaCountMap.entries())
        .map(([id, count]) => ({
          name: academiaIdToNome.get(id) || id,
          value: count,
          subtitle: academiaIdToCidade.get(id) || '',
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      setData({
        totalAcademias: totalAcademias || 0,
        totalAtletas,
        academiasAtivas: academiasAtivas || 0,
        crescimentoMensal: crescimentoPct,
        atletasPorCidade,
        topAcademias,
        totalAnoPassado,
        deltaFiliados,
      } as any)
    } finally {
      setLoading(false)
    }
  }

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
          {/* Academias */}
          <button
            onClick={() => router.push('/portal/federacao/academias')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 
                     hover:from-blue-500/20 hover:to-blue-600/10 border border-blue-500/20 hover:border-blue-500/40 
                     transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-600/0 
                          group-hover:from-blue-500/10 group-hover:to-blue-600/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 
                            group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Academias</h3>
              <p className="text-sm text-slate-400">Gerenciar academias filiadas</p>
            </div>
          </button>

          {/* Atletas */}
          <button
            onClick={() => router.push('/portal/federacao/atletas')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 
                     hover:from-green-500/20 hover:to-green-600/10 border border-green-500/20 hover:border-green-500/40 
                     transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-600/0 
                          group-hover:from-green-500/10 group-hover:to-green-600/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 
                            group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Atletas</h3>
              <p className="text-sm text-slate-400">Ver todos os atletas filiados</p>
            </div>
          </button>

          {/* Competições */}
          <button
            onClick={() => router.push('/portal/federacao/competicoes')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 
                     hover:from-yellow-500/20 hover:to-yellow-600/10 border border-yellow-500/20 hover:border-yellow-500/40 
                     transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-yellow-600/0 
                          group-hover:from-yellow-500/10 group-hover:to-yellow-600/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4 
                            group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Competições</h3>
              <p className="text-sm text-slate-400">Organizar campeonatos</p>
            </div>
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
              title="Total de Filiados"
              value={data.totalAtletas.toLocaleString('pt-BR')}
              icon={Users}
              color="purple"
              onClick={() => router.push('/portal/federacao/atletas')}
            />
            <MetricCard
              title="Crescimento Anual"
              value={`${data.deltaFiliados >= 0 ? '+' : ''}${data.deltaFiliados.toLocaleString('pt-BR')}`}
              icon={TrendingUp}
              color="orange"
              trend={{ value: data.crescimentoMensal, label: `vs ${data.totalAnoPassado.toLocaleString('pt-BR')} em ${new Date(new Date().setFullYear(new Date().getFullYear()-1)).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}` }}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição por cidade */}
            {data.atletasPorCidade.length > 0 && (
              <PieChart
                title="Atletas por Cidade (Top 5)"
                data={data.atletasPorCidade}
                height={300}
              />
            )}

            {/* Top Academias */}
            {data.topAcademias.length > 0 && (
              <TopList
                title="Academias com Mais Atletas"
                items={data.topAcademias}
                valueLabel="atletas"
              />
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
