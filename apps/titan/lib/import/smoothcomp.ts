/**
 * IMPORT LRSJ — Módulo de transformação Smoothcomp → user_fed_lrsj
 *
 * Define regras de equivalência entre o CSV exportado do Smoothcomp
 * e a estrutura da tabela user_fed_lrsj do sistema SMAART.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SmooothcompRow {
  'Member No': string
  Name: string
  Email: string
  Phone: string
  Address: string
  Zip: string
  City: string
  Province: string
  Birthdate: string
  Age: string
  Gender: string
  'Member since': string
  Nationality: string
  Residence: string
  Plan: string
  'Plan status': string
  'Expire date': string
  'Member status': string
  'Order date': string
  'Payment method': string
  'Payment reference': string
  Notes: string
  'Jiu-Jitsu rank': string
  Academies: string
  // Campos de entidade (descartados)
  'NOME DA ENTIDADE': string
  CNPJ: string
  'DATA DE FUNDAÇÃO': string
  'TELEFONE / WHATSAPP': string
  'Imagem da Carteira de Identidade ou Certidão de Nascimento ': string
  EMAIL: string
  WEBSITE: string
  'PÁGINA DO INSTAGRAM': string
  'ENDEREÇO PARA CORRESPONDÊNCIA': string
  'ENDEREÇO(S) DE ATUAÇÃO': string
  'RESPONSÁVEL PELA ENTIDADE': string
  CARGO: string
  LOGO: string
  DECLARAÇÃO: string
  // Campos de atleta
  'TAMANHO DO PATCH (BACKNUMBER)': string
  'NOME NO PATCH': string
  GRADUAÇÃO: string
  'QUAL SEU DAN?': string
  Foto: string
  'Nível de Arbitragem': string
  'Certificado de dan': string
  OBSERVAÇÕES: string
  LOTE: string
}

export interface KyuDanRow {
  id: number
  cor_faixa: string
  kyu_dan: string
  ordem: number
  [key: string]: unknown
}

export interface AcademiaRow {
  id: string
  nome: string
  sigla?: string
  federacao_id?: string
}

export interface UserFedLrsjImportRow {
  nome_completo: string
  nome_patch: string | null
  genero: string | null
  data_nascimento: string | null
  idade: number | null
  nacionalidade: string | null
  email: string | null
  telefone: string | null
  cidade: string | null
  estado: string | null
  pais: string | null
  nivel_arbitragem: string | null
  status_membro: string | null
  data_adesao: string | null
  plano_tipo: string | null
  status_plano: string | null
  data_expiracao: string | null
  url_foto: string | null
  url_documento_id: string | null
  url_certificado_dan: string | null
  tamanho_patch: string | null
  lote_id: string | null
  observacoes: string | null
  federacao_id: number
  academias: string | null
  dados_validados: boolean
  kyu_dan_id: number | null
  academia_id: string | null
  stakeholder_id: string | null
}

export interface TransformResult {
  row: UserFedLrsjImportRow
  academia_nome: string | null
  warnings: string[]
}

// ---------------------------------------------------------------------------
// Lookup tables (kyu_dan)
// ---------------------------------------------------------------------------

/** Mapeamento de GRADUAÇÃO (não-faixa preta) → kyu_dan.id */
const GRADUACAO_MAP: Record<string, number> = {
  'BRANCA | MU-KYU': 1,
  'BRANCA/CINZA | MU-KYU': 2,
  'CINZA | NANA-KYU': 3,
  'CINZA/AZUL | NANA-KYU': 4,
  'AZUL | ROKU-KYU': 5,
  'AZUL/AMARELA | ROKU-KYU': 6,
  'AMARELA | GO-KYU': 7,
  'AMARELA/LARANJA | GO-KYU': 8,
  'LARANJA | YON-KYU': 9,
  'VERDE | SAN-KYU': 10,
  'ROXA | NI-KYU': 11,
  'MARROM | IK-KYU': 12,
}

