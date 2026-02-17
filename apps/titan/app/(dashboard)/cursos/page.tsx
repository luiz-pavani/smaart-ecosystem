import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function CursosPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Redireciona para a plataforma de cursos ProfepMax
  redirect('https://www.profepmax.com.br/')
}
