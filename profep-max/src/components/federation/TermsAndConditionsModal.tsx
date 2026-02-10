"use client";

import React, { useState } from "react";
import { X, Download, CheckCircle2, ExternalLink } from "lucide-react";

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onAccept: (studentName: string) => void;
  onDismiss?: () => void;
  federationName?: string;
  primaryColor?: string;
}

export default function TermsAndConditionsModal({
  isOpen,
  onAccept,
  onDismiss,
  federationName = "LRSJ",
  primaryColor = "#DC2626",
}: TermsAndConditionsModalProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [studentName, setStudentName] = useState("");

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom =
      Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 50;
    setScrolledToBottom(isAtBottom);
  };

  const handleAcceptClick = () => {
    if (scrolledToBottom && studentName.trim()) {
      onAccept(studentName);
      setStudentName("");
      setScrolledToBottom(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/10 px-8 py-6 bg-black/50 flex items-center justify-between shrink-0">
          <div className="flex-1">
            <h2 className="text-xl font-black uppercase italic text-white mb-1">
              Termos e Condições de Adesão
            </h2>
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: primaryColor }}
            >
              {federationName}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {/* Terms Content - Scrollable */}
        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
        >
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-slate-300">
              Ao marcar a caixa "Li e aceito os termos", você declara estar
              ciente e concordar com as seguintes condições do Programa de
              Formação e Especialização de Professores de Judô da Liga
              Riograndense de Judô:
            </p>

            {/* Objeto */}
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                ></span>
                Objeto
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pl-4">
                O programa visa a capacitação técnica para outorga de graduação
                à Faixa Preta ou Dans superiores, com duração entre 12 e 24
                meses.
              </p>
            </div>

            {/* Investimento Total */}
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                ></span>
                Investimento Total
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pl-4">
                O valor integral do curso é de R$ 2.200,00, configurando-se como
                dívida líquida e certa no ato da matrícula.
              </p>
            </div>

            {/* Regra de Graduação */}
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                ></span>
                Regra de Graduação
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pl-4">
                A participação no exame final e a entrega da respectiva
                graduação/certificado estão condicionadas à quitação integral do
                valor total do curso, independentemente da forma de parcelamento
                escolhida.
              </p>
            </div>

            {/* Formas de Pagamento */}
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                ></span>
                Formas de Pagamento
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pl-4">
                Disponível à vista ou parcelado em 05x, 10x ou 20x. O
                parcelamento é uma liberalidade da {federationName} para
                facilitar o pagamento e não desnatura o valor total devido.
              </p>
            </div>

            {/* Desistência e Rescisão */}
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                ></span>
                Desistência e Rescisão
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pl-4">
                A desistência deve ser manifestada de forma expressa e por
                escrito. Em caso de rescisão antecipada solicitada pelo aluno,
                será aplicada multa de 20% sobre o saldo devedor para cobertura
                de custos operacionais.
              </p>
            </div>

            {/* Inatividade */}
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                ></span>
                Inatividade
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pl-4">
                A inatividade no sistema (superior a 90 dias) não gera
                cancelamento automático das parcelas, permanecendo a obrigação
                de pagamento ativa até a formalização da desistência expressa.
              </p>
            </div>

            {/* Uso de Imagem */}
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                ></span>
                Uso de Imagem
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pl-4">
                Você autoriza a {federationName} a utilizar sua imagem e voz em
                materiais de divulgação institucional captados durante as
                atividades do programa.
              </p>
            </div>

            {/* Dados Pessoais */}
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                ></span>
                Dados Pessoais
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pl-4">
                O tratamento de seus dados seguirá as diretrizes da LGPD para
                fins de execução deste contrato e registros históricos
                esportivos junto à {federationName}.
              </p>
            </div>

            {/* Link para documento completo */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mt-6">
              <p className="text-xs text-slate-400 mb-3 font-semibold">
                Para ler o documento na íntegra:
              </p>
              <a
                href="/documents/contrato-profef-lrsj.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-105"
              >
                <Download size={14} />
                Contrato Completo (PDF)
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Acceptance Section */}
        <div className="border-t border-white/10 px-8 py-6 bg-black/50 shrink-0 space-y-4">
          {!scrolledToBottom && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/70">
              📖 Role até o final para ativar a confirmação.
            </p>
          )}

          {scrolledToBottom && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Sua Assinatura (Digite seu nome completo)
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Ex: Luiz Pavani"
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white font-bold text-sm focus:border-white/30 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleAcceptClick}
            disabled={!scrolledToBottom || !studentName.trim()}
            style={{
              backgroundColor:
                scrolledToBottom && studentName.trim()
                  ? primaryColor
                  : undefined,
            }}
            className="w-full py-3 px-4 rounded-lg font-black uppercase text-sm tracking-widest text-white transition-all disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105 hover:shadow-lg"
          >
            <CheckCircle2 size={18} />
            Concordo com esses Termos
          </button>
        </div>
      </div>
    </div>
  );
}
