import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// POST /api/eventos/self/inscricao — inscrever atleta autenticado num evento
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { event_id, category_id, peso_inscricao } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id obrigatório' }, { status: 400 })

  // Verificar se evento existe
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('id, nome, data_evento, status, limite_inscritos, valor_inscricao, inscricao_inicio, inscricao_fim, publicado')
    .eq('id', event_id)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  if (!evento.publicado) return NextResponse.json({ error: 'Evento não está publicado' }, { status: 400 })

  // Verificar status do evento
  if (evento.status !== 'Inscrições abertas') {
    return NextResponse.json({ error: `Inscrições não estão abertas (status: ${evento.status})` }, { status: 400 })
  }

  // Verificar período de inscrição
  const today = new Date().toISOString().split('T')[0]
  if (evento.inscricao_inicio && today < evento.inscricao_inicio) {
    return NextResponse.json({ error: `Inscrições abrem em ${evento.inscricao_inicio}` }, { status: 400 })
  }
  if (evento.inscricao_fim && today > evento.inscricao_fim) {
    return NextResponse.json({ error: 'Período de inscrição encerrado' }, { status: 400 })
  }
  if (new Date(evento.data_evento) < new Date(today)) {
    return NextResponse.json({ error: 'Evento já encerrado' }, { status: 400 })
  }

  // Verificar inscrição duplicada (mesma categoria ou sem categoria)
  let dupQuery = supabaseAdmin
    .from('event_registrations')
    .select('id')
    .eq('event_id', event_id)
    .eq('atleta_id', user.id)
  if (category_id) {
    dupQuery = dupQuery.eq('category_id', category_id)
  }
  const { data: existing } = await dupQuery.maybeSingle()
  if (existing) return NextResponse.json({ error: 'Já inscrito nesta categoria' }, { status: 409 })

  // Determinar valor da inscrição: da categoria (prioridade) ou do evento (fallback)
  let valorInscricao = 0
  let categoryData = null

  if (category_id) {
    const { data: cat } = await supabaseAdmin
      .from('event_categories')
      .select('id, taxa_inscricao, limite_inscritos, nome_display, ativo, evento_id')
      .eq('id', category_id)
      .maybeSingle()

    if (!cat) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    if (!cat.ativo) return NextResponse.json({ error: 'Categoria não está ativa' }, { status: 400 })
    if (cat.evento_id !== event_id) return NextResponse.json({ error: 'Categoria não pertence a este evento' }, { status: 400 })

    // Verificar limite da categoria
    if (cat.limite_inscritos) {
      const { count } = await supabaseAdmin
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category_id)
      if ((count || 0) >= cat.limite_inscritos) {
        return NextResponse.json({ error: 'Categoria com vagas esgotadas' }, { status: 400 })
      }
    }

    valorInscricao = Number(cat.taxa_inscricao) || 0
    categoryData = cat
  } else {
    // Sem categoria: usa valor do evento (backward compat)
    valorInscricao = Number(evento.valor_inscricao) || 0

    // Verificar limite global
    if (evento.limite_inscritos) {
      const { count } = await supabaseAdmin
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event_id)
      if ((count || 0) >= evento.limite_inscritos) {
        return NextResponse.json({ error: 'Evento com vagas esgotadas' }, { status: 400 })
      }
    }
  }

  // Buscar dados do atleta para snapshot
  const { data: stakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('nome_completo, academia_id, kyu_dan_id, genero, data_nascimento, peso_atual')
    .eq('id', user.id)
    .maybeSingle()

  const statusInicial = valorInscricao > 0 ? 'pending_payment' : 'confirmed'

  const { data, error } = await supabaseAdmin
    .from('event_registrations')
    .insert({
      event_id,
      atleta_id: user.id,
      category_id: category_id || null,
      peso_inscricao: peso_inscricao || stakeholder?.peso_atual || null,
      academia_id: stakeholder?.academia_id || null,
      dados_atleta: stakeholder ? {
        nome: stakeholder.nome_completo,
        genero: stakeholder.genero,
        data_nascimento: stakeholder.data_nascimento,
        kyu_dan_id: stakeholder.kyu_dan_id,
        peso: peso_inscricao || stakeholder.peso_atual,
      } : {},
      status: statusInicial,
      registration_date: today,
      valor_pago: valorInscricao > 0 ? valorInscricao : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    data,
    needs_payment: valorInscricao > 0,
    valor: valorInscricao,
    categoria: categoryData?.nome_display || null,
  }, { status: 201 })
}

// DELETE /api/eventos/self/inscricao?event_id=xxx&category_id=xxx — cancelar inscrição
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const event_id = req.nextUrl.searchParams.get('event_id')
  const category_id = req.nextUrl.searchParams.get('category_id')
  if (!event_id) return NextResponse.json({ error: 'event_id obrigatório' }, { status: 400 })

  let query = supabaseAdmin
    .from('event_registrations')
    .select('id, status')
    .eq('event_id', event_id)
    .eq('atleta_id', user.id)
  if (category_id) query = query.eq('category_id', category_id)

  const { data: reg } = await query.maybeSingle()
  if (!reg) return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })

  if (reg.status === 'confirmed') {
    const { data: evento } = await supabaseAdmin
      .from('eventos')
      .select('status')
      .eq('id', event_id)
      .maybeSingle()
    if (evento && ['Em andamento', 'Encerrado'].includes(evento.status)) {
      return NextResponse.json({ error: 'Não é possível cancelar inscrição de evento em andamento ou encerrado' }, { status: 400 })
    }
  }

  let deleteQuery = supabaseAdmin
    .from('event_registrations')
    .delete()
    .eq('event_id', event_id)
    .eq('atleta_id', user.id)
  if (category_id) deleteQuery = deleteQuery.eq('category_id', category_id)

  const { error } = await deleteQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
