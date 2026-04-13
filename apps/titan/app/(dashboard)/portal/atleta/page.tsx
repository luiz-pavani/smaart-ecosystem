'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Trophy, Calendar, TrendingUp, Target, Loader2, Building2, Zap, Users, ChevronRight, BookOpen, QrCode, AlertTriangle, X, ClipboardCheck, GraduationCap, MapPin, Clock, CreditCard } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { LineChart } from '@/components/dashboard/LineChart'
import { TopList } from '@/components/dashboard/TopList'

interface Notificacao {
  tipo: string
  titulo: string
  mensagem: string
  urgencia: 'info' | 'warning' | 'danger'
}

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

interface CandidatoEvent {
  id: string
  titulo: string
  descricao?: string
  data: string
  hora?: string
  local?: string
  tipo?: string
}

interface DashboardData {
  atleta: any
  totalTreinos: number
  treinosUltimos30Dias: number
  progresso: Progresso | null
  historicoLast7Days: { name: string; value: number }[]
  proximosEventos: { name: string; value: string; subtitle: string }[]
  candidatoNextEvent: CandidatoEvent | null
  isCandidato: boolean
}

export default function PortalAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [dismissedNots, setDismissedNots] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadDashboardData()
    fetch('/api/atletas/self/notificacoes')
      .then(r => r.json())
      .then(d => setNotificacoes(d.notificacoes || []))
      .catch(() => {})
  }, [])

  async function loadDashboardData() {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuário não autenticado')
        return
      }

      // Buscar nome do atleta: stakeholders primeiro, fallback para user_fed_lrsj
      let atleta = null
      try {
        const { data } = await supabase
          .from('stakeholders')
          .select('*')
          .eq('id', user.id)
          .single()
        atleta = data || null
      } catch {
        atleta = null
      }

      // Se não tem stakeholder (cadastrado via import/auto-cadastro), busca em user_fed_lrsj
      if (!atleta?.nome_completo) {
        try {
          const { data: fedData } = await supabase
            .from('user_fed_lrsj')
            .select('nome_completo')
            .eq('stakeholder_id', user.id)
            .maybeSingle()
          if (fedData?.nome_completo) {
            atleta = { ...(atleta || {}), nome_completo: fedData.nome_completo }
          }
        } catch { /* silent */ }
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

      // Candidato banner: only fetch if stakeholder.candidato is true
      let candidatoNextEvent: CandidatoEvent | null = null
      const isCandidato = !!(atleta?.candidato || atleta?.master_access)
      if (isCandidato) {
        try {
          const candidatoData = await fetch('/api/candidato/dados').then(r => r.json())
          const today = new Date().toISOString().split('T')[0]
          const upcoming = (candidatoData.federation_schedule || [])
            .filter((ev: any) => ev.data >= today)
            .sort((a: any, b: any) => a.data.localeCompare(b.data))
          candidatoNextEvent = upcoming[0] || null
        } catch { /* silent */ }
      }

      setData({
        atleta,
        totalTreinos: totalTreinos || 0,
        treinosUltimos30Dias: treinosUltimos30Dias || 0,
        progresso: progressoRes?.error ? null : progressoRes,
        historicoLast7Days,
        proximosEventos,
        candidatoNextEvent,
        isCandidato,
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
      {/* Notificações in-app */}
      {notificacoes.filter(n => !dismissedNots.has(n.tipo)).map(n => {
        const colors = {
          danger:  'bg-red-500/10 border-red-500/30 text-red-300',
          warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
          info:    'bg-blue-500/10 border-blue-500/30 text-blue-300',
        }
        return (
          <div key={n.tipo} className={`flex items-start gap-3 border rounded-xl px-4 py-3 text-sm ${colors[n.urgencia]}`}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">{n.titulo}: </span>
              {n.mensagem}
            </div>
            <button onClick={() => setDismissedNots(prev => new Set([...prev, n.tipo]))}>
              <X className="w-4 h-4 opacity-60 hover:opacity-100 transition-opacity" />
            </button>
          </div>
        )
      })}

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

          {/* Banner — próximo evento do Portal do Candidato */}
          {data.isCandidato && data.candidatoNextEvent && (() => {
            const ev = data.candidatoNextEvent!
            const TIPO_COLORS: Record<string, string> = {
              exame: 'from-red-600/20 to-red-900/10 border-red-600/30 text-red-400',
              treino: 'from-blue-600/20 to-blue-900/10 border-blue-600/30 text-blue-400',
              seminario: 'from-purple-600/20 to-purple-900/10 border-purple-600/30 text-purple-400',
              reuniao: 'from-yellow-600/20 to-yellow-900/10 border-yellow-600/30 text-yellow-400',
            }
            const tipoKey = ev.tipo?.toLowerCase() || ''
            const colorClass = TIPO_COLORS[tipoKey] || 'from-slate-600/20 to-slate-900/10 border-slate-600/30 text-slate-400'
            const dateFormatted = new Date(ev.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
            return (
              <div className={`bg-gradient-to-r ${colorClass} border rounded-2xl p-5 flex items-center gap-5`}>
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/5 flex flex-col items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-current opacity-80" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-0.5">Próximo evento — Candidato</p>
                  <p className="text-white font-bold text-base truncate">{ev.titulo}</p>
                  <div className="flex flex-wrap gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />{dateFormatted}
                    </span>
                    {ev.hora && <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="w-3.5 h-3.5" />{ev.hora}</span>}
                    {ev.local && <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin className="w-3.5 h-3.5" />{ev.local}</span>}
                  </div>
                </div>
                <button
                  onClick={() => router.push('/portal/candidato/cronograma')}
                  className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors whitespace-nowrap"
                >
                  Ver Cronograma
                </button>
              </div>
            )
          })()}

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

        {/* Linha 1 — 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Treinos & Check-in */}
          <button
            onClick={() => router.push('/portal/atleta/turmas')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10
                     hover:from-emerald-500/30 hover:to-emerald-600/20 border border-emerald-500/40 hover:border-emerald-500/60
                     transition-all duration-300 text-left ring-1 ring-emerald-500/20"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/30 flex items-center justify-center mb-4
                            group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Treinos & Check-in</h3>
              <p className="text-sm text-emerald-400 font-medium">Turmas, horários e presença →</p>
            </div>
          </button>

          {/* Meu Perfil */}
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
              <h3 className="text-lg font-semibold text-white mb-1">Meu Perfil</h3>
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
              <h3 className="text-lg font-semibold text-white mb-1">Eventos</h3>
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
              <h3 className="text-lg font-semibold text-white mb-1">Minha Academia</h3>
              <p className="text-sm text-slate-400">Informações da academia</p>
            </div>
          </button>
        </div>

        {/* Linha 2 — 5 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Planos & Mensalidades — destaque */}
          <button
            onClick={() => router.push('/portal/atleta/planos')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-green-500/20 to-emerald-600/10
                     hover:from-green-500/30 hover:to-emerald-600/20 border border-green-500/40 hover:border-green-500/60
                     transition-all duration-300 text-left ring-1 ring-green-500/20"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-green-500/30 flex items-center justify-center mb-4
                            group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Planos</h3>
              <p className="text-sm text-green-400 font-medium">Mensalidades e assinaturas →</p>
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
              <h3 className="text-lg font-semibold text-white mb-1">Meus Pontos</h3>
              <p className="text-sm text-slate-400">Ranking e histórico</p>
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
              <h3 className="text-lg font-semibold text-white mb-1">Conta Família</h3>
              <p className="text-sm text-slate-400">Dependentes e membros</p>
            </div>
          </button>

          {/* Cursos */}
          <button
            onClick={() => window.open('https://profepmax.com.br', '_blank')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-amber-500/10 to-amber-600/5
                     hover:from-amber-500/20 hover:to-amber-600/10 border border-amber-500/20 hover:border-amber-500/40
                     transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-600/0
                          group-hover:from-amber-500/10 group-hover:to-amber-600/5 transition-all duration-300" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4
                            group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Cursos</h3>
              <p className="text-sm text-slate-400">Conteúdos e formações</p>
            </div>
          </button>

          {/* Carteirinha — destaque */}
          <button
            onClick={() => router.push('/portal/atleta/carteira')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10
                     hover:from-cyan-500/30 hover:to-cyan-600/20 border border-cyan-500/40 hover:border-cyan-500/60
                     transition-all duration-300 text-left ring-1 ring-cyan-500/20"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/30 flex items-center justify-center mb-4
                            group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Carteirinha</h3>
              <p className="text-sm text-cyan-400 font-medium">QR de presença e identidade →</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
