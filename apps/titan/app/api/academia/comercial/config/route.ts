import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function resolveAcademiaId(userId: string, paramId: string | null): Promise<string | null> {
  if (paramId) return paramId
  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('academia_id')
    .eq('id', userId)
    .maybeSingle()
  return data?.academia_id ?? null
}

// GET — retrieve academia payment config
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const academiaId = await resolveAcademiaId(user.id, req.nextUrl.searchParams.get('academia_id'))
  if (!academiaId) return NextResponse.json({ error: 'Academia não vinculada' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('academias')
    .select('id, nome, safe2pay_api_key, safe2pay_api_secret, safe2pay_webhook_url, pagamento_habilitado')
    .eq('id', academiaId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mask API keys for display (show only last 8 chars)
  const masked = {
    ...data,
    safe2pay_api_key: data.safe2pay_api_key
      ? '•'.repeat(Math.max(0, data.safe2pay_api_key.length - 8)) + data.safe2pay_api_key.slice(-8)
      : null,
    safe2pay_api_secret: data.safe2pay_api_secret
      ? '•'.repeat(Math.max(0, data.safe2pay_api_secret.length - 8)) + data.safe2pay_api_secret.slice(-8)
      : null,
    has_api_key: !!data.safe2pay_api_key,
    has_api_secret: !!data.safe2pay_api_secret,
  }

  return NextResponse.json({ config: masked })
}

// PUT — update academia payment config
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const academiaId = await resolveAcademiaId(user.id, body.academia_id)
  if (!academiaId) return NextResponse.json({ error: 'Academia não vinculada' }, { status: 400 })

  const updates: Record<string, any> = {}

  if (body.safe2pay_api_key !== undefined) updates.safe2pay_api_key = body.safe2pay_api_key || null
  if (body.safe2pay_api_secret !== undefined) updates.safe2pay_api_secret = body.safe2pay_api_secret || null
  if (body.safe2pay_webhook_url !== undefined) updates.safe2pay_webhook_url = body.safe2pay_webhook_url || null
  if (body.pagamento_habilitado !== undefined) updates.pagamento_habilitado = !!body.pagamento_habilitado

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('academias')
    .update(updates)
    .eq('id', academiaId)
    .select('id, nome, pagamento_habilitado')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, academia: data })
}
