"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Settings, 
  LogOut, 
  ShieldAlert,
  ChevronRight,
  MessageSquare,
  BarChart3
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Atualizei os links para baterem exatamente com a sua estrutura de pastas
  const menuItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Secretaria", href: "/admin/secretaria", icon: Users },
    { label: "Conteúdos", href: "/admin/conteudo", icon: BookOpen },
    { label: "Dúvidas", href: "/admin/duvidas", icon: MessageSquare },
    { label: "Vendas", href: "/admin/vendas", icon: BarChart3 },
  ];

  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      {/* SIDEBAR FIXA */}
      <aside className="w-72 border-r border-zinc-900 flex flex-col fixed h-full bg-black z-50">
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-10">
            <ShieldAlert size={20} className="text-red-600" />
            <span className="font-black uppercase italic tracking-tighter text-xl">
              Profep<span className="text-red-600">Max</span>
            </span>
          </div>

          <nav className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all group ${
                    isActive 
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 font-bold uppercase text-[10px] tracking-widest">
                    <item.icon size={18} />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight size={14} />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-8 border-t border-zinc-900">
            <button className="flex items-center gap-3 text-zinc-600 hover:text-red-500 transition-colors font-black uppercase text-[10px] tracking-widest w-full">
              <LogOut size={18} />
              Sair do Painel
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO */}
      <main className="flex-1 ml-72 min-h-screen bg-black">
        {children}
      </main>
    </div>
  );
}