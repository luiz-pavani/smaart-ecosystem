import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const PONTOS_CONFIG = {
  checkin:    { pontos: 10, label: 'Check-in na aula' },
  avaliacao:  { pontos: 5,  label: 'Avaliação de aula' },
  indicacao:  { pontos: 50, label: 'Indicação de novo aluno' },
  promocao:   { pontos: 100, label: 'Promoção de faixa' },
} as const

export type TipoPonto = keyof typeof PONTOS_CONFIG

// GET — athlete's points summary + history
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const athleteId = req.nextUrl.searchParams.get('athlete_id') || user.id

  const { data: entries } = await supabaseAdmin
    .from('pontos_atleta')
    .select('id, tipo, pontos, descricao, created_at')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(50)

  const total = (entries || []).reduce((sum: number, e: any) => sum + e.pontos, 0)

  // Ranking: top 10 for same academia
  const { data: fedData } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('academia_id')
    .eq('stakeholder_id', athleteId)
    .maybeSingle()

  let ranking: { athlete_id: string; nome: string; total: number; rank: number }[] = []
  if (fedData?.academia_id) {
    const { data: rankData } = await supabaseAdmin
      .from('pontos_atleta')
      .select('athlete_id, pontos')
      .eq('academia_id', fedData.academia_id)

    const totals: Record<string, number> = {}
    ;(rankData || []).forEach((r: any) => {
      totals[r.athlete_id] = (totals[r.athlete_id] || 0) + r.pontos
    })

    const sorted = Object.entries(totals)
      .map(([id, pts]) => ({ athlete_id: id, total: pts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    const ids = sorted.map(s => s.athlete_id)
    const { data: names } = await supabaseAdmin
      .from('user_fed_lrsj')
      .select('stakeholder_id, nome_completo')
      .in('stakeholder_id', ids)
    const nameMap: Record<string, string> = {}
    ;(names || []).forEach((n: any) => { nameMap[n.stakeholder_id] = n.nome_completo })

    ranking = sorted.map((s, i) => ({
      athlete_id: s.athlete_id,
      nome: nameMap[s.athlete_id] || '—',
      total: s.total,
      rank: i + 1,
    }))
  }

  const myRank = ranking.findIndex(r => r.athlete_id === athleteId) + 1

  return NextResponse.json({
    total,
    history: entries || [],
    ranking,
    myRank: myRank || null,
  })
}

// POST — award points (internal use, called by other routes)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { athlete_id, academia_id, tipo, ref_id } = body as {
    athlete_id: string; academia_id: string; tipo: TipoPonto; ref_id?: string
  }

  const config = PONTOS_CONFIG[tipo]
  if (!config) return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })

  const { error } = await supabaseAdmin.from('pontos_atleta').insert({
    athlete_id,
    academia_id,
    tipo,
    pontos: config.pontos,
    descricao: config.label,
    ref_id: ref_id || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pontos: config.pontos })
}
