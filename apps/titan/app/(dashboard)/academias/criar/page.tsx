import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CriarAcademiaForm from '@/components/forms/CriarAcademiaForm'

export default async function CriarAcademiaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <CriarAcademiaForm />
}
