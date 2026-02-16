import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layouts/Sidebar'
import TopNav from '@/components/layouts/TopNav'
import { BarChart3, Building2, Users, DollarSign } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login')
  }

  // Get user role and federation
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role, federacao_id, federacoes(nome, sigla)')
    .eq('user_id', user.id)
    .single()

  const stats = [
    {
      title: 'Academias',
      value: '0',
      subtitle: '0 em análise',
      icon: Building2,
      color: 'bg-primary',
    },
    {
      title: 'Atletas',
      value: '0',
      subtitle: '0 ativos',
      icon: Users,
      color: 'bg-secondary',
    },
    {
      title: 'Receita Mensal',
      value: 'R$ 0,00',
      subtitle: 'MRR',
      icon: DollarSign,
      color: 'bg-accent',
    },
    {
      title: 'Taxa de Renovação',
      value: '0%',
      subtitle: 'Últimos 30 dias',
      icon: BarChart3,
      color: 'bg-muted',
    },
  ]

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop: Sidebar + Content */}
      <div className="hidden lg:flex">
        <Sidebar user={user} />
        <div className="flex-1">
          <TopNav user={user} />
          <main className="p-6">
            <div>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                  Bem-vindo de volta, {user?.email}
                  {userRole && userRole.federacoes && (
                    <span className="ml-2 text-sm">
                      • {(userRole.federacoes as any).nome || 'Liga Riograndense de Judô'}
                    </span>
                  )}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div
                      key={stat.title}
                      className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                    </div>
                  )
                })}
              </div>

              {/* Quick Actions */}
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">Ações Rápidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a
                    href="/academias/nova"
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <Building2 className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Nova Academia</p>
                      <p className="text-sm text-muted-foreground">Cadastrar filiada</p>
                    </div>
                  </a>

                  <a
                    href="/atletas/novo"
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <Users className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Novo Atleta</p>
                      <p className="text-sm text-muted-foreground">Cadastrar competidor</p>
                    </div>
                  </a>

                  <a
                    href="/pagamentos"
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <DollarSign className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Gerar Cobrança</p>
                      <p className="text-sm text-muted-foreground">Anualidades/Taxas</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Empty State */}
              <div className="mt-8 bg-card rounded-2xl p-12 text-center border border-border">
                <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Nenhuma academia cadastrada
                </h3>
                <p className="text-muted-foreground mb-6">
                  Comece cadastrando sua primeira academia filiada
                </p>
                <a
                  href="/academias/nova"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all active:scale-[0.98]"
                >
                  <Building2 className="w-5 h-5" />
                  Cadastrar Academia
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile: Top Nav + Content */}
      <div className="lg:hidden">
        <TopNav user={user} mobile />
        <main className="p-4 pb-20">
          <div>
            {/* Same content as desktop */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Bem-vindo, {user?.email?.split('@')[0]}
              </p>
            </div>

            <div className="space-y-4">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div
                    key={stat.title}
                    className="bg-card rounded-2xl p-6 shadow-sm border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}


