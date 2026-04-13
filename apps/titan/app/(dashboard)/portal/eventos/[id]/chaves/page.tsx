'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Loader2, Zap, Trash2, Eye, EyeOff, ChevronRight,
  Users, Swords, Check, X, Search, Filter, Trophy, Medal, Play, Settings2
} from 'lucide-react'
import BracketView from '@/components/eventos/BracketView'

interface Bracket {
  id: string
  category_id: string
  tipo: string
  status: string
  num_rodadas: number
  area_id: number
  ordem_no_dia: number | null
  hora_estimada: string | null
  seed_method: string
  config: Record<string, unknown>
  total_matches: number
  finished_matches: number
  total_athletes: number
  category: { id: string; nome_display: string; genero: string; tempo_luta_seg: number; golden_score_seg: number | null } | null
}

interface Category {
  id: string
  nome_display: string
  genero: string
  total_inscritos: number
}

const TIPO_LABELS: Record<string, string> = {
  'gold_medal': 'Medalha de ouro direta',
  'best_of_3': 'Melhor de 3',
  'single_elimination': 'Eliminacao Simples',
  'single_elimination_bronze': 'Eliminacao + Bronze',
  'single_elimination_repechage': 'Eliminacao + Repescagem IJF',
  'double_elimination': 'Dupla Eliminacao',
  'round_robin': 'Todos contra Todos',
  'group_stage_elimination': 'Fase de Grupos + Eliminacao',
}

// Must match DEFAULT_BRACKET_RULES in bracket-generator.ts
const DEFAULT_RULES = [
  { min: 1, max: 1, tipo: 'gold_medal' },
  { min: 2, max: 2, tipo: 'best_of_3' },
  { min: 3, max: 4, tipo: 'round_robin' },
  { min: 5, max: 8, tipo: 'single_elimination_repechage' },
  { min: 9, max: 999, tipo: 'single_elimination_repechage' },
]

function resolveTypeForCount(n: number, rules?: Array<{min:number;max:number;tipo:string}>): string {
  const r = (rules || DEFAULT_RULES).find(rule => n >= rule.min && n <= rule.max)
  return r?.tipo || 'single_elimination_repechage'
}

function tipoShortLabel(tipo: string): string {
  const map: Record<string, string> = {
    'gold_medal': 'Ouro',
    'best_of_3': 'Bo3',
    'round_robin': 'RR',
    'single_elimination': 'SE',
    'single_elimination_bronze': 'SE+B',
    'single_elimination_repechage': 'Rep',
    'double_elimination': 'DE',
    'group_stage_elimination': 'GS',
  }
  return map[tipo] || tipo
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  'draft': { label: 'Rascunho', color: 'bg-slate-500/20 text-slate-300' },
  'published': { label: 'Publicada', color: 'bg-cyan-500/20 text-cyan-300' },
  'in_progress': { label: 'Em Andamento', color: 'bg-yellow-500/20 text-yellow-300' },
  'finished': { label: 'Finalizada', color: 'bg-green-500/20 text-green-300' },
}

