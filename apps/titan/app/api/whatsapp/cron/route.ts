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
  const diff = new Date(date + 'T12:00:00').getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

// GET — chamado pelo Vercel Cron (com CRON_SECRET) ou manualmente
// Query params:
//   ?dry=true  — simula o envio sem chamar a API da Meta (retorna quem seria notificado)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dry = req.nextUrl.searchParams.get('dry') === 'true'
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const results = {
    dry,
    date: new Date().toISOString(),
    atletas: { vencendo: [] as any[], vencidos: [] as any[] },
    academias: { vencendo: [] as any[], vencidas: [] as any[] },
    errors: 0,
  }

  // --- Atletas com plano vencendo (7 ou 30 dias) ---
  const { data: vencendo } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('nome_completo, telefone, data_expiracao')
    .eq('federacao_id', 1)
    .eq('status_plano', 'Válido')
    .not('telefone', 'is', null)
    .not('data_expiracao', 'is', null)

  for (const atleta of vencendo ?? []) {
    const dias = daysBetween(atleta.data_expiracao)
    if (dias === 30 || dias === 7) {
      if (!dry) {
        try {
          await notifyAtletaPlanoVencendo({
            nome_completo: atleta.nome_completo,
            telefone: atleta.telefone,
            data_expiracao: atleta.data_expiracao,
          })
        } catch { results.errors++ }
      }
      results.atletas.vencendo.push({ nome: atleta.nome_completo, telefone: atleta.telefone, dias, data: atleta.data_expiracao })
    }
  }

  // --- Atletas com plano vencido hoje ---
  const { data: vencidos } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('nome_completo, telefone, data_expiracao')
    .eq('federacao_id', 1)
    .eq('status_plano', 'Vencido')
    .not('telefone', 'is', null)
    .gte('data_expiracao', hoje.toISOString().split('T')[0])
    .lte('data_expiracao', hoje.toISOString().split('T')[0])

  for (const atleta of vencidos ?? []) {
    if (!dry) {
      try {
        await notifyAtletaPlanoVencido({
          nome_completo: atleta.nome_completo,
          telefone: atleta.telefone,
          data_expiracao: atleta.data_expiracao,
        })
      } catch { results.errors++ }
    }
    results.atletas.vencidos.push({ nome: atleta.nome_completo, telefone: atleta.telefone, data: atleta.data_expiracao })
  }

  // --- Academias com anuidade vencendo ou vencida ---
  const { data: acads } = await supabaseAdmin
    .from('academias')
    .select('nome, responsavel_nome, responsavel_telefone, anualidade_vencimento')
    .eq('ativo', true)
    .not('responsavel_telefone', 'is', null)
    .not('anualidade_vencimento', 'is', null)

  for (const academia of acads ?? []) {
    const dias = daysBetween(academia.anualidade_vencimento)
    if (dias === 30 || dias === 7) {
      if (!dry) {
        try {
          await notifyAcademiaAnualidadeVencendo({
            nome: academia.nome,
            responsavel_nome: academia.responsavel_nome,
            responsavel_telefone: academia.responsavel_telefone,
            anualidade_vencimento: academia.anualidade_vencimento,
          })
        } catch { results.errors++ }
      }
      results.academias.vencendo.push({ nome: academia.nome, telefone: academia.responsavel_telefone, dias, data: academia.anualidade_vencimento })
    } else if (dias === 0) {
      if (!dry) {
        try {
          await notifyAcademiaAnualidadeVencida({
            nome: academia.nome,
            responsavel_nome: academia.responsavel_nome,
            responsavel_telefone: academia.responsavel_telefone,
            anualidade_vencimento: academia.anualidade_vencimento,
          })
        } catch { results.errors++ }
      }
      results.academias.vencidas.push({ nome: academia.nome, telefone: academia.responsavel_telefone, data: academia.anualidade_vencimento })
    }
  }

  return NextResponse.json({
    ok: true,
    dry,
    date: results.date,
    summary: {
      atletas_vencendo: results.atletas.vencendo.length,
      atletas_vencidos: results.atletas.vencidos.length,
      academias_vencendo: results.academias.vencendo.length,
      academias_vencidas: results.academias.vencidas.length,
      errors: results.errors,
    },
    detail: results,
  })
}
