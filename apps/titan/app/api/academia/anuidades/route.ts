import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let academiaId = req.nextUrl.searchParams.get('academia_id')

  if (!academiaId) {
    const { data: perfil } = await supabaseAdmin
      .from('stakeholders')
      .select('academia_id')
      .eq('id', user.id)
      .maybeSingle()
    academiaId = perfil?.academia_id ?? null
    if (!academiaId) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 403 })
  }

  const { data: atletas } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('id, nome_completo, telefone, celular, status_plano, data_expiracao, kyu_dan:kyu_dan_id(cor_faixa, nome)')
    .eq('academia_id', academiaId)
    .eq('federacao_id', 1)
    .order('data_expiracao', { ascending: true, nullsFirst: false })

  if (!atletas) return NextResponse.json({ vencendo: [], vencidas: [], sem_data: [], total: 0 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in30 = new Date(today)
  in30.setDate(today.getDate() + 30)

  // Minimum valid date threshold — ignore 1969/1970 epoch artifacts
  const MIN_DATE = new Date('2000-01-01')

  const vencendo: object[] = []
  const vencidas: object[] = []
  const sem_data: object[] = []

  for (const a of atletas) {
    const kd = Array.isArray((a as any).kyu_dan) ? (a as any).kyu_dan[0] : (a as any).kyu_dan
    const base = {
      id: (a as any).id,
      nome_completo: (a as any).nome_completo,
      telefone: (a as any).telefone || (a as any).celular || null,
      status_plano: (a as any).status_plano || null,
      data_expiracao: (a as any).data_expiracao || null,
      graduacao: kd?.nome || null,
      cor_faixa: kd?.cor_faixa || null,
    }

    if (!base.data_expiracao) {
      sem_data.push({ ...base, dias: null })
      continue
    }

    const exp = new Date(base.data_expiracao + 'T12:00:00')

    // Ignore garbage epoch dates (before year 2000)
    if (exp < MIN_DATE) {
      sem_data.push({ ...base, dias: null })
      continue
    }

    const diffMs = exp.getTime() - today.getTime()
    const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (dias < 0) {
      vencidas.push({ ...base, dias }) // negative = days overdue
    } else if (dias <= 30) {
      vencendo.push({ ...base, dias }) // 0-30 = expiring soon
    }
    // dias > 30 = valid, skip (not an alert)
  }

  return NextResponse.json({
    vencendo,   // expiring within 30 days (valid but urgent)
    vencidas,   // already expired (sorted oldest first)
    sem_data,   // no expiration date on record
    total: atletas.length,
  })
}
