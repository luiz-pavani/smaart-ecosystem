'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle, CreditCard, Award, Check, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface KyuDan {
  id: number
  cor_faixa: string
  kyu_dan: string
}

interface AtletaInfo {
  nome_completo: string | null
  academias: string | null
  status_plano: string | null
  data_expiracao: string | null
  kyu_dan_id: number | null
}

export default function RenovacaoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [atleta, setAtleta] = useState<AtletaInfo | null>(null)
  const [kyuDans, setKyuDans] = useState<KyuDan[]>([])
  const [selectedKyuDan, setSelectedKyuDan] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/atletas/self/perfil-dados')
        const json = await res.json()

        if (json.fedLrsj) {
          setAtleta(json.fedLrsj as AtletaInfo)
          setSelectedKyuDan(json.fedLrsj.kyu_dan_id ? String(json.fedLrsj.kyu_dan_id) : '')
        }
        setKyuDans((json.kyuDans || []) as KyuDan[])
      } catch {
        setError('Não foi possível carregar seus dados')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleRenovar = async () => {
    setSubmitting(true)
    try {
      // Atualiza graduação se mudou
      if (selectedKyuDan && Number(selectedKyuDan) !== atleta?.kyu_dan_id) {
        await fetch('/api/atletas/self/update-stakeholder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kyu_dan_id: Number(selectedKyuDan) }),
        })
      }
      // TODO: integrar com gateway de pagamento (Safe2Pay)
      // Por ora, redireciona para WhatsApp com dados preenchidos
      const kd = kyuDans.find(k => k.id === Number(selectedKyuDan))
      const msg = encodeURIComponent(
        `Olá! Gostaria de renovar minha filiação na Liga Riograndense de Judô.\n` +
        `Nome: ${atleta?.nome_completo || ''}\n` +
        `Academia: ${atleta?.academias || ''}\n` +
        `Graduação: ${kd ? `${kd.cor_faixa} — ${kd.kyu_dan}` : 'sem alteração'}`
      )
      window.open(`https://wa.me/555196834013?text=${msg}`, '_blank')
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  const currentKd = kyuDans.find(k => k.id === atleta?.kyu_dan_id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-2xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/atleta/perfil')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Renovar Filiação</h1>
          <p className="text-gray-400 mt-1">Renove sua anuidade na Liga Riograndense de Judô</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-200">{error}</p>
          </div>
        ) : submitted ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
            <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Solicitação enviada!</h2>
            <p className="text-gray-400 mb-6">Em breve nossa equipe entrará em contato para confirmar a renovação.</p>
            <button
              onClick={() => router.push('/portal/atleta/perfil')}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-all text-sm font-medium"
            >
              Voltar ao perfil
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumo atual */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4">Sua filiação atual</h2>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400 text-sm">Atleta</span>
                  <span className="text-gray-200 text-sm font-medium">{atleta?.nome_completo || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400 text-sm">Academia</span>
                  <span className="text-gray-200 text-sm font-medium">{atleta?.academias || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400 text-sm">Graduação atual</span>
                  <span className="text-gray-200 text-sm font-medium">
                    {currentKd ? `${currentKd.cor_faixa} — ${currentKd.kyu_dan}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400 text-sm">Validade atual</span>
                  <span className="text-gray-200 text-sm font-medium">{atleta?.data_expiracao || '—'}</span>
                </div>
              </div>
            </div>

            {/* Graduação (pode ter mudado) */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-blue-400" />
                <h2 className="font-semibold text-white">Confirmar graduação</h2>
              </div>
              <p className="text-gray-400 text-xs mb-3">Se sua graduação mudou desde a última filiação, atualize aqui.</p>
              <div className="relative">
                <select
                  value={selectedKyuDan}
                  onChange={e => setSelectedKyuDan(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-colors pr-8"
                >
                  <option value="">Selecione sua faixa</option>
                  {kyuDans.map(k => (
                    <option key={k.id} value={k.id}>{k.cor_faixa} — {k.kyu_dan}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Valor da anuidade */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-green-400" />
                <h2 className="font-semibold text-white">Anuidade</h2>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Filiação anual — Liga Riograndense de Judô</span>
                <span className="text-2xl font-bold text-white">A consultar</span>
              </div>
              <p className="text-gray-500 text-xs mt-2">O valor será informado pelo secretariado após análise da sua solicitação.</p>
            </div>

            {/* CTA */}
            <button
              onClick={handleRenovar}
              disabled={submitting || !selectedKyuDan}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-base"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
              {submitting ? 'Enviando...' : 'Solicitar renovação'}
            </button>
            <p className="text-center text-xs text-gray-500">
              Ao clicar, você será redirecionado para confirmar a renovação com nossa equipe via WhatsApp.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
