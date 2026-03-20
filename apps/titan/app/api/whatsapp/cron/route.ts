import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  notifyAtletaPlanoVencendo,
  notifyAtletaPlanoVencido,
  notifyAcademiaAnualidadeVencendo,
  notifyAcademiaAnualidadeVencida,
} from '@/lib/whatsapp/notifications'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function daysBetween(date: string): number {
  const diff = new Date(date).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

// GET — chamado pelo Vercel Cron ou manualmente (com CRON_SECRET)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { atletas: { vencendo: 0, vencidos: 0 }, academias: { vencendo: 0, vencidas: 0 }, errors: 0 }

  // --- Atletas com plano vencendo (7 ou 30 dias) ---
  const { data: vencendo } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('nome_completo, telefone, data_expiracao, academias')
    .eq('status_plano', 'Válido')
    .not('telefone', 'is', null)
    .not('data_expiracao', 'is', null)

  for (const atleta of vencendo ?? []) {
    const dias = daysBetween(atleta.data_expiracao)
    if (dias === 30 || dias === 7) {
      try {
        await notifyAtletaPlanoVencendo({
          nome_completo: atleta.nome_completo,
          telefone: atleta.telefone,
          data_expiracao: atleta.data_expiracao,
          dias,
        })
        results.atletas.vencendo++
      } catch { results.errors++ }
    }
  }

  // --- Atletas com plano vencido hoje ---
  const { data: vencidos } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('nome_completo, telefone')
    .eq('status_plano', 'Vencido')
    .not('telefone', 'is', null)
    .gte('data_expiracao', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .lte('data_expiracao', new Date(new Date().setHours(23, 59, 59, 999)).toISOString())

  for (const atleta of vencidos ?? []) {
    try {
      await notifyAtletaPlanoVencido({ nome_completo: atleta.nome_completo, telefone: atleta.telefone })
      results.atletas.vencidos++
    } catch { results.errors++ }
  }

  // --- Academias com anuidade vencendo (30 ou 7 dias) ---
  const { data: acadVencendo } = await supabaseAdmin
    .from('academias')
    .select('nome, responsavel_telefone, anualidade_vencimento')
    .eq('ativo', true)
    .not('responsavel_telefone', 'is', null)
    .not('anualidade_vencimento', 'is', null)

  for (const academia of acadVencendo ?? []) {
    const dias = daysBetween(academia.anualidade_vencimento)
    if (dias === 30 || dias === 7) {
      try {
        await notifyAcademiaAnualidadeVencendo({
          nome: academia.nome,
          responsavel_telefone: academia.responsavel_telefone,
          anualidade_vencimento: academia.anualidade_vencimento,
          dias,
        })
        results.academias.vencendo++
      } catch { results.errors++ }
    } else if (dias === 0) {
      try {
        await notifyAcademiaAnualidadeVencida({
          nome: academia.nome,
          responsavel_telefone: academia.responsavel_telefone,
        })
        results.academias.vencidas++
      } catch { results.errors++ }
    }
  }

  return NextResponse.json({ ok: true, date: new Date().toISOString(), results })
}
