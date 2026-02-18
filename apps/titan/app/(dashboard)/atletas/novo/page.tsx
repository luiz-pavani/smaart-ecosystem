import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NovoAtletaForm from '@/components/forms/NovoAtletaForm'

export default async function NovoAtletaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: perfil, error: perfilError } = await supabase
    .from('user_roles')
    .select('role, federacao_id, academia_id')
    .eq('user_id', user.id)
    .single()

  if (perfilError || !perfil) {
    console.error('Erro ao buscar perfil:', perfilError)
    redirect('/login')
  }

  // Get available academias based on role
  let academiasDisponiveis: Array<{ id: string; nome: string; sigla: string }> = []

  if (perfil.role === 'federacao_admin' || perfil.role === 'federacao_staff') {
    const { data: academias } = await supabase
      .from('academias')
      .select('id, nome, sigla')
      .eq('federacao_id', perfil.federacao_id)
      .order('nome')

    academiasDisponiveis = academias || []
  } else if (perfil.role === 'academia_admin' || perfil.role === 'academia_staff' || perfil.role === 'professor') {
    const { data: academia, error: acadError } = await supabase
      .from('academias')
      .select('id, nome, sigla')
      .eq('id', perfil.academia_id)
      .single()

    if (academia && !acadError) {
      academiasDisponiveis = [academia]
    }
  }

  return (
    <NovoAtletaForm
      academiasDisponiveis={academiasDisponiveis}
      federacaoId={perfil.federacao_id}
      academiaId={perfil.academia_id}
      role={perfil.role}
    />
  )
}
