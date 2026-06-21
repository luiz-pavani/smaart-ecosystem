import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Campos pessoais → stakeholders. Campos de filiação (patch, etc) → stakeholder_filiacoes.
    const STAKE_FIELDS = ['genero', 'email', 'telefone'] as const
    const FILIACAO_FIELDS = ['nome_patch', 'tamanho_patch'] as const  // 'nacionalidade','cidade','estado','pais' não têm coluna nova ainda
    const LRSJ_FED = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'

    const stakePayload: Record<string, unknown> = {}
    const filPayload: Record<string, unknown> = {}
    let fotoFile: File | null = null

    const ct = req.headers.get('content-type') || ''
    const raw: Record<string, unknown> = {}

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      for (const k of [...STAKE_FIELDS, ...FILIACAO_FIELDS]) {
        if (form.has(k)) {
          const val = form.get(k)
          raw[k] = typeof val === 'string' ? (val.trim() || null) : null
        }
      }
      const foto = form.get('foto')
      if (foto instanceof File && foto.size > 0) fotoFile = foto
    } else {
      const body = await req.json()
      for (const k of [...STAKE_FIELDS, ...FILIACAO_FIELDS]) {
        if (k in body) raw[k] = body[k] || null
      }
    }

    for (const k of STAKE_FIELDS) if (k in raw) stakePayload[k] = raw[k]
    for (const k of FILIACAO_FIELDS) if (k in raw) filPayload[k] = raw[k]

    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop() || 'jpg'
      const path = `1/${user.id}/selfie_${Date.now()}.${ext}`
      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from('atletas')
        .upload(path, fotoFile, { cacheControl: '3600', upsert: true })

      if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

      const { data: urlData } = supabaseAdmin.storage.from('atletas').getPublicUrl(uploadData.path)
      filPayload['url_foto'] = urlData.publicUrl
    }

    if (Object.keys(stakePayload).length === 0 && Object.keys(filPayload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido enviado' }, { status: 400 })
    }

    if (Object.keys(stakePayload).length > 0) {
      const { error: sErr } = await supabaseAdmin
        .from('stakeholders')
        .update(stakePayload)
        .eq('id', user.id)
      if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
    }

    let filData: unknown = null
    if (Object.keys(filPayload).length > 0) {
      const { data, error } = await supabaseAdmin
        .from('stakeholder_filiacoes')
        .update(filPayload)
        .eq('stakeholder_id', user.id)
        .eq('federacao_id', LRSJ_FED)
        .select('*')
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      filData = data
    }

    return NextResponse.json({ data: filData })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
