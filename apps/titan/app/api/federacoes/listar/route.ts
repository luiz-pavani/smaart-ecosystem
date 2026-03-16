import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('federacoes')
    .select('id, nome, sigla')
    .order('nome', { ascending: true })

  if (error) return NextResponse.json({ error: error.message, federacoes: [] }, { status: 400 })
  return NextResponse.json({ federacoes: data || [] })
}
