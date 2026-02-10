"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  Trophy, Play, Zap, CheckCircle2, Star, Rocket, Target, Medal, 
  ArrowRight, Loader2, Crown, ChevronRight, Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<any>(null);
  const [stats, setStats] = useState({ aulas: 0, cursos: 0, certificados: 0 });
  const [rankingRapido, setRankingRapido] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/login");
          return;
        }

        // Buscas paralelas para máxima performance
        const [pRes, progRes, cursoRes, certRes, allProfiles, allProg] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("progresso_aulas").select("id").eq("user_id", user.id),
          supabase.from("cursos").select("id"),
          supabase.from("avaliacoes_concluidas").select("id").eq("user_id", user.id).eq("aprovado", true),
          supabase.from("profiles").select("id, full_name, pontos").order("pontos", { ascending: false }).limit(5),
          supabase.from("progresso_aulas").select("user_id")
        ]);

        setPerfil(pRes.data);
        setStats({
          aulas: progRes.data?.length || 0,
          cursos: cursoRes.data?.length || 0,
          certificados: certRes.data?.length || 0
        });

        setRankingRapido(allProfiles.data || []);

      } catch (error) {
        console.error("Erro ao carregar Dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
      <p className="text-zinc-500 font-black uppercase text-[10px] tracking-widest italic text-center">
        Sincronizando Dojo Digital... <br/> <span className="opacity-50 font-medium">Carregando méritos e honrarias</span>
      </p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 lg:p-12 pt-32 pb-24">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* HEADER DE BOAS VINDAS */}
        <section className="flex flex-col md:flex-row justify-between items-end gap-8 border-b border-white/5 pb-12">
          <div>
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <Star size={18} fill="currentColor" />
              <span className="font-black uppercase tracking-[0.4em] text-[10px]">Painel do Professor</span>
            </div>
            <h1 className="text-6xl lg:text-8xl font-black italic uppercase tracking-tighter leading-[0.8]">
              OLÁ, <br />
              <span className="text-zinc-800">{perfil?.full_name?.split(' ')[0] || "SENSEI"}</span>
            </h1>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-[40px] flex items-center gap-8 backdrop-blur-md hover:border-red-600/50 transition-colors group">
            <div className="text-right">
              <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1 italic">Pontuação XP</p>
              <p className="text-4xl font-black italic text-red-600 group-hover:scale-110 transition-transform inline-block">
                {perfil?.pontos || 0}
              </p>
            </div>
            <div className="w-16 h-16 bg-red-600 rounded-[20px] flex items-center justify-center shadow-lg shadow-red-600/20">
              <Zap className="text-white" size={32} fill="currentColor" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LADO ESQUERDO: PROGRESSO E AÇÃO */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* ESTATÍSTICAS RÁPIDAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-[32px] flex flex-col justify-between h-40">
                <Target size={20} className="text-zinc-500" />
                <div>
                  <p className="text-3xl font-black italic">{stats.aulas}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Aulas Concluídas</p>
                </div>
              </div>
              <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-[32px] flex flex-col justify-between h-40">
                <Trophy size={20} className="text-zinc-500" />
                <div>
                  <p className="text-3xl font-black italic">{stats.cursos}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Cursos Ativos</p>
                </div>
              </div>
              <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-[32px] flex flex-col justify-between h-40">
                <Medal size={20} className="text-amber-500" />
                <div>
                  <p className="text-3xl font-black italic text-amber-500">{stats.certificados}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Certificados</p>
                </div>
              </div>
            </div>

            {/* CTA PRINCIPAL */}
            <div className="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-900 rounded-[45px] p-10 group">
              <div className="relative z-10">
                <h2 className="text-4xl lg:text-5xl font-black italic uppercase tracking-tighter leading-tight text-white mb-6">
                  RETOMAR <br /> TREINAMENTO
                </h2>
                <Link 
                  href="/cursos" 
                  className="inline-flex items-center gap-4 bg-white text-black px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-100 transition-all shadow-xl"
                >
                  <Play size={14} fill="currentColor" /> Ir para Seus Cursos
                </Link>
              </div>
              <Rocket size={200} className="absolute -right-10 -bottom-10 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
            </div>
          </div>

          {/* LADO DIREITO: RANKING RÁPIDO */}
          <div className="lg:col-span-4 bg-zinc-900/20 border border-white/5 rounded-[45px] p-8 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-red-600" />
                <h3 className="text-xs font-black uppercase tracking-widest italic">Hall da Fama</h3>
              </div>
              <Link href="/ranking" className="text-[9px] font-black uppercase text-zinc-500 hover:text-white transition-colors">Ver Todos</Link>
            </div>

            <div className="space-y-4 flex-1">
              {rankingRapido.map((aluno, index) => (
                <div key={aluno.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${aluno.id === perfil?.id ? 'bg-red-600/10 border-red-600/40' : 'bg-white/5 border-transparent'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black italic w-4 ${index === 0 ? 'text-yellow-500' : 'text-zinc-600'}`}>
                      {index === 0 ? <Crown size={14} /> : `#${index + 1}`}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-black border border-white/5">
                      {aluno.full_name?.charAt(0)}
                    </div>
                    <span className={`text-[10px] font-black uppercase truncate max-w-[100px] ${aluno.id === perfil?.id ? 'text-white' : 'text-zinc-400'}`}>
                      {aluno.full_name?.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-[10px] font-black italic text-red-600">{aluno.pontos} XP</span>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-white/5">
              <p className="text-[9px] font-black text-zinc-600 uppercase italic leading-relaxed">
                Sua posição atual depende da conclusão das aulas e aprovação nos exames.
              </p>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <footer className="pt-10 text-center opacity-20">
          <p className="text-[8px] font-black uppercase tracking-[0.8em] text-zinc-500 italic">
            PROFEP MAX • EXCELÊNCIA TÉCNICA NO JUDÔ
          </p>
        </footer>

      </div>
    </main>
  );
}