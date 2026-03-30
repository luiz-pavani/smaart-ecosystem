'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, ListChecks, GraduationCap, Clock, FileText, BookOpen, Award, Dumbbell, Check } from 'lucide-react'
import { useCandidato } from '../context'

// ——— DADOS EXATOS DO ORIGINAL ———
const REQUIREMENTS_DATA: any = {
  shodan: {
    presential: [
      { title: "Nage-no-Kata", desc: "Execução completa (Tori e Uke).", type: "check" },
      { title: "Arbitragem", desc: "Exame prático em competição.", type: "check" },
      { title: "Waza", desc: "Demonstração técnica.", type: "check", subitems: ["Kihon-dōsa (Fundamentos)", "Go-kyō (5 grupos)", "Katame-waza (Solo)", "Renraku-waza (Combinações)", "Kaeshi-waza (Contra-ataques)"] }
    ],
    internships: [
      { title: "Oficial de Competição", desc: "Carga horária prática de 48 horas (6 competições completas ou 8 com atuação parcial).", type: "hours" },
      { title: "Árbitro", desc: "Carga horária prática de 48 horas (6 competições completas ou 8 com atuação parcial).", type: "hours" }
    ],
    theory: [
      { title: "Artigo ou Poster", desc: "Avaliação da banca.", type: "grade" },
      { title: "Exame Teórico Geral", desc: "Prova escrita.", type: "grade" },
      { title: "Exame Teórico de Arbitragem", desc: "Prova escrita.", type: "grade" }
    ],
    courses: {
      profep: ["Curso de Nage-no-Kata", "Curso Ensino do Judô Infantil", "Curso Seiryoku-Zen'yo-Kokumin-Taiiku-no-Kata", "Direto do Dojo com Douglas Vieira", "Curso de Oficiais de Competição", "Curso de Arbitragem", "Curso de Waza", "Curso de Kodomo-no-Kata", "Curso de Ensino do Judô com Segurança", "Curso de História do Judô", "Curso de Terminologia do Judô", "Curso de Atendimento Pré-hospitalar (1ºs socorros)"],
      cob: ["Esporte Antirracista", "Prevenção do Assédio e Abuso", "Saúde Mental no Esporte", "Formando Campeões", "Combate à Manipulação de Resultados", "Igualdade de Gênero"]
    },
    practical_exams: [
      { title: "Kodomo-no-Kata", desc: "Envio de vídeo", type: "grade" },
      { title: "Seiryoku-Zen'yo-Kokumin-Taiiku-no-Kata", desc: "Envio de vídeo", type: "grade" },
      { title: "Arbitragem", desc: "Presencial", type: "grade" },
      { title: "Nage-no-Kata", desc: "Presencial", type: "grade" },
      { title: "Waza", desc: "Presencial", type: "grade" }
    ]
  },
  nidan: {
    presential: [
      { title: "Katame-no-Kata", desc: "Execução completa.", type: "check" },
      { title: "Arbitragem", desc: "Prático.", type: "check" },
      { title: "Waza", desc: "Demonstração.", type: "check", subitems: ["Shinmeisho-no-waza", "Katame-waza", "Renraku-waza", "Kaeshi-waza"] }
    ],
    internships: [
      { title: "Árbitro", desc: "Carga horária prática de 48 horas (6 competições completas ou 8 com atuação parcial).", type: "hours" }
    ],
    theory: [
      { title: "Artigo ou Poster", type: "grade" },
      { title: "Exame Teórico Geral", type: "grade" },
      { title: "Exame Teórico de Arbitragem", type: "grade" }
    ],
    courses: {
      profep: ["Curso de Gestão de Academias", "Curso de Katame-no-Kata", "Direto do Dojo com Ma. Suelen Altheman", "Curso de Arbitragem", "Curso de Waza", "Curso de Kodomo-no-Kata", "Curso de Ensino do Judô com Segurança", "Curso de História do Judô", "Curso de História do Judô no Brasil", "Curso de Terminologia do Judô", "Curso de Atendimento Pré-hospitalar"],
      cob: ["Combate à Manipulação de Resultados", "Igualdade de Gênero", "Comissão de Atletas", "Conduta Ética na Prática", "Ginecologia do Esporte"]
    },
    practical_exams: [
      { title: "Kodomo-no-Kata", desc: "Envio de vídeo", type: "grade" },
      { title: "Seiryoku-Zen'yo-Kokumin-Taiiku-no-Kata", desc: "Envio de vídeo", type: "grade" },
      { title: "Arbitragem", desc: "Presencial", type: "grade" },
      { title: "Katame-no-Kata", desc: "Presencial", type: "grade" },
      { title: "Waza", desc: "Presencial", type: "grade" }
    ]
  },
  sandan: {
    presential: [
      { title: "Kōdōkan Goshin-jutsu", desc: "Execução Completa", type: "check" },
      { title: "Waza", desc: "Aula Magna", type: "check" }
    ],
    internships: [],
    theory: [{ title: "Artigo", type: "grade" }],
    courses: { profep: ["Curso de Kōdōkan Goshin-jutsu"], cob: ["Fundamentos da Administração"] },
    practical_exams: [{ title: "Goshin-jutsu (Nota)", type: "grade" }]
  },
  yondan: {
    presential: [
      { title: "Kime-no-Kata", desc: "Execução Completa", type: "check" },
      { title: "Waza", desc: "Aula Magna", type: "check" }
    ],
    internships: [],
    theory: [{ title: "Artigo", type: "grade" }],
    courses: { profep: ["Curso de Kime-no-Kata"], cob: ["Fundamentos do Treinamento"] },
    practical_exams: [{ title: "Kime-no-Kata (Nota)", type: "grade" }]
  },
  godan: {
    presential: [
      { title: "Ju-no-Kata", desc: "Execução Completa", type: "check" },
      { title: "Waza", desc: "Aula Magna", type: "check" }
    ],
    internships: [],
    theory: [{ title: "Artigo", type: "grade" }],
    courses: { profep: ["Curso de Ju-no-Kata"], cob: ["Treinamento Avançado"] },
    practical_exams: [{ title: "Ju-no-Kata (Nota)", type: "grade" }]
  },
  rokudan: {
    presential: [{ title: "Waza", desc: "Aula Magna", type: "check" }],
    internships: [],
    theory: [{ title: "Artigo", type: "grade" }],
    courses: { profep: ["Itsutsu-no-Kata", "Koshiki-no-Kata"], cob: [] },
    practical_exams: []
  }
}

