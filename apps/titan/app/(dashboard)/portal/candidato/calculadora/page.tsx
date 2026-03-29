'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calculator, Save, Download, CheckCircle2, Loader2 } from 'lucide-react'

// ——— SCORING RULES ———
interface FieldConfig {
  label: string
  key: string
  type: 'number' | 'select' | 'boolean'
  points?: number
  maxItems?: number
  pointsPerItem?: number
  options?: { label: string; value: number }[]
  description?: string
}

const FIELD_CONFIG_EXAME: FieldConfig[] = [
  {
    label: 'Tempo de Prática (anos)',
    key: 'anos_pratica',
    type: 'select',
    options: [
      { label: '1 a 2 anos', value: 5 },
      { label: '3 a 4 anos', value: 10 },
      { label: '5 a 7 anos', value: 15 },
      { label: '8 a 10 anos', value: 20 },
      { label: 'Mais de 10 anos', value: 25 },
    ],
    description: 'Tempo de prática contínua no judô',
  },
  {
    label: 'Competições Regionais',
    key: 'comp_regionais',
    type: 'number',
    pointsPerItem: 3,
    maxItems: 10,
    description: 'Pontos por competição (máx. 10)',
  },
  {
    label: 'Competições Estaduais',
    key: 'comp_estaduais',
    type: 'number',
    pointsPerItem: 5,
    maxItems: 8,
    description: 'Pontos por competição (máx. 8)',
  },
  {
    label: 'Competições Nacionais',
    key: 'comp_nacionais',
    type: 'number',
    pointsPerItem: 10,
    maxItems: 5,
    description: 'Pontos por competição (máx. 5)',
  },
  {
    label: 'Medalhas Estaduais (ouro)',
    key: 'medalhas_estaduais_ouro',
    type: 'number',
    pointsPerItem: 10,
    maxItems: 5,
    description: 'Pontos por medalha de ouro',
  },
  {
    label: 'Medalhas Estaduais (prata/bronze)',
    key: 'medalhas_estaduais_outros',
    type: 'number',
    pointsPerItem: 5,
    maxItems: 10,
    description: 'Pontos por medalha de prata/bronze',
  },
  {
    label: 'Cursos Profep MAX concluídos',
    key: 'cursos_maxi',
    type: 'number',
    pointsPerItem: 8,
    maxItems: 5,
    description: 'Pontos por curso concluído (máx. 5)',
  },
  {
    label: 'Cursos COB/IOB concluídos',
    key: 'cursos_cob',
    type: 'number',
    pointsPerItem: 8,
    maxItems: 3,
    description: 'Pontos por curso COB (máx. 3)',
  },
  {
    label: 'Estágios de Arbitragem',
    key: 'estagios_arbitragem',
    type: 'number',
    pointsPerItem: 10,
    maxItems: 3,
    description: 'Pontos por estágio (máx. 3)',
  },
  {
    label: 'Estágios de Ensino',
    key: 'estagios_ensino',
    type: 'number',
    pointsPerItem: 10,
    maxItems: 3,
    description: 'Pontos por estágio (máx. 3)',
  },
  {
    label: 'Aprovação em Kata',
    key: 'kata_aprovado',
    type: 'boolean',
    points: 15,
    description: 'Kata obrigatório aprovado pelo avaliador',
  },
  {
    label: 'Prova Teórica aprovada',
    key: 'teoria_aprovada',
    type: 'boolean',
    points: 20,
    description: 'Prova escrita com nota mínima 7,0',
  },
]

const FIELD_CONFIG_MERITO: FieldConfig[] = [
  {
    label: 'Anos de contribuição à Liga',
    key: 'anos_contribuicao',
    type: 'select',
    options: [
      { label: '1 a 2 anos', value: 5 },
      { label: '3 a 5 anos', value: 15 },
      { label: '6 a 10 anos', value: 25 },
      { label: 'Mais de 10 anos', value: 35 },
    ],
  },
  {
    label: 'Cargos na Federação',
    key: 'cargos_federacao',
    type: 'number',
    pointsPerItem: 10,
    maxItems: 3,
    description: 'Pontos por cargo exercido (máx. 3)',
  },
  {
    label: 'Eventos organizados',
    key: 'eventos_organizados',
    type: 'number',
    pointsPerItem: 5,
    maxItems: 10,
    description: 'Pontos por evento (máx. 10)',
  },
  {
    label: 'Publicações / Artigos científicos',
    key: 'publicacoes',
    type: 'number',
    pointsPerItem: 10,
    maxItems: 5,
    description: 'Pontos por publicação (máx. 5)',
  },
  {
    label: 'Indicação pela Comissão Técnica',
    key: 'indicacao_comissao',
    type: 'boolean',
    points: 30,
    description: 'Indicação formal da Comissão Técnica da Liga',
  },
  {
    label: 'Título Honorífico reconhecido',
    key: 'titulo_honorifico',
    type: 'boolean',
    points: 20,
    description: 'Título conferido por entidade nacional ou internacional',
  },
]

const MIN_POINTS = {
  'Shodan (1º Dan)': 100,
  'Nidan (2º Dan)': 120,
  'Sandan (3º Dan)': 140,
  'Yondan (4º Dan)': 160,
}

