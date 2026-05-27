import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// whitelist de extensão + MIME para documentos de atleta (foto, RG, comprovante, certificado)
const ALLOWED: Record<string, string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  pdf: ['application/pdf'],
  heic: ['image/heic', 'image/heif'],
  heif: ['image/heif'],
}

function sanitizeField(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'arquivo'
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const rawField = (formData.get('field') as string | null) ?? 'arquivo'
  const field = sanitizeField(rawField)

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Arquivo excede o limite de ${Math.round(MAX_SIZE_BYTES / 1024 / 1024)} MB` },
      { status: 400 }
    )
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const allowedMimes = ALLOWED[ext]
  if (!allowedMimes) {
    return NextResponse.json(
      { error: `Formato não permitido. Aceitos: ${Object.keys(ALLOWED).join(', ')}` },
      { status: 400 }
    )
  }
  if (file.type && !allowedMimes.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipo de arquivo não confere com a extensão (${file.type})` },
      { status: 400 }
    )
  }

  const path = `filiacao/${user.id}/${field}_${Date.now()}.${ext}`

  const { data: up, error: upErr } = await supabaseAdmin.storage
    .from('atletas')
    .upload(path, file, {
      upsert: true,
      contentType: allowedMimes[0],
    })

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: pub } = supabaseAdmin.storage.from('atletas').getPublicUrl(up.path)
  return NextResponse.json({ url: pub.publicUrl })
}
