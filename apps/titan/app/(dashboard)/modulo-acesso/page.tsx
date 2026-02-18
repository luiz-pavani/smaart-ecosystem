'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, Calendar, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'

interface Stats {
  total_presencas_periodo: number
  presencas_ultima_semana: number
  frequencia_media_semana: number
  meta_presencas: number
  progresso_percentual: number
}

export default function ModuloAcessoPage() {
  const [historico, setHistorico] = useState<any[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarDados() {
      try {
        setLoading(true)
        const response = await fetch('/api/acesso/historico?dias=30')

        if (!response.ok) {
          throw new Error('Erro ao carregar dados')
        }

        const data = await response.json()
        setStats(data)
        setHistorico((data.presencas || []).slice(0, 5)) // Últimas 5
      } catch (err: any) {
        setErro(err.message)
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-slate-600">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Meu Acesso</h1>
        <p className="text-slate-600 mt-2">
          Visualize seu histórico de presença e estatísticas mensais
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Presenças */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Presenças</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {stats?.total_presencas_periodo || 0}
              </p>
              <p className="text-xs text-slate-500 mt-2">últimos 30 dias</p>
            </div>
            <Activity size={40} className="text-blue-500 opacity-20" />
          </div>
        </div>

        {/* Última Semana */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Última Semana</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {stats?.presencas_ultima_semana || 0}
              </p>
              <p className="text-xs text-slate-500 mt-2">7 dias</p>
            </div>
            <Calendar size={40} className="text-emerald-500 opacity-20" />
          </div>
        </div>

        {/* Frequência Média */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Média/Semana</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {stats?.frequencia_media_semana.toFixed(1) || '0'}
              </p>
              <p className="text-xs text-slate-500 mt-2">dias por semana</p>
            </div>
            <TrendingUp size={40} className="text-amber-500 opacity-20" />
          </div>
        </div>

        {/* Progresso da Meta */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Meta</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {stats?.progresso_percentual || 0}%
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {stats?.total_presencas_periodo} de {stats?.meta_presencas}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                (stats?.progresso_percentual || 0) >= 100
                  ? 'bg-green-500'
                  : 'bg-slate-400'
              }`}
            >
              ✓
            </div>
          </div>
        </div>
      </div>

      {/* Seção QR Code */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-8 text-center">
        <h2 className="text-xl font-bold text-blue-900 mb-4">Seu Código de Acesso</h2>
        <div className="bg-white w-48 h-48 mx-auto rounded-lg shadow-lg flex items-center justify-center">
          <div className="text-center">
            <AlertCircle size={40} className="text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">QR gerado em /acesso/gerar-qr</p>
          </div>
        </div>
        <p className="text-sm text-blue-800 mt-4">
          Apresente este código no acesso da academia
        </p>
        <Link
          href="/acesso/gerar-qr"
          className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          Gerar Novo Código
        </Link>
      </div>

      {/* Histórico Recente */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Histórico Recente</h3>
          <Link
            href="/modulo-acesso/frequencia"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Ver Todos →
          </Link>
        </div>

        {historico.length === 0 ? (
          <div className="py-8 text-center text-slate-600">
            <Activity size={40} className="mx-auto mb-4 opacity-30" />
            <p>Nenhuma presença registrada ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Data</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Entrada</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Saída</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Duração</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Academia</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((entrada, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-900 font-medium">
                      {new Date(entrada.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{entrada.hora_entrada}</td>
                    <td className="py-3 px-4 text-slate-600">{entrada.hora_saida || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {entrada.duracao_minutos ? `${entrada.duracao_minutos}m` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{entrada.academia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dicas */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h4 className="font-bold text-amber-900 mb-3">💡 Dicas</h4>
        <ul className="text-sm text-amber-900 space-y-2">
          <li>✓ Gere um novo código QR a cada 24 horas</li>
          <li>✓ Mantenha a meta de 4 dias por semana</li>
          <li>✓ Seu acesso é controlado via app Titan</li>
        </ul>
      </div>
    </div>
  )
}
