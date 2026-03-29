'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, Circle, Users, BookOpen, ClipboardList, GraduationCap, Dumbbell, Trophy } from 'lucide-react'

interface InscricaoData {
  graduacao_pretendida: string
}

const REQUIREMENTS_DATA: Record<string, {
  presenciais: { label: string; quantidade: number }[]
  estagios: { label: string; quantidade: number }[]
  teoria: { label: string }[]
  cursosMaxi: { label: string; horas: number }[]
  cursosCob: { label: string }[]
  examesPraticos: { label: string }[]
}> = {
  'Shodan (1º Dan)': {
    presenciais: [
      { label: 'Treinamentos obrigatórios (Liga)', quantidade: 10 },
      { label: 'Seminários Técnicos', quantidade: 2 },
    ],
    estagios: [
      { label: 'Estágio de Arbitragem (Regional)', quantidade: 1 },
      { label: 'Estágio de Ensino (Academia Filiada)', quantidade: 1 },
    ],
    teoria: [
      { label: 'Prova Teórica: Regulamento e Arbitragem' },
      { label: 'Prova Teórica: História e Filosofia do Judô' },
    ],
    cursosMaxi: [
      { label: 'Módulo de Fundamentos do Judô', horas: 20 },
      { label: 'Módulo de Arbitragem Básica', horas: 10 },
    ],
    cursosCob: [
      { label: 'Curso de Educação Olímpica (IOB)' },
      { label: 'Curso de Ética no Esporte (IOB)' },
    ],
    examesPraticos: [
      { label: 'Exame de Técnicas (Nage-waza e Katame-waza)' },
      { label: 'Kata obrigatório: Nage no Kata' },
      { label: 'Randori avaliativo' },
    ],
  },
  'Nidan (2º Dan)': {
    presenciais: [
      { label: 'Treinamentos obrigatórios (Liga)', quantidade: 15 },
      { label: 'Seminários Técnicos', quantidade: 3 },
    ],
    estagios: [
      { label: 'Estágio de Arbitragem (Estadual)', quantidade: 2 },
      { label: 'Estágio de Ensino (Academia Filiada)', quantidade: 2 },
    ],
    teoria: [
      { label: 'Prova Teórica Avançada: Arbitragem e Regulamento' },
      { label: 'Monografia ou TCC sobre Judô' },
    ],
    cursosMaxi: [
      { label: 'Módulo Avançado de Judô', horas: 30 },
      { label: 'Módulo de Arbitragem Avançada', horas: 20 },
      { label: 'Módulo de Gestão Esportiva', horas: 15 },
    ],
    cursosCob: [
      { label: 'Curso de Educação Olímpica (IOB)' },
      { label: 'Curso de Liderança Esportiva (IOB)' },
      { label: 'Curso de Integridade Esportiva (IOB)' },
    ],
    examesPraticos: [
      { label: 'Exame de Técnicas Avançadas' },
      { label: 'Kata obrigatório: Katame no Kata' },
      { label: 'Kata opcional: Kime no Kata ou Ju no Kata' },
      { label: 'Randori avaliativo (2 sessões)' },
    ],
  },
  'Sandan (3º Dan)': {
    presenciais: [
      { label: 'Treinamentos obrigatórios (Liga)', quantidade: 20 },
      { label: 'Seminários Técnicos', quantidade: 4 },
    ],
    estagios: [
      { label: 'Estágio de Arbitragem (Nacional ou Internacional)', quantidade: 1 },
      { label: 'Estágio de Ensino', quantidade: 3 },
    ],
    teoria: [
      { label: 'Prova Teórica: Pedagogia do Judô' },
      { label: 'Apresentação de Trabalho Científico' },
    ],
    cursosMaxi: [
      { label: 'Módulo de Metodologia do Ensino', horas: 40 },
      { label: 'Módulo de Alto Rendimento', horas: 20 },
    ],
    cursosCob: [
      { label: 'Curso de Educação Olímpica (IOB)' },
      { label: 'Curso de Gestão de Projetos Esportivos (IOB)' },
    ],
    examesPraticos: [
      { label: 'Demonstração técnica completa' },
      { label: 'Kata: Kodokan Goshin Jutsu' },
      { label: 'Apresentação didática para banca' },
    ],
  },
  'Yondan (4º Dan)': {
    presenciais: [
      { label: 'Treinamentos obrigatórios (Liga)', quantidade: 25 },
      { label: 'Seminários Nacionais', quantidade: 2 },
    ],
    estagios: [
      { label: 'Estágio Internacional', quantidade: 1 },
      { label: 'Estágio de Ensino de Alto Nível', quantidade: 2 },
    ],
    teoria: [
      { label: 'Tese ou Projeto de Pesquisa em Judô' },
      { label: 'Defesa perante Comissão Técnica' },
    ],
    cursosMaxi: [
      { label: 'Módulo Especializado (livre escolha)', horas: 60 },
    ],
    cursosCob: [
      { label: 'Pacote Completo de Formação IOB' },
    ],
    examesPraticos: [
      { label: 'Exame técnico perante Comissão Nacional' },
      { label: 'Kata à escolha da banca' },
    ],
  },
}

