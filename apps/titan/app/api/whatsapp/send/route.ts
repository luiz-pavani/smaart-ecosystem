import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendText, sendTemplate } from '@/lib/whatsapp/meta'

// POST — send WhatsApp message via Meta Business API
// Body: { to, template } — sends approved template (proactive)
// Body: { to, text }    — sends free text (only within 24h session window)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, text, template } = await req.json()

  if (!to) return NextResponse.json({ error: 'to é obrigatório' }, { status: 400 })

  if (template) {
    const data = await sendTemplate(to, template)
    return NextResponse.json(data)
  }

  if (!text) return NextResponse.json({ error: 'text ou template é obrigatório' }, { status: 400 })
  const data = await sendText(to, text)
  return NextResponse.json(data)
}
