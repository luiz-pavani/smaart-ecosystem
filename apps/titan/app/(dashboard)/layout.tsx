import { createClient } from '@/lib/supabase/server'
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
    redirect('/login')
  }

  // TODO: Fetch user roles from user_roles table
  // const { data: roles } = await supabase
  //   .from('user_roles')
  //   .select('role, federacao_id, academia_id')
  //   .eq('user_id', user.id)

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop: Sidebar + Content */}
      <div className="hidden lg:flex">
        <Sidebar user={user} />
        <div className="flex-1">
          <TopNav user={user} />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile: Top Nav + Content + Bottom Nav */}
      <div className="lg:hidden">
        <TopNav user={user} mobile />
        <main className="p-4 pb-20">
          {children}
        </main>
        {/* TODO: Add BottomNav component for mobile */}
      </div>
    </div>
  )
}
