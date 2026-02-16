import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NovoAtletaFormSimple from '@/src/components/forms/NovoAtletaFormSimple'

export default async function NovoAtletaPage() {
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
    .select('role, federacao_id, academia_id')
    .eq('user_id', user.id)
    .single()

  if (!perfil) {
    redirect('/login')
  }

  // Get available academias based on role
  let academiasDisponiveis: Array<{ id: string; nome: string }> = []

  if (perfil.role === 'federacao_admin' || perfil.role === 'federacao_staff') {
    const { data: academias } = await supabase
      .from('academias')
      .select('id, nome')
      .eq('federacao_id', perfil.federacao_id)
      .order('nome')

    academiasDisponiveis = academias || []
  } else if (perfil.role === 'academia_admin' || perfil.role === 'academia_staff') {
    const { data: academia } = await supabase
      .from('academias')
      .select('id, nome')
      .eq('id', perfil.academia_id)
      .single()

    if (academia) {
      academiasDisponiveis = [academia]
    }
  }

  return (
    <div className="flex-1 p-8">
      <NovoAtletaFormSimple
        academiasDisponiveis={academiasDisponiveis}
        federacaoId={perfil.federacao_id}
        academiaId={perfil.academia_id}
        role={perfil.role}
      />
    </div>
  )
}
