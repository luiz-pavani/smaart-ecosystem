/**
 * YouTube Data API v3 client minimal — só o que o Titan precisa.
 *
 * Não usamos a googleapis SDK oficial pra evitar bundle pesado (~3MB).
 * REST direto + fetch.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'

const OAUTH_BASE = 'https://oauth2.googleapis.com'
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3'

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ')

export interface YouTubeTokens {
  evento_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  scope: string | null
  channel_id: string | null
  channel_title: string | null
}

interface OAuthTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
  token_type: string
}

/**
 * Troca authorization code por access + refresh tokens.
 * Usado no callback OAuth.
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OAuth exchange failed: ${res.status} ${body}`)
  }

  return res.json()
}

/**
 * Renova access_token usando refresh_token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    grant_type: 'refresh_token',
  })

  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token refresh failed: ${res.status} ${body}`)
  }

  return res.json()
}

/**
 * Carrega tokens do banco e renova access se já expirou (ou está prestes a expirar).
 * Retorna access_token utilizável.
 */
export async function getValidAccessToken(eventoId: string): Promise<{ accessToken: string; channelTitle: string | null }> {
  const { data: tokens } = await supabaseAdmin
    .from('event_streams_youtube_tokens')
    .select('*')
    .eq('evento_id', eventoId)
    .maybeSingle()

  if (!tokens) throw new Error('Canal YouTube não conectado a este evento')

  const expiresAt = new Date(tokens.expires_at)
  const now = new Date()
  // Renova se já expirou ou expira nos próximos 60s
  if (expiresAt.getTime() - now.getTime() < 60_000) {
    const fresh = await refreshAccessToken(tokens.refresh_token)
    const newExpiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString()
    await supabaseAdmin
      .from('event_streams_youtube_tokens')
      .update({
        access_token: fresh.access_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('evento_id', eventoId)
    return { accessToken: fresh.access_token, channelTitle: tokens.channel_title }
  }

  return { accessToken: tokens.access_token, channelTitle: tokens.channel_title }
}

/**
 * Helper genérico de chamada autenticada à YouTube API.
 */
async function ytFetch(
  accessToken: string,
  path: string,
  init: RequestInit = {}
): Promise<any> {
  const url = path.startsWith('http') ? path : `${YT_API_BASE}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YouTube API ${res.status} on ${path}: ${body}`)
  }
  return res.json()
}

/**
 * Lê info do canal do usuário autenticado (usado pra mostrar no UI qual canal
 * está conectado).
 */
export async function getMyChannel(accessToken: string): Promise<{ id: string; title: string } | null> {
  const json = await ytFetch(accessToken, '/channels?part=snippet&mine=true')
  const item = json.items?.[0]
  if (!item) return null
  return { id: item.id, title: item.snippet?.title || '' }
}

/**
 * Cria um liveBroadcast (= evento da live).
 * O broadcast NÃO tem ingest endpoint sozinho — precisa ser bound a um liveStream.
 */
export async function createBroadcast(
  accessToken: string,
  params: { title: string; description?: string; scheduledStartTime: string; privacy?: 'public' | 'unlisted' | 'private' }
): Promise<{ id: string; snippet: any; status: any }> {
  const body = {
    snippet: {
      title: params.title.slice(0, 100),
      description: params.description?.slice(0, 5000) || '',
      scheduledStartTime: params.scheduledStartTime,
    },
    status: {
      privacyStatus: params.privacy || 'unlisted',
      selfDeclaredMadeForKids: false,
    },
    contentDetails: {
      enableAutoStart: true,
      enableAutoStop: true,
      enableDvr: true,
    },
  }

  return ytFetch(accessToken, '/liveBroadcasts?part=snippet,status,contentDetails', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Cria um liveStream (= ingest endpoint RTMP onde o encoder envia o vídeo).
 */
export async function createLiveStream(
  accessToken: string,
  params: { title: string; resolution?: '1080p' | '720p' | '480p' }
): Promise<{ id: string; cdn: { ingestionInfo: { streamName: string; ingestionAddress: string } } }> {
  const body = {
    snippet: {
      title: params.title.slice(0, 100),
    },
    cdn: {
      frameRate: '30fps',
      resolution: params.resolution || '720p',
      ingestionType: 'rtmp',
    },
  }

  return ytFetch(accessToken, '/liveStreams?part=snippet,cdn,status', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Liga um liveBroadcast a um liveStream (pra que o vídeo do stream apareça no
 * broadcast quando começar).
 */
export async function bindBroadcastToStream(
  accessToken: string,
  broadcastId: string,
  streamId: string
): Promise<any> {
  return ytFetch(
    accessToken,
    `/liveBroadcasts/bind?part=id,snippet,contentDetails,status&id=${broadcastId}&streamId=${streamId}`,
    { method: 'POST' }
  )
}

/**
 * Transição do broadcast pra um novo estado de lifecycle.
 * Estados: testing | live | complete.
 */
export async function transitionBroadcast(
  accessToken: string,
  broadcastId: string,
  status: 'testing' | 'live' | 'complete'
): Promise<any> {
  return ytFetch(
    accessToken,
    `/liveBroadcasts/transition?part=id,status&id=${broadcastId}&broadcastStatus=${status}`,
    { method: 'POST' }
  )
}

/**
 * Revoga (deleta) um liveBroadcast.
 */
export async function deleteBroadcast(accessToken: string, broadcastId: string): Promise<void> {
  await ytFetch(accessToken, `/liveBroadcasts?id=${broadcastId}`, { method: 'DELETE' })
}
