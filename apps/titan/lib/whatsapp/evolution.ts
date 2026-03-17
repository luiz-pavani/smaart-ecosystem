const BASE_URL = process.env.EVOLUTION_API_URL!
const API_KEY = process.env.EVOLUTION_API_KEY!

const headers = () => ({
  'Content-Type': 'application/json',
  'apikey': API_KEY,
})

export function instanceName(academiaId: string) {
  return `academia_${academiaId.replace(/-/g, '').slice(0, 16)}`
}

export async function createInstance(academiaId: string) {
  const name = instanceName(academiaId)
  const res = await fetch(`${BASE_URL}/instance/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      instanceName: name,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
    }),
  })
  return res.json()
}

export async function getQRCode(academiaId: string) {
  const name = instanceName(academiaId)
  const res = await fetch(`${BASE_URL}/instance/connect/${name}`, {
    headers: headers(),
  })
  return res.json()
}

export async function getStatus(academiaId: string) {
  const name = instanceName(academiaId)
  const res = await fetch(`${BASE_URL}/instance/connectionState/${name}`, {
    headers: headers(),
  })
  if (!res.ok) return null
  return res.json()
}

export async function deleteInstance(academiaId: string) {
  const name = instanceName(academiaId)
  const res = await fetch(`${BASE_URL}/instance/delete/${name}`, {
    method: 'DELETE',
    headers: headers(),
  })
  return res.json()
}

export async function sendText(academiaId: string, to: string, text: string) {
  const name = instanceName(academiaId)
  // Normalize number: remove non-digits, add 55 prefix if missing
  const number = to.replace(/\D/g, '')
  const normalized = number.startsWith('55') ? number : `55${number}`

  const res = await fetch(`${BASE_URL}/message/sendText/${name}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      number: normalized,
      text,
    }),
  })
  return res.json()
}