export default function ChavesPage() {
  const router = useRouter()
  const params = useParams()
  const eventoId = params.id as string

  const [brackets, setBrackets] = useState<Bracket[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [eventoNome, setEventoNome] = useState('')

  // Generate modal
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set())
  const [bracketType, setBracketType] = useState('auto')
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{ total: number; results: Array<{ category_id: string; error?: string }> } | null>(null)

  // Detail view
  const [selectedBracket, setSelectedBracket] = useState<string | null>(null)
  const [bracketDetail, setBracketDetail] = useState<{ bracket: Bracket; slots: unknown[]; matches: unknown[] } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Result modal
  const [resultModal, setResultModal] = useState<{ match: Record<string, unknown> } | null>(null)
  const [resultData, setResultData] = useState({ winner: '', resultado: '', resultado_detalhe: '' })
  const [savingResult, setSavingResult] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    try {
      const [bRes, cRes, eRes] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/brackets`),
        fetch(`/api/eventos/${eventoId}/categories`),
        fetch(`/api/eventos/${eventoId}`),
      ])
      const bJson = await bRes.json()
      const cJson = await cRes.json()
      const eJson = await eRes.json()
      if (bRes.ok) setBrackets(bJson.brackets || [])
      if (cRes.ok) setCategories(cJson.categories || [])
      if (eRes.ok) setEventoNome(eJson.evento?.nome || '')
    } catch { /* silent */ } finally { setLoading(false) }
  }, [eventoId])

  useEffect(() => { load() }, [load])

  // Load bracket detail
  const loadBracketDetail = async (bracketId: string) => {
    setLoadingDetail(true)
    setSelectedBracket(bracketId)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/brackets/${bracketId}`)
      const json = await res.json()
      if (res.ok) setBracketDetail(json)
    } catch { /* silent */ } finally { setLoadingDetail(false) }
  }

  // Generate brackets
  const handleGenerate = async () => {
    if (selectedCats.size === 0) return
    setGenerating(true)
    setGenerateResult(null)
    try {
      const payload: Record<string, unknown> = {
        category_ids: Array.from(selectedCats),
        config: { academy_separation: true },
      }
      // Only send tipo if not "auto" (let the server use bracket rules)
      if (bracketType !== 'auto') payload.tipo = bracketType
      const res = await fetch(`/api/eventos/${eventoId}/brackets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      setGenerateResult(json)
      if (res.ok) await load()
    } catch { /* silent */ } finally { setGenerating(false) }
  }

  // Delete bracket
  const handleDelete = async (bracketId: string) => {
    if (!confirm('Remover esta chave? Todos os dados de lutas serao perdidos.')) return
    try {
      const res = await fetch(`/api/eventos/${eventoId}/brackets/${bracketId}`, { method: 'DELETE' })
      if (res.ok) {
        if (selectedBracket === bracketId) { setSelectedBracket(null); setBracketDetail(null) }
        await load()
      }
    } catch { /* silent */ }
  }

  // Publish/unpublish bracket
  const handleStatusChange = async (bracketId: string, newStatus: string) => {
    try {
      await fetch(`/api/eventos/${eventoId}/brackets/${bracketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await load()
      if (selectedBracket === bracketId) await loadBracketDetail(bracketId)
    } catch { /* silent */ }
  }

  // Save match result
  const handleSaveResult = async () => {
    if (!resultModal || !resultData.winner) return
    setSavingResult(true)
    const match = resultModal.match
    try {
      const res = await fetch(
        `/api/eventos/${eventoId}/brackets/${match.bracket_id}/matches/${match.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            winner_registration_id: resultData.winner,
            resultado: resultData.resultado || null,
            resultado_detalhe: resultData.resultado_detalhe || null,
          }),
        }
      )
      if (res.ok) {
        setResultModal(null)
        setResultData({ winner: '', resultado: '', resultado_detalhe: '' })
        if (selectedBracket) await loadBracketDetail(selectedBracket)
        await load()
      }
    } catch { /* silent */ } finally { setSavingResult(false) }
  }

  // Categories without brackets
  const catsWithBrackets = new Set(brackets.map(b => b.category_id))
  const catsAvailable = categories.filter(c => !catsWithBrackets.has(c.id) && c.total_inscritos >= 1)

  // Filtered brackets
  const filtered = brackets.filter(b => {
    if (search && !b.category?.nome_display.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && b.status !== statusFilter) return false
    return true
  })

  // Stats
  const totalBrackets = brackets.length
  const totalMatches = brackets.reduce((s, b) => s + b.total_matches, 0)
  const finishedMatches = brackets.reduce((s, b) => s + b.finished_matches, 0)
  const totalAthletes = brackets.reduce((s, b) => s + b.total_athletes, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button onClick={() => router.push(`/portal/eventos/${eventoId}`)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar ao Evento
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Swords className="w-8 h-8 text-cyan-400" />Chaves & Lutas
              </h1>
              <p className="text-slate-400 text-sm mt-1">{eventoNome}</p>
            </div>
            <button
              onClick={() => { setShowGenerate(true); setGenerateResult(null); setSelectedCats(new Set()) }}
              disabled={catsAvailable.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40"
            >
              <Zap className="w-4 h-4" />Gerar Chaves
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Chaves</div>
            <div className="text-2xl font-bold text-white">{totalBrackets}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Atletas</div>
            <div className="text-2xl font-bold text-white">{totalAthletes}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Lutas</div>
            <div className="text-2xl font-bold text-white">{finishedMatches}/{totalMatches}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Progresso</div>
            <div className="text-2xl font-bold text-cyan-300">{totalMatches > 0 ? Math.round(finishedMatches / totalMatches * 100) : 0}%</div>
          </div>
        </div>

        {/* Generate Modal */}
        {showGenerate && (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Gerar Chaves</h3>
              <button onClick={() => setShowGenerate(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {generateResult ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-white font-bold">{generateResult.total} chaves geradas</div>
                    <div className="text-slate-400 text-sm">{generateResult.results.filter(r => r.error).length} erros</div>
                  </div>
                </div>
                {generateResult.results.filter(r => r.error).map((r, i) => (
                  <div key={i} className="text-xs text-red-400 mb-1">{r.error}</div>
                ))}
                <button onClick={() => setShowGenerate(false)} className="mt-3 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg text-sm font-medium">Fechar</button>
              </div>
            ) : (
              <div>
                {/* Bracket type */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Modo de Chave</label>
                  <select
                    value={bracketType}
                    onChange={e => setBracketType(e.target.value)}
                    className="w-full max-w-md px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  >
                    <option value="auto">Automatico (usar regras do evento)</option>
                    <option disabled>──────────────</option>
                    {Object.entries(TIPO_LABELS).filter(([k]) => k !== 'gold_medal').map(([k, v]) => <option key={k} value={k}>{v} (forcar para todas)</option>)}
                  </select>
                  {bracketType === 'auto' && (
                    <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Regras ativas</div>
                      <div className="flex flex-wrap gap-1.5">
                        {DEFAULT_RULES.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-slate-300">
                            {r.min === r.max ? `${r.min}` : `${r.min}-${r.max > 100 ? '∞' : r.max}`} atletas → <span className="text-cyan-400">{TIPO_LABELS[r.tipo] || r.tipo}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Categories */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-300">Categorias ({catsAvailable.length} disponiveis)</label>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedCats(new Set(catsAvailable.map(c => c.id)))} className="text-xs px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30">Todas</button>
                      <button onClick={() => setSelectedCats(new Set())} className="text-xs px-3 py-1 bg-white/5 text-slate-400 rounded hover:bg-white/10">Limpar</button>
                    </div>
                  </div>

                  {catsAvailable.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhuma categoria disponivel (todas ja possuem chave ou nao tem inscritos).</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                      {catsAvailable.map(cat => {
                        const autoTipo = bracketType === 'auto' ? resolveTypeForCount(cat.total_inscritos) : bracketType
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCats(prev => {
                                const next = new Set(prev)
                                if (next.has(cat.id)) next.delete(cat.id)
                                else next.add(cat.id)
                                return next
                              })
                            }}
                            className={`p-2 rounded-lg border text-left text-sm transition-all ${
                              selectedCats.has(cat.id)
                                ? 'bg-cyan-500/20 border-cyan-500/40 text-white'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            <div className="font-medium text-xs">{cat.nome_display}</div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[10px] opacity-60">{cat.total_inscritos} atleta{cat.total_inscritos !== 1 ? 's' : ''}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                autoTipo === 'gold_medal' ? 'bg-yellow-500/20 text-yellow-300' :
                                autoTipo === 'best_of_3' ? 'bg-purple-500/20 text-purple-300' :
                                autoTipo === 'round_robin' ? 'bg-green-500/20 text-green-300' :
                                'bg-cyan-500/20 text-cyan-300'
                              }`}>{tipoShortLabel(autoTipo)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating || selectedCats.size === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-40 transition-all"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {generating ? 'Gerando...' : `Gerar ${selectedCats.size} Chaves`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        {brackets.length > 0 && (
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por categoria..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="published">Publicada</option>
              <option value="in_progress">Em Andamento</option>
              <option value="finished">Finalizada</option>
            </select>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : selectedBracket && bracketDetail ? (
          /* Bracket Detail View */
          <div>
            <button onClick={() => { setSelectedBracket(null); setBracketDetail(null) }} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />Voltar para lista
            </button>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{(bracketDetail.bracket as Bracket).category?.nome_display}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>{TIPO_LABELS[(bracketDetail.bracket as Bracket).tipo] || (bracketDetail.bracket as Bracket).tipo}</span>
                    <span className={`px-2 py-0.5 rounded ${STATUS_BADGES[(bracketDetail.bracket as Bracket).status]?.color || ''}`}>
                      {STATUS_BADGES[(bracketDetail.bracket as Bracket).status]?.label || (bracketDetail.bracket as Bracket).status}
                    </span>
                    <span>{(bracketDetail.bracket as Bracket).total_athletes} atletas</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(bracketDetail.bracket as Bracket).status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange((bracketDetail.bracket as Bracket).id, 'published')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-medium hover:bg-cyan-500/30"
                    >
                      <Eye className="w-3.5 h-3.5" />Publicar
                    </button>
                  )}
                  {(bracketDetail.bracket as Bracket).status === 'published' && (
                    <button
                      onClick={() => handleStatusChange((bracketDetail.bracket as Bracket).id, 'draft')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-xs font-medium hover:bg-white/10"
                    >
                      <EyeOff className="w-3.5 h-3.5" />Despublicar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete((bracketDetail.bracket as Bracket).id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />Remover
                  </button>
                </div>
              </div>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
            ) : (
              <BracketView
                matches={bracketDetail.matches as never[]}
                slots={bracketDetail.slots as never[]}
                bracketType={(bracketDetail.bracket as Bracket).tipo}
                numRodadas={(bracketDetail.bracket as Bracket).num_rodadas}
                onMatchClick={(match) => {
                  if (match.status === 'ready' || match.status === 'in_progress') {
                    // Option: open scoreboard or register result directly
                    const useScoreboard = confirm('Abrir Placar Operador?\n\nOK = Placar com cronometro\nCancelar = Registrar resultado manual')
                    if (useScoreboard) {
                      router.push(`/portal/eventos/${eventoId}/scoring/${match.id}`)
                    } else {
                      setResultModal({ match: match as unknown as Record<string, unknown> })
                      setResultData({ winner: '', resultado: '', resultado_detalhe: '' })
                    }
                  }
                }}
              />
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Swords className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhuma chave gerada</h3>
            <p className="text-slate-400 mb-4">Use o botao "Gerar Chaves" para criar as chaves a partir das categorias com inscritos.</p>
          </div>
        ) : (
          /* Bracket List */
          <div className="space-y-3">
            {filtered.map(b => {
              const status = STATUS_BADGES[b.status] || { label: b.status, color: '' }
              const progress = b.total_matches > 0 ? Math.round(b.finished_matches / b.total_matches * 100) : 0
              return (
                <div
                  key={b.id}
                  onClick={() => loadBracketDetail(b.id)}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-white text-sm">{b.category?.nome_display || 'Sem categoria'}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status.color}`}>{status.label}</span>
                        {b.category?.genero && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.category.genero === 'Masculino' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-pink-500/20 text-pink-300'
                          }`}>
                            {b.category.genero === 'Masculino' ? 'M' : 'F'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.total_athletes} atletas</span>
                        <span className="flex items-center gap-1"><Swords className="w-3 h-3" />{b.finished_matches}/{b.total_matches} lutas</span>
                        <span>{TIPO_LABELS[b.tipo] || b.tipo}</span>
                        {b.area_id && <span>Area {b.area_id}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Progress bar */}
                      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{progress}%</span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Result Modal */}
      {resultModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Registrar Resultado</h3>
              <button onClick={() => setResultModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="text-xs text-slate-400 mb-4">Luta #{(resultModal.match as Record<string, unknown>).match_number as number}</div>

            {/* Winner selection */}
            <div className="space-y-2 mb-4">
              <label className="text-sm font-semibold text-slate-300">Vencedor</label>
              {[
                { key: 'athlete1_registration_id', color: 'Branco', dados: (resultModal.match as Record<string, unknown>).athlete1 },
                { key: 'athlete2_registration_id', color: 'Azul', dados: (resultModal.match as Record<string, unknown>).athlete2 },
              ].map(({ key, color, dados }) => {
                const regId = (resultModal.match as Record<string, unknown>)[key] as string | null
                if (!regId) return null
                const atletaDados = dados && typeof dados === 'object' && 'dados_atleta' in dados
                  ? (dados as Record<string, unknown>).dados_atleta as Record<string, unknown>
                  : null
                const nome = getAthleteName(atletaDados)
                return (
                  <button
                    key={key}
                    onClick={() => setResultData(prev => ({ ...prev, winner: regId }))}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      resultData.winner === regId
                        ? 'bg-green-500/20 border-green-500/40 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-6 rounded-full ${color === 'Branco' ? 'bg-white/80' : 'bg-blue-400/80'}`} />
                      <div>
                        <div className="text-sm font-medium">{nome}</div>
                        <div className="text-[10px] opacity-60">{color}</div>
                      </div>
                      {resultData.winner === regId && <Trophy className="w-4 h-4 text-amber-400 ml-auto" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Resultado */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Resultado</label>
              <select
                value={resultData.resultado}
                onChange={e => setResultData(prev => ({ ...prev, resultado: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
              >
                <option value="">Selecionar...</option>
                <option value="ippon">Ippon</option>
                <option value="waza-ari">Waza-ari</option>
                <option value="golden_score">Golden Score</option>
                <option value="hansoku-make">Hansoku-make</option>
                <option value="fusen-gachi">Fusen-gachi (W.O.)</option>
                <option value="kiken-gachi">Kiken-gachi (Desistencia)</option>
                <option value="sogo-gachi">Sogo-gachi (Combinado)</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Observacao (opcional)</label>
              <input
                type="text"
                value={resultData.resultado_detalhe}
                onChange={e => setResultData(prev => ({ ...prev, resultado_detalhe: e.target.value }))}
                placeholder="Ex: Ippon no golden score"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setResultModal(null)} className="flex-1 px-4 py-2.5 bg-white/5 text-slate-300 rounded-lg text-sm font-medium hover:bg-white/10">
                Cancelar
              </button>
              <button
                onClick={handleSaveResult}
                disabled={!resultData.winner || savingResult}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg disabled:opacity-40"
              >
                {savingResult ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getAthleteName(dados: Record<string, unknown> | null | undefined): string {
  if (!dados) return '—'
  return (dados.nome_completo as string) || (dados.nome as string) || '—'
}
