"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// MUDANÇA AQUI: Usando o cliente padrão do seu projeto para evitar erro de Build
import { supabase } from "../../../lib/supabase"; 
import { 
  Loader2, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  Search
} from 'lucide-react';
import Link from 'next/link';

export default function FederationLandingPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [federation, setFederation] = useState<any>(null);

  useEffect(() => {
    async function loadEntity() {
      try {
        // Busca a federação pelo SLUG (ex: 'lrsj')
        const { data, error } = await supabase
          .from('entities')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error || !data) {
          console.error("Federação não encontrada ou erro:", error);
        } else {
          setFederation(data);
          // Define a cor primária dinâmica se existir
          if (data.settings?.primary_color) {
            document.documentElement.style.setProperty('--fed-primary', data.settings.primary_color);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) loadEntity();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="animate-spin text-red-600" size={32} />
        <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Carregando Portal...</span>
      </div>
    );
  }

  if (!federation) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-6">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-500">
            <Search size={32}/>
        </div>
        <div className="text-center">
            <h1 className="text-xl font-bold">Entidade não encontrada</h1>
            <p className="text-zinc-500 text-sm mt-2">Verifique o endereço: /federation/{slug}</p>
        </div>
        <Link href="/" className="px-6 py-3 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200">
            Voltar ao Início
        </Link>
      </div>
    );
  }

  const primaryColor = federation.settings?.primary_color || '#DC2626';

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[var(--fed-primary)]/10 to-transparent pointer-events-none"></div>
      
      {/* Header Simples */}
      <header className="p-8 flex justify-center relative z-10">
         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Portal Oficial</span>
      </header>

      {/* Conteúdo Central */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 w-full max-w-5xl mx-auto">
        
        {/* Logo e Título */}
        <div className="text-center mb-16 animate-in zoom-in-50 duration-700">
            {federation.settings?.logo_url ? (
                <img src={federation.settings.logo_url} alt={federation.name} className="h-24 md:h-32 w-auto mx-auto mb-8 drop-shadow-2xl" />
            ) : (
                <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 text-4xl font-black" style={{ color: primaryColor }}>
                    {federation.name.charAt(0)}
                </div>
            )}
            
            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">
                {federation.name}
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto">
                Bem-vindo ao ambiente oficial de gestão e graduação.
            </p>
        </div>

        {/* Cards de Seleção */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl animate-in slide-in-from-bottom-8 duration-700 delay-150">
            
            {/* Card Candidato */}
            <Link 
                href={`/federation/${slug}/candidato`}
                className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-[var(--fed-primary)] p-8 rounded-[32px] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-[var(--fed-primary)] group-hover:text-black transition-colors text-zinc-400">
                    <User size={32} />
                </div>
                <h2 className="text-xl font-black uppercase italic mb-2 group-hover:text-[var(--fed-primary)] transition-colors">Sou Candidato</h2>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                    Acessar <ArrowRight size={14}/>
                </div>
            </Link>

            {/* Card Admin */}
            <Link 
                href={`/federation/${slug}/admin/login`}
                className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-white/30 p-8 rounded-[32px] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-black transition-colors text-zinc-400">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-xl font-black uppercase italic mb-2 group-hover:text-white transition-colors">Sou Gestor</h2>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                    Acessar <ArrowRight size={14}/>
                </div>
            </Link>

        </div>
      </main>
    </div>
  );
}