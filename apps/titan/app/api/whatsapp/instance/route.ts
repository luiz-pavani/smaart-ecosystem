import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInstance, getQRCode, getStatus, deleteInstance } from '@/lib/whatsapp/evolution'

// GET — status + QR code
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const academiaId = req.nextUrl.searchParams.get('academia_id')
  if (!academiaId) return NextResponse.json({ error: 'academia_id required' }, { status: 400 })

  const action = req.nextUrl.searchParams.get('action') // 'status' | 'qr'

  if (action === 'qr') {
    const data = await getQRCode(academiaId)
    return NextResponse.json(data)
  }

  const data = await getStatus(academiaId)
  return NextResponse.json(data || { state: 'DISCONNECTED' })
}

// POST — create instance
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { academia_id } = await req.json()
  if (!academia_id) return NextResponse.json({ error: 'academia_id required' }, { status: 400 })

  const data = await createInstance(academia_id)
  return NextResponse.json(data)
}

// DELETE — disconnect instance
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const academiaId = req.nextUrl.searchParams.get('academia_id')
  if (!academiaId) return NextResponse.json({ error: 'academia_id required' }, { status: 400 })

  const data = await deleteInstance(academiaId)
  return NextResponse.json(data)
}
