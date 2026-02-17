import { createClient } from '@/lib/supabase/server'
import { BarChart3, Building2, Users, DollarSign } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch real stats from database
  const { count: academiasCount } = await supabase
    .from('academias')
    .select('*', { count: 'exact', head: true })
  
  const { count: atletasCount } = await supabase
    .from('atletas')
    .select('*', { count: 'exact', head: true })
  
  const { count: atletasAtivos } = await supabase
    .from('atletas')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ativo')
  
  const stats = [
    {
      title: 'Academias',
      value: academiasCount?.toString() || '0',
      subtitle: '0 em análise',
      icon: Building2,
      color: 'bg-primary',
    },
    {
      title: 'Atletas',
      value: atletasCount?.toString() || '0',
      subtitle: `${atletasAtivos || 0} ativos`,
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
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Bem-vindo de volta, {user?.email}
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
      {(academiasCount || 0) === 0 && (
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
      )}
    </div>
  )
}
