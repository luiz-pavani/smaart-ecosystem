'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Plus, Loader2, Trash2, Scale, Users, Clock, Search, Zap,
  Edit3, Save, X, ChevronDown, ChevronRight, Settings2, Timer, Pause
} from 'lucide-react'
import CategoryBuilder from '@/components/eventos/CategoryBuilder'

// ============ Types ============

interface AgeGroup {
  id: string
  nome: string
  idade_min: number
  idade_max: number | null
  tempo_luta_seg: number
  golden_score_seg: number | null
  intervalo_entre_lutas_seg: number
  modalidade: string
  ordem: number
  pesos_masc: number
  pesos_fem: number
}

interface WeightClass {
  id: string
  age_group_id: string
  genero: string
  nome: string
  peso_min: number | null
  peso_max: number | null
  ordem: number
}

interface Category {
  id: string
  nome_display: string
  genero: string
  taxa_inscricao: number
  limite_inscritos: number | null
  tempo_luta_seg: number
  golden_score_seg: number | null
  intervalo_entre_lutas_seg: number | null
  total_inscritos: number
  ativo: boolean
  age_group: { id: string; nome: string } | null
  weight_class: { id: string; nome: string; peso_min: number | null; peso_max: number | null } | null
}

// ============ Main Page ============

export default function CategoriasPage() {
  const router = useRouter()
  const params = useParams()
  const eventoId = params.id as string

  const [tab, setTab] = useState<'categorias' | 'divisoes'>('categorias')
  const [eventoNome, setEventoNome] = useState('')

  // --- Categories state ---
  const [categories, setCategories] = useState<Category[]>([])
  const [catLoading, setCatLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [search, setSearch] = useState('')
  const [generoFilter, setGeneroFilter] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Record<string, unknown>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCat, setNewCat] = useState({ nome_display: '', genero: 'Masculino', tempo_luta_seg: 240, golden_score_seg: '', taxa_inscricao: 0 })
  const [addingCat, setAddingCat] = useState(false)

  // --- Divisoes state ---
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([])
  const [divLoading, setDivLoading] = useState(true)
  const [expandedAg, setExpandedAg] = useState<string | null>(null)
  const [weightClasses, setWeightClasses] = useState<WeightClass[]>([])
  const [wcLoading, setWcLoading] = useState(false)
  const [editingAg, setEditingAg] = useState<string | null>(null)
  const [agFields, setAgFields] = useState<Record<string, unknown>>({})
  const [savingAg, setSavingAg] = useState(false)
  const [showAddAg, setShowAddAg] = useState(false)
  const [newAg, setNewAg] = useState({ nome: '', idade_min: 0, idade_max: '', tempo_luta_seg: 240, golden_score_seg: '', intervalo_entre_lutas_seg: 60 })
  const [addingAg, setAddingAg] = useState(false)
  const [showAddWc, setShowAddWc] = useState<string | null>(null)
  const [newWc, setNewWc] = useState({ nome: '', genero: 'Masculino', peso_min: '', peso_max: '' })
  const [addingWc, setAddingWc] = useState(false)
  const [deletingAg, setDeletingAg] = useState<string | null>(null)
  const [deletingWc, setDeletingWc] = useState<string | null>(null)

  // ============ Load ============

  const loadCategories = useCallback(async () => {
    setCatLoading(true)
    try {
      const [catRes, evRes] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/categories`),
        fetch(`/api/eventos/${eventoId}`)
      ])
      const catJson = await catRes.json()
      const evJson = await evRes.json()
      if (catRes.ok) setCategories(catJson.categories || [])
      if (evRes.ok) setEventoNome(evJson.evento?.nome || '')
    } catch { /* */ } finally { setCatLoading(false) }
  }, [eventoId])

  const loadAgeGroups = useCallback(async () => {
    setDivLoading(true)
    try {
      const res = await fetch('/api/eventos/categories/age-groups')
      const json = await res.json()
      if (res.ok) setAgeGroups(json.age_groups || [])
    } catch { /* */ } finally { setDivLoading(false) }
  }, [])

  const loadWeightClasses = async (agId: string) => {
    setWcLoading(true)
    try {
      const res = await fetch(`/api/eventos/categories/weight-classes?age_group_id=${agId}`)
      const json = await res.json()
      if (res.ok) setWeightClasses(json.weight_classes || [])
    } catch { /* */ } finally { setWcLoading(false) }
  }

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { if (tab === 'divisoes') loadAgeGroups() }, [tab, loadAgeGroups])

  // ============ Category Actions ============

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Remover esta categoria?')) return
    setDeleting(id)
    try {
      await fetch(`/api/eventos/${eventoId}/categories`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: id }),
      })
      await loadCategories()
    } catch { /* */ } finally { setDeleting(null) }
  }

  const handleSaveCatEdit = async () => {
    if (!editingCat) return
    setSavingEdit(true)
    try {
      await fetch(`/api/eventos/${eventoId}/categories`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: editingCat, ...editFields }),
      })
      setEditingCat(null)
      await loadCategories()
    } catch { /* */ } finally { setSavingEdit(false) }
  }

  const handleAddCat = async () => {
    setAddingCat(true)
    try {
      await fetch(`/api/eventos/${eventoId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_display: newCat.nome_display,
          genero: newCat.genero,
          tempo_luta_seg: newCat.tempo_luta_seg,
          golden_score_seg: newCat.golden_score_seg ? parseInt(newCat.golden_score_seg) : null,
          taxa_inscricao: newCat.taxa_inscricao,
        }),
      })
      setShowAddCat(false)
      setNewCat({ nome_display: '', genero: 'Masculino', tempo_luta_seg: 240, golden_score_seg: '', taxa_inscricao: 0 })
      await loadCategories()
    } catch { /* */ } finally { setAddingCat(false) }
  }

  // ============ Age Group Actions ============

  const handleSaveAg = async () => {
    if (!editingAg) return
    setSavingAg(true)
    try {
      await fetch('/api/eventos/categories/age-groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingAg, ...agFields }),
      })
      setEditingAg(null)
      await loadAgeGroups()
    } catch { /* */ } finally { setSavingAg(false) }
  }

  const handleAddAg = async () => {
    setAddingAg(true)
    try {
      await fetch('/api/eventos/categories/age-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: newAg.nome,
          idade_min: newAg.idade_min,
          idade_max: newAg.idade_max ? parseInt(newAg.idade_max) : null,
          tempo_luta_seg: newAg.tempo_luta_seg,
          golden_score_seg: newAg.golden_score_seg ? parseInt(newAg.golden_score_seg) : null,
          intervalo_entre_lutas_seg: newAg.intervalo_entre_lutas_seg,
        }),
      })
      setShowAddAg(false)
      setNewAg({ nome: '', idade_min: 0, idade_max: '', tempo_luta_seg: 240, golden_score_seg: '', intervalo_entre_lutas_seg: 60 })
      await loadAgeGroups()
    } catch { /* */ } finally { setAddingAg(false) }
  }

  const handleDeleteAg = async (id: string) => {
    if (!confirm('Remover esta divisao e todos os seus pesos?')) return
    setDeletingAg(id)
    try {
      const res = await fetch('/api/eventos/categories/age-groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) alert(json.error)
      else await loadAgeGroups()
    } catch { /* */ } finally { setDeletingAg(null) }
  }

  // ============ Weight Class Actions ============

  const handleAddWc = async (agId: string) => {
    setAddingWc(true)
    try {
      await fetch('/api/eventos/categories/weight-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age_group_id: agId,
          genero: newWc.genero,
          nome: newWc.nome,
          peso_min: newWc.peso_min ? parseFloat(newWc.peso_min) : null,
          peso_max: newWc.peso_max ? parseFloat(newWc.peso_max) : null,
        }),
      })
      setShowAddWc(null)
      setNewWc({ nome: '', genero: 'Masculino', peso_min: '', peso_max: '' })
      await loadWeightClasses(agId)
      await loadAgeGroups()
    } catch { /* */ } finally { setAddingWc(false) }
  }

  const handleDeleteWc = async (wcId: string, agId: string) => {
    setDeletingWc(wcId)
    try {
      await fetch('/api/eventos/categories/weight-classes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wcId }),
      })
      await loadWeightClasses(agId)
      await loadAgeGroups()
    } catch { /* */ } finally { setDeletingWc(null) }
  }

  // ============ Helpers ============

  const filteredCats = categories.filter(c => {
    if (search && !c.nome_display.toLowerCase().includes(search.toLowerCase())) return false
    if (generoFilter && c.genero !== generoFilter) return false
    return true
  })

  const formatTime = (seg: number) => `${Math.floor(seg / 60)}:${(seg % 60).toString().padStart(2, '0')}`
  const totalCats = categories.length
  const totalInscritos = categories.reduce((s, c) => s + c.total_inscritos, 0)
  const mascCount = categories.filter(c => c.genero === 'Masculino').length
  const femCount = categories.filter(c => c.genero === 'Feminino').length

  const ic = "px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
  const icSm = "px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs focus:outline-none focus:border-cyan-500"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button onClick={() => router.push(`/portal/eventos/${eventoId}`)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar ao Evento
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Scale className="w-8 h-8 text-green-400" />Categorias & Divisoes
              </h1>
              <p className="text-slate-400 text-sm mt-1">{eventoNome}</p>
            </div>
            {tab === 'categorias' && (
              <div className="flex gap-2">
                <button onClick={() => setShowAddCat(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 border border-white/10 text-sm">
                  <Plus className="w-4 h-4" />Adicionar
                </button>
                <button onClick={() => setShowBuilder(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg shadow-cyan-500/20">
                  <Zap className="w-4 h-4" />Gerar Categorias
                </button>
              </div>
            )}
            {tab === 'divisoes' && (
              <button onClick={() => setShowAddAg(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/20">
                <Plus className="w-4 h-4" />Nova Divisao
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            <button onClick={() => setTab('categorias')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'categorias' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'}`}>
              Categorias do Evento
            </button>
            <button onClick={() => setTab('divisoes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'divisoes' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'}`}>
              Divisoes & Pesos (Templates)
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ============ TAB: CATEGORIAS DO EVENTO ============ */}
        {tab === 'categorias' && (
          <>
            {/* Builder */}
            {showBuilder && (
              <div className="mb-8">
                <CategoryBuilder eventoId={eventoId} onComplete={() => { setShowBuilder(false); loadCategories() }} onCancel={() => setShowBuilder(false)} />
              </div>
            )}

            {/* Add category modal */}
            {showAddCat && (
              <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Adicionar Categoria Manualmente</h3>
                  <button onClick={() => setShowAddCat(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <input type="text" placeholder="Nome (ex: Sub-15 Masc -60kg)" value={newCat.nome_display}
                    onChange={e => setNewCat(p => ({ ...p, nome_display: e.target.value }))} className={`${ic} col-span-2`} />
                  <select value={newCat.genero} onChange={e => setNewCat(p => ({ ...p, genero: e.target.value }))} className={ic}>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                  <input type="number" placeholder="Tempo luta (seg)" value={newCat.tempo_luta_seg}
                    onChange={e => setNewCat(p => ({ ...p, tempo_luta_seg: parseInt(e.target.value) || 240 }))} className={ic} />
                  <input type="number" placeholder="Taxa R$" value={newCat.taxa_inscricao}
                    onChange={e => setNewCat(p => ({ ...p, taxa_inscricao: parseFloat(e.target.value) || 0 }))} step="0.01" className={ic} />
                </div>
                <button onClick={handleAddCat} disabled={addingCat || !newCat.nome_display.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-medium hover:bg-cyan-500/30 disabled:opacity-40">
                  {addingCat ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Criar Categoria
                </button>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">Total Categorias</div>
                <div className="text-2xl font-bold text-white">{totalCats}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">Total Inscritos</div>
                <div className="text-2xl font-bold text-white">{totalInscritos}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">Masculino</div>
                <div className="text-2xl font-bold text-cyan-300">{mascCount}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">Feminino</div>
                <div className="text-2xl font-bold text-pink-300">{femCount}</div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar categoria..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm" />
              </div>
              <select value={generoFilter} onChange={e => setGeneroFilter(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm">
                <option value="">Todos</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </select>
            </div>

            {/* Category Table */}
            {catLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
            ) : filteredCats.length === 0 ? (
              <div className="text-center py-16">
                <Scale className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Nenhuma categoria</h3>
                <p className="text-slate-400 mb-4">Use "Gerar Categorias" para criar automaticamente ou "Adicionar" para criar manualmente.</p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Categoria</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Genero</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase text-center">Tempo Luta</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase text-center">Intervalo</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase text-center">Valor</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase text-center">Inscritos</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase text-center">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCats.map(cat => {
                      const isEditing = editingCat === cat.id
                      return (
                        <tr key={cat.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input type="text" value={(editFields.nome_display as string) ?? cat.nome_display}
                                onChange={e => setEditFields(p => ({ ...p, nome_display: e.target.value }))} className={icSm} />
                            ) : (
                              <div>
                                <div className="font-medium text-white text-sm">{cat.nome_display}</div>
                                {cat.age_group && <div className="text-xs text-slate-500">{cat.age_group.nome}</div>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.genero === 'Masculino' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-pink-500/20 text-pink-300'}`}>
                              {cat.genero === 'Masculino' ? 'Masc' : 'Fem'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isEditing ? (
                              <input type="number" value={(editFields.tempo_luta_seg as number) ?? cat.tempo_luta_seg}
                                onChange={e => setEditFields(p => ({ ...p, tempo_luta_seg: parseInt(e.target.value) }))} className={`${icSm} w-20 text-center`} />
                            ) : (
                              <span className="text-sm text-slate-300 flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" />{formatTime(cat.tempo_luta_seg)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isEditing ? (
                              <input type="number" value={(editFields.intervalo_entre_lutas_seg as number) ?? cat.intervalo_entre_lutas_seg ?? ''}
                                onChange={e => setEditFields(p => ({ ...p, intervalo_entre_lutas_seg: parseInt(e.target.value) || null }))} className={`${icSm} w-16 text-center`} placeholder="—" />
                            ) : (
                              <span className="text-sm text-slate-500">
                                {cat.intervalo_entre_lutas_seg ? formatTime(cat.intervalo_entre_lutas_seg) : '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isEditing ? (
                              <input type="number" step="0.01" value={(editFields.taxa_inscricao as number) ?? cat.taxa_inscricao}
                                onChange={e => setEditFields(p => ({ ...p, taxa_inscricao: parseFloat(e.target.value) }))} className={`${icSm} w-20 text-center`} />
                            ) : cat.taxa_inscricao > 0 ? (
                              <span className="text-green-400 font-medium text-sm">R$ {Number(cat.taxa_inscricao).toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-500 text-sm">Gratis</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-white font-medium text-sm">{cat.total_inscritos}</span>
                            {cat.limite_inscritos && <span className="text-slate-500 text-xs">/{cat.limite_inscritos}</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isEditing ? (
                                <>
                                  <button onClick={handleSaveCatEdit} disabled={savingEdit}
                                    className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/20">
                                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                  </button>
                                  <button onClick={() => setEditingCat(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10">
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingCat(cat.id); setEditFields({}) }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white" title="Editar">
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteCat(cat.id)} disabled={deleting === cat.id}
                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 disabled:opacity-30" title="Remover">
                                    {deleting === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ============ TAB: DIVISOES & PESOS ============ */}
        {tab === 'divisoes' && (
          <>
            <p className="text-xs text-slate-400 mb-6">
              Divisoes sao os templates globais de faixa etaria. Cada divisao define o tempo de luta, golden score e intervalo entre lutas.
              Os pesos sao configurados por divisao e genero. Ao gerar categorias para um evento, o sistema usa esses templates.
            </p>

            {/* Add age group */}
            {showAddAg && (
              <div className="mb-6 bg-green-500/5 border border-green-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Nova Divisao</h3>
                  <button onClick={() => setShowAddAg(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <input type="text" placeholder="Nome (ex: Sub-15)" value={newAg.nome}
                    onChange={e => setNewAg(p => ({ ...p, nome: e.target.value }))} className={ic} />
                  <div className="flex gap-2">
                    <input type="number" placeholder="Idade min" value={newAg.idade_min || ''}
                      onChange={e => setNewAg(p => ({ ...p, idade_min: parseInt(e.target.value) || 0 }))} className={ic} />
                    <input type="number" placeholder="Idade max" value={newAg.idade_max}
                      onChange={e => setNewAg(p => ({ ...p, idade_max: e.target.value }))} className={ic} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Tempo luta (seg)</label>
                    <input type="number" value={newAg.tempo_luta_seg}
                      onChange={e => setNewAg(p => ({ ...p, tempo_luta_seg: parseInt(e.target.value) || 240 }))} className={ic} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Intervalo entre lutas (seg)</label>
                    <input type="number" value={newAg.intervalo_entre_lutas_seg}
                      onChange={e => setNewAg(p => ({ ...p, intervalo_entre_lutas_seg: parseInt(e.target.value) || 60 }))} className={ic} />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Golden Score (seg, vazio=ilimitado)</label>
                    <input type="number" placeholder="Ilimitado" value={newAg.golden_score_seg}
                      onChange={e => setNewAg(p => ({ ...p, golden_score_seg: e.target.value }))} className={ic} />
                  </div>
                </div>
                <button onClick={handleAddAg} disabled={addingAg || !newAg.nome.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/30 disabled:opacity-40">
                  {addingAg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Criar Divisao
                </button>
              </div>
            )}

            {divLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
            ) : ageGroups.length === 0 ? (
              <div className="text-center py-16">
                <Scale className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Nenhuma divisao</h3>
                <p className="text-slate-400">Crie divisoes para definir faixas etarias, tempos e pesos.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ageGroups.map(ag => {
                  const isExpanded = expandedAg === ag.id
                  const isEditingThis = editingAg === ag.id
                  return (
                    <div key={ag.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      {/* Age group header */}
                      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-all"
                        onClick={() => {
                          if (isExpanded) { setExpandedAg(null) }
                          else { setExpandedAg(ag.id); loadWeightClasses(ag.id) }
                        }}>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}

                        <div className="flex-1 min-w-0">
                          {isEditingThis ? (
                            <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                              <input type="text" value={(agFields.nome as string) ?? ag.nome}
                                onChange={e => setAgFields(p => ({ ...p, nome: e.target.value }))} className={`${icSm} w-32`} />
                              <input type="number" value={(agFields.idade_min as number) ?? ag.idade_min}
                                onChange={e => setAgFields(p => ({ ...p, idade_min: parseInt(e.target.value) }))} className={`${icSm} w-16`} placeholder="Min" />
                              <input type="number" value={(agFields.idade_max as number) ?? ag.idade_max ?? ''}
                                onChange={e => setAgFields(p => ({ ...p, idade_max: e.target.value ? parseInt(e.target.value) : null }))} className={`${icSm} w-16`} placeholder="Max" />
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-white text-sm">{ag.nome}</span>
                              <span className="text-xs text-slate-500 ml-2">{ag.idade_min}–{ag.idade_max ?? '+'} anos</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0" onClick={e => e.stopPropagation()}>
                          {isEditingThis ? (
                            <div className="flex gap-2 items-center">
                              <div className="flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                <input type="number" value={(agFields.tempo_luta_seg as number) ?? ag.tempo_luta_seg}
                                  onChange={e => setAgFields(p => ({ ...p, tempo_luta_seg: parseInt(e.target.value) }))} className={`${icSm} w-16 text-center`} />
                              </div>
                              <div className="flex items-center gap-1">
                                <Pause className="w-3 h-3" />
                                <input type="number" value={(agFields.intervalo_entre_lutas_seg as number) ?? ag.intervalo_entre_lutas_seg}
                                  onChange={e => setAgFields(p => ({ ...p, intervalo_entre_lutas_seg: parseInt(e.target.value) }))} className={`${icSm} w-16 text-center`} />
                              </div>
                              <button onClick={handleSaveAg} disabled={savingAg} className="p-1 text-green-400 hover:bg-green-500/20 rounded">
                                {savingAg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setEditingAg(null)} className="p-1 text-slate-400 hover:bg-white/10 rounded">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{formatTime(ag.tempo_luta_seg)}</span>
                              <span className="flex items-center gap-1"><Pause className="w-3 h-3" />{formatTime(ag.intervalo_entre_lutas_seg)}int</span>
                              {ag.golden_score_seg ? (
                                <span className="text-amber-400">GS {formatTime(ag.golden_score_seg)}</span>
                              ) : (
                                <span className="text-amber-400/50">GS ∞</span>
                              )}
                              <span className="text-cyan-400">{ag.pesos_masc}M</span>
                              <span className="text-pink-400">{ag.pesos_fem}F</span>
                              <button onClick={(e) => { e.stopPropagation(); setEditingAg(ag.id); setAgFields({}) }}
                                className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteAg(ag.id) }} disabled={deletingAg === ag.id}
                                className="p-1 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded disabled:opacity-30">
                                {deletingAg === ag.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Weight classes (expanded) */}
                      {isExpanded && (
                        <div className="border-t border-white/5 px-4 py-3 bg-black/10">
                          {wcLoading ? (
                            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-cyan-400" /></div>
                          ) : (
                            <>
                              {/* Masc/Fem columns */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {['Masculino', 'Feminino'].map(gen => {
                                  const genWc = weightClasses.filter(wc => wc.genero === gen)
                                  return (
                                    <div key={gen}>
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className={`text-xs font-bold ${gen === 'Masculino' ? 'text-cyan-300' : 'text-pink-300'}`}>
                                          {gen} ({genWc.length} pesos)
                                        </h5>
                                        <button onClick={() => { setShowAddWc(ag.id); setNewWc({ nome: '', genero: gen, peso_min: '', peso_max: '' }) }}
                                          className="text-[10px] px-2 py-1 bg-white/5 text-slate-400 rounded hover:bg-white/10 hover:text-white flex items-center gap-1">
                                          <Plus className="w-2.5 h-2.5" />Peso
                                        </button>
                                      </div>
                                      {genWc.length === 0 ? (
                                        <p className="text-[10px] text-slate-600 py-2">Nenhum peso configurado.</p>
                                      ) : (
                                        <div className="space-y-1">
                                          {genWc.map(wc => (
                                            <div key={wc.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.02] text-xs group">
                                              <span className="text-white flex-1">{wc.nome}</span>
                                              <span className="text-slate-500">
                                                {wc.peso_min != null ? `${wc.peso_min}` : '—'}
                                                {' '}–{' '}
                                                {wc.peso_max != null ? `${wc.peso_max}kg` : 'Aberto'}
                                              </span>
                                              <button onClick={() => handleDeleteWc(wc.id, ag.id)} disabled={deletingWc === wc.id}
                                                className="p-0.5 text-red-400/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {deletingWc === wc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Add weight class inline */}
                              {showAddWc === ag.id && (
                                <div className="mt-3 pt-3 border-t border-white/5">
                                  <div className="flex gap-2 flex-wrap items-end">
                                    <div>
                                      <label className="block text-[10px] text-slate-500 mb-1">Nome</label>
                                      <input type="text" placeholder="ex: Ligeiro" value={newWc.nome}
                                        onChange={e => setNewWc(p => ({ ...p, nome: e.target.value }))} className={icSm} />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-500 mb-1">Genero</label>
                                      <select value={newWc.genero} onChange={e => setNewWc(p => ({ ...p, genero: e.target.value }))} className={icSm}>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Feminino">Feminino</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-500 mb-1">Peso min (kg)</label>
                                      <input type="number" step="0.1" placeholder="—" value={newWc.peso_min}
                                        onChange={e => setNewWc(p => ({ ...p, peso_min: e.target.value }))} className={`${icSm} w-20`} />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-500 mb-1">Peso max (kg)</label>
                                      <input type="number" step="0.1" placeholder="Aberto" value={newWc.peso_max}
                                        onChange={e => setNewWc(p => ({ ...p, peso_max: e.target.value }))} className={`${icSm} w-20`} />
                                    </div>
                                    <button onClick={() => handleAddWc(ag.id)} disabled={addingWc || !newWc.nome.trim()}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-300 rounded text-xs font-medium hover:bg-green-500/30 disabled:opacity-40">
                                      {addingWc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                      Criar
                                    </button>
                                    <button onClick={() => setShowAddWc(null)} className="px-2 py-1.5 text-slate-500 text-xs hover:text-white">
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
