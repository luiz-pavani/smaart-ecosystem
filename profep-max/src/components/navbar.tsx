"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Star, LogOut, User } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [perfil, setPerfil] = useState<any>(null);

  // Força a detecção da Home e Login de forma rigorosa
  // Se o pathname for exatamente "/" ou "/login", a barra deve sumir.
  const isHomePage = pathname === "/";
  const isLoginPage = pathname === "/login";
  const hideNavbar = isHomePage || isLoginPage;

  useEffect(() => {
    // Só busca perfil se NÃO for página pública
    if (!hideNavbar) {
      loadPerfil();
    }
  }, [pathname, hideNavbar]);

  async function loadPerfil() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setPerfil(data);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // SOLUÇÃO DEFINITIVA PARA SUMIR NA HOME: 
  // Se for Home ou Login, retorna null IMEDIATAMENTE antes de qualquer marcação.
  if (hideNavbar) {
    return null;
  }

  return (
    <nav className="border-b border-white/5 bg-black sticky top-0 z-[100] w-full h-20 font-sans">
      <div className="max-w-[1800px] mx-auto px-8 h-full flex items-center justify-between">
        
        {/* LADO ESQUERDO: LOGO E LINKS */}
        <div className="flex items-center gap-10">
          <Link href="/dashboard">
            <h1 className="text-red-600 font-black italic text-2xl tracking-tighter uppercase">
              PROFEP<span className="text-white">MAX</span>
            </h1>
          </Link>
          
          <div className="hidden lg:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-white">
            <Link href="/dashboard" className={`hover:text-red-600 transition-colors ${pathname === '/dashboard' ? 'text-red-600' : ''}`}>Início</Link>
            <Link href="/cursos" className={`hover:text-red-600 transition-colors ${pathname.includes('/cursos') ? 'text-red-600' : ''}`}>Cursos</Link>
            <Link href="/ranking" className={`hover:text-red-600 transition-colors ${pathname === '/ranking' ? 'text-red-600' : ''}`}>Ranking</Link>
            <Link href="/trofeus" className={`hover:text-red-600 transition-colors ${pathname === '/trofeus' ? 'text-red-600' : ''}`}>Sala de Troféus</Link>
          </div>
        </div>

        {/* LADO DIREITO: XP E CONTA */}
        <div className="flex items-center gap-4">
          
          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mr-2">
            <Star size={12} className="text-red-600" fill="currentColor" />
            <span className="text-[10px] font-black italic text-white">{perfil?.pontos || 0} XP</span>
          </div>

          {/* BOTÃO MINHA CONTA: Aponta para /perfil conforme sua estrutura (src/app/(ava)/perfil) */}
          <Link 
            href="/perfil" 
            className="flex items-center gap-3 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 px-3 py-2 rounded-2xl transition-all group"
          >
            <div className="text-right hidden md:block pl-2">
              <p className="text-[9px] font-black uppercase text-white group-hover:text-red-600 transition-colors leading-none">Minha Conta</p>
              <p className="text-[7px] font-bold text-zinc-600 uppercase tracking-tighter">Dados e Certificados</p>
            </div>
            
            <div className="w-9 h-9 bg-black rounded-xl border border-white/10 flex items-center justify-center font-black text-red-600 italic group-hover:border-red-600 transition-all overflow-hidden">
              {perfil?.full_name ? (
                perfil.full_name.charAt(0).toUpperCase()
              ) : (
                <User size={18} />
              )}
            </div>
          </Link>

          <button 
            onClick={handleLogout} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-600/5 text-zinc-600 hover:bg-red-600 hover:text-white transition-all ml-2"
            title="Sair do Dojo"
          >
            <LogOut size={18} />
          </button>

        </div>
      </div>
    </nav>
  );
}