'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Building2, Trophy, CalendarDays, Loader2, AlertCircle } from 'lucide-react'

interface UserRole {
  role: string
  federacao_id?: string
  academia_id?: string
}

interface PortalOption {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  href: string
  badge?: string
}

export default function PortaisPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUserRoles()
  }, [])

  const loadUserRoles = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      // Get user roles
      const { data, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, federacao_id, academia_id')
        .eq('user_id', user.id)

      if (rolesError) throw rolesError

      setUserRoles(data || [])
    } catch (err) {
      console.error('Error loading roles:', err)
      setError('Erro ao carregar portais disponíveis')
    } finally {
      setLoading(false)
    }
  }

  // Determine available portals based on user roles
  const getAvailablePortals = (): PortalOption[] => {
    const portals: PortalOption[] = []
    const roles = userRoles.map(r => r.role)
    const hasAcademia = userRoles.some(r => r.academia_id)
    const hasFederacao = userRoles.some(r => r.federacao_id)

    // Portal Atleta - Todos os usuários autenticados
    portals.push({
      id: 'atleta',
      title: 'Portal do Atleta',
      description: 'Gestão pessoal, desempenho, frequência e participação em eventos',
      icon: <Users className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      href: '/portal/atleta',
      badge: 'PESSOAL'
    })

    // Portal Academia - academia_admin ou academia_staff
    if (roles.includes('academia_admin') || roles.includes('academia_staff')) {
      portals.push({
        id: 'academia',
        title: 'Portal da Academia',
        description: 'Gerencie sua academia, atletas, aulas e eventos',
        icon: <Building2 className="w-8 h-8" />,
        color: 'from-purple-500 to-purple-600',
        href: '/portal/academia',
        badge: 'PROFESSORES'
      })
    }

    // Portal Federação - federacao_admin ou similar
    if (roles.includes('federacao_admin') || roles.includes('federacao_staff') || 
        roles.includes('master_access') || hasFederacao) {
      portals.push({
        id: 'federacao',
        title: 'Portal da Federação',
        description: 'Administre federação, academias filiadas e regulamentações',
        icon: <Trophy className="w-8 h-8" />,
        color: 'from-red-500 to-red-600',
        href: '/portal/federacao',
        badge: 'GESTÃO'
      })
    }

    // Portal Eventos - federacao_admin ou event_organizer
    if (roles.includes('federacao_admin') || roles.includes('event_organizer') || 
        roles.includes('master_access')) {
      portals.push({
        id: 'eventos',
        title: 'Portal de Eventos',
        description: 'Crie e gerencie competições, treinamentos e campeonatos',
        icon: <CalendarDays className="w-8 h-8" />,
        color: 'from-orange-500 to-orange-600',
        href: '/portal/eventos',
        badge: 'EVENTOS'
      })
    }

    return portals
  }

  const portals = getAvailablePortals()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Carregando portais disponíveis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-100 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-white mb-2">SMAART PRO</h1>
          <p className="text-gray-300 text-lg">Escolha seu portal de acesso</p>
        </div>
      </div>

      {/* Portals Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {portals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Nenhum portal disponível para sua conta</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {portals.map((portal) => (
              <button
                key={portal.id}
                onClick={() => router.push(portal.href)}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${portal.color} opacity-90 group-hover:opacity-100 transition-opacity`}></div>

                {/* Content */}
                <div className="relative p-8 flex flex-col h-full">
                  {/* Badge */}
                  {portal.badge && (
                    <div className="inline-flex items-center justify-center w-fit mb-4">
                      <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold text-white backdrop-blur">
                        {portal.badge}
                      </span>
                    </div>
                  )}

                  {/* Icon */}
                  <div className="text-white mb-4 group-hover:scale-110 transition-transform">
                    {portal.icon}
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-white mb-3 text-left">
                    {portal.title}
                  </h2>

                  {/* Description */}
                  <p className="text-white/80 text-left flex-grow mb-6">
                    {portal.description}
                  </p>

                  {/* Arrow */}
                  <div className="flex items-center gap-2 text-white font-semibold group-hover:translate-x-2 transition-transform">
                    <span>Acessar</span>
                    <span className="text-xl">→</span>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => {
            supabase.auth.signOut()
            router.push('/login')
          }}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
