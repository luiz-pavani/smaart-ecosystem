import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  notifyAtletaPlanoVencendo,
  notifyAtletaPlanoVencido,
  notifyAcademiaAnualidadeVencendo,
  notifyAcademiaAnualidadeVencida,
} from '@/lib/whatsapp/notifications'
import { sendText as sendWhatsApp } from '@/lib/whatsapp/meta'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function daysBetween(date: string): number {
  const diff = new Date(date + 'T12:00:00').getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

// GET — chamado pelo Vercel Cron (com CRON_SECRET) ou manualmente
// Query params:
//   ?dry=true  — simula o envio sem chamar a API da Meta (retorna quem seria notificado)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dry = req.nextUrl.searchParams.get('dry') === 'true'
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const results = {
    dry,
    date: new Date().toISOString(),
    atletas: { vencendo: [] as any[], vencidos: [] as any[] },
    academias: { vencendo: [] as any[], vencidas: [] as any[] },
    errors: 0,
  }

  // --- Atletas com plano vencendo (7 ou 30 dias) ---
  const { data: vencendo } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('nome_completo, telefone, data_expiracao')
    .eq('federacao_id', 1)
    .eq('status_plano', 'Válido')
    .not('telefone', 'is', null)
    .not('data_expiracao', 'is', null)

  for (const atleta of vencendo ?? []) {
    const dias = daysBetween(atleta.data_expiracao)
    if (dias === 30 || dias === 7) {
      if (!dry) {
        try {
          await notifyAtletaPlanoVencendo({
            nome_completo: atleta.nome_completo,
            telefone: atleta.telefone,
            data_expiracao: atleta.data_expiracao,
          })
        } catch { results.errors++ }
      }
      results.atletas.vencendo.push({ nome: atleta.nome_completo, telefone: atleta.telefone, dias, data: atleta.data_expiracao })
    }
  }

  // --- Atletas com plano vencido hoje ---
  const { data: vencidos } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('nome_completo, telefone, data_expiracao')
    .eq('federacao_id', 1)
    .eq('status_plano', 'Vencido')
    .not('telefone', 'is', null)
    .gte('data_expiracao', hoje.toISOString().split('T')[0])
    .lte('data_expiracao', hoje.toISOString().split('T')[0])

  for (const atleta of vencidos ?? []) {
    if (!dry) {
      try {
        await notifyAtletaPlanoVencido({
          nome_completo: atleta.nome_completo,
          telefone: atleta.telefone,
          data_expiracao: atleta.data_expiracao,
        })
      } catch { results.errors++ }
    }
    results.atletas.vencidos.push({ nome: atleta.nome_completo, telefone: atleta.telefone, data: atleta.data_expiracao })
  }

  // --- Academias com anuidade vencendo ou vencida ---
  const { data: acads } = await supabaseAdmin
    .from('academias')
    .select('nome, responsavel_nome, responsavel_telefone, anualidade_vencimento')
    .eq('ativo', true)
    .not('responsavel_telefone', 'is', null)
    .not('anualidade_vencimento', 'is', null)

  for (const academia of acads ?? []) {
    const dias = daysBetween(academia.anualidade_vencimento)
    if (dias === 30 || dias === 7) {
      if (!dry) {
        try {
          await notifyAcademiaAnualidadeVencendo({
            nome: academia.nome,
            responsavel_nome: academia.responsavel_nome,
            responsavel_telefone: academia.responsavel_telefone,
            anualidade_vencimento: academia.anualidade_vencimento,
          })
        } catch { results.errors++ }
      }
      results.academias.vencendo.push({ nome: academia.nome, telefone: academia.responsavel_telefone, dias, data: academia.anualidade_vencimento })
    } else if (dias === 0) {
      if (!dry) {
        try {
          await notifyAcademiaAnualidadeVencida({
            nome: academia.nome,
            responsavel_nome: academia.responsavel_nome,
            responsavel_telefone: academia.responsavel_telefone,
            anualidade_vencimento: academia.anualidade_vencimento,
          })
        } catch { results.errors++ }
      }
      results.academias.vencidas.push({ nome: academia.nome, telefone: academia.responsavel_telefone, data: academia.anualidade_vencimento })
    }
  }

  // --- Lembretes pré-evento (3 dias e 1 dia antes) ---
  const eventResults = { enviados: [] as any[] }

  const todayStr = hoje.toISOString().split('T')[0]
  const in1Day = new Date(hoje.getTime() + 1 * 86400000).toISOString().split('T')[0]
  const in3Days = new Date(hoje.getTime() + 3 * 86400000).toISOString().split('T')[0]

  const { data: upcomingEvents } = await supabaseAdmin
    .from('eventos')
    .select('id, nome, data_evento, local, hora_inicio')
    .eq('publicado', true)
    .in('data_evento', [in1Day, in3Days])

  for (const evento of upcomingEvents || []) {
    const diasAte = evento.data_evento === in1Day ? 1 : 3

    // Buscar inscritos com telefone
    const { data: regs } = await supabaseAdmin
      .from('event_registrations')
      .select('atleta_id, dados_atleta')
      .eq('event_id', evento.id)
      .in('status', ['confirmado', 'confirmada', 'inscrito', 'pago'])

    for (const reg of regs || []) {
      const { data: stk } = await supabaseAdmin
        .from('stakeholders')
        .select('telefone, nome_completo')
        .eq('id', reg.atleta_id)
        .maybeSingle()

      const phone = stk?.telefone?.replace(/\D/g, '')
      if (!phone || phone.length < 10) continue

      const nome = stk?.nome_completo || (reg.dados_atleta as any)?.nome || 'Atleta'
      const fullPhone = phone.startsWith('55') ? phone : `55${phone}`
      const horario = evento.hora_inicio ? ` às ${evento.hora_inicio.substring(0, 5)}` : ''
      const msg = diasAte === 1
        ? `⚡ ${nome}, AMANHÃ é o dia! *${evento.nome}*${horario}${evento.local ? ` — ${evento.local}` : ''}. Boa sorte! 🥋`
        : `📅 ${nome}, faltam *3 dias* para o *${evento.nome}*${horario}${evento.local ? ` — ${evento.local}` : ''}. Prepare-se! 💪`

      if (!dry) {
        try {
          await sendWhatsApp(fullPhone, msg)
        } catch { results.errors++ }
      }
      eventResults.enviados.push({ evento: evento.nome, nome, telefone: fullPhone, dias: diasAte })
    }
  }

  return NextResponse.json({
    ok: true,
    dry,
    date: results.date,
    summary: {
      atletas_vencendo: results.atletas.vencendo.length,
      atletas_vencidos: results.atletas.vencidos.length,
      academias_vencendo: results.academias.vencendo.length,
      academias_vencidas: results.academias.vencidas.length,
      eventos_lembretes: eventResults.enviados.length,
      errors: results.errors,
    },
    detail: { ...results, eventos: eventResults },
  })
}
