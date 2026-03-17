const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const TOKEN = process.env.WHATSAPP_TOKEN!
const BASE = `https://graph.facebook.com/v21.0`

function normalize(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

export async function sendText(to: string, text: string) {
  const res = await fetch(`${BASE}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalize(to),
      type: 'text',
      text: { body: text },
    }),
  })
  return res.json()
}

export async function checkStatus() {
  const res = await fetch(`${BASE}/${PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
  })
  return res.json()
}
