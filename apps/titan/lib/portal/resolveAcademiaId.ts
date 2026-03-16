import { SupabaseClient } from '@supabase/supabase-js'

const SESSION_KEY = 'academia_portal_selected_id'

/** Persiste a academia selecionada pelo master_access (chama no dashboard ao selecionar) */
export function saveSelectedAcademiaId(id: string) {
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_KEY, id)
}

/** Lê a academia selecionada pelo master_access */
export function getSelectedAcademiaId(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(SESSION_KEY)
}

/**
 * Resolve o academia_id do usuário atual:
 * - Se tem academia_id no stakeholder → retorna ele
 * - Se master_access → retorna o id salvo no sessionStorage (selecionado no dashboard)
 * - Caso contrário → retorna null
 */
export async function resolveAcademiaId(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('stakeholders')
    .select('role, academia_id')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.academia_id) return perfil.academia_id

  if (perfil?.role === 'master_access') return getSelectedAcademiaId()

  return null
}
