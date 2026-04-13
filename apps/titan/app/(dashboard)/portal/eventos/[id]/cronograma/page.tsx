'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Loader2, Zap, GripVertical, Clock, Users, Swords,
  ChevronDown, ChevronUp, Settings2, Check, RotateCcw, Play,
  ListOrdered, ArrowUpDown, Save, FolderOpen, Trash2, X, Plus, BookTemplate
} from 'lucide-react'

interface Category {
  id: string
  nome_display: string
  genero: string
  total_inscritos: number
}

interface Bracket {
  id: string
  category_id: string
  tipo: string
  status: string
  area_id: number
  ordem_no_dia: number | null
  hora_estimada: string | null
  total_matches: number
  finished_matches: number
  total_athletes: number
  category: { id: string; nome_display: string; genero: string } | null
}

interface AreaMatch {
  id: string
  label: string
  seq: number
  categoria: string
  status: string
  match_tipo: string
  athlete1_nome: string
  athlete2_nome: string
  resultado: string | null
}

interface AreaGroup {
  area_id: number
  matches: AreaMatch[]
}

interface TemplateSlot {
  label: string
  genero: string
  age_group_pattern: string
}

interface ScheduleTemplate {
  id: string
  nome: string
  descricao: string | null
  modalidade: string
  slots: TemplateSlot[]
  created_at: string
}

