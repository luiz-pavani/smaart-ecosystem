import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: st } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
  if (!st || !['master_access','federacao_admin','admin'].includes(st.role)) {
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

  // Fetch inscricoes + user_fed_lrsj (for kyu_dan_id fallback) in parallel
  const [{ data: inscricoes }, { data: fedRows }] = await Promise.all([
    supabaseAdmin.from('candidato_inscricoes').select('*').in('stakeholder_id', ids),
    supabaseAdmin.from('user_fed_lrsj').select('stakeholder_id, kyu_dan_id').in('stakeholder_id', ids),
  ])

  // Build fed kyu_dan_id map
  const fedKyuDanMap: Record<string, number> = {}
  fedRows?.forEach((r: any) => { if (r.kyu_dan_id) fedKyuDanMap[r.stakeholder_id] = r.kyu_dan_id })

  // Collect all kyu_dan ids needed
  const resolvedKyuDanIds = [...new Set(candidatos.map((c: any) => {
    return c.kyu_dan_id || fedKyuDanMap[c.id] || null
  }).filter(Boolean))]

  let kyuDanMap: Record<number, any> = {}
  if (resolvedKyuDanIds.length) {
    const { data: kdList } = await supabaseAdmin.from('kyu_dan').select('id, kyu_dan, cor_faixa').in('id', resolvedKyuDanIds)
    kdList?.forEach((kd: any) => { kyuDanMap[kd.id] = kd })
  }

  const inscricaoMap: Record<string, any> = {}
  inscricoes?.forEach((i: any) => { inscricaoMap[i.stakeholder_id] = i })

  const result = candidatos.map((c: any) => {
    const kyuDanId = c.kyu_dan_id || fedKyuDanMap[c.id] || null
    return {
      ...c,
      kyu_dan: kyuDanId ? (kyuDanMap[kyuDanId] || null) : null,
      inscricao: inscricaoMap[c.id] || null,
    }
  })

  return NextResponse.json({ candidatos: result })
}
