"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { User, GraduationCap } from "lucide-react"; // Removido Settings

const inter = Inter({ subsets: ["latin"] });

const siteUrl = "https://www.profepmax.com.br";
const ogImage = `${siteUrl}/og-profepmax.png`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Trava de visibilidade: Esconde na Home (/), no Login e em rotas de Federação
  const isHomePage = pathname === "/";
  const isLoginPage = pathname === "/login";
  const isFederationRoute = pathname.startsWith("/federation");
  
  const hideHeader = isHomePage || isLoginPage || isFederationRoute;

  const navLinkStyle = "text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors cursor-pointer";

  return (
    <html lang="pt-br" className="dark">
      <head>
        <title>PROFEP MAX</title>
        <meta name="description" content="Programa de Formação e Especialização de Professores de Judô." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content="PROFEP MAX" />
        <meta property="og:description" content="Programa de Formação e Especialização de Professores de Judô." />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PROFEP MAX" />
        <meta name="twitter:description" content="Programa de Formação e Especialização de Professores de Judô." />
        <meta name="twitter:image" content={ogImage} />
      </head>
      <body className={`${inter.className} bg-black text-white antialiased selection:bg-red-600/30`}>
        
        {/* HEADER UNIFICADO PROFEP MAX */}
        {!hideHeader && (
          <header className="h-24 border-b border-white/10 bg-[#050505] sticky top-0 z-[100] px-12 flex items-center justify-between shadow-2xl shadow-black/50">
            
            <div className="flex items-center gap-12">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform">
                   <GraduationCap className="text-white fill-white/20" size={24} strokeWidth={2} />
                </div>
                <div className="flex flex-col justify-center">
                   <span className="font-black uppercase tracking-tighter italic text-3xl leading-none text-white">
                     PROFEP <span className="text-red-600">MAX</span>
                   </span>
                   <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500 leading-none mt-1">
                     Education
                   </span>
                </div>
              </Link>
              
              <nav className="hidden xl:flex items-center gap-8 pl-12 border-l border-white/10 h-10">
                <Link href="/dashboard" className={navLinkStyle}>INÍCIO</Link>
                <Link href="/cursos" className={navLinkStyle}>CURSOS</Link>
                <Link href="/ranking" className={navLinkStyle}>RANKING</Link>
                <Link href="/trofeus" className={navLinkStyle}>SALA DE TROFÉUS</Link>
                <a href="https://www.judolingo.com" target="_blank" rel="noopener noreferrer" className={navLinkStyle}>JUDOLINGO</a>
              </nav>
            </div>

            {/* ÁREA DO USUÁRIO CORRIGIDA */}
            <div className="flex items-center gap-6">
              {/* Link envolvendo todo o bloco da conta para levar ao Perfil */}
              <Link href="/perfil" className="flex items-center gap-3 pl-6 border-l border-white/10 cursor-pointer group relative">
                 <div className="text-right hidden md:block">
                    <div className="text-[10px] font-black uppercase text-slate-500 leading-none group-hover:text-red-500 transition-colors">
                      Minha Conta
                    </div>
                    <div className="text-[8px] font-bold text-zinc-600 uppercase mt-1">Assinante</div>
                 </div>
                 <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-red-600 group-hover:bg-red-600/10 transition-all">
                   <User size={18} className="text-slate-400 group-hover:text-white transition-colors" />
                 </div>
              </Link>
            </div>
          </header>
        )}

        <main className="relative min-h-screen bg-[#050505]">
           <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black pointer-events-none -z-10"></div>
           {children}
        </main>
      </body>
    </html>
  );
}