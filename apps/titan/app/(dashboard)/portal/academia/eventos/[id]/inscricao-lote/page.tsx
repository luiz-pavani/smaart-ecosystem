'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Loader2, Users, Check, X, Search, Send, Plus, AlertCircle,
  CreditCard, Mail, Wallet,
} from 'lucide-react'
import { getSelectedAcademiaId } from '@/lib/portal/resolveAcademiaId'
import CheckoutModal, { CheckoutProduto, CheckoutCustomer } from '@/components/checkout/CheckoutModal'

interface AgeGroup { id: string; nome: string; idade_min: number; idade_max: number | null }
interface WeightClass { id: string; nome: string; peso_min: number | null; peso_max: number | null }
interface Category {
  id: string
  nome_display: string
  genero: string
  taxa_inscricao: number | null
  ativo: boolean
  age_group: AgeGroup | null
  weight_class: WeightClass | null
}
interface Atleta {
  id: string
  nome_completo: string
  email: string | null
  telefone: string | null
  genero: string | null
  data_nascimento: string | null
  peso_atual: number | null
  kyu_dan_id: number | null
  cpf: string | null
}
interface Inscricao {
  id: string
  atleta_id: string
  category_id: string
  status: string
  valor_pago: number | null
  peso_inscricao: number | null
}
interface Evento {
  id: string
  nome: string
  data_evento: string | null
  valor_inscricao: number | null
  taxa_inscricao: number | null
}

interface NovaInscricao {
  atleta_id: string
  category_id: string
  peso_inscricao?: number | null
}

interface ResultadoInscricao {
  atleta_id: string
  status: 'ok' | 'error'
  registration_id?: string
  message?: string
}

