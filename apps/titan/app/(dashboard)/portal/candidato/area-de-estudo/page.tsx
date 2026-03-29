'use client'

import Link from 'next/link'
import { ExternalLink, Play, BookOpen, Clock, ArrowRight, Lock } from 'lucide-react'

const PLATFORMS = [
  {
    id: 'profep',
    label: 'PLATAFORMA INTERNA',
    title: 'Profep MAX',
    description: 'Cursos online do Programa de Formação de Professores. Acesse sua trilha de aprendizagem e conclua os módulos exigidos pelo regulamento.',
    icon: Play,
    color: 'from-red-700 to-red-900',
    href: '/cursos',
    external: false,
    cta: 'Acessar Plataforma',
    available: true,
    tags: ['Judô', 'Arbitragem', 'Gestão'],
  },
  {
    id: 'cob',
    label: 'INSTITUTO OLÍMPICO',
    title: 'Instituto Olímpico Brasileiro',
    description: 'Cursos de Educação Olímpica, liderança e gestão esportiva oferecidos pelo Comitê Olímpico do Brasil. Obrigatório para candidatos ao Dan.',
    icon: BookOpen,
    color: 'from-blue-700 to-blue-900',
    href: 'https://www.cob.org.br/cultura-educacao/cursos-do-iob',
    external: true,
    cta: 'Acessar IOB',
    available: true,
    tags: ['COB', 'Educação Olímpica', 'Online'],
  },
  {
    id: 'simulado',
    label: 'EM BREVE',
    title: 'Simulado Geral',
    description: 'Teste seus conhecimentos teóricos sobre regulamento, arbitragem, história e filosofia do judô. Disponível em breve.',
    icon: Clock,
    color: 'from-slate-700 to-slate-900',
    href: '#',
    external: false,
    cta: 'Em breve',
    available: false,
    tags: ['Teoria', 'Prática', 'Avaliação'],
  },
]

export default function AreaDeEstudoPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Área de Estudo</h1>
        <p className="text-slate-400 mt-1">Plataformas de formação exigidas pelo Programa de Faixas Pretas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLATFORMS.map(platform => {
          const Icon = platform.icon
          return (
            <div
              key={platform.id}
              className={`group relative overflow-hidden rounded-2xl border border-slate-800 flex flex-col ${!platform.available ? 'opacity-60' : ''}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${platform.color} opacity-20`} />

              <div className="relative p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black tracking-widest text-slate-500 uppercase">
                    {platform.label}
                  </span>
                  {!platform.available && <Lock className="w-4 h-4 text-slate-600" />}
                </div>

                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-white font-black text-xl mb-2">{platform.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed flex-1 mb-4">{platform.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {platform.tags.map(tag => (
                    <span key={tag} className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                      {tag}
                    </span>
                  ))}
                </div>

                {platform.available ? (
                  platform.external ? (
                    <a
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-white font-bold text-sm"
                    >
                      {platform.cta}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <Link
                      href={platform.href}
                      className="flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 transition-colors rounded-xl text-white font-bold text-sm"
                    >
                      {platform.cta}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )
                ) : (
                  <button
                    disabled
                    className="py-3 bg-white/5 rounded-xl text-slate-500 font-bold text-sm cursor-not-allowed"
                  >
                    {platform.cta}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info box */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
        <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-2">Atenção</p>
        <p className="text-slate-300 text-sm leading-relaxed">
          Todos os cursos realizados devem ser documentados e comprovados na seção <strong className="text-white">Documentos</strong>.
          Guarde seus certificados de conclusão para upload durante o processo de inscrição.
        </p>
      </div>
    </div>
  )
}
