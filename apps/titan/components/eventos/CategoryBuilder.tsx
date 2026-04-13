'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, ChevronRight, ChevronLeft, Zap, DollarSign, Clock, X } from 'lucide-react'

interface AgeGroup {
  id: string
  nome: string
  idade_min: number
  idade_max: number | null
  tempo_luta_seg: number
  golden_score_seg: number | null
  pesos: {
    Masculino: WeightClass[]
    Feminino: WeightClass[]
  }
}

interface WeightClass {
  id: string
  nome: string
  peso_min: number | null
  peso_max: number | null
  genero: string
}

interface Props {
  eventoId: string
  onComplete: () => void
  onCancel: () => void
}

export default function CategoryBuilder({ eventoId, onComplete, onCancel }: Props) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<AgeGroup[]>([])

  // Seleções
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<Set<string>>(new Set())
  const [selectedGeneros, setSelectedGeneros] = useState<Set<string>>(new Set(['Masculino', 'Feminino']))
  const [taxaInscricao, setTaxaInscricao] = useState('')
  const [kyuDanMin, setKyuDanMin] = useState('')
  const [kyuDanMax, setKyuDanMax] = useState('')

  // Resultado
  const [previewCategories, setPreviewCategories] = useState<string[]>([])
  const [generatedCount, setGeneratedCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/eventos/categories/templates')
        const json = await res.json()
        if (res.ok) setTemplates(json.templates || [])
        else setError(json.error)
      } catch {
        setError('Erro ao carregar templates')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleAgeGroup = (id: string) => {
    setSelectedAgeGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleGenero = (g: string) => {
    setSelectedGeneros(prev => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }

  const selectAll = () => {
    setSelectedAgeGroups(new Set(templates.map(t => t.id)))
  }

  const selectNone = () => {
    setSelectedAgeGroups(new Set())
  }

  // Preview: calcular categorias que serão geradas
  useEffect(() => {
    if (step !== 3) return
    const cats: string[] = []
    for (const ag of templates.filter(t => selectedAgeGroups.has(t.id))) {
      for (const genero of Array.from(selectedGeneros)) {
        const key = genero as 'Masculino' | 'Feminino'
        const pesos = ag.pesos[key] || []
        for (const peso of pesos) {
          cats.push(`${ag.nome} ${genero === 'Masculino' ? 'Masc' : 'Fem'} ${peso.nome}`)
        }
      }
    }
    setPreviewCategories(cats)
  }, [step, selectedAgeGroups, selectedGeneros, templates])

  const handleGenerate = async () => {
    setGenerating(true); setError(null)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/categories/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age_group_ids: Array.from(selectedAgeGroups),
          generos: Array.from(selectedGeneros),
          taxa_inscricao: taxaInscricao ? parseFloat(taxaInscricao) : 0,
          kyu_dan_min: kyuDanMin ? parseInt(kyuDanMin) : null,
          kyu_dan_max: kyuDanMax ? parseInt(kyuDanMax) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setGeneratedCount(json.total)
      setStep(4)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const ic = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Step Indicator */}
      <div className="flex items-center gap-1 p-4 bg-black/20 border-b border-white/10">
        {['Faixas Etarias', 'Configuracoes', 'Revisar', 'Concluido'].map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              step > i + 1 ? 'bg-green-500/20 text-green-300' :
              step === i + 1 ? 'bg-cyan-500/20 text-cyan-300' :
              'bg-white/5 text-slate-500'
            }`}>
              {step > i + 1 ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              <span className="hidden md:inline">{label}</span>
            </div>
            {i < 3 && <ChevronRight className="w-4 h-4 text-slate-600" />}
          </div>
        ))}
        <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-6">
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

        {/* Step 1: Selecionar Faixas Etárias + Gêneros */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Selecionar Faixas Etarias</h3>
            <p className="text-sm text-slate-400 mb-4">Escolha quais faixas etarias este evento tera. Os pesos IJF serao adicionados automaticamente.</p>

            <div className="flex gap-2 mb-4">
              <button onClick={selectAll} className="text-xs px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 transition-colors">Selecionar Todas</button>
              <button onClick={selectNone} className="text-xs px-3 py-1 bg-white/5 text-slate-400 rounded hover:bg-white/10 transition-colors">Limpar</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {templates.map(ag => (
                <button
                  key={ag.id}
                  onClick={() => toggleAgeGroup(ag.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedAgeGroups.has(ag.id)
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-sm">{ag.nome}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {ag.idade_min}-{ag.idade_max ?? '+'} anos
                  </div>
                  <div className="text-xs mt-1 opacity-50 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{Math.floor(ag.tempo_luta_seg / 60)}:{(ag.tempo_luta_seg % 60).toString().padStart(2, '0')}
                  </div>
                </button>
              ))}
            </div>

            <h4 className="text-sm font-bold text-white mb-2">Generos</h4>
            <div className="flex gap-3 mb-6">
              {['Masculino', 'Feminino'].map(g => (
                <button
                  key={g}
                  onClick={() => toggleGenero(g)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    selectedGeneros.has(g)
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Configurações */}
        {step === 2 && (
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Configuracoes</h3>
            <p className="text-sm text-slate-400 mb-4">Defina o valor de inscricao e filtros de graduacao (opcional).</p>

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-400" />Valor de Inscricao por Categoria (R$)
                </label>
                <input
                  type="number"
                  value={taxaInscricao}
                  onChange={e => setTaxaInscricao(e.target.value)}
                  placeholder="0.00 (gratuito)"
                  step="0.01" min="0"
                  className={ic}
                />
                <p className="text-xs text-slate-500 mt-1">Este valor sera aplicado a todas as categorias geradas. Voce pode editar individualmente depois.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Graduacao Minima (kyu_dan_id)</label>
                  <input type="number" value={kyuDanMin} onChange={e => setKyuDanMin(e.target.value)} placeholder="Qualquer" min="1" max="22" className={ic} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Graduacao Maxima (kyu_dan_id)</label>
                  <input type="number" value={kyuDanMax} onChange={e => setKyuDanMax(e.target.value)} placeholder="Qualquer" min="1" max="22" className={ic} />
                </div>
              </div>
              <p className="text-xs text-slate-500">Filtro de graduacao: 1 = Branca (mukyu) ... 12 = Marrom (1o kyu), 13+ = Faixas pretas. Deixe em branco para aceitar qualquer graduacao.</p>
            </div>
          </div>
        )}

        {/* Step 3: Revisar */}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Revisar Categorias</h3>
            <p className="text-sm text-slate-400 mb-4">
              {previewCategories.length} categorias serao geradas.
              {taxaInscricao ? ` Valor: R$ ${parseFloat(taxaInscricao).toFixed(2)} cada.` : ' Inscricao gratuita.'}
            </p>

            <div className="max-h-80 overflow-y-auto space-y-1 mb-4 bg-black/20 rounded-lg p-3">
              {previewCategories.map((cat, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-300 py-1 px-2 rounded hover:bg-white/5">
                  <span className="text-slate-500 text-xs w-6">{i + 1}.</span>
                  {cat}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Concluído */}
        {step === 4 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Categorias Geradas!</h3>
            <p className="text-slate-400 mb-6">{generatedCount} categorias criadas com sucesso.</p>
            <button onClick={onComplete}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all">
              Ver Categorias
            </button>
          </div>
        )}

        {/* Navigation */}
        {step < 4 && (
          <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />Anterior
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && (selectedAgeGroups.size === 0 || selectedGeneros.size === 0)}
                className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-sm border border-cyan-500/30"
              >
                Proximo<ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generating || previewCategories.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {generating ? 'Gerando...' : `Gerar ${previewCategories.length} Categorias`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
