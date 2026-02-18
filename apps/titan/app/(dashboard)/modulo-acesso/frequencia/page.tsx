'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2, AlertCircle, Filter } from 'lucide-react'

interface Frequencia {
  data: string
  hora_entrada: string
  hora_saida: string | null
  duracao_minutos: number | null
  academia: string
  status: string
}

export default function FrequenciaPage() {
  const [frequencias, setFrequencias] = useState<Frequencia[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [filtroData, setFiltroData] = useState<string>('')
  const [filtroAcademia, setFiltroAcademia] = useState<string>('')
  const [diasFiltro, setDiasFiltro] = useState(30)

  useEffect(() => {
    carregarDados()
  }, [diasFiltro])

  async function carregarDados() {
    try {
      setLoading(true)
      setErro(null)
      const response = await fetch(`/api/acesso/historico?dias=${diasFiltro}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const data = await response.json()
      setStats(data)
      setFrequencias(data.presencas || [])
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Aplicar filtros localmente
  const frequenciasFiltradaslocal = frequencias.filter((f) => {
    const matchData = !filtroData || f.data.includes(filtroData)
    const matchAcademia =
      !filtroAcademia || f.academia.toLowerCase().includes(filtroAcademia.toLowerCase())
    return matchData && matchAcademia
  })

  // Exportar CSV
  function exportarCSV() {
    const header = ['Data', 'Hora Entrada', 'Hora Saída', 'Duração (min)', 'Academia', 'Status']
    const rows = frequencias.map((f) => [
      f.data,
      f.hora_entrada,
      f.hora_saida || '',
      f.duracao_minutos || '',
      f.academia,
      f.status,
    ])

    const csv = [header, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frequencia_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-slate-600">Carregando histórico...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Histórico de Frequência</h1>
        <p className="text-slate-600 mt-2">Detalhamento completo de suas presenças</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm">Total no Período</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats?.total_presencas_periodo || 0}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            últimos {stats?.periodo?.dias_consulta} dias
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm">Meta / Progresso</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats?.total_presencas_periodo}/{stats?.meta_presencas}
          </p>
          <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(stats?.progresso_percentual || 0, 100)}%`,
              }}
            ></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-600 text-sm">Frequência Média</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats?.frequencia_media_semana.toFixed(1)} x/sem
          </p>
          <p className="text-xs text-slate-500 mt-2">dias por semana</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Filter size={18} />
          Filtros
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Período */}
          <div>
            <label className="text-sm font-medium text-slate-700">Período</label>
            <select
              value={diasFiltro}
              onChange={(e) => setDiasFiltro(Number(e.target.value))}
              className="w-full mt-2 p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={180}>Últimos 6 meses</option>
              <option value={365}>Último ano</option>
            </select>
          </div>

          {/* Filtro por Data */}
          <div>
            <label className="text-sm font-medium text-slate-700">Data</label>
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="w-full mt-2 p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Filtro por Academia */}
          <div>
            <label className="text-sm font-medium text-slate-700">Academia</label>
            <input
              type="text"
              placeholder="Buscar academia..."
              value={filtroAcademia}
              onChange={(e) => setFiltroAcademia(e.target.value)}
              className="w-full mt-2 p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Botão Export */}
          <div className="flex items-end">
            <button
              onClick={exportarCSV}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {erro && (
          <div className="p-6 bg-red-50 border-b border-red-200">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={18} />
              <span>{erro}</span>
            </div>
          </div>
        )}

        {frequenciasFiltradaslocal.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-600">Nenhuma presença encontrada com os filtros aplicados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Data</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Entrada</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Saída</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Duração</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Academia</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {frequenciasFiltradaslocal.map((entrada, idx) => {
                  const data = new Date(entrada.data)
                  const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'short' })
                  const dataFormatada = data.toLocaleDateString('pt-BR')

                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-slate-900">{dataFormatada}</p>
                          <p className="text-xs text-slate-500">{diaSemana}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-900 font-medium">{entrada.hora_entrada}</td>
                      <td className="py-4 px-6 text-slate-600">{entrada.hora_saida || '—'}</td>
                      <td className="py-4 px-6 text-slate-600">
                        {entrada.duracao_minutos ? `${entrada.duracao_minutos}m` : '—'}
                      </td>
                      <td className="py-4 px-6 text-slate-600">{entrada.academia}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            entrada.status === 'autorizado'
                              ? 'bg-green-100 text-green-800'
                              : entrada.status === 'manual'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {entrada.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer da tabela com contagem */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
          <p className="text-sm text-slate-600">
            Mostrando <strong>{frequenciasFiltradaslocal.length}</strong> de{' '}
            <strong>{frequencias.length}</strong> registros
          </p>
        </div>
      </div>
    </div>
  )
}
