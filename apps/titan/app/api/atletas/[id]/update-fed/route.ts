import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifyAtletaBoasVindas } from '@/lib/whatsapp/notifications'

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Verify requester role and fetch their hierarchy level
    const [{ data: perfil }, { data: nivelRaw }] = await Promise.all([
      supabase.from('stakeholders').select('role, academia_id').eq('id', user.id).single(),
      supabase.rpc('get_my_nivel'),
    ])

    const allowedRoles = ['master_access', 'federacao_admin', 'federacao_gestor', 'academia_admin', 'academia_gestor', 'professor', 'atleta']
    if (!perfil || !allowedRoles.includes(perfil.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const nivel: number = typeof nivelRaw === 'number' ? nivelRaw : 7

    // Fetch current athlete record to check status_membro
    const { data: current } = await supabaseAdmin
      .from('user_fed_lrsj')
      .select('status_membro, nome_completo, telefone, academias')
      .eq('stakeholder_id', id)
      .maybeSingle()

    const statusMembro = String(current?.status_membro ?? '').trim().toLowerCase()
    const isAceito = statusMembro === 'aceito'

    const body = await req.json()

    // Fields only writable by levels 1–3
    const NIVEL_1_3_ONLY = ['status_plano', 'data_expiracao', 'status_membro', 'lote_id']
    // Fields writable by 1–7, but locked to 1–3 once status_membro = "Aceito"
    const GRAD_FIELDS = ['kyu_dan_id', 'nivel_arbitragem']

    // Full whitelist of editable fields
    const ALL_FIELDS = [
      'nome_completo', 'nome_patch', 'genero', 'data_nascimento', 'nacionalidade',
      'email', 'telefone', 'cidade', 'estado', 'pais', 'tamanho_patch', 'cor_patch',
      'kyu_dan_id', 'nivel_arbitragem', 'academia_id', 'academias',
      'status_membro', 'data_adesao', 'plano_tipo', 'status_plano',
      'data_expiracao', 'lote_id', 'observacoes',
    ] as const

    const payload: Record<string, unknown> = {}
    for (const key of ALL_FIELDS) {
      if (!(key in body)) continue
      // Enforce level restrictions
      if (NIVEL_1_3_ONLY.includes(key) && nivel > 3) continue
      if (GRAD_FIELDS.includes(key) && isAceito && nivel > 3) continue
      const v = body[key]
      payload[key] = v === '' ? null : v
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido enviado' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('user_fed_lrsj')
      .update(payload)
      .eq('stakeholder_id', id)
      .select('*')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })

    // Quando aprovado, marcar dados como validados
    const wasNotAceito = statusMembro !== 'aceito'
    const nowAceito = String(payload.status_membro ?? '').toLowerCase() === 'aceito'
    if (wasNotAceito && nowAceito) {
      await supabaseAdmin
        .from('user_fed_lrsj')
        .update({ dados_validados: true, validado_em: new Date().toISOString(), validado_por: user.id })
        .eq('stakeholder_id', id)
    }

    // Notificar atleta quando aprovado pela primeira vez
    if (wasNotAceito && nowAceito && data.telefone) {
      notifyAtletaBoasVindas({
        nome_completo: data.nome_completo,
        telefone: data.telefone,
      }).catch(() => {}) // fire-and-forget
    }

    // Audit log (fire-and-forget)
    const { data: actorSt } = await supabaseAdmin.from('stakeholders').select('nome_completo').eq('id', user.id).single()
    supabaseAdmin.from('profile_audit_log').insert({
      target_id: id,
      actor_id: user.id,
      actor_nome: actorSt?.nome_completo ?? user.email,
      action: 'update_fed',
      fields: Object.keys(payload),
    }).then(() => {}, () => {})

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
