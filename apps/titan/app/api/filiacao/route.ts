import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifyFederacaoNovoCadastro } from '@/lib/whatsapp/notifications'
import { LRSJ_FED_UUID, criarStakeholderAtleta, preencherStakeholderVazio, upsertFiliacoesLrsj } from '@/lib/filiacao/lrsj'

// Public endpoint — no auth required
// Creates a pending affiliation request (stakeholder_filiacoes.status_membro = 'pendente')
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const nome_completo = String(body.nome_completo || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const telefone = String(body.telefone || '').trim()

    if (!nome_completo) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    if (!email && !telefone) return NextResponse.json({ error: 'Email ou telefone é obrigatório' }, { status: 400 })

    // user_fed_lrsj é VIEW sem INSERT — o cadastro vira stakeholder (via Auth) + stakeholder_filiacoes.
    // Email já cadastrado: reaproveita o stakeholder, mas recusa se já houver filiação LRSJ.
    let stakeholderId: string | null = null
    if (email) {
      const { data: existing } = await supabaseAdmin
        .from('stakeholders')
        .select('id')
        .eq('email', email)
        .limit(1)
        .maybeSingle()

      if (existing) {
        const { data: filiacao } = await supabaseAdmin
          .from('stakeholder_filiacoes')
          .select('status_membro')
          .eq('stakeholder_id', existing.id)
          .eq('federacao_id', LRSJ_FED_UUID)
          .maybeSingle()

        if (filiacao) {
          return NextResponse.json({
            error: 'Já existe um cadastro com este e-mail',
            status_membro: filiacao.status_membro,
          }, { status: 409 })
        }
        stakeholderId = existing.id
      }
    }

    if (!stakeholderId) {
      const created = await criarStakeholderAtleta(supabaseAdmin, { nome_completo, email, origem: 'filiacao' })
      if (!created.id) return NextResponse.json({ error: created.error }, { status: 500 })
      stakeholderId = created.id
    }

    // Fetch current active lote
    const { data: loteConfig } = await supabaseAdmin
      .from('federacao_lote_config')
      .select('lote_atual')
      .eq('federacao_id', 1)
      .maybeSingle()
    const lote_id = loteConfig?.lote_atual ?? 'N2026 1'

    const { error: stError } = await preencherStakeholderVazio(supabaseAdmin, stakeholderId, {
      telefone: telefone || null,
      data_nascimento: body.data_nascimento || null,
      genero: body.genero || null,
      academia_id: body.academia_id || null,
      federacao_id: LRSJ_FED_UUID,
    })
    if (stError) return NextResponse.json({ error: stError }, { status: 500 })

    // Academia fora da lista (sem academia_id) fica registrada nas observações para a federação.
    const academiaInformada = !body.academia_id && body.academias ? String(body.academias).trim() : ''
    const { error } = await upsertFiliacoesLrsj(supabaseAdmin, [{
      stakeholder_id: stakeholderId,
      academia_id: body.academia_id || null,
      status_membro: 'pendente',
      dados_validados: false,
      lote_id,
      observacoes: academiaInformada ? `Academia informada: ${academiaInformada}` : null,
    }])

    if (error) return NextResponse.json({ error }, { status: 500 })

    // Notify federation coordinator (fire-and-forget — ok if WhatsApp not yet active)
    notifyFederacaoNovoCadastro({
      nome_completo,
      email: email || null,
      telefone: telefone || null,
    }).catch(() => {})

    return NextResponse.json({ ok: true, id: stakeholderId }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
