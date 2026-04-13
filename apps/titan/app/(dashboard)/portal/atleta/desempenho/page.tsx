'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Award, CheckCircle2, Clock, TrendingUp, Loader2, AlertCircle, Info } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Progresso {
  kyu_dan_id: number | null
  status_plano: string | null
  graduacao_atual: { id: number; kyu_dan: string; cor_faixa: string; icones?: string } | null
  proxima_graduacao: { id: number; kyu_dan: string; cor_faixa: string; icones?: string } | null
  data_ultima_graduacao: string | null
  checkins: number
  min_checkins: number | null
  checkins_progress: number | null
  months_in_grade: number
  min_months: number | null
  time_progress: number | null
  ready: boolean
  has_rules: boolean
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-white/10 rounded-full h-3">
      <div
        className={`h-3 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

export default function DesempenhoAtletaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Progresso | null>(null)

  useEffect(() => {
    fetch('/api/atletas/self/progresso')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/atleta')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Progressão</h1>
          <p className="text-gray-400 mt-1">Seu progresso em direção à próxima graduação</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-200">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* Graduação atual → próxima */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Graduação</h2>
                {data.ready && (
                  <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/30">
                    ✓ Elegível para promoção
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Atual</p>
                  <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-3">
                    <p className="text-white font-bold">{data.graduacao_atual?.cor_faixa ?? '—'}</p>
                    <p className="text-gray-400 text-xs">{data.graduacao_atual?.kyu_dan ?? '—'}</p>
                  </div>
                </div>
                <TrendingUp className="w-5 h-5 text-gray-500 mt-4" />
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Próxima</p>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-5 py-3">
                    <p className="text-blue-300 font-bold">{data.proxima_graduacao?.cor_faixa ?? '—'}</p>
                    <p className="text-blue-400 text-xs">{data.proxima_graduacao?.kyu_dan ?? '—'}</p>
                  </div>
                </div>
                {data.data_ultima_graduacao && (
                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-400">Última graduação</p>
                    <p className="text-white text-sm font-medium">
                      {new Date(data.data_ultima_graduacao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Requisitos */}
            {data.has_rules ? (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 space-y-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  Requisitos para Promoção
                </h2>

                {/* Check-ins */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-white font-medium text-sm">Treinos desde a última graduação</p>
                      <p className="text-gray-400 text-xs mt-0.5">Check-ins registrados na academia</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${(data.checkins_progress ?? 0) >= 100 ? 'text-green-400' : 'text-white'}`}>
                        {data.checkins}
                      </span>
                      <span className="text-gray-400 text-sm"> / {data.min_checkins}</span>
                    </div>
                  </div>
                  <ProgressBar
                    value={data.checkins_progress ?? 0}
                    color={(data.checkins_progress ?? 0) >= 100 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-blue-500 to-blue-400'}
                  />
                  <p className="text-xs text-gray-500 mt-1">{data.checkins_progress ?? 0}% concluído</p>
                </div>

                {/* Tempo na faixa */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-white font-medium text-sm flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-purple-400" />
                        Tempo na faixa atual
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">Meses desde a última graduação</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${(data.time_progress ?? 0) >= 100 ? 'text-green-400' : 'text-white'}`}>
                        {data.months_in_grade}
                      </span>
                      <span className="text-gray-400 text-sm"> / {data.min_months} meses</span>
                    </div>
                  </div>
                  <ProgressBar
                    value={data.time_progress ?? 0}
                    color={(data.time_progress ?? 0) >= 100 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-purple-500 to-purple-400'}
                  />
                  <p className="text-xs text-gray-500 mt-1">{data.time_progress ?? 0}% concluído</p>
                </div>

                {data.ready && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                    <p className="text-green-300 font-semibold">🎉 Você atingiu todos os requisitos!</p>
                    <p className="text-green-400/70 text-sm mt-1">Fale com seu professor para agendar a promoção.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Regras de promoção não configuradas</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Sua academia ainda não definiu os critérios de promoção. Entre em contato com seu professor.
                  </p>
                </div>
              </div>
            )}

            {/* Stats rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">Treinos registrados</p>
                <p className="text-2xl font-bold text-blue-400">{data.checkins}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">Meses na faixa</p>
                <p className="text-2xl font-bold text-purple-400">{data.months_in_grade}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 col-span-2 md:col-span-1">
                <p className="text-gray-400 text-xs mb-1">Status da filiação</p>
                <p className={`text-lg font-bold ${data.status_plano === 'Válido' ? 'text-green-400' : 'text-red-400'}`}>
                  {data.status_plano ?? '—'}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
