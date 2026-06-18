import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isAcademyStaff, isFederationManager, isMaster } from '@/lib/auth/roles'

/**
 * GET /api/eventos/[id]/inscricao-lote/contexto?academia_id=...
 *
 * Retorna em UMA chamada tudo que a UI precisa:
 * - evento (nome, data, valor)
 * - todas categorias com age_group + weight_class (para filtragem client-side)
 * - atletas da academia (stakeholders)
 * - inscrições EXISTENTES desses atletas neste evento + status do pagamento
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const academiaId = req.nextUrl.searchParams.get('academia_id')
  if (!academiaId) return NextResponse.json({ error: 'academia_id obrigatório' }, { status: 400 })

  const { data: me } = await supabaseAdmin
    .from('stakeholders')
    .select('role, academia_id, federacao_id')
    .eq('id', user.id)
    .maybeSingle()

  // Permissão: master/federação OU staff da própria academia
  const allowed = !!me && (
    isMaster(me.role) ||
    isFederationManager(me.role) ||
    (isAcademyStaff(me.role) && me.academia_id === academiaId)
  )
  if (!allowed) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Evento
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('id, nome, data_evento, valor_inscricao, taxa_inscricao, publicado')
    .eq('id', eventoId)
    .maybeSingle()
  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  // Categorias completas com age_group + weight_class
  const { data: categories } = await supabaseAdmin
    .from('event_categories')
    .select(`
      id, nome_display, genero, taxa_inscricao, ativo,
      age_group:event_age_groups!event_categories_age_group_id_fkey(id, nome, idade_min, idade_max),
      weight_class:event_weight_classes!event_categories_weight_class_id_fkey(id, nome, peso_min, peso_max)
    `)
    .eq('evento_id', eventoId)
    .eq('ativo', true)
    .order('nome_display')

  // Atletas da academia
  const { data: atletas } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, email, telefone, genero, data_nascimento, peso_atual, kyu_dan_id, cpf')
    .eq('academia_id', academiaId)
    .eq('role', 'atleta')
    .order('nome_completo')

  const atletaIds = (atletas || []).map(a => a.id)

  // Inscrições existentes destes atletas neste evento
  const { data: inscricoes } = atletaIds.length > 0
    ? await supabaseAdmin
        .from('event_registrations')
        .select('id, atleta_id, category_id, status, valor_pago, peso_inscricao, created_at')
        .eq('event_id', eventoId)
        .in('atleta_id', atletaIds)
    : { data: [] }

  return NextResponse.json({
    evento,
    categories: categories || [],
    atletas: atletas || [],
    inscricoes: inscricoes || [],
  })
}
