import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NovaAcademiaForm from '@/components/forms/NovaAcademiaForm'

export default async function NovaAcademiaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: perfil } = await supabase
    .from('user_roles')
    .select('role, federacao_id')
    .eq('user_id', user.id)
    .single()

  if (!perfil) {
    redirect('/login')
  }

  // Only federacao_admin can create academias
  if (perfil.role !== 'federacao_admin') {
    redirect('/academias')
  }

  return <NovaAcademiaForm />
}
