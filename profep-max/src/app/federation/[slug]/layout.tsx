"use client";

import React, { useState, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
// Ícones removidos pois não serão mais usados no layout visual
// Link removido pois a navegação agora é interna da página

export default function FederationLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // 1. Carregar Identidade da Federação pelo Slug
        const { data: fed } = await supabase.from('entities').select('*').eq('slug', slug).single();
        
        // Injeta a cor primária globalmente para ser usada pelas páginas internas
        if (fed) {
          document.documentElement.style.setProperty('--fed-primary', fed.settings.primary_color);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug, supabase]);

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-[10px] font-black uppercase tracking-[0.4em] italic text-slate-700 animate-pulse">
        Carregando...
      </div>
    </div>
  );

  // Layout limpo: Removemos o Header e Footer fixos.
  // Agora ele apenas fornece o contexto e o fundo, deixando a page.tsx controlar toda a UI.
  return (
    <div className="min-h-screen bg-black font-sans relative text-white">
      {children}
    </div>
  );
}