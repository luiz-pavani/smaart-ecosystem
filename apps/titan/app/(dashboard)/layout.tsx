import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layouts/Sidebar'
import TopNav from '@/components/layouts/TopNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/acesso')
  }

  const { data: stakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('nome_usuario, nome_completo')
    .eq('id', user.id)
    .maybeSingle()

  const displayName = stakeholder?.nome_usuario || stakeholder?.nome_completo || user.email?.split('@')[0] || ''

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop: Sidebar + Content */}
      <div className="hidden lg:flex">
        <Sidebar user={user} />
        <div className="flex-1">
          <TopNav user={user} displayName={displayName} />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile: Top Nav + Content + Bottom Nav */}
      <div className="lg:hidden">
        <TopNav user={user} displayName={displayName} mobile />
        <main className="p-4 pb-20">
          {children}
        </main>
        {/* TODO: Add BottomNav component for mobile */}
      </div>
    </div>
  )
}
