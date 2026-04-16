'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Users, Check, X, Search, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getSelectedAcademiaId } from '@/lib/portal/resolveAcademiaId'

interface Atleta {
  stakeholder_id: string
  nome_completo: string
  genero: string
  data_nascimento: string
  kyu_dan_id: number | null
}

interface Category {
  id: string
  nome_display: string
  genero: string
}

interface Result {
  atleta_id: string
  status: 'ok' | 'error'
  message?: string
}

export default function InscricaoLotePage() {
  const router = useRouter()
  const { id: eventoId } = useParams<{ id: string }>()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [eventoNome, setEventoNome] = useState('')
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Record<string, string>>({}) // atleta_id → category_id
  const [results, setResults] = useState<Result[] | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const academiaId = getSelectedAcademiaId()
      if (!academiaId) return

      // Load event + categories + athletes in parallel
      const [evtRes, catRes, atsRes] = await Promise.all([
        fetch(`/api/eventos/${eventoId}`).then(r => r.json()),
        fetch(`/api/eventos/${eventoId}/categories`).then(r => r.json()),
        supabase
          .from('user_fed_lrsj')
          .select('stakeholder_id, nome_completo, genero, data_nascimento, kyu_dan_id')
          .eq('academia_id', academiaId)
          .eq('federacao_id', 1)
          .order('nome_completo'),
      ])

      setEventoNome(evtRes.evento?.nome || '')
      setCategories((catRes.categories || []).map((c: any) => ({ id: c.id, nome_display: c.nome_display, genero: c.genero })))
      setAtletas((atsRes.data || []).filter((a: any) => a.stakeholder_id))
    } finally {
      setLoading(false)
    }
  }

  const toggleAtleta = (atletaId: string, categoryId: string) => {
    setSelected(prev => {
      if (prev[atletaId] === categoryId) {
        const next = { ...prev }
        delete next[atletaId]
        return next
      }
      return { ...prev, [atletaId]: categoryId }
    })
  }

  const selectCategory = (atletaId: string, categoryId: string) => {
    setSelected(prev => ({ ...prev, [atletaId]: categoryId }))
  }

  const handleSubmit = async () => {
    const inscricoes = Object.entries(selected).map(([atleta_id, category_id]) => ({ atleta_id, category_id }))
    if (inscricoes.length === 0) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/inscricao-lote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inscricoes }),
      })
      const json = await res.json()
      setResults(json.results || [])
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = search
    ? atletas.filter(a => a.nome_completo?.toLowerCase().includes(search.toLowerCase()))
    : atletas

  const selectedCount = Object.keys(selected).length

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
          <p className="text-slate-400 text-sm mt-1">{eventoNome}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : results ? (
          /* Results */
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Resultado da Inscrição</h2>
            <div className="space-y-2">
              {results.map((r, i) => {
                const atleta = atletas.find(a => a.stakeholder_id === r.atleta_id)
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${r.status === 'ok' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    {r.status === 'ok' ? <Check className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />}
                    <span className="text-sm text-white">{atleta?.nome_completo || r.atleta_id}</span>
                    {r.message && <span className="text-xs text-slate-400 ml-auto">{r.message}</span>}
                  </div>
                )
              })}
            </div>
            <button onClick={() => { setResults(null); setSelected({}) }} className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/15 transition-all">
              Nova Inscrição
            </button>
          </div>
        ) : (
          <>
            {/* Search */}
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

            {/* Athletes list */}
            <div className="space-y-2 mb-6">
              {filtered.map(atleta => {
                const isSelected = !!selected[atleta.stakeholder_id]
                const matchingCats = categories.filter(c =>
                  !atleta.genero || c.genero === atleta.genero || c.genero === 'Misto'
                )

                return (
                  <div key={atleta.stakeholder_id} className={`bg-white/5 border rounded-lg p-3 transition-all ${isSelected ? 'border-pink-500/40 bg-pink-500/5' : 'border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-white">{atleta.nome_completo}</span>
                        <span className="text-xs text-slate-500 ml-2">{atleta.genero}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-pink-400" />}
                    </div>
                    <div className="mt-2">
                      <select
                        value={selected[atleta.stakeholder_id] || ''}
                        onChange={e => {
                          if (e.target.value) selectCategory(atleta.stakeholder_id, e.target.value)
                          else {
                            const next = { ...selected }
                            delete next[atleta.stakeholder_id]
                            setSelected(next)
                          }
                        }}
                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                      >
                        <option value="">Selecionar categoria...</option>
                        {matchingCats.map(c => (
                          <option key={c.id} value={c.id}>{c.nome_display}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Submit bar */}
            {selectedCount > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur border-t border-white/10 p-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                  <span className="text-sm text-white">{selectedCount} atleta{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}</span>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-pink-700 transition-all disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Inscrever Todos
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
