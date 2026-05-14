import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('stakeholder_mudanca_pendente')
    .select('id, campo, valor_antigo, valor_novo, solicitado_em, status, motivo_rejeicao, decidido_em')
    .eq('stakeholder_id', user.id)
    .eq('status', 'pendente')
    .order('solicitado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mudancas: data || [] })
}

// DELETE — candidato cancela uma mudança pendente própria
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('stakeholder_mudanca_pendente')
    .delete()
    .eq('id', id)
    .eq('stakeholder_id', user.id)
    .eq('status', 'pendente')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
