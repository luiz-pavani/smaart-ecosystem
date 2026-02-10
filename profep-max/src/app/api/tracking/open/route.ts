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
 * GET /api/tracking/open?id={tracking_id}
 * Rastreia abertura de email (pixel tracking)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const trackingId = searchParams.get('id')

    if (!trackingId) {
      console.log('[Tracking] ID não fornecido')
      return new NextResponse(
        Buffer.from([
          0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
          0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
          0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x01,
          0x44, 0x00, 0x3b
        ]),
        {
          status: 200,
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      )
    }

    console.log(`[Tracking] Email aberto - ID: ${trackingId}`)

    // Atualizar no banco de dados
    const { error } = await supabaseAdmin
      .from('launch_campaign_leads')
      .update({
        email_opened_at: new Date().toISOString(),
        status: 'opened'
      })
      .eq('tracking_id', trackingId)
      .is('email_opened_at', null) // Só atualiza se ainda não foi marcado

    if (error) {
      console.error('[Tracking] Erro ao atualizar abertura:', error)
    } else {
      console.log(`[Tracking] Abertura registrada para ${trackingId}`)
    }

    // Retornar pixel GIF 1x1 transparente
    return new NextResponse(
      Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
        0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x01,
        0x44, 0x00, 0x3b
      ]),
      {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    console.error('[Tracking] Erro ao rastrear abertura:', error)
    // Retornar pixel mesmo com erro
    return new NextResponse(
      Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
        0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x01,
        0x44, 0x00, 0x3b
      ]),
      { status: 200, headers: { 'Content-Type': 'image/gif' } }
    )
  }
}
