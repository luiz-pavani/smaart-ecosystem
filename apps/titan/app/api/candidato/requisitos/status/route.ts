import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET — fetch req statuses for a candidate (self or admin viewing target)
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const targetId = url.searchParams.get('stakeholder_id') || user.id

  // If querying another user, must be admin
  if (targetId !== user.id) {
    const { data: st } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
    if (!st || !['master_access', 'federacao_admin'].includes(st.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('candidato_req_status')
    .select('req_key, user_completed, admin_confirmed, admin_nota')
    .eq('stakeholder_id', targetId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return as map: req_key → status
  const map: Record<string, { user_completed: boolean; admin_confirmed: boolean; admin_nota: string | null }> = {}
  for (const row of data || []) {
    map[row.req_key] = { user_completed: row.user_completed, admin_confirmed: row.admin_confirmed, admin_nota: row.admin_nota }
  }
  return NextResponse.json({ status: map })
}

// PATCH — update a single req status
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stakeholder_id, req_key, user_completed, admin_confirmed, admin_nota } = await req.json()
  if (!req_key) return NextResponse.json({ error: 'req_key required' }, { status: 400 })

  const targetId = stakeholder_id || user.id

  const { data: callerSt } = await supabaseAdmin.from('stakeholders').select('role, nome_completo').eq('id', user.id).single()
  const isAdmin = ['master_access', 'federacao_admin'].includes(callerSt?.role ?? '')
  const isSelf = user.id === targetId

  if (!isSelf && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  // Only self (or admin) can mark user_completed
  if (user_completed !== undefined && (isSelf || isAdmin)) {
    update.user_completed = user_completed
  }

  // Only admin can confirm and add nota
  if (isAdmin) {
    if (admin_confirmed !== undefined) update.admin_confirmed = admin_confirmed
    if (admin_nota !== undefined) update.admin_nota = admin_nota
    update.admin_id = user.id
  }

  const { data, error } = await supabaseAdmin
    .from('candidato_req_status')
    .upsert({ stakeholder_id: targetId, req_key, ...update }, { onConflict: 'stakeholder_id,req_key' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
