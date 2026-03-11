import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const resolveStakeholderId = async (email: string | null, fallbackUserId: string) => {
      const normalizedEmail = String(email || '').trim().toLowerCase()
      if (!normalizedEmail) return fallbackUserId

      const { data: stakeholders } = await supabase
        .from('stakeholders')
        .select('id')
        .eq('email', normalizedEmail)
        .limit(1)

      if (!stakeholders || stakeholders.length === 0) return fallbackUserId
      return stakeholders[0].id as string
    }

    const resolveKyuDanId = async (params: {
      kyuDanIdRaw: unknown
      graduacaoRaw: unknown
      danNivelRaw: unknown
    }) => {
      const kyuDanIdCandidate = Number(params.kyuDanIdRaw)
      if (Number.isInteger(kyuDanIdCandidate) && kyuDanIdCandidate > 0) {
        return kyuDanIdCandidate
      }

      const graduacao = String(params.graduacaoRaw || '').trim()
      const danNivel = String(params.danNivelRaw || '').trim()
      if (!graduacao && !danNivel) return null

      const { data, error } = await supabase.rpc('resolve_kyu_dan_id', {
        graduacao_text: graduacao || null,
        dan_numeric: null,
        dan_nivel_text: danNivel || null,
      })

      if (error || !data) return null
      return Number(data)
    }

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      const stakeholderId = body.stakeholder_id || await resolveStakeholderId(body.email || null, user.id)
      const kyuDanId = await resolveKyuDanId({
        kyuDanIdRaw: body.kyu_dan_id,
        graduacaoRaw: body.graduacao,
        danNivelRaw: body.dan_nivel,
      })

      // Atualizar stakeholders com role e vínculos
      await supabase.from('stakeholders').update({
        role: 'atleta',
        federacao_id: body.federacao_id,
        academia_id: body.academia_id,
      }).eq('id', stakeholderId || user.id)

      // Inserir dados esportivos em user_fed_lrsj
      const { data: atleta, error: insertError } = await supabase
        .from('user_fed_lrsj')
        .insert({
          stakeholder_id: stakeholderId || user.id,
          kyu_dan_id: kyuDanId,
          academia_id: body.academia_id,
          nome_completo: body.nome_completo,
          cpf: body.cpf,
          data_nascimento: body.data_nascimento || null,
          genero: body.genero || null,
          email: body.email || null,
          celular: body.celular || null,
          graduacao: body.graduacao,
          status_membro: body.status || 'ativo',
          pais: 'Brasil',
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        atleta,
      }, { status: 201 })
    }

    // Get form data
    const formData = await request.formData()

    // Extract file uploads
    const fotoPerfil = formData.get('foto_perfil') as File | null
    const fotoDocumento = formData.get('foto_documento') as File | null
    const certificadoArbitragem = formData.get('certificado_arbitragem') as File | null
    const certificadoDan = formData.get('certificado_dan') as File | null

    // Extract other fields
    const resolvedKyuDanId = await resolveKyuDanId({
      kyuDanIdRaw: formData.get('kyu_dan_id'),
      graduacaoRaw: formData.get('graduacao'),
      danNivelRaw: formData.get('dan_nivel'),
    })

    const atletaData = {
      user_id: user.id,
      stakeholder_id: await resolveStakeholderId(formData.get('email') as string || null, user.id),
      kyu_dan_id: resolvedKyuDanId,
      federacao_id: formData.get('federacao_id') as string,
      academia_id: formData.get('academia_id') as string,
      nome_completo: formData.get('nome_completo') as string,
      cpf: formData.get('cpf') as string,
      rg: formData.get('rg') as string || null,
      data_nascimento: formData.get('data_nascimento') as string,
      genero: formData.get('genero') as string || null,
      email: formData.get('email') as string || null,
      telefone: formData.get('telefone') as string || null,
      celular: formData.get('celular') as string || null,
      cep: formData.get('cep') as string || null,
      endereco: formData.get('endereco') as string || null,
      numero: formData.get('numero') as string || null,
      complemento: formData.get('complemento') as string || null,
      bairro: formData.get('bairro') as string || null,
      cidade: formData.get('cidade') as string || null,
      estado: formData.get('estado') as string || null,
      graduacao: formData.get('graduacao') as string,
      dan_nivel: formData.get('dan_nivel') as string || null,
      data_graduacao: formData.get('data_graduacao') as string || null,
      nivel_arbitragem: formData.get('nivel_arbitragem') as string || null,
      numero_diploma_dan: formData.get('numero_diploma_dan') as string || null,
      lote: formData.get('lote') as string || null,
      observacoes: formData.get('observacoes') as string || null,
      pais: formData.get('pais') as string || null,
      created_by: user.id,
    }

    // Upload files to Storage
    let fotoPerfilUrl = null
    let fotoDocumentoUrl = null
    let certificadoArbitragemUrl = null
    let certificadoDanUrl = null

    const uploadFile = async (file: File, bucket: string, path: string) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        throw new Error(`Erro ao fazer upload: ${error.message}`)
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      return urlData.publicUrl
    }

    const timestamp = Date.now()
    const cpfClean = atletaData.cpf.replace(/\D/g, '')

    if (fotoPerfil && fotoPerfil.size > 0) {
      const extension = fotoPerfil.name.split('.').pop()
      fotoPerfilUrl = await uploadFile(
        fotoPerfil,
        'atletas',
        `${atletaData.federacao_id}/${cpfClean}/perfil_${timestamp}.${extension}`
      )
    }

    if (fotoDocumento && fotoDocumento.size > 0) {
      const extension = fotoDocumento.name.split('.').pop()
      fotoDocumentoUrl = await uploadFile(
        fotoDocumento,
        'atletas',
        `${atletaData.federacao_id}/${cpfClean}/documento_${timestamp}.${extension}`
      )
    }

    if (certificadoArbitragem && certificadoArbitragem.size > 0) {
      const extension = certificadoArbitragem.name.split('.').pop()
      certificadoArbitragemUrl = await uploadFile(
        certificadoArbitragem,
        'atletas',
        `${atletaData.federacao_id}/${cpfClean}/cert_arbitragem_${timestamp}.${extension}`
      )
    }

    if (certificadoDan && certificadoDan.size > 0) {
      const extension = certificadoDan.name.split('.').pop()
      certificadoDanUrl = await uploadFile(
        certificadoDan,
        'atletas',
        `${atletaData.federacao_id}/${cpfClean}/cert_dan_${timestamp}.${extension}`
      )
    }

    // Insert athlete record
    // Inserir dados esportivos em user_fed_lrsj
    const { data: atleta, error: insertError } = await supabase
      .from('user_fed_lrsj')
      .insert({
        stakeholder_id: atletaData.stakeholder_id,
        kyu_dan_id: resolvedKyuDanId,
        academia_id: atletaData.academia_id,
        nome_completo: atletaData.nome_completo,
        cpf: atletaData.cpf,
        data_nascimento: atletaData.data_nascimento || null,
        genero: atletaData.genero || null,
        email: atletaData.email || null,
        celular: atletaData.celular || null,
        graduacao: atletaData.graduacao,
        foto_perfil_url: fotoPerfilUrl,
        foto_documento_url: fotoDocumentoUrl,
        certificado_arbitragem_url: certificadoArbitragemUrl,
        certificado_dan_url: certificadoDanUrl,
        status_membro: 'ativo',
        pais: atletaData.pais || 'Brasil',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      atleta,
      numero_registro: atleta.numero_registro,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating atleta:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: atletas, error } = await supabase
      .from('user_fed_lrsj')
      .select(`
        *,
        academia:academia_id (
          id,
          nome
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ atletas })
  } catch (error) {
    console.error('Error fetching atletas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
