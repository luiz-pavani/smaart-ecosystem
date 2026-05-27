import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: st } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
  if (!st || !['master_access','federacao_admin','admin'].includes(st.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Paginação: `?page=0&pageSize=200`. Default 200 cabe o uso atual e
  // protege contra crescimento ilimitado da lista de candidatos.
  const url = new URL(req.url)
  const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10))
  const pageSize = Math.min(500, Math.max(10, parseInt(url.searchParams.get('pageSize') || '200', 10)))
  const start = page * pageSize
  const end = start + pageSize - 1

  const { data: candidatos, count } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, email, telefone, data_nascimento, kyu_dan_id', { count: 'exact' })
    .eq('candidato', true)
    .order('nome_completo', { ascending: true })
    .range(start, end)

  if (!candidatos?.length) return NextResponse.json({ candidatos: [] })

  const ids = candidatos.map((c: any) => c.id)

  const [
    { data: inscricoes },
    { data: fedRows },
    { data: reqStatus },
    { data: mudancas },
  ] = await Promise.all([
    supabaseAdmin.from('candidato_inscricoes').select('*').in('stakeholder_id', ids),
    supabaseAdmin.from('user_fed_lrsj').select('stakeholder_id, kyu_dan_id').in('stakeholder_id', ids),
    supabaseAdmin.from('candidato_req_status').select('stakeholder_id, admin_confirmed').in('stakeholder_id', ids),
    supabaseAdmin.from('stakeholder_mudanca_pendente').select('stakeholder_id').in('stakeholder_id', ids).eq('status', 'pendente'),
  ])

  const fedKyuDanMap: Record<string, number> = {}
  fedRows?.forEach((r: any) => { if (r.kyu_dan_id) fedKyuDanMap[r.stakeholder_id] = r.kyu_dan_id })

  const resolvedKyuDanIds = [...new Set(candidatos.map((c: any) => c.kyu_dan_id || fedKyuDanMap[c.id] || null).filter(Boolean))]

  let kyuDanMap: Record<number, any> = {}
  if (resolvedKyuDanIds.length) {
    const { data: kdList } = await supabaseAdmin.from('kyu_dan').select('id, kyu_dan, cor_faixa').in('id', resolvedKyuDanIds)
    kdList?.forEach((kd: any) => { kyuDanMap[kd.id] = kd })
  }

  const inscricaoMap: Record<string, any> = {}
  inscricoes?.forEach((i: any) => { inscricaoMap[i.stakeholder_id] = i })

  // Agregados por candidato
  const reqAgg: Record<string, { total: number; confirmados: number }> = {}
  reqStatus?.forEach((r: any) => {
    const a = reqAgg[r.stakeholder_id] || { total: 0, confirmados: 0 }
    a.total++
    if (r.admin_confirmed) a.confirmados++
    reqAgg[r.stakeholder_id] = a
  })

  const mudancasCount: Record<string, number> = {}
  mudancas?.forEach((m: any) => { mudancasCount[m.stakeholder_id] = (mudancasCount[m.stakeholder_id] || 0) + 1 })

  const result = candidatos.map((c: any) => {
    const kyuDanId = c.kyu_dan_id || fedKyuDanMap[c.id] || null
    const inscricao = inscricaoMap[c.id] || null
    const agg = reqAgg[c.id] || { total: 0, confirmados: 0 }
    return {
      ...c,
      kyu_dan: kyuDanId ? (kyuDanMap[kyuDanId] || null) : null,
      inscricao,
      requisitos_total: agg.total,
      requisitos_confirmados: agg.confirmados,
      dados_verificados: !!inscricao?.dados_verificados_em,
      mudancas_pendentes: mudancasCount[c.id] || 0,
    }
  })

  return NextResponse.json({ candidatos: result, total: count ?? result.length, page, pageSize })
}
