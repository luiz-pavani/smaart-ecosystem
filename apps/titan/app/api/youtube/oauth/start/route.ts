import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { YOUTUBE_SCOPES } from '@/lib/youtube/client'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

/**
 * GET /api/youtube/oauth/start?evento_id=...
 *
 * Inicia o OAuth flow do Google. Redireciona o usuário pra tela de consent.
 * O evento_id é passado em state (cookie + base64) pra que o callback saiba
 * a qual evento associar os tokens.
 */
export async function GET(req: NextRequest) {
  const eventoId = req.nextUrl.searchParams.get('evento_id')
  if (!eventoId) {
    return NextResponse.json({ error: 'evento_id obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stake } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!ADMIN_ROLES.includes(stake?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({
      error: 'OAuth não configurado. Veja YOUTUBE_SETUP.md.',
    }, { status: 500 })
  }

  // Detecta origem (prod vs localhost)
  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/youtube/oauth/callback`

  // State assinado pra evitar CSRF — usamos um nonce simples + evento_id base64
  const nonce = crypto.randomUUID()
  const statePayload = Buffer.from(JSON.stringify({ evento_id: eventoId, nonce })).toString('base64url')

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', YOUTUBE_SCOPES)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', statePayload)
  // include_granted_scopes pra herdar scopes anteriores se reconectar
  authUrl.searchParams.set('include_granted_scopes', 'true')

  const res = NextResponse.redirect(authUrl.toString())
  // Salva nonce em cookie httpOnly pra validar no callback
  res.cookies.set('yt_oauth_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 min
    path: '/api/youtube/oauth/callback',
  })
  return res
}
