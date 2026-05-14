import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notificarAdminsMudancaPendente } from '@/lib/notificacoes/mudancas-pendentes'

const ALLOWED = [
  'nome_completo', 'nome_usuario', 'email', 'telefone', 'genero',
  'data_nascimento', 'kyu_dan_id', 'academia_id', 'federacao_id', 'instagram',
] as const

const CAMPOS_CRITICOS = new Set(['nome_completo', 'kyu_dan_id', 'federacao_id'])

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const payload: Record<string, unknown> = {}

    for (const key of ALLOWED) {
      if (key in body) {
        const val = body[key]
        payload[key] = val === '' ? null : (val ?? null)
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido enviado' }, { status: 400 })
    }

    // When academia_id is set, auto-resolve federacao_id from that academy
    if (payload.academia_id && !payload.federacao_id) {
      const { data: acad } = await supabaseAdmin
        .from('academias')
        .select('federacao_id')
        .eq('id', payload.academia_id)
        .maybeSingle()
      if (acad?.federacao_id) payload.federacao_id = acad.federacao_id
    }

    // Verificar se candidato tem inscrição com dados conferidos (trava ativa)
    const { data: inscricao } = await supabaseAdmin
      .from('candidato_inscricoes')
      .select('id, dados_verificados_em')
      .eq('stakeholder_id', user.id)
      .maybeSingle()

    const travado = !!inscricao?.dados_verificados_em

    // Separa críticos x não-críticos quando travado
    const pendencias: { campo: string; valor_antigo: string | null; valor_novo: string | null }[] = []
    const updateDireto: Record<string, unknown> = {}

    if (travado) {
      const { data: atual } = await supabaseAdmin
        .from('stakeholders')
        .select('nome_completo, kyu_dan_id, federacao_id')
        .eq('id', user.id)
        .single()

      for (const [k, v] of Object.entries(payload)) {
        if (CAMPOS_CRITICOS.has(k)) {
          const valorAntigo = atual ? (atual as any)[k] : null
          const novoStr = v === null || v === undefined ? null : String(v)
          const antigoStr = valorAntigo === null || valorAntigo === undefined ? null : String(valorAntigo)
          if (novoStr === antigoStr) continue
          pendencias.push({ campo: k, valor_antigo: antigoStr, valor_novo: novoStr })
        } else {
          updateDireto[k] = v
        }
      }
    } else {
      Object.assign(updateDireto, payload)
    }

    // UPDATE direto nos campos permitidos
    let data: any = null
    if (Object.keys(updateDireto).length > 0) {
      const { data: updated, error } = await supabaseAdmin
        .from('stakeholders')
        .update(updateDireto)
        .eq('id', user.id)
        .select('*')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      data = updated
    }

    // INSERT pendências para campos críticos quando travado
    const mudancasCriadas: any[] = []
    for (const p of pendencias) {
      const { data: m, error: insErr } = await supabaseAdmin
        .from('stakeholder_mudanca_pendente')
        .upsert(
          {
            stakeholder_id: user.id,
            campo: p.campo,
            valor_antigo: p.valor_antigo,
            valor_novo: p.valor_novo,
            status: 'pendente',
            solicitado_em: new Date().toISOString(),
          },
          { onConflict: 'stakeholder_id,campo', ignoreDuplicates: false }
        )
        .select()
        .single()
      if (!insErr && m) mudancasCriadas.push(m)
    }

    if (mudancasCriadas.length > 0) {
      // Best-effort: não bloqueia se falhar
      notificarAdminsMudancaPendente(user.id, mudancasCriadas).catch((err: unknown) => {
        console.error('Falha ao notificar admins:', err)
      })
    }

    return NextResponse.json({
      data,
      pendencias: mudancasCriadas,
      travado,
      mensagem: mudancasCriadas.length
        ? `${mudancasCriadas.length} alteração(ões) em campos críticos enviada(s) para aprovação`
        : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
