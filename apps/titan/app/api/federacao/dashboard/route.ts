import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const federacaoId = req.nextUrl.searchParams.get('federacao_id') // UUID da federação

  // Academias
  let acadQuery = supabaseAdmin.from('academias').select('id, nome, ativo, endereco_cidade')
  if (federacaoId) acadQuery = acadQuery.eq('federacao_id', federacaoId)
  const { data: academias } = await acadQuery

  const totalAcademias = (academias || []).length
  const academiasAtivas = (academias || []).filter((a: any) => a.ativo === true).length

  // Mapa academia_id → nome e cidade
  const academiaMap = new Map<string, { nome: string; cidade: string }>()
  ;(academias || []).forEach((a: any) => {
    academiaMap.set(a.id, { nome: a.nome || a.id, cidade: a.endereco_cidade || '' })
  })

  // Filiados (user_fed_lrsj, federacao_id=1 = inteiro LRSJ)
  const { data: filiados } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('academia_id, status_plano, data_adesao')
    .eq('federacao_id', 1)

  const totalFiliados = (filiados || []).length
  const filiadosAtivos = (filiados || []).filter((f: any) => f.status_plano === 'Válido').length

  // Crescimento YoY — total filiados em mesma data ano passado
  const lastYear = new Date()
  lastYear.setFullYear(lastYear.getFullYear() - 1)
  const lastYearStr = lastYear.toISOString().split('T')[0]
  const totalAnoPassado = (filiados || []).filter((f: any) =>
    f.data_adesao && f.data_adesao.slice(0, 10) <= lastYearStr
  ).length
  const deltaFiliados = totalFiliados - totalAnoPassado
  const crescimentoPct = totalAnoPassado > 0
    ? Math.round((deltaFiliados / totalAnoPassado) * 100)
    : 0

  // Atletas ativos por filiada (top 10)
  const ativosPorAcademia = new Map<string, number>()
  ;(filiados || []).filter((f: any) => f.status_plano === 'Válido').forEach((f: any) => {
    if (f.academia_id) ativosPorAcademia.set(f.academia_id, (ativosPorAcademia.get(f.academia_id) || 0) + 1)
  })

  const ativosPorFiliada = Array.from(ativosPorAcademia.entries())
    .map(([id, count]) => ({
      name: academiaMap.get(id)?.nome || id,
      value: count,
      subtitle: academiaMap.get(id)?.cidade || '',
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // Top academias por total de filiados
  const totalPorAcademia = new Map<string, number>()
  ;(filiados || []).forEach((f: any) => {
    if (f.academia_id) totalPorAcademia.set(f.academia_id, (totalPorAcademia.get(f.academia_id) || 0) + 1)
  })

  const topAcademias = Array.from(totalPorAcademia.entries())
    .map(([id, count]) => ({
      name: academiaMap.get(id)?.nome || id,
      value: count,
      subtitle: academiaMap.get(id)?.cidade || '',
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  return NextResponse.json({
    totalAcademias,
    academiasAtivas,
    totalFiliados,
    filiadosAtivos,
    deltaFiliados,
    crescimentoPct,
    totalAnoPassado,
    ativosPorFiliada,
    topAcademias,
  })
}
