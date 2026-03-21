import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifyFederacaoNovoCadastro } from '@/lib/whatsapp/notifications'

// Public endpoint — no auth required
// Creates a pending affiliation request (status_membro = 'Em análise')
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const nome_completo = String(body.nome_completo || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const telefone = String(body.telefone || '').trim()

    if (!nome_completo) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    if (!email && !telefone) return NextResponse.json({ error: 'Email ou telefone é obrigatório' }, { status: 400 })

    // Prevent duplicates by email
    if (email) {
      const { data: existing } = await supabaseAdmin
        .from('user_fed_lrsj')
        .select('stakeholder_id, status_membro')
        .eq('email', email)
        .eq('federacao_id', 1)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({
          error: 'Já existe um cadastro com este e-mail',
          status_membro: existing.status_membro,
        }, { status: 409 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('user_fed_lrsj')
      .insert({
        federacao_id: 1,
        nome_completo,
        email: email || null,
        telefone: telefone || null,
        data_nascimento: body.data_nascimento || null,
        genero: body.genero || null,
        pais: body.pais || 'Brasil',
        academia_id: body.academia_id || null,
        academias: body.academias || null,
        status_membro: 'Em análise',
        dados_validados: false,
      })
      .select('stakeholder_id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify federation coordinator (fire-and-forget — ok if WhatsApp not yet active)
    notifyFederacaoNovoCadastro({
      nome_completo,
      email: email || null,
      telefone: telefone || null,
    }).catch(() => {})

    return NextResponse.json({ ok: true, id: data.stakeholder_id }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
