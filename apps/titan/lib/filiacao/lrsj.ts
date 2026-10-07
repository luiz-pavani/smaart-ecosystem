import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Escrita de filiações LRSJ.
 *
 * user_fed_lrsj é uma VIEW (stakeholder_filiacoes JOIN stakeholders) só com trigger INSTEAD OF UPDATE —
 * INSERT/UPSERT nela falham ("cannot insert into view"). Criações de filiação gravam direto nas tabelas:
 * filiação em stakeholder_filiacoes (unique stakeholder_id+federacao_id) e dados pessoais em stakeholders.
 * Referência: app/api/federacao/import-lrsj/route.ts.
 */

export const LRSJ_FED_UUID = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'

/** Colunas de stakeholder_filiacoes (exceto id/created_at/updated_at). */
export interface FiliacaoLrsj {
  stakeholder_id: string
  academia_id?: string | null
  plano_tipo?: string | null
  status_membro?: string | null
  status_plano?: string | null
  data_adesao?: string | null
  data_expiracao?: string | null
  lote_id?: string | null
  dados_validados?: boolean
  validado_em?: string | null
  validado_por?: string | null
  observacoes?: string | null
  url_foto?: string | null
  url_documento_id?: string | null
  url_certificado_dan?: string | null
  nome_patch?: string | null
  tamanho_patch?: string | null
  cor_patch?: string | null
  siglas?: string | null
  kyu_dan_id?: number | null
  data_ultima_graduacao?: string | null
  nivel_arbitragem?: string | null
}

// chk_status_membro aceita: ativo, pendente, suspenso, inativo, expirado, rejeitado, aprovado.
// Mesmo mapeamento do trigger user_fed_lrsj_update_redirect.
// 'Em análise' não é mapeado pelo trigger: gravado como 'em análise' violaria o check — normalize antes de gravar.
const STATUS_MEMBRO: Record<string, string> = {
  aceito: 'ativo', approved: 'aprovado', rejected: 'rejeitado', 'em análise': 'pendente', 'em analise': 'pendente',
}

export function normalizarStatusMembro(s: string | null | undefined): string | null {
  if (!s) return null
  const k = s.trim().toLowerCase()
  return STATUS_MEMBRO[k] ?? k
}

/**
 * Rótulos da UI (legado) ↔ valores de status_membro.
 * "Aceito" = ativo|aprovado; "Em análise" = pendente ou NULL (filiações antigas sem status).
 */
export type RotuloStatusMembro = 'Aceito' | 'Em análise' | 'Rejeitado' | 'Suspenso' | 'Inativo' | 'Expirado'
const ROTULO_STATUS_MEMBRO: Record<string, RotuloStatusMembro> = {
  ativo: 'Aceito', aprovado: 'Aceito', pendente: 'Em análise',
  rejeitado: 'Rejeitado', suspenso: 'Suspenso', inativo: 'Inativo', expirado: 'Expirado',
}

export function rotuloStatusMembro(s: string | null | undefined): RotuloStatusMembro {
  const n = normalizarStatusMembro(s)
  return (n && ROTULO_STATUS_MEMBRO[n]) || 'Em análise'
}

export function isMembroAceito(s: string | null | undefined): boolean {
  return rotuloStatusMembro(s) === 'Aceito'
}

/** Filtro PostgREST (para `.or()`) que equivale ao rótulo/valor recebido da UI. */
export function filtroStatusMembro(rotuloOuValor: string): string {
  const n = normalizarStatusMembro(rotuloOuValor)
  if (n === 'pendente') return 'status_membro.eq.pendente,status_membro.is.null'
  if (n === 'ativo' || n === 'aprovado') return 'status_membro.in.(ativo,aprovado)'
  return `status_membro.eq.${n}`
}

export interface KyuDan { id: number; cor_faixa: string | null; kyu_dan: string | null; icones: string | null; ordem: number | null }

/**
 * user_fed_lrsj.kyu_dan_id é `s.kyu_dan_id::bigint` na view — o cast esconde a FK do PostgREST,
 * então `kyu_dan:kyu_dan_id(...)` falha (PGRST200). Busca kyu_dan à parte e anexa em `kyu_dan`.
 */
