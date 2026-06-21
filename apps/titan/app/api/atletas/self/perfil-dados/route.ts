import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const [
    { data: stakeholder },
    { data: filiacoes },
    { data: federacoes },
    { data: academias },
    { data: kyuDans },
  ] = await Promise.all([
    supabaseAdmin.from('stakeholders').select('id, nome_completo, nome_usuario, email, telefone, funcao, genero, cpf, peso_atual, academia_id, federacao_id, kyu_dan_id, data_nascimento, instagram, role').eq('id', user.id).maybeSingle(),
    // Lê direto da tabela normalizada — todas as filiações do stakeholder
    supabaseAdmin.from('stakeholder_filiacoes').select('*').eq('stakeholder_id', user.id),
    supabaseAdmin.from('federacoes').select('id, nome, sigla, email, site').eq('ativo', true),
    supabaseAdmin.from('academias').select('id, nome, endereco_cidade, endereco_estado, federacao_id').eq('ativo', true).order('nome'),
    supabaseAdmin.from('kyu_dan').select('id, cor_faixa, kyu_dan, icones').order('id'),
  ])

  // Backwards-compat: fedLrsj é a filiação LRSJ achatada (legacy UI ainda espera isso)
  const LRSJ_FED = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'
  const fedLrsj = (filiacoes || []).find(f => f.federacao_id === LRSJ_FED) || null

  return NextResponse.json({
    stakeholder,
    filiacoes: filiacoes || [],
    fedLrsj,
    federacoes: federacoes || [],
    academias: academias || [],
    kyuDans: kyuDans || [],
  })
}
