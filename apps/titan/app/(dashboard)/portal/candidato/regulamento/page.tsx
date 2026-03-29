import { ScrollText, Phone, Mail, AlertTriangle, Clock, BookOpen, Award } from 'lucide-react'

const CARENCIAS = [
  { grad: 'Shodan (1º Dan)', tempo: '4 anos', pontos: '100 pts' },
  { grad: 'Nidan (2º Dan)', tempo: '3 anos após Shodan', pontos: '120 pts' },
  { grad: 'Sandan (3º Dan)', tempo: '4 anos após Nidan', pontos: '140 pts' },
  { grad: 'Yondan (4º Dan)', tempo: '5 anos após Sandan', pontos: '160 pts' },
]

export default function RegulamentoPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Regulamento</h1>
        <p className="text-slate-400 mt-1">Programa de Formação de Faixas Pretas — Liga Riograndense de Judô</p>
      </div>

      {/* Objective */}
      <section className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center">
            <Award className="w-4 h-4 text-red-500" />
          </div>
          <h2 className="text-white font-black text-sm uppercase tracking-widest">Objetivo do Programa</h2>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          O Programa de Formação de Faixas Pretas da Liga Riograndense de Judô tem por objetivo normatizar
          e padronizar o processo de avaliação e concessão de graduações de Dan, garantindo que todos os
          candidatos possuam os requisitos técnicos, pedagógicos, teóricos e administrativos necessários
          para representar com excelência o judô gaúcho.
        </p>
        <p className="text-slate-300 text-sm leading-relaxed mt-3">
          A obtenção de um grau de faixa preta pela Liga Riograndense de Judô é reconhecida pela
          Confederação Brasileira de Judô (CBJ) e pela Federação Internacional de Judô (IJF).
        </p>
      </section>

      {/* Carências */}
      <section className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-white font-black text-sm uppercase tracking-widest">Carências Mínimas</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-500 font-black uppercase tracking-widest text-xs py-2 pr-4">Graduação</th>
                <th className="text-left text-slate-500 font-black uppercase tracking-widest text-xs py-2 pr-4">Tempo Mínimo</th>
                <th className="text-left text-slate-500 font-black uppercase tracking-widest text-xs py-2">Pontuação Mínima</th>
              </tr>
            </thead>
            <tbody>
              {CARENCIAS.map((row, i) => (
                <tr key={i} className="border-b border-slate-800/50">
                  <td className="text-white py-3 pr-4 font-medium">{row.grad}</td>
                  <td className="text-slate-400 py-3 pr-4">{row.tempo}</td>
                  <td className="py-3">
                    <span className="text-red-400 font-black bg-red-600/10 border border-red-600/20 px-2 py-0.5 rounded-full text-xs">
                      {row.pontos}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Requirements overview */}
      <section className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="text-white font-black text-sm uppercase tracking-widest">Requisitos Gerais</h2>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex gap-2">
            <span className="text-red-500 font-black mt-0.5">•</span>
            <p>Estar filiado à Liga Riograndense de Judô com anuidade em dia.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-red-500 font-black mt-0.5">•</span>
            <p>Possuir atestado médico de aptidão para a prática de artes marciais, emitido há no máximo 1 ano.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-red-500 font-black mt-0.5">•</span>
            <p>Ter concluído os cursos obrigatórios nas plataformas Profep MAX e IOB (Instituto Olímpico Brasileiro).</p>
          </div>
          <div className="flex gap-2">
            <span className="text-red-500 font-black mt-0.5">•</span>
            <p>Apresentar comprovante de certificado de primeiros socorros com carga horária mínima de 8 horas.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-red-500 font-black mt-0.5">•</span>
            <p>Participar dos treinamentos obrigatórios da Liga conforme cronograma anual.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-red-500 font-black mt-0.5">•</span>
            <p>Ser aprovado na prova teórica e no exame prático (kata e randori avaliativo).</p>
          </div>
          <div className="flex gap-2">
            <span className="text-red-500 font-black mt-0.5">•</span>
            <p>Submeter todos os documentos obrigatórios no portal até 30 dias antes da data do exame.</p>
          </div>
        </div>
      </section>

      {/* Alert */}
      <section className="bg-yellow-900/10 border border-yellow-600/20 rounded-xl p-5">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-bold text-sm mb-1">Atenção — Regulamento Sujeito a Alterações</p>
            <p className="text-yellow-200/60 text-xs leading-relaxed">
              Este regulamento pode ser atualizado pela Comissão Técnica da Liga a qualquer momento.
              Candidatos serão notificados por e-mail. Consulte sempre a versão mais recente no portal.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <h2 className="text-white font-black text-sm uppercase tracking-widest mb-4">Contato da Coordenação</h2>
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
            <p className="text-slate-300 text-sm">graduacao@lrsj.org.br</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-slate-300 text-sm">(51) 9 9999-9999</p>
          </div>
        </div>
      </section>
    </div>
  )
}
