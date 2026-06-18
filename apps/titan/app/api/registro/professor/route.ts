import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const LRSJ_FED_UUID = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'
const SENTINEL_CPF = '00000000000'

interface BasePayload {
  nome: string
  email: string
  telefone: string
  cpf: string
  senha: string
}

interface EscolherPayload extends BasePayload {
  modo: 'escolher_academia'
  academia_id: string
}

interface CriarPayload extends BasePayload {
  modo: 'criar_academia'
  academia: {
    nome: string
    cidade: string
    estado: string
    federacao_id: string | null
  }
}

function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '')
  if (cpf.length !== 11) return false
  if (cpf === SENTINEL_CPF) return true
  if (/^(\d)\1{10}$/.test(cpf)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i)
  let d1 = 11 - (sum % 11); if (d1 >= 10) d1 = 0
  if (d1 !== parseInt(cpf[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i)
  let d2 = 11 - (sum % 11); if (d2 >= 10) d2 = 0
  return d2 === parseInt(cpf[10])
}

function genUserName(nome: string, suffix: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('.')
  return `${base}.${suffix}`
}

export async function POST(req: NextRequest) {
  const body = await req.json() as EscolherPayload | CriarPayload

  const nome = String(body.nome || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const telefone = String(body.telefone || '').replace(/\D/g, '')
  const cpf = String(body.cpf || '').replace(/\D/g, '')
  const senha = String(body.senha || '')

  if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (!email.includes('@')) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  if (telefone.length < 10) return NextResponse.json({ error: 'Telefone inválido (mín. 10 dígitos)' }, { status: 400 })
  if (!isValidCPF(cpf)) return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  if (senha.length < 6) return NextResponse.json({ error: 'Senha mínima 6 caracteres' }, { status: 400 })

  // Dedup (exceto CPF sentinel)
  if (cpf !== SENTINEL_CPF) {
    const { data: dupCpf } = await supabaseAdmin.from('stakeholders').select('id').eq('cpf', cpf).maybeSingle()
    if (dupCpf) return NextResponse.json({ error: 'CPF já cadastrado' }, { status: 409 })
  }
  const { data: dupEmail } = await supabaseAdmin.from('stakeholders').select('id').eq('email', email).maybeSingle()
  if (dupEmail) return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })

  // 1) Auth user — role final só é conhecido após decidir Fluxo A vs B.
  // No Fluxo A: professor.  Fluxo B: academia_admin.  Setamos depois via updateUserById.
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { full_name: nome, nome_completo: nome },
  })
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: `Falha ao criar usuário: ${authErr?.message || 'desconhecido'}` }, { status: 500 })
  }
  const userId = authData.user.id

  // 2) Resolve academia_id + approval_status
  let academiaId: string
  let approvalStatus: 'aprovado' | 'pendente_academia' | 'pendente_federacao'
  let academiaApprovalStatus: 'aprovado' | 'pendente_federacao' = 'aprovado'
  let academiaCriada = false

  if (body.modo === 'escolher_academia') {
    const { data: acad } = await supabaseAdmin
      .from('academias')
      .select('id, federacao_id')
      .eq('id', body.academia_id)
      .maybeSingle()
    if (!acad) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })
    }
    academiaId = acad.id
    approvalStatus = 'pendente_academia'
  } else {
    // Cria nova academia (vai ficar pendente_federacao)
    const fedId = body.academia.federacao_id || LRSJ_FED_UUID
    const { data: newAcad, error: acadErr } = await supabaseAdmin
      .from('academias')
      .insert({
        nome: body.academia.nome.trim(),
        endereco_cidade: body.academia.cidade.trim(),
        endereco_estado: body.academia.estado,
        federacao_id: fedId,
        responsavel_nome: nome,
        responsavel_cpf: cpf,
        responsavel_email: email,
        stakeholder_id: userId,
        approval_status: 'pendente_federacao',
        approval_requested_at: new Date().toISOString(),
        created_by_stakeholder: userId,
      })
      .select('id')
      .single()
    if (acadErr || !newAcad) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: `Falha ao criar academia: ${acadErr?.message || 'desconhecido'}` }, { status: 500 })
    }
    academiaId = newAcad.id
    academiaApprovalStatus = 'pendente_federacao'
    approvalStatus = 'aprovado'  // professor já pode operar; academia em validação
    academiaCriada = true
  }

  // 3) Stakeholder — criador no Fluxo B vira academia_admin (responsável técnico)
  const finalRole = academiaCriada ? 'academia_admin' : 'professor'
  const username = genUserName(nome, String(Date.now()).slice(-4))
  const { error: stakeErr } = await supabaseAdmin
    .from('stakeholders')
    .insert({
      id: userId,
      nome_completo: nome,
      nome_usuario: username,
      funcao: 'professor',
      role: finalRole,
      email,
      telefone,
      cpf,
      academia_id: academiaId,
      federacao_id: LRSJ_FED_UUID,
      approval_status: approvalStatus,
      approval_requested_at: approvalStatus !== 'aprovado' ? new Date().toISOString() : null,
    })

  if (stakeErr) {
    if (academiaCriada) {
      await supabaseAdmin.from('academias').delete().eq('id', academiaId)
    }
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: `Falha ao criar stakeholder: ${stakeErr.message}` }, { status: 500 })
  }

  // 4) Sincroniza profiles.role com a role real
  await supabaseAdmin
    .from('profiles')
    .update({ role: finalRole, full_name: nome })
    .eq('id', userId)

  return NextResponse.json({
    ok: true,
    user_id: userId,
    academia_id: academiaId,
    approval_status: approvalStatus,
    academia_approval_status: academiaApprovalStatus,
    academia_criada: academiaCriada,
  })
}
