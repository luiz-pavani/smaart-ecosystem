import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifyAtletaBoasVindas } from '@/lib/whatsapp/notifications'

// POST — bulk approve or reject filiation requests
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const allowed = ['master_access', 'federacao_admin', 'federacao_gestor']
  if (!perfil || !allowed.includes(perfil.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const ids: string[] = body.ids || []
  const action: 'aprovar' | 'rejeitar' = body.action

  if (!ids.length) return NextResponse.json({ error: 'Nenhum ID fornecido' }, { status: 400 })
  if (!['aprovar', 'rejeitar'].includes(action)) return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

  const novoStatus = action === 'aprovar' ? 'Aceito' : 'Rejeitado'

  // Fetch current records to know who was NOT already Aceito (for welcome notification)
  const { data: current } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('stakeholder_id, nome_completo, telefone, academias, status_membro')
    .in('stakeholder_id', ids)

  const { error } = await supabaseAdmin
    .from('user_fed_lrsj')
    .update({
      status_membro: novoStatus,
      validado_em: new Date().toISOString(),
      validado_por: user.id,
      ...(action === 'aprovar' ? { dados_validados: true } : {}),
    })
    .in('stakeholder_id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send welcome notification to newly approved athletes
  if (action === 'aprovar') {
    for (const a of current || []) {
      if (a.status_membro !== 'Aceito' && a.telefone) {
        notifyAtletaBoasVindas({
          nome_completo: a.nome_completo,
          telefone: a.telefone,
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true, updated: ids.length, status: novoStatus })
}
