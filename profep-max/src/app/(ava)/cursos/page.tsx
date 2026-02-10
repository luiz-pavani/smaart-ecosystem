"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, PlayCircle, BookOpen, Clock, ChevronRight, Lock, Award, Search, LayoutGrid } from "lucide-react";

export default function ListaDeCursosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const freeOnly = searchParams?.get("free") === "1" || searchParams?.get("free") === "true";
  
  // Estados
  const [cursosPorCategoria, setCursosPorCategoria] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<any>(null);

  useEffect(() => {
    async function fetchCursos() {
      try {
        setLoading(true);

        // 1. Verifica usuário
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        // 2. Busca perfil e cursos (trazendo TUDO)
        const [perfilRes, cursosRes, membershipRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("cursos").select("*").order("titulo", { ascending: true }),
          supabase
            .from("entity_memberships")
            .select("entity_id, entities:entity_id (slug)")
            .eq("profile_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        if (perfilRes.error) throw perfilRes.error;
        
        const listaCursos = cursosRes.data || [];
        const memberEntity = Array.isArray(membershipRes.data?.entities)
          ? membershipRes.data?.entities?.[0]
          : membershipRes.data?.entities;
        const tag = memberEntity?.slug?.toUpperCase() || null;

        const cursosFiltrados = listaCursos.filter((curso: any) => {
          const scope = String(curso.federation_scope || 'ALL').trim().toUpperCase();
          if (scope === 'ALL') return true;
          if (!tag) return false;
          return scope === tag;
        });

        const cursosVisiveis = freeOnly
          ? cursosFiltrados.filter((curso: any) => Boolean(curso.gratuito))
          : cursosFiltrados;
        setPerfil(perfilRes.data);

        // 3. Agrupa os cursos por Categoria
        const agrupado = cursosVisiveis.reduce((acc: any, curso: any) => {
          const cat = curso.categoria || "Outros"; // Se não tiver categoria, vai para Outros
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(curso);
          return acc;
        }, {});

        setCursosPorCategoria(agrupado);

      } catch (error) {
        console.error("Erro ao carregar cursos:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCursos();
  }, [router, freeOnly]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="animate-spin text-red-600" size={40} />
        <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Carregando Dojo...</span>
      </div>
    );
  }

  // Ordem de exibição das categorias (opcional, para forçar uma ordem específica)
  const ordemCategorias = ["SENSEI", "KATA", "TREINADOR", "GESTÃO", "Outros"];
  // Pega as chaves que existem de fato no objeto agrupado
  const categoriasDisponiveis = Object.keys(cursosPorCategoria).sort(
    (a, b) => ordemCategorias.indexOf(a) - ordemCategorias.indexOf(b)
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20">
      
      {/* Header */}
      <header className="pt-20 pb-10 px-6 md:px-12 border-b border-white/5 bg-gradient-to-b from-red-900/10 to-transparent">
        <div className="max-w-7xl mx-auto">
          <span className="text-red-600 font-black uppercase text-[10px] tracking-[0.3em] mb-2 block">Área de Membros</span>
          <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">
            Meus Cursos
          </h1>
          <p className="text-zinc-400 max-w-2xl text-sm md:text-base">
            Bem-vindo ao acervo técnico, Sensei {perfil?.full_name?.split(' ')[0]}. 
            {freeOnly ? 'Acesso liberado apenas aos cursos FREE.' : 'Selecione um módulo para continuar seus estudos.'}
          </p>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12 space-y-16">
        
        {categoriasDisponiveis.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/5">
            <Search className="mx-auto text-zinc-600 mb-4" size={48} />
            <h3 className="text-xl font-black uppercase italic text-zinc-500">Nenhum curso encontrado</h3>
            <p className="text-zinc-600 text-sm mt-2">Aguarde as próximas liberações.</p>
          </div>
        ) : (
          categoriasDisponiveis.map((categoria) => (
            <section key={categoria}>
              
              {/* Título da Categoria */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center text-red-600 border border-red-600/20">
                  <LayoutGrid size={20} />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                  {categoria}
                </h2>
                <div className="h-[1px] flex-1 bg-white/10"></div>
              </div>

              {/* Grid de Cursos desta Categoria */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {cursosPorCategoria[categoria].map((curso) => {
                  const temAcesso = perfil?.status === 'active' || curso.gratuito;

                  return (
                    <div 
                      key={curso.id} 
                      onClick={() => temAcesso ? router.push(`/cursos/${curso.id}`) : alert("Matricule-se para acessar este conteúdo.")}
                      className={`group relative bg-zinc-900/50 border border-white/5 rounded-[32px] overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-2xl shadow-black/50 ${!temAcesso && "opacity-60 grayscale"}`}
                    >
                      {/* Capa (Corrigido para imagem_url) */}
                      <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                        {curso.imagem_url ? (
                          <img 
                            src={curso.imagem_url} 
                            alt={curso.titulo} 
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                            <BookOpen size={48} className="text-zinc-700" />
                          </div>
                        )}
                      </div>

                      {/* Badge de Status - Agora abaixo da imagem */}
                      <div className="px-8 pt-4 pb-2 flex flex-wrap gap-2">
                        {temAcesso ? (
                          <span className="bg-white text-black text-[9px] font-black uppercase px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg w-fit">
                            <PlayCircle size={10} className="fill-black" /> Liberado
                          </span>
                        ) : (
                          <span className="bg-zinc-950/90 text-zinc-500 border border-white/10 text-[9px] font-black uppercase px-3 py-1.5 rounded-full flex items-center gap-1 w-fit">
                            <Lock size={10} /> Bloqueado
                          </span>
                        )}
                        {curso.gratuito && (
                          <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase px-3 py-1.5 rounded-full flex items-center gap-1 w-fit">
                            Free
                          </span>
                        )}
                      </div>

                      {/* Conteúdo do Card */}
                      <div className="p-8 pt-4">
                        <h3 className="text-lg font-black uppercase italic leading-tight mb-3 group-hover:text-red-500 transition-colors line-clamp-2">
                          {curso.titulo}
                        </h3>
                        
                        {/* Instrutor (se houver na planilha) */}
                        {curso.instrutor && (
                            <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2">
                                Sensei: <span className="text-zinc-200">{curso.instrutor}</span>
                            </p>
                        )}

                        <p className="text-xs text-zinc-500 font-medium line-clamp-2 mb-6 min-h-[32px]">
                          {curso.descricao || "Conteúdo técnico exclusivo ProfepMax."}
                        </p>

                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                          <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-zinc-500">
                            <span className="flex items-center gap-1"><Clock size={12}/> {curso.duracao ? `${curso.duracao}h` : 'Aulas'}</span>
                            <span className="flex items-center gap-1"><Award size={12}/> Certificado</span>
                          </div>
                          
                          {/* Botão de Ação */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${temAcesso ? "bg-red-600 text-white group-hover:bg-white group-hover:text-black" : "bg-zinc-800 text-zinc-600"}`}>
                            {temAcesso ? <ChevronRight size={16} /> : <Lock size={14} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}