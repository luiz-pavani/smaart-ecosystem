'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Users, Trophy, TrendingUp, UserCheck, AlertTriangle, CheckCircle2, Phone, FileText, ShieldCheck, ChevronRight, Clock, Tag, XCircle, AlertOctagon, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TopList } from '@/components/dashboard/TopList'

interface AcademiaHealth {
  id: string
  nome: string
  sigla: string | null
  responsavel_telefone: string | null
  total_atletas: number
  atletas_ativos: number
  pct_ativos: number
  anuidade_status: 'ok' | 'vencendo' | 'vencida' | 'indefinida'
  anualidade_vencimento: string | null
  dias_vencimento: number | null
  health_score: number
  nivel: 'bom' | 'atencao' | 'critico'
}

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
  const [healthData, setHealthData] = useState<AcademiaHealth[]>([])
  const [filiacoes, setFiliacoes] = useState<{ pendentes: number; vencendo: number; vencidas: number } | null>(null)
  const [metricas, setMetricas] = useState<{ total: number; ativos: number; vencidos: number; vencendo: number; lotes: { lote: string; count: number }[] } | null>(null)
  const [pedidosPendentes, setPedidosPendentes] = useState(0)

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

      const [res, healthRes] = await Promise.all([
        fetch(`/api/federacao/dashboard?${params}`),
        fetch('/api/federacao/academias-health'),
      ])
      if (!res.ok) throw new Error('Erro ao carregar stats')
      const json = await res.json()
      setData(json)
      if (healthRes.ok) {
        const h = await healthRes.json()
        setHealthData(h.academias || [])
      }

      // Fire-and-forget: solicitações de filiação pendentes
      fetch('/api/federacao/filiacao-pedidos').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.pedidos) {
          setPedidosPendentes(d.pedidos.filter((p: { status: string }) => p.status === 'PENDENTE').length)
        }
      }).catch(() => {})

      // Fire-and-forget: filiações pendentes
      fetch('/api/federacao/filiacoes').then(r => r.ok ? r.json() : null).then(f => {
        if (f) setFiliacoes({
          pendentes: f.pendentes?.length ?? 0,
          vencendo: f.vencendo?.length ?? 0,
          vencidas: f.vencidas?.length ?? 0,
        })
      }).catch(() => {})

      // Fire-and-forget: métricas de filiados + lotes
      fetch('/api/federacao/metricas').then(r => r.ok ? r.json() : null).then(m => {
        if (m) setMetricas(m)
      }).catch(() => {})
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
            onClick={() => window.open('https://sul.smoothcomp.com/pt_BR/federation/130/events/upcoming', '_blank', 'noopener')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5
                     hover:from-yellow-500/20 hover:to-yellow-600/10 border border-yellow-500/20 hover:border-yellow-500/40
                     transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Competições</h3>
            <p className="text-sm text-slate-400">Eventos no Smoothcomp ↗</p>
          </button>

          <button
            onClick={() => router.push('/portal/federacao/relatorios')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5
                     hover:from-blue-500/20 hover:to-blue-600/10 border border-blue-500/20 hover:border-blue-500/40
                     transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Relatórios</h3>
            <p className="text-sm text-slate-400">Exportar relatórios em PDF</p>
          </button>

          <button
            onClick={() => router.push('/portal/federacao/filiacoes')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5
                     hover:from-orange-500/20 hover:to-orange-600/10 border border-orange-500/20 hover:border-orange-500/40
                     transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Filiações</h3>
            <p className="text-sm text-slate-400">Aprovações e renovações</p>
          </button>

          <button
            onClick={() => router.push('/portal/federacao/backnumbers')}
            className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5
                     hover:from-purple-500/20 hover:to-purple-600/10 border border-purple-500/20 hover:border-purple-500/40
                     transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Tag className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Backnumbers</h3>
            <p className="text-sm text-slate-400">Gerar e baixar BNs em massa</p>
          </button>
        </div>
      </div>

      {/* Widget Solicitações de Filiação */}
      {pedidosPendentes > 0 && (
        <button
          onClick={() => router.push('/portal/federacao/filiacoes')}
          className="w-full text-left bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 hover:bg-yellow-500/10 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus className="w-5 h-5 text-yellow-400" />
              <div>
                <h3 className="font-semibold text-white">Solicitações de Filiação</h3>
                <p className="text-sm text-yellow-300 mt-0.5">
                  {pedidosPendentes} nova{pedidosPendentes !== 1 ? 's' : ''} solicitaç{pedidosPendentes !== 1 ? 'ões' : 'ão'} aguardando revisão
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-yellow-500 group-hover:text-yellow-300 transition-colors" />
          </div>
        </button>
      )}

      {/* Widget Filiações */}
      {filiacoes && (filiacoes.pendentes > 0 || filiacoes.vencendo > 0 || filiacoes.vencidas > 0) && (
        <button
          onClick={() => router.push('/portal/federacao/filiacoes')}
          className="w-full text-left bg-white/5 backdrop-blur border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              <h3 className="font-semibold text-white">Filiações — Ação necessária</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          </div>
          <div className="flex flex-wrap gap-3">
            {filiacoes.pendentes > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                {filiacoes.pendentes} pendente{filiacoes.pendentes !== 1 ? 's' : ''}
              </span>
            )}
            {filiacoes.vencendo > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-orange-500/15 border border-orange-500/30 text-orange-300">
                ⏳ {filiacoes.vencendo} vencendo em 30d
              </span>
            )}
            {filiacoes.vencidas > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-500/15 border border-red-500/30 text-red-300">
                ⚠️ {filiacoes.vencidas} vencida{filiacoes.vencidas !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Métricas de Planos */}
      {metricas && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Filiados — Status dos Planos</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total de filiados</p>
              <p className="text-3xl font-bold text-white">{metricas.total.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <p className="text-xs text-green-400 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Plano ativo</p>
              <p className="text-3xl font-bold text-green-400">{metricas.ativos.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-500 mt-1">{metricas.total > 0 ? Math.round(metricas.ativos / metricas.total * 100) : 0}% do total</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <p className="text-xs text-amber-400 mb-1 flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> Vencendo em 30d</p>
              <p className="text-3xl font-bold text-amber-400">{metricas.vencendo.toLocaleString('pt-BR')}</p>
              <button onClick={() => router.push('/portal/federacao/backnumbers?status=Válido')} className="text-xs text-amber-400/60 hover:text-amber-400 mt-1 transition-colors">Ver atletas →</button>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-xs text-red-400 mb-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> Plano vencido</p>
              <p className="text-3xl font-bold text-red-400">{metricas.vencidos.toLocaleString('pt-BR')}</p>
              <button onClick={() => router.push('/portal/federacao/backnumbers?status=Vencido')} className="text-xs text-red-400/60 hover:text-red-400 mt-1 transition-colors">Ver atletas →</button>
            </div>
          </div>

          {/* Distribuição por Lote */}
          {metricas.lotes.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" />
                Distribuição por Lote
              </h3>
              <div className="space-y-2">
                {metricas.lotes.map(({ lote, count }) => {
                  const pct = metricas.total > 0 ? Math.round(count / metricas.total * 100) : 0
                  return (
                    <div key={lote}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-300 font-mono">{lote}</span>
                        <span className="text-sm font-semibold text-white tabular-nums">{count} <span className="text-gray-500 font-normal text-xs">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

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

          {/* Saúde das Academias */}
          {healthData.length > 0 && (
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Saúde das Academias
              </h3>
              <p className="text-xs text-gray-500 mb-5">Ordenado por academias que precisam de atenção</p>
              <div className="space-y-3">
                {healthData.map((a) => (
                  <div key={a.id} className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-all ${
                    a.nivel === 'critico' ? 'bg-red-500/5 border-red-500/20' :
                    a.nivel === 'atencao' ? 'bg-amber-500/5 border-amber-500/20' :
                    'bg-white/3 border-white/8'
                  }`}>
                    {/* Ícone de saúde */}
                    <div className="shrink-0">
                      {a.nivel === 'bom'
                        ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                        : <AlertTriangle className={`w-5 h-5 ${a.nivel === 'critico' ? 'text-red-400' : 'text-amber-400'}`} />
                      }
                    </div>

                    {/* Nome + stats */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{a.nome}{a.sigla ? ` (${a.sigla})` : ''}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-xs text-gray-400">{a.atletas_ativos}/{a.total_atletas} atletas ativos ({a.pct_ativos}%)</span>
                        {a.anuidade_status === 'vencida' && (
                          <span className="text-xs text-red-400">⚠️ Anuidade vencida</span>
                        )}
                        {a.anuidade_status === 'vencendo' && a.dias_vencimento !== null && (
                          <span className="text-xs text-amber-400">⏳ Anuidade vence em {a.dias_vencimento}d</span>
                        )}
                      </div>
                    </div>

                    {/* Health score */}
                    <div className="shrink-0 text-right">
                      <span className={`text-sm font-bold ${a.health_score >= 70 ? 'text-green-400' : a.health_score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                        {a.health_score}
                      </span>
                      <p className="text-xs text-gray-500">score</p>
                    </div>

                    {/* WhatsApp responsável */}
                    {a.responsavel_telefone && a.nivel !== 'bom' && (
                      <a
                        href={`https://wa.me/55${a.responsavel_telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Gostaríamos de conversar sobre a situação da academia *${a.nome}* junto à federação. Podemos falar?`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 text-xs font-medium transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        Contatar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
