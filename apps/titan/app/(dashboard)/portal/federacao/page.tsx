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

      const { data: role } = await supabase
        .from('user_roles')
        .select('federacao_id')
        .eq('user_id', user.id)
        .not('federacao_id', 'is', null)
        .limit(1)
        .single()

      if (!role?.federacao_id) return

      // Total academias
      const { count: totalAcademias } = await supabase
        .from('academias')
        .select('*', { count: 'exact', head: true })
        .eq('federacao_id', role.federacao_id)

      // Academias ativas
      const { count: academiasAtivas } = await supabase
        .from('academias')
        .select('*', { count: 'exact', head: true })
        .eq('federacao_id', role.federacao_id)
        .eq('status', 'Ativa')

      // Total atletas
      const { count: totalAtletas } = await supabase
        .from('atletas')
        .select('*', { count: 'exact', head: true })
        .eq('federacao_id', role.federacao_id)

      // Atletas por cidade (top 5)
      const { data: academiasData } = await supabase
        .from('academias')
        .select('id, cidade')
        .eq('federacao_id', role.federacao_id)

      const { data: atletasData } = await supabase
        .from('atletas')
        .select('academia_id')
        .eq('federacao_id', role.federacao_id)

      const cidadeMap = new Map<string, number>()
      const academiaIdToCidade = new Map<string, string>()
      academiasData?.forEach(a => {
        academiaIdToCidade.set(a.id, a.cidade || 'Não definida')
      })

      atletasData?.forEach(a => {
        const cidade = academiaIdToCidade.get(a.academia_id) || 'Não definida'
        cidadeMap.set(cidade, (cidadeMap.get(cidade) || 0) + 1)
      })

      const atletasPorCidade = Array.from(cidadeMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      // Top academias por número de atletas
      const atletasPorAcademia = new Map<string, { nome: string; cidade: string; count: number }>()
      
      const { data: academiasFullData } = await supabase
        .from('academias')
        .select('id, nome, cidade')
        .eq('federacao_id', role.federacao_id)

      academiasFullData?.forEach(a => {
        const count = atletasData?.filter(at => at.academia_id === a.id).length || 0
        atletasPorAcademia.set(a.id, {
          nome: a.nome,
          cidade: a.cidade || '',
          count
        })
      })

      const topAcademias = Array.from(atletasPorAcademia.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(a => ({
          name: a.nome,
          value: a.count,
          subtitle: a.cidade
        }))

      // Calcular crescimento mensal (mock - você pode melhorar com dados reais)
      const crescimentoMensal = 5 // Placeholder

      setData({
        totalAcademias: totalAcademias || 0,
        totalAtletas: totalAtletas || 0,
        academiasAtivas: academiasAtivas || 0,
        crescimentoMensal,
        atletasPorCidade,
        topAcademias
      })
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
            />
            <MetricCard
              title="Atletas Filiados"
              value={data.totalAtletas}
              icon={Users}
              color="green"
            />
            <MetricCard
              title="Academias Ativas"
              value={data.academiasAtivas}
              icon={Trophy}
              color="purple"
            />
            <MetricCard
              title="Crescimento Mensal"
              value={`+${data.crescimentoMensal}`}
              icon={TrendingUp}
              color="orange"
              trend={{ value: data.crescimentoMensal, label: 'novas academias' }}
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
    </div>
  )
}
