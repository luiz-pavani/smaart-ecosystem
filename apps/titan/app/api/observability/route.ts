import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const MAX_MESSAGE_LEN = 2000
const MAX_STACK_LEN = 8000

/**
 * POST /api/_log
 * Endpoint público (rate-limited implicitamente por sender ip via Vercel).
 * Recebe erros client-side capturados por window.onerror / unhandledrejection
 * e os persiste em app_error_log.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  const severity = ['fatal', 'error', 'warn', 'info'].includes(String(body.severity))
    ? String(body.severity) : 'error'
  const source = String(body.source || 'client').slice(0, 80)
  const message = String(body.message || '').slice(0, MAX_MESSAGE_LEN)
  const stack = body.stack ? String(body.stack).slice(0, MAX_STACK_LEN) : null
  const url = body.url ? String(body.url).slice(0, 500) : null
  const userAgent = req.headers.get('user-agent')?.slice(0, 400) || null
  const eventoId = body.evento_id ? String(body.evento_id).slice(0, 64) : null
  const context = body.context && typeof body.context === 'object' ? body.context : null

  if (!message) return NextResponse.json({ ok: false }, { status: 400 })

  // Anexa user_id se autenticado (best-effort)
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch { /* ignore */ }

  await supabaseAdmin.from('app_error_log').insert({
    severity,
    source,
    user_id: userId,
    evento_id: eventoId,
    url,
    user_agent: userAgent,
    message,
    stack,
    context,
  })

  return NextResponse.json({ ok: true })
}
