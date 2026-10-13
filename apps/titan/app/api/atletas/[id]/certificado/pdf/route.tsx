import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gerarCertificadoAtletaPdf } from '@/lib/pdf/atletaDocumentos'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const pdf = await gerarCertificadoAtletaPdf(id)
  if (!pdf) return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })

  return new NextResponse(new Uint8Array(pdf.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificado-${pdf.slug}.pdf"`,
      'X-Academia': pdf.academiaNome ? encodeURIComponent(pdf.academiaNome) : 'sem-academia',
    },
  })
}
