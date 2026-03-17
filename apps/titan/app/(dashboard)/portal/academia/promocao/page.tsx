'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Award, CheckCircle2, XCircle, Loader2, Settings, ChevronUp, Save, X, PlusCircle, Zap, BarChart2, Calendar } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'

interface EligibleAthlete {
  stakeholder_id: string
  nome_completo: string
  kyu_dan_id: number
  data_ultima_graduacao: string | null
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

interface AtletaDetail {
  totalCheckins: number
  checkinsByMonth: { month: string; count: number }[]
  totalPoints: number
  offsetPoints: number
  pointsHistory: { tipo: string; pontos: number; descricao: string; created_at: string }[]
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

function MonthBar({ month, count, max }: { month: string; count: number; max: number }) {
  const label = new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-white text-xs font-medium">{count}</span>
      <div className="w-full bg-white/10 rounded-sm overflow-hidden" style={{ height: 48 }}>
        <div
          className="w-full bg-purple-500/60 rounded-sm transition-all"
          style={{ height: `${max > 0 ? (count / max) * 100 : 0}%`, marginTop: `${max > 0 ? ((max - count) / max) * 100 : 100}%` }}
        />
      </div>
      <span className="text-gray-500 text-[10px] truncate w-full text-center">{label}</span>
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

  // Detail modal
  const [detailAthlete, setDetailAthlete] = useState<EligibleAthlete | null>(null)
  const [detail, setDetail] = useState<AtletaDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [offsetValue, setOffsetValue] = useState('')
  const [offsetDesc, setOffsetDesc] = useState('')
  const [savingOffset, setSavingOffset] = useState(false)
  const [lastPromoDate, setLastPromoDate] = useState('')
  const [savingDate, setSavingDate] = useState(false)

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

  const openDetail = async (athlete: EligibleAthlete) => {
    setDetailAthlete(athlete)
    setDetail(null)
    setDetailLoading(true)
    setOffsetValue('')
    setOffsetDesc('')
    setLastPromoDate(athlete.data_ultima_graduacao || '')
    const res = await fetch(`/api/academia/atleta/${athlete.stakeholder_id}?academia_id=${academiaId}`)
    if (res.ok) setDetail(await res.json())
    setDetailLoading(false)
  }

  const saveOffset = async () => {
    if (!detailAthlete || !academiaId || !offsetValue) return
    setSavingOffset(true)
    await fetch(`/api/academia/atleta/${detailAthlete.stakeholder_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academia_id: academiaId,
        pontos: Number(offsetValue) * 10,
        descricao: offsetDesc || `Ajuste histórico: ${offsetValue} presenças`,
      }),
    })
    // Reload detail
    const res = await fetch(`/api/academia/atleta/${detailAthlete.stakeholder_id}?academia_id=${academiaId}`)
    if (res.ok) setDetail(await res.json())
    // Reload promotion list
    await load(academiaId)
    setOffsetValue('')
    setOffsetDesc('')
    setSavingOffset(false)
  }

  const saveDate = async () => {
    if (!detailAthlete || !lastPromoDate) return
    setSavingDate(true)
    await fetch(`/api/academia/atleta/${detailAthlete.stakeholder_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_ultima_graduacao: lastPromoDate }),
    })
    if (academiaId) await load(academiaId)
    setSavingDate(false)
  }

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

  // For bar chart: last 6 months
  const last6months = detail?.checkinsByMonth.slice(0, 6).reverse() || []
  const maxMonth = Math.max(...last6months.map(m => m.count), 1)

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
              <p className="text-gray-400 mt-1">Atletas elegíveis para promoção de faixa · clique no nome para ver detalhes</p>
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
                        type="number" min={1} value={rule.min_checkins}
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
                        type="number" min={1} value={rule.min_months}
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
                      {/* Clickable name */}
                      <button
                        onClick={() => openDetail(a)}
                        className="text-white font-semibold hover:text-purple-300 transition-colors text-left underline-offset-2 hover:underline"
                      >
                        {a.nome_completo}
                      </button>
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

