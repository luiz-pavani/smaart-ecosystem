'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Calendar, BarChart3, Settings, TrendingUp, Clock, FileText, Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { LineChart } from '@/components/dashboard/LineChart'
import { PieChart } from '@/components/dashboard/PieChart'
import { TopList } from '@/components/dashboard/TopList'
import { gerarCertificadoPdf } from '@/lib/certificados/gerarCertificadoPdf'

interface DashboardData {
  totalAtletas: number
  atletasAtivos: number
  totalAulas: number
  frequenciaMedia: number
  atletasLast7Days: { name: string; value: number }[]
  graduacaoDistribution: { name: string; value: number }[]
  topAtletas: { name: string; value: number; subtitle: string }[]
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

      if (!resolvedAcademiaId) {
        if (master) {
          // Carregar lista de academias para o seletor
          const { data: acadList } = await supabase
            .from('academias')
            .select('id, nome')
            .eq('ativo', true)
            .order('nome', { ascending: true })
          setAcademias(acadList || [])
          setLoading(false)
          return
        }
        setError('Academia vinculada não encontrada para este usuário')
        return
      }

      setAcademiaId(resolvedAcademiaId)

      // Total atletas
      const { count: totalAtletas } = await supabase
        .from('stakeholders')
        .select('*', { count: 'exact', head: true })
        .eq('academia_id', resolvedAcademiaId)
        .eq('role', 'atleta')

      // Atletas ativos
      const { count: atletasAtivos } = await supabase
        .from('stakeholders')
        .select('*', { count: 'exact', head: true })
        .eq('academia_id', resolvedAcademiaId)
        .eq('role', 'atleta')
        .eq('status', 'Ativo')

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
        .from('stakeholders')
        .select('graduacao')
        .eq('academia_id', resolvedAcademiaId)
        .eq('role', 'atleta')
        .eq('status', 'Ativo')

      const graduacaoMap = new Map<string, number>()
      atletasData?.forEach(a => {
        const grad = a.graduacao || 'Não definida'
        graduacaoMap.set(grad, (graduacaoMap.get(grad) || 0) + 1)
      })

      const graduacaoDistribution = Array.from(graduacaoMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

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

      setData({
        totalAtletas: totalAtletas || 0,
        atletasAtivos: atletasAtivos || 0,
        totalAulas: totalAulas || 0,
        frequenciaMedia: Math.round(avgFrequency),
        atletasLast7Days: attendanceByDay,
        graduacaoDistribution,
        topAtletas
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
