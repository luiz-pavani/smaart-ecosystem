import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import JSZip from 'jszip'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import CertificadoAtletaDocument from '@/lib/pdf/CertificadoAtletaDocument'
import IdentidadeAtletaDocument from '@/lib/pdf/IdentidadeAtletaDocument'
import { isFederationManager, isMaster } from '@/lib/auth/roles'

/**
 * Baixa uma imagem via HTTPS e retorna um data URI base64, opcionalmente redimensionada.
 * @react-pdf aceita src=data URI e usa direto sem baixar de novo — economia enorme
 * em batch (baixa 1x, reusa 133x).
 */
async function fetchAndOptimize(url: string, maxWidth = 1600): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    // Downscale + recompressão só se for muito grande
    if (buf.length > 200 * 1024) {
      try {
        const optimized = await sharp(buf)
          .resize({ width: maxWidth, withoutEnlargement: true })
          .png({ quality: 85, compressionLevel: 9 })
          .toBuffer()
        return `data:image/png;base64,${optimized.toString('base64')}`
      } catch { /* fallback pro original */ }
    }
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch { return null }
}

export const runtime = 'nodejs'
export const maxDuration = 300  // 5min

const LRSJ_FED = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

function resolveAssetUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('http')) return pathOrUrl
  const clean = pathOrUrl.replace(/^\/+/, '')
  return `${SUPABASE_URL}/storage/v1/object/public/${clean}`
}

