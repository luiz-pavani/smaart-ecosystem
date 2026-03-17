'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Calendar, BarChart3, Settings, TrendingUp, Clock, FileText, Download, Cake, MapPin, User, Award, UserSearch, MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { LineChart } from '@/components/dashboard/LineChart'
import { PieChart } from '@/components/dashboard/PieChart'
import { TopList } from '@/components/dashboard/TopList'
import { gerarCertificadoPdf } from '@/lib/certificados/gerarCertificadoPdf'
import { saveSelectedAcademiaId, getSelectedAcademiaId } from '@/lib/portal/resolveAcademiaId'

interface AtletaInativo {
  nome_completo: string
  telefone: string | null
  status_plano: string | null
  data_expiracao: string | null
}

interface AulaHoje {
  name: string
  location: string | null
  instructor_name: string | null
  start_time: string
  end_time: string
  current_enrollment: number
  capacity: number | null
  status: 'passada' | 'em_andamento' | 'proxima'
}

interface Aniversariante {
  nome_completo: string
  data_nascimento: string
  idade: number
  hoje: boolean
  telefone?: string | null
}

interface DashboardData {
  totalAtletas: number
  atletasAtivos: number
  totalAulas: number
  frequenciaMedia: number
  atletasLast7Days: { name: string; value: number }[]
  graduacaoDistribution: { name: string; value: number }[]
  topAtletas: { name: string; value: number; subtitle: string }[]
  aniversariantes: Aniversariante[]
  aulasHoje: AulaHoje[]
  atletasInativos: AtletaInativo[]
}

