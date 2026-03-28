import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('academia_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!stakeholder?.academia_id) {
    return NextResponse.json({ academia: null })
  }

  const { data: academia } = await supabaseAdmin
    .from('academias')
    .select('*')
    .eq('id', stakeholder.academia_id)
    .maybeSingle()

  return NextResponse.json({ academia })
}
