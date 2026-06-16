import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyAtletaProximaLuta } from '@/lib/whatsapp/notifications'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/whatsapp/proxima-luta-cron
 *
 * Cron que roda a cada 1-2 minutos durante eventos ativos. Para cada match
 * com status='ready' (= ambos atletas confirmados, vai ser chamado) cuja
 * hora_estimada está nos próximos 5-15 minutos, dispara WhatsApp pros 2 atletas
 * com aviso "sua próxima luta".
 *
 * Dedup via event_notifications.match_id — unique index garante que cada
 * (atleta, match, 'proxima_luta') só envia uma vez.
 *
 * Body/query:
 *   ?dry=true  — simula
 *   ?lead=15   — minutos antes da luta pra disparar (default 10)
 *
 * Cron secret obrigatório no header x-cron-secret.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dry = req.nextUrl.searchParams.get('dry') === 'true'
  const leadMin = Math.max(1, Math.min(60, Number(req.nextUrl.searchParams.get('lead')) || 10))

  // Pega eventos ativos hoje
  const today = new Date().toISOString().split('T')[0]
  const { data: eventos } = await supabaseAdmin
    .from('eventos')
    .select('id, nome, data_evento, data_evento_fim, hora_inicio, status, num_areas')
    .lte('data_evento', today)
    .or(`data_evento_fim.gte.${today},data_evento_fim.is.null`)
    .in('status', ['Em andamento', 'Inscrições encerradas'])

  if (!eventos || eventos.length === 0) {
    return NextResponse.json({ ok: true, eventos_ativos: 0, enviados: [] })
  }

  type EnviadoEntry = { evento: string; match_id: string; atleta: string; tatame: number | string; categoria: string; ordem: string }
  const enviados: EnviadoEntry[] = []
  let errors = 0
  let dedupSkips = 0

  // Hora atual em minutos do dia (servidor está em UTC, vou usar local Brasil offset -3)
  const now = new Date()
  // Brasil = UTC-3 (sem horário de verão)
  const localNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const nowMin = localNow.getUTCHours() * 60 + localNow.getUTCMinutes()

  for (const evento of eventos) {
    // Carrega matches 'ready' com hora_estimada nos próximos leadMin minutos
    const { data: matches } = await supabaseAdmin
      .from('event_matches')
      .select(`
        id, hora_estimada, area_id, match_number, status,
        athlete1_registration_id, athlete2_registration_id,
        bracket:event_brackets!inner(evento_id, category:event_categories(nome_display))
      `)
      .eq('bracket.evento_id', evento.id)
      .eq('status', 'ready')

    if (!matches || matches.length === 0) continue

    for (const m of matches) {
      if (!m.hora_estimada) continue
      const [hh, mm] = (m.hora_estimada as string).split(':').map(Number)
      const matchMin = hh * 60 + mm
      const deltaMin = matchMin - nowMin
      // Notifica se hora_estimada está entre [now, now + leadMin]
      // Janela apertada: máx 2 minutos antes do janelão começar pra cobrir
      // o caso do cron rodar a cada 2 min e perder o disparo.
      if (deltaMin < -2 || deltaMin > leadMin) continue

      const categoria = (m.bracket as any)?.category?.nome_display || 'Categoria'

      // Para cada atleta da luta
      for (const regId of [m.athlete1_registration_id, m.athlete2_registration_id]) {
        if (!regId) continue

        // Busca dados do atleta + stakeholder
        const { data: reg } = await supabaseAdmin
          .from('event_registrations')
          .select(`
            id, atleta_id, dados_atleta,
            atleta:stakeholders!event_registrations_atleta_id_fkey(nome_completo, telefone)
          `)
          .eq('id', regId)
          .maybeSingle()

        if (!reg?.atleta_id) continue
        const atleta = reg.atleta as any
        const telefone = atleta?.telefone
        if (!telefone) continue

        const nome = atleta?.nome_completo || (reg.dados_atleta as any)?.nome || 'Atleta'

        // Dedup: já notificou? — confia no unique index pra evitar race
        if (!dry) {
          const { error: insertErr } = await supabaseAdmin
            .from('event_notifications')
            .insert({
              evento_id: evento.id,
              match_id: m.id,
              registration_id: reg.id,
              atleta_id: reg.atleta_id,
              tipo: 'proxima_luta',
              canal: 'whatsapp',
              telefone,
              template: 'lrsj_proxima_luta',
              status: 'pending',
            })

          if (insertErr) {
            // Provavelmente violação do unique → já notificado
            if (insertErr.code === '23505') {
              dedupSkips++
              continue
            }
            errors++
            continue
          }

          try {
            await notifyAtletaProximaLuta({
              nome_completo: nome,
              telefone,
              categoria,
              tatame: String(m.area_id ?? '?'),
              ordem_na_fila: `~${Math.max(0, deltaMin)} min`,
            })
            await supabaseAdmin
              .from('event_notifications')
              .update({ status: 'sent', enviado_em: new Date().toISOString() })
              .eq('atleta_id', reg.atleta_id)
              .eq('match_id', m.id)
              .eq('tipo', 'proxima_luta')
          } catch (err) {
            errors++
            await supabaseAdmin
              .from('event_notifications')
              .update({ status: 'failed', erro: err instanceof Error ? err.message : 'erro' })
              .eq('atleta_id', reg.atleta_id)
              .eq('match_id', m.id)
              .eq('tipo', 'proxima_luta')
          }
        }

        enviados.push({
          evento: evento.nome,
          match_id: m.id,
          atleta: nome,
          tatame: m.area_id ?? '?',
          categoria,
          ordem: `~${Math.max(0, deltaMin)} min`,
        })
      }
    }
  }

  return NextResponse.json({
    ok: true,
    dry,
    eventos_ativos: eventos.length,
    enviados,
    summary: {
      total_enviados: enviados.length,
      dedup_skips: dedupSkips,
      errors,
    },
  })
}
