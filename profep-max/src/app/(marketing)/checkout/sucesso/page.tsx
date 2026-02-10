"use client";

import Link from "next/link";
import { CheckCircle, Play, Mail, ShieldCheck } from "lucide-react";

export default function SucessoPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-8">
        
        {/* ÍCONE DE SUCESSO */}
        <div className="flex justify-center">
          <div className="bg-red-600/20 p-6 rounded-full animate-pulse border border-red-600/30">
            <CheckCircle size={80} className="text-red-600" />
          </div>
        </div>

        {/* MENSAGEM PRINCIPAL */}
        <div className="space-y-4">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
            Pagamento <br />
            <span className="text-red-600">Confirmado!</span>
          </h1>
          <p className="text-zinc-400 font-medium text-sm">
            Obrigado por confiar no PROFEPMAX. Sua jornada para a elite do Judô começa agora.
          </p>
        </div>

        {/* BOX DE INSTRUÇÕES */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] p-8 text-left space-y-6">
          <div className="flex items-start gap-4">
            <div className="bg-red-600/10 p-2.5 rounded-xl text-red-600">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Acesso via E-mail</p>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Enviamos os detalhes da sua conta e nota fiscal para o seu e-mail cadastrado.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 border-t border-zinc-800/50 pt-6">
            <div className="bg-red-600/10 p-2.5 rounded-xl text-red-600">
              <Play size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Liberação Imediata</p>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Pagamentos via Pix liberam o conteúdo instantaneamente no seu painel.
              </p>
            </div>
          </div>
        </div>

        {/* BOTÃO DE AÇÃO */}
        <div className="flex flex-col gap-4">
          <Link 
            href="/dashboard" 
            className="bg-white text-black py-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-600/10"
          >
            Acessar Área do Aluno <Play size={16} fill="currentColor" />
          </Link>
          
          <Link 
            href="/" 
            className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em] hover:text-red-600 transition-all pt-4"
          >
            Voltar para o Início
          </Link>
        </div>

        {/* SELO DE SEGURANÇA */}
        <div className="flex items-center justify-center gap-2 text-zinc-900 pt-4">
          <ShieldCheck size={14} />
          <p className="text-[8px] font-black uppercase tracking-widest italic">Transação Segura • ProfepMax 2026</p>
        </div>
      </div>
    </div>
  );
}