// Helper: idade a partir de data_nascimento
function calcAge(d?: string | null): number | null {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  return Math.floor((Date.now() - dt.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

// Filtragem de categorias compatíveis com o atleta
function categoriesForAthlete(cats: Category[], a: Atleta, pesoOverride?: number | null): Category[] {
  const idade = calcAge(a.data_nascimento)
  const peso = pesoOverride ?? a.peso_atual
  return cats.filter(c => {
    if (!c.ativo) return false
    if (a.genero && c.genero && c.genero !== a.genero) return false
    if (c.age_group && idade !== null) {
      if (idade < c.age_group.idade_min) return false
      if (c.age_group.idade_max && idade > c.age_group.idade_max) return false
    }
    if (c.weight_class && peso !== null) {
      if (c.weight_class.peso_min !== null && peso < Number(c.weight_class.peso_min)) return false
      if (c.weight_class.peso_max !== null && peso > Number(c.weight_class.peso_max)) return false
    }
    return true
  })
}

export default function InscricaoLotePage() {
  const router = useRouter()
  const { id: eventoId } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [evento, setEvento] = useState<Evento | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [search, setSearch] = useState('')
  // novas[atleta_id] = array de { category_id, peso }
  const [novas, setNovas] = useState<Record<string, NovaInscricao[]>>({})
  const [pesos, setPesos] = useState<Record<string, string>>({})
  const [results, setResults] = useState<ResultadoInscricao[] | null>(null)
  const [showPagto, setShowPagto] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const academiaId = getSelectedAcademiaId()
      if (!academiaId) { setLoading(false); return }
      const res = await fetch(`/api/eventos/${eventoId}/inscricao-lote/contexto?academia_id=${academiaId}`)
      if (res.status === 403) { setForbidden(true); return }
      const data = await res.json()
      setEvento(data.evento)
      setCategories(data.categories || [])
      setAtletas(data.atletas || [])
      setInscricoes(data.inscricoes || [])
    } finally {
      setLoading(false)
    }
  }, [eventoId])

  useEffect(() => { load() }, [load])

  const valorPorInscricao = useMemo(() => {
    return Number(evento?.taxa_inscricao || evento?.valor_inscricao || 0)
  }, [evento])

  // Inscrições existentes agrupadas por atleta
  const inscMap = useMemo(() => {
    const m = new Map<string, Inscricao[]>()
    for (const i of inscricoes) {
      const arr = m.get(i.atleta_id) || []
      arr.push(i)
      m.set(i.atleta_id, arr)
    }
    return m
  }, [inscricoes])

  const catById = useMemo(() => {
    const m = new Map<string, Category>()
    for (const c of categories) m.set(c.id, c)
    return m
  }, [categories])

  const filtered = useMemo(() => {
    if (!search.trim()) return atletas
    const q = search.toLowerCase()
    return atletas.filter(a => a.nome_completo?.toLowerCase().includes(q))
  }, [atletas, search])

  const totalNovas = useMemo(() => {
    return Object.values(novas).reduce((acc, arr) => acc + arr.length, 0)
  }, [novas])

  const valorTotal = useMemo(() => totalNovas * valorPorInscricao, [totalNovas, valorPorInscricao])

  // Add category for atleta (multi-category allowed)
  const addCategoria = (atletaId: string, categoryId: string) => {
    const peso = pesos[atletaId] ? Number(pesos[atletaId]) : null
    setNovas(prev => {
      const arr = prev[atletaId] || []
      // dedup
      if (arr.some(x => x.category_id === categoryId)) return prev
      // bloqueia se já tem inscrição existente na mesma categoria
      const exists = (inscMap.get(atletaId) || []).some(i => i.category_id === categoryId)
      if (exists) return prev
      return { ...prev, [atletaId]: [...arr, { atleta_id: atletaId, category_id: categoryId, peso_inscricao: peso }] }
    })
  }

  const removeNova = (atletaId: string, categoryId: string) => {
    setNovas(prev => {
      const arr = (prev[atletaId] || []).filter(x => x.category_id !== categoryId)
      const next = { ...prev }
      if (arr.length === 0) delete next[atletaId]
      else next[atletaId] = arr
      return next
    })
  }

  const handleSubmit = async () => {
    const payload = Object.values(novas).flat()
    if (payload.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/inscricao-lote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inscricoes: payload }),
      })
      const json = await res.json()
      setResults(json.results || [])
      if (json.ok > 0 && valorTotal > 0) {
        setShowPagto(true)  // abre modal "Como cobrar?"
      } else {
        load()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const okIds = useMemo(
    () => (results || []).filter(r => r.status === 'ok' && r.registration_id).map(r => r.registration_id!),
    [results]
  )

  const handleCobrarAtletas = async () => {
    const res = await fetch(`/api/eventos/${eventoId}/inscricao-lote/cobrar-atletas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_ids: okIds }),
    })
    const data = await res.json()
    setShowPagto(false)
    setFlash({ ok: res.ok, msg: res.ok ? `📧 Email enviado para ${data.sent} atleta(s)` : data.error || 'Erro' })
    setTimeout(() => setFlash(null), 5000)
    setResults(null); setNovas({}); load()
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <div className="text-red-300 text-lg font-bold mb-1">Sem permissão</div>
          <p className="text-slate-400 text-sm">Apenas técnicos/staff da academia podem inscrever em lote.</p>
        </div>
      </div>
    )
  }

  const statusBadge = (status: string) => {
    if (['confirmed', 'pago', 'aprovado'].includes(status)) return { color: 'emerald', label: 'PAGO' }
    if (status === 'pending_payment') return { color: 'amber', label: 'PENDENTE' }
    if (status === 'pending_waivers') return { color: 'blue', label: 'AGUARDA TERMOS' }
    if (status === 'cancelled') return { color: 'red', label: 'CANCELADO' }
    return { color: 'slate', label: status.toUpperCase() }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-pink-400" />Inscrição em Lote
          </h1>
          <p className="text-slate-400 text-sm mt-1">{evento?.nome || 'Evento'}</p>
          {valorPorInscricao > 0 && (
            <p className="text-cyan-400 text-xs mt-1">R$ {valorPorInscricao.toFixed(2)} por inscrição</p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 pb-32">
        {flash && (
          <div className={`mb-4 px-4 py-2 rounded-lg border text-sm ${
            flash.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>{flash.msg}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar atleta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500"
              />
            </div>

            {atletas.length === 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center text-slate-400 text-sm">
                Nenhum atleta na sua academia. Cadastre atletas antes de inscrever.
              </div>
            )}

            <div className="space-y-2">
              {filtered.map(atleta => {
                const idade = calcAge(atleta.data_nascimento)
                const pesoOverride = pesos[atleta.id] ? Number(pesos[atleta.id]) : undefined
                const matchingCats = categoriesForAthlete(categories, atleta, pesoOverride)
                const existentes = inscMap.get(atleta.id) || []
                const novasDoAtleta = novas[atleta.id] || []
                const semDados = !atleta.data_nascimento || !atleta.genero

                return (
                  <div key={atleta.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{atleta.nome_completo}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {atleta.genero || '—'} · {idade !== null ? `${idade} anos` : 'sem idade'} · {atleta.peso_atual ? `${atleta.peso_atual}kg` : 'sem peso'}
                        </div>

                        {/* Badges de inscrições EXISTENTES */}
                        {existentes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {existentes.map(i => {
                              const cat = catById.get(i.category_id)
                              const b = statusBadge(i.status)
                              return (
                                <span
                                  key={i.id}
                                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-${b.color}-500/15 border border-${b.color}-500/30 text-${b.color}-300`}
                                  title={`Inscrição ${i.id}`}
                                >
                                  <span className="font-mono text-[10px]">{b.label}</span>
                                  <span>· {cat?.nome_display || '—'}</span>
                                </span>
                              )
                            })}
                          </div>
                        )}

                        {/* Badges de inscrições NOVAS (a serem submetidas) */}
                        {novasDoAtleta.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {novasDoAtleta.map(n => {
                              const cat = catById.get(n.category_id)
                              return (
                                <span
                                  key={n.category_id}
                                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-200"
                                >
                                  <span>+ {cat?.nome_display || '—'}</span>
                                  <button
                                    onClick={() => removeNova(atleta.id, n.category_id)}
                                    className="hover:text-white"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {semDados ? (
                      <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
                        ⚠ Faltam gênero ou data de nascimento — complete o perfil do atleta para inscrever
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {!atleta.peso_atual && (
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Peso (kg) — opcional pra filtrar categoria"
                            value={pesos[atleta.id] || ''}
                            onChange={e => setPesos(p => ({ ...p, [atleta.id]: e.target.value }))}
                            className="bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-slate-600"
                          />
                        )}
                        <select
                          value=""
                          onChange={e => {
                            if (e.target.value) {
                              addCategoria(atleta.id, e.target.value)
                              e.target.value = ''
                            }
                          }}
                          className={`bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white ${!atleta.peso_atual ? '' : 'md:col-span-2'}`}
                        >
                          <option value="">+ Adicionar categoria ({matchingCats.length} compatíveis)</option>
                          {matchingCats
                            .filter(c => !existentes.some(i => i.category_id === c.id))
                            .filter(c => !novasDoAtleta.some(n => n.category_id === c.id))
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.nome_display}</option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Submit bar */}
      {totalNovas > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur border-t border-white/10 p-4 z-30">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-white font-semibold">
                {totalNovas} inscrição{totalNovas > 1 ? 'ões' : ''} pendente{totalNovas > 1 ? 's' : ''}
              </div>
              {valorTotal > 0 && (
                <div className="text-cyan-400 text-xs">Total: R$ {valorTotal.toFixed(2)}</div>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-pink-700 transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Inscrever
            </button>
          </div>
        </div>
      )}

      {/* Modal pós-inscrição: como pagar */}
      {showPagto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6">
            <div className="text-center mb-5">
              <Wallet className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-white">Inscrições criadas ✓</h2>
              <p className="text-slate-400 text-sm mt-1">
                {(results || []).filter(r => r.status === 'ok').length} aprovadas ·
                {' '}{(results || []).filter(r => r.status === 'error').length} com erro
              </p>
              {valorTotal > 0 && <p className="text-cyan-300 text-lg font-bold mt-2">Total a pagar: R$ {valorTotal.toFixed(2)}</p>}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setShowPagto(false); setShowCheckout(true) }}
                className="w-full p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-left flex items-center gap-3 transition-all"
              >
                <CreditCard className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-emerald-300 font-semibold">Pagar tudo agora</div>
                  <div className="text-emerald-200/70 text-xs">PIX ou cartão — você (técnico) paga o total</div>
                </div>
              </button>

              <button
                onClick={handleCobrarAtletas}
                className="w-full p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-left flex items-center gap-3 transition-all"
              >
                <Mail className="w-6 h-6 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-amber-300 font-semibold">Cobrar cada atleta</div>
                  <div className="text-amber-200/70 text-xs">Envia email para cada atleta com link de pagamento</div>
                </div>
              </button>

              <button
                onClick={() => { setShowPagto(false); setResults(null); setNovas({}); load() }}
                className="w-full p-3 text-slate-400 hover:text-white text-sm"
              >
                Pagar depois
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CheckoutModal — Técnico paga tudo */}
      {showCheckout && evento && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => { setShowCheckout(false); setResults(null); setNovas({}); load() }}
          produto={{
            produto: 'evento_bulk',
            referencia_ids: okIds,
            valor: valorTotal,
            descricao: `${okIds.length} inscrições — ${evento.nome}`,
          } as CheckoutProduto}
          customer={{
            name: 'Técnico',
            identity: '',  // CheckoutModal pede inline se faltar
            email: '',
          } as CheckoutCustomer}
          onSuccess={() => {
            setShowCheckout(false)
            setFlash({ ok: true, msg: '✓ Pagamento confirmado' })
            setResults(null); setNovas({}); load()
          }}
        />
      )}
    </div>
  )
}
