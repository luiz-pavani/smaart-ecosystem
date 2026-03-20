'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Trophy, Calendar, TrendingUp, Target, Loader2, Building2, Zap, Users, ChevronRight, BookOpen } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { LineChart } from '@/components/dashboard/LineChart'
import { TopList } from '@/components/dashboard/TopList'

interface Progresso {
  graduacao_atual: { cor_faixa: string; kyu_dan: string } | null
  proxima_graduacao: { cor_faixa: string; kyu_dan: string } | null
  checkins: number
  min_checkins: number | null
  checkins_progress: number | null
  months_in_grade: number
  min_months: number | null
  time_progress: number | null
  ready: boolean
  has_rules: boolean
}

interface DashboardData {
  atleta: any
  totalTreinos: number
  treinosUltimos30Dias: number
  progresso: Progresso | null
  historicoLast7Days: { name: string; value: number }[]
  proximosEventos: { name: string; value: string; subtitle: string }[]
}

export default function PortalAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuário não autenticado')
        return
      }

      // Buscar dados do atleta diretamente do stakeholder
      let atleta = null
      try {
        const { data, error } = await supabase
          .from('stakeholders')
          .select('*')
          .eq('id', user.id)
          .single()
        if (error) {
          console.error('Erro ao buscar atleta:', error.message)
        }
        atleta = data || null
      } catch (err) {
        console.error('Erro inesperado ao buscar atleta:', err)
        atleta = null
      }

      // Total check-ins
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [{ count: totalTreinos }, { count: treinosUltimos30Dias }, progressoRes] = await Promise.all([
        supabase.from('class_checkins').select('*', { count: 'exact', head: true }).eq('athlete_id', user.id),
        supabase.from('class_checkins').select('*', { count: 'exact', head: true }).eq('athlete_id', user.id).gte('checkin_date', thirtyDaysAgo.toISOString().split('T')[0]),
        fetch('/api/atletas/self/progresso').then(r => r.json()).catch(() => null),
      ])

      // Histórico últimos 7 dias
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: checkinData } = await supabase
        .from('class_checkins')
        .select('checkin_date')
        .eq('athlete_id', user.id)
        .gte('checkin_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('checkin_date', { ascending: true })

      const dayMap = new Map<string, number>()
      checkinData?.forEach((c: any) => {
        const date = new Date(c.checkin_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        dayMap.set(date, (dayMap.get(date) || 0) + 1)
      })

      const historicoLast7Days = Array.from(dayMap.entries()).map(([name, value]) => ({ name, value }))
      const proximosEventos: any[] = []

      setData({
        atleta,
        totalTreinos: totalTreinos || 0,
        treinosUltimos30Dias: treinosUltimos30Dias || 0,
        progresso: progressoRes?.error ? null : progressoRes,
        historicoLast7Days,
        proximosEventos
      })
    } catch (err) {
      console.error('Erro ao carregar portal do atleta:', err)
      setError('Não foi possível carregar os dados do portal do atleta')
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
            {data?.atleta?.nome_completo && typeof data.atleta.nome_completo === 'string' ? `Olá, ${data.atleta.nome_completo.split(' ')[0]}!` : 'Portal do Atleta'}
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
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 mr-2 animate-spin text-slate-400" />
          <span className="text-slate-400">Carregando dados...</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-200 font-medium mb-3">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : data ? (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              title="Próxima Graduação"
              value={data.progresso?.proxima_graduacao?.cor_faixa ?? '—'}
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
            <button
              onClick={() => router.push('/portal/atleta/desempenho')}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 text-left hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">
                  Progressão para {data.progresso?.proxima_graduacao?.cor_faixa ?? '—'}
                </h3>
                <ChevronRight className="w-4 h-4 text-gray-500 ml-auto group-hover:text-white transition-colors" />
              </div>
              {data.progresso?.has_rules ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Treinos ({data.progresso.checkins}/{data.progresso.min_checkins})</span>
                      <span className="text-white">{data.progresso.checkins_progress ?? 0}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className={`h-2 rounded-full ${(data.progresso.checkins_progress ?? 0) >= 100 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-blue-500 to-blue-400'}`} style={{ width: `${Math.min(100, data.progresso.checkins_progress ?? 0)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Tempo na faixa ({data.progresso.months_in_grade}/{data.progresso.min_months} meses)</span>
                      <span className="text-white">{data.progresso.time_progress ?? 0}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className={`h-2 rounded-full ${(data.progresso.time_progress ?? 0) >= 100 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-orange-500 to-orange-400'}`} style={{ width: `${Math.min(100, data.progresso.time_progress ?? 0)}%` }} />
                    </div>
                  </div>
                  {data.progresso.ready && (
                    <p className="text-green-400 text-sm font-medium">✓ Elegível para promoção!</p>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Ver detalhes da progressão →</p>
              )}
            </button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Minhas Turmas */}
          <button
            onClick={() => router.push('/portal/atleta/turmas')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5
                     hover:from-purple-500/20 hover:to-purple-600/10 border border-purple-500/20 hover:border-purple-500/40
                     transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-600/0
                          group-hover:from-purple-500/10 group-hover:to-purple-600/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4
                            group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Minhas Turmas</h3>
              <p className="text-sm text-slate-400">Horários e check-in</p>
            </div>
          </button>

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

          {/* Progressão */}
          <button
            onClick={() => router.push('/portal/atleta/desempenho')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5
                     hover:from-orange-500/20 hover:to-orange-600/10 border border-orange-500/20 hover:border-orange-500/40
                     transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-600/0
                          group-hover:from-orange-500/10 group-hover:to-orange-600/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4
                            group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Progressão</h3>
              <p className="text-sm text-slate-400">Progresso para próxima faixa</p>
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

          {/* Minha Academia */}
          <button
            onClick={() => router.push('/portal/atleta/academia')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 
                     hover:from-purple-500/20 hover:to-purple-600/10 border border-purple-500/20 hover:border-purple-500/40 
                     transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-600/0 
                          group-hover:from-purple-500/10 group-hover:to-purple-600/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 
                            group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Minha Academia</h3>
              <p className="text-sm text-slate-400">Informações da academia</p>
            </div>
          </button>

          {/* Meus Pontos */}
          <button
            onClick={() => router.push('/portal/atleta/pontos')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-yellow-500/10 to-orange-600/5
                     hover:from-yellow-500/20 hover:to-orange-600/10 border border-yellow-500/20 hover:border-yellow-500/40
                     transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-orange-600/0
                          group-hover:from-yellow-500/10 group-hover:to-orange-600/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4
                            group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Meus Pontos</h3>
              <p className="text-sm text-slate-400">Ranking e histórico de pontos</p>
            </div>
          </button>

          {/* Conta Família */}
          <button
            onClick={() => router.push('/portal/atleta/familia')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-pink-500/10 to-rose-600/5
                     hover:from-pink-500/20 hover:to-rose-600/10 border border-pink-500/20 hover:border-pink-500/40
                     transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-rose-600/0
                          group-hover:from-pink-500/10 group-hover:to-rose-600/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4
                            group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Conta Família</h3>
              <p className="text-sm text-slate-400">Dependentes e membros da família</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
