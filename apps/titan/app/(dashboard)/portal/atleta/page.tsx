'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Trophy, Calendar, TrendingUp, Target } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { LineChart } from '@/components/dashboard/LineChart'
import { TopList } from '@/components/dashboard/TopList'

interface DashboardData {
  atleta: any
  totalTreinos: number
  treinosUltimos30Dias: number
  sequenciaAtual: number
  proximaGraduacao: string
  historicoLast7Days: { name: string; value: number }[]
  proximosEventos: { name: string; value: string; subtitle: string }[]
}

export default function PortalAtletaPage() {
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
        .select('atleta_id')
        .eq('user_id', user.id)
        .not('atleta_id', 'is', null)
        .limit(1)
        .single()

      if (!role?.atleta_id) return

      // Buscar dados do atleta
      const { data: atleta } = await supabase
        .from('atletas')
        .select('*')
        .eq('id', role.atleta_id)
        .single()

      // Total de treinos (presencas)
      const { count: totalTreinos } = await supabase
        .from('athlete_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('athlete_id', role.atleta_id)

      // Treinos últimos 30 dias
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { count: treinosUltimos30Dias } = await supabase
        .from('athlete_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('athlete_id', role.atleta_id)
        .gte('created_at', thirtyDaysAgo.toISOString())

      // Histórico últimos 7 dias (agrupado por dia)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data: attendanceData } = await supabase
        .from('athlete_attendance')
        .select('created_at')
        .eq('athlete_id', role.atleta_id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      const dayMap = new Map<string, number>()
      attendanceData?.forEach(a => {
        const date = new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        dayMap.set(date, (dayMap.get(date) || 0) + 1)
      })

      const historicoLast7Days = Array.from(dayMap.entries()).map(([name, value]) => ({ name, value }))

      // Sequência atual (mock - você pode melhorar)
      const sequenciaAtual = 3

      // Próxima graduação
      const graduacoes = ['Branca', '1ª Faixa Cinza', '2ª Faixa Cinza', '3ª Faixa Cinza', 'Amarela', 'Laranja', 'Verde', 'Roxa', 'Marrom', 'Preta']
      const currentGradIndex = graduacoes.indexOf(atleta?.graduacao || 'Branca')
      const proximaGraduacao = currentGradIndex < graduacoes.length - 1 ? graduacoes[currentGradIndex + 1] : 'Máxima'

      // Próximos eventos (mock - você pode implementar com tabela de event_registrations)
      const proximosEventos: any[] = []

      setData({
        atleta,
        totalTreinos: totalTreinos || 0,
        treinosUltimos30Dias: treinosUltimos30Dias || 0,
        sequenciaAtual,
        proximaGraduacao,
        historicoLast7Days,
        proximosEventos
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
          <h1 className="text-3xl font-bold text-white mb-2">
            {data?.atleta ? `Olá, ${data.atleta.nome.split(' ')[0]}!` : 'Portal do Atleta'}
          </h1>
          <p className="text-slate-400">Acompanhe seu progresso e evolução</p>
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
              title="Total de Treinos"
              value={data.totalTreinos}
              icon={Trophy}
              color="purple"
            />
            <MetricCard
              title="Últimos 30 Dias"
              value={data.treinosUltimos30Dias}
              icon={Calendar}
              color="blue"
            />
            <MetricCard
              title="Sequência Atual"
              value={`${data.sequenciaAtual} dias`}
              icon={TrendingUp}
              color="green"
              trend={{ value: data.sequenciaAtual, label: 'consecutivos' }}
            />
            <MetricCard
              title="Próxima Graduação"
              value={data.proximaGraduacao}
              icon={Target}
              color="orange"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Histórico de frequência */}
            {data.historicoLast7Days.length > 0 && (
              <LineChart
                title="Frequência (Últimos 7 Dias)"
                data={data.historicoLast7Days}
                color="#8b5cf6"
                height={300}
              />
            )}

            {/* Progresso de graduação */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">Progresso para {data.proximaGraduacao}</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Tempo mínimo</span>
                    <span className="text-white">75%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Frequência mínima</span>
                    <span className="text-white">60%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full" style={{ width: '60%' }} />
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-slate-400">
                    Continue treinando para atingir os requisitos da próxima graduação!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Próximos Eventos */}
          {data.proximosEventos.length > 0 && (
            <TopList
              title="Próximos Eventos"
              items={data.proximosEventos}
              valueLabel=""
            />
          )}
        </>
      ) : null}

      {/* Quick Access Grid */}
      <div className="pt-4">
        <h2 className="text-xl font-semibold text-white mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Frequência */}
          <button
            onClick={() => router.push('/portal/atleta/frequencia')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 
                     hover:from-green-500/20 hover:to-green-600/10 border border-green-500/20 hover:border-green-500/40 
                     transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-600/0 
                          group-hover:from-green-500/10 group-hover:to-green-600/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 
                            group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Frequência</h3>
              <p className="text-sm text-slate-400">Histórico de presença</p>
            </div>
          </button>

          {/* Perfil */}
          <button
            onClick={() => router.push('/portal/atleta/perfil')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 
                     hover:from-blue-500/20 hover:to-blue-600/10 border border-blue-500/20 hover:border-blue-500/40 
                     transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-600/0 
                          group-hover:from-blue-500/10 group-hover:to-blue-600/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 
                            group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Meu Perfil</h3>
              <p className="text-sm text-slate-400">Dados cadastrais</p>
            </div>
          </button>

          {/* Eventos */}
          <button
            onClick={() => router.push('/portal/atleta/eventos')}
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
              <h3 className="text-lg font-semibold text-white mb-2">Eventos</h3>
              <p className="text-sm text-slate-400">Competições e treinos</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
