import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { emailAtivacaoConta } from '@/lib/email'
import { notifyAtletaBoasVindas } from '@/lib/whatsapp/notifications'
import { emailValido, idadeEm, normalizarTelefone, type CanalAcesso } from '@/lib/registro/atleta'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://titan.smaartpro.com'

export interface NovoAtleta {
  nome_completo: unknown
  data_nascimento: unknown
  canal: unknown
  contato: unknown
  lote_id?: string | null
}

export type ResultadoCriacao =
  | { ok: true; ficha_id: string; stakeholder_id: string; menor: boolean; ativacao: { canal: CanalAcesso; enviado: boolean } }
  | { ok: false; status: number; error: string; existente?: { id: string; nome_completo: string | null } }

/**
 * Passo 1 do registro (individual e em bloco). O contato é o login do atleta: cria a conta
 * (Auth + stakeholder), a ficha na academia e envia a ativação — email → link para criar a senha;
 * WhatsApp → boas-vindas (o login é por código OTP em /acesso).
 */
export async function criarAtletaRegistro(academiaId: string, criadoPor: string, dados: NovoAtleta): Promise<ResultadoCriacao> {
  const nome = String(dados.nome_completo ?? '').trim().replace(/\s+/g, ' ')
  const dataNascimento = String(dados.data_nascimento ?? '').slice(0, 10)
  const canal = dados.canal as CanalAcesso

  if (nome.split(' ').length < 2) return { ok: false, status: 400, error: 'Informe nome e sobrenome' }
  const idade = idadeEm(dataNascimento)
  if (idade == null || idade < 0 || idade > 110) {
    return { ok: false, status: 400, error: 'Data de nascimento inválida' }
  }
  if (canal !== 'email' && canal !== 'whatsapp') {
    return { ok: false, status: 400, error: 'Escolha email ou WhatsApp como forma de acesso' }
  }

  let email: string | null = null
  let telefone: string | null = null
  if (canal === 'email') {
    email = String(dados.contato ?? '').trim().toLowerCase()
    if (!emailValido(email)) return { ok: false, status: 400, error: 'Email inválido' }
  } else {
    telefone = normalizarTelefone(String(dados.contato ?? ''))
    if (!telefone) return { ok: false, status: 400, error: 'WhatsApp inválido (inclua o DDD)' }
  }

  // O contato é o login: não pode pertencer a outra conta.
  const { data: existente } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo')
    .eq(canal === 'email' ? 'email' : 'telefone', canal === 'email' ? email : telefone)
    .limit(1)
    .maybeSingle()
  if (existente) {
    return {
      ok: false,
      status: 409,
      error: `Este ${canal === 'email' ? 'email' : 'WhatsApp'} já é o acesso de ${existente.nome_completo ?? 'outra conta'}.`,
      existente,
    }
  }

  const { data: academia } = await supabaseAdmin.from('academias').select('nome, federacao_id').eq('id', academiaId).maybeSingle()
  if (!academia) return { ok: false, status: 404, error: 'Academia não encontrada' }

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
    return { ok: false, status, error: status === 409 ? 'Já existe uma conta com este acesso.' : msg }
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
    return { ok: false, status: 500, error: `Erro ao gravar o atleta: ${stError.message}` }
  }

  const { data: ficha, error: fichaError } = await supabaseAdmin
    .from('academia_atleta_fichas')
    .insert({ stakeholder_id: stakeholderId, academia_id: academiaId, canal_acesso: canal, criado_por: criadoPor, lote_id: dados.lote_id ?? null })
    .select('id')
    .single()
  if (fichaError) {
    await supabaseAdmin.auth.admin.deleteUser(stakeholderId)
    return { ok: false, status: 500, error: `Erro ao criar a ficha: ${fichaError.message}` }
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

  return { ok: true, ficha_id: ficha.id, stakeholder_id: stakeholderId, menor: idade < 18, ativacao: { canal, enviado } }
}
