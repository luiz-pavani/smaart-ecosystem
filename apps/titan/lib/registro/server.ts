import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isAcademyStaff, isFederationManager } from '@/lib/auth/roles'

export interface StaffRegistro {
  userId: string
  role: string
  /** null só para gestor de federação/master sem academia própria — precisa informar academia_id. */
  academiaId: string | null
  podeEscolherAcademia: boolean
}

/** Quem pode registrar atletas: staff de academia (na própria) ou gestor de federação/master (em qualquer). */
export async function resolverStaffRegistro(): Promise<{ staff: StaffRegistro | null; status: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { staff: null, status: 401, error: 'Não autenticado' }

  const { data: me } = await supabaseAdmin
    .from('stakeholders')
    .select('role, academia_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!isAcademyStaff(me?.role)) return { staff: null, status: 403, error: 'Sem permissão para registrar atletas' }

  return {
    staff: {
      userId: user.id,
      role: me!.role as string,
      academiaId: (me!.academia_id as string | null) ?? null,
      podeEscolherAcademia: isFederationManager(me?.role),
    },
    status: 200,
  }
}

/** Academia efetiva do registro: a do staff, ou a informada quando ele pode escolher. */
export function academiaDoRegistro(staff: StaffRegistro, informada?: string | null): string | null {
  if (staff.podeEscolherAcademia && informada) return informada
  return staff.academiaId
}

/** Ficha acessível ao staff (mesma academia, ou qualquer uma para gestor de federação). */
export async function carregarFicha(staff: StaffRegistro, fichaId: string) {
  const { data: ficha } = await supabaseAdmin
    .from('academia_atleta_fichas')
    .select('*')
    .eq('id', fichaId)
    .maybeSingle()
  if (!ficha) return null
  if (!staff.podeEscolherAcademia && ficha.academia_id !== staff.academiaId) return null
  return ficha
}
