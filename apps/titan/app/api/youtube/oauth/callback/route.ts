import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exchangeCodeForTokens, getMyChannel } from '@/lib/youtube/client'

/**
 * GET /api/youtube/oauth/callback
 *
 * Callback do Google após o consent. Valida state contra cookie de nonce,
 * troca code por tokens, salva em event_streams_youtube_tokens, redireciona
 * o usuário de volta pra página de transmissão admin do evento.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/portal/eventos?yt_error=${encodeURIComponent(error)}`, req.nextUrl.origin)
    )
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'code e state obrigatórios' }, { status: 400 })
  }

  // Valida nonce do cookie vs state payload
  let payload: { evento_id: string; nonce: string }
  try {
    payload = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
  } catch {
    return NextResponse.json({ error: 'state inválido' }, { status: 400 })
  }
  const expectedNonce = req.cookies.get('yt_oauth_nonce')?.value
  if (!expectedNonce || expectedNonce !== payload.nonce) {
    return NextResponse.json({ error: 'state nonce não confere (CSRF check)' }, { status: 403 })
  }

  // Auth check — só admin que iniciou pode completar
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/youtube/oauth/callback`

  let tokenRes
  try {
    tokenRes = await exchangeCodeForTokens(code, redirectUri)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro'
    return NextResponse.redirect(
      new URL(`/portal/eventos/${payload.evento_id}/transmissao?yt_error=${encodeURIComponent(msg)}`, origin)
    )
  }

  // Busca info do canal pra mostrar no UI
  let channel: { id: string; title: string } | null = null
  try {
    channel = await getMyChannel(tokenRes.access_token)
  } catch (err) {
    console.warn('[yt-oauth] getMyChannel falhou:', err)
  }

  const expiresAt = new Date(Date.now() + tokenRes.expires_in * 1000).toISOString()

  // Upsert tokens (uma linha por evento)
  await supabaseAdmin
    .from('event_streams_youtube_tokens')
    .upsert({
      evento_id: payload.evento_id,
      access_token: tokenRes.access_token,
      refresh_token: tokenRes.refresh_token || '', // refresh_token só vem na 1ª autorização
      expires_at: expiresAt,
      scope: tokenRes.scope || null,
      channel_id: channel?.id ?? null,
      channel_title: channel?.title ?? null,
      connected_by: user.id,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'evento_id' })

  const res = NextResponse.redirect(
    new URL(`/portal/eventos/${payload.evento_id}/transmissao?yt_connected=1`, origin)
  )
  // Limpa cookie
  res.cookies.delete('yt_oauth_nonce')
  return res
}