/** Mapeamento de QUAL SEU DAN? (faixa preta) → kyu_dan.id */
const DAN_MAP: Record<string, number> = {
  'SHO-DAN': 13, 'SHODAN': 13, '1º DAN': 13, '1° DAN': 13, '1 DAN': 13,
  'NI-DAN': 14, 'NIDAN': 14, '2º DAN': 14, '2° DAN': 14, '2 DAN': 14,
  'SAN-DAN': 15, 'SANDAN': 15, '3º DAN': 15, '3° DAN': 15, '3 DAN': 15,
  'YON-DAN': 16, 'YONDAN': 16, '4º DAN': 16, '4° DAN': 16, '4 DAN': 16,
  'GO-DAN': 17, 'GODAN': 17, '5º DAN': 17, '5° DAN': 17, '5 DAN': 17,
  'ROKUDAN': 18, 'ROKU-DAN': 18, '6º DAN': 18, '6° DAN': 18, '6 DAN': 18,
  'NANADAN': 19, 'NANA-DAN': 19, '7º DAN': 19, '7° DAN': 19, '7 DAN': 19,
  'HACHI-DAN': 20, 'HACHIDAN': 20, '8º DAN': 20, '8° DAN': 20, '8 DAN': 20,
  'KU-DAN': 21, 'KUDAN': 21, '9º DAN': 21, '9° DAN': 21, '9 DAN': 21,
  'JU-DAN': 22, 'JUDAN': 22, '10º DAN': 22, '10° DAN': 22, '10 DAN': 22,
}

// ---------------------------------------------------------------------------
// Funções de normalização
// ---------------------------------------------------------------------------

export function normalizeGender(gender: string): 'Masculino' | 'Feminino' | null {
  const g = gender.trim().toLowerCase()
  if (g === 'male' || g === 'masculino') return 'Masculino'
  if (g === 'female' || g === 'feminino') return 'Feminino'
  return null
}

export function normalizeStatus(
  memberStatus: string,
  planStatus: string
): { status_membro: string | null; status_plano: string | null } {
  const msMap: Record<string, string> = {
    approved: 'Aceito',
    aceito: 'Aceito',
    active: 'Aceito',
  }
  const psMap: Record<string, string> = {
    active: 'Válido',
    válido: 'Válido',
    expired: 'Vencido',
    vencido: 'Vencido',
  }

  return {
    status_membro: msMap[memberStatus.trim().toLowerCase()] ?? null,
    status_plano: psMap[planStatus.trim().toLowerCase()] ?? null,
  }
}

export function normalizeLote(lote: string): string | null {
  const v = lote.trim()
  if (!v) return null
  if (v.startsWith('2026') || v.match(/^2026\s+\d+$/)) return v
  if (v.startsWith('2026')) return v
  return null
}

export function resolveKyuDanId(
  graduacao: string,
  qualSeuDan: string
): number | null {
  const g = graduacao.trim().toUpperCase()
  const d = qualSeuDan.trim().toUpperCase()

  if (!g) return null

  // Faixa preta: usar QUAL SEU DAN?
  if (g.includes('FAIXA PRETA')) {
    if (!d) return null
    // Tentativa de match direto
    if (DAN_MAP[d] !== undefined) return DAN_MAP[d]
    // Tentativa de match parcial
    for (const [key, id] of Object.entries(DAN_MAP)) {
      if (d.includes(key) || key.includes(d)) return id
    }
    return null
  }

  // Não é faixa preta: match direto em GRADUAÇÃO
  if (GRADUACAO_MAP[g] !== undefined) return GRADUACAO_MAP[g]

  // Match parcial (tolerante a variações de espaço/pontuação)
  for (const [key, id] of Object.entries(GRADUACAO_MAP)) {
    if (g.includes(key) || key.includes(g)) return id
  }

  return null
}

/**
 * Retorna o nome da primeira academia a partir do campo Academies do Smoothcomp
 * (separador: "|")
 */
export function extractFirstAcademia(academiesField: string): string | null {
  if (!academiesField.trim()) return null
  return academiesField.split('|')[0].trim() || null
}

