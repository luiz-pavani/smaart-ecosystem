import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Building2, Landmark, Users } from 'lucide-react'

export default async function AcessoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)

  const roleList = roles?.map((row) => row.role) || []
  const hasAtleta = roleList.includes('atleta')
  const hasAcademia = roleList.some((role) => role.startsWith('academia_'))
  const hasFederacao = roleList.some((role) => role.startsWith('federacao_')) || roleList.includes('master_access')

  if (roleList.length === 1 && hasAtleta) {
    redirect('/atletas')
  }

  const accessCards = [
    {
      key: 'federacao',
      title: 'Federação',
      description: 'Gestão de federações, academias e atletas',
      href: '/',
      icon: Landmark,
      enabled: hasFederacao,
    },
    {
      key: 'academia',
      title: 'Academia',
      description: 'Gestão de atletas e mensalidades da academia',
      href: '/academias',
      icon: Building2,
      enabled: hasAcademia,
    },
    {
      key: 'atleta',
      title: 'Atleta',
      description: 'Acompanhar cadastro e informações pessoais',
      href: '/atletas',
      icon: Users,
      enabled: hasAtleta,
    },
  ]

  const availableCards = accessCards.filter((card) => card.enabled)

  if (availableCards.length === 0) {
    redirect('/')
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Selecione seu acesso</h1>
          <p className="text-muted-foreground mt-2">
            Escolha como deseja acessar a plataforma
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accessCards.map((card) => {
            const Icon = card.icon
            if (!card.enabled) {
              return (
                <div
                  key={card.key}
                  className="opacity-40 cursor-not-allowed border border-border rounded-xl p-5 bg-muted/30"
                >
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{card.description}</p>
                </div>
              )
            }

            return (
              <Link
                key={card.key}
                href={card.href}
                className="border border-border rounded-xl p-5 hover:border-primary hover:bg-primary/5 transition-all"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{card.description}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
