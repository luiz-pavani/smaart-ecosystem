"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { 
  LayoutGrid, 
  BookOpen, 
  MessageSquare, 
  Users, 
  BadgeDollarSign, 
  Eye, 
  EyeOff, 
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

export default function SidebarAdmin() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  // Mapeamento exato das URLs solicitadas
  const departamentos = [
    { nome: "Visão Geral", icon: LayoutGrid, path: "/admin" },
    { nome: "Pedagógico", icon: BookOpen, path: "/admin/conteudo" },
    { nome: "Suporte", icon: MessageSquare, path: "/admin/duvidas" },
    { nome: "Secretaria", icon: Users, path: "/admin/secretaria" },
    { nome: "Comercial", icon: BadgeDollarSign, path: "/admin/vendas" },
  ];

  return (
    <>
      {/* BOTÃO FLUTUANTE DE ALTERNÂNCIA (FIXO NO CANTO INFERIOR) */}
      <button 
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-10 left-10 z-[100] bg-zinc-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/10 hover:border-red-500/50 transition-all active:scale-95 group flex items-center gap-3"
      >
        {isVisible ? (
          <>
            <EyeOff size={18} className="text-zinc-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ver como Aluno</span>
          </>
        ) : (
          <>
            <ShieldCheck size={18} className="text-red-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Painel Admin</span>
          </>
        )}
      </button>

      {/* SIDEBAR ADMINMAX */}
      <aside 
        className={`fixed left-0 top-0 h-screen bg-black border-r border-white/5 transition-all duration-500 z-[90] shadow-2xl overflow-y-auto ${
          isVisible ? "translate-x-0 w-[320px]" : "-translate-x-full w-[320px]"
        }`}
      >
        <div className="p-8 flex flex-col h-full">
          
          {/* LOGO ADMINMAX */}
          <div className="flex items-center gap-4 mb-16 mt-4">
            <div className="w-12 h-12 bg-red-900/30 border border-red-500/50 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="text-red-500" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter text-white flex items-center leading-none">
                ADMIN<span className="text-red-500">MAX</span>
              </h2>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mt-1">
                Central de Comando
              </p>
            </div>
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-6 italic">
            Departamentos
          </p>

          {/* LISTA DE DEPARTAMENTOS COM LINKS REAIS */}
          <nav className="space-y-3 flex-1">
            {departamentos.map((dept) => {
              const isActive = pathname === dept.path;
              return (
                <Link 
                  key={dept.nome} 
                  href={dept.path}
                  className={`w-full flex items-center justify-between p-5 rounded-3xl border transition-all group ${
                    isActive 
                    ? "bg-zinc-900/80 border-red-500/50 text-red-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]" 
                    : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <dept.icon 
                      size={22} 
                      className={isActive ? "text-red-500" : "text-zinc-500 group-hover:text-zinc-300"} 
                    />
                    <span className="text-[11px] font-black uppercase tracking-widest italic">
                      {dept.nome}
                    </span>
                  </div>
                  <ChevronRight 
                    size={14} 
                    className={`transition-all ${isActive ? "opacity-100 translate-x-1" : "opacity-30 group-hover:opacity-100"}`} 
                  />
                </Link>
              );
            })}
          </nav>

          {/* RODAPÉ DO PAINEL */}
          <div className="mt-auto pt-8 border-t border-white/5 opacity-30 text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">
              PROFEP MAX © 2026
            </p>
          </div>
        </div>
      </aside>

      {/* AJUSTE GLOBAL DO CONTEÚDO PARA NÃO SOBREPOR */}
      <style jsx global>{`
        body {
          margin-left: ${isVisible ? '320px' : '0px'};
          transition: margin-left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (max-width: 1024px) {
          body { margin-left: 0; }
        }
      `}</style>
    </>
  );
}