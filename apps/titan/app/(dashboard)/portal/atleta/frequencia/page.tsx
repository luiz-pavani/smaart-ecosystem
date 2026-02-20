'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Loader2, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface FrequenciaItem {
  data: string
  hora_entrada: string
  hora_saida: string | null
  duracao_minutos: number | null
  academia: string
  status: string
}

interface FrequenciaStats {
  total_presencas_periodo: number
  presencas_ultima_semana: number
  frequencia_media_semana: number
  meta_presencas: number
  progresso_percentual: number
  periodo: { inicio: string; fim: string; dias_consulta: number }
}

export default function FrequenciaAtletaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<FrequenciaStats | null>(null)
  const [presencas, setPresencas] = useState<FrequenciaItem[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/acesso/historico?dias=30')
        if (!response.ok) throw new Error('Erro ao carregar frequencia')
        const data = await response.json()
        setStats(data)
        setPresencas(data.presencas || [])
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar frequencia')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Frequencia</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-200">{error}</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Presencas (30 dias)</p>
                <p className="text-3xl font-bold text-green-400">
                  {stats?.total_presencas_periodo || 0}
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Frequencia media</p>
                <p className="text-3xl font-bold text-blue-400">
                  {stats?.frequencia_media_semana?.toFixed(1) || '0'}x/sem
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Meta mensal</p>
                <p className="text-3xl font-bold text-purple-400">
                  {stats?.meta_presencas || 0}
                </p>
              </div>
            </div>

            {/* List */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Ultimas presencas
                </h2>
              </div>
              {presencas.length === 0 ? (
                <div className="p-6 text-gray-400">Nenhum registro encontrado</div>
              ) : (
                <div className="divide-y divide-white/10">
                  {presencas.map((item, idx) => (
                    <div key={idx} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">
                          {new Date(item.data).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {item.academia}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-300 text-sm">
                          {item.hora_entrada} - {item.hora_saida || '—'}
                        </p>
                        <span className="text-xs text-gray-400">
                          {item.duracao_minutos ? `${item.duracao_minutos} min` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
