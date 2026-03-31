import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const field = (formData.get('field') as string | null) ?? 'arquivo'

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const path = `filiacao/${user.id}/${field}_${Date.now()}.${ext}`

  const { data: up, error: upErr } = await supabaseAdmin.storage
    .from('atletas')
    .upload(path, file, { upsert: true })

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: pub } = supabaseAdmin.storage.from('atletas').getPublicUrl(up.path)
  return NextResponse.json({ url: pub.publicUrl })
}
