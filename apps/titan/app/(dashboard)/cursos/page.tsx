import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExternalLink } from 'lucide-react'

export default async function CursosPage() {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cursos</h1>
            <p className="text-muted-foreground mt-2">
              Plataforma de educação e treinamento ProfepMax
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-12 text-center border border-border">
        <ExternalLink className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">
          Acessar Plataforma de Cursos
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Clique no botão abaixo para acessar a plataforma ProfepMax de cursos e treinamentos
        </p>
        <a
          href="https://www.profepmax.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all active:scale-[0.98]"
        >
          <span>Abrir ProfepMax em nova janela</span>
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>
    </div>
  )
}
