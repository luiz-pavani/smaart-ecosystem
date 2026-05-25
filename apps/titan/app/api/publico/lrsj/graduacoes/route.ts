import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

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
    academias: string | null
    kyu_dan_id: number | null
    status_plano: string | null
    data_expiracao: string | null
    kyu_dan: { id: number; cor_faixa: string; kyu_dan: string; ordem: number } | { id: number; cor_faixa: string; kyu_dan: string; ordem: number }[] | null
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
        academias,
        kyu_dan_id,
        status_plano,
        data_expiracao,
        kyu_dan:kyu_dan_id (
          id,
          cor_faixa,
          kyu_dan,
          ordem
        )
      `)
      .eq('status_membro', 'Aceito')
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

  const atletas = data.map((a) => {
    const kd = Array.isArray(a.kyu_dan) ? a.kyu_dan[0] : a.kyu_dan
    const em_dia =
      a.status_plano === 'Válido' &&
      typeof a.data_expiracao === 'string' &&
      a.data_expiracao >= hoje
    return {
      id: a.stakeholder_id,
      nome: a.nome_completo,
      academia: a.academias || null,
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
