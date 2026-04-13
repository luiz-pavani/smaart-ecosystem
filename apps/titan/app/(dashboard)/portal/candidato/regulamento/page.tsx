import { ScrollText, Phone, Mail, AlertTriangle, BookOpen, Award, GraduationCap, ClipboardList, Users } from 'lucide-react'

// ── Dados por graduação ────────────────────────────────────────────────────────

const GRADUACOES = [
  {
    key: 'shodan',
    titulo: 'Shodan — 1º Dan',
    cor: 'border-red-600/40 bg-red-600/5',
    headerCor: 'text-red-500',
    kata: ['Nage-no-Kata: execução completa, atuando tanto como tori quanto como uke.'],
    waza: [
      'Kihon-dōsa: movimentos fundamentais (postura, pegada, movimentação).',
      'Go-kyō-no-waza: todas as técnicas dos cinco grupos do go-kyō.',
      'Katame-waza: imobilizações, estrangulamentos e chaves.',
      'Renraku-waza: combinações de técnicas ofensivas.',
      'Kaeshi-waza: contra-ataques.',
    ],
    estagios: [
      'Oficial de Competição: 48h práticas (6 competições completas ou 8 parciais). Realizado nos últimos 2 anos.',
      'Árbitro: 48h práticas (6 competições completas ou 8 parciais). Realizado nos últimos 2 anos.',
    ],
    teoricos: [
      'Artigo ou Pôster sobre tema relevante do judô (história, filosofia, técnica).',
      'Arbitragem: questões objetivas e análise de vídeos.',
      'Exame Teórico Geral: conhecimento geral sobre judô.',
    ],
    cursosProf: [
      'Curso de Nage-no-Kata', 'Curso Ensino do Judô Infantil', 'Curso Seiryoku-Zen\'yo-Kokumin-Taiiku-no-Kata',
      'Direto do Dojo com Douglas Vieira', 'Curso de Oficiais de Competição', 'Curso de Arbitragem',
      'Curso de Waza', 'Curso de Kodomo-no-Kata', 'Curso de Ensino do Judô com Segurança',
      'Curso de História do Judô', 'Curso de Terminologia do Judô', 'Curso de Atendimento Pré-hospitalar (1ºs socorros)',
    ],
    cursosCob: [
      'Esporte Antirracista', 'Prevenção do Assédio e Abuso', 'Saúde Mental no Esporte',
      'Formando Campeões', 'Combate à Manipulação de Resultados', 'Igualdade de Gênero',
    ],
  },
  {
    key: 'nidan',
    titulo: 'Nidan — 2º Dan',
    cor: 'border-green-600/40 bg-green-600/5',
    headerCor: 'text-green-500',
    kata: ['Katame-no-Kata: execução completa, atuando tanto como tori quanto como uke.'],
    waza: [
      'Shinmeisho-no-waza e Habukareta-waza: todas as técnicas oficiais de nage-waza fora do go-kyō.',
      'Katame-waza: imobilizações, estrangulamentos e chaves.',
      'Renraku-waza: combinações de técnicas.',
      'Kaeshi-waza: contra-ataques.',
    ],
    estagios: [
      'Árbitro: 48h práticas (6 competições completas ou 8 parciais). Realizado nos últimos 2 anos.',
    ],
    teoricos: [
      'Artigo ou Pôster sobre tema relevante do judô.',
      'Arbitragem: questões objetivas e análise de vídeos.',
      'Exame Teórico Geral: conhecimento geral sobre judô.',
    ],
    cursosProf: [
      'Curso de Gestão de Academias', 'Curso de Katame-no-Kata', 'Direto do Dojo com Ma. Suelen Altheman',
      'Curso de Arbitragem', 'Curso de Waza', 'Curso de Kodomo-no-Kata',
      'Curso de Ensino do Judô com Segurança', 'Curso de História do Judô',
      'Curso de História do Judô no Brasil', 'Curso de Terminologia do Judô',
      'Curso de Atendimento Pré-hospitalar (1ºs socorros)',
    ],
    cursosCob: [
      'Combate à Manipulação de Resultados', 'Igualdade de Gênero', 'Comissão de Atletas',
      'Conduta Ética na Prática', 'Ginecologia do Esporte',
    ],
  },
  {
    key: 'sandan',
    titulo: 'Sandan — 3º Dan',
    cor: 'border-orange-600/40 bg-orange-600/5',
    headerCor: 'text-orange-400',
    kata: ['Kōdōkan Goshin-jutsu: execução completa, atuando tanto como tori quanto como uke.'],
    waza: [
      'Aula magna de técnica sorteada do go-kyō-no-waza.',
      'Aula magna de técnica sorteada do katame-waza.',
    ],
    estagios: [],
    teoricos: [
      'Artigo ou Pôster sobre tema relevante do judô.',
      'Arbitragem: questões objetivas e análise de vídeos.',
      'Exame Teórico Geral: conhecimento geral sobre judô.',
    ],
    cursosProf: [
      'Curso de Kōdōkan Goshin-jutsu', 'Diferenças entre Técnicas Semelhantes',
      'Curso de História do Judô no Brasil', 'Curso sobre Conde Koma: A História Definitiva',
      'Curso de Terminologia do Judô', 'Curso de Atendimento Pré-hospitalar (1ºs socorros)',
      'Curso de Metodologia Japonesa de Ensino do Judô', 'Curso de Gestão de Eventos Esportivos',
      'Curso de Gestão de Projetos Sociais',
    ],
    cursosCob: ['Fundamentos da Administração Esportiva'],
  },
  {
    key: 'yondan',
    titulo: 'Yondan — 4º Dan',
    cor: 'border-blue-600/40 bg-blue-600/5',
    headerCor: 'text-blue-400',
    kata: ['Kime-no-Kata: execução completa, atuando tanto como tori quanto como uke.'],
    waza: [
      'Aula magna de técnica sorteada dos shinmeisho-no-waza e habukareta-waza.',
      'Aula magna de técnica sorteada do katame-waza.',
    ],
    estagios: [],
    teoricos: [
      'Artigo ou Pôster sobre tema relevante do judô.',
      'Arbitragem: questões objetivas e análise de vídeos.',
      'Exame Teórico Geral: conhecimento geral sobre judô.',
    ],
    cursosProf: ['Curso de Kime-no-Kata'],
    cursosCob: ['Fundamentos do Treinamento Esportivo (FTE)'],
  },
  {
    key: 'godan',
    titulo: 'Godan — 5º Dan',
    cor: 'border-purple-600/40 bg-purple-600/5',
    headerCor: 'text-purple-400',
    kata: ['Jū-no-Kata: execução completa, atuando tanto como tori quanto como uke.'],
    waza: ['Aula magna de técnica sorteada entre as 100 técnicas oficiais da Kōdōkan.'],
    estagios: [],
    teoricos: [
      'Artigo ou Pôster sobre tema relevante do judô.',
      'Arbitragem: questões objetivas e análise de vídeos.',
      'Exame Teórico Geral: conhecimento geral sobre judô.',
    ],
    cursosProf: ['Curso de Jū-no-Kata'],
    cursosCob: ['Fundamentos do Treinamento Esportivo (FTE)'],
  },
  {
    key: 'rokudan',
    titulo: 'Rokudan — 6º Dan',
    cor: 'border-yellow-600/40 bg-yellow-600/5',
    headerCor: 'text-yellow-400',
    kata: [],
    waza: ['Aula magna de técnica sorteada entre as 100 técnicas oficiais da Kōdōkan.'],
    estagios: [],
    teoricos: [
      'Kata: exames teóricos de Itsutsu-no-Kata e Koshiki-no-Kata.',
      'Artigo ou Pôster sobre tema relevante do judô.',
      'Arbitragem: questões objetivas e análise de vídeos.',
      'Exame Teórico Geral: conhecimento geral sobre judô.',
    ],
    cursosProf: ['Curso de Itsutsu-no-Kata', 'Curso de Koshiki-no-Kata'],
    cursosCob: [],
  },
]

