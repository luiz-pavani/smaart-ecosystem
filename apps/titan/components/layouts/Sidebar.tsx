'use client'

import { Building2, Users, Calendar, GraduationCap, Store, Settings, LogOut, LayoutDashboard, Shield, Landmark, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SidebarProps {
  user: any
}

const navigation = [
  { name: 'Meus Portais', href: '/portais', icon: LayoutDashboard },
  { name: 'Federações', href: '/federacoes', icon: Landmark },
  { name: 'Academias', href: '/academias', icon: Building2 },
  { name: 'Atletas', href: '/atletas', icon: Users },
  { name: 'Compartilhar Registro', href: '/compartilhar-registro', icon: Share2 },
  { name: 'Eventos', href: '/eventos', icon: Calendar },
  { name: 'Cursos', href: '/cursos', icon: GraduationCap },
  { name: 'Produtos', href: '/produtos', icon: Store },
  { name: 'Permissões', href: '/permissoes', icon: Shield },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

export default function Sidebar({ user }: SidebarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Fetch vw_roles_info for user
  // Example: roles = [{ role: 'master_access' }, { role: 'federacao_admin', federacao_id: 'LRSJ_UUID' }, ...]
  // Replace with actual fetch logic
  type Role = { role: string; federacao_id?: string; academia_id?: string };
  const roles: Role[] = user?.roles || [];
  const hasMasterAccess = roles.some((r: Role) => r.role === 'master_access');
  const hasFederacao = roles.some((r: Role) => r.role.startsWith('federacao'));
  const hasAcademia = roles.some((r: Role) => r.role.startsWith('academia'));

  const filteredNavigation = navigation.filter(item => {
    if (item.name === 'Federações') return hasFederacao || hasMasterAccess;
    if (item.name === 'Academias') return hasAcademia || hasMasterAccess;
    if (item.name === 'Atletas') return hasMasterAccess;
    return true;
  });

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <button
          onClick={() => router.push('/portal')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Titan</h1>
            <p className="text-xs text-muted-foreground">Federações</p>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all group"
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {user?.email?.[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email}
            </p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}
