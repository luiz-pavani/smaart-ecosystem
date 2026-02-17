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
    <div className="h-full flex flex-col">
      <div className="p-8 border-b border-border">
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

      <div className="flex-1 overflow-hidden bg-background relative">
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            src="https://sul.smoothcomp.com/pt_BR/federation/130/events/upcoming"
            className="w-full h-full absolute inset-0"
            title="Eventos SmoothComp"
            allow="fullscreen"
            style={{
              border: 'none',
            }}
          />
          {/* CSS para esconder elementos do SmoothComp */}
          <style dangerouslySetInnerHTML={{__html: `
            iframe {
              display: block !important;
            }
          `}} />
        </div>
      </div>
    </div>
  )
}