/**
 * Resolve academia_id por nome (case-insensitive) a partir do cache local.
 */
export function resolveAcademiaId(
  academiesField: string,
  academia_map: Map<string, AcademiaRow>
): { academia_id: string | null; academia_nome: string | null } {
  const nome = extractFirstAcademia(academiesField)
  if (!nome) return { academia_id: null, academia_nome: null }

  const found = academia_map.get(nome.toLowerCase())
  return {
    academia_id: found?.id ?? null,
    academia_nome: nome,
  }
}

// ---------------------------------------------------------------------------
// Transformação principal
// ---------------------------------------------------------------------------

/**
 * Transforma uma linha do CSV do Smoothcomp em um registro user_fed_lrsj.
 *
 * @param row       - Linha do CSV parseada
 * @param academia_map - Map<nome_lower, AcademiaRow> pré-carregado
 * @param federacao_id - ID numérico da federação (LRSJ = 1)
 * @param stakeholder_id - UUID do stakeholder (resolvido externamente por email, pode ser null)
 */
export function transformSmooothcompRow(
  row: SmooothcompRow,
  academia_map: Map<string, AcademiaRow>,
  federacao_id: number = 1,
  stakeholder_id: string | null = null
): TransformResult {
  const warnings: string[] = []

  // Graduação
  const graduacao = (row['GRADUAÇÃO'] || '').trim()
  const qualSeuDan = (row['QUAL SEU DAN?'] || '').trim()
  const kyu_dan_id = resolveKyuDanId(graduacao, qualSeuDan)
  if (graduacao && kyu_dan_id === null) {
    warnings.push(`kyu_dan não identificado: GRADUAÇÃO="${graduacao}" / DAN="${qualSeuDan}"`)
  }

  // Academia
  const { academia_id, academia_nome } = resolveAcademiaId(row.Academies || '', academia_map)
  if (row.Academies && !academia_id) {
    warnings.push(`Academia não encontrada: "${extractFirstAcademia(row.Academies)}"`)
  }

  // Status
  const { status_membro, status_plano } = normalizeStatus(
    row['Member status'] || '',
    row['Plan status'] || ''
  )

  // Lote
  const lote_id = normalizeLote(row.LOTE || '')

  // Idade
  const idade = row.Age ? parseInt(row.Age, 10) : null

  return {
    row: {
      nome_completo: (row.Name || '').trim(),
      nome_patch: (row['NOME NO PATCH'] || '').trim() || null,
      genero: normalizeGender(row.Gender || ''),
      data_nascimento: (row.Birthdate || '').trim() || null,
      idade: Number.isNaN(idade) ? null : idade,
      nacionalidade: (row.Nationality || '').trim() || null,
      email: (row.Email || '').trim().toLowerCase() || null,
      telefone: (row.Phone || '').trim() || null,
      cidade: (row.City || '').trim() || null,
      estado: (row.Province || '').trim() || null,
      pais: (row.Residence || '').trim() || null,
      nivel_arbitragem: (row['Nível de Arbitragem'] || '').trim() || null,
      status_membro,
      data_adesao: (row['Member since'] || '').trim() || null,
      plano_tipo: (row.Plan || '').trim() || null,
      status_plano,
      data_expiracao: (row['Expire date'] || '').trim() || null,
      url_foto: (row.Foto || '').trim() || null,
      url_documento_id:
        (row['Imagem da Carteira de Identidade ou Certidão de Nascimento '] || '').trim() || null,
      url_certificado_dan: (row['Certificado de dan'] || '').trim() || null,
      tamanho_patch: (row['TAMANHO DO PATCH (BACKNUMBER)'] || '').trim() || null,
      lote_id,
      observacoes: (row.OBSERVAÇÕES || '').trim() || null,
      federacao_id,
      academias: extractFirstAcademia(row.Academies || ''),
      dados_validados: false,
      kyu_dan_id,
      academia_id,
      stakeholder_id,
    },
    academia_nome,
    warnings,
  }
}
