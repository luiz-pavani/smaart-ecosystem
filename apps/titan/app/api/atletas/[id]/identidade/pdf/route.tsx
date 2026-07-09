import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import IdentidadeAtletaDocument from '@/lib/pdf/IdentidadeAtletaDocument'

export const runtime = 'nodejs'
export const maxDuration = 30

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

function resolveAssetUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('http')) return pathOrUrl
  const clean = pathOrUrl.replace(/^\/+/, '')
  return `${SUPABASE_URL}/storage/v1/object/public/${clean}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, kyu_dan_id, academia_id, data_nascimento')
    .eq('id', id)
    .maybeSingle()
  if (!stakeholder) return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })

  const { data: filiacao } = await supabaseAdmin
    .from('stakeholder_filiacoes')
    .select('academia_id, kyu_dan_id, nivel_arbitragem, data_expiracao')
    .eq('stakeholder_id', id)
    .eq('federacao_id', '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d')
    .maybeSingle()

  const kyuDanId = stakeholder.kyu_dan_id || filiacao?.kyu_dan_id
  const academiaId = stakeholder.academia_id || filiacao?.academia_id

  let graduacao = ''
  if (kyuDanId) {
    const { data: kd } = await supabaseAdmin
      .from('kyu_dan')
      .select('kyu_dan, cor_faixa')
      .eq('id', kyuDanId)
      .maybeSingle()
    if (kd) graduacao = `${kd.kyu_dan} | ${kd.cor_faixa}`
  }

  let academiaLogoUrl: string | null = null
  if (academiaId) {
    const { data: acad } = await supabaseAdmin
      .from('academias')
      .select('nome, sigla')
      .eq('id', academiaId)
      .maybeSingle()
    if (acad) {
      const namesToTry = [acad.nome, acad.sigla].filter(Boolean) as string[]
      for (const n of namesToTry) {
        const { data: logo } = await supabaseAdmin
          .from('academy_logos')
          .select('logo_url')
          .eq('academia_nome', n)
          .maybeSingle()
        if (logo?.logo_url) { academiaLogoUrl = resolveAssetUrl(logo.logo_url); break }
      }
    }
  }

  const { data: template } = await supabaseAdmin
    .from('document_templates')
    .select('background_url, width, height, field_config')
    .eq('template_type', 'identidade')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const backgroundUrl = resolveAssetUrl(template?.background_url || 'fundos/identidade-fundo.png')

  const dnFmt = stakeholder.data_nascimento
    ? new Date(stakeholder.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
    : ''
  const valFmt = filiacao?.data_expiracao
    ? new Date(filiacao.data_expiracao + 'T00:00:00').toLocaleDateString('pt-BR')
    : ''

  const buf = await renderToBuffer(
    <IdentidadeAtletaDocument
      atleta={{
        nome: stakeholder.nome_completo || '—',
        graduacao,
        dataNascimento: dnFmt,
        nivelArbitragem: filiacao?.nivel_arbitragem || '',
        validade: valFmt,
      }}
      backgroundUrl={backgroundUrl}
      academiaLogoUrl={academiaLogoUrl}
      templateWidth={template?.width || 9000}
      templateHeight={template?.height || 14346}
      fieldConfig={template?.field_config || {}}
    />
  )

  const slug = (stakeholder.nome_completo || 'atleta').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="identidade-${slug}.pdf"`,
    },
  })
}
