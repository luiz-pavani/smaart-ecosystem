import { supabaseAdmin } from '@/lib/supabase/admin'
import type { NextRequest } from 'next/server'

/**
 * Rate limit fixo por janela. Conta eventos em `public.rate_limit_events`
 * para o par (bucket, key) nos últimos `windowMs` ms; se >= `limit`,
 * bloqueia. Caso contrário registra o evento e libera.
 *
 * Voltado para endpoints de baixo volume (otp, login, identifier resolve).
 * Não substitui Upstash/Redis em produção pesada.
 */
export async function rateLimit(opts: {
  bucket: string
  key: string
  limit: number
  windowMs: number
}): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const since = new Date(Date.now() - opts.windowMs).toISOString()

  const { count } = await supabaseAdmin
    .from('rate_limit_events')
    .select('*', { count: 'exact', head: true })
    .eq('bucket', opts.bucket)
    .eq('key', opts.key)
    .gte('created_at', since)

  if ((count ?? 0) >= opts.limit) {
    return { ok: false, retryAfterSec: Math.ceil(opts.windowMs / 1000) }
  }

  await supabaseAdmin.from('rate_limit_events').insert({
    bucket: opts.bucket,
    key: opts.key,
  })
  return { ok: true }
}

/** Extrai um IP do request, com fallback. */
export function getClientIp(req: NextRequest | Request): string {
  const h = (req as NextRequest).headers ?? new Headers()
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    h.get('cf-connecting-ip') ||
    'unknown'
  )
}
