'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Plus, Trash2, RotateCcw } from 'lucide-react'

interface BracketRule {
  min: number
  max: number
  tipo: string
  label?: string
}

const TIPO_OPTIONS = [
  { value: 'gold_medal', label: 'Medalha de ouro direta', desc: 'Atleta unico, sem luta' },
  { value: 'best_of_3', label: 'Melhor de 3', desc: '2 atletas, 3 lutas possiveis' },
  { value: 'round_robin', label: 'Todos contra todos', desc: 'Cada atleta luta contra todos' },
  { value: 'single_elimination', label: 'Eliminatoria simples', desc: 'Perdeu, esta fora' },
  { value: 'single_elimination_bronze', label: 'Eliminatoria + Bronze', desc: '1 disputa de 3o lugar' },
  { value: 'single_elimination_repechage', label: 'Eliminatoria + Repescagem IJF', desc: '2 bronzes (padrao Judo)' },
  { value: 'double_elimination', label: 'Dupla eliminacao', desc: 'Precisa perder 2x' },
  { value: 'group_stage_elimination', label: 'Fase de grupos + eliminatoria', desc: 'Grupos + playoff' },
]

const PRESETS: Record<string, { name: string; rules: BracketRule[] }> = {
  ijf_judo: {
    name: 'Padrao IJF (Judo)',
    rules: [
      { min: 1, max: 1, tipo: 'gold_medal', label: 'Medalha de ouro direta' },
      { min: 2, max: 2, tipo: 'best_of_3', label: 'Melhor de 3' },
      { min: 3, max: 4, tipo: 'round_robin', label: 'Todos contra todos' },
      { min: 5, max: 8, tipo: 'single_elimination_repechage', label: 'Eliminatoria + Repescagem IJF' },
      { min: 9, max: 999, tipo: 'single_elimination_repechage', label: 'Eliminatoria + Repescagem IJF' },
    ],
  },
  smoothcomp: {
    name: 'Estilo Smoothcomp',
    rules: [
      { min: 1, max: 1, tipo: 'gold_medal', label: 'Medalha de ouro direta' },
      { min: 2, max: 2, tipo: 'best_of_3', label: 'Melhor de 3' },
      { min: 3, max: 3, tipo: 'round_robin', label: 'Todos contra todos' },
      { min: 4, max: 4, tipo: 'single_elimination_bronze', label: 'Eliminatoria + Bronze' },
      { min: 5, max: 999, tipo: 'single_elimination_repechage', label: 'Eliminatoria + Repescagem' },
    ],
  },
  bjj: {
    name: 'Jiu-Jitsu (IBJJF)',
    rules: [
      { min: 1, max: 1, tipo: 'gold_medal', label: 'Medalha de ouro direta' },
      { min: 2, max: 2, tipo: 'single_elimination', label: 'Eliminatoria simples' },
      { min: 3, max: 3, tipo: 'round_robin', label: 'Todos contra todos' },
      { min: 4, max: 999, tipo: 'single_elimination_bronze', label: 'Eliminatoria + Bronze' },
    ],
  },
  simples: {
    name: 'Simples (sem repescagem)',
    rules: [
      { min: 1, max: 1, tipo: 'gold_medal', label: 'Medalha de ouro direta' },
      { min: 2, max: 2, tipo: 'best_of_3', label: 'Melhor de 3' },
      { min: 3, max: 5, tipo: 'round_robin', label: 'Todos contra todos' },
      { min: 6, max: 999, tipo: 'single_elimination_bronze', label: 'Eliminatoria + Bronze' },
    ],
  },
}

export default function BracketRulesPage() {
  const router = useRouter()
  const params = useParams()
  const eventoId = params.id as string

  const [rules, setRules] = useState<BracketRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/eventos/${eventoId}/bracket-rules`)
      .then(r => r.json())
      .then(data => setRules(data.rules || []))
      .finally(() => setLoading(false))
  }, [eventoId])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/bracket-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      })
      if (res.ok) setSaved(true)
    } finally { setSaving(false) }
  }

  const applyPreset = (key: string) => {
    const preset = PRESETS[key]
    if (preset) {
      setRules([...preset.rules])
      setSaved(false)
    }
  }

  const addRule = () => {
    const lastMax = rules.length > 0 ? rules[rules.length - 1].max : 0
    setRules([...rules, { min: lastMax + 1, max: lastMax + 10, tipo: 'single_elimination_repechage' }])
    setSaved(false)
  }

  const removeRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx))
    setSaved(false)
  }

  const updateRule = (idx: number, field: keyof BracketRule, value: string | number) => {
    const next = [...rules]
    if (field === 'min' || field === 'max') {
      next[idx] = { ...next[idx], [field]: Number(value) }
    } else {
      next[idx] = { ...next[idx], [field]: value }
    }
    setSaved(false)
    setRules(next)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />Voltar
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-black text-white mb-2">Regras de Chaves</h1>
        <p className="text-slate-400 text-sm">Configure qual tipo de chave usar automaticamente com base no numero de atletas inscritos por categoria.</p>
      </div>

      {/* Presets */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Modelos Prontos</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <div className="grid grid-cols-[80px_80px_1fr_48px] gap-2 px-4 py-3 bg-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <div>Min</div>
          <div>Max</div>
          <div>Tipo de Chave</div>
          <div></div>
        </div>
        {rules.map((rule, idx) => (
          <div key={idx} className="grid grid-cols-[80px_80px_1fr_48px] gap-2 px-4 py-2 border-t border-white/5 items-center">
            <input
              type="number"
              min={0}
              value={rule.min}
              onChange={e => updateRule(idx, 'min', e.target.value)}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm text-center"
            />
            <input
              type="number"
              min={rule.min}
              value={rule.max}
              onChange={e => updateRule(idx, 'max', e.target.value)}
              className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm text-center"
            />
            <select
              value={rule.tipo}
              onChange={e => updateRule(idx, 'tipo', e.target.value)}
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
            >
              {TIPO_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button onClick={() => removeRule(idx)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">Nenhuma regra configurada. Selecione um modelo pronto ou adicione regras manualmente.</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={addRule} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 text-sm transition-all">
          <Plus className="w-4 h-4" />Adicionar Regra
        </button>
        <button
          onClick={handleSave}
          disabled={saving || rules.length === 0}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-40 text-sm transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Regras'}
        </button>
        {saved && <span className="text-green-400 text-sm font-medium">Salvo!</span>}
      </div>

      {/* Preview */}
      {rules.length > 0 && (
        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Preview</h3>
          <div className="flex flex-wrap gap-2">
            {rules.map((r, i) => {
              const tipo = TIPO_OPTIONS.find(o => o.value === r.tipo)
              return (
                <div key={i} className="px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-xs font-bold text-white">
                    {r.min === r.max ? `${r.min} atleta${r.min > 1 ? 's' : ''}` : `${r.min} a ${r.max > 100 ? '∞' : r.max} atletas`}
                  </div>
                  <div className="text-[10px] text-cyan-400 mt-0.5">{tipo?.label || r.tipo}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{tipo?.desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
