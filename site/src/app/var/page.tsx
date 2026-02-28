"use client";
import { Video } from "lucide-react";
import { ShieldCheck } from "lucide-react";

export default function VarLanding() {
  return (
    <main className="min-h-screen bg-black text-slate-200 px-4 py-8 flex flex-col items-center justify-center">
      <section className="w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur rounded-[32px] p-8 shadow-xl flex flex-col gap-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-8 h-8 text-accent animate-pop" />
          <h1 className="text-4xl md:text-5xl font-extrabold italic text-accent font-sans tracking-tight">VAR APP</h1>
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold italic text-slate-100 mb-2">Controle de Arbitragem Profissional</h2>
        <p className="text-slate-300 text-lg">Tecnologia de revisão de vídeo para árbitros, clubes e federações. Transparência, precisão e performance em tempo real.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className="font-extrabold italic text-accent text-lg mb-2">Recursos</h3>
            <ul className="list-disc list-inside text-slate-200 space-y-1">
              <li>Replay instantâneo</li>
              <li>Marcações e anotações</li>
              <li>Gestão de lances e decisões</li>
              <li>Relatórios automáticos</li>
            </ul>
          </div>
          <div>
            <h3 className="font-extrabold italic text-accent text-lg mb-2">Performance</h3>
            <ol className="list-decimal list-inside text-slate-200 space-y-1">
              <li>Baixa latência</li>
              <li>Interface otimizada para tablets</li>
              <li>Operação offline e online</li>
            </ol>
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <button className="btn btn-primary rounded-2xl font-extrabold italic px-8 py-3 text-lg bg-accent text-white hover:scale-[1.04] hover:shadow-lg transition-all duration-200">Acessar VAR APP</button>
        </div>
      </section>
    </main>
  );
}
