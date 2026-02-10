import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * GET /api/tracking/click?id={tracking_id}
 * Rastreia clique no link do email
 * Pode ser acionado automaticamente ao chegar no checkout
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const trackingId = searchParams.get('id')

    if (!trackingId) {
      console.log('[Tracking] ID de clique não fornecido')
      return NextResponse.json(
        { error: 'Tracking ID não fornecido' },
        { status: 400 }
      )
    }

    console.log(`[Tracking] Clique registrado - ID: ${trackingId}`)

    // Atualizar no banco de dados
    const { error } = await supabaseAdmin
      .from('launch_campaign_leads')
      .update({
        email_clicked_at: new Date().toISOString(),
        status: 'clicked'
      })
      .eq('tracking_id', trackingId)
      .is('email_clicked_at', null) // Só atualiza se ainda não foi marcado

    if (error) {
      console.error('[Tracking] Erro ao atualizar clique:', error)
    } else {
      console.log(`[Tracking] Clique registrado para ${trackingId}`)
    }

    return NextResponse.json(
      { success: true, message: 'Clique registrado' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Tracking] Erro ao rastrear clique:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar clique' },
      { status: 500 }
    )
  }
}
