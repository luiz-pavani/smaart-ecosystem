'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, Circle, ListChecks, GraduationCap, Clock, FileText, BookOpen, Award, Dumbbell } from 'lucide-react'

// ——— DADOS EXATOS DO ORIGINAL (profepmax/candidato/page.tsx) ———
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

function ReqItem({ title, desc, subitems }: { title: string; desc?: string; subitems?: string[] }) {
  return (
    <div className="flex gap-3">
      <CheckCircle2 size={16} className="text-slate-600 shrink-0 mt-0.5" />
      <div>
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
      </div>
    </div>
  )
}

function CourseItem({ label }: { label: string }) {
  return (
    <div className="flex gap-3 items-start">
      <BookOpen size={14} className="text-indigo-500 shrink-0 mt-0.5"/>
      <span className="text-xs text-slate-300">{label}</span>
    </div>
  )
}

export default function RequisitosPage() {
  const [loading, setLoading] = useState(true)
  const [graduacao, setGraduacao] = useState('Shodan (1º Dan)')

  useEffect(() => {
    fetch('/api/candidato/dados').then(r => r.json()).then(json => {
      if (json.inscricao?.graduacao_pretendida) setGraduacao(json.inscricao.graduacao_pretendida)
    }).finally(() => setLoading(false))
  }, [])

  const key = GRADE_KEYS[graduacao] || 'shodan'
  const req = REQUIREMENTS_DATA[key]

  if (loading) return (
    <div className="p-8 text-center text-slate-500">
      <Loader2 className="animate-spin mx-auto mb-2" size={24}/>
      Carregando...
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Meus Requisitos</h2>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-slate-400 text-sm">Requisitos para promoção a</p>
          <span className="text-xs font-black uppercase tracking-widest text-red-400 bg-red-900/20 border border-red-900/30 px-3 py-1 rounded-full">{graduacao}</span>
        </div>
      </header>

      {/* Presenciais */}
      {req.presential?.length > 0 && (
        <Section title="Requisitos Presenciais" icon={<Dumbbell size={14} className="text-red-500"/>}>
          {req.presential.map((item: any, i: number) => (
            <ReqItem key={i} title={item.title} desc={item.desc} subitems={item.subitems}/>
          ))}
        </Section>
      )}

      {/* Estágios */}
      {req.internships?.length > 0 && (
        <Section title="Estágios Práticos" icon={<Clock size={14} className="text-orange-400"/>}>
          {req.internships.map((item: any, i: number) => (
            <ReqItem key={i} title={item.title} desc={item.desc}/>
          ))}
        </Section>
      )}

      {/* Teoria */}
      {req.theory?.length > 0 && (
        <Section title="Requisitos Teóricos" icon={<FileText size={14} className="text-blue-400"/>}>
          {req.theory.map((item: any, i: number) => (
            <ReqItem key={i} title={item.title} desc={item.desc}/>
          ))}
        </Section>
      )}

      {/* Cursos Profep MAX */}
      {req.courses?.profep?.length > 0 && (
        <Section title={`Cursos Profep MAX (${req.courses.profep.length} cursos)`} icon={<GraduationCap size={14} className="text-indigo-400"/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {req.courses.profep.map((c: string, i: number) => <CourseItem key={i} label={c}/>)}
          </div>
        </Section>
      )}

      {/* Cursos COB */}
      {req.courses?.cob?.length > 0 && (
        <Section title={`Cursos COB / Instituto Olímpico (${req.courses.cob.length} cursos)`} icon={<Award size={14} className="text-green-400"/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {req.courses.cob.map((c: string, i: number) => <CourseItem key={i} label={c}/>)}
          </div>
        </Section>
      )}

      {/* Exames Práticos */}
      {req.practical_exams?.length > 0 && (
        <Section title="Exames Práticos" icon={<ListChecks size={14} className="text-purple-400"/>}>
          {req.practical_exams.map((item: any, i: number) => (
            <ReqItem key={i} title={item.title} desc={item.desc}/>
          ))}
        </Section>
      )}
    </div>
  )
}
