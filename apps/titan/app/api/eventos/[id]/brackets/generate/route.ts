import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateBracket, BracketType, BracketConfig, BracketRule, resolveBracketType, DEFAULT_BRACKET_RULES } from '@/lib/eventos/bracket-generator'
import { Registration } from '@/lib/eventos/bracket-common'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

async function getRole(userId: string) {
  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role ?? null
}

// POST /api/eventos/[id]/brackets/generate — gerar chaves para categorias
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const {
    category_ids,
    tipo: tipoOverride,
    config = {},
  }: {
    category_ids: string[]
    tipo?: BracketType
    config?: BracketConfig
  } = body

  if (!category_ids || category_ids.length === 0) {
    return NextResponse.json({ error: 'category_ids obrigatório' }, { status: 400 })
  }

  // Load bracket rules from event config
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('config')
    .eq('id', eventoId)
    .maybeSingle()
  const eventConfig = (evento?.config as Record<string, unknown>) || {}
  const bracketRules = (eventConfig.bracket_rules as BracketRule[] | undefined) || DEFAULT_BRACKET_RULES

  const results: { category_id: string; bracket_id: string; bracket_tipo: string; athletes: number; matches: number; error?: string }[] = []

  for (const categoryId of category_ids) {
    try {
      // Check if bracket already exists for this category
      const { data: existing } = await supabaseAdmin
        .from('event_brackets')
        .select('id')
        .eq('category_id', categoryId)
        .maybeSingle()

      if (existing) {
        results.push({ category_id: categoryId, bracket_id: existing.id, bracket_tipo: '', athletes: 0, matches: 0, error: 'Chave já existe para esta categoria' })
        continue
      }

      // Get category mode (competitivo vs festival)
      const { data: catData } = await supabaseAdmin
        .from('event_categories')
        .select('modo')
        .eq('id', categoryId)
        .maybeSingle()
      const isFestival = catData?.modo === 'festival'

      // Get confirmed registrations for this category
      const { data: regs } = await supabaseAdmin
        .from('event_registrations')
        .select('id, atleta_id, academia_id, dados_atleta')
        .eq('event_id', eventoId)
        .eq('category_id', categoryId)
        .in('status', ['confirmada', 'pendente', 'confirmed'])
        .order('created_at', { ascending: true })

      if (!regs || regs.length === 0) {
        results.push({ category_id: categoryId, bracket_id: '', bracket_tipo: '', athletes: 0, matches: 0, error: 'Nenhum atleta inscrito' })
        continue
      }

      // Festival mode: always round_robin regardless of athlete count or rules
      // Competitivo: resolve bracket type from rules (or use override)
      const resolvedTipo = isFestival ? 'round_robin' : (tipoOverride || resolveBracketType(regs.length, bracketRules))

      // Handle gold_medal (1 athlete — auto-win, no bracket needed)
      if (resolvedTipo === 'gold_medal') {
        const { data: bracketRow } = await supabaseAdmin
          .from('event_brackets')
          .insert({
            evento_id: eventoId,
            category_id: categoryId,
            tipo: 'single_elimination',
            status: 'finished',
            num_rodadas: 0,
            seed_method: 'random',
            config: { gold_medal: true },
          })
          .select('id')
          .single()
        if (bracketRow) {
          // Auto-create result: 1st place
          await supabaseAdmin.from('event_results').insert({
            evento_id: eventoId,
            bracket_id: bracketRow.id,
            registration_id: regs[0].id,
            medal: 'gold',
            colocacao: 1,
          })
        }
        results.push({ category_id: categoryId, bracket_id: bracketRow?.id || '', bracket_tipo: 'gold_medal', athletes: 1, matches: 0 })
        continue
      }

      // Map to Registration type
      const registrations: Registration[] = regs.map(r => ({
        id: r.id,
        atleta_id: r.atleta_id,
        academia_id: r.academia_id,
        dados_atleta: r.dados_atleta || {},
      }))

      // Generate bracket
      const bracket = generateBracket(resolvedTipo as BracketType, registrations, config)

      // Insert bracket
      const bracketConfig = isFestival ? { ...config, festival: true } : config
      const { data: bracketRow, error: bracketErr } = await supabaseAdmin
        .from('event_brackets')
        .insert({
          evento_id: eventoId,
          category_id: categoryId,
          tipo: bracket.tipo,
          status: 'draft',
          num_rodadas: bracket.num_rodadas,
          seed_method: config.seed_method || 'random',
          config: bracketConfig,
        })
        .select('id')
        .single()

      if (bracketErr || !bracketRow) {
        results.push({ category_id: categoryId, bracket_id: '', bracket_tipo: '', athletes: regs.length, matches: 0, error: bracketErr?.message || 'Erro ao criar chave' })
        continue
      }

      const bracketId = bracketRow.id

      // Insert slots
      const slotsToInsert = bracket.slots.map(s => ({
        bracket_id: bracketId,
        rodada: s.rodada,
        posicao: s.posicao,
        registration_id: s.registration_id,
        is_bye: s.is_bye,
        seed_number: s.seed_number,
      }))

      if (slotsToInsert.length > 0) {
        const { error: slotsErr } = await supabaseAdmin
          .from('event_bracket_slots')
          .insert(slotsToInsert)

        if (slotsErr) {
          // Cleanup bracket
          await supabaseAdmin.from('event_brackets').delete().eq('id', bracketId)
          results.push({ category_id: categoryId, bracket_id: '', bracket_tipo: '', athletes: regs.length, matches: 0, error: `Erro nos slots: ${slotsErr.message}` })
          continue
        }
      }

      // Insert matches
      const matchesToInsert = bracket.matches.map(m => ({
        bracket_id: bracketId,
        rodada: m.rodada,
        posicao: m.posicao,
        match_number: m.match_number,
        athlete1_registration_id: m.athlete1_registration_id,
        athlete2_registration_id: m.athlete2_registration_id,
        tipo: m.tipo,
        status: m.status,
      }))

      if (matchesToInsert.length > 0) {
        const { error: matchErr } = await supabaseAdmin
          .from('event_matches')
          .insert(matchesToInsert)

        if (matchErr) {
          // Cleanup
          await supabaseAdmin.from('event_bracket_slots').delete().eq('bracket_id', bracketId)
          await supabaseAdmin.from('event_brackets').delete().eq('id', bracketId)
          results.push({ category_id: categoryId, bracket_id: '', bracket_tipo: '', athletes: regs.length, matches: 0, error: `Erro nos matches: ${matchErr.message}` })
          continue
        }
      }

      results.push({
        category_id: categoryId,
        bracket_id: bracketId,
        bracket_tipo: bracket.tipo,
        athletes: regs.length,
        matches: matchesToInsert.length,
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      results.push({ category_id: categoryId, bracket_id: '', bracket_tipo: '', athletes: 0, matches: 0, error: msg })
    }
  }

  const total = results.filter(r => !r.error).length
  return NextResponse.json({ total, results })
}
