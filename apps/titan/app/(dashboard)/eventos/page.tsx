import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExternalLink } from 'lucide-react'

export default async function EventosPage() {
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
            <h1 className="text-3xl font-bold text-foreground">Eventos</h1>
            <p className="text-muted-foreground mt-2">
              Competições e campeonatos da federação
            </p>
          </div>
          <a
            href="https://sul.smoothcomp.com/pt_BR/federation/130/events/upcoming"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <span>Abrir no SmoothComp</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="bg-background rounded-lg border border-border overflow-hidden" style={{ height: 'calc(100vh - 240px)' }}>
        <iframe
          src="https://sul.smoothcomp.com/pt_BR/federation/130/events/upcoming"
          className="w-full h-full"
          title="Eventos SmoothComp"
          allow="fullscreen"
        />
      </div>
    </div>
  )
}
