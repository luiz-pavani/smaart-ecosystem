import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

/**
 * POST /api/eventos/[id]/scoring/[matchId]/var-upload
 *
 * Recebe Blob de vídeo do replay VAR (gravado pela câmera local na página de scoring),
 * sobe para bucket privado event-var-videos, atualiza event_match_var.video_url com o path.
 *
 * Query: ?var_id=<uuid do VAR record>
 * Body: FormData com `video` (Blob WebM ou MP4)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id: eventoId, matchId } = await params
  const varId = req.nextUrl.searchParams.get('var_id')
  if (!varId) return NextResponse.json({ error: 'var_id obrigatório' }, { status: 400 })

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

  const form = await req.formData()
  const file = form.get('video')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'video (Blob) obrigatório' }, { status: 400 })
  }
  if (file.size > 52428800) {
    return NextResponse.json({ error: 'vídeo excede 50MB' }, { status: 400 })
  }

  const ext = file.type.includes('webm') ? 'webm' : file.type.includes('mp4') ? 'mp4' : 'webm'
  const path = `${eventoId}/${matchId}/${varId}.${ext}`

  const { error: upErr } = await supabaseAdmin.storage
    .from('event-var-videos')
    .upload(path, file, {
      contentType: file.type || 'video/webm',
      upsert: true,
    })
  if (upErr) {
    return NextResponse.json({ error: `Upload falhou: ${upErr.message}` }, { status: 500 })
  }

  await supabaseAdmin
    .from('event_match_var')
    .update({ video_url: path })
    .eq('id', varId)
    .eq('match_id', matchId)

  return NextResponse.json({ ok: true, path })
}

/**
 * GET /api/eventos/[id]/scoring/[matchId]/var-upload?var_id=...
 * Gera signed URL pra admin assistir o vídeo gravado.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id: eventoId, matchId } = await params
  const varId = req.nextUrl.searchParams.get('var_id')
  if (!varId) return NextResponse.json({ error: 'var_id obrigatório' }, { status: 400 })

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

  const { data: row } = await supabaseAdmin
    .from('event_match_var')
    .select('video_url')
    .eq('id', varId)
    .eq('match_id', matchId)
    .maybeSingle()

  if (!row?.video_url) return NextResponse.json({ url: null, eventoId })

  const { data: signed } = await supabaseAdmin.storage
    .from('event-var-videos')
    .createSignedUrl(row.video_url, 3600)

  return NextResponse.json({ url: signed?.signedUrl || null })
}
