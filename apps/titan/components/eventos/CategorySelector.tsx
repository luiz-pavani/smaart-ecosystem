'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, Search, Scale, Clock, DollarSign, Users, ChevronDown } from 'lucide-react'

interface Category {
  id: string
  nome_display: string
  genero: string
  taxa_inscricao: number
  limite_inscritos: number | null
  tempo_luta_seg: number
  golden_score_seg: number | null
  total_inscritos: number
  age_group: { id: string; nome: string; idade_min: number; idade_max: number | null } | null
  weight_class: { id: string; nome: string; peso_min: number | null; peso_max: number | null } | null
}

interface Props {
  eventoId: string
  onSelect: (category: Category) => void
  atletaGenero?: string
  atletaIdade?: number
  atletaPeso?: number
}

export default function CategorySelector({ eventoId, onSelect, atletaGenero, atletaIdade, atletaPeso }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [generoFilter, setGeneroFilter] = useState<string>(atletaGenero || '')
  const [ageGroupFilter, setAgeGroupFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/eventos/${eventoId}/categories`)
        const json = await res.json()
        if (res.ok) setCategories(json.categories || [])
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [eventoId])

  // Extrair faixas etárias únicas
  const ageGroups = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) {
      if (c.age_group) map.set(c.age_group.id, c.age_group.nome)
    }
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }))
  }, [categories])

  // Filtrar categorias
  const filtered = useMemo(() => {
    return categories.filter(c => {
      if (search && !c.nome_display.toLowerCase().includes(search.toLowerCase())) return false
      if (generoFilter && c.genero !== generoFilter) return false
      if (ageGroupFilter && c.age_group?.id !== ageGroupFilter) return false
      return true
    })
  }, [categories, search, generoFilter, ageGroupFilter])

  // Categorias recomendadas (match idade + gênero + peso)
  const recommended = useMemo(() => {
    if (!atletaGenero && !atletaIdade) return []
    return categories.filter(c => {
      if (atletaGenero && c.genero !== atletaGenero) return false
      if (atletaIdade && c.age_group) {
        if (atletaIdade < c.age_group.idade_min) return false
        if (c.age_group.idade_max && atletaIdade > c.age_group.idade_max) return false
      }
      if (atletaPeso && c.weight_class) {
        if (c.weight_class.peso_min && atletaPeso < c.weight_class.peso_min) return false
        if (c.weight_class.peso_max && atletaPeso > c.weight_class.peso_max) return false
      }
      return true
    })
  }, [categories, atletaGenero, atletaIdade, atletaPeso])

  const formatTime = (seg: number) => `${Math.floor(seg / 60)}:${(seg % 60).toString().padStart(2, '0')}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8">
        <Scale className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Nenhuma categoria configurada para este evento.</p>
      </div>
    )
  }

  const CategoryCard = ({ cat, isRecommended }: { cat: Category; isRecommended?: boolean }) => (
    <button
      onClick={() => onSelect(cat)}
      className={`w-full p-4 rounded-lg border text-left transition-all hover:scale-[1.01] ${
        isRecommended
          ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15'
          : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-bold text-white text-sm">{cat.nome_display}</span>
          {isRecommended && (
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-300">RECOMENDADA</span>
          )}
        </div>
        {cat.taxa_inscricao > 0 ? (
          <span className="text-green-400 font-bold text-sm flex items-center gap-1">
            <DollarSign className="w-3 h-3" />R$ {Number(cat.taxa_inscricao).toFixed(2)}
          </span>
        ) : (
          <span className="text-green-400 text-xs font-medium">Gratuito</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />{formatTime(cat.tempo_luta_seg)}
          {cat.golden_score_seg ? ` + GS ${formatTime(cat.golden_score_seg)}` : ' + GS ilimitado'}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />{cat.total_inscritos}{cat.limite_inscritos ? `/${cat.limite_inscritos}` : ''}
        </span>
      </div>
    </button>
  )

  return (
    <div>
      {/* Recomendadas */}
      {recommended.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-bold text-green-400 mb-3">Categorias Recomendadas para Voce</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommended.slice(0, 4).map(cat => (
              <CategoryCard key={cat.id} cat={cat} isRecommended />
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar categoria..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
          />
        </div>
        <select
          value={generoFilter}
          onChange={e => setGeneroFilter(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500"
        >
          <option value="">Todos os generos</option>
          <option value="Masculino">Masculino</option>
          <option value="Feminino">Feminino</option>
        </select>
        <select
          value={ageGroupFilter}
          onChange={e => setAgeGroupFilter(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500"
        >
          <option value="">Todas as faixas etarias</option>
          {ageGroups.map(ag => (
            <option key={ag.id} value={ag.id}>{ag.nome}</option>
          ))}
        </select>
      </div>

      {/* Todas as categorias */}
      <div className="text-xs text-slate-500 mb-2">{filtered.length} categorias</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {filtered.map(cat => (
          <CategoryCard key={cat.id} cat={cat} />
        ))}
      </div>
    </div>
  )
}
