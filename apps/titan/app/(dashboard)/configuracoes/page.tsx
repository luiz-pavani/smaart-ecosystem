import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Configure sua federação, preferências e integrações
        </p>
      </div>

      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Em Desenvolvimento
          </h3>
          <p className="text-sm text-muted-foreground">
            Esta funcionalidade estará disponível em breve
          </p>
        </div>
      </div>
    </div>
  )
}
