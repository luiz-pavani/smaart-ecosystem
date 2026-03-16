import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// GET — all leads for academia
export async function GET(req: NextRequest) {
  const academiaId = req.nextUrl.searchParams.get('academia_id')
  if (!academiaId) return NextResponse.json({ error: 'academia_id required' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('leads')
    .select('id, nome, telefone, email, origem, status, notas, created_at, updated_at')
    .eq('academia_id', academiaId)
    .neq('status', 'perdido')
    .order('updated_at', { ascending: false })

  return NextResponse.json({ leads: data || [] })
}

// POST — create lead
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { academia_id, nome, telefone, email, origem, notas } = body

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({ academia_id, nome, telefone, email, origem: origem || 'manual', notas })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
