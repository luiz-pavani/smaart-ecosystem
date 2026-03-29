import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const [
    { data: stakeholder },
    { data: fedLrsj },
    { data: federacoes },
    { data: academias },
    { data: kyuDans },
  ] = await Promise.all([
    supabaseAdmin.from('stakeholders').select('id, nome_completo, nome_usuario, email, telefone, funcao, genero, academia_id, federacao_id, kyu_dan_id, data_nascimento, instagram, master_access, role').eq('id', user.id).maybeSingle(),
    supabaseAdmin.from('user_fed_lrsj').select('*').eq('stakeholder_id', user.id).maybeSingle(),
    supabaseAdmin.from('federacoes').select('id, nome, sigla, email, site').eq('ativo', true),
    supabaseAdmin.from('academias').select('id, nome, endereco_cidade, endereco_estado, federacao_id').eq('ativo', true).order('nome'),
    supabaseAdmin.from('kyu_dan').select('id, cor_faixa, kyu_dan, icones').order('id'),
  ])

  return NextResponse.json({ stakeholder, fedLrsj, federacoes: federacoes || [], academias: academias || [], kyuDans: kyuDans || [] })
}
