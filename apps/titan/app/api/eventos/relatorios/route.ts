import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const now = new Date()

  // Last 6 months
  const meses: { label: string; start: string; end: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d.toISOString().split('T')[0]
    const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    meses.push({
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      start,
      end: endD.toISOString().split('T')[0],
    })
  }

  const [eventosRes, regsRes] = await Promise.all([
    supabaseAdmin.from('eventos').select('id, data_evento, status'),
    supabaseAdmin.from('event_registrations').select('id, event_id, registration_date, status'),
  ])

  const eventos = eventosRes.data || []
  const regs = regsRes.data || []

  const total_eventos = eventos.length
  const proximos = eventos.filter(e => e.data_evento >= now.toISOString().split('T')[0]).length
  const total_inscritos = regs.length

  // Inscrições por mês
  const inscricoes_por_mes = meses.map(m => ({
    mes: m.label,
    count: regs.filter(r => r.registration_date >= m.start && r.registration_date <= m.end).length,
  }))

  // Eventos por mês
  const eventos_por_mes = meses.map(m => ({
    mes: m.label,
    count: eventos.filter(e => e.data_evento >= m.start && e.data_evento <= m.end).length,
  }))

  // Status distribution
  const statusCount: Record<string, number> = {}
  for (const e of eventos) {
    const s = e.status || 'Sem status'
    statusCount[s] = (statusCount[s] || 0) + 1
  }

  return NextResponse.json({
    total_eventos,
    proximos,
    total_inscritos,
    inscricoes_por_mes,
    eventos_por_mes,
    status_dist: Object.entries(statusCount).map(([status, count]) => ({ status, count })),
  })
}
