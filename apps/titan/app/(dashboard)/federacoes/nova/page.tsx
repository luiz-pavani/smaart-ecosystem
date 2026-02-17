import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NovaFederacaoForm from '@/components/forms/NovaFederacaoForm'

export default async function NovaFederacaoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!perfil || perfil.role !== 'master_access') {
    redirect('/federacoes')
  }

  return <NovaFederacaoForm />
}
