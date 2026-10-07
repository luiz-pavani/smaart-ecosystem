import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { isAcademyStaff, isFederationManager } from '@/lib/auth/roles'
import {
  LRSJ_FED_UUID,
  criarStakeholderAtleta,
  preencherStakeholderVazio,
  upsertFiliacoesLrsj,
  type FiliacaoLrsj,
} from '@/lib/filiacao/lrsj'

interface AtletaInput {
  nome_completo?: string | null
  email?: string | null
  cpf?: string | null
  data_nascimento?: string | null
  genero?: string | null
  celular?: string | null
  telefone?: string | null
  academia_id?: string | null
  kyu_dan_id?: number | string | null
  graduacao?: string | null
  dan_nivel?: string | null
  status?: string | null
  url_foto?: string | null
  url_documento_id?: string | null
  url_certificado_dan?: string | null
  nivel_arbitragem?: string | null
  observacoes?: string | null
  lote_id?: string | null
}

/**
 * POST /api/atletas — cadastra atleta(s) e a filiação LRSJ.
 * JSON: um atleta, ou { atletas: [...] } (import CSV). multipart: um atleta com arquivos.
 *
 * user_fed_lrsj é VIEW sem INSERT — grava em stakeholders (dados pessoais, só campos vazios) e
 * stakeholder_filiacoes (filiação). Staff de academia/federação cadastra terceiros (cria a conta se o
 * email não existir; staff de academia só na própria academia). Demais usuários só cadastram a si mesmos.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: me } = await supabaseAdmin
      .from('stakeholders')
      .select('role, academia_id')
      .eq('id', user.id)
      .maybeSingle()
    const isStaff = isAcademyStaff(me?.role)
    const isFedStaff = isFederationManager(me?.role)

    const resolveKyuDanId = async (params: {
      kyuDanIdRaw: unknown
      graduacaoRaw: unknown
      danNivelRaw: unknown
    }) => {
      const kyuDanIdCandidate = Number(params.kyuDanIdRaw)
      if (Number.isInteger(kyuDanIdCandidate) && kyuDanIdCandidate > 0) {
        return kyuDanIdCandidate
      }

      const graduacao = String(params.graduacaoRaw || '').trim()
      const danNivel = String(params.danNivelRaw || '').trim()
      if (!graduacao && !danNivel) return null

      const { data, error } = await supabase.rpc('resolve_kyu_dan_id', {
        graduacao_text: graduacao || null,
        dan_numeric: null,
        dan_nivel_text: danNivel || null,
      })

      if (error || !data) return null
      return Number(data)
    }

    // Stakeholder do atleta: o próprio usuário (auto-cadastro) ou, para staff, o dono do email —
    // criado se não existir. Nunca cai no id de quem está cadastrando.
    const resolveStakeholderId = async (a: AtletaInput): Promise<{ id: string | null; error?: string }> => {
      if (!isStaff) return { id: user.id }
      const email = String(a.email || '').trim().toLowerCase()
      if (email) {
        const { data } = await supabaseAdmin.from('stakeholders').select('id').eq('email', email).limit(1)
        if (data && data.length > 0) return { id: data[0].id as string }
      }
      const nome = String(a.nome_completo || '').trim()
      if (!nome) return { id: null, error: 'Nome é obrigatório' }
      const created = await criarStakeholderAtleta(supabaseAdmin, { nome_completo: nome, email, origem: 'cadastro' })
      return created.id ? { id: created.id } : { id: null, error: created.error ?? 'Falha ao criar atleta' }
    }

    const cadastrar = async (lista: AtletaInput[]) => {
      const errors: string[] = []
      const filiacoes: FiliacaoLrsj[] = []
      for (const a of lista) {
        const label = a.nome_completo || a.email || 'atleta'
        const academiaId = isStaff && !isFedStaff ? me?.academia_id ?? null : a.academia_id || null
        if (isStaff && !isFedStaff && !academiaId) {
          errors.push(`${label}: usuário sem academia vinculada`)
          continue
        }
        const { id: stakeholderId, error: idError } = await resolveStakeholderId(a)
        if (!stakeholderId) {
          errors.push(`${label}: ${idError}`)
          continue
        }
        const kyuDanId = await resolveKyuDanId({
          kyuDanIdRaw: a.kyu_dan_id,
          graduacaoRaw: a.graduacao,
          danNivelRaw: a.dan_nivel,
        })
        const { error: stError } = await preencherStakeholderVazio(supabaseAdmin, stakeholderId, {
          cpf: a.cpf ? String(a.cpf).replace(/\D/g, '') : null,
          data_nascimento: a.data_nascimento || null,
          genero: a.genero || null,
          telefone: a.celular || a.telefone || null,
          kyu_dan_id: kyuDanId,
          academia_id: academiaId,
          federacao_id: LRSJ_FED_UUID,
        })
        if (stError) errors.push(`${label}: ${stError}`)
        filiacoes.push({
          stakeholder_id: stakeholderId,
          academia_id: academiaId,
          kyu_dan_id: kyuDanId,
          status_membro: isStaff ? a.status || 'ativo' : 'pendente',
          url_foto: a.url_foto || null,
          url_documento_id: a.url_documento_id || null,
          url_certificado_dan: a.url_certificado_dan || null,
          nivel_arbitragem: a.nivel_arbitragem || null,
          observacoes: a.observacoes || null,
          lote_id: a.lote_id || null,
        })
      }

      // Filiação já existente: não mexe no status (não reativa suspenso nem rebaixa aprovado).
      const ids = filiacoes.map((f) => f.stakeholder_id)
      if (ids.length > 0) {
        const { data: existentes } = await supabaseAdmin
          .from('stakeholder_filiacoes')
          .select('stakeholder_id')
          .eq('federacao_id', LRSJ_FED_UUID)
          .in('stakeholder_id', ids)
        const jaFiliados = new Set((existentes ?? []).map((e) => e.stakeholder_id as string))
        for (const f of filiacoes) if (jaFiliados.has(f.stakeholder_id)) delete f.status_membro
        const { error } = await upsertFiliacoesLrsj(supabaseAdmin, filiacoes)
        if (error) errors.push(`Filiações: ${error}`)
      }
      return { ids, errors }
    }

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      const lista: AtletaInput[] = Array.isArray(body.atletas) ? body.atletas : [body]
      if (lista.length > 1 && !isStaff) {
        return NextResponse.json({ error: 'Sem permissão para importar atletas' }, { status: 403 })
      }
      const { ids, errors } = await cadastrar(lista)
      if (ids.length === 0) {
        return NextResponse.json({ error: errors.join('; ') || 'Nenhum atleta cadastrado' }, { status: 400 })
      }
      return NextResponse.json({
        success: errors.length === 0,
        atleta: { stakeholder_id: ids[0], federacao_id: LRSJ_FED_UUID },
        cadastrados: ids.length,
        errors,
      }, { status: errors.length ? 207 : 201 })
    }

    // Get form data
    const formData = await request.formData()
    const field = (k: string) => (formData.get(k) as string | null) || null

    // Extract file uploads
    const fotoPerfil = formData.get('foto_perfil') as File | null
    const fotoDocumento = formData.get('foto_documento') as File | null
    const certificadoArbitragem = formData.get('certificado_arbitragem') as File | null
    const certificadoDan = formData.get('certificado_dan') as File | null

    const uploadFile = async (file: File, bucket: string, path: string) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        throw new Error(`Erro ao fazer upload: ${error.message}`)
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      return urlData.publicUrl
    }

    const timestamp = Date.now()
    const pasta = `${field('federacao_id') ?? LRSJ_FED_UUID}/${(field('cpf') ?? '').replace(/\D/g, '') || user.id}`
    const upload = async (file: File | null, prefixo: string) => {
      if (!file || file.size === 0) return null
      const extension = file.name.split('.').pop()
      return uploadFile(file, 'atletas', `${pasta}/${prefixo}_${timestamp}.${extension}`)
    }

    const fotoPerfilUrl = await upload(fotoPerfil, 'perfil')
    const fotoDocumentoUrl = await upload(fotoDocumento, 'documento')
    const certificadoArbitragemUrl = await upload(certificadoArbitragem, 'cert_arbitragem')
    const certificadoDanUrl = await upload(certificadoDan, 'cert_dan')

    // stakeholder_filiacoes não tem coluna para o certificado de arbitragem — fica nas observações.
    const observacoes = [
      field('observacoes'),
      certificadoArbitragemUrl ? `Certificado de arbitragem: ${certificadoArbitragemUrl}` : null,
    ].filter(Boolean).join('\n') || null

    const { ids, errors } = await cadastrar([{
      nome_completo: field('nome_completo'),
      email: field('email'),
      cpf: field('cpf'),
      data_nascimento: field('data_nascimento'),
      genero: field('genero'),
      celular: field('celular') ?? field('telefone'),
      academia_id: field('academia_id'),
      kyu_dan_id: field('kyu_dan_id'),
      graduacao: field('graduacao'),
      dan_nivel: field('dan_nivel'),
      url_foto: fotoPerfilUrl,
      url_documento_id: fotoDocumentoUrl,
      url_certificado_dan: certificadoDanUrl,
      nivel_arbitragem: field('nivel_arbitragem'),
      observacoes,
      lote_id: field('lote'),
    }])

    if (ids.length === 0) {
      console.error('Insert error:', errors)
      return NextResponse.json({ error: errors.join('; ') || 'Erro ao cadastrar atleta' }, { status: 400 })
    }

    return NextResponse.json({
      success: errors.length === 0,
      atleta: { stakeholder_id: ids[0], federacao_id: LRSJ_FED_UUID },
      errors,
    }, { status: errors.length ? 207 : 201 })
  } catch (error) {
    console.error('Error creating atleta:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10))
    const perPage = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('per_page') || '50', 10)))
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data: atletas, error, count } = await supabase
      .from('user_fed_lrsj')
      .select(`
        *,
        academia:academia_id (
          id,
          nome
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ atletas, total: count ?? 0, page, per_page: perPage })
  } catch (error) {
    console.error('Error fetching atletas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
