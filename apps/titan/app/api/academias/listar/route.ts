import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * Lista academias.
 *
 * Autenticação obrigatória. Campos PII (CPF, RG, CNPJ, IE, IM, e-mails e
 * telefones do responsável/técnico) só aparecem para master_access ou
 * federacao_admin/federacao_staff da mesma federação.
 */

const ADMIN_ROLES = new Set(['master_access', 'admin', 'master'])
const FEDERATION_ROLES = new Set(['federacao_admin', 'federacao_staff'])

const PUBLIC_FIELDS = [
  'id',
  'federacao_id',
  'nome',
  'nome_fantasia',
  'sigla',
  'logo_url',
  'endereco_cidade',
  'endereco_estado',
  'ativo',
  'created_at',
  'updated_at',
] as const

const FULL_FIELDS = [
  ...PUBLIC_FIELDS,
  'cnpj',
  'inscricao_estadual',
  'inscricao_municipal',
  'endereco_rua',
  'endereco_numero',
  'endereco_complemento',
  'endereco_bairro',
  'endereco_cep',
  'responsavel_nome',
  'responsavel_cpf',
  'responsavel_rg',
  'responsavel_telefone',
  'responsavel_email',
  'responsavel_faixa',
  'tecnico_nome',
  'tecnico_cpf',
  'tecnico_registro_profissional',
  'tecnico_telefone',
  'tecnico_email',
  'data_filiacao',
  'horario_funcionamento',
  'quantidade_alunos',
  'anualidade_status',
  'anualidade_vencimento',
  'safe2pay_subscription_id',
] as const

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado', academias: [] },
        { status: 401 }
      )
    }

    const { data: stake } = await supabaseAdmin
      .from('stakeholders')
      .select('role, federacao_id')
      .eq('id', user.id)
      .maybeSingle()

    const role = stake?.role ?? ''
    const isMaster = ADMIN_ROLES.has(role)
    const isFedAdmin = FEDERATION_ROLES.has(role)

    const fields = isMaster || isFedAdmin ? FULL_FIELDS : PUBLIC_FIELDS

    let query = supabaseAdmin
      .from('academias')
      .select(fields.join(','))
      .order('nome', { ascending: true })

    // federacao_admin/staff só vê academias da sua federação
    if (isFedAdmin && stake?.federacao_id) {
      query = query.eq('federacao_id', stake.federacao_id)
    }

    const { data: academias, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message, academias: [] },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { academias: academias || [], error: null },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        academias: [],
      },
      { status: 500 }
    )
  }
}
