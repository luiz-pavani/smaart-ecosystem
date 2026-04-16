import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendText } from '@/lib/whatsapp/meta'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.startsWith('55') ? digits : `55${digits}`
}

// GET /api/eventos/[id]/notifications — listar notificações enviadas
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const tipo = req.nextUrl.searchParams.get('tipo') || null

  let query = supabaseAdmin
    .from('event_notifications')
    .select('*')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (tipo) query = query.eq('tipo', tipo)

  const { data } = await query
  return NextResponse.json({ notifications: data || [] })
}

// POST /api/eventos/[id]/notifications — enviar notificações em massa
// body: { tipo, mensagem, category_id?, area_id? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stk } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).maybeSingle()
  if (!stk || !ADMIN_ROLES.includes(stk.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { tipo, mensagem, category_id, area_id, registration_ids } = body as {
    tipo: string
    mensagem: string
    category_id?: string
    area_id?: number
    registration_ids?: string[]
  }

  if (!tipo || !mensagem) return NextResponse.json({ error: 'tipo e mensagem obrigatórios' }, { status: 400 })

  // Build target list
  let targetRegs: { id: string; atleta_id: string; dados_atleta: Record<string, unknown> }[] = []

  if (registration_ids && registration_ids.length > 0) {
    // Specific registrations
    const { data } = await supabaseAdmin
      .from('event_registrations')
      .select('id, atleta_id, dados_atleta')
      .in('id', registration_ids)
    targetRegs = data || []
  } else if (category_id) {
    // All athletes in a category
    const { data } = await supabaseAdmin
      .from('event_registrations')
      .select('id, atleta_id, dados_atleta')
      .eq('event_id', eventoId)
      .eq('category_id', category_id)
    targetRegs = data || []
  } else if (area_id) {
    // All athletes with matches in a specific area
    const { data: brackets } = await supabaseAdmin
      .from('event_brackets')
      .select('id')
      .eq('evento_id', eventoId)
      .eq('area_id', area_id)

    if (brackets && brackets.length > 0) {
      const bracketIds = brackets.map(b => b.id)
      const { data: matches } = await supabaseAdmin
        .from('event_matches')
        .select('athlete1_registration_id, athlete2_registration_id')
        .in('bracket_id', bracketIds)
        .in('status', ['pending', 'ready'])

      const regIds = new Set<string>()
      for (const m of matches || []) {
        if (m.athlete1_registration_id) regIds.add(m.athlete1_registration_id)
        if (m.athlete2_registration_id) regIds.add(m.athlete2_registration_id)
      }

      if (regIds.size > 0) {
        const { data } = await supabaseAdmin
          .from('event_registrations')
          .select('id, atleta_id, dados_atleta')
          .in('id', Array.from(regIds))
        targetRegs = data || []
      }
    }
  } else {
    // All event registrations
    const { data } = await supabaseAdmin
      .from('event_registrations')
      .select('id, atleta_id, dados_atleta')
      .eq('event_id', eventoId)
    targetRegs = data || []
  }

  if (targetRegs.length === 0) {
    return NextResponse.json({ error: 'Nenhum atleta para notificar' }, { status: 400 })
  }

  // Get phone numbers from stakeholders
  const atletaIds = [...new Set(targetRegs.map(r => r.atleta_id))]
  const { data: stakeholders } = await supabaseAdmin
    .from('stakeholders')
    .select('id, telefone, celular')
    .in('id', atletaIds)

  const phoneMap: Record<string, string | null> = {}
  for (const s of stakeholders || []) {
    phoneMap[s.id] = normalizePhone(s.telefone || s.celular)
  }

  // Also try user_fed_lrsj for phone
  const { data: fedData } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('stakeholder_id, telefone, celular')
    .in('stakeholder_id', atletaIds)

  for (const f of fedData || []) {
    if (!phoneMap[f.stakeholder_id]) {
      phoneMap[f.stakeholder_id] = normalizePhone(f.telefone || f.celular)
    }
  }

  let sent = 0, skipped = 0, failed = 0
  const notifRows: Record<string, unknown>[] = []

  for (const reg of targetRegs) {
    const phone = phoneMap[reg.atleta_id]
    const nome = (reg.dados_atleta?.nome_completo as string) || (reg.dados_atleta?.nome as string) || 'Atleta'
    const msgPersonalizada = mensagem.replace('{{nome}}', nome)

    const notif: Record<string, unknown> = {
      evento_id: eventoId,
      registration_id: reg.id,
      atleta_id: reg.atleta_id,
      tipo,
      canal: 'whatsapp',
      telefone: phone,
      mensagem: msgPersonalizada,
    }

    if (!phone) {
      notif.status = 'skipped'
      notif.erro = 'Sem telefone'
      skipped++
      notifRows.push(notif)
      continue
    }

    try {
      await sendText(phone, msgPersonalizada)
      notif.status = 'sent'
      notif.enviado_em = new Date().toISOString()
      sent++
    } catch (e: unknown) {
      notif.status = 'failed'
      notif.erro = e instanceof Error ? e.message : 'Erro'
      failed++
    }

    notifRows.push(notif)
  }

  // Log all notifications
  if (notifRows.length > 0) {
    await supabaseAdmin.from('event_notifications').insert(notifRows)
  }

  return NextResponse.json({ total: targetRegs.length, sent, skipped, failed })
}
