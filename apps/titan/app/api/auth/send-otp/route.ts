import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const TOKEN = process.env.WHATSAPP_TOKEN!
const BASE = 'https://graph.facebook.com/v22.0'

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST — envia OTP via WhatsApp para verificação de telefone
// Body: { telefone: string }
export async function POST(req: NextRequest) {
  const { telefone } = await req.json()

  const phone = normalizePhone(telefone || '')
  if (!phone) {
    return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
  }

  // Rate limit: máximo 3 OTPs por telefone nos últimos 10 minutos
  const { count } = await supabaseAdmin
    .from('otp_verifications')
    .select('*', { count: 'exact', head: true })
    .eq('telefone', phone)
    .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde 10 minutos.' }, { status: 429 })
  }

  const code = generateOTP()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  // Salvar OTP no banco
  const { error: dbError } = await supabaseAdmin
    .from('otp_verifications')
    .insert({ telefone: phone, code, expires_at: expiresAt })

  if (dbError) {
    return NextResponse.json({ error: 'Erro ao salvar código' }, { status: 500 })
  }

  // Enviar via WhatsApp (template de autenticação)
  const res = await fetch(`${BASE}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: 'lrsj_otp_verificacao',
        language: { code: 'pt_BR' },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: code }],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: code }],
          },
        ],
      },
    }),
  })

  const data = await res.json()

  if (data?.messages?.[0]?.id) {
    return NextResponse.json({ ok: true, telefone: phone })
  }

  return NextResponse.json({ error: 'Erro ao enviar WhatsApp', detail: data }, { status: 502 })
}
