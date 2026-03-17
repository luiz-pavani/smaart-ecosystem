import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendText } from '@/lib/whatsapp/evolution'

// POST — send WhatsApp message
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { academia_id, to, text } = await req.json()

  if (!academia_id || !to || !text) {
    return NextResponse.json({ error: 'academia_id, to e text são obrigatórios' }, { status: 400 })
  }

  const data = await sendText(academia_id, to, text)
  return NextResponse.json(data)
}
