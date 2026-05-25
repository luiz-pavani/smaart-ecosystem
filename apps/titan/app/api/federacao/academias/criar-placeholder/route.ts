import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const LRSJ_FED_UUID = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: stakeholder } = await supabaseAdmin
      .from('stakeholders')
      .select('role, federacao_id')
      .eq('id', user.id)
      .single()

    const role = stakeholder?.role ?? ''
    const isAuthorized =
      ['master_access', 'admin', 'master'].includes(role) ||
      (role === 'federacao_admin' && stakeholder?.federacao_id === LRSJ_FED_UUID)

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const body = await request.json()
    const nome = (body?.nome || '').trim()
    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    // Idempotência case-insensitive
    const { data: existing } = await supabaseAdmin
      .from('academias')
      .select('id, nome')
      .eq('federacao_id', LRSJ_FED_UUID)
      .ilike('nome', nome)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        ok: true,
        already_existed: true,
        academia: existing,
      })
    }

    const slug = slugify(nome) || 'placeholder'
    const placeholderEmail = `contato+${slug}@lrsj.com.br`

    const { data: created, error } = await supabaseAdmin
      .from('academias')
      .insert({
        federacao_id: LRSJ_FED_UUID,
        nome,
        responsavel_nome: 'A definir',
        responsavel_cpf: '00000000000',
        responsavel_email: placeholderEmail,
        stakeholder_id: user.id,
        ativo: true,
        pagamento_habilitado: false,
      })
      .select('id, nome')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, already_existed: false, academia: created })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
