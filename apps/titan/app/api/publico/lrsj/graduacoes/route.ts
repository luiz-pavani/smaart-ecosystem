import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const revalidate = 300 // 5 min

export async function GET() {
  // Lista todos os filiados aceitos com graduação registrada.
  // Cada linha traz `em_dia` calculado a partir de data_expiracao para que
  // a UI possa exibir um badge de status de anuidade.
  const hoje = new Date().toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const atletas = (data ?? []).map((a) => {
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

  return NextResponse.json({
    atletas,
    total: atletas.length,
    generated_at: new Date().toISOString(),
  })
}
