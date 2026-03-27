import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TOKEN = process.env.WHATSAPP_TOKEN!
const WABA_ID = process.env.WHATSAPP_WABA_ID!
const BASE = 'https://graph.facebook.com/v22.0'

const OUR_TEMPLATES = [
  'lrsj_atleta_boas_vindas_v2',
  'lrsj_atleta_plano_vencendo_v2',
  'lrsj_atleta_plano_vencido',
  'lrsj_academia_anuidade_vencendo_v2',
  'lrsj_academia_anuidade_vencida_v2',
  'lrsj_fed_novo_cadastro',
]

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!WABA_ID) {
    return NextResponse.json({ error: 'WHATSAPP_WABA_ID não configurado' }, { status: 500 })
  }

  const res = await fetch(
    `${BASE}/${WABA_ID}/message_templates?fields=name,status,category,quality_score&limit=100`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  )

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err?.error?.message || 'Erro ao consultar templates' }, { status: 502 })
  }

  const json = await res.json()
  const all: any[] = json.data || []

  // Filtra só os nossos e garante que todos apareçam (mesmo os não cadastrados ainda)
  const templates = OUR_TEMPLATES.map(name => {
    const found = all.find((t: any) => t.name === name)
    return {
      name,
      status: found?.status ?? 'NOT_FOUND',
      category: found?.category ?? null,
      quality_score: found?.quality_score?.score ?? null,
    }
  })

  return NextResponse.json({ templates })
}
