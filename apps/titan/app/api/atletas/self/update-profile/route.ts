import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const ALLOWED_TEXT = [
      'nome_patch', 'genero', 'nacionalidade',
      'email', 'telefone', 'cidade', 'estado', 'pais', 'tamanho_patch',
    ] as const

    const payload: Record<string, unknown> = {}
    let fotoFile: File | null = null

    const ct = req.headers.get('content-type') || ''

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      for (const key of ALLOWED_TEXT) {
        if (form.has(key)) {
          const val = form.get(key)
          payload[key] = typeof val === 'string' ? (val.trim() || null) : null
        }
      }
      const foto = form.get('foto')
      if (foto instanceof File && foto.size > 0) fotoFile = foto
    } else {
      const body = await req.json()
      for (const key of ALLOWED_TEXT) {
        if (key in body) payload[key] = body[key] || null
      }
    }

    // Upload photo if provided
    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop() || 'jpg'
      const path = `1/${user.id}/selfie_${Date.now()}.${ext}`
      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from('atletas')
        .upload(path, fotoFile, { cacheControl: '3600', upsert: true })

      if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

      const { data: urlData } = supabaseAdmin.storage.from('atletas').getPublicUrl(uploadData.path)
      payload['url_foto'] = urlData.publicUrl
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido enviado' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('user_fed_lrsj')
      .update(payload)
      .eq('stakeholder_id', user.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
