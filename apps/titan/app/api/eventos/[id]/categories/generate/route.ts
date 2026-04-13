import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

// POST /api/eventos/[id]/categories/generate
// Body: { age_group_ids: string[], generos: string[], taxa_inscricao?: number, kyu_dan_min?: number, kyu_dan_max?: number }
// Gera categorias automaticamente a partir dos templates
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!perfil || !ADMIN_ROLES.includes(perfil.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const { age_group_ids, generos, taxa_inscricao, kyu_dan_min, kyu_dan_max } = body

  if (!age_group_ids?.length || !generos?.length) {
    return NextResponse.json({ error: 'age_group_ids e generos são obrigatórios' }, { status: 400 })
  }

  // Buscar age_groups selecionados
  const { data: ageGroups } = await supabaseAdmin
    .from('event_age_groups')
    .select('*')
    .in('id', age_group_ids)
    .order('ordem')

  if (!ageGroups?.length) {
    return NextResponse.json({ error: 'Nenhuma faixa etária encontrada' }, { status: 400 })
  }

  // Buscar pesos das faixas etárias selecionadas
  const { data: weightClasses } = await supabaseAdmin
    .from('event_weight_classes')
    .select('*')
    .in('age_group_id', age_group_ids)
    .in('genero', generos)
    .order('ordem')

  if (!weightClasses?.length) {
    return NextResponse.json({ error: 'Nenhuma classe de peso encontrada' }, { status: 400 })
  }

  // Gerar categorias: faixa etária × peso × gênero
  const categories = []
  for (const ag of ageGroups) {
    for (const genero of generos) {
      const pesos = weightClasses.filter(wc => wc.age_group_id === ag.id && wc.genero === genero)
      for (const peso of pesos) {
        const nomeDisplay = `${ag.nome} ${genero === 'Masculino' ? 'Masc' : 'Fem'} ${peso.nome}`
        categories.push({
          evento_id: eventoId,
          age_group_id: ag.id,
          weight_class_id: peso.id,
          genero,
          kyu_dan_min: kyu_dan_min ?? null,
          kyu_dan_max: kyu_dan_max ?? null,
          nome_display: nomeDisplay,
          taxa_inscricao: taxa_inscricao ?? 0,
          tempo_luta_seg: ag.tempo_luta_seg,
          golden_score_seg: ag.golden_score_seg,
        })
      }
    }
  }

  if (categories.length === 0) {
    return NextResponse.json({ error: 'Nenhuma categoria a gerar' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('event_categories')
    .insert(categories)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: data?.length || 0 }, { status: 201 })
}