                  <div className="flex flex-col gap-2 items-end shrink-0">
                    <button
                      onClick={() => openDetail(a)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-colors"
                      title="Ver detalhes"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      Detalhes
                    </button>
                    {a.ready && a.next_graduacao && (
                      <button
                        onClick={() => promote(a)}
                        disabled={promotingId === a.stakeholder_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 text-sm font-medium transition-colors disabled:opacity-50"
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailAthlete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-white font-bold text-lg">{detailAthlete.nome_completo}</h2>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {detailAthlete.graduacao && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
                      {detailAthlete.graduacao.cor_faixa} · {detailAthlete.graduacao.kyu_dan}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setDetailAthlete(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {detailLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
                </div>
              ) : detail ? (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-white">{detail.totalCheckins}</p>
                      <p className="text-gray-400 text-xs mt-0.5">Check-ins totais</p>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-purple-300">{detail.totalPoints}</p>
                      <p className="text-gray-400 text-xs mt-0.5">Pontos totais</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-amber-300">{detail.offsetPoints}</p>
                      <p className="text-gray-400 text-xs mt-0.5">Pts offset</p>
                    </div>
                  </div>

                  {/* Frequency bar chart — last 6 months */}
                  {last6months.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <p className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-purple-400" />
                        Frequência (últimos 6 meses)
                      </p>
                      <div className="flex gap-2 items-end h-20">
                        {last6months.map(m => (
                          <MonthBar key={m.month} month={m.month} count={m.count} max={maxMonth} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Elegibility recap */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <p className="text-white text-sm font-medium">Critérios de Promoção</p>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={detailAthlete.meetsCheckins ? 'text-green-400 flex items-center gap-1' : 'text-amber-400 flex items-center gap-1'}>
                          {detailAthlete.meetsCheckins ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          Check-ins (inclui offsets)
                        </span>
                        <span className="text-gray-400">{detailAthlete.checkins}/{detailAthlete.min_checkins}</span>
                      </div>
                      <ProgressBar value={detailAthlete.checkins} max={detailAthlete.min_checkins} ok={detailAthlete.meetsCheckins} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={detailAthlete.meetsTime ? 'text-green-400 flex items-center gap-1' : 'text-amber-400 flex items-center gap-1'}>
                          {detailAthlete.meetsTime ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          Meses na faixa atual
                        </span>
                        <span className="text-gray-400">{detailAthlete.months_in_grade}/{detailAthlete.min_months}</span>
                      </div>
                      <ProgressBar value={detailAthlete.months_in_grade} max={detailAthlete.min_months} ok={detailAthlete.meetsTime} />
                    </div>
                  </div>

                  {/* Last promotion date */}
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-blue-300 text-sm font-medium mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data da Última Graduação
                    </p>
                    <p className="text-gray-500 text-xs mb-3">
                      Define o ponto de partida para o cálculo de tempo na faixa atual.
                    </p>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <input
                          type="date"
                          value={lastPromoDate}
                          onChange={e => setLastPromoDate(e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <button
                        onClick={saveDate}
                        disabled={savingDate || !lastPromoDate}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 text-sm font-medium transition-colors disabled:opacity-40"
                      >
                        {savingDate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar
                      </button>
                    </div>
                  </div>

                  {/* Offset — add historical presences */}
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-amber-300 text-sm font-medium mb-1 flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      Adicionar Presenças Históricas
                    </p>
                    <p className="text-gray-500 text-xs mb-3">
                      Use para contabilizar presenças anteriores ao Titan. Cada presença conta como 1 check-in na elegibilidade.
                    </p>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">Nº de presenças</label>
                          <input
                            type="number"
                            min={1}
                            value={offsetValue}
                            onChange={e => setOffsetValue(e.target.value)}
                            placeholder="Ex: 45"
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">
                            Pontos a adicionar
                            {offsetValue && <span className="text-amber-400 ml-1">= {Number(offsetValue) * 10} pts</span>}
                          </label>
                          <input
                            disabled
                            value={offsetValue ? `${Number(offsetValue) * 10} pontos` : ''}
                            placeholder="Calculado automaticamente"
                            className="w-full bg-black/10 border border-white/5 rounded-lg px-3 py-2 text-gray-500 text-sm cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Observação (opcional)</label>
                        <input
                          type="text"
                          value={offsetDesc}
                          onChange={e => setOffsetDesc(e.target.value)}
                          placeholder="Ex: Presenças jan/2024 a dez/2024"
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <button
                        onClick={saveOffset}
                        disabled={savingOffset || !offsetValue || Number(offsetValue) < 1}
                        className="flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 text-sm font-medium transition-colors disabled:opacity-40"
                      >
                        {savingOffset ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Adicionar {offsetValue ? `${Number(offsetValue) * 10} pontos` : 'pontos'}
                      </button>
                    </div>
                  </div>

                  {/* Points history (last entries) */}
                  {detail.pointsHistory.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <p className="text-white text-sm font-medium mb-3">Histórico de Pontos</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {detail.pointsHistory.map((h, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                            <div>
                              <p className="text-gray-300 text-xs">{h.descricao}</p>
                              <p className="text-gray-600 text-[10px]">
                                {new Date(h.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <span className={`text-xs font-semibold ${h.tipo === 'offset' ? 'text-amber-400' : 'text-green-400'}`}>
                              +{h.pontos}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
