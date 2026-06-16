import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import PesagemDocument from '@/lib/pdf/PesagemDocument'

export const runtime = 'nodejs'
export const maxDuration = 30

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stake } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!ADMIN_ROLES.includes(stake?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('nome, data_evento')
    .eq('id', eventoId)
    .maybeSingle()
  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const { data: regs } = await supabaseAdmin
    .from('event_registrations')
    .select(`
      id, atleta_id, peso_inscricao,
      categories:event_categories!event_registrations_category_id_fkey(nome_display),
      pesagem:event_weigh_ins(peso_oficial, status)
    `)
    .eq('event_id', eventoId)
    .in('status', ['confirmed', 'pago', 'confirmado', 'aprovado'])
    .order('category_id', { ascending: true })

  const atletaIds = (regs || []).map(r => r.atleta_id).filter(Boolean) as string[]
  const stakeMap = new Map<string, string>()
  if (atletaIds.length) {
    const { data: stakes } = await supabaseAdmin
      .from('stakeholders')
      .select('id, nome_completo')
      .in('id', atletaIds)
    for (const s of stakes || []) stakeMap.set(s.id, s.nome_completo || '—')
  }

  const rows = (regs || []).map(r => {
    const catRaw = Array.isArray(r.categories) ? r.categories[0] : r.categories
    const cat = catRaw as { nome_display: string } | null
    const p = (Array.isArray(r.pesagem) ? r.pesagem[0] : r.pesagem) as { peso_oficial: number | null; status: string } | null
    return {
      id: r.id,
      nome: r.atleta_id ? stakeMap.get(r.atleta_id) || '—' : '—',
      categoria: cat?.nome_display || '—',
      peso_inscricao: r.peso_inscricao,
      peso_oficial: p?.peso_oficial ?? null,
      status: p?.status ?? 'pendente',
    }
  }).sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))

  const counts = {
    total: rows.length,
    aprovado: rows.filter(r => r.status === 'aprovado').length,
    rejeitado: rows.filter(r => r.status === 'rejeitado').length,
    pendente: rows.filter(r => r.status === 'pendente').length,
    acima: rows.filter(r => r.status === 'acima').length,
    abaixo: rows.filter(r => r.status === 'abaixo').length,
  }

  const dataFmt = evento.data_evento
    ? new Date(evento.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')
    : ''

  const buf = await renderToBuffer(
    <PesagemDocument
      eventoNome={evento.nome}
      dataEvento={dataFmt}
      rows={rows}
      counts={counts}
    />
  )

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="pesagem-${eventoId}.pdf"`,
    },
  })
}
