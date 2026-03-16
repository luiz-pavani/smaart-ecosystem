'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Award, CheckCircle2, XCircle, Loader2, Settings, ChevronUp, Save } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'

interface EligibleAthlete {
  stakeholder_id: string
  nome_completo: string
  kyu_dan_id: number
  graduacao: { kyu_dan: string; cor_faixa: string } | null
  next_kyu_dan_id: number
  next_graduacao: { kyu_dan: string; cor_faixa: string } | null
  checkins: number
  min_checkins: number
  months_in_grade: number
  min_months: number
  meetsCheckins: boolean
  meetsTime: boolean
  ready: boolean
}

interface Rule {
  kyu_dan_id: number
  min_checkins: number
  min_months: number
}

const KYU_DAN_OPTIONS = [
  { id: 1, label: 'Branca (mūkyū)' },
  { id: 2, label: 'Branca e Cinza (11º kyū)' },
  { id: 3, label: 'Cinza (10º kyū)' },
  { id: 4, label: 'Cinza e Azul (9º kyū)' },
  { id: 5, label: 'Azul (8º kyū)' },
  { id: 6, label: 'Azul e Amarela (7º kyū)' },
  { id: 7, label: 'Amarela (6º kyū)' },
  { id: 8, label: 'Amarela e Laranja (5º kyū)' },
  { id: 9, label: 'Laranja (4º kyū)' },
  { id: 10, label: 'Verde (3º kyū)' },
  { id: 11, label: 'Roxa (2º kyū)' },
  { id: 12, label: 'Marrom (1º kyū)' },
]

function ProgressBar({ value, max, ok }: { value: number; max: number; ok: boolean }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full">
      <div
        className={`h-full rounded-full transition-all ${ok ? 'bg-green-400' : 'bg-amber-400'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function PromocaoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [eligible, setEligible] = useState<EligibleAthlete[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [editRules, setEditRules] = useState<Rule[]>([])
  const [savingRules, setSavingRules] = useState(false)
  const [promotingId, setPromotingId] = useState<string | null>(null)

  const load = useCallback(async (acadId: string) => {
    const res = await fetch(`/api/academia/promocao?academia_id=${acadId}`)
    if (res.ok) {
      const json = await res.json()
      setEligible(json.eligible || [])
      setRules(json.rules || [])
      setEditRules(json.rules?.length > 0
        ? json.rules
        : KYU_DAN_OPTIONS.slice(0, 8).map(k => ({ kyu_dan_id: k.id, min_checkins: 30, min_months: 3 }))
      )
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const id = await resolveAcademiaId(supabase)
      setAcademiaId(id)
      if (id) await load(id)
      setLoading(false)
    }
    init()
  }, [])

  const saveRules = async () => {
    if (!academiaId) return
    setSavingRules(true)
    await fetch('/api/academia/promocao', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ academia_id: academiaId, rules: editRules }),
    })
    await load(academiaId)
    setSavingRules(false)
    setShowSettings(false)
  }

  const promote = async (athlete: EligibleAthlete) => {
    setPromotingId(athlete.stakeholder_id)
    await fetch('/api/academia/promocao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athlete.stakeholder_id, new_kyu_dan_id: athlete.next_kyu_dan_id }),
    })
    if (academiaId) await load(academiaId)
    setPromotingId(null)
  }

  const readyCount = eligible.filter(a => a.ready).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/academia')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Motor de Graduação</h1>
              <p className="text-gray-400 mt-1">Atletas elegíveis para promoção de faixa</p>
            </div>
            <button
              onClick={() => setShowSettings(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showSettings
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Settings className="w-4 h-4" />
              Configurar Regras
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Regras por Graduação</h2>
            <p className="text-gray-400 text-sm mb-5">
              Define o mínimo de check-ins e meses na faixa atual para elegibilidade.
            </p>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {KYU_DAN_OPTIONS.map(opt => {
                const rule = editRules.find(r => r.kyu_dan_id === opt.id) || { kyu_dan_id: opt.id, min_checkins: 30, min_months: 3 }
                return (
                  <div key={opt.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 bg-white/5 rounded-lg px-4 py-3">
                    <span className="text-gray-300 text-sm">{opt.label}</span>
                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      Check-ins
                      <input
                        type="number"
                        min={1}
                        value={rule.min_checkins}
                        onChange={e => setEditRules(prev => {
                          const next = prev.filter(r => r.kyu_dan_id !== opt.id)
                          next.push({ ...rule, min_checkins: Number(e.target.value) })
                          return next
                        })}
                        className="w-16 bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      Meses
                      <input
                        type="number"
                        min={1}
                        value={rule.min_months}
                        onChange={e => setEditRules(prev => {
                          const next = prev.filter(r => r.kyu_dan_id !== opt.id)
                          next.push({ ...rule, min_months: Number(e.target.value) })
                          return next
                        })}
                        className="w-16 bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                      />
                    </label>
                  </div>
                )
              })}
            </div>
            <button
              onClick={saveRules}
              disabled={savingRules}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {savingRules ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Regras
            </button>
          </div>
        )}

        {/* Stats */}
        {!loading && rules.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{readyCount}</p>
              <p className="text-green-300 text-sm mt-1">Prontos para promover</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-400">{eligible.length - readyCount}</p>
              <p className="text-amber-300 text-sm mt-1">Em progresso</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{eligible.length}</p>
              <p className="text-gray-400 text-sm mt-1">Avaliados</p>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
            <Award className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-300 font-semibold">Nenhuma regra configurada</p>
            <p className="text-gray-500 text-sm mt-1">Configure as regras de promoção para ver os atletas elegíveis.</p>
            <button
              onClick={() => setShowSettings(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
            >
              Configurar agora
            </button>
          </div>
        ) : eligible.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum atleta avaliado ainda</p>
            <p className="text-gray-500 text-sm mt-1">Os atletas ativos com graduação aparecem aqui conforme acumulam check-ins.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eligible.map(a => (
              <div
                key={a.stakeholder_id}
                className={`bg-white/5 border rounded-xl p-5 transition-colors ${
                  a.ready ? 'border-green-500/30 bg-green-500/5' : 'border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-white font-semibold">{a.nome_completo}</p>
                      {a.graduacao && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
                          {a.graduacao.cor_faixa} · {a.graduacao.kyu_dan}
                        </span>
                      )}
                      {a.next_graduacao && (
                        <span className="text-gray-400 text-xs">→ {a.next_graduacao.cor_faixa} · {a.next_graduacao.kyu_dan}</span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {/* Checkins */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={a.meetsCheckins ? 'text-green-400 flex items-center gap-1' : 'text-amber-400 flex items-center gap-1'}>
                            {a.meetsCheckins ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            Check-ins
                          </span>
                          <span className="text-gray-400">{a.checkins}/{a.min_checkins}</span>
                        </div>
                        <ProgressBar value={a.checkins} max={a.min_checkins} ok={a.meetsCheckins} />
                      </div>
                      {/* Time */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={a.meetsTime ? 'text-green-400 flex items-center gap-1' : 'text-amber-400 flex items-center gap-1'}>
                            {a.meetsTime ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            Meses na faixa
                          </span>
                          <span className="text-gray-400">{a.months_in_grade}/{a.min_months}</span>
                        </div>
                        <ProgressBar value={a.months_in_grade} max={a.min_months} ok={a.meetsTime} />
                      </div>
                    </div>
                  </div>

                  {a.ready && a.next_graduacao && (
                    <button
                      onClick={() => promote(a)}
                      disabled={promotingId === a.stakeholder_id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
                    >
                      {promotingId === a.stakeholder_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                      Promover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
