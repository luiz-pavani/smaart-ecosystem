import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { carregarEntrega, temCertificadoKyu } from '@/lib/registro/federacao'
import { gerarCertificadoAtletaPdf, gerarIdentidadeAtletaPdf } from '@/lib/pdf/atletaDocumentos'

export const runtime = 'nodejs'
export const maxDuration = 30

type Params = { params: Promise<{ token: string; tipo: string }> }

/** GET /api/documentos/[token]/(certificado|identidade) — PDFs do link de entrega (sem login). */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token, tipo } = await params
  if (tipo !== 'certificado' && tipo !== 'identidade') return NextResponse.json({ error: 'Documento inválido' }, { status: 404 })

  const entrega = await carregarEntrega(token)
  if (!entrega) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })

  // Só entrega documentos de filiação ativa.
  const { data: filiacao } = await supabaseAdmin
    .from('stakeholder_filiacoes')
    .select('status_membro, kyu_dan_id')
    .eq('stakeholder_id', entrega.stakeholder_id)
    .eq('federacao_id', entrega.federacao_id)
    .maybeSingle()
  if (!filiacao || !['ativo', 'aprovado'].includes(filiacao.status_membro ?? '')) {
    return NextResponse.json({ error: 'Filiação não está ativa' }, { status: 403 })
  }
  if (tipo === 'certificado' && !temCertificadoKyu(filiacao.kyu_dan_id)) {
    return NextResponse.json({ error: 'Certificado de dan é emitido pela federação' }, { status: 404 })
  }

  const pdf = tipo === 'certificado'
    ? await gerarCertificadoAtletaPdf(entrega.stakeholder_id)
    : await gerarIdentidadeAtletaPdf(entrega.stakeholder_id)
  if (!pdf) return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })

  return new NextResponse(new Uint8Array(pdf.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${tipo}-${pdf.slug}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
