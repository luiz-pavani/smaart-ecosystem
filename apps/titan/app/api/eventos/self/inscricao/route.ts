import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// POST /api/eventos/self/inscricao — inscrever atleta autenticado num evento
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { event_id } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id obrigatório' }, { status: 400 })

  // Verificar se evento existe e está aberto
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('id, nome, data_evento, status, limite_inscritos')
    .eq('id', event_id)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const now = new Date()
  if (new Date(evento.data_evento) < now) {
    return NextResponse.json({ error: 'Evento já encerrado' }, { status: 400 })
  }

  // Verificar inscrição duplicada
  const { data: existing } = await supabaseAdmin
    .from('event_registrations')
    .select('id')
    .eq('event_id', event_id)
    .eq('atleta_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Já inscrito neste evento' }, { status: 409 })

  // Verificar limite de inscritos
  if (evento.limite_inscritos) {
    const { count } = await supabaseAdmin
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event_id)

    if ((count || 0) >= evento.limite_inscritos) {
      return NextResponse.json({ error: 'Evento com vagas esgotadas' }, { status: 400 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('event_registrations')
    .insert({
      event_id,
      atleta_id: user.id,
      status: 'confirmed',
      registration_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

// DELETE /api/eventos/self/inscricao?event_id=xxx — cancelar inscrição
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const event_id = req.nextUrl.searchParams.get('event_id')
  if (!event_id) return NextResponse.json({ error: 'event_id obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('event_registrations')
    .delete()
    .eq('event_id', event_id)
    .eq('atleta_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
