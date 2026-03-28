import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// GET — fetch family group + members for current user
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get academia_id from user_fed_lrsj, fallback to stakeholders
  const [{ data: fed }, { data: stakeholder }] = await Promise.all([
    supabaseAdmin.from('user_fed_lrsj').select('academia_id').eq('stakeholder_id', user.id).maybeSingle(),
    supabaseAdmin.from('stakeholders').select('academia_id').eq('id', user.id).maybeSingle(),
  ])

  const academiaId = fed?.academia_id ?? stakeholder?.academia_id ?? null

  // Find family group
  let grupo = null
  if (academiaId) {
    const { data } = await supabaseAdmin
      .from('familia_grupo')
      .select('id, academia_id, created_at')
      .eq('responsavel_id', user.id)
      .eq('academia_id', academiaId)
      .maybeSingle()
    grupo = data
  }

  if (!grupo) return NextResponse.json({ grupo: null, membros: [], academiaId })

  // Get members
  const { data: membros } = await supabaseAdmin
    .from('familia_membro')
    .select('id, nome, data_nascimento, genero, kyu_dan_id, stakeholder_id, created_at')
    .eq('grupo_id', grupo.id)
    .order('created_at')

  // Enrich with kyu_dan names
  const { data: kd } = await supabaseAdmin.from('kyu_dan').select('id, kyu_dan, cor_faixa')
  const kdMap: Record<number, any> = {}
  ;(kd || []).forEach((k: any) => { kdMap[k.id] = k })

  const enriched = (membros || []).map((m: any) => ({
    ...m,
    graduacao: m.kyu_dan_id ? kdMap[m.kyu_dan_id] : null,
  }))

  return NextResponse.json({ grupo, membros: enriched, academiaId })
}

// POST — add member to family group (create group if needed)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { nome, data_nascimento, genero, kyu_dan_id, academia_id } = body

  if (!nome || !academia_id) return NextResponse.json({ error: 'nome e academia_id obrigatórios' }, { status: 400 })

  // Ensure group exists
  let { data: grupo } = await supabaseAdmin
    .from('familia_grupo')
    .select('id')
    .eq('responsavel_id', user.id)
    .eq('academia_id', academia_id)
    .maybeSingle()

  if (!grupo) {
    const { data: newGrupo } = await supabaseAdmin
      .from('familia_grupo')
      .insert({ responsavel_id: user.id, academia_id })
      .select('id')
      .single()
    grupo = newGrupo
  }

  const { data: membro, error } = await supabaseAdmin
    .from('familia_membro')
    .insert({
      grupo_id: grupo!.id,
      nome,
      data_nascimento: data_nascimento || null,
      genero: genero || null,
      kyu_dan_id: kyu_dan_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(membro)
}
