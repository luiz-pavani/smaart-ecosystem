import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  getValidAccessToken,
  createBroadcast,
  createLiveStream,
  bindBroadcastToStream,
} from '@/lib/youtube/client'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

async function getRole(userId: string) {
  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role ?? null
}

/**
 * POST /api/eventos/[id]/streams/youtube-create
 * Body: { area_id: number, titulo?: string, privacy?: 'public'|'unlisted'|'private' }
 *
 * Cria broadcast + stream no YouTube + bind, salva tudo em event_streams.
 * Upsert por (evento_id, area_id) — re-rodar com mesmo area_id substitui.
 *
 * Retorna URLs:
 *   - watch_url: assistir (https://youtube.com/watch?v=...)
 *   - studio_url: editar no YouTube Studio
 *   - ingest: { primary_url, stream_key } — pra OBS/encoder
 */
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
  const areaId = Number(body.area_id)
  if (!areaId || areaId < 1) {
    return NextResponse.json({ error: 'area_id obrigatório (>=1)' }, { status: 400 })
  }

  const tituloPart = String(body.titulo || `Tatame ${areaId}`)
  const privacy = (body.privacy || 'unlisted') as 'public' | 'unlisted' | 'private'

  // Get evento info pra título
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('id, nome, data_evento, hora_inicio')
    .eq('id', eventoId)
    .maybeSingle()
  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  // Carrega tokens válidos (renova se expirou)
  let accessToken: string
  try {
    const tokens = await getValidAccessToken(eventoId)
    accessToken = tokens.accessToken
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro'
    return NextResponse.json({ error: `YouTube não conectado: ${msg}` }, { status: 400 })
  }

  // Calcula scheduledStartTime: hora_inicio do evento ou now+1min
  const scheduledStart = (() => {
    if (evento.data_evento && evento.hora_inicio) {
      const dt = new Date(`${evento.data_evento}T${evento.hora_inicio}-03:00`)
      if (!isNaN(dt.getTime())) return dt.toISOString()
    }
    return new Date(Date.now() + 60_000).toISOString()
  })()

  const broadcastTitle = `${evento.nome} — ${tituloPart}`
  const broadcastDesc = `Transmissão ao vivo — ${evento.nome}\nTatame ${areaId}\nGerado automaticamente por Titan / SMAART PRO`

  try {
    // 1. Cria broadcast
    const broadcast = await createBroadcast(accessToken, {
      title: broadcastTitle,
      description: broadcastDesc,
      scheduledStartTime: scheduledStart,
      privacy,
    })

    // 2. Cria stream (ingest RTMP)
    const stream = await createLiveStream(accessToken, {
      title: `${broadcastTitle} [stream]`,
      resolution: '720p',
    })

    // 3. Bind broadcast ↔ stream
    await bindBroadcastToStream(accessToken, broadcast.id, stream.id)

    const watchUrl = `https://www.youtube.com/watch?v=${broadcast.id}`
    const studioUrl = `https://studio.youtube.com/video/${broadcast.id}/livestreaming`
    const ingestUrl = stream.cdn?.ingestionInfo?.ingestionAddress
    const streamKey = stream.cdn?.ingestionInfo?.streamName

    // 4. Salva em event_streams (upsert por evento + area_id)
    // Primeiro tenta achar registro existente; se houver, atualiza; senão insere.
    const { data: existing } = await supabaseAdmin
      .from('event_streams')
      .select('id, youtube_broadcast_id')
      .eq('evento_id', eventoId)
      .eq('area_id', areaId)
      .maybeSingle()

    const streamRow = {
      evento_id: eventoId,
      area_id: areaId,
      titulo: tituloPart,
      tipo: 'youtube',
      stream_url: watchUrl,
      stream_key: streamKey,
      status: 'offline',
      youtube_broadcast_id: broadcast.id,
      youtube_stream_id: stream.id,
      youtube_lifecycle_status: 'created',
      config: {
        ingest_address: ingestUrl,
        studio_url: studioUrl,
        privacy,
        scheduled_start: scheduledStart,
      },
    }

    if (existing) {
      await supabaseAdmin
        .from('event_streams')
        .update(streamRow)
        .eq('id', existing.id)
    } else {
      await supabaseAdmin.from('event_streams').insert(streamRow)
    }

    return NextResponse.json({
      ok: true,
      broadcast_id: broadcast.id,
      stream_id: stream.id,
      watch_url: watchUrl,
      studio_url: studioUrl,
      ingest: {
        primary_url: ingestUrl,
        stream_key: streamKey,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro'
    return NextResponse.json({ error: `Erro ao criar transmissão YouTube: ${msg}` }, { status: 500 })
  }
}
