import { createClient } from '@/lib/supabase/server'
import { Plus, Pencil, Globe, AlertCircle, CheckCircle2 } from 'lucide-react'

// Helper function to format dates
function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR')
}

// Helper function to check if plan is expired
function isPlanExpired(expireDate: string | null): boolean {
  if (!expireDate) return false
  const today = new Date()
  const expire = new Date(expireDate)
  return expire < today
}

// Helper function to get days until expiration
function daysUntilExpiration(expireDate: string | null): number | null {
  if (!expireDate) return null
  const today = new Date()
  const expire = new Date(expireDate)
  const diff = expire.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

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
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">País</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Anuidade 2026</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Vencimento</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {academiasData.map((academia: any) => {
                  const expired = isPlanExpired(academia.plan_expire_date)
                  const daysLeft = daysUntilExpiration(academia.plan_expire_date)
                  
                  return (
                    <tr key={academia.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6">
                        <a href={`/academias/${academia.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {academia.nome}
                        </a>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="w-4 h-4" />
                          <span className="text-sm">{academia.pais || 'Brasil'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          academia.plan_status === 'Active' && !expired
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : expired || academia.plan_status === 'Expired'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {academia.plan_status === 'Active' && !expired ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ativa
                            </>
                          ) : expired || academia.plan_status === 'Expired' ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" />
                              Expirada
                            </>
                          ) : (
                            'Sem dados'
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {academia.plan_expire_date ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {formatDate(academia.plan_expire_date)}
                            </p>
                            {daysLeft !== null && daysLeft >= 0 && (
                              <p className="text-xs text-muted-foreground">
                                {daysLeft === 0 ? 'Vence hoje' : `${daysLeft} dias`}
                              </p>
                            )}
                            {daysLeft !== null && daysLeft < 0 && (
                              <p className="text-xs text-red-600 dark:text-red-400">
                                Vencida há {Math.abs(daysLeft)} dias
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          academia.ativo
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {academia.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/academias/${academia.id}/editar`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
