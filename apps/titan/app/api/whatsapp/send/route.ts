import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendText } from '@/lib/whatsapp/meta'

// POST — send WhatsApp message via Meta Business API
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, text } = await req.json()

  if (!to || !text) {
    return NextResponse.json({ error: 'to e text são obrigatórios' }, { status: 400 })
  }

  const data = await sendText(to, text)
  return NextResponse.json(data)
}
