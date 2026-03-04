import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditarAcademiaForm from '@/components/forms/EditarAcademiaForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditarAcademiaPage(props: PageProps) {
  const params = await props.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get academy data
  const { data: academia, error } = await supabase
    .from('academias')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !academia) {
    redirect('/academias')
  }

  return (
    <EditarAcademiaForm
      academia={academia}
    />
  )
}
