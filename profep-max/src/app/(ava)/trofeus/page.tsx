"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  Trophy, Award, Lock, CheckCircle2, 
  Loader2, Target, Medal, Download
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function SalaDeTrofeusPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conquistas, setConquistas] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);

  useEffect(() => {
    async function loadTrofeus() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [pRes, cRes, progRes, vRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).single(),
        supabase.from("cursos").select("*"),
        supabase.from("progresso_aulas").select("aula_id, curso_id").eq("user_id", session.user.id),
        supabase.from("curso_videos").select("id, curso_id")
      ]);

      const cursosProcessados = cRes.data?.map(curso => {
        const aulasDoCurso = vRes.data?.filter(v => v.curso_id === curso.id) || [];
        const totalAulas = aulasDoCurso.length;
        const concluidas = progRes.data?.filter(p => p.curso_id === curso.id).length || 0;
        
        const progresso = totalAulas > 0 ? Math.round((concluidas / totalAulas) * 100) : 0;
        const temCertificado = totalAulas > 0 && concluidas >= totalAulas;

        return {
          ...curso,
          progresso,
          temCertificado
        };
      }) || [];

      setConquistas(cursosProcessados);
      setPerfil(pRes.data);
      setLoading(false);
    }
    loadTrofeus();
  }, []);

  const handleDownloadCertificado = async (cursoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existente } = await supabase
        .from("resultados_exames")
        .select("id")
        .eq("user_id", user.id)
        .eq("curso_id", cursoId)
        .eq("aprovado", true)
        .maybeSingle();

      if (existente?.id) {
        return router.push(`/certificado/${existente.id}`);
      }

      const { data: criado, error } = await supabase
        .from("resultados_exames")
        .insert([{
          user_id: user.id,
          curso_id: cursoId,
          exame_id: null,
          nota: 100,
          aprovado: true
        }])
        .select("id")
        .single();

      if (error && error.code === '23505') {
        const { data: fallback } = await supabase
          .from("resultados_exames")
          .select("id")
          .eq("user_id", user.id)
          .eq("curso_id", cursoId)
          .eq("aprovado", true)
          .maybeSingle();
        if (fallback?.id) return router.push(`/certificado/${fallback.id}`);
      }

      if (criado?.id) return router.push(`/certificado/${criado.id}`);
    } catch (err) {
      console.error("Erro ao abrir certificado:", err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-600">
      <Loader2 className="animate-spin mb-4" size={40} />
      <span className="font-black uppercase tracking-[0.3em] text-[10px]">Limpando Medalhas...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 lg:p-12 font-sans pt-28">
      
      {/* HEADER PREMIUM */}
      <header className="max-w-7xl mx-auto mb-20 flex flex-col md:flex-row justify-between items-end gap-8">
        <div>
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <Trophy size={20} />
            <span className="font-black uppercase tracking-[0.4em] text-[10px]">Hall da Fama ProfepMax</span>
          </div>
          <h1 className="text-6xl lg:text-8xl font-black italic uppercase tracking-tighter leading-[0.8]">
            SALA DE <br /> <span className="text-red-600">TROFÉUS</span>
          </h1>
        </div>
        
        <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-[32px] flex items-center gap-6 backdrop-blur-sm">
          <div className="text-right">
            <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest mb-1">Mestre em Evolução</p>
            <p className="text-xl font-black italic uppercase tracking-tighter leading-none">{perfil?.full_name}</p>
          </div>
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20">
            <Medal className="text-white" size={28} />
          </div>
        </div>
      </header>

      {/* GRID DE CARDS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {conquistas.map((item) => (
          <div 
            key={item.id} 
            className={`group relative bg-zinc-950 border p-8 rounded-[45px] transition-all duration-700 overflow-hidden flex flex-col ${
              item.temCertificado 
              ? 'border-amber-500/40 shadow-[0_0_60px_rgba(245,158,11,0.1)] saturate-100' 
              : 'border-zinc-900 grayscale opacity-40 hover:opacity-60'
            }`}
          >
            {/* Background Icon */}
            <Award className={`absolute -right-8 -bottom-8 opacity-[0.03] rotate-12 transition-transform duration-1000 group-hover:scale-125 ${item.temCertificado ? 'text-amber-500' : 'text-white'}`} size={200} />

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-8">
                <div className={`p-4 rounded-2xl ${item.temCertificado ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' : 'bg-zinc-900 text-zinc-700'}`}>
                  {item.temCertificado ? <Award size={28} /> : <Lock size={28} />}
                </div>
                {item.temCertificado && (
                  <div className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-500/20">
                    Conquistado
                  </div>
                )}
              </div>

              <h3 className={`text-3xl font-black italic uppercase tracking-tighter leading-[0.9] mb-4 min-h-[2.7rem] ${item.temCertificado ? 'text-white' : 'text-zinc-600'}`}>
                {item.titulo}
              </h3>
              
              <div className="flex gap-3 mb-10">
                <span className="bg-zinc-900 text-[8px] font-black uppercase px-3 py-1.5 rounded-full text-zinc-500 tracking-widest flex items-center gap-1">
                  <Target size={10} /> {item.temCertificado ? '100%' : `${item.progresso}%`}
                </span>
                {item.temCertificado && <CheckCircle2 className="text-amber-500" size={16} />}
              </div>

              <div className="mt-auto">
                {item.temCertificado ? (
                  <button 
                    onClick={() => handleDownloadCertificado(item.id)}
                    className="w-full bg-amber-500 text-black py-5 rounded-[22px] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl active:scale-95"
                  >
                    <Download size={16} /> Baixar Certificado
                  </button>
                ) : (
                  <div className="w-full bg-zinc-900/50 text-zinc-700 py-5 rounded-[22px] font-black uppercase text-[11px] tracking-[0.2em] text-center border border-zinc-800 italic">
                    {item.progresso > 0 ? `Em andamento...` : 'Treinamento Bloqueado'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="max-w-7xl mx-auto mt-32 text-center opacity-20">
        <p className="text-[9px] font-black uppercase tracking-[0.8em] text-zinc-500">
          O mérito é a recompensa da disciplina constante.
        </p>
      </footer>
    </div>
  );
}