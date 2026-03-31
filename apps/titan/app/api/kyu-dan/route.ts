import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('kyu_dan')
    .select('id, kyu_dan, cor_faixa')
    .order('id')
  return NextResponse.json({ kyu_dan: data || [] })
}