function calcScore(values: Record<string, number | boolean>, fields: FieldConfig[]): number {
  let total = 0
  for (const field of fields) {
    const val = values[field.key]
    if (field.type === 'boolean') {
      if (val === true) total += field.points || 0
    } else if (field.type === 'select') {
      total += (val as number) || 0
    } else if (field.type === 'number') {
      const count = Math.min(Number(val) || 0, field.maxItems || 99)
      total += count * (field.pointsPerItem || 0)
    }
  }
  return total
}

export default function CalculadoraPage() {
  const [track, setTrack] = useState<'exame' | 'merito'>('exame')
  const [values, setValues] = useState<Record<string, number | boolean>>({})
  const [graduacao, setGraduacao] = useState('Shodan (1º Dan)')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/candidato/dados')
      .then(r => r.json())
      .then(d => {
        setGraduacao(d.inscricao?.graduacao_pretendida || 'Shodan (1º Dan)')
        const prog = d.inscricao?.progresso || {}
        if (prog.calculadora) setValues(prog.calculadora)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fields = track === 'exame' ? FIELD_CONFIG_EXAME : FIELD_CONFIG_MERITO
  const score = calcScore(values, fields)
  const minPts = MIN_POINTS[graduacao as keyof typeof MIN_POINTS] || 100
  const percentage = Math.min((score / minPts) * 100, 100)
  const reached = score >= minPts

  const setValue = (key: string, val: number | boolean) => {
    setValues(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/candidato/progresso', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progresso: { calculadora: values } }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('Calculadora de Pontos — Portal do Candidato', 14, 20)
    doc.setFontSize(12)
    doc.text(`Graduação: ${graduacao}`, 14, 32)
    doc.text(`Trilha: ${track === 'exame' ? 'Por Exame' : 'Por Mérito'}`, 14, 40)
    doc.text(`Pontuação: ${score} / ${minPts} pontos`, 14, 48)
    doc.text(`Status: ${reached ? 'CARÊNCIA ATINGIDA' : 'CARÊNCIA NÃO ATINGIDA'}`, 14, 56)
    doc.setFontSize(10)

    let y = 70
    fields.forEach(f => {
      const val = values[f.key]
      let pts = 0
      if (f.type === 'boolean') pts = val ? f.points || 0 : 0
      else if (f.type === 'select') pts = (val as number) || 0
      else pts = Math.min(Number(val) || 0, f.maxItems || 99) * (f.pointsPerItem || 0)
      doc.text(`${f.label}: ${pts} pts`, 14, y)
      y += 8
      if (y > 270) { doc.addPage(); y = 20 }
    })

    doc.save(`calculadora-pontos-${graduacao.toLowerCase().replace(/\s+/g, '-')}.pdf`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Calculadora de Pontos</h1>
          <p className="text-slate-400 mt-1">Calcule sua pontuação para <span className="text-white">{graduacao}</span></p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white text-sm transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Save className="w-4 h-4" />}
            {saved ? 'Salvo' : 'Salvar'}
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Score card */}
      <div className={`rounded-2xl p-6 border ${reached ? 'bg-green-900/20 border-green-600/30' : 'bg-[#111827] border-slate-800'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-red-500" />
            <span className="text-xs font-black tracking-widest text-slate-400 uppercase">Pontuação Total</span>
          </div>
          {reached && (
            <span className="text-xs font-black tracking-widest text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1 rounded-full uppercase">
              Carência Atingida
            </span>
          )}
        </div>

        <div className="flex items-end gap-2 mb-4">
          <span className="text-6xl font-black text-white">{score}</span>
          <span className="text-slate-500 text-2xl mb-2">/ {minPts}</span>
        </div>

        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${reached ? 'bg-green-500' : 'bg-red-600'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-slate-500 text-xs mt-2">
          {reached
            ? `Você atingiu a carência mínima para ${graduacao}.`
            : `Faltam ${minPts - score} pontos para atingir a carência mínima.`
          }
        </p>
      </div>

      {/* Track selector */}
      <div className="flex gap-2 bg-[#111827] border border-slate-800 rounded-xl p-1">
        <button
          onClick={() => setTrack('exame')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${track === 'exame' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Por Exame
        </button>
        <button
          onClick={() => setTrack('merito')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${track === 'merito' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Por Mérito
        </button>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {fields.map(field => {
          const val = values[field.key]
          let pts = 0
          if (field.type === 'boolean') pts = val ? field.points || 0 : 0
          else if (field.type === 'select') pts = (val as number) || 0
          else pts = Math.min(Number(val) || 0, field.maxItems || 99) * (field.pointsPerItem || 0)

          return (
            <div key={field.key} className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{field.label}</p>
                {field.description && (
                  <p className="text-slate-500 text-xs mt-0.5">{field.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {field.type === 'boolean' ? (
                  <button
                    onClick={() => setValue(field.key, !val)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${val ? 'bg-red-600' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${val ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                ) : field.type === 'select' ? (
                  <select
                    value={(val as number) || 0}
                    onChange={e => setValue(field.key, Number(e.target.value))}
                    className="bg-black border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-red-600"
                  >
                    <option value={0}>Selecionar</option>
                    {field.options?.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={field.maxItems || 99}
                    value={(val as number) || 0}
                    onChange={e => setValue(field.key, Number(e.target.value))}
                    className="w-20 bg-black border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-red-600"
                  />
                )}

                <span className={`text-sm font-black w-12 text-right ${pts > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                  {pts > 0 ? `+${pts}` : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
