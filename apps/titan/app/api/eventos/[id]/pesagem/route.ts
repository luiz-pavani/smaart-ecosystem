import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

async function getRole(userId: string) {
  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role ?? null
}

// GET /api/eventos/[id]/pesagem — lista inscricoes com status de pesagem
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const statusFilter = req.nextUrl.searchParams.get('status')
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase() || ''

  // Fetch event config for pesagem rules
  const { data: eventoData } = await supabaseAdmin
    .from('eventos')
    .select('config')
    .eq('id', eventoId)
    .maybeSingle()
  const pesagemConfig = {
    acima_peso: ((eventoData?.config as Record<string, unknown>)?.pesagem_acima_peso as string) || 'desclassificar',
    abaixo_peso: ((eventoData?.config as Record<string, unknown>)?.pesagem_abaixo_peso as string) || 'ignorar',
    tolerancia_g: Number((eventoData?.config as Record<string, unknown>)?.pesagem_tolerancia_g) || 0,
  }

  const { data: regs, error } = await supabaseAdmin
    .from('event_registrations')
    .select(`
      id, atleta_id, academia_id, peso_inscricao, dados_atleta, status,
      category:event_categories(
        id, nome_display, genero, tempo_luta_seg,
        weight_class:event_weight_classes(peso_min, peso_max)
      )
    `)
    .eq('event_id', eventoId)
    .in('status', ['confirmado', 'inscrito', 'pago'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const regIds = (regs || []).map(r => r.id)
  const { data: weighs } = await supabaseAdmin
    .from('event_weigh_ins')
    .select('*')
    .in('registration_id', regIds.length ? regIds : ['00000000-0000-0000-0000-000000000000'])

  const weighMap = new Map((weighs || []).map(w => [w.registration_id, w]))

  let rows = (regs || []).map(r => {
    const cat = r.category as unknown as {
      id: string
      nome_display: string
      genero: string
      weight_class: { peso_min: number | null; peso_max: number | null } | null
    } | null
    const wc = cat?.weight_class || null
    const dados = (r.dados_atleta || {}) as Record<string, unknown>
    const nome = (dados.nome_completo as string) || (dados.nome as string) || '—'
    const academia = (dados.academia as string) || ''
    const w = weighMap.get(r.id) || null
    return {
      registration_id: r.id,
      nome,
      academia,
      peso_inscricao: r.peso_inscricao,
      categoria_id: cat?.id || null,
      categoria_nome: cat?.nome_display || '',
      peso_min: wc?.peso_min ?? null,
      peso_max: wc?.peso_max ?? null,
      pesagem: w,
      status: (w?.status as string) || 'pendente',
    }
  })

  if (q) {
    rows = rows.filter(r =>
      r.nome.toLowerCase().includes(q) ||
      r.academia.toLowerCase().includes(q) ||
      r.categoria_nome.toLowerCase().includes(q)
    )
  }
  if (statusFilter) rows = rows.filter(r => r.status === statusFilter)

  const counts = {
    total: rows.length,
    pendente: rows.filter(r => r.status === 'pendente').length,
    aprovado: rows.filter(r => r.status === 'aprovado').length,
    rejeitado: rows.filter(r => r.status === 'rejeitado').length,
    acima: rows.filter(r => r.status === 'acima').length,
    abaixo: rows.filter(r => r.status === 'abaixo').length,
  }

  return NextResponse.json({ rows, counts, pesagem_config: pesagemConfig })
}

// POST /api/eventos/[id]/pesagem — registra/atualiza pesagem
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const { registration_id, peso_oficial, observacao } = body

  if (!registration_id || typeof peso_oficial !== 'number') {
    return NextResponse.json({ error: 'registration_id e peso_oficial obrigatórios' }, { status: 400 })
  }

  // Busca a inscrição e a categoria para saber o limite
  const { data: reg, error: regErr } = await supabaseAdmin
    .from('event_registrations')
    .select(`
      id, category_id,
      category:event_categories(
        id,
        weight_class:event_weight_classes(peso_min, peso_max)
      )
    `)
    .eq('id', registration_id)
    .eq('event_id', eventoId)
    .maybeSingle()

  if (regErr || !reg) return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })

  // Busca config de pesagem do evento
  const { data: eventoData } = await supabaseAdmin
    .from('eventos')
    .select('config')
    .eq('id', eventoId)
    .maybeSingle()

  const config = (eventoData?.config || {}) as Record<string, unknown>
  const regraAcima = (config.pesagem_acima_peso as string) || 'desclassificar'
  const regraAbaixo = (config.pesagem_abaixo_peso as string) || 'ignorar'
  const toleranciaG = Number(config.pesagem_tolerancia_g) || 0
  const toleranciaKg = toleranciaG / 1000

  const cat = reg.category as unknown as {
    id: string
    weight_class: { peso_min: number | null; peso_max: number | null } | null
  } | null
  const wc = cat?.weight_class || null
  const pesoMin = wc?.peso_min ?? null
  const pesoMax = wc?.peso_max ?? null

  // Calcular se está acima/abaixo considerando tolerância
  const limiteEfetivoMax = pesoMax !== null ? pesoMax + toleranciaKg : null
  const acimaMax = limiteEfetivoMax !== null && peso_oficial > limiteEfetivoMax
  const abaixoMin = pesoMin !== null && peso_oficial < pesoMin
  const dentroLimite = !acimaMax && !abaixoMin

  // Determinar status baseado nas regras do evento
  let status: string
  if (dentroLimite) {
    status = 'aprovado'
  } else if (acimaMax) {
    if (regraAcima === 'desclassificar') status = 'rejeitado'
    else if (regraAcima === 'registrar') status = 'acima'
    else status = 'aprovado' // ignorar
  } else {
    // abaixoMin
    if (regraAbaixo === 'desclassificar') status = 'rejeitado'
    else if (regraAbaixo === 'registrar') status = 'abaixo'
    else status = 'aprovado' // ignorar
  }

  const { data: upserted, error: upErr } = await supabaseAdmin
    .from('event_weigh_ins')
    .upsert({
      evento_id: eventoId,
      registration_id,
      category_id: reg.category_id,
      peso_oficial,
      peso_min: pesoMin,
      peso_max: pesoMax,
      dentro_limite: dentroLimite,
      status,
      observacao: observacao || null,
      pesado_por: user.id,
      pesado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'registration_id' })
    .select()
    .single()

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({ pesagem: upserted })
}
