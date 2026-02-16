import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditarAtletaForm from '@/components/forms/EditarAtletaForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditarAtletaPage(props: PageProps) {
  const params = await props.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: perfil } = await supabase
    .from('user_roles')
    .select('role, federacao_id, academia_id')
    .eq('user_id', user.id)
    .single()

  if (!perfil) {
    redirect('/login')
  }

  // Get athlete data
  const { data: atleta, error } = await supabase
    .from('atletas')
    .select(`
      *,
      academia:academias!atletas_academia_id_fkey (
        id,
        nome
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !atleta) {
    redirect('/atletas')
  }

  // Get available academias
  let query = supabase.from('academias').select('id, nome').order('nome')

  if (perfil.role === 'academia_admin' || perfil.role === 'academia_staff') {
    query = query.eq('id', perfil.academia_id)
  } else if (perfil.role === 'federacao_admin' || perfil.role === 'federacao_staff') {
    query = query.eq('federacao_id', perfil.federacao_id)
  }

  const { data: academias } = await query

  return (
    <EditarAtletaForm
      atleta={atleta}
      academiasDisponiveis={academias || []}
      role={perfil.role}
    />
  )
}