export default function CronogramaPage() {
  const router = useRouter()
  const params = useParams()
  const eventoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [eventoNome, setEventoNome] = useState('')
  const [numAreas, setNumAreas] = useState(1)
  const [brackets, setBrackets] = useState<Bracket[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [schedule, setSchedule] = useState<AreaGroup[]>([])

  // Category order (drag list)
  const [categoryOrder, setCategoryOrder] = useState<string[]>([])
  const [savedOrder, setSavedOrder] = useState<string[]>([])

  // Settings
  const [strategy, setStrategy] = useState<'round_robin' | 'sequential'>('round_robin')
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [intervalo, setIntervalo] = useState(2)
  const [showSettings, setShowSettings] = useState(false)

  // Generate state
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  // Templates
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newSlots, setNewSlots] = useState<TemplateSlot[]>([])
  const [newSlotLabel, setNewSlotLabel] = useState('')
  const [newSlotGenero, setNewSlotGenero] = useState('Masculino')
  const [newSlotPattern, setNewSlotPattern] = useState('')

  // Drag state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const load = useCallback(async () => {
    try {
      const [bRes, cRes, eRes, sRes, tRes] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/brackets`),
        fetch(`/api/eventos/${eventoId}/categories`),
        fetch(`/api/eventos/${eventoId}`),
        fetch(`/api/eventos/${eventoId}/schedule`),
        fetch('/api/eventos/schedule-templates'),
      ])
      const bJson = await bRes.json()
      const cJson = await cRes.json()
      const eJson = await eRes.json()
      const sJson = await sRes.json()
      const tJson = await tRes.json()

      if (bRes.ok) setBrackets(bJson.brackets || [])
      if (cRes.ok) setCategories(cJson.categories || [])
      if (eRes.ok) {
        setEventoNome(eJson.evento?.nome || '')
        setNumAreas(eJson.evento?.num_areas || 1)
        const config = eJson.evento?.config as Record<string, unknown> | null
        if (config?.schedule_settings) {
          const ss = config.schedule_settings as Record<string, unknown>
          if (ss.strategy) setStrategy(ss.strategy as 'round_robin' | 'sequential')
          if (ss.hora_inicio) setHoraInicio(ss.hora_inicio as string)
          if (ss.intervalo_entre_categorias_min) setIntervalo(ss.intervalo_entre_categorias_min as number)
        }
      }
      if (sRes.ok) {
        setSchedule(sJson.areas || [])
        if (sJson.category_order && Array.isArray(sJson.category_order)) {
          setCategoryOrder(sJson.category_order)
          setSavedOrder(sJson.category_order)
        }
      }
      if (tRes.ok) setTemplates(tJson.templates || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [eventoId])

  useEffect(() => { load() }, [load])

  // Initialize category order from brackets if not saved
  useEffect(() => {
    if (categoryOrder.length === 0 && brackets.length > 0) {
      const catIds = brackets
        .sort((a, b) => (a.area_id || 1) - (b.area_id || 1) || (a.ordem_no_dia || 0) - (b.ordem_no_dia || 0))
        .map(b => b.category_id)
        .filter((v, i, arr) => arr.indexOf(v) === i)
      setCategoryOrder(catIds)
      setSavedOrder(catIds)
    }
  }, [brackets, categoryOrder.length])

  // Drag handlers
  const handleDragStart = (idx: number) => { dragItem.current = idx }
  const handleDragEnter = (idx: number) => { dragOverItem.current = idx }
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const copy = [...categoryOrder]
    const dragged = copy[dragItem.current]
    copy.splice(dragItem.current, 1)
    copy.splice(dragOverItem.current, 0, dragged)
    setCategoryOrder(copy)
    dragItem.current = null
    dragOverItem.current = null
  }

  const moveItem = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= categoryOrder.length) return
    const copy = [...categoryOrder]
    ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
    setCategoryOrder(copy)
  }

  // Generate schedule
  const handleGenerate = async () => {
    setGenerating(true)
    setGenerated(false)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/schedule/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_order: categoryOrder,
          strategy,
          hora_inicio: horaInicio,
          intervalo_entre_categorias_min: intervalo,
        }),
      })
      if (res.ok) {
        setGenerated(true)
        setSavedOrder([...categoryOrder])
        const sRes = await fetch(`/api/eventos/${eventoId}/schedule`)
        const sJson = await sRes.json()
        if (sRes.ok) setSchedule(sJson.areas || [])
        const bRes = await fetch(`/api/eventos/${eventoId}/brackets`)
        const bJson = await bRes.json()
        if (bRes.ok) setBrackets(bJson.brackets || [])
        setTimeout(() => setGenerated(false), 3000)
      }
    } catch { /* silent */ } finally { setGenerating(false) }
  }

  const handleReset = () => {
    if (savedOrder.length > 0) setCategoryOrder([...savedOrder])
  }

  // === TEMPLATE FUNCTIONS ===

  // Save current order as template (extract generic slots from current category names)
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return
    setSavingTemplate(true)
    try {
      // Extract generic slots from current category order
      const slots: TemplateSlot[] = categoryOrder.map(catId => {
        const { cat, bracket } = getCatInfo(catId)
        const nome = cat?.nome_display || bracket?.category?.nome_display || ''
        const genero = cat?.genero || bracket?.category?.genero || ''
        // Extract age group pattern: "Sub-15 Masc -60kg" → "Sub-15"
        const ageMatch = nome.match(/(Sub-\d+|Senior|Master\s*[A-Z]?|Veterano|Adulto|Pre-Mirim|Mirim|Infantil|Juvenil|Junior|Sub-\d+\s+Aspirante)/i)
        const ageGroup = ageMatch ? ageMatch[1] : nome.split(' ')[0]
        // Build a generic label without weight
        const label = `${ageGroup} ${genero === 'Masculino' ? 'Masculino' : genero === 'Feminino' ? 'Feminino' : genero}`.trim()
        return { label, genero, age_group_pattern: ageGroup }
      })

      // Deduplicate consecutive identical slots (same age_group + genero = single slot)
      const deduped: TemplateSlot[] = []
      for (const slot of slots) {
        const last = deduped[deduped.length - 1]
        if (last && last.age_group_pattern === slot.age_group_pattern && last.genero === slot.genero) continue
        deduped.push(slot)
      }

      const res = await fetch('/api/eventos/schedule-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: templateName,
          descricao: templateDesc || null,
          slots: deduped,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setTemplates(prev => [json.template, ...prev])
        setShowSaveTemplate(false)
        setTemplateName('')
        setTemplateDesc('')
      }
    } catch { /* silent */ } finally { setSavingTemplate(false) }
  }

  // Save a manually created template
  const handleSaveNewTemplate = async () => {
    if (!templateName.trim() || newSlots.length === 0) return
    setSavingTemplate(true)
    try {
      const res = await fetch('/api/eventos/schedule-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: templateName,
          descricao: templateDesc || null,
          slots: newSlots,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setTemplates(prev => [json.template, ...prev])
        setShowNewTemplate(false)
        setTemplateName('')
        setTemplateDesc('')
        setNewSlots([])
      }
    } catch { /* silent */ } finally { setSavingTemplate(false) }
  }

  // Apply template: match slots to event categories by age_group_pattern + genero
  const handleApplyTemplate = (template: ScheduleTemplate) => {
    const allCatIds = brackets.map(b => b.category_id)
    const catMap = new Map(brackets.map(b => [b.category_id, b]))
    const used = new Set<string>()
    const newOrder: string[] = []

    for (const slot of template.slots) {
      // Find all categories matching this slot's pattern + genero
      const matching = allCatIds.filter(catId => {
        if (used.has(catId)) return false
        const b = catMap.get(catId)
        const catName = b?.category?.nome_display || ''
        const catGenero = b?.category?.genero || ''

        // Match genero
        if (slot.genero && catGenero !== slot.genero) return false

        // Match age group pattern (case-insensitive contains)
        const pattern = slot.age_group_pattern.toLowerCase()
        if (!catName.toLowerCase().includes(pattern)) return false

        return true
      })

      // Add all matching categories (sorted by name for consistency)
      matching.sort((a, b) => {
        const na = catMap.get(a)?.category?.nome_display || ''
        const nb = catMap.get(b)?.category?.nome_display || ''
        return na.localeCompare(nb)
      })

      for (const catId of matching) {
        newOrder.push(catId)
        used.add(catId)
      }
    }

    // Append any unmatched categories at the end
    for (const catId of allCatIds) {
      if (!used.has(catId)) {
        newOrder.push(catId)
      }
    }

    // Deduplicate
    const unique = [...new Set(newOrder)]
    setCategoryOrder(unique)
    setShowTemplates(false)
  }

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Remover este modelo?')) return
    try {
      const res = await fetch('/api/eventos/schedule-templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId }),
      })
      if (res.ok) setTemplates(prev => prev.filter(t => t.id !== templateId))
    } catch { /* silent */ }
  }

  // Add slot to new template
  const addNewSlot = () => {
    if (!newSlotLabel.trim()) return
    setNewSlots(prev => [...prev, {
      label: newSlotLabel,
      genero: newSlotGenero,
      age_group_pattern: newSlotPattern || newSlotLabel,
    }])
    setNewSlotLabel('')
    setNewSlotPattern('')
  }

  const removeNewSlot = (idx: number) => {
    setNewSlots(prev => prev.filter((_, i) => i !== idx))
  }

  // Drag for new slots
  const dragNewItem = useRef<number | null>(null)
  const dragNewOverItem = useRef<number | null>(null)
  const handleNewDragEnd = () => {
    if (dragNewItem.current === null || dragNewOverItem.current === null) return
    const copy = [...newSlots]
    const dragged = copy[dragNewItem.current]
    copy.splice(dragNewItem.current, 1)
    copy.splice(dragNewOverItem.current, 0, dragged)
    setNewSlots(copy)
    dragNewItem.current = null
    dragNewOverItem.current = null
  }

  // Get category info by id
  const getCatInfo = (catId: string) => {
    const cat = categories.find(c => c.id === catId)
    const bracket = brackets.find(b => b.category_id === catId)
    return { cat, bracket }
  }

  const totalMatches = schedule.reduce((s, a) => s + a.matches.length, 0)
  const finishedMatches = schedule.reduce((s, a) => s + a.matches.filter(m => m.status === 'finished').length, 0)

  const ic = "px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"

  // Common age group options for quick-add
  const AGE_GROUPS = [
    'Festival', 'Pre-Mirim', 'Mirim', 'Sub-11', 'Sub-13', 'Sub-13 Aspirante',
    'Sub-15', 'Sub-15 Aspirante', 'Sub-18', 'Sub-21', 'Senior', 'Adulto',
    'Master A', 'Master B', 'Master C', 'Master D', 'Veterano'
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button onClick={() => router.push(`/portal/eventos/${eventoId}`)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar ao Evento
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <ListOrdered className="w-8 h-8 text-indigo-400" />Cronograma
              </h1>
              <p className="text-slate-400 text-sm mt-1">{eventoNome}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-300 rounded-lg hover:bg-amber-500/20 border border-amber-500/20 text-sm"
              >
                <FolderOpen className="w-4 h-4" />Modelos
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 border border-white/10 text-sm"
              >
                <Settings2 className="w-4 h-4" />Config
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || categoryOrder.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-40"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : generated ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                {generating ? 'Gerando...' : generated ? 'Gerado!' : 'Gerar Cronograma'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Areas</div>
            <div className="text-2xl font-bold text-white">{numAreas}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Categorias</div>
            <div className="text-2xl font-bold text-white">{brackets.length}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Lutas</div>
            <div className="text-2xl font-bold text-white">{finishedMatches}/{totalMatches}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-slate-400 text-xs mb-1">Inicio</div>
            <div className="text-2xl font-bold text-indigo-300">{horaInicio}</div>
          </div>
        </div>

        {/* Templates Panel */}
        {showTemplates && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-400" />Modelos de Cronograma
              </h3>
              <div className="flex gap-2">
                <button onClick={() => { setShowNewTemplate(true); setShowSaveTemplate(false); setTemplateName(''); setTemplateDesc(''); setNewSlots([]) }}
                  className="text-xs px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 flex items-center gap-1">
                  <Plus className="w-3 h-3" />Criar Modelo
                </button>
                {categoryOrder.length > 0 && (
                  <button onClick={() => { setShowSaveTemplate(true); setShowNewTemplate(false); setTemplateName(''); setTemplateDesc('') }}
                    className="text-xs px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg hover:bg-indigo-500/30 flex items-center gap-1">
                    <Save className="w-3 h-3" />Salvar Ordem Atual
                  </button>
                )}
                <button onClick={() => setShowTemplates(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Save current order as template */}
            {showSaveTemplate && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                <h4 className="text-xs font-bold text-white mb-3">Salvar ordem atual como modelo</h4>
                <p className="text-[10px] text-slate-400 mb-3">
                  O sistema extrai automaticamente os grupos etarios e generos da ordem atual para criar um modelo generico reutilizavel.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
                    placeholder="Nome do modelo (ex: Festival LRSJ 2026)" className={ic} />
                  <input type="text" value={templateDesc} onChange={e => setTemplateDesc(e.target.value)}
                    placeholder="Descricao (opcional)" className={ic} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveAsTemplate} disabled={savingTemplate || !templateName.trim()}
                    className="flex items-center gap-1 px-4 py-2 bg-indigo-500/30 text-indigo-200 rounded-lg text-xs font-medium hover:bg-indigo-500/40 disabled:opacity-40">
                    {savingTemplate ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Salvar Modelo
                  </button>
                  <button onClick={() => setShowSaveTemplate(false)} className="px-4 py-2 bg-white/5 text-slate-400 rounded-lg text-xs hover:bg-white/10">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Create new template manually */}
            {showNewTemplate && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                <h4 className="text-xs font-bold text-white mb-3">Criar modelo manualmente</h4>
                <p className="text-[10px] text-slate-400 mb-3">
                  Defina a sequencia generica de faixas etarias e generos. Ao aplicar, o sistema faz o match com as categorias reais do evento.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
                    placeholder="Nome do modelo" className={ic} />
                  <input type="text" value={templateDesc} onChange={e => setTemplateDesc(e.target.value)}
                    placeholder="Descricao (opcional)" className={ic} />
                </div>

                {/* Add slot */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <select value={newSlotLabel} onChange={e => { setNewSlotLabel(e.target.value); setNewSlotPattern(e.target.value) }}
                    className={`${ic} flex-1 min-w-[140px]`}>
                    <option value="">Selecionar faixa etaria...</option>
                    {AGE_GROUPS.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                  </select>
                  <select value={newSlotGenero} onChange={e => setNewSlotGenero(e.target.value)} className={ic}>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                  <button onClick={addNewSlot} disabled={!newSlotLabel.trim()}
                    className="flex items-center gap-1 px-3 py-2 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-medium hover:bg-amber-500/30 disabled:opacity-40">
                    <Plus className="w-3 h-3" />Adicionar
                  </button>
                </div>

                {/* Quick add buttons */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {AGE_GROUPS.slice(0, 10).map(ag => (
                    <button key={ag} onClick={() => {
                      setNewSlots(prev => [
                        ...prev,
                        { label: `${ag} Masculino`, genero: 'Masculino', age_group_pattern: ag },
                        { label: `${ag} Feminino`, genero: 'Feminino', age_group_pattern: ag },
                      ])
                    }}
                      className="text-[9px] px-2 py-1 bg-white/5 text-slate-400 rounded hover:bg-white/10 hover:text-white">
                      +{ag} M/F
                    </button>
                  ))}
                </div>

                {/* Slot list */}
                {newSlots.length > 0 && (
                  <div className="space-y-1 mb-4 max-h-[300px] overflow-y-auto">
                    {newSlots.map((slot, idx) => (
                      <div key={idx}
                        draggable
                        onDragStart={() => { dragNewItem.current = idx }}
                        onDragEnter={() => { dragNewOverItem.current = idx }}
                        onDragEnd={handleNewDragEnd}
                        onDragOver={e => e.preventDefault()}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="w-3 h-3 text-slate-600 shrink-0" />
                        <span className="font-mono text-slate-500 w-5">{idx + 1}.</span>
                        <span className="text-white flex-1">{slot.label}</span>
                        <span className={`text-[10px] ${slot.genero === 'Masculino' ? 'text-cyan-400' : 'text-pink-400'}`}>
                          {slot.genero === 'Masculino' ? 'M' : 'F'}
                        </span>
                        <button onClick={() => removeNewSlot(idx)} className="text-slate-500 hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={handleSaveNewTemplate} disabled={savingTemplate || !templateName.trim() || newSlots.length === 0}
                    className="flex items-center gap-1 px-4 py-2 bg-amber-500/30 text-amber-200 rounded-lg text-xs font-medium hover:bg-amber-500/40 disabled:opacity-40">
                    {savingTemplate ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Salvar Modelo ({newSlots.length} slots)
                  </button>
                  <button onClick={() => setShowNewTemplate(false)} className="px-4 py-2 bg-white/5 text-slate-400 rounded-lg text-xs hover:bg-white/10">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Template list */}
            {templates.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhum modelo salvo. Crie um modelo para reutilizar em eventos futuros.</p>
            ) : (
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group">
                    <BookTemplate className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white">{t.nome}</div>
                      <div className="text-[10px] text-slate-500">
                        {t.slots.length} etapas: {t.slots.slice(0, 5).map(s => s.label).join(', ')}
                        {t.slots.length > 5 && ` +${t.slots.length - 5}`}
                      </div>
                      {t.descricao && <div className="text-[10px] text-slate-600">{t.descricao}</div>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleApplyTemplate(t)}
                        className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-500/30">
                        Aplicar
                      </button>
                      <button onClick={() => handleDeleteTemplate(t.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-bold text-white mb-4">Configuracoes do Cronograma</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Distribuicao</label>
                <select value={strategy} onChange={e => setStrategy(e.target.value as 'round_robin' | 'sequential')} className={ic}>
                  <option value="round_robin">Balanceada (round-robin)</option>
                  <option value="sequential">Sequencial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Hora Inicio</label>
                <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className={ic} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Intervalo entre categorias (min)</label>
                <input type="number" value={intervalo} onChange={e => setIntervalo(Number(e.target.value))} min={0} max={30} className={ic} />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-3">
              O tempo de cada luta e o intervalo entre lutas sao definidos por divisao/faixa etaria na configuracao das categorias.
              O cronograma usa esses tempos reais para calcular o horario estimado de cada categoria.
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              <strong>Balanceada:</strong> distribui categorias entre areas de forma equilibrada pelo tempo total.
              <strong> Sequencial:</strong> preenche uma area de cada vez.
            </p>
          </div>
        )}

        {/* Main Content: 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Category Order (drag list) */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-indigo-400" />Ordem das Categorias
              </h3>
              <button onClick={handleReset} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />Restaurar
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mb-3">Arraste para reordenar. Use "Modelos" para aplicar uma ordem pre-definida.</p>

            {categoryOrder.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">Nenhuma chave gerada. Gere as chaves primeiro na pagina de Chaves & Lutas.</p>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {categoryOrder.map((catId, idx) => {
                  const { cat, bracket } = getCatInfo(catId)
                  if (!cat && !bracket) return null
                  const nome = cat?.nome_display || bracket?.category?.nome_display || catId
                  const genero = cat?.genero || bracket?.category?.genero
                  const numAtletas = bracket?.total_athletes || cat?.total_inscritos || 0
                  const numMatches = bracket?.total_matches || 0
                  const areaId = bracket?.area_id
                  const hora = bracket?.hora_estimada

                  return (
                    <div
                      key={catId}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnter={() => handleDragEnter(idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
                      <span className="text-xs font-mono text-slate-500 w-6 shrink-0">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">{nome}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          {genero && (
                            <span className={genero === 'Masculino' ? 'text-cyan-400' : 'text-pink-400'}>
                              {genero === 'Masculino' ? 'M' : 'F'}
                            </span>
                          )}
                          <span>{numAtletas} atl</span>
                          <span>{numMatches} lutas</span>
                          {areaId && <span className="text-indigo-400">A{areaId}</span>}
                          {hora && <span className="text-amber-400">{hora.substring(0, 5)}</span>}
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                          className="p-1 text-slate-500 hover:text-white disabled:opacity-20">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveItem(idx, 1)} disabled={idx === categoryOrder.length - 1}
                          className="p-1 text-slate-500 hover:text-white disabled:opacity-20">
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Schedule Preview by Area */}
          <div className="space-y-4">
            {schedule.filter(a => a.matches.length > 0).length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-1">Cronograma nao gerado</p>
                <p className="text-xs text-slate-500">Ordene as categorias e clique em "Gerar Cronograma".</p>
              </div>
            ) : (
              schedule.filter(a => a.matches.length > 0).map(area => {
                const areaLabel = area.area_id === 0 ? 'Sem Area' : `Area ${area.area_id}`
                const finished = area.matches.filter(m => m.status === 'finished').length
                const total = area.matches.length

                const catGroups: Array<{ categoria: string; matches: AreaMatch[] }> = []
                for (const m of area.matches) {
                  const last = catGroups[catGroups.length - 1]
                  if (last && last.categoria === m.categoria) {
                    last.matches.push(m)
                  } else {
                    catGroups.push({ categoria: m.categoria, matches: [m] })
                  }
                }

                return (
                  <div key={area.area_id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Swords className="w-4 h-4 text-indigo-400" />{areaLabel}
                      </h4>
                      <span className="text-xs text-slate-400">{finished}/{total} lutas</span>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {catGroups.map((grp, gi) => {
                        const firstLabel = grp.matches[0]?.label || ''
                        const lastLabel = grp.matches[grp.matches.length - 1]?.label || ''
                        const grpFinished = grp.matches.filter(m => m.status === 'finished').length
                        const allDone = grpFinished === grp.matches.length
                        const anyInProgress = grp.matches.some(m => m.status === 'in_progress')

                        const bracket = brackets.find(b =>
                          b.category?.nome_display === grp.categoria && (b.area_id || 0) === area.area_id
                        )

                        return (
                          <div key={gi} className={`px-3 py-2 rounded-lg border ${
                            allDone ? 'bg-green-500/5 border-green-500/10' :
                            anyInProgress ? 'bg-yellow-500/5 border-yellow-500/10' :
                            'bg-white/[0.02] border-white/5'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {bracket?.hora_estimada && (
                                  <span className="text-[10px] font-mono text-amber-400">{bracket.hora_estimada.substring(0, 5)}</span>
                                )}
                                <span className="text-xs font-medium text-white">{grp.categoria}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span className="font-mono">{firstLabel}–{lastLabel}</span>
                                <span>{grp.matches.length} lutas</span>
                                {allDone && <Check className="w-3 h-3 text-green-400" />}
                                {anyInProgress && <Play className="w-3 h-3 text-yellow-300" />}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