const DEFAULT_REQ = REQUIREMENTS_DATA['Shodan (1º Dan)']

const SECTIONS = [
  { key: 'presenciais', label: 'Presenciais', icon: Users, color: 'text-blue-400' },
  { key: 'estagios', label: 'Estágios', icon: GraduationCap, color: 'text-purple-400' },
  { key: 'teoria', label: 'Teoria', icon: BookOpen, color: 'text-yellow-400' },
  { key: 'cursosMaxi', label: 'Cursos Profep MAX', icon: ClipboardList, color: 'text-red-400' },
  { key: 'cursosCob', label: 'Cursos COB', icon: Trophy, color: 'text-green-400' },
  { key: 'examesPraticos', label: 'Exames Práticos', icon: Dumbbell, color: 'text-orange-400' },
]

export default function RequisitosPage() {
  const [inscricao, setInscricao] = useState<InscricaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/candidato/dados')
      .then(r => r.json())
      .then(d => {
        setInscricao(d.inscricao)
        // Load checked state from progresso if available
        const progresso = d.inscricao?.progresso || {}
        setChecked(progresso.requisitos_checked || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleCheck = async (key: string) => {
    const newChecked = { ...checked, [key]: !checked[key] }
    setChecked(newChecked)
    // Auto-save
    await fetch('/api/candidato/progresso', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progresso: { requisitos_checked: newChecked } }),
    })
  }

  const grad = inscricao?.graduacao_pretendida || 'Shodan (1º Dan)'
  const req = REQUIREMENTS_DATA[grad] || DEFAULT_REQ

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Meus Requisitos</h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-slate-400">Requisitos para:</p>
          <span className="text-sm font-black text-red-500 bg-red-600/10 border border-red-600/20 px-3 py-1 rounded-full uppercase tracking-widest">
            {grad}
          </span>
        </div>
        <p className="text-slate-600 text-xs mt-2">Marque os itens concluídos. O progresso é salvo automaticamente.</p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map(section => {
          const Icon = section.icon
          const items = (req as Record<string, { label: string; quantidade?: number; horas?: number }[]>)[section.key] || []
          const doneCount = items.filter((_, i) => checked[`${section.key}_${i}`]).length

          return (
            <div key={section.key} className="bg-[#111827] border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${section.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">{section.label}</h3>
                </div>
                <span className="text-xs text-slate-500">
                  {doneCount}/{items.length}
                </span>
                {/* Progress bar */}
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all"
                    style={{ width: items.length ? `${(doneCount / items.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {items.map((item, i) => {
                  const itemKey = `${section.key}_${i}`
                  const isDone = checked[itemKey]
                  return (
                    <button
                      key={i}
                      onClick={() => toggleCheck(itemKey)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left group"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                      )}
                      <span className={`text-sm flex-1 ${isDone ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                        {item.label}
                      </span>
                      {item.quantidade !== undefined && (
                        <span className="text-xs text-slate-600 flex-shrink-0">{item.quantidade}x</span>
                      )}
                      {item.horas !== undefined && (
                        <span className="text-xs text-slate-600 flex-shrink-0">{item.horas}h</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
