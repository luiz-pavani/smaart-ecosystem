import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET single athlete
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: atleta, error } = await supabase
      .from('atletas')
      .select(`
        *,
        academia:academias!atletas_academia_id_fkey (
          id,
          nome,
          sigla
        ),
        federacao:federacoes!atletas_federacao_id_fkey (
          id,
          nome,
          sigla
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching atleta:', error)
      return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })
    }

    return NextResponse.json(atleta)
  } catch (error) {
    console.error('Error in GET /api/atletas/[id]:', error)
    return NextResponse.json({ error: 'Erro ao buscar atleta' }, { status: 500 })
  }
}

// DELETE athlete
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Get user role
    const { data: perfil } = await supabase
      .from('user_roles')
      .select('role, federacao_id, academia_id')
      .eq('user_id', user.id)
      .single()

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
    }

    // Get athlete to check permissions
    const { data: atleta } = await supabase
      .from('atletas')
      .select('federacao_id, academia_id, foto_perfil_url, foto_documento_url, certificado_arbitragem_url, certificado_dan_url')
      .eq('id', params.id)
      .single()

    if (!atleta) {
      return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })
    }

    // Check permissions
    if (perfil.role === 'academia_admin' || perfil.role === 'academia_staff') {
      if (atleta.academia_id !== perfil.academia_id) {
        return NextResponse.json({ error: 'Sem permissão para excluir este atleta' }, { status: 403 })
      }
    } else if (perfil.role === 'federacao_admin' || perfil.role === 'federacao_staff') {
      if (atleta.federacao_id !== perfil.federacao_id) {
        return NextResponse.json({ error: 'Sem permissão para excluir este atleta' }, { status: 403 })
      }
    }

    // Delete files from storage if they exist
    const filesToDelete = [
      atleta.foto_perfil_url,
      atleta.foto_documento_url,
      atleta.certificado_arbitragem_url,
      atleta.certificado_dan_url
    ].filter(Boolean)

    for (const fileUrl of filesToDelete) {
      if (fileUrl) {
        try {
          // Extract file path from URL
          const path = fileUrl.split('/storage/v1/object/public/atletas/')[1]
          if (path) {
            await supabase.storage.from('atletas').remove([path])
          }
        } catch (err) {
          console.error('Error deleting file:', err)
        }
      }
    }

    // Delete athlete record
    const { error: deleteError } = await supabase
      .from('atletas')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting atleta:', deleteError)
      return NextResponse.json({ error: 'Erro ao excluir atleta' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Atleta excluído com sucesso' })
  } catch (error) {
    console.error('Error in DELETE /api/atletas/[id]:', error)
    return NextResponse.json({ error: 'Erro ao excluir atleta' }, { status: 500 })
  }
}

// PUT/PATCH - Update athlete
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const supabase = await createClient()

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

    // Get current athlete data
    const { data: currentAtleta } = await supabase
      .from('atletas')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!currentAtleta) {
      return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })
    }

    // Prepare update data
    const atletaData: any = {
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
      status: formData.get('status') as string || 'ativo',
      status_pagamento: formData.get('status_pagamento') as string || 'pendente',
    }

    // Upload new files if provided
    const cpf = atletaData.cpf.replace(/\D/g, '')
    const basePath = `${currentAtleta.federacao_id}/${cpf}`

    if (fotoPerfil && fotoPerfil.size > 0) {
      const fileName = `perfil_${Date.now()}.${fotoPerfil.name.split('.').pop()}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('atletas')
        .upload(`${basePath}/${fileName}`, fotoPerfil, {
          contentType: fotoPerfil.type,
          upsert: true,
        })

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('atletas')
          .getPublicUrl(uploadData.path)
        atletaData.foto_perfil_url = publicUrl
      }
    }

    if (fotoDocumento && fotoDocumento.size > 0) {
      const fileName = `documento_${Date.now()}.${fotoDocumento.name.split('.').pop()}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('atletas')
        .upload(`${basePath}/${fileName}`, fotoDocumento, {
          contentType: fotoDocumento.type,
          upsert: true,
        })

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('atletas')
          .getPublicUrl(uploadData.path)
        atletaData.foto_documento_url = publicUrl
      }
    }

    if (certificadoArbitragem && certificadoArbitragem.size > 0) {
      const fileName = `cert_arbitragem_${Date.now()}.${certificadoArbitragem.name.split('.').pop()}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('atletas')
        .upload(`${basePath}/${fileName}`, certificadoArbitragem, {
          contentType: certificadoArbitragem.type,
          upsert: true,
        })

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('atletas')
          .getPublicUrl(uploadData.path)
        atletaData.certificado_arbitragem_url = publicUrl
      }
    }

    if (certificadoDan && certificadoDan.size > 0) {
      const fileName = `cert_dan_${Date.now()}.${certificadoDan.name.split('.').pop()}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('atletas')
        .upload(`${basePath}/${fileName}`, certificadoDan, {
          contentType: certificadoDan.type,
          upsert: true,
        })

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('atletas')
          .getPublicUrl(uploadData.path)
        atletaData.certificado_dan_url = publicUrl
      }
    }

    // Update athlete
    const { data: updatedAtleta, error: updateError } = await supabase
      .from('atletas')
      .update(atletaData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating atleta:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar atleta' }, { status: 500 })
    }

    return NextResponse.json(updatedAtleta)
  } catch (error) {
    console.error('Error in PUT /api/atletas/[id]:', error)
    return NextResponse.json({ error: 'Erro ao atualizar atleta' }, { status: 500 })
  }
}
