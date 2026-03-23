import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('event_registrations')
    .select('id, atleta_id, status, registration_date, event:event_id(id, nome, data_evento)')
    .order('registration_date', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with athlete names
  const athleteIds = [...new Set((data || []).map((r: any) => r.atleta_id).filter(Boolean))]
  let atletaMap: Record<string, string> = {}
  if (athleteIds.length) {
    const { data: atletas } = await supabaseAdmin
      .from('user_fed_lrsj')
      .select('stakeholder_id, nome_completo')
      .in('stakeholder_id', athleteIds)
    for (const a of atletas || []) atletaMap[a.stakeholder_id] = a.nome_completo
  }

  const enriched = (data || []).map((r: any) => ({
    ...r,
    atleta_nome: atletaMap[r.atleta_id] || r.atleta_id || '—',
  }))

  return NextResponse.json({ inscricoes: enriched })
}
