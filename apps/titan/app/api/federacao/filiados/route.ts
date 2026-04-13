import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role, federacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const allowed = ['master_access', 'federacao_admin', 'federacao_gestor', 'federacao_staff', 'admin']
  if (!perfil || !allowed.includes(perfil.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const p = req.nextUrl.searchParams
  const search       = p.get('search') || ''
  const graduacao    = p.get('graduacao') || ''
  const academia     = p.get('academia') || ''
  const situacao     = p.get('situacao') || ''
  const statusMembro = p.get('statusMembro') || ''
  const page         = Math.max(0, parseInt(p.get('page') || '0', 10))
  const pageSize     = 100
  const start        = page * pageSize
  const end          = start + pageSize - 1

  let query = supabaseAdmin
    .from('user_fed_lrsj')
    .select(
      'stakeholder_id, nome_completo, academias, academia_id, status_plano, status_membro, data_expiracao, data_adesao, kyu_dan_id, kyu_dan:kyu_dan_id(cor_faixa, kyu_dan, icones)',
      { count: 'exact' }
    )

  // For non-master users scope to their federation's integer id
  // LRSJ is always federacao_id = 1 in user_fed_lrsj
  const isMaster = perfil.role === 'master_access'
  const LRSJ_UUID = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'
  const fedUUID = String(perfil.federacao_id ?? '').trim()
  const isLrsj = isMaster || fedUUID === LRSJ_UUID || fedUUID === '1'

  if (!isLrsj && perfil.federacao_id) {
    // Non-LRSJ: filter by federacao_id (would need integer mapping — skip for now)
    query = query.eq('federacao_id', 1)
  }
  // For LRSJ/master: no federacao_id filter (show all)

  if (search)       query = query.ilike('nome_completo', `%${search}%`)
  if (graduacao)    query = query.eq('kyu_dan_id', Number(graduacao))
  if (academia)     query = (query as any).ilike('academias', `%${academia}%`)
  if (situacao)     query = query.eq('status_plano', situacao)
  if (statusMembro) query = query.eq('status_membro', statusMembro)

  const { data, count, error } = await (query as any)
    .order('nome_completo', { ascending: true })
    .range(start, end)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve academia siglas
  const academiaIds: string[] = Array.from(
    new Set((data || []).map((i: any) => i.academia_id).filter(Boolean))
  )
  let siglaById: Record<string, string> = {}
  if (academiaIds.length > 0) {
    const { data: acadData } = await supabaseAdmin
      .from('academias')
      .select('id, sigla')
      .in('id', academiaIds)
    siglaById = (acadData || []).reduce((acc: any, a: any) => {
      if (a.id && a.sigla) acc[a.id] = a.sigla
      return acc
    }, {})
  }

  const atletas = (data || []).map((item: any) => ({
    id: item.stakeholder_id,
    nome_completo: item.nome_completo ?? '',
    graduacao: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : null,
    kyuDanIcones: item.kyu_dan?.icones || null,
    kyuDanNome: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : null,
    academia: siglaById[item.academia_id]
      ? { nome: siglaById[item.academia_id] }
      : (item.academias ? { nome: item.academias } : null),
    status_plano: item.status_plano ?? null,
    statusMembro: item.status_membro ?? 'Em análise',
    validade: item.data_expiracao ?? null,
    data_adesao: item.data_adesao ?? null,
  }))

  return NextResponse.json({ atletas, total: count ?? 0 })
}
