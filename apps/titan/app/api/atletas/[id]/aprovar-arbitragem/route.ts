import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Approve athlete arbitragem
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

    // Only federacao_admin can approve arbitragem
    if (perfil.role !== 'federacao_admin' && perfil.role !== 'federacao_staff') {
      return NextResponse.json({ 
        error: 'Apenas administradores da federação podem aprovar níveis de arbitragem' 
      }, { status: 403 })
    }

    // Get athlete data
    const { data: atleta } = await supabase
      .from('atletas')
      .select('federacao_id, nivel_arbitragem')
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
        arbitragem_aprovada: true,
        arbitragem_aprovada_por: user.id,
        arbitragem_aprovada_em: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error approving arbitragem:', updateError)
      return NextResponse.json({ error: 'Erro ao aprovar nível de arbitragem' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Nível de arbitragem aprovado com sucesso',
      nivel_arbitragem: atleta.nivel_arbitragem 
    })
  } catch (error) {
    console.error('Error in POST /api/atletas/[id]/aprovar-arbitragem:', error)
    return NextResponse.json({ error: 'Erro ao aprovar nível de arbitragem' }, { status: 500 })
  }
}

// Reject arbitragem
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

    // Only federacao_admin can reject arbitragem
    if (perfil.role !== 'federacao_admin' && perfil.role !== 'federacao_staff') {
      return NextResponse.json({ 
        error: 'Apenas administradores da federação podem rejeitar níveis de arbitragem' 
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
        arbitragem_aprovada: false,
        arbitragem_aprovada_por: null,
        arbitragem_aprovada_em: null,
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error rejecting arbitragem:', updateError)
      return NextResponse.json({ error: 'Erro ao rejeitar nível de arbitragem' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Nível de arbitragem rejeitado' })
  } catch (error) {
    console.error('Error in DELETE /api/atletas/[id]/aprovar-arbitragem:', error)
    return NextResponse.json({ error: 'Erro ao rejeitar nível de arbitragem' }, { status: 500 })
  }
}