const GRADE_KEYS: Record<string, string> = {
  'Shodan (1º Dan)': 'shodan',
  'Nidan (2º Dan)': 'nidan',
  'Sandan (3º Dan)': 'sandan',
  'Yondan (4º Dan)': 'yondan',
  'Godan (5º Dan)': 'godan',
  'Rokudan (6º Dan)': 'rokudan',
}

type ReqStatus = { user_completed: boolean; admin_confirmed: boolean; admin_nota: string | null }

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
        {icon}{title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function CourseItem({ label, reqKey, status, isAdmin, onToggle }: {
  label: string; reqKey: string
  status?: ReqStatus; isAdmin: boolean
  onToggle: (key: string, field: 'user_completed' | 'admin_confirmed', val: boolean) => void
}) {
  const st = status || { user_completed: false, admin_confirmed: false, admin_nota: null }
  const checkColor = st.admin_confirmed ? 'text-green-400' : st.user_completed ? 'text-yellow-400' : 'text-slate-600'

  return (
    <div className="flex gap-3 items-start">
      <button
        onClick={() => {
          if (isAdmin) onToggle(reqKey, 'admin_confirmed', !st.admin_confirmed)
          else onToggle(reqKey, 'user_completed', !st.user_completed)
        }}
        className={`mt-0.5 shrink-0 transition-colors ${checkColor} hover:opacity-80`}
        title={isAdmin ? 'Confirmar como admin' : 'Marcar como concluído'}
      >
        <Check size={14} strokeWidth={3} />
      </button>
      <span className={`text-xs ${st.admin_confirmed ? 'text-slate-300' : st.user_completed ? 'text-slate-300' : 'text-slate-500'}`}>{label}</span>
    </div>
  )
}

function ReqItem({ title, desc, subitems, reqKey, status, isAdmin, onToggle, onNota }: {
  title: string; desc?: string; subitems?: string[]
  reqKey: string; status?: ReqStatus; isAdmin: boolean
  onToggle: (key: string, field: 'user_completed' | 'admin_confirmed', val: boolean) => void
  onNota: (key: string, nota: string) => void
}) {
  const st = status || { user_completed: false, admin_confirmed: false, admin_nota: null }
  const checkColor = st.admin_confirmed ? 'text-green-400' : st.user_completed ? 'text-yellow-400' : 'text-slate-600'
  const [editingNota, setEditingNota] = useState(false)
  const [nota, setNota] = useState(st.admin_nota || '')

  return (
    <div className="flex gap-3">
      <button
        onClick={() => {
          if (isAdmin) onToggle(reqKey, 'admin_confirmed', !st.admin_confirmed)
          else onToggle(reqKey, 'user_completed', !st.user_completed)
        }}
        className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
          st.admin_confirmed ? 'border-green-400 bg-green-400/20' :
          st.user_completed ? 'border-yellow-400 bg-yellow-400/20' :
          'border-slate-600 hover:border-slate-400'
        }`}
        title={isAdmin ? 'Confirmar como admin' : 'Marcar como concluído'}
      >
        {(st.admin_confirmed || st.user_completed) && (
          <Check size={9} strokeWidth={3} className={st.admin_confirmed ? 'text-green-400' : 'text-yellow-400'} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-200">{title}</div>
        {desc && <div className="text-xs text-slate-500 mt-0.5">{desc}</div>}
        {subitems && (
          <ul className="mt-1 space-y-1">
            {subitems.map((s, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0"/>
                {s}
              </li>
            ))}
          </ul>
        )}
        {/* Admin nota */}
        {isAdmin && (
          <div className="mt-1.5">
            {editingNota ? (
              <div className="flex gap-2 items-center">
                <input
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Nota / pontuação"
                  className="flex-1 bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => { onNota(reqKey, nota); setEditingNota(false) }}
                  className="text-[10px] px-2 py-1 rounded bg-indigo-600 text-white font-bold"
                >OK</button>
                <button onClick={() => setEditingNota(false)} className="text-[10px] text-slate-500 hover:text-white">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setEditingNota(true)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                {st.admin_nota ? `Nota: ${st.admin_nota}` : '+ Adicionar nota'}
              </button>
            )}
          </div>
        )}
        {/* Show nota to user (read-only) */}
        {!isAdmin && st.admin_nota && (
          <div className="mt-1 text-[10px] text-green-400 font-semibold">Nota: {st.admin_nota}</div>
        )}
      </div>
    </div>
  )
}

export default function RequisitosPage() {
  const { isAdmin } = useCandidato()
  const [loading, setLoading] = useState(true)
  const [graduacao, setGraduacao] = useState('Shodan (1º Dan)')
  const [statusMap, setStatusMap] = useState<Record<string, ReqStatus>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/candidato/dados').then(r => r.json()),
      fetch('/api/candidato/requisitos/status').then(r => r.json()),
    ]).then(([dados, st]) => {
      if (dados.inscricao?.graduacao_pretendida) setGraduacao(dados.inscricao.graduacao_pretendida)
      setStatusMap(st.status || {})
    }).finally(() => setLoading(false))
  }, [])

  const handleToggle = useCallback(async (reqKey: string, field: 'user_completed' | 'admin_confirmed', val: boolean) => {
    setSaving(reqKey)
    const prev = statusMap[reqKey] || { user_completed: false, admin_confirmed: false, admin_nota: null }
    const updated = { ...prev, [field]: val }
    setStatusMap(m => ({ ...m, [reqKey]: updated }))

    await fetch('/api/candidato/requisitos/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ req_key: reqKey, [field]: val }),
    })
    setSaving(null)
  }, [statusMap])

  const handleNota = useCallback(async (reqKey: string, nota: string) => {
    const prev = statusMap[reqKey] || { user_completed: false, admin_confirmed: false, admin_nota: null }
    setStatusMap(m => ({ ...m, [reqKey]: { ...prev, admin_nota: nota } }))
    await fetch('/api/candidato/requisitos/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ req_key: reqKey, admin_nota: nota }),
    })
  }, [statusMap])

  const key = GRADE_KEYS[graduacao] || 'shodan'
  const req = REQUIREMENTS_DATA[key]

  if (loading) return (
    <div className="p-8 text-center text-slate-500">
      <Loader2 className="animate-spin mx-auto mb-2" size={24}/>
      Carregando...
    </div>
  )

  const mkKey = (section: string, i: number) => `${key}.${section}.${i}`

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Meus Requisitos</h2>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <p className="text-slate-400 text-sm">Requisitos para promoção a</p>
          <span className="text-xs font-black uppercase tracking-widest text-red-400 bg-red-900/20 border border-red-900/30 px-3 py-1 rounded-full">{graduacao}</span>
          {!isAdmin && (
            <div className="flex items-center gap-3 ml-auto text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-yellow-400 inline-block"/> Marcado por mim</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-green-400 inline-block"/> Confirmado</span>
            </div>
          )}
          {isAdmin && (
            <div className="flex items-center gap-3 ml-auto text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-yellow-400 inline-block"/> Candidato marcou</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-green-400 inline-block"/> Admin confirmou</span>
            </div>
          )}
        </div>
      </header>

      {req.presential?.length > 0 && (
        <Section title="Requisitos Presenciais" icon={<Dumbbell size={14} className="text-red-500"/>}>
          {req.presential.map((item: any, i: number) => (
            <ReqItem key={i} title={item.title} desc={item.desc} subitems={item.subitems}
              reqKey={mkKey('presential', i)} status={statusMap[mkKey('presential', i)]}
              isAdmin={isAdmin} onToggle={handleToggle} onNota={handleNota} />
          ))}
        </Section>
      )}

      {req.internships?.length > 0 && (
        <Section title="Estágios Práticos" icon={<Clock size={14} className="text-orange-400"/>}>
          {req.internships.map((item: any, i: number) => (
            <ReqItem key={i} title={item.title} desc={item.desc}
              reqKey={mkKey('internships', i)} status={statusMap[mkKey('internships', i)]}
              isAdmin={isAdmin} onToggle={handleToggle} onNota={handleNota} />
          ))}
        </Section>
      )}

      {req.theory?.length > 0 && (
        <Section title="Requisitos Teóricos" icon={<FileText size={14} className="text-blue-400"/>}>
          {req.theory.map((item: any, i: number) => (
            <ReqItem key={i} title={item.title} desc={item.desc}
              reqKey={mkKey('theory', i)} status={statusMap[mkKey('theory', i)]}
              isAdmin={isAdmin} onToggle={handleToggle} onNota={handleNota} />
          ))}
        </Section>
      )}

      {req.courses?.profep?.length > 0 && (
        <Section title={`Cursos Profep MAX (${req.courses.profep.length} cursos)`} icon={<GraduationCap size={14} className="text-indigo-400"/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {req.courses.profep.map((c: string, i: number) => (
              <CourseItem key={i} label={c} reqKey={mkKey('courses.profep', i)}
                status={statusMap[mkKey('courses.profep', i)]}
                isAdmin={isAdmin} onToggle={handleToggle} />
            ))}
          </div>
        </Section>
      )}

      {req.courses?.cob?.length > 0 && (
        <Section title={`Cursos COB / Instituto Olímpico (${req.courses.cob.length} cursos)`} icon={<Award size={14} className="text-green-400"/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {req.courses.cob.map((c: string, i: number) => (
              <CourseItem key={i} label={c} reqKey={mkKey('courses.cob', i)}
                status={statusMap[mkKey('courses.cob', i)]}
                isAdmin={isAdmin} onToggle={handleToggle} />
            ))}
          </div>
        </Section>
      )}

      {req.practical_exams?.length > 0 && (
        <Section title="Exames Práticos" icon={<ListChecks size={14} className="text-purple-400"/>}>
          {req.practical_exams.map((item: any, i: number) => (
            <ReqItem key={i} title={item.title} desc={item.desc}
              reqKey={mkKey('practical_exams', i)} status={statusMap[mkKey('practical_exams', i)]}
              isAdmin={isAdmin} onToggle={handleToggle} onNota={handleNota} />
          ))}
        </Section>
      )}
    </div>
  )
}
