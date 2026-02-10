"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { 
  Loader2, Lock, CheckCircle2, Award, 
  Video, FileText, Download, ChevronRight, MessageSquare, Send, Link as IconLink
} from "lucide-react";
import { sendFirstCourseAccessEmail } from "../../../actions/email-templates";

export default function PaginaDoCurso() {
  const { id } = useParams();
  const router = useRouter();
  
  // Estados de Dados
  const [aulaAtiva, setAulaAtiva] = useState<any>(null);
  const [cursoVideos, setCursoVideos] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [concluidas, setConcluidas] = useState<string[]>([]);
  const [perfilAtivo, setPerfilAtivo] = useState<any>(null);
  const [avaliacao, setAvaliacao] = useState<any>(null);
  const [tentativaAvaliacao, setTentativaAvaliacao] = useState<any>(null);
  
  // Estados do Fórum
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Estados de UI
  const [carregando, setCarregando] = useState(true);
  const [progressoPct, setProgressoPct] = useState(0);

  const getDadosIniciais = useCallback(async () => {
    try {
      setCarregando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const [pRes, vRes, mRes, progRes, avaRes, tentRes, cursoRes, membershipRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("curso_videos").select("*").eq("curso_id", id).order("ordem", { ascending: true }),
        supabase.from("curso_materiais").select("*").eq("curso_id", id).order("created_at", { ascending: true }),
        supabase.from("progresso_aulas").select("aula_id").eq("user_id", user.id).eq("curso_id", id),
        supabase.from("avaliacoes").select("*").eq("curso_id", id).maybeSingle(),
        supabase.from("resultados_exames").select("*").eq("user_id", user.id).eq("curso_id", id).eq("aprovado", true).maybeSingle(),
        supabase.from("cursos").select("titulo, federation_scope").eq("id", id).maybeSingle(),
        supabase
          .from("entity_memberships")
          .select("entity_id, entities:entity_id (slug)")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      setPerfilAtivo(pRes.data);
      setCursoVideos(vRes.data || []);
      setMateriais(mRes.data || []);
      setAvaliacao(avaRes.data);
      if (tentRes.data) setTentativaAvaliacao(tentRes.data);
      if (progRes.data) setConcluidas(progRes.data.map((p: any) => p.aula_id));
      
      if (vRes.data && vRes.data.length > 0) {
        setAulaAtiva(vRes.data[0]);
      }

      const scope = String(cursoRes.data?.federation_scope || 'ALL').trim().toUpperCase();
      const memberEntity = Array.isArray(membershipRes.data?.entities)
        ? membershipRes.data?.entities?.[0]
        : membershipRes.data?.entities;
      const userTag = memberEntity?.slug?.toUpperCase() || null;
      if (scope !== 'ALL' && scope !== userTag) {
        router.replace("/cursos");
        return;
      }

      // Enviar email de primeiro acesso ao curso se não houver progresso
      if (progRes.data && progRes.data.length === 0 && pRes.data && cursoRes.data) {
        try {
          await sendFirstCourseAccessEmail(
            pRes.data.email,
            pRes.data.full_name || pRes.data.nome_completo,
            cursoRes.data.titulo
          );
        } catch (emailError) {
          console.error("Erro ao enviar email de primeiro acesso:", emailError);
        }
      }

    } catch (error) {
      console.error("Erro ao carregar curso:", error);
    } finally {
      setCarregando(false);
    }
  }, [id, router]);

  const carregarComentarios = useCallback(async () => {
    if (!aulaAtiva) return;
    try {
      const { data, error } = await supabase
        .from("curso_comentarios")
        .select("*, profiles(full_name, avatar_url)")
        .eq("aula_id", aulaAtiva.id)
        .order("created_at", { ascending: false });
      
      if (!error) setComentarios(data || []);
    } catch (e) {
      console.error("Erro ao carregar comentários:", e);
    }
  }, [aulaAtiva]);

  useEffect(() => {
    if (id) getDadosIniciais();
  }, [id, getDadosIniciais]);

  useEffect(() => {
    carregarComentarios();
  }, [aulaAtiva, carregarComentarios]);

  useEffect(() => {
    if (cursoVideos.length === 0) return;
    const totalAulas = cursoVideos.length;
    const aulasFeitas = concluidas.length;
    const aprovado = tentativaAvaliacao?.aprovado === true;
    const totalItens = avaliacao ? totalAulas + 1 : totalAulas;
    const itensConcluidos = (avaliacao && aprovado) ? aulasFeitas + 1 : aulasFeitas;
    setProgressoPct((itensConcluidos / totalItens) * 100);
  }, [concluidas, cursoVideos, avaliacao, tentativaAvaliacao]);

  const handleMarcarConcluida = async () => {
    if (!aulaAtiva || !perfilAtivo || concluidas.includes(aulaAtiva.id)) return;
    const { error } = await supabase
      .from("progresso_aulas")
      .upsert({ user_id: perfilAtivo.id, aula_id: aulaAtiva.id, curso_id: id }, { onConflict: 'user_id, aula_id' });
    if (!error) setConcluidas(prev => [...prev, aulaAtiva.id]);
  };

  const enviarComentario = async () => {
    if (!novoComentario.trim() || !perfilAtivo || !aulaAtiva) return;
    setEnviandoComentario(true);
    try {
      const { error } = await supabase.from("curso_comentarios").insert([{
        aula_id: aulaAtiva.id,
        user_id: perfilAtivo.id,
        comentario: novoComentario,
        curso_id: id
      }]);
      if (!error) {
        setNovoComentario("");
        carregarComentarios();
      }
    } catch (err) {
      console.error("Erro no fórum:", err);
    } finally {
      setEnviandoComentario(false);
    }
  };

  const avaliacaoLiberada = () => cursoVideos.length > 0 && concluidas.length === cursoVideos.length;

  const abrirCertificadoSemAvaliacao = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: existente } = await supabase
        .from("resultados_exames")
        .select("id")
        .eq("user_id", user.id)
        .eq("curso_id", id)
        .eq("aprovado", true)
        .maybeSingle();

      if (existente?.id) {
        return router.push(`/certificado/${existente.id}`);
      }

      const { data: criado, error } = await supabase
        .from("resultados_exames")
        .insert([{ 
          user_id: user.id, 
          curso_id: id, 
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
          .eq("curso_id", id)
          .eq("aprovado", true)
          .maybeSingle();
        if (fallback?.id) return router.push(`/certificado/${fallback.id}`);
      }

      if (criado?.id) return router.push(`/certificado/${criado.id}`);
    } catch (err) {
      console.error("Erro ao liberar certificado:", err);
    }
  };

  if (carregando) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="text-red-600 animate-spin" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans pb-20 lg:pb-0">
      <div className="flex flex-col lg:grid lg:grid-cols-12 lg:h-[calc(100vh-80px)] lg:overflow-hidden">
        
        {/* COLUNA 1: PLAYER & DETALHES */}
        <div className="order-1 lg:col-span-8 lg:overflow-y-auto scrollbar-hide">
          
          {/* PLAYER DE VÍDEO (Sticky no mobile) */}
          <div className="aspect-video w-full bg-zinc-900 shadow-2xl relative sticky top-0 z-20 lg:static">
            {aulaAtiva?.url ? (
              <iframe src={aulaAtiva.url} className="w-full h-full border-none" allow="autoplay; fullscreen" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-800 font-black text-xs uppercase italic tracking-widest leading-none">
                <Lock size={48} className="mb-4" /> Selecione uma aula
              </div>
            )}
          </div>

          <div className="p-6 md:p-10">
            {/* CABEÇALHO */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/5 pb-8 mb-8">
              <div className="flex-1 w-full">
                <span className="text-red-600 font-black uppercase text-[10px] tracking-widest italic mb-2 block tracking-[0.2em]">Dojo Virtual ProfepMax</span>
                <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter leading-tight">{aulaAtiva?.titulo}</h2>
              </div>
              
              {aulaAtiva && (
                <button 
                  onClick={handleMarcarConcluida} 
                  disabled={concluidas.includes(aulaAtiva?.id)}
                  className={`w-full md:w-auto px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                    concluidas.includes(aulaAtiva?.id) 
                    ? "bg-green-600/10 text-green-500 border border-green-600/30 cursor-default" 
                    : "bg-red-600 text-white hover:bg-white hover:text-black shadow-lg shadow-red-600/20"
                  }`}
                >
                  {concluidas.includes(aulaAtiva?.id) ? "Concluída ✓" : "Marcar Concluída"}
                </button>
              )}
            </div>

            {/* === GAVETA MOBILE (AULAS + MATERIAIS + CERTIFICADO) === */}
            <div className="block lg:hidden mb-10">
                <details className="group bg-zinc-900/30 border border-white/10 rounded-2xl open:bg-zinc-900 transition-all">
                    <summary className="p-4 font-black text-xs uppercase tracking-widest flex items-center justify-between cursor-pointer list-none text-zinc-400 group-open:text-white">
                        <span>Conteúdo do Curso</span>
                        <ChevronRight className="group-open:rotate-90 transition-transform" size={16}/>
                    </summary>
                    <div className="p-4 pt-0 space-y-6 border-t border-white/5 mt-2">
                        
                        {/* 1. LISTA DE VÍDEOS */}
                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-2 flex items-center gap-2"><Video size={10}/> Aulas</p>
                            {cursoVideos.map((vid, idx) => (
                                <button key={vid.id} onClick={() => { setAulaAtiva(vid); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${aulaAtiva?.id === vid.id ? "bg-red-600 text-white" : "bg-zinc-950 text-zinc-500 border border-white/5"}`}
                                >
                                    <span className="text-[10px] font-black">{idx + 1}.</span>
                                    <span className="text-[10px] font-bold uppercase truncate flex-1">{vid.titulo}</span>
                                    {concluidas.includes(vid.id) && <CheckCircle2 size={12} />}
                                </button>
                            ))}
                        </div>

                        {/* 2. LISTA DE MATERIAIS (Se houver) */}
                        {materiais.length > 0 && (
                            <div className="space-y-2 pt-4 border-t border-white/5">
                                <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-2 flex items-center gap-2"><FileText size={10}/> Materiais</p>
                                {materiais.map((mat) => (
                                    <a key={mat.id} href={mat.url} target="_blank" rel="noopener noreferrer"
                                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-800 transition-all"
                                    >
                                        <Download size={14} className="text-red-600" />
                                        <span className="text-[10px] font-bold uppercase truncate flex-1 text-zinc-400">{mat.titulo}</span>
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* 3. AVALIAÇÃO E CERTIFICADO */}
                        {avaliacao ? (
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-2 flex items-center gap-2"><Award size={10}/> Conclusão</p>
                                
                                <button 
                                    disabled={!avaliacaoLiberada()}
                                    onClick={() => {
                                        if (tentativaAvaliacao?.aprovado) {
                                            router.push(`/certificado/${tentativaAvaliacao.id}`);
                                        } else {
                                            router.push(`/avaliacoes/${avaliacao.id}`);
                                        }
                                    }}
                                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                                        avaliacaoLiberada() 
                                        ? "bg-amber-500 border-amber-400 text-black shadow-lg" 
                                        : "bg-zinc-950 border-white/5 opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                    {tentativaAvaliacao?.aprovado ? <Award size={16} /> : <ChevronRight size={16} />}
                                    <div className="flex-1 text-left">
                                        <p className="text-[10px] font-black uppercase italic">
                                            {tentativaAvaliacao?.aprovado ? "Baixar Certificado" : "Fazer Avaliação"}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        ) : (
                          <div className="space-y-3 pt-4 border-t border-white/5">
                            <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-2 flex items-center gap-2"><Award size={10}/> Conclusão</p>
                            <button 
                              disabled={!avaliacaoLiberada()}
                              onClick={abrirCertificadoSemAvaliacao}
                              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                                avaliacaoLiberada() 
                                ? "bg-amber-500 border-amber-400 text-black shadow-lg" 
                                : "bg-zinc-950 border-white/5 opacity-50 cursor-not-allowed"
                              }`}
                            >
                              <Award size={16} />
                              <div className="flex-1 text-left">
                                <p className="text-[10px] font-black uppercase italic">
                                  Baixar Certificado
                                </p>
                              </div>
                            </button>
                          </div>
                        )}

                    </div>
                </details>
            </div>

            {/* FÓRUM */}
            <section className="max-w-4xl">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="text-red-600" size={20} />
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Fórum de Dúvidas</h3>
              </div>
              <div className="bg-zinc-900/30 border border-white/5 p-4 md:p-6 rounded-[32px] mb-10">
                <textarea 
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                  placeholder="Deixe sua dúvida técnica..."
                  className="w-full bg-transparent border-none focus:ring-0 text-sm text-zinc-300 resize-none h-24 font-medium"
                />
                <div className="flex justify-end pt-4 border-t border-white/5">
                  <button onClick={enviarComentario} disabled={enviandoComentario || !novoComentario.trim()} className="bg-white text-black px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all">
                    {enviandoComentario ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Enviar
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {comentarios.map((c) => (
                  <div key={c.id} className="flex gap-4 p-4 md:p-6 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center font-black text-xs text-red-600 italic">
                      {c.profiles?.full_name?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-[10px] font-black uppercase italic text-zinc-200">{c.profiles?.full_name}</p>
                        <span className="text-[8px] font-bold text-zinc-600 uppercase">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs md:text-sm text-zinc-400 font-medium">{c.comentario}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* COLUNA 2: SIDEBAR (DESKTOP ONLY) */}
        <aside className="order-2 hidden lg:flex lg:col-span-4 bg-[#080808] border-l border-white/5 p-6 flex-col gap-8 overflow-hidden lg:h-full">
          
          {/* Barra de Progresso */}
          <div className="bg-zinc-900/40 border border-white/10 p-6 rounded-[32px] space-y-4 shrink-0">
             <div className="flex justify-between items-end">
                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest italic">Sua Evolução</p>
                <p className="text-sm font-black text-red-600 italic">{Math.round(progressoPct)}%</p>
             </div>
             <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${progressoPct}%` }} />
             </div>
            {tentativaAvaliacao?.aprovado && (
              <button 
                onClick={() => router.push(`/certificado/${tentativaAvaliacao.id}`)}
                className="w-full bg-amber-500 text-black py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-all shadow-xl"
              >
                  <Award size={16} /> Baixar Certificado
              </button>
            )}
            {!avaliacao && !tentativaAvaliacao?.aprovado && (
              <button 
                disabled={!avaliacaoLiberada()}
                onClick={abrirCertificadoSemAvaliacao}
                className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl ${
                  avaliacaoLiberada()
                    ? "bg-amber-500 text-black hover:bg-white"
                    : "bg-zinc-950 border border-white/5 text-zinc-600 opacity-40 cursor-not-allowed"
                }`}
              >
                <Award size={16} /> Baixar Certificado
              </button>
            )}
          </div>

          {/* LISTA DE CONTEÚDO (SCROLL) */}
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-8 pr-2">
            
            {/* VÍDEOS */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em] italic px-2 flex items-center gap-2">
                <Video size={12}/> Videoaulas
              </h3>
              {cursoVideos.map((vid, idx) => (
                <button key={vid.id} onClick={() => setAulaAtiva(vid)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border ${aulaAtiva?.id === vid.id ? "bg-red-600 border-red-500 shadow-xl" : "bg-zinc-950 border-white/5 hover:border-zinc-700"}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black italic ${aulaAtiva?.id === vid.id ? "bg-white text-red-600" : "bg-zinc-900 text-zinc-600"}`}>{idx + 1}</div>
                  <p className={`flex-1 text-left text-[10px] font-black uppercase truncate italic ${aulaAtiva?.id === vid.id ? "text-white" : "text-zinc-400"}`}>{vid.titulo}</p>
                  {concluidas.includes(vid.id) && <CheckCircle2 size={16} className={aulaAtiva?.id === vid.id ? "text-white" : "text-green-500"} />}
                </button>
              ))}
            </div>

            {/* MATERIAIS */}
            {materiais.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em] italic px-2 flex items-center gap-2">
                        <FileText size={12}/> Materiais
                    </h3>
                    {materiais.map((mat) => (
                        <a key={mat.id} href={mat.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 hover:border-red-600/30 transition-all group">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors"><Download size={14} /></div>
                            <p className="flex-1 text-left text-[10px] font-black uppercase truncate italic text-zinc-400 group-hover:text-white transition-colors">{mat.titulo}</p>
                            <IconLink size={12} className="text-zinc-600" />
                        </a>
                    ))}
                </div>
            )}

            {/* AVALIAÇÃO DESKTOP */}
            {avaliacao ? (
              <div className="pt-8 border-t border-white/5 space-y-4 text-center pb-10">
                <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em] italic px-2 text-left flex items-center gap-2">
                    <Award size={12}/> Conclusão
                </h3>
                
                <button 
                  disabled={!avaliacaoLiberada()}
                  onClick={() => {
                    if (tentativaAvaliacao?.aprovado) {
                      router.push(`/certificado/${tentativaAvaliacao.id}`);
                    } else {
                      router.push(`/avaliacoes/${avaliacao.id}`);
                    }
                  }}
                  className={`w-full flex items-center gap-4 p-6 rounded-[32px] border transition-all ${
                    avaliacaoLiberada() 
                      ? "bg-amber-500 border-amber-400 text-black shadow-xl hover:scale-[1.02]" 
                      : "bg-zinc-950 border-white/5 opacity-40 cursor-not-allowed"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center">
                    {tentativaAvaliacao?.aprovado ? <Award size={20} /> : <ChevronRight size={20} />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] font-black uppercase italic">
                      {tentativaAvaliacao?.aprovado ? "Certificado Liberado" : "Iniciar Avaliação"}
                    </p>
                    <p className="text-[9px] text-black/60 font-bold uppercase tracking-widest mt-1">
                        {avaliacaoLiberada() ? "Clique para iniciar" : "Conclua as aulas antes"}
                    </p>
                  </div>
                </button>

                {tentativaAvaliacao?.aprovado && (
                  <button onClick={() => router.push(`/avaliacoes/${avaliacao.id}?refazer=true`)}
                    className="mt-2 py-2 text-[9px] font-black uppercase italic text-zinc-600 hover:text-red-500 transition-colors tracking-[0.2em]"
                  >Refazer avaliação para treinar →</button>
                )}
              </div>
            ) : (
              <div className="pt-8 border-t border-white/5 space-y-4 text-center pb-10">
                <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em] italic px-2 text-left flex items-center gap-2">
                    <Award size={12}/> Conclusão
                </h3>
                <button 
                  disabled={!avaliacaoLiberada()}
                  onClick={abrirCertificadoSemAvaliacao}
                  className={`w-full flex items-center gap-4 p-6 rounded-[32px] border transition-all ${
                    avaliacaoLiberada() 
                      ? "bg-amber-500 border-amber-400 text-black shadow-xl hover:scale-[1.02]" 
                      : "bg-zinc-950 border-white/5 opacity-40 cursor-not-allowed"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center">
                    <Award size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] font-black uppercase italic">
                      Baixar Certificado
                    </p>
                    <p className="text-[9px] text-black/60 font-bold uppercase tracking-widest mt-1">
                        {avaliacaoLiberada() ? "Clique para baixar" : "Conclua as aulas antes"}
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}