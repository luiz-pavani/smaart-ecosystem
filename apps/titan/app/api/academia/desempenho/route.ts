import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let academiaId = req.nextUrl.searchParams.get('academia_id')

  if (!academiaId) {
    const { data: perfil } = await supabaseAdmin
      .from('stakeholders')
      .select('academia_id')
      .eq('id', user.id)
      .maybeSingle()
    academiaId = perfil?.academia_id ?? null
    if (!academiaId) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 403 })
  }

  const now = new Date()
  const d30 = new Date(now); d30.setDate(now.getDate() - 30)
  const d30str = d30.toISOString().split('T')[0]

  // Last 6 months labels
  const meses: { label: string; start: string; end: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d.toISOString().split('T')[0]
    const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const end = endD.toISOString().split('T')[0]
    meses.push({
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      start,
      end,
    })
  }

  const [atletasRes, ativosRes, classesRes, checkinsRes, kyuDanRes] = await Promise.all([
    // All athletes
    supabaseAdmin
      .from('user_fed_lrsj')
      .select('stakeholder_id, status_plano, kyu_dan_id, data_adesao')
      .eq('academia_id', academiaId)
      .eq('federacao_id', 1),

    // Active athletes count
    supabaseAdmin
      .from('user_fed_lrsj')
      .select('stakeholder_id', { count: 'exact', head: true })
      .eq('academia_id', academiaId)
      .eq('federacao_id', 1)
      .eq('status_plano', 'Válido'),

    // Active classes
    supabaseAdmin
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('academy_id', academiaId)
      .eq('is_active', true),

    // Check-ins last 30 days + current month sessions
    supabaseAdmin
      .from('class_checkins')
      .select('athlete_id, class_id, checkin_date')
      .eq('academy_id', academiaId)
      .gte('checkin_date', d30str),

    // Kyu dan lookup
    supabaseAdmin.from('kyu_dan').select('id, cor_faixa, kyu_dan'),
  ])

  const atletas = atletasRes.data || []
  const atletasAtivos = ativosRes.count ?? 0
  const aulasAtivas = classesRes.count ?? 0
  const checkins = checkinsRes.data || []
  const kyuDanList = kyuDanRes.data || []

  // Retention: % active athletes with ≥1 checkin in last 30 days
  const ativosIds = new Set(atletas.filter((a: any) => a.status_plano === 'Válido').map((a: any) => a.stakeholder_id))
  const comCheckin = new Set(checkins.filter((c: any) => ativosIds.has(c.athlete_id)).map((c: any) => c.athlete_id))
  const retencao = atletasAtivos > 0 ? Math.round((comCheckin.size / atletasAtivos) * 100) : 0

  // Frequencia media: avg checkins per active athlete last 30 days
  const checkinsAtivos = checkins.filter((c: any) => ativosIds.has(c.athlete_id))
  const frequenciaMedia = atletasAtivos > 0 ? +(checkinsAtivos.length / atletasAtivos).toFixed(1) : 0

  // Aulas/mês: distinct (class_id, checkin_date) pairs — class sessions held
  const sessions = new Set(checkins.map((c: any) => `${c.class_id}_${c.checkin_date}`))
  const aulasMes = sessions.size

  // Por faixa: group by cor_faixa
  const kyuMap = new Map(kyuDanList.map((k: any) => [k.id, k.cor_faixa]))
  const faixaCount: Record<string, number> = {}
  for (const a of atletas) {
    const cor = (a.kyu_dan_id ? kyuMap.get(a.kyu_dan_id) : null) || 'Sem faixa'
    faixaCount[cor] = (faixaCount[cor] || 0) + 1
  }
  const BELT_ORDER = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Vermelha', 'Coral', 'Sem faixa']
  const porFaixa = Object.entries(faixaCount)
    .sort(([a], [b]) => BELT_ORDER.indexOf(a) - BELT_ORDER.indexOf(b))
    .map(([cor_faixa, count]) => ({ cor_faixa, count }))

  // Crescimento: new athletes per month (by data_adesao)
  const crescimento = meses.map(({ label, start, end }) => ({
    mes: label,
    novos: atletas.filter((a: any) => a.data_adesao && a.data_adesao >= start && a.data_adesao <= end).length,
  }))

  return NextResponse.json({
    total_atletas: atletas.length,
    atletas_ativos: atletasAtivos,
    aulas_ativas: aulasAtivas,
    aulas_mes: aulasMes,
    frequencia_media: frequenciaMedia,
    retencao,
    por_faixa: porFaixa,
    crescimento,
  })
}
