"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../../lib/supabase";
import { 
  Play, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  User, 
  Loader2, 
  ChevronRight,
  Lock,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function CursoPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [curso, setCurso] = useState<any>(null);
  const [aulas, setAulas] = useState<any[]>([]);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function loadData() {
    if (!params.id) return;
    setLoading(true);

    try {
      // 1. Busca os dados do Curso
      const { data: cursoData } = await supabase
        .from("cursos")
        .select("*")
        .eq("id", params.id)
        .single();
      if (cursoData) setCurso(cursoData);

      // 2. Busca as Aulas deste Curso
      const { data: aulasData } = await supabase
        .from("aulas")
        .select("*")
        .eq("curso_id", params.id)
        .order("ordem", { ascending: true });
      if (aulasData) setAulas(aulasData);

      // 3. Busca as Discussões do Curso
      const { data: discussoes } = await supabase
        .from("discussoes_aulas")
        .select(`*, profiles(full_name)`)
        .eq("curso_id", params.id)
        .order("created_at", { ascending: false });
      if (discussoes) setComentarios(discussoes);

    } catch (error) {
      console.error("Erro ao carregar dados do curso:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function handleEnviarDuvida() {
    if (!novoComentario.trim()) return;
    setEnviando(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("discussoes_aulas").insert([{
        comentario: novoComentario,
        curso_id: params.id,
        user_id: user?.id
      }]);

      if (error) throw error;
      setNovoComentario("");
      loadData();
      alert("Dúvida enviada ao Sensei!");
    } catch (error: any) {
      alert("Erro ao enviar: " + error.message);
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-red-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20">
      
      {/* BANNER DO CURSO */}
      <div className="relative h-[40vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent z-10" />
        {curso?.capa_url ? (
          <img src={curso.capa_url} className="w-full h-full object-cover opacity-40" alt={curso.titulo} />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
        
        <div className="absolute bottom-0 left-0 p-8 lg:p-16 z-20 max-w-4xl">
          <div className="flex items-center gap-2 mb-4">
             <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest italic">Curso Oficial</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none mb-4">
            {curso?.titulo}
          </h1>
          <p className="text-zinc-400 text-sm lg:text-base italic max-w-2xl">{curso?.descricao}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-12 gap-16 mt-12">
        
        {/* COLUNA ESQUERDA: LISTA DE AULAS */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="text-red-600" size={24} />
            <h2 className="text-2xl font-black italic uppercase">Grade de <span className="text-red-600">Aulas</span></h2>
          </div>

          <div className="space-y-4">
            {aulas.map((aula, index) => (
              <Link 
                key={aula.id} 
                href={`/cursos/${params.id}/${aula.id}/aula`}
                className="group flex items-center justify-between bg-zinc-900/40 border border-zinc-800 p-6 rounded-[24px] hover:border-red-600/50 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-6">
                  <span className="text-2xl font-black italic text-zinc-800 group-hover:text-red-600/20 transition-colors">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-bold text-zinc-100 group-hover:text-white transition-colors uppercase italic tracking-tight">{aula.titulo}</h3>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{aula.duracao || 'Aula Técnica'}</p>
                  </div>
                </div>
                <div className="bg-zinc-800 p-3 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-all">
                  <Play size={16} fill="currentColor" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA: SUPORTE E COMUNIDADE */}
        <div className="lg:col-span-5">
          <section className="bg-zinc-900/20 border border-zinc-800 p-8 rounded-[40px] sticky top-8">
            <div className="flex items-center gap-3 mb-8">
              <MessageSquare className="text-red-600" size={20} />
              <h2 className="text-xl font-black italic uppercase">Suporte <span className="text-red-600">Direto</span></h2>
            </div>

            {/* BOX DE ENVIO */}
            <div className="bg-black/40 border border-zinc-800 p-5 rounded-[24px] mb-8">
              <textarea 
                placeholder="Dúvida sobre o curso?"
                className="w-full bg-transparent border-none text-sm text-zinc-300 focus:ring-0 outline-none h-24 resize-none mb-4 italic"
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
              />
              <button 
                onClick={handleEnviarDuvida}
                disabled={enviando || !novoComentario.trim()}
                className="w-full bg-red-600 hover:bg-white text-white hover:text-black py-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-30 shadow-lg"
              >
                {enviando ? "Enviando..." : <><Send size={14} /> Postar Pergunta</>}
              </button>
            </div>

            {/* FEED DE COMENTÁRIOS */}
            <div className="space-y-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {comentarios.map((c) => (
                <div key={c.id} className="border-b border-zinc-800/50 pb-6 last:border-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-red-600 font-black italic text-[10px] border border-zinc-700">
                      {c.profiles?.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-white tracking-widest leading-none">{c.profiles?.full_name}</p>
                      <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 italic mb-4 leading-relaxed">"{c.comentario}"</p>
                  
                  {/* RESPOSTA DO SENSEI */}
                  {c.resposta_admin && (
                    <div className="bg-red-600/5 border-l-2 border-red-600 p-4 rounded-r-xl">
                      <div className="flex items-center gap-2 mb-1 text-red-600">
                        <CheckCircle2 size={10} />
                        <span className="text-[8px] font-black uppercase italic tracking-widest">Sensei respondeu</span>
                      </div>
                      <p className="text-xs text-zinc-200 italic">"{c.resposta_admin}"</p>
                    </div>
                  )}
                </div>
              ))}
              
              {comentarios.length === 0 && (
                <p className="text-center text-[10px] font-black uppercase text-zinc-700 py-10 tracking-[0.3em]">Tatame vazio por enquanto.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}