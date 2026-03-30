import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ALLOWED_ROLES = ['atleta', 'professor', 'federacao_admin', 'master_access']

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only master_access can change roles
  const { data: caller } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'master_access') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { target_id, role } = await req.json()
  if (!target_id || !role) return NextResponse.json({ error: 'target_id and role required' }, { status: 400 })
  if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('stakeholders')
    .update({ role })
    .eq('id', target_id)
    .select('id, nome_completo, email, role')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stakeholder: data })
}