// ── Componente ────────────────────────────────────────────────────────────────

export default function RegulamentoPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Regulamento</h1>
        <p className="text-slate-400 mt-1">Manual do Candidato 2026 — Liga Riograndense de Judô</p>
      </div>

      {/* Objetivo */}
      <section className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center">
            <Award className="w-4 h-4 text-red-500" />
          </div>
          <h2 className="text-white font-black text-sm uppercase tracking-widest">Objetivo do Programa</h2>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          O processo de exames de Dan (faixa preta e superiores) na LRSJ é formal e segue etapas definidas
          para garantir que todos os pré-requisitos sejam atendidos antes da avaliação.
        </p>
        <p className="text-slate-300 text-sm leading-relaxed mt-3">
          Todos os detalhes, prazos e critérios estão definidos no Artigo 11 do Código de Promoção da LRSJ.
          Mantenha seus dados cadastrais e financeiros sempre atualizados junto à LRSJ e converse com seu professor responsável durante todo o processo.
        </p>
      </section>

      {/* Processo de inscrição */}
      <section className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-white font-black text-sm uppercase tracking-widest">Como me Inscrevo?</h2>
        </div>
        <ol className="space-y-4">
          {[
            {
              n: '1', titulo: 'Inscrição Online',
              texto: 'A inscrição é feita exclusivamente através do site oficial da LRSJ (www.lrsj.com.br) dentro do prazo divulgado para o ano do exame.',
            },
            {
              n: '2', titulo: 'Primeira Análise (LRSJ)',
              texto: 'A LRSJ verifica: filiação em dia, graduação anterior necessária e idade mínima exigida.',
            },
            {
              n: '3', titulo: 'Segunda Análise (CEG — Comissão Estadual de Graus)',
              texto: 'Se aprovado na primeira etapa, o pedido segue à CEG, que avaliará o currículo do judoca, participação em eventos, cursos e outros requisitos técnicos. Caso negado, a CEG informará os motivos.',
            },
            {
              n: '4', titulo: 'Habilitação para os Exames',
              texto: 'Com o pedido aceito pela CEG, o candidato estará oficialmente habilitado a realizar atividades, estágios e participar das bancas de avaliação.',
            },
          ].map(step => (
            <li key={step.n} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-red-400 font-black text-xs">{step.n}</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm">{step.titulo}</p>
                <p className="text-slate-400 text-sm mt-0.5">{step.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Estrutura dos exames */}
      <section className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="text-white font-black text-sm uppercase tracking-widest">Estrutura dos Exames</h2>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          {[
            { titulo: 'Exame de Kata', desc: 'Apresentação do kata referente à graduação pretendida na forma padronizada pela Kōdōkan, atuando como tori e como uke.' },
            { titulo: 'Exame de Waza', desc: 'Técnicas sorteadas pela banca. O candidato informa seus renraku-henka-waza previamente. A CEG solicita por nome em japonês.' },
            { titulo: 'Exames Teóricos', desc: 'Temas: história, filosofia e atualidades; divisão e classificação das técnicas; vocabulário técnico; demais temas pertinentes.' },
            { titulo: 'Exame de Árbitros e Oficiais', desc: 'Avaliação de estágio, avaliação prática e avaliação teórica, quando previsto no programa da graduação.' },
            { titulo: 'Estudos Complementares (EaD)', desc: 'Certificados de cursos do Profep Max, COB ou outras instituições recomendadas pela CEG.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-red-500 font-black mt-0.5">•</span>
              <p><span className="text-white font-semibold">{item.titulo}:</span> {item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Requisitos por graduação */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-slate-300" />
          </div>
          <h2 className="text-white font-black text-sm uppercase tracking-widest">Requisitos por Graduação</h2>
        </div>

        <div className="space-y-4">
          {GRADUACOES.map(g => (
            <details key={g.key} className={`border rounded-xl overflow-hidden ${g.cor}`}>
              <summary className="px-5 py-4 cursor-pointer list-none flex items-center justify-between">
                <span className={`font-black text-sm uppercase tracking-widest ${g.headerCor}`}>{g.titulo}</span>
                <span className="text-slate-500 text-xs">Ver requisitos ▾</span>
              </summary>
              <div className="px-5 pb-5 space-y-4 text-sm border-t border-white/5 pt-4">

                {/* Kata */}
                {g.kata.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Exame de Kata</p>
                    <ul className="space-y-1">
                      {g.kata.map((k, i) => (
                        <li key={i} className="flex gap-2 text-slate-300"><span className="text-red-500">•</span>{k}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Waza */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Exame de Waza</p>
                  <ul className="space-y-1">
                    {g.waza.map((w, i) => (
                      <li key={i} className="flex gap-2 text-slate-300"><span className="text-red-500">•</span>{w}</li>
                    ))}
                  </ul>
                </div>

                {/* Estágios */}
                {g.estagios.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Estágios</p>
                    <ul className="space-y-1">
                      {g.estagios.map((e, i) => (
                        <li key={i} className="flex gap-2 text-slate-300"><span className="text-green-500">✓</span>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Teóricos */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Exames Teóricos</p>
                  <ul className="space-y-1">
                    {g.teoricos.map((t, i) => (
                      <li key={i} className="flex gap-2 text-slate-300"><span className="text-blue-400">•</span>{t}</li>
                    ))}
                  </ul>
                </div>

                {/* Cursos EaD */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Estudos Complementares EaD</p>
                  {g.cursosProf.length > 0 && (
                    <>
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Profep Max</p>
                      <ul className="space-y-0.5 mb-2">
                        {g.cursosProf.map((c, i) => (
                          <li key={i} className="flex gap-2 text-slate-400 text-xs"><span className="text-slate-600">–</span>{c}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {g.cursosCob.length > 0 && (
                    <>
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">COB</p>
                      <ul className="space-y-0.5">
                        {g.cursosCob.map((c, i) => (
                          <li key={i} className="flex gap-2 text-slate-400 text-xs"><span className="text-slate-600">–</span>{c}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <p className="text-[10px] text-slate-600 mt-2 italic">A lista é referência e pode ser alterada pela CEG.</p>
                </div>

              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Aviso */}
      <section className="bg-yellow-900/10 border border-yellow-600/20 rounded-xl p-5">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-bold text-sm mb-1">Regulamento sujeito a alterações</p>
            <p className="text-yellow-200/60 text-xs leading-relaxed">
              Este é um resumo do Manual do Candidato 2026. Todos os detalhes, prazos e critérios estão definidos
              no Artigo 11 do Código de Promoção da LRSJ. Converse com seu professor responsável e mantenha
              seus dados cadastrais e financeiros atualizados junto à LRSJ.
            </p>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <h2 className="text-white font-black text-sm uppercase tracking-widest">Contato da Coordenação</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <ScrollText className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Luiz Pavani / Bruno Chalar</p>
              <p className="text-slate-500 text-xs">Coordenadores do Programa de Faixas Pretas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-slate-300 text-sm">secretaria@lrsj.com.br</p>
          </div>
        </div>
      </section>
    </div>
  )
}
