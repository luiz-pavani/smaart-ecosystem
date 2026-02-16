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

    // Get form data
    const formData = await request.formData()

    // Extract file uploads
    const fotoPerfil = formData.get('foto_perfil') as File | null
    const fotoDocumento = formData.get('foto_documento') as File | null
    const certificadoArbitragem = formData.get('certificado_arbitragem') as File | null
    const certificadoDan = formData.get('certificado_dan') as File | null

    // Extract other fields
    const atletaData = {
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
    const { data: atleta, error: insertError } = await supabase
      .from('atletas')
      .insert({
        ...atletaData,
        foto_perfil_url: fotoPerfilUrl,
        foto_documento_url: fotoDocumentoUrl,
        certificado_arbitragem_url: certificadoArbitragemUrl,
        certificado_dan_url: certificadoDanUrl,
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
      .from('atletas')
      .select(`
        *,
        academia:academias!atletas_academia_id_fkey (
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