export default function PortalAcademiaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const [downloadingCertificado, setDownloadingCertificado] = useState(false)
  const [academias, setAcademias] = useState<{ id: string; nome: string }[]>([])
  const [selectedAcademiaId, setSelectedAcademiaId] = useState<string>('')
  const [isMaster, setIsMaster] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    if (selectedAcademiaId) {
      saveSelectedAcademiaId(selectedAcademiaId)
      setAcademiaId(selectedAcademiaId)
      loadDashboardData(selectedAcademiaId)
    }
  }, [selectedAcademiaId])

  async function loadDashboardData(overrideAcademiaId?: string) {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuário não autenticado')
        return
      }

      const { data: perfil } = await supabase
        .from('stakeholders')
        .select('role, academia_id')
        .eq('id', user.id)
        .limit(1)
        .single()

      const master = perfil?.role === 'master_access'
      setIsMaster(master)

      let resolvedAcademiaId = overrideAcademiaId || academiaId || perfil?.academia_id

      if (!resolvedAcademiaId && master) {
        resolvedAcademiaId = getSelectedAcademiaId()
      }

      if (!resolvedAcademiaId) {
        if (master) {
          // Carregar lista de academias via API (bypassa RLS)
          const res = await fetch('/api/academias/listar')
          const json = await res.json()
          setAcademias((json.academias || []).map((a: any) => ({ id: a.id, nome: a.nome })))
          setLoading(false)
          return
        }
        setError('Academia vinculada não encontrada para este usuário')
        return
      }

      setAcademiaId(resolvedAcademiaId)

      // Total atletas
      const { count: totalAtletas } = await supabase
        .from('user_fed_lrsj')
        .select('*', { count: 'exact', head: true })
        .eq('academia_id', resolvedAcademiaId)
        .eq('federacao_id', 1)

      // Atletas ativos (plano válido)
      const { count: atletasAtivos } = await supabase
        .from('user_fed_lrsj')
        .select('*', { count: 'exact', head: true })
        .eq('academia_id', resolvedAcademiaId)
        .eq('federacao_id', 1)
        .eq('status_plano', 'Válido')

      // Total aulas
      const { count: totalAulas } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', resolvedAcademiaId)
        .eq('is_active', true)

      // Frequência últimos 7 dias (agregado por dia)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date.toISOString().split('T')[0]
      })

      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('attendance_date')
        .eq('academy_id', resolvedAcademiaId)
        .eq('status', 'PRESENT')
        .gte('attendance_date', last7Days[0])
        .lte('attendance_date', last7Days[6])

      const attendanceByDay = last7Days.map(date => ({
        name: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
        value: (attendanceData || []).filter(r => r.attendance_date === date).length
      }))

      // Distribuição por graduação
      const { data: atletasData } = await supabase
        .from('user_fed_lrsj')
        .select('kyu_dan:kyu_dan_id(cor_faixa)')
        .eq('academia_id', resolvedAcademiaId)
        .eq('federacao_id', 1)

      const GRAD_GROUPS: Record<string, string> = {
        'Branca': 'Branca a Cinza',
        'Branca e Cinza': 'Branca a Cinza',
        'Cinza': 'Branca a Cinza',
        'Cinza e Azul': 'Branca a Cinza',
        'Azul': 'Azul a Laranja',
        'Azul e Amarela': 'Azul a Laranja',
        'Amarela': 'Azul a Laranja',
        'Amarela e Laranja': 'Azul a Laranja',
        'Laranja': 'Azul a Laranja',
        'Verde': 'Verde a Marrom',
        'Roxa': 'Verde a Marrom',
        'Marrom': 'Verde a Marrom',
        'Preta': 'Dan',
        'Vermelha e Branca': 'Dan',
        'Vermelha': 'Dan',
      }

      const graduacaoMap = new Map<string, number>()
      atletasData?.forEach((a: any) => {
        const kd = Array.isArray(a.kyu_dan) ? a.kyu_dan[0] : a.kyu_dan
        const cor = kd?.cor_faixa
        const group = cor ? (GRAD_GROUPS[cor] ?? 'Não definida') : 'Não definida'
        graduacaoMap.set(group, (graduacaoMap.get(group) || 0) + 1)
      })

      const GROUP_ORDER = ['Branca a Cinza', 'Azul a Laranja', 'Verde a Marrom', 'Dan', 'Não definida']
      const graduacaoDistribution = GROUP_ORDER
        .filter(g => graduacaoMap.has(g))
        .map(g => ({ name: g, value: graduacaoMap.get(g)! }))

      // Top atletas por frequência (últimos 30 dias)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0]

      const { data: topAttendance } = await supabase
        .from('attendance_records')
        .select('athlete_id, athlete:stakeholders(nome_completo, graduacao)')
        .eq('academy_id', resolvedAcademiaId)
        .eq('status', 'PRESENT')
        .gte('attendance_date', thirtyDaysStr)

      const athleteAttendance = new Map<string, { nome: string; graduacao: string; count: number }>()
      topAttendance?.forEach((record: any) => {
        if (record.athlete) {
          const key = record.athlete_id
          const current = athleteAttendance.get(key)
          if (current) {
            current.count += 1
          } else {
            athleteAttendance.set(key, {
              nome: record.athlete.nome_completo,
              graduacao: record.athlete.graduacao || '',
              count: 1
            })
          }
        }
      })

      const topAtletas = Array.from(athleteAttendance.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(a => ({
          name: a.nome,
          value: a.count,
          subtitle: a.graduacao
        }))

      // Calcular frequência média
      const avgFrequency = attendanceByDay.reduce((sum, day) => sum + day.value, 0) / 7

      // Atletas inativos (plano vencido ou sem plano)
      const { data: inativos } = await supabase
        .from('user_fed_lrsj')
        .select('nome_completo, telefone, status_plano, data_expiracao')
        .eq('academia_id', resolvedAcademiaId)
        .eq('federacao_id', 1)
        .neq('status_plano', 'Válido')
        .order('data_expiracao', { ascending: true })
        .limit(10)

      const atletasInativos: AtletaInativo[] = (inativos || []).map((a: any) => ({
        nome_completo: a.nome_completo,
        telefone: a.telefone || null,
        status_plano: a.status_plano || null,
        data_expiracao: a.data_expiracao || null,
      }))

      // Aniversariantes da semana (próximos 7 dias incluindo hoje)
      const { data: atletasAniversario } = await supabase
        .from('user_fed_lrsj')
        .select('nome_completo, data_nascimento, telefone')
        .eq('academia_id', resolvedAcademiaId)
        .eq('federacao_id', 1)
        .not('data_nascimento', 'is', null)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const aniversariantes: Aniversariante[] = []

      for (const a of atletasAniversario || []) {
        const birth = new Date(a.data_nascimento)
        // Check next 7 days (ignoring year)
        for (let d = 0; d < 7; d++) {
          const check = new Date(today)
          check.setDate(today.getDate() + d)
          if (birth.getMonth() === check.getMonth() && birth.getDate() === check.getDate()) {
            const age = check.getFullYear() - birth.getFullYear()
            aniversariantes.push({
              nome_completo: a.nome_completo,
              data_nascimento: a.data_nascimento,
              idade: age,
              hoje: d === 0,
              telefone: (a as any).telefone || null,
            } as any)
            break
          }
        }
      }

      // Aulas de hoje
      const todayDow = new Date().getDay() // 0=Dom, 1=Seg...
      const { data: aulasHojeData } = await supabase
        .from('class_schedules')
        .select('start_time, end_time, class:class_id(id, name, location, instructor_name, current_enrollment, capacity, is_active, academy_id)')
        .eq('day_of_week', todayDow)

      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()

      const aulasHoje: AulaHoje[] = (aulasHojeData || [])
        .filter((s: any) => {
          const c = Array.isArray(s.class) ? s.class[0] : s.class
          return c?.is_active && c?.academy_id === resolvedAcademiaId
        })
        .map((s: any) => {
          const c = Array.isArray(s.class) ? s.class[0] : s.class
          const [sh, sm] = s.start_time.split(':').map(Number)
          const [eh, em] = s.end_time.split(':').map(Number)
          const startMin = sh * 60 + sm
          const endMin = eh * 60 + em
          const status: AulaHoje['status'] =
            nowMinutes >= startMin && nowMinutes < endMin ? 'em_andamento'
            : nowMinutes < startMin ? 'proxima'
            : 'passada'
          return {
            name: c.name,
            location: c.location || null,
            instructor_name: c.instructor_name || null,
            start_time: s.start_time.slice(0, 5),
            end_time: s.end_time.slice(0, 5),
            current_enrollment: c.current_enrollment || 0,
            capacity: c.capacity || null,
            status,
          }
        })
        .sort((a: AulaHoje, b: AulaHoje) => a.start_time.localeCompare(b.start_time))

      aniversariantes.sort((a, b) => {
        if (a.hoje && !b.hoje) return -1
        if (!a.hoje && b.hoje) return 1
        return new Date(a.data_nascimento).getDate() - new Date(b.data_nascimento).getDate()
      })

      setData({
        totalAtletas: totalAtletas || 0,
        atletasAtivos: atletasAtivos || 0,
        totalAulas: totalAulas || 0,
        frequenciaMedia: Math.round(avgFrequency),
        atletasLast7Days: attendanceByDay,
        graduacaoDistribution,
        topAtletas,
        aniversariantes,
        aulasHoje,
        atletasInativos,
      })
    } catch (err) {
      console.error('Erro ao carregar dashboard da academia:', err)
      setError('Não foi possível carregar os dados do portal da academia')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCertificado = async () => {
    if (!academiaId) {
      alert('❌ ID da academia não encontrado')
      return
    }

    try {
      setDownloadingCertificado(true)
      const response = await fetch(`/api/academias/${academiaId}/certificado`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao gerar certificado' }))
        throw new Error(errorData.error || 'Erro ao gerar certificado')
      }

      const result = await response.json()
      if (!result?.certificadoData) {
        throw new Error('Dados do certificado não encontrados')
      }

      await gerarCertificadoPdf(result.certificadoData)
    } catch (error) {
      console.error('Error downloading certificate:', error)
      alert(`❌ ${error instanceof Error ? error.message : 'Erro ao baixar certificado'}`)
    } finally {
      setDownloadingCertificado(false)
    }
  }

  const menuItems = [
    {
      title: 'Meus Atletas',
      description: 'Gerencie lista de atletas',
      icon: <Users className="w-6 h-6" />,
      href: '/portal/academia/atletas',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Aulas & Horários',
      description: 'Crie e edite aulas',
      icon: <Calendar className="w-6 h-6" />,
      href: '/portal/academia/aulas',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Frequência',
      description: 'Controle de presença',
      icon: <BarChart3 className="w-6 h-6" />,
      href: '/portal/academia/frequencia',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Configurações',
      description: 'Dados da academia',
      icon: <Settings className="w-6 h-6" />,
      href: '/portal/academia/configuracoes',
      color: 'from-gray-500 to-gray-600'
    },
    {
      title: 'Eventos',
      description: 'Calendário e inscrições',
      icon: <FileText className="w-6 h-6" />,
      href: '/portal/academia/eventos',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      title: 'Desempenho',
      description: 'Análise de evolução',
      icon: <TrendingUp className="w-6 h-6" />,
      href: '/portal/academia/desempenho',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Graduações',
      description: 'Motor de promoção de faixa',
      icon: <Award className="w-6 h-6" />,
      href: '/portal/academia/promocao',
      color: 'from-amber-500 to-amber-600'
    },
    {
      title: 'CRM de Leads',
      description: 'Funil de conversão',
      icon: <UserSearch className="w-6 h-6" />,
      href: '/portal/academia/crm',
      color: 'from-pink-500 to-pink-600'
    },
    {
      title: 'WhatsApp',
      description: 'Conectar número e notificações',
      icon: <MessageSquare className="w-6 h-6" />,
      href: '/portal/academia/whatsapp',
      color: 'from-green-500 to-green-600'
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Dashboard - Academia</h1>
          <p className="text-gray-400 mt-1">Visão geral da sua academia</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Seletor de academia para master_access */}
        {isMaster && !academiaId && academias.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center max-w-md mx-auto mt-8">
            <h3 className="text-white font-semibold text-lg mb-4">Selecione uma Academia</h3>
            <select
              value={selectedAcademiaId}
              onChange={(e) => setSelectedAcademiaId(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">-- Escolha uma academia --</option>
              {academias.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-white">Carregando...</div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-200 font-medium mb-3">{error}</p>
            <button
              onClick={() => loadDashboardData()}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : data ? (
          <>
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Total de Atletas"
                value={data.totalAtletas}
                icon={Users}
                color="blue"
                onClick={() => router.push('/portal/academia/atletas')}
              />
              <MetricCard
                title="Atletas Ativos"
                value={data.atletasAtivos}
                icon={TrendingUp}
                color="green"
                onClick={() => router.push('/portal/academia/atletas')}
              />
              <MetricCard
                title="Aulas Ativas"
                value={data.totalAulas}
                icon={Calendar}
                color="purple"
                onClick={() => router.push('/portal/academia/aulas')}
              />
              <MetricCard
                title="Frequência Média/Dia"
                value={data.frequenciaMedia}
                icon={Clock}
                color="orange"
                onClick={() => router.push('/portal/academia/frequencia')}
              />
            </div>

            {/* Aulas de Hoje */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                <span className="ml-auto text-sm font-normal text-gray-400">
                  {data.aulasHoje.length === 0 ? 'Nenhuma aula hoje' : `${data.aulasHoje.length} aula${data.aulasHoje.length !== 1 ? 's' : ''}`}
                </span>
              </h3>
              {data.aulasHoje.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Sem aulas programadas para hoje</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {data.aulasHoje.map((aula, i) => (
                    <div
                      key={i}
                      onClick={() => router.push('/portal/academia/aulas')}
                      className={`cursor-pointer flex-1 min-w-[200px] rounded-xl border px-4 py-3 transition-all ${
                        aula.status === 'em_andamento'
                          ? 'bg-green-500/15 border-green-500/40 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                          : aula.status === 'proxima'
                          ? 'bg-white/5 border-white/15 hover:bg-white/8'
                          : 'bg-white/3 border-white/8 opacity-50'
                      }`}
                    >
                      {/* Status badge + time */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-sm tabular-nums">
                          {aula.start_time} – {aula.end_time}
                        </span>
                        {aula.status === 'em_andamento' && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                            AO VIVO
                          </span>
                        )}
                        {aula.status === 'proxima' && (
                          <span className="text-[10px] text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full font-medium">PRÓXIMA</span>
                        )}
                      </div>
                      <p className="font-semibold text-white text-sm leading-tight">{aula.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {aula.instructor_name && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <User className="w-3 h-3" />{aula.instructor_name}
                          </span>
                        )}
                        {aula.location && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{aula.location}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {aula.current_enrollment}/{aula.capacity ?? '—'} alunos
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <LineChart
                data={data.atletasLast7Days}
                title="Presenças (Últimos 7 dias)"
                color="#10b981"
                height={250}
              />
              <PieChart
                data={data.graduacaoDistribution}
                title="Distribuição por Graduação"
                height={250}
              />
            </div>

            {/* Aniversariantes da Semana */}
            {data.aniversariantes.length > 0 && (
              <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/5 border border-pink-500/20 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Cake className="w-5 h-5 text-pink-400" />
                  Aniversariantes da Semana
                  <span className="ml-auto text-sm font-normal text-gray-400">{data.aniversariantes.length} atleta{data.aniversariantes.length !== 1 ? 's' : ''}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {data.aniversariantes.map((a, i) => {
                    const birth = new Date(a.data_nascimento)
                    const dia = birth.getDate().toString().padStart(2, '0')
                    const mes = (birth.getMonth() + 1).toString().padStart(2, '0')
                    return (
                      <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
                        a.hoje
                          ? 'bg-pink-500/20 border-pink-500/40'
                          : 'bg-white/5 border-white/10'
                      }`}>
                        <span className="text-xl">{a.hoje ? '🎂' : '🎁'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm leading-tight">{a.nome_completo}</p>
                          <p className={`text-xs ${a.hoje ? 'text-pink-300' : 'text-gray-400'}`}>
                            {dia}/{mes} · {a.idade} anos{a.hoje ? ' · Hoje!' : ''}
                          </p>
                        </div>
                        {a.telefone && (
                          <a
                            href={`https://wa.me/55${a.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`🎂 Feliz Aniversário, ${a.nome_completo.split(' ')[0]}! Desejamos um ótimo dia! 🥋`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 text-xs font-medium transition-colors"
                            title="Enviar parabéns pelo WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            Parabéns
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Atletas Inativos */}
            {data.atletasInativos.length > 0 && (
              <div className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-red-400">⚠️</span>
                  Atletas com Plano Inativo
                  <span className="ml-auto text-sm font-normal text-gray-400">{data.atletasInativos.length} atleta{data.atletasInativos.length !== 1 ? 's' : ''}</span>
                </h3>
                <div className="space-y-2">
                  {data.atletasInativos.map((a, i) => {
                    const expStr = a.data_expiracao
                      ? new Date(a.data_expiracao).toLocaleDateString('pt-BR')
                      : null
                    return (
                      <div key={i} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm">{a.nome_completo}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {a.status_plano || 'Sem plano'}{expStr ? ` · venceu em ${expStr}` : ''}
                          </p>
                        </div>
                        {a.telefone && (
                          <a
                            href={`https://wa.me/55${a.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${a.nome_completo.split(' ')[0]}! 👋 Sentimos sua falta! Sua filiação à academia está vencida. Que tal renovar? 🥋`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 text-xs font-medium transition-colors ml-3"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            Contatar
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Top Atletas + Quick Links */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <TopList
                title="Top 5 Atletas Mais Frequentes"
                items={data.topAtletas}
                valueLabel="presenças (30d)"
              />

              {/* Quick Access */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Acesso Rápido</h3>
                <div className="grid grid-cols-2 gap-3">
                  {menuItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => router.push(item.href)}
                      className={`group relative overflow-hidden rounded-lg bg-gradient-to-br ${item.color} p-4 hover:shadow-lg transition-all transform hover:scale-105`}
                    >
                      <div className="text-white mb-2">
                        {item.icon}
                      </div>
                      <p className="font-semibold text-white text-sm">{item.title}</p>
                      <p className="text-[11px] text-white/80 mt-1 leading-snug">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Certificado de Filiação */}
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur border border-blue-500/20 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Certificado de Filiação</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Documento oficial de autorização de funcionamento pela federação
                    </p>
                    <button
                      onClick={handleDownloadCertificado}
                      disabled={downloadingCertificado}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 
                               text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloadingCertificado ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Baixar Certificado (PDF)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 py-12">
            Nenhum dado disponível
          </div>
        )}
      </div>
    </div>
  )
}
