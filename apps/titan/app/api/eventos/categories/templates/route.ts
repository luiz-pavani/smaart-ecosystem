import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/eventos/categories/templates — listar faixas etárias e classes de peso
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: ageGroups, error: agErr } = await supabaseAdmin
    .from('event_age_groups')
    .select('*')
    .order('ordem')

  if (agErr) return NextResponse.json({ error: agErr.message }, { status: 500 })

  const { data: weightClasses, error: wcErr } = await supabaseAdmin
    .from('event_weight_classes')
    .select('*')
    .order('ordem')

  if (wcErr) return NextResponse.json({ error: wcErr.message }, { status: 500 })

  // Agrupar pesos por age_group_id + genero
  const grouped = (ageGroups || []).map(ag => ({
    ...ag,
    pesos: {
      Masculino: (weightClasses || []).filter(wc => wc.age_group_id === ag.id && wc.genero === 'Masculino'),
      Feminino: (weightClasses || []).filter(wc => wc.age_group_id === ag.id && wc.genero === 'Feminino'),
    }
  }))

  return NextResponse.json({ templates: grouped })
}
