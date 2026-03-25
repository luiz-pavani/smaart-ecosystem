import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/federacao/backnumbers
// Returns athletes with all data needed for backnumber generation.
// Query params: status, search, academia_id
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role, federacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil || (perfil.role !== 'master_access' && !perfil.federacao_id)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const p = req.nextUrl.searchParams
  const statusFilter = p.get('status') || ''
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
      siglas,
      tamanho_patch,
      cor_patch,
      status_plano,
      status_membro,
      data_expiracao,
      lote_id
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
  if (search) query = query.ilike('nome_completo', `%${search}%`)
  if (academiaId) query = query.eq('academia_id', academiaId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Batch lookup academias for nome + sigla fallback
  const acadIds = [...new Set(
    (data ?? [])
      .filter((a: any) => a.academia_id)
      .map((a: any) => a.academia_id as string)
  )]

  const acadNomeMap: Record<string, string> = {}
  const acadSiglaMap: Record<string, string> = {}
  if (acadIds.length > 0) {
    const { data: acads } = await supabaseAdmin
      .from('academias')
      .select('id, nome, sigla')
      .in('id', acadIds)
    for (const ac of acads ?? []) {
      if ((ac as any).nome) acadNomeMap[(ac as any).id] = (ac as any).nome
      if ((ac as any).sigla) acadSiglaMap[(ac as any).id] = (ac as any).sigla
    }
  }

  const atletas = (data ?? []).map((a: any) => ({
    id: a.id as number,
    stakeholder_id: a.stakeholder_id as string,
    nome_completo: a.nome_completo as string,
    nome_patch: (a.nome_patch || a.nome_completo) as string,
    // academia name: from academias table (real name) → text column fallback → '—'
    academia: (acadNomeMap[a.academia_id] || a.academias || '—') as string,
    academia_id: a.academia_id as string | null,
    // sigla: athlete override → academia fallback → ''
    sigla: (a.siglas || acadSiglaMap[a.academia_id] || '') as string,
    tamanho: ((a.tamanho_patch as string) || 'P') as 'P' | 'M' | 'G',
    cor: ((a.cor_patch as string) || 'azul') as 'azul' | 'rosa',
    status_plano: a.status_plano as string | null,
    data_expiracao: a.data_expiracao as string | null,
    lote_id: (a.lote_id || null) as string | null,
  }))

  // Fetch both backnumber templates (azul + rosa)
  const { data: templates } = await supabaseAdmin
    .from('document_templates')
    .select('template_type, background_url')
    .in('template_type', ['backnumber_azul', 'backnumber_rosa'])
    .eq('is_active', true)

  const templateUrls: Record<string, string> = {}
  for (const t of templates ?? []) {
    const key = (t as any).template_type.replace('backnumber_', '')
    templateUrls[key] = (t as any).background_url
  }

  return NextResponse.json({ atletas, templates: templateUrls })
}
