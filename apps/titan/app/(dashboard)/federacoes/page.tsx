import { createClient } from '@/lib/supabase/server'
import { Plus, Pencil } from 'lucide-react'

export default async function FederacoesPage() {
  const supabase = await createClient()

  const { data: federacoes } = await supabase
    .from('federacoes')
    .select('*')
    .order('nome', { ascending: true })

  const federacoesData = federacoes || []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Federações</h1>
          <p className="text-muted-foreground mt-2">
            {federacoesData.length} federa{federacoesData.length !== 1 ? 'ções' : 'ção'} cadastrada{federacoesData.length !== 1 ? 's' : ''}
          </p>
        </div>
        <a
          href="/federacoes/nova"
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Nova Federação
        </a>
      </div>

      {federacoesData.length === 0 && (
        <div className="bg-card rounded-2xl p-12 text-center border border-border">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            Nenhuma federação cadastrada
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Cadastre a primeira federação para iniciar a operação.
          </p>
          <a
            href="/federacoes/nova"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Cadastrar Primeira Federação
          </a>
        </div>
      )}

      {federacoesData.length > 0 && (
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
                  <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {federacoesData.map((federacao: any) => (
                  <tr key={federacao.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6">
                      <a href={`/federacoes/${federacao.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {federacao.nome}
                      </a>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {federacao.sigla || '-'}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {federacao.cnpj || '-'}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {federacao.endereco_cidade || '-'}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {federacao.endereco_estado || '-'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        federacao.ativo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {federacao.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/federacoes/${federacao.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          Editar
                        </a>
                      </div>
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
