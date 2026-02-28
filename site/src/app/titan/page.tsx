"use client";
import { LayoutGrid } from "lucide-react";

export default function TitanLanding() {
  return (
    <main className="min-h-screen bg-black text-slate-200 px-4 py-8 flex flex-col items-center justify-center">
      <section className="w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur rounded-[32px] p-8 shadow-xl flex flex-col gap-6">
        <div className="flex items-center gap-3 mb-2">
          <LayoutGrid className="w-8 h-8 text-accent" />
          <h1 className="text-4xl md:text-5xl font-extrabold italic text-accent font-sans tracking-tight">TITAN</h1>
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold italic text-slate-100 mb-2">Gestão de Federações e Academias</h2>
        <p className="text-slate-300 text-lg">Inscrições, calendário, documentos e resultados em um painel único para federações e academias de judô.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className="font-extrabold italic text-accent text-lg mb-2">Recursos</h3>
            <ul className="list-disc list-inside text-slate-200 space-y-1">
              <li>Inscrições e gestão de atletas</li>
              <li>Calendário de eventos</li>
              <li>Documentos e resultados</li>
              <li>Painel único para operação</li>
            </ul>
          </div>
          <div>
            <h3 className="font-extrabold italic text-accent text-lg mb-2">Governança e Operação</h3>
            <ol className="list-decimal list-inside text-slate-200 space-y-1">
              <li>Auditoria, histórico e exportação em um clique</li>
              <li>Operação em modo elite</li>
              <li>Menos tempo de setup, mais tempo para performance</li>
            </ol>
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <button className="btn btn-primary rounded-2xl font-extrabold italic px-8 py-3 text-lg bg-accent text-white hover:scale-[1.02] transition-transform">Acessar TITAN</button>
        </div>
      </section>
    </main>
  );
}
