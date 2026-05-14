import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const stakeholder_id = url.searchParams.get('stakeholder_id')
  if (!stakeholder_id) return NextResponse.json({ error: 'stakeholder_id required' }, { status: 400 })

  if (stakeholder_id !== user.id) {
    const { data: st } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
    if (!st || !['master_access', 'federacao_admin', 'admin'].includes(st.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('stakeholder_campo_verificado')
    .select('campo, verified, verified_by, verified_at, nota')
    .eq('stakeholder_id', stakeholder_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map: Record<string, { verified: boolean; verified_at: string | null; nota: string | null }> = {}
  for (const r of data || []) {
    map[r.campo] = { verified: r.verified, verified_at: r.verified_at, nota: r.nota }
  }
  return NextResponse.json({ campos: map })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerSt } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
  if (!callerSt || !['master_access', 'federacao_admin', 'admin'].includes(callerSt.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { stakeholder_id, campo, verified, nota } = await req.json()
  if (!stakeholder_id || !campo) {
    return NextResponse.json({ error: 'stakeholder_id and campo required' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    stakeholder_id,
    campo,
  }
  if (verified !== undefined) {
    payload.verified = verified
    payload.verified_at = verified ? new Date().toISOString() : null
    payload.verified_by = verified ? user.id : null
  }
  if (nota !== undefined) payload.nota = nota

  const { data, error } = await supabaseAdmin
    .from('stakeholder_campo_verificado')
    .upsert(payload, { onConflict: 'stakeholder_id,campo' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campo: data })
}
