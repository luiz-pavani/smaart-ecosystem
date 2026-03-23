import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/federacao/backnumbers
// Returns all athletes with the data needed for backnumber generation.
// Query params:
//   status  — 'Válido' | 'Vencido' | 'Aceito' (optional, comma-separated)
//   search  — text search on nome_completo (optional)
//   academia_id — filter by academy UUID (optional)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Role check — must be federation or master
  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role, federacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil || (perfil.role !== 'master_access' && !perfil.federacao_id)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const p = req.nextUrl.searchParams
  const statusFilter = p.get('status')   // e.g. 'Válido' or 'Válido,Aceito'
  const search = p.get('search') || ''
  const academiaId = p.get('academia_id') || ''

  let query = supabaseAdmin
    .from('user_fed_lrsj')
    .select(`
      id,
      stakeholder_id,
      nome_completo,
      nome_patch,
      academias,
      academia_id,
      genero,
      status_plano,
      status_membro,
      data_expiracao,
      kyu_dan:kyu_dan_id (
        id,
        nome,
        cor_faixa
      )
    `)
    .eq('federacao_id', 1)
    .order('nome_completo', { ascending: true })

  if (statusFilter) {
    const statuses = statusFilter.split(',').map(s => s.trim())
    if (statuses.length === 1) {
      query = query.eq('status_plano', statuses[0])
    } else {
      query = query.in('status_plano', statuses)
    }
  }

  if (search) {
    query = query.ilike('nome_completo', `%${search}%`)
  }

  if (academiaId) {
    query = query.eq('academia_id', academiaId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Normalize kyu_dan (Supabase returns array for FK joins)
  const atletas = (data ?? []).map((a: any) => {
    const kd = Array.isArray(a.kyu_dan) ? a.kyu_dan[0] : a.kyu_dan
    return {
      id: a.id,
      stakeholder_id: a.stakeholder_id,
      nome_completo: a.nome_completo,
      nome_patch: a.nome_patch || a.nome_completo,
      academia: a.academias || '—',
      academia_id: a.academia_id,
      genero: a.genero,
      status_plano: a.status_plano,
      status_membro: a.status_membro,
      data_expiracao: a.data_expiracao,
      graduacao: kd?.nome || null,
      cor_faixa: kd?.cor_faixa || null,
      kyu_dan_id: kd?.id || null,
    }
  })

  // Also return the active backnumber template (if configured)
  const { data: template } = await supabaseAdmin
    .from('document_templates')
    .select('background_url, field_config')
    .eq('template_type', 'backnumber')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ atletas, template: template || null })
}
