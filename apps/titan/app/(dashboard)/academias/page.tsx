import { createClient } from '@/lib/supabase/server'
import { Plus } from 'lucide-react'

export default async function AcademiasPage() {
  const supabase = await createClient()
  
  // Fetch academias from database
  const { data: academias } = await supabase
    .from('academias')
    .select('*')
    .order('nome', { ascending: true })

  const academiasData = academias || []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Academias</h1>
          <p className="text-muted-foreground mt-2">
            {academiasData.length} academia{academiasData.length !== 1 ? 's' : ''} cadastrada{academiasData.length !== 1 ? 's' : ''}
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
      {academiasData.length === 0 && (
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

      {/* Academia List/Table */}
      {academiasData.length > 0 && (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Nome</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Sigla</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">CNPJ</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Cidade</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">UF</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {academiasData.map((academia: any) => (
                  <tr key={academia.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6">
                      <a href={`/academias/${academia.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {academia.nome}
                      </a>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {academia.sigla || '-'}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {academia.cnpj || '-'}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {academia.cidade || '-'}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {academia.uf || '-'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        academia.status === 'ativo' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {academia.status === 'ativo' ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