export async function anexarKyuDan<T extends { kyu_dan_id?: number | null }>(
  client: SupabaseClient,
  rows: T[]
): Promise<(T & { kyu_dan: KyuDan | null })[]> {
  const ids = Array.from(new Set(rows.map((r) => r.kyu_dan_id).filter((id): id is number => id != null)))
  const byId = new Map<number, KyuDan>()
  if (ids.length) {
    const { data } = await client.from('kyu_dan').select('id, cor_faixa, kyu_dan, icones, ordem').in('id', ids)
    for (const k of (data ?? []) as KyuDan[]) byId.set(Number(k.id), k)
  }
  return rows.map((r) => ({ ...r, kyu_dan: r.kyu_dan_id != null ? byId.get(Number(r.kyu_dan_id)) ?? null : null }))
}

/**
 * Upsert em stakeholder_filiacoes por (stakeholder_id, federacao_id=LRSJ).
 * Campos null/undefined não são enviados, então não apagam o valor existente.
 * Linhas com conjuntos de campos diferentes são agrupadas (o upsert em lote usa as colunas da 1ª linha).
 */
export async function upsertFiliacoesLrsj(
  client: SupabaseClient,
  filiacoes: FiliacaoLrsj[]
): Promise<{ error: string | null }> {
  const porStakeholder = new Map<string, Record<string, unknown>>()
  for (const f of filiacoes) {
    const row: Record<string, unknown> = {
      ...f,
      federacao_id: LRSJ_FED_UUID,
      status_membro: normalizarStatusMembro(f.status_membro),
      data_adesao: f.data_adesao?.slice(0, 10) || null,
      data_expiracao: f.data_expiracao?.slice(0, 10) || null,
    }
    for (const k of Object.keys(row)) if (row[k] === null || row[k] === undefined) delete row[k]
    porStakeholder.set(f.stakeholder_id, row)
  }
  const grupos = new Map<string, Record<string, unknown>[]>()
  for (const row of porStakeholder.values()) {
    const chave = Object.keys(row).sort().join(',')
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave)!.push(row)
  }
  for (const batch of grupos.values()) {
    const { error } = await client
      .from('stakeholder_filiacoes')
      .upsert(batch, { onConflict: 'stakeholder_id,federacao_id', ignoreDuplicates: false })
    if (error) return { error: error.message }
  }
  return { error: null }
}

/** Dados pessoais/vínculos em stakeholders que a filiação pode preencher. */
export interface DadosStakeholder {
  telefone?: string | null
  genero?: string | null
  data_nascimento?: string | null
  kyu_dan_id?: number | null
  cpf?: string | null
  academia_id?: string | null
  federacao_id?: string | null
}

/** Preenche só os campos vazios do stakeholder (não sobrescreve edições feitas no Titan). */
export async function preencherStakeholderVazio(
  client: SupabaseClient,
  stakeholderId: string,
  dados: DadosStakeholder
): Promise<{ error: string | null }> {
  const novo: Record<string, unknown> = { ...dados, data_nascimento: dados.data_nascimento?.slice(0, 10) || null }
  const campos = Object.keys(novo).filter((k) => novo[k] != null && novo[k] !== '')
  if (!campos.length) return { error: null }
  const { data: atual, error: selErr } = await client
    .from('stakeholders')
    .select(campos.join(', '))
    .eq('id', stakeholderId)
    .maybeSingle()
  if (selErr) return { error: selErr.message }
  if (!atual) return { error: `Stakeholder ${stakeholderId} não encontrado` }
  const patch: Record<string, unknown> = {}
  for (const k of campos) if ((atual as unknown as Record<string, unknown>)[k] == null) patch[k] = novo[k]
  if (!Object.keys(patch).length) return { error: null }
  const { error } = await client.from('stakeholders').update(patch).eq('id', stakeholderId)
  return { error: error?.message ?? null }
}

/**
 * Cria o atleta via Supabase Auth (o trigger upsert_stakeholder_from_auth_user cria a linha em stakeholders,
 * cuja PK é FK para auth.users). Sem email, usa um email sintético como o import do Smoothcomp.
 * Exige client com service role.
 */
export async function criarStakeholderAtleta(
  admin: SupabaseClient,
  params: { nome_completo: string; email?: string | null; origem: string }
): Promise<{ id: string | null; error: string | null }> {
  const id = crypto.randomUUID()
  const email = params.email?.trim().toLowerCase() || `${params.origem}-${id.slice(0, 8)}@import.lrsj.local`
  const localPart = email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '_').slice(0, 40)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: {
      full_name: params.nome_completo,
      username: `${localPart}_${id.replace(/-/g, '').slice(0, 6)}`,
      stakeholder_role: 'atleta',
      registro_via: params.origem,
    },
  })
  if (error || !data.user) return { id: null, error: error?.message ?? 'Falha ao criar usuário' }
  return { id: data.user.id, error: null }
}
