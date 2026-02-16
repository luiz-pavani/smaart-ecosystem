import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Approve athlete graduacao
export async function POST(
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
      .select('role, federacao_id')
      .eq('user_id', user.id)
      .single()

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
    }

    // Only federacao_admin can approve graduacoes
    if (perfil.role !== 'federacao_admin' && perfil.role !== 'federacao_staff') {
      return NextResponse.json({ 
        error: 'Apenas administradores da federação podem aprovar graduações' 
      }, { status: 403 })
    }

    // Get athlete data
    const { data: atleta } = await supabase
      .from('atletas')
      .select('federacao_id, graduacao')
      .eq('id', params.id)
      .single()

    if (!atleta) {
      return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })
    }

    // Check if athlete belongs to this federation
    if (atleta.federacao_id !== perfil.federacao_id) {
      return NextResponse.json({ 
        error: 'Você não tem permissão para aprovar este atleta' 
      }, { status: 403 })
    }

    // Update approval status
    const { error: updateError } = await supabase
      .from('atletas')
      .update({
        graduacao_aprovada: true,
        graduacao_aprovada_por: user.id,
        graduacao_aprovada_em: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error approving graduacao:', updateError)
      return NextResponse.json({ error: 'Erro ao aprovar graduação' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Graduação aprovada com sucesso',
      graduacao: atleta.graduacao 
    })
  } catch (error) {
    console.error('Error in POST /api/atletas/[id]/aprovar-graduacao:', error)
    return NextResponse.json({ error: 'Erro ao aprovar graduação' }, { status: 500 })
  }
}

// Reject graduacao
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
      .select('role, federacao_id')
      .eq('user_id', user.id)
      .single()

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
    }

    // Only federacao_admin can reject graduacoes
    if (perfil.role !== 'federacao_admin' && perfil.role !== 'federacao_staff') {
      return NextResponse.json({ 
        error: 'Apenas administradores da federação podem rejeitar graduações' 
      }, { status: 403 })
    }

    // Get athlete data
    const { data: atleta } = await supabase
      .from('atletas')
      .select('federacao_id')
      .eq('id', params.id)
      .single()

    if (!atleta) {
      return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })
    }

    // Check if athlete belongs to this federation
    if (atleta.federacao_id !== perfil.federacao_id) {
      return NextResponse.json({ 
        error: 'Você não tem permissão para rejeitar este atleta' 
      }, { status: 403 })
    }

    // Update approval status
    const { error: updateError } = await supabase
      .from('atletas')
      .update({
        graduacao_aprovada: false,
        graduacao_aprovada_por: null,
        graduacao_aprovada_em: null,
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error rejecting graduacao:', updateError)
      return NextResponse.json({ error: 'Erro ao rejeitar graduação' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Graduação rejeitada' })
  } catch (error) {
    console.error('Error in DELETE /api/atletas/[id]/aprovar-graduacao:', error)
    return NextResponse.json({ error: 'Erro ao rejeitar graduação' }, { status: 500 })
  }
}
