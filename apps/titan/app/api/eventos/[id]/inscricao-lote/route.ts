import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

// POST /api/eventos/[id]/inscricao-lote — inscrição em lote pelo coach/admin
// body: { inscricoes: [{ atleta_id, category_id, peso_inscricao? }] }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Check: admin OR academia coach (stakeholder with academia_id)
  const { data: stk } = await supabaseAdmin
    .from('stakeholders')
    .select('role, academia_id')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = stk && ADMIN_ROLES.includes(stk.role)
  const isCoach = stk && stk.role === 'academia_gestor'
  if (!isAdmin && !isCoach) {
    return NextResponse.json({ error: 'Sem permissão (admin ou gestor de academia)' }, { status: 403 })
  }

  // Verify event
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('id, status, publicado')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const body = await req.json()
  const { inscricoes } = body as { inscricoes: { atleta_id: string; category_id: string; peso_inscricao?: number }[] }

  if (!inscricoes || inscricoes.length === 0) {
    return NextResponse.json({ error: 'inscricoes array obrigatório' }, { status: 400 })
  }

  // If coach, validate that all athletes belong to their academy
  if (isCoach && stk.academia_id) {
    const atletaIds = inscricoes.map(i => i.atleta_id)
    const { data: fedData } = await supabaseAdmin
      .from('user_fed_lrsj')
      .select('stakeholder_id')
      .eq('academia_id', stk.academia_id)
      .in('stakeholder_id', atletaIds)

    const validIds = new Set((fedData || []).map(f => f.stakeholder_id))
    const invalid = atletaIds.filter(id => !validIds.has(id))
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Atletas não pertencem à sua academia: ${invalid.length}` }, { status: 403 })
    }
  }

  // Check for mandatory waivers
  const { data: mandatoryWaivers } = await supabaseAdmin
    .from('event_waivers')
    .select('id')
    .eq('evento_id', eventoId)
    .eq('ativo', true)
    .eq('obrigatorio', true)

  const hasMandatoryWaivers = (mandatoryWaivers || []).length > 0
  const statusInicial = hasMandatoryWaivers ? 'pending_waivers' : 'confirmada'

  const results: { atleta_id: string; status: 'ok' | 'error'; message?: string; registration_id?: string }[] = []

  for (const insc of inscricoes) {
    try {
      // Check duplicate
      const { data: existing } = await supabaseAdmin
        .from('event_registrations')
        .select('id')
        .eq('event_id', eventoId)
        .eq('atleta_id', insc.atleta_id)
        .eq('category_id', insc.category_id)
        .maybeSingle()

      if (existing) {
        results.push({ atleta_id: insc.atleta_id, status: 'error', message: 'Já inscrito nesta categoria' })
        continue
      }

      // Get athlete data for snapshot
      const { data: stkData } = await supabaseAdmin
        .from('stakeholders')
        .select('full_name, academia_id, kyu_dan_id, genero, data_nascimento, peso_atual')
        .eq('id', insc.atleta_id)
        .maybeSingle()

      const { data: reg, error } = await supabaseAdmin
        .from('event_registrations')
        .insert({
          event_id: eventoId,
          atleta_id: insc.atleta_id,
          category_id: insc.category_id,
          peso_inscricao: insc.peso_inscricao || stkData?.peso_atual || null,
          academia_id: stkData?.academia_id || null,
          dados_atleta: stkData ? {
            nome_completo: stkData.full_name,
            genero: stkData.genero,
            data_nascimento: stkData.data_nascimento,
            kyu_dan_id: stkData.kyu_dan_id,
            peso: insc.peso_inscricao || stkData.peso_atual,
            academia: '', // Will be enriched later
          } : {},
          status: statusInicial,
          registration_date: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single()

      if (error) {
        results.push({ atleta_id: insc.atleta_id, status: 'error', message: error.message })
      } else {
        // Enrich with academia name
        if (stkData?.academia_id) {
          const { data: acad } = await supabaseAdmin
            .from('academias')
            .select('nome')
            .eq('id', stkData.academia_id)
            .maybeSingle()
          if (acad) {
            await supabaseAdmin
              .from('event_registrations')
              .update({ dados_atleta: { ...((reg as any)?.dados_atleta || {}), academia: acad.nome } })
              .eq('id', reg.id)
          }
        }
        results.push({ atleta_id: insc.atleta_id, status: 'ok', registration_id: reg.id })
      }
    } catch (e: unknown) {
      results.push({ atleta_id: insc.atleta_id, status: 'error', message: e instanceof Error ? e.message : 'Erro' })
    }
  }

  const ok = results.filter(r => r.status === 'ok').length
  const errors = results.filter(r => r.status === 'error').length

  return NextResponse.json({ total: results.length, ok, errors, results, needs_waivers: hasMandatoryWaivers })
}
