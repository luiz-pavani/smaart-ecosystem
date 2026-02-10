"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Trophy, Medal, Star, Flame, Loader2 } from "lucide-react";

export default function QuadroDeHonra() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      // Busca os 10 alunos com mais pontos
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, pontos, plan")
        .order("pontos", { ascending: false })
        .limit(10);
      
      if (!error) {
        setRanking(data || []);
      }
      setLoading(false);
    }
    fetchRanking();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20">
      <Loader2 className="animate-spin text-red-600 mb-4" size={32} />
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Sincronizando Ranking...</span>
    </div>
  );

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
      {/* Detalhe de luz de fundo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-[80px] -z-10" />

      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Star size={12} className="text-red-600 fill-red-600" />
            <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">
              Quadro de <span className="text-red-600">Honra</span>
            </h2>
          </div>
          <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">
            Os judocas mais ativos no tatame
          </p>
        </div>
        <Trophy className="text-red-600" size={32} />
      </div>

      <div className="space-y-4">
        {ranking.map((aluno, index) => {
          const isFirst = index === 0;
          const isTop3 = index < 3;

          return (
            <div 
              key={index} 
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                isFirst 
                  ? "bg-red-600/10 border-red-600/40 scale-[1.02] shadow-xl shadow-red-600/5" 
                  : "bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 hover:translate-x-1"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic text-sm ${
                    isFirst 
                    ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]" 
                    : isTop3 
                    ? "bg-zinc-800 text-white border border-zinc-700" 
                    : "bg-zinc-900 text-zinc-600"
                  }`}>
                    {index + 1}
                  </div>
                  {isFirst && (
                    <div className="absolute -top-2 -right-2 bg-black rounded-full p-1 border border-red-600/50">
                      <Flame size={12} className="text-red-600 animate-pulse" />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col">
                  <p className={`text-[11px] font-black uppercase italic tracking-tight leading-none ${
                    isFirst ? "text-white" : "text-zinc-300"
                  }`}>
                    {aluno.full_name || "Aluno Anônimo"}
                  </p>
                  <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest mt-1">
                    Patente: {aluno.plan || "Filiado"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-black italic leading-none ${
                    isFirst ? "text-red-600" : "text-white"
                  }`}>
                    {aluno.pontos || 0}
                  </span>
                </div>
                <span className="text-[7px] font-black text-zinc-700 uppercase tracking-tighter">Pontos</span>
              </div>
            </div>
          );
        })}

        {ranking.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-zinc-900 rounded-3xl">
            <p className="text-[10px] font-black uppercase text-zinc-700 italic tracking-widest">
              Aguardando os primeiros combates...
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-zinc-900/50 flex items-center justify-center gap-2">
        <div className="w-1 h-1 bg-red-600 rounded-full animate-ping" />
        <p className="text-[9px] font-black text-zinc-600 uppercase italic tracking-[0.2em]">
          Contribua no fórum para subir no ranking
        </p>
      </div>
    </div>
  );
}