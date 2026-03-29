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
} from 'lucide-react'

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

export default function CandidatoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/acesso'); return }
      const { data } = await supabase
        .from('stakeholders')
        .select('nome_completo')
        .eq('id', user.id)
        .single()
      if (data?.nome_completo) setUserName(data.nome_completo)
    }
    load()
  }, [])

  const firstName = userName.split(' ')[0] || 'Candidato'

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-black border-r border-white/5 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
            <span className="text-xs font-black tracking-widest text-red-500 uppercase">Liga Riograndense de Judô</span>
          </div>
          <p className="text-white/40 text-xs mt-1 pl-6">Portal do Candidato</p>
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
                    ? 'border-l-2 border-red-600 text-white bg-white/5'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Candidato</p>
          <p className="text-sm text-white font-medium truncate">{userName || '...'}</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/80 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
            </span>
            <span>Ambiente de Graduação</span>
            <span className="text-slate-600">/</span>
            <span>Liga Riograndense de Judô</span>
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
  )
}
