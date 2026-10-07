import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { anexarKyuDan, filtroStatusMembro } from '@/lib/filiacao/lrsj'

// Dynamic: sempre lê o banco no momento da requisição.
// Mudanças em user_fed_lrsj / kyu_dan se refletem na próxima visita.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  // Lista todos os filiados aceitos com graduação registrada.
  // Cada linha traz `em_dia` calculado a partir de data_expiracao para que
  // a UI possa exibir um badge de status de anuidade.
  const hoje = new Date().toISOString().split('T')[0]

  // PostgREST enforces a max page size (1000 by default in Supabase).
  // The LRSJ already has >1000 filiados, so paginate explicitly.
  type Row = {
    stakeholder_id: string
    nome_completo: string
    academia_id: string | null
    kyu_dan_id: number | null
    status_plano: string | null
    data_expiracao: string | null
  }
  const PAGE = 1000
  let from = 0
  const data: Row[] = []
  while (true) {
    const { data: page, error } = await supabaseAdmin
      .from('user_fed_lrsj')
      .select(`
        stakeholder_id,
        nome_completo,
        academia_id,
        kyu_dan_id,
        status_plano,
        data_expiracao
      `)
      .or(filtroStatusMembro('Aceito'))
      .not('kyu_dan_id', 'is', null)
      .order('nome_completo', { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const rows = (page ?? []) as Row[]
    data.push(...rows)
    if (rows.length < PAGE) break
    from += PAGE
  }

  // kyu_dan e nome da academia buscados à parte: a view não expõe a FK de kyu_dan
  // (cast ::bigint) e a coluna texto `academias` agora é NULL.
  const comKyuDan = await anexarKyuDan(supabaseAdmin, data)
  const academiaIds = Array.from(new Set(data.map((a) => a.academia_id).filter((id): id is string => !!id)))
  const academiaNome = new Map<string, string>()
  if (academiaIds.length) {
    const { data: acads } = await supabaseAdmin.from('academias').select('id, nome').in('id', academiaIds)
    for (const ac of acads ?? []) if (ac.nome) academiaNome.set(ac.id, ac.nome)
  }

  const atletas = comKyuDan.map((a) => {
    const kd = a.kyu_dan
    const em_dia =
      a.status_plano === 'Válido' &&
      typeof a.data_expiracao === 'string' &&
      a.data_expiracao >= hoje
    return {
      id: a.stakeholder_id,
      nome: a.nome_completo,
      academia: (a.academia_id && academiaNome.get(a.academia_id)) || null,
      kyu_dan_id: a.kyu_dan_id,
      cor_faixa: kd?.cor_faixa ?? null,
      kyu_dan: kd?.kyu_dan ?? null,
      ordem: kd?.ordem ?? 999,
      validade: a.data_expiracao,
      em_dia,
    }
  })

  return NextResponse.json(
    {
      atletas,
      total: atletas.length,
      generated_at: new Date().toISOString(),
    },
    {
      headers: {
        // Garantia adicional contra cache intermediário (CDN/browser).
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    },
  )
}
