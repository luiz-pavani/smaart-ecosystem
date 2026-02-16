import { createClient } from '@/lib/supabase/server'
import { Plus } from 'lucide-react'

export default async function AcademiasPage() {
  const supabase = await createClient()
  
  // TODO: Fetch academias from database
  // const { data: academias } = await supabase
  //   .from('academias')
  //   .select('*')
  //   .order('nome', { ascending: true })

  const academias: any[] = [] // Empty for now

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Academias</h1>
          <p className="text-muted-foreground mt-2">
            {academias.length} academia{academias.length !== 1 ? 's' : ''} cadastrada{academias.length !== 1 ? 's' : ''}
          </p>
        </div>
        <a
          href="/academias/nova"
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Nova Academia
        </a>
      </div>

      {/* Empty State */}
      {academias.length === 0 && (
        <div className="bg-card rounded-2xl p-12 text-center border border-border">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            Nenhuma academia cadastrada
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Cadastre sua primeira academia filiada para começar a gerenciar atletas, 
            eventos e pagamentos.
          </p>
          <a
            href="/academias/nova"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Cadastrar Primeira Academia
          </a>
        </div>
      )}

      {/* TODO: Academia List/Table */}
    </div>
  )
}
