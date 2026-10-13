import { renderToBuffer } from '@react-pdf/renderer'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { LRSJ_FED_UUID } from '@/lib/filiacao/lrsj'
import CertificadoAtletaDocument from '@/lib/pdf/CertificadoAtletaDocument'
import IdentidadeAtletaDocument from '@/lib/pdf/IdentidadeAtletaDocument'

/**
 * Certificado de graduação e identidade do atleta em PDF (server-side, @react-pdf).
 * Usado pelas rotas autenticadas /api/atletas/[id]/(certificado|identidade)/pdf e pela
 * página pública de entrega /documentos/[token].
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

export function resolveAssetUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('http')) return pathOrUrl
  const clean = pathOrUrl.replace(/^\/+/, '')
  return `${SUPABASE_URL}/storage/v1/object/public/${clean}`
}

export interface PdfAtleta { buffer: Buffer; slug: string; academiaNome: string | null }

const slugDe = (nome: string | null) =>
  (nome || 'atleta').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

async function graduacaoTexto(kyuDanId: number | null | undefined): Promise<string> {
  if (!kyuDanId) return ''
  const { data: kd } = await supabaseAdmin.from('kyu_dan').select('kyu_dan, cor_faixa').eq('id', kyuDanId).maybeSingle()
  return kd ? `${kd.kyu_dan} | ${kd.cor_faixa}` : ''
}

async function academiaComLogo(academiaId: string | null | undefined): Promise<{ nome: string | null; logoUrl: string | null }> {
  if (!academiaId) return { nome: null, logoUrl: null }
  const { data: acad } = await supabaseAdmin.from('academias').select('nome, sigla').eq('id', academiaId).maybeSingle()
  if (!acad) return { nome: null, logoUrl: null }
  for (const n of [acad.nome, acad.sigla].filter(Boolean) as string[]) {
    const { data: logo } = await supabaseAdmin.from('academy_logos').select('logo_url').eq('academia_nome', n).maybeSingle()
    if (logo?.logo_url) return { nome: acad.nome, logoUrl: resolveAssetUrl(logo.logo_url) }
  }
  return { nome: acad.nome, logoUrl: null }
}

async function templateAtivo(tipo: 'certificado' | 'identidade') {
  const { data } = await supabaseAdmin
    .from('document_templates')
    .select('background_url, width, height, field_config')
    .eq('template_type', tipo)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function gerarCertificadoAtletaPdf(stakeholderId: string): Promise<PdfAtleta | null> {
  const { data: stakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, kyu_dan_id, academia_id')
    .eq('id', stakeholderId)
    .maybeSingle()
  if (!stakeholder) return null

  const { data: filiacao } = await supabaseAdmin
    .from('stakeholder_filiacoes')
    .select('academia_id, validado_em, kyu_dan_id')
    .eq('stakeholder_id', stakeholderId)
    .eq('federacao_id', LRSJ_FED_UUID)
    .maybeSingle()

  const graduacao = (await graduacaoTexto(stakeholder.kyu_dan_id || filiacao?.kyu_dan_id)) || '—'
  const academia = await academiaComLogo(stakeholder.academia_id || filiacao?.academia_id)
  const template = await templateAtivo('certificado')
  const ano = filiacao?.validado_em ? new Date(filiacao.validado_em).getFullYear() : new Date().getFullYear()

  const buffer = await renderToBuffer(
    <CertificadoAtletaDocument
      atleta={{ nome: stakeholder.nome_completo || '—', graduacao, ano: String(ano) }}
      backgroundUrl={resolveAssetUrl(template?.background_url || 'fundos/certificado-fundo.png')}
      academiaLogoUrl={academia.logoUrl}
      templateWidth={template?.width || 1058}
      templateHeight={template?.height || 794}
      fieldConfig={template?.field_config || {}}
    />
  )
  return { buffer, slug: slugDe(stakeholder.nome_completo), academiaNome: academia.nome }
}

export async function gerarIdentidadeAtletaPdf(stakeholderId: string): Promise<PdfAtleta | null> {
  const { data: stakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, kyu_dan_id, academia_id, data_nascimento')
    .eq('id', stakeholderId)
    .maybeSingle()
  if (!stakeholder) return null

  const { data: filiacao } = await supabaseAdmin
    .from('stakeholder_filiacoes')
    .select('academia_id, kyu_dan_id, nivel_arbitragem, data_expiracao')
    .eq('stakeholder_id', stakeholderId)
    .eq('federacao_id', LRSJ_FED_UUID)
    .maybeSingle()

  const graduacao = await graduacaoTexto(stakeholder.kyu_dan_id || filiacao?.kyu_dan_id)
  const academia = await academiaComLogo(stakeholder.academia_id || filiacao?.academia_id)
  const template = await templateAtivo('identidade')
  const fmt = (d: string | null | undefined) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '')

  const buffer = await renderToBuffer(
    <IdentidadeAtletaDocument
      atleta={{
        nome: stakeholder.nome_completo || '—',
        graduacao,
        dataNascimento: fmt(stakeholder.data_nascimento),
        nivelArbitragem: filiacao?.nivel_arbitragem || '',
        validade: fmt(filiacao?.data_expiracao),
      }}
      backgroundUrl={resolveAssetUrl(template?.background_url || 'fundos/identidade-fundo.png')}
      academiaLogoUrl={academia.logoUrl}
      templateWidth={template?.width || 9000}
      templateHeight={template?.height || 14346}
      fieldConfig={template?.field_config || {}}
    />
  )
  return { buffer, slug: slugDe(stakeholder.nome_completo), academiaNome: academia.nome }
}
