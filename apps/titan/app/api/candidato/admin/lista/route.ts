import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: st } = await supabaseAdmin.from('stakeholders').select('master_access, role').eq('id', user.id).single()
  if (!st || (!st.master_access && st.role !== 'federacao_admin' && st.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // All candidatos: stakeholders with candidato=true
  const { data: candidatos } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, email, telefone, data_nascimento, kyu_dan_id')
    .eq('candidato', true)
    .order('nome_completo', { ascending: true })

  if (!candidatos?.length) return NextResponse.json({ candidatos: [] })

  const ids = candidatos.map((c: any) => c.id)

  // Fetch inscricoes for all
  const { data: inscricoes } = await supabaseAdmin
    .from('candidato_inscricoes')
    .select('*')
    .in('stakeholder_id', ids)

  // Fetch kyu_dan
  const kyuDanIds = [...new Set(candidatos.map((c: any) => c.kyu_dan_id).filter(Boolean))]
  let kyuDanMap: Record<number, any> = {}
  if (kyuDanIds.length) {
    const { data: kdList } = await supabaseAdmin.from('kyu_dan').select('id, kyu_dan, cor_faixa').in('id', kyuDanIds)
    kdList?.forEach((kd: any) => { kyuDanMap[kd.id] = kd })
  }

  const inscricaoMap: Record<string, any> = {}
  inscricoes?.forEach((i: any) => { inscricaoMap[i.stakeholder_id] = i })

  const result = candidatos.map((c: any) => ({
    ...c,
    kyu_dan: kyuDanMap[c.kyu_dan_id] || null,
    inscricao: inscricaoMap[c.id] || null,
  }))

  return NextResponse.json({ candidatos: result })
}
