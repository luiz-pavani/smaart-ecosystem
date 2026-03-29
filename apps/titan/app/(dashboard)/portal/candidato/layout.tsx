'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  ClipboardList,
  Calculator,
  FileText,
  ScrollText,
  UserCheck,
  LogOut,
  Users,
  ShieldCheck,
} from 'lucide-react'
import { CandidatoContext } from './context'

const NAV_ITEMS = [
  { label: 'Visão Geral', href: '/portal/candidato/visao-geral', icon: LayoutDashboard },
  { label: 'Cronograma Oficial', href: '/portal/candidato/cronograma', icon: CalendarDays },
  { label: 'Área de Estudo', href: '/portal/candidato/area-de-estudo', icon: BookOpen },
  { label: 'Meus Requisitos', href: '/portal/candidato/requisitos', icon: ClipboardList },
  { label: 'Calculadora de Pontos', href: '/portal/candidato/calculadora', icon: Calculator },
  { label: 'Documentos', href: '/portal/candidato/documentos', icon: FileText },
  { label: 'Regulamento', href: '/portal/candidato/regulamento', icon: ScrollText },
  { label: 'Inscrição', href: '/portal/candidato/inscricao', icon: UserCheck },
]

const ADMIN_NAV_ITEMS = [
  { label: 'Gerenciar Candidatos', href: '/portal/candidato/admin/candidatos', icon: Users },
]

export default function CandidatoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userName, setUserName] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/acesso'); return }
      // Use perfil-dados (supabaseAdmin) to bypass RLS and get role
      const meRes = await fetch('/api/atletas/self/perfil-dados').then(r => r.json()).catch(() => null)
      const st = meRes?.stakeholder
      if (st?.nome_completo) setUserName(st.nome_completo)
      const adminRoles = ['master_access', 'federacao_admin', 'admin']
      setIsAdmin(adminRoles.includes(st?.role || ''))
    }
    load()
  }, [])

  const firstName = userName.split(' ')[0] || 'Candidato'

  return (
    <CandidatoContext.Provider value={{ isAdmin }}>
      <div className="fixed inset-0 z-50 bg-black text-white flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-64 flex-shrink-0 flex flex-col border-r ${isAdmin ? 'bg-[#0a0a14] border-indigo-900/40' : 'bg-black border-white/5'}`}>
          {/* Logo */}
          <div className={`p-6 border-b ${isAdmin ? 'border-indigo-900/40' : 'border-white/5'}`}>
            <div className="flex items-center gap-3 mb-1">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAdmin ? 'bg-indigo-500' : 'bg-red-500'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isAdmin ? 'bg-indigo-600' : 'bg-red-600'}`} />
              </span>
              <span className={`text-xs font-black tracking-widest uppercase ${isAdmin ? 'text-indigo-400' : 'text-red-500'}`}>
                Liga Riograndense de Judô
              </span>
            </div>
            <p className="text-white/40 text-xs mt-1 pl-6">Portal do Candidato</p>
            {isAdmin && (
              <div className="mt-3 pl-6">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Modo Admin
                </span>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-all ${
                    active
                      ? `border-l-2 text-white bg-white/5 ${isAdmin ? 'border-indigo-500' : 'border-red-600'}`
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            {isAdmin && (
              <>
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[10px] font-black tracking-widest text-indigo-500/60 uppercase">Administração</p>
                </div>
                {ADMIN_NAV_ITEMS.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 text-sm transition-all ${
                        active
                          ? 'border-l-2 border-indigo-500 text-indigo-300 bg-indigo-600/10'
                          : 'text-indigo-400/70 hover:text-indigo-300 hover:bg-indigo-600/5 border-l-2 border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </>
            )}
          </nav>

          {/* User */}
          <div className={`p-4 border-t ${isAdmin ? 'border-indigo-900/40' : 'border-white/5'}`}>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{isAdmin ? 'Administrador' : 'Candidato'}</p>
            <p className="text-sm text-white font-medium truncate">{userName || '...'}</p>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className={`flex items-center justify-between px-6 py-3 border-b backdrop-blur flex-shrink-0 ${isAdmin ? 'bg-[#0a0a14]/80 border-indigo-900/30' : 'bg-black/80 border-white/5'}`}>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAdmin ? 'bg-indigo-500' : 'bg-red-500'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isAdmin ? 'bg-indigo-600' : 'bg-red-600'}`} />
              </span>
              <span>Ambiente de Graduação</span>
              <span className="text-slate-600">/</span>
              <span>Liga Riograndense de Judô</span>
              {isAdmin && (
                <>
                  <span className="text-slate-600">/</span>
                  <span className="text-indigo-400 font-semibold">Admin</span>
                </>
              )}
            </div>
            <button
              onClick={() => router.push('/portal')}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair do Portal
            </button>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto bg-[#050505]">
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </CandidatoContext.Provider>
  )
}