function slugify(s: string): string {
  return (s || 'sem-nome')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/**
 * GET /api/federacao/filiacoes/batch-pdf?ano=2026&only=certificado|identidade|all
 *
 * Gera zip com CERTIFICADO + IDENTIDADE em PDF de cada filiado LRSJ do ano.
 * Estrutura:
 *   {academia-slug}/certificado-{nome-slug}.pdf
 *   {academia-slug}/identidade-{nome-slug}.pdf
 *   _manifest.json
 *
 * Autorizado apenas federação/master.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!me || !(isMaster(me.role) || isFederationManager(me.role))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const ano = Number(req.nextUrl.searchParams.get('ano')) || new Date().getFullYear()
  const only = req.nextUrl.searchParams.get('only') || 'all'  // certificado | identidade | all
  const academiaFilter = req.nextUrl.searchParams.get('academia_id')  // opcional: só 1 academia
  const semAcademia = req.nextUrl.searchParams.get('sem_academia') === '1'  // só filiados sem academia
  const geraCertificado = only === 'all' || only === 'certificado'
  const geraIdentidade = only === 'all' || only === 'identidade'

  const dataInicio = `${ano}-01-01`
  const dataFimVal = `${ano}-12-01`

  // Filiações do ano
  let q = supabaseAdmin
    .from('stakeholder_filiacoes')
    .select(`
      stakeholder_id, academia_id, validado_em, kyu_dan_id,
      data_adesao, data_expiracao, nivel_arbitragem
    `)
    .eq('federacao_id', LRSJ_FED)
    .or(`data_adesao.gte.${dataInicio},data_expiracao.gte.${dataFimVal}`)

  if (academiaFilter) q = q.eq('academia_id', academiaFilter)
  else if (semAcademia) q = q.is('academia_id', null)

  const { data: filiacoes, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const filList = filiacoes || []
  if (filList.length === 0) {
    return NextResponse.json({ error: `Nenhuma filiação encontrada para ${ano}` }, { status: 404 })
  }

  const stakeIds = filList.map(f => f.stakeholder_id)
  const acadIds = Array.from(new Set(filList.map(f => f.academia_id).filter(Boolean))) as string[]

  // Pre-carrega em batch
  const { data: stakeholders } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, kyu_dan_id, data_nascimento')
    .in('id', stakeIds)
  const stakeMap = new Map((stakeholders || []).map(s => [s.id, s]))

  const { data: academias } = acadIds.length > 0 ? await supabaseAdmin
    .from('academias')
    .select('id, nome, sigla')
    .in('id', acadIds) : { data: [] }
  const acadMap = new Map((academias || []).map(a => [a.id, a]))

  const nomesAcad = (academias || []).flatMap(a => [a.nome, a.sigla]).filter(Boolean) as string[]
  const { data: logos } = nomesAcad.length > 0 ? await supabaseAdmin
    .from('academy_logos')
    .select('academia_nome, logo_url')
    .in('academia_nome', nomesAcad) : { data: [] }
  const logoMap = new Map((logos || []).map(l => [l.academia_nome, l.logo_url]))

  const kyuIds = Array.from(new Set([
    ...(stakeholders || []).map(s => s.kyu_dan_id).filter(Boolean),
    ...filList.map(f => f.kyu_dan_id).filter(Boolean),
  ])) as number[]
  const { data: kyus } = kyuIds.length > 0 ? await supabaseAdmin
    .from('kyu_dan')
    .select('id, kyu_dan, cor_faixa')
    .in('id', kyuIds) : { data: [] }
  const kyuMap = new Map((kyus || []).map(k => [k.id, k]))

  // Templates
  const { data: tplCert } = await supabaseAdmin
    .from('document_templates')
    .select('background_url, width, height, field_config')
    .eq('template_type', 'certificado')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: tplId } = await supabaseAdmin
    .from('document_templates')
    .select('background_url, width, height, field_config')
    .eq('template_type', 'identidade')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const bgCertUrl = resolveAssetUrl(tplCert?.background_url || 'fundos/certificado-fundo.png')
  const bgIdUrl = resolveAssetUrl(tplId?.background_url || 'fundos/identidade-fundo.png')

  // Baixa BGs UMA vez, otimizados. Reusa para os 133 atletas.
  const [bgCert, bgId] = await Promise.all([
    fetchAndOptimize(bgCertUrl, 1200),   // certificado A4 landscape → 1200px é suficiente
    fetchAndOptimize(bgIdUrl, 1000),      // identidade A4 portrait → 1000px é suficiente
  ])
  if (!bgCert) return NextResponse.json({ error: 'Falha ao baixar bg certificado' }, { status: 500 })
  if (!bgId) return NextResponse.json({ error: 'Falha ao baixar bg identidade' }, { status: 500 })

  // Cache de logos por academia (também baixa 1x)
  const logoCache = new Map<string, string>()
  async function getLogoDataUri(url: string): Promise<string | null> {
    if (logoCache.has(url)) return logoCache.get(url)!
    const uri = await fetchAndOptimize(url, 400)
    if (uri) logoCache.set(url, uri)
    return uri
  }

  const zip = new JSZip()
  const stats = { total: 0, ok_cert: 0, ok_id: 0, error: 0, sem_academia: 0, sem_graduacao: 0 }
  const errors: string[] = []
  const incompletos: { nome: string; academia: string; falta: string[] }[] = []

  // Batch pequenos (renderToBuffer pesa em memória)
  const BATCH = 8
  for (let i = 0; i < filList.length; i += BATCH) {
    const chunk = filList.slice(i, i + BATCH)
    await Promise.all(chunk.map(async (fil) => {
      stats.total++
      const s = stakeMap.get(fil.stakeholder_id)
      if (!s) { stats.error++; errors.push(`stakeholder ${fil.stakeholder_id} não encontrado`); return }

      const acad = fil.academia_id ? acadMap.get(fil.academia_id) : null
      const acadNome = acad?.nome || 'sem_academia'
      const acadSlug = slugify(acadNome)

      const logoUrlRaw = acad ? (logoMap.get(acad.nome) || (acad.sigla ? logoMap.get(acad.sigla) : null)) : null
      const academiaLogoUrl = logoUrlRaw ? await getLogoDataUri(resolveAssetUrl(logoUrlRaw)) : null

      const kyuId = s.kyu_dan_id || fil.kyu_dan_id
      const kd = kyuId ? kyuMap.get(kyuId) : null
      const graduacao = kd ? `${kd.kyu_dan} | ${kd.cor_faixa}` : 'Graduação não informada'

      const faltas: string[] = []
      if (!kd) { faltas.push('graduação'); stats.sem_graduacao++ }
      if (!s.data_nascimento) faltas.push('data_nascimento')
      if (faltas.length > 0) {
        incompletos.push({ nome: s.nome_completo || '', academia: acadNome, falta: faltas })
      }

      const anoValidacao = fil.validado_em
        ? new Date(fil.validado_em).getFullYear()
        : ano

      const dnFmt = s.data_nascimento
        ? new Date(s.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
        : ''
      const valFmt = fil.data_expiracao
        ? new Date(fil.data_expiracao + 'T00:00:00').toLocaleDateString('pt-BR')
        : ''

      const nomeSlug = slugify(s.nome_completo || '')
      const folder = zip.folder(acadSlug)
      if (!acad) stats.sem_academia++

      // Certificado
      if (geraCertificado) {
        try {
          const buf = await renderToBuffer(
            <CertificadoAtletaDocument
              atleta={{
                nome: s.nome_completo || '—',
                graduacao,
                ano: String(anoValidacao),
              }}
              backgroundUrl={bgCert}
              academiaLogoUrl={academiaLogoUrl}
              templateWidth={tplCert?.width || 1058}
              templateHeight={tplCert?.height || 794}
              fieldConfig={tplCert?.field_config || {}}
            />
          )
          folder?.file(`certificado-${nomeSlug}.pdf`, buf)
          stats.ok_cert++
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'render error'
          errors.push(`certificado ${s.nome_completo}: ${msg}`)
        }
      }

      // Identidade
      if (geraIdentidade) {
        try {
          const buf = await renderToBuffer(
            <IdentidadeAtletaDocument
              atleta={{
                nome: s.nome_completo || '—',
                graduacao,
                dataNascimento: dnFmt,
                nivelArbitragem: fil.nivel_arbitragem || '',
                validade: valFmt,
              }}
              backgroundUrl={bgId}
              academiaLogoUrl={academiaLogoUrl}
              templateWidth={tplId?.width || 9000}
              templateHeight={tplId?.height || 14346}
              fieldConfig={tplId?.field_config || {}}
            />
          )
          folder?.file(`identidade-${nomeSlug}.pdf`, buf)
          stats.ok_id++
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'render error'
          errors.push(`identidade ${s.nome_completo}: ${msg}`)
        }
      }
    }))
  }

  const manifest = {
    ano,
    stats,
    errors,
    incompletos,  // atletas sem graduação ou outros campos — pra você completar
    generated_at: new Date().toISOString(),
  }
  zip.file('_manifest.json', JSON.stringify(manifest, null, 2))

  const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  return new NextResponse(new Uint8Array(zipBuf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="lrsj-filiacoes-${ano}.zip"`,
      'X-Total': String(stats.total),
      'X-Ok-Cert': String(stats.ok_cert),
      'X-Ok-Id': String(stats.ok_id),
      'X-Errors': String(errors.length),
    },
  })
}
