"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Trophy, Medal, Crown, ArrowLeft, Loader2, Star, Target, Zap } from "lucide-react";
import Link from "next/link";

export default function RankingPage() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRanking() {
      // 1. Busca os dados (Limitamos aos top 50 para performance)
      const { data: perfis } = await supabase.from("profiles").select("id, full_name, avatar_url");
      const { data: progresso } = await supabase.from("progresso_aulas").select("user_id");

      if (perfis && progresso) {
        const listaRankeada = perfis.map(perfil => {
          const aulasConcluidas = progresso.filter(p => p.user_id === perfil.id).length;
          
          // Lógica de XP: 100 por aula + bônus de consistência
          const xp = aulasConcluidas * 100;
          
          // Lógica de Graduação PROFEP (Baseada no Go-Kyo)
          let graduacao = { nome: "6º Kyu", cor: "text-white", bg: "bg-white/10" };
          if (xp >= 1000) graduacao = { nome: "5º Kyu", cor: "text-yellow-500", bg: "bg-yellow-500/10" };
          if (xp >= 3000) graduacao = { nome: "4º Kyu", cor: "text-red-500", bg: "bg-red-500/10" };
          if (xp >= 6000) graduacao = { nome: "3º Kyu", cor: "text-green-500", bg: "bg-green-500/10" };
          if (xp >= 10000) graduacao = { nome: "2º Kyu", cor: "text-blue-500", bg: "bg-blue-500/10" };
          if (xp >= 15000) graduacao = { nome: "1º Kyu", cor: "text-amber-900", bg: "bg-amber-900/10" };
          if (xp >= 25000) graduacao = { nome: "1º Dan - Shodan", cor: "text-red-600", bg: "bg-red-600/10" };

          return { ...perfil, xp, aulasConcluidas, graduacao };
        });

        setRanking(listaRankeada.sort((a, b) => b.xp - a.xp).slice(0, 50));
      }
      setLoading(false);
    }
    loadRanking();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Calculando Méritos...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 lg:p-20 selection:bg-red-600 font-sans">
      <div className="max-w-5xl mx-auto">
        
        <Link href="/cursos" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-16 transition-all group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-black uppercase text-[10px] tracking-[0.3em]">Voltar ao Treinamento</span>
        </Link>

        <header className="relative mb-24">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 opacity-20 blur-3xl w-64 h-64 bg-red-600 rounded-full z-0" />
          <div className="relative z-10 text-center">
            <Trophy size={48} className="mx-auto text-red-600 mb-6" />
            <h1 className="text-6xl lg:text-8xl font-black italic uppercase tracking-tighter leading-none mb-4">
              HALL DA <span className="text-red-600">FAMA</span>
            </h1>
            <p className="text-zinc-500 font-black uppercase tracking-[0.5em] text-[10px]">Elite Profep Max 2026</p>
          </div>
        </header>

        <div className="grid gap-4">
          {ranking.map((aluno, index) => {
            const isTop3 = index < 3;
            const isFirst = index === 0;

            return (
              <div 
                key={aluno.id} 
                className={`group relative flex items-center justify-between p-1 lg:p-2 rounded-[40px] border transition-all duration-500 ${
                  isFirst 
                  ? "bg-gradient-to-r from-red-600/20 to-zinc-900/40 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.15)]" 
                  : isTop3 
                  ? "bg-zinc-900/60 border-zinc-700" 
                  : "bg-zinc-950/40 border-white/5 hover:border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-6 p-4">
                  {/* Posição */}
                  <div className="w-12 text-center">
                    {isFirst ? (
                      <Crown className="text-yellow-500 mx-auto animate-bounce" size={28} />
                    ) : (
                      <span className={`text-2xl font-black italic ${isTop3 ? "text-white" : "text-zinc-800"}`}>
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center font-black text-2xl border-2 ${isFirst ? "border-red-600 bg-black" : "border-zinc-800 bg-zinc-900"}`}>
                      {aluno.full_name?.charAt(0)}
                    </div>
                    {isTop3 && (
                       <div className="absolute -right-2 -bottom-2 bg-red-600 p-1.5 rounded-lg shadow-xl">
                          <Zap size={12} className="text-white" fill="currentColor" />
                       </div>
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className={`font-black uppercase italic tracking-tighter text-xl lg:text-2xl leading-none mb-2 ${isFirst ? "text-white" : "text-zinc-300"}`}>
                      {aluno.full_name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${aluno.graduacao.bg} ${aluno.graduacao.cor}`}>
                        {aluno.graduacao.nome}
                      </span>
                      <span className="text-zinc-600 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Target size={10} /> {aluno.aulasConcluidas} Aulas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pontuação Final */}
                <div className="pr-12 text-right">
                  <p className={`text-3xl lg:text-5xl font-black italic tracking-tighter leading-none ${isFirst ? "text-red-600" : "text-white"}`}>
                    {aluno.xp.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 mt-1">XP Points</p>
                </div>

                {/* Detalhe Decorativo de Fundo */}
                {isFirst && (
                  <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-red-600/10 to-transparent pointer-events-none rounded-r-[40px]" />
                )}
              </div>
            );
          })}
        </div>

        <footer className="mt-32 text-center pb-20">
          <p className="text-[10px] font-black uppercase tracking-[1em] text-zinc-800">
            Jita Kyoei • Prosperidade Mútua
          </p>
        </footer>
      </div>
    </div>
  );
}