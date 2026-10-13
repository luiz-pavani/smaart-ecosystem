import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { emailAtivacaoConta } from '@/lib/email'
import { notifyAtletaBoasVindas } from '@/lib/whatsapp/notifications'
import { academiaDoRegistro, resolverStaffRegistro } from '@/lib/registro/server'
import { emailValido, idadeEm, normalizarTelefone, type CanalAcesso } from '@/lib/registro/atleta'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://titan.smaartpro.com'

/**
 * GET /api/academia/registro-atleta?academia_id= — opções do wizard: academia, planos ativos e graduações.
 */
export async function GET(req: NextRequest) {
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })

  const academiaId = academiaDoRegistro(staff, req.nextUrl.searchParams.get('academia_id'))
  if (!academiaId) return NextResponse.json({ error: 'Informe a academia' }, { status: 400 })

  const [{ data: academia }, { data: planos }, { data: graduacoes }] = await Promise.all([
    supabaseAdmin.from('academias').select('id, nome, sigla').eq('id', academiaId).maybeSingle(),
    supabaseAdmin
      .from('academia_planos')
      .select('id, nome, valor, periodicidade, duracao_meses')
      .eq('academia_id', academiaId)
      .eq('ativo', true)
      .order('ordem'),
    supabaseAdmin.from('kyu_dan').select('id, cor_faixa, kyu_dan, ordem').eq('ativo', true).order('ordem'),
  ])
  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  return NextResponse.json({ academia, planos: planos ?? [], graduacoes: graduacoes ?? [] })
}

/**
 * POST /api/academia/registro-atleta — passo 1 do registro individual.
 * Body: { nome_completo, data_nascimento, canal: 'email'|'whatsapp', contato, academia_id? }
 *
 * O contato é o login do atleta. Cria a conta (Auth + stakeholder), a ficha na academia e envia a ativação:
 * email → link para criar a senha; WhatsApp → boas-vindas (o login é por código OTP em /acesso).
 */
export async function POST(req: NextRequest) {
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })

  const body = await req.json().catch(() => ({}))
  const nome = String(body.nome_completo ?? '').trim().replace(/\s+/g, ' ')
  const dataNascimento = String(body.data_nascimento ?? '').slice(0, 10)
  const canal = body.canal as CanalAcesso
  const academiaId = academiaDoRegistro(staff, body.academia_id)

  if (!academiaId) return NextResponse.json({ error: 'Usuário sem academia vinculada' }, { status: 400 })
  if (nome.split(' ').length < 2) return NextResponse.json({ error: 'Informe nome e sobrenome' }, { status: 400 })
  const idade = idadeEm(dataNascimento)
  if (idade == null || idade < 0 || idade > 110) {
    return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 })
  }
  if (canal !== 'email' && canal !== 'whatsapp') {
    return NextResponse.json({ error: 'Escolha email ou WhatsApp como forma de acesso' }, { status: 400 })
  }

  let email: string | null = null
  let telefone: string | null = null
  if (canal === 'email') {
    email = String(body.contato ?? '').trim().toLowerCase()
    if (!emailValido(email)) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  } else {
    telefone = normalizarTelefone(body.contato)
    if (!telefone) return NextResponse.json({ error: 'WhatsApp inválido (inclua o DDD)' }, { status: 400 })
  }

  // O contato é o login: não pode pertencer a outra conta.
  const { data: existente } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo')
    .eq(canal === 'email' ? 'email' : 'telefone', canal === 'email' ? email : telefone)
    .limit(1)
    .maybeSingle()
  if (existente) {
    return NextResponse.json({
      error: `Este ${canal === 'email' ? 'email' : 'WhatsApp'} já é o acesso de ${existente.nome_completo ?? 'outra conta'}.`,
      existente,
    }, { status: 409 })
  }

  const { data: academia } = await supabaseAdmin.from('academias').select('nome, federacao_id').eq('id', academiaId).maybeSingle()
  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  // Conta Auth. WhatsApp usa o email sintético do login por OTP (verify-otp procura pelo telefone).
  const authEmail = email ?? `${telefone}@whatsapp.titan.app`
  const base = (email ? email.split('@')[0] : `w${telefone}`).replace(/[^a-zA-Z0-9_.]/g, '_').slice(0, 30)
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: authEmail,
    email_confirm: true,
    password: crypto.randomBytes(32).toString('hex'),
    user_metadata: {
      full_name: nome,
      username: `${base}_${crypto.randomBytes(3).toString('hex')}`,
      stakeholder_role: 'atleta',
      registro_via: 'academia',
      ...(telefone ? { phone: telefone } : {}),
    },
  })
  if (createError || !created.user) {
    const msg = createError?.message ?? 'Falha ao criar a conta'
    const status = /already|registered|exists/i.test(msg) ? 409 : 500
    return NextResponse.json({ error: status === 409 ? 'Já existe uma conta com este acesso.' : msg }, { status })
  }
  const stakeholderId = created.user.id

  const { error: stError } = await supabaseAdmin
    .from('stakeholders')
    .update({
      nome_completo: nome,
      data_nascimento: dataNascimento,
      email,
      telefone,
      academia_id: academiaId,
      federacao_id: academia.federacao_id ?? null,
      role: 'atleta',
    })
    .eq('id', stakeholderId)
  if (stError) {
    await supabaseAdmin.auth.admin.deleteUser(stakeholderId)
    return NextResponse.json({ error: `Erro ao gravar o atleta: ${stError.message}` }, { status: 500 })
  }

  const { data: ficha, error: fichaError } = await supabaseAdmin
    .from('academia_atleta_fichas')
    .insert({ stakeholder_id: stakeholderId, academia_id: academiaId, canal_acesso: canal, criado_por: staff.userId })
    .select('id')
    .single()
  if (fichaError) {
    await supabaseAdmin.auth.admin.deleteUser(stakeholderId)
    return NextResponse.json({ error: `Erro ao criar a ficha: ${fichaError.message}` }, { status: 500 })
  }

  // Ativação — falha de envio não desfaz o registro; o professor vê o aviso e pode reenviar depois.
  let enviado = false
  try {
    if (email) {
      const { data: link } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${BASE_URL}/redefinir-senha` },
      })
      if (link?.properties?.action_link) {
        enviado = await emailAtivacaoConta({ email, nome, academia: academia.nome, linkAtivacao: link.properties.action_link })
      }
    } else {
      // sendTemplate devolve o JSON da Meta mesmo em erro.
      const res = await notifyAtletaBoasVindas({ nome_completo: nome, telefone })
      enviado = !!res && !res.error
    }
  } catch (err) {
    console.error('[registro-atleta] envio da ativação falhou:', err)
  }
  if (enviado) {
    await supabaseAdmin.from('academia_atleta_fichas').update({ ativacao_enviada_em: new Date().toISOString() }).eq('id', ficha.id)
  }

  return NextResponse.json({
    ficha_id: ficha.id,
    stakeholder_id: stakeholderId,
    menor: idade < 18,
    ativacao: { canal, enviado },
  }, { status: 201 })
}
