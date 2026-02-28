"use client";
import { LineChart } from "lucide-react";
import { Medal } from "lucide-react";

export default function J1Landing() {
  return (
    <main className="min-h-screen bg-black text-slate-200 px-4 py-8 flex flex-col items-center justify-center">
      <section className="w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur rounded-[32px] p-8 shadow-xl flex flex-col gap-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <Medal className="w-8 h-8 text-accent animate-pop" />
          <h1 className="text-4xl md:text-5xl font-extrabold italic text-accent font-sans tracking-tight">J1</h1>
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold italic text-slate-100 mb-2">Gestão de Atletas e Competições</h2>
        <p className="text-slate-300 text-lg">Plataforma para atletas, técnicos e clubes acompanharem inscrições, resultados e rankings em tempo real.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className="font-extrabold italic text-accent text-lg mb-2">Recursos</h3>
            <ul className="list-disc list-inside text-slate-200 space-y-1">
              <li>Inscrição online</li>
              <li>Resultados em tempo real</li>
              <li>Ranking automático</li>
              <li>Gestão de clubes e atletas</li>
            </ul>
          </div>
          <div>
            <h3 className="font-extrabold italic text-accent text-lg mb-2">Performance</h3>
            <ol className="list-decimal list-inside text-slate-200 space-y-1">
              <li>Interface mobile-first</li>
              <li>Alta disponibilidade</li>
              <li>Operação rápida e intuitiva</li>
            </ol>
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <button className="btn btn-primary rounded-2xl font-extrabold italic px-8 py-3 text-lg bg-accent text-white hover:scale-[1.04] hover:shadow-lg transition-all duration-200">Acessar J1</button>
        </div>
      </section>
    </main>
  );
}
