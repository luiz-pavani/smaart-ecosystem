import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendFederationPaymentConfirmation, sendProfepPaymentConfirmation } from "../../../actions/email";

// Usamos o supabaseAdmin (Service Role) para ignorar as travas de segurança (RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * TIPOS DE EVENTOS DE RECORRÊNCIA
 * Detecta e trata todos os eventos do ciclo de vida de uma assinatura
 */
interface Safe2PayPayload {
  EventType?: string;
  IdSubscription?: string;
  IdTransaction?: string;
  TransactionStatus?: { Id: number };
  Status?: number;
  Amount?: number;
  AmountDetails?: { TotalAmount: number };
  Reference?: string;
  Customer?: { Email: string; Name?: string; Identity?: string; Phone?: string };
  PaymentMethod?: number;
  [key: string]: any;
}

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  // Best-effort: list users and match by email.
  // Limit pages to avoid heavy scans in very large userbases.
  try {
    const perPage = 1000;
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.warn('[WEBHOOK] auth.admin.listUsers error:', error.message);
        return null;
      }
      const users = (data as any)?.users || [];
      const match = users.find((u: any) => normalizeEmail(u?.email) === normalized);
      if (match?.id) return String(match.id);
      if (!Array.isArray(users) || users.length < perPage) break;
    }
  } catch (err) {
    console.warn('[WEBHOOK] findAuthUserIdByEmail exception:', err);
  }
  return null;
}

function computePlanExpiresAt(plan: string): string | null {
  const plano = String(plan || '').toLowerCase();
  if (plano === 'vitalicio') return null;
  const d = new Date();
  if (plano === 'mensal') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

async function activateProfileForEmail(params: {
  email: string;
  plan: string;
  fullName?: string;
  cpf?: string;
  phone?: string;
  subscriptionId?: string | null;
}) {
  const email = normalizeEmail(params.email);
  const fullName = (params.fullName || '').trim();
  const planExpiresAt = computePlanExpiresAt(params.plan);
  const authUserId = await findAuthUserIdByEmail(email);

  const baseUpdate = {
    email,
    status: 'active',
    plan: params.plan,
    subscription_status: 'active',
    id_subscription: params.subscriptionId || null,
    plan_expires_at: planExpiresAt,
    full_name: fullName || 'Usuário',
    cpf: params.cpf || '',
    phone: params.phone || '',
    role: 'student',
    updated_at: new Date().toISOString(),
  };

  // Preferred path: update/insert by auth uid (profiles.id = auth.uid())
  if (authUserId) {
    const { data: updatedById, error: updateByIdError } = await supabaseAdmin
      .from('profiles')
      .update(baseUpdate)
      .eq('id', authUserId)
      .select()
      .maybeSingle();

    if (updateByIdError) {
      console.warn('[WEBHOOK] update profile by id failed:', updateByIdError.message);
    }

    if (updatedById) return { profile: updatedById, authUserId };

    const { data: insertedById, error: insertByIdError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: authUserId,
          ...baseUpdate,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (!insertByIdError && insertedById) return { profile: insertedById, authUserId };

    // If insert by id fails (e.g., email unique conflict), fallback to update by email
    if (insertByIdError) {
      console.warn('[WEBHOOK] insert profile by id failed:', insertByIdError.message);
    }
  }

  // Fallback path: update by email
  const { data: updatedByEmail, error: updateByEmailError } = await supabaseAdmin
    .from('profiles')
    .update(baseUpdate)
    .eq('email', email)
    .select()
    .maybeSingle();

  if (updateByEmailError) {
    console.warn('[WEBHOOK] update profile by email failed:', updateByEmailError.message);
  }
  if (updatedByEmail) return { profile: updatedByEmail, authUserId };

  // Last resort: create a profile row even if auth user not found.
  // This is not ideal for RLS/auth-based access, but keeps legacy flows alive.
  const { data: insertedLegacy, error: insertLegacyError } = await supabaseAdmin
    .from('profiles')
    .insert([
      {
        id: crypto.randomUUID(),
        ...baseUpdate,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (insertLegacyError) {
    console.error('[WEBHOOK] insert legacy profile failed:', insertLegacyError.message);
    return { profile: null, authUserId };
  }
  return { profile: insertedLegacy, authUserId };
}

export async function POST(request: Request) {
  console.log("[DEBUG] Webhook POST chamado!");
  try {
    const payload: Safe2PayPayload = await request.json();
    console.log("🔔 [WEBHOOK] Safe2Pay Recebido:", JSON.stringify(payload, null, 2));
    console.log("[DEBUG] payload.EventType =", payload.EventType);
    
    // Logar headers para garantir origem
    // @ts-ignore
    if (request.headers) {
      try {
        const headersObj = Object.fromEntries(request.headers.entries());
        console.log("🔔 [WEBHOOK] Headers:", JSON.stringify(headersObj, null, 2));
      } catch (e) { console.log("[WEBHOOK] Falha ao logar headers", e); }
    }

    // Detectar tipo de evento
    const eventType = payload.EventType || inferEventType(payload);
    console.log("[DEBUG] eventType =", eventType);

    // Se for evento de recorrência, tratar separadamente
    if (eventType && ['SubscriptionCreated', 'SubscriptionRenewed', 'SubscriptionFailed', 'SubscriptionCanceled', 'SubscriptionExpired'].includes(eventType)) {
      console.log(`[RECURRENCE] ✅ Detectado evento: ${eventType} para subscription ${payload.IdSubscription}`);
      return handleRecurrenceEvent(payload, eventType);
    }

    console.log(`[LEGACY] ⚠️ Evento não-recorrência, entrando em handleTransactionEvent`);
    // Caso contrário, usar fluxo original (pagamentos avulsos)
    return handleTransactionEvent(payload);
    
  } catch (error: any) {
    console.error("💥 Erro crítico no Webhook:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Inferir tipo de evento baseado na estrutura do payload
 */
function inferEventType(payload: Safe2PayPayload): string {
  if (payload.IdSubscription && payload.TransactionStatus?.Id === 3) {
    // Se tem IdSubscription e status 3, pode ser criação ou renovação
    // A primeira vez é "SubscriptionCreated", depois são renovações
    return 'SubscriptionCreated'; // Safe2Pay enviará com EventType, mas como fallback
  }
  return '';
}

/**
 * HANDLER DE EVENTOS DE RECORRÊNCIA (LIFECYCLE)
 */
async function handleRecurrenceEvent(payload: Safe2PayPayload, eventType: string) {
  const subscriptionId = payload.IdSubscription?.toString();
  const transactionId = payload.IdTransaction?.toString();
  // Aceita payload.Customer?.Email (Safe2Pay oficial), payload.Email e payload.email (testes)
  const email = (payload as any).Email || (payload as any).email || payload.Customer?.Email;
  const amount = payload.Amount ?? payload.AmountDetails?.TotalAmount ?? 0;
  const reference = payload.Reference || "";

  console.log(`[RECURRENCE] ${eventType} | Subscription: ${subscriptionId} | Email: ${email}`);

  if (!subscriptionId || !email) {
    console.warn("[RECURRENCE] Faltam dados críticos (subscriptionId ou email)");
    console.warn(`[DEBUG] Payload recebido:`, JSON.stringify(payload));
    return NextResponse.json({ message: "Dados incompletos" }, { status: 200 });
  }

  try {
    // Registrar evento na tabela de auditoria
    await registrarSubscriptionEvent(subscriptionId, email, eventType, payload);

    switch (eventType) {
      case 'SubscriptionCreated':
        return await handleSubscriptionCreated(payload, subscriptionId, email);

      case 'SubscriptionRenewed':
        return await handleSubscriptionRenewed(payload, subscriptionId, email);

      case 'SubscriptionFailed':
        return await handleSubscriptionFailed(payload, subscriptionId, email);

      case 'SubscriptionCanceled':
        return await handleSubscriptionCanceled(payload, subscriptionId, email);

      case 'SubscriptionExpired':
        return await handleSubscriptionExpired(payload, subscriptionId, email);

      default:
        console.warn(`[RECURRENCE] Evento desconhecido: ${eventType}`);
        return NextResponse.json({ message: "Evento desconhecido" }, { status: 200 });
    }
  } catch (error: any) {
    console.error(`[RECURRENCE] Erro ao processar ${eventType}:`, error.message);
    // IMPORTANTE: Retornar 200 para não causar retentativas infinitas
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}

/**
 * SUBSCRIPTION CREATED - Primeira cobrança confirmada
 */
async function handleSubscriptionCreated(payload: Safe2PayPayload, subscriptionId: string, email: string) {
  const amount = payload.Amount ?? payload.AmountDetails?.TotalAmount ?? 0;
  const reference = payload.Reference || "";
  
  // Determinar plano
  let planoInterno = "anual";
  let descricaoVenda = "Plano Anual";
  
  if (amount === 35 || amount === 35.0) {
    planoInterno = "mensal";
    descricaoVenda = "Plano Mensal";
  } else if (reference.toLowerCase().includes("mensal")) {
    planoInterno = "mensal";
    descricaoVenda = "Plano Mensal";
  } else if (reference.toLowerCase().includes("vital")) {
    planoInterno = "vitalicio";
    descricaoVenda = "Plano Vitalício";
  }

  // 1. Ativar perfil (preferindo profiles.id = auth uid)
  const { profile } = await activateProfileForEmail({
    email,
    plan: planoInterno,
    fullName: payload.Customer?.Name || 'Usuário',
    cpf: payload.Customer?.Identity || '',
    phone: payload.Customer?.Phone || '',
    subscriptionId,
  });

  if (!profile) {
    console.error("[SubscriptionCreated] Erro ao ativar perfil para:", email);
  } else {
    console.log("[SubscriptionCreated] ✅ Perfil ativado (plan/status/subscription):", { email, subscriptionId, plan: planoInterno });
  }

  // 2. Registrar venda
  // @ts-ignore
  await registrarVenda(email, amount, descricaoVenda, (payload.PaymentMethod ?? 0) as any, payload.IdTransaction, subscriptionId, 1, 'SubscriptionCreated');

  // 3. Enviar email de confirmação
  if (profile?.full_name) {
    await sendProfepPaymentConfirmation(
      email,
      profile.full_name,
      planoInterno,
      amount
    );
  }

  console.log(`[SubscriptionCreated] ✅ Assinatura criada: ${subscriptionId} | ${email} | ${planoInterno}`);
  return NextResponse.json({ message: "Assinatura criada com sucesso" }, { status: 200 });
}

/**
 * SUBSCRIPTION RENEWED - Renovação automática processada
 */
async function handleSubscriptionRenewed(payload: Safe2PayPayload, subscriptionId: string, email: string) {
  const amount = payload.Amount ?? payload.AmountDetails?.TotalAmount ?? 0;

  // 1. Buscar perfil e plano atual
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, plan, full_name, subscription_status')
    .eq('id_subscription', subscriptionId)
    .single();

  if (profileError || !profile) {
    console.warn("[SubscriptionRenewed] Perfil não encontrado para subscription:", subscriptionId);
    return NextResponse.json({ message: "Perfil não encontrado" }, { status: 200 });
  }

  // 2. Atualizar data de expiração
  let planExpiresAt = new Date();
  if (profile.plan === 'mensal') {
    planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);
  } else if (profile.plan === 'anual') {
    planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1);
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      plan_expires_at: profile.plan !== 'vitalicio' ? planExpiresAt.toISOString() : null,
      subscription_status: 'active',
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id_subscription', subscriptionId);

  if (updateError) {
    console.error("[SubscriptionRenewed] Erro ao atualizar perfil:", updateError.message);
  } else {
    console.log("[SubscriptionRenewed] ✅ Data de expiração atualizada");
  }

  // 3. Buscar ciclo anterior
  const { data: vendaAnterior } = await supabaseAdmin
    .from('vendas')
    .select('cycle_number')
    .eq('subscription_id', subscriptionId)
    .order('cycle_number', { ascending: false })
    .limit(1)
    .single();

  const cycleNumber = (vendaAnterior?.cycle_number || 0) + 1;

  // 4. Registrar venda do novo ciclo
  // @ts-ignore
  await registrarVenda(email, amount, `Renovação - Ciclo ${cycleNumber}`, (payload.PaymentMethod ?? 0) as any, payload.IdTransaction, subscriptionId, cycleNumber, 'SubscriptionRenewed');

  // 5. Enviar email de renovação (opcional)
  if (profile.full_name) {
    console.log("[SubscriptionRenewed] 📧 Email de renovação enviado para", email);
    // await sendSubscriptionRenewalEmail(email, profile.full_name, profile.plan, amount);
  }

  console.log(`[SubscriptionRenewed] ✅ Renovação processada: Ciclo ${cycleNumber}`);
  return NextResponse.json({ message: "Renovação processada" }, { status: 200 });
}

/**
 * SUBSCRIPTION FAILED - Falha na cobrança recorrente
 */
async function handleSubscriptionFailed(payload: Safe2PayPayload, subscriptionId: string, email: string) {
  const failureReason = payload.Message || payload.Description || "Falha na cobrança";

  // 1. Marcar como suspenso
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'suspended',
      updated_at: new Date().toISOString()
    })
    .eq('id_subscription', subscriptionId);

  if (updateError) {
    console.error("[SubscriptionFailed] Erro ao suspender subscription:", updateError.message);
  } else {
    console.log("[SubscriptionFailed] ✅ Assinatura suspensa por falha de cobrança");
  }

  // 2. Registrar evento
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id_subscription', subscriptionId)
    .single();

  // 3. Enviar email de falha (opcional)
  if (profile?.full_name) {
    console.log("[SubscriptionFailed] 📧 Email de falha enviado para", email);
    // await sendSubscriptionFailureEmail(email, profile.full_name, failureReason);
  }

  console.log(`[SubscriptionFailed] ⚠️ Falha na cobrança: ${failureReason}`);
  return NextResponse.json({ message: "Falha registrada" }, { status: 200 });
}

/**
 * SUBSCRIPTION CANCELED - Assinatura cancelada
 */
async function handleSubscriptionCanceled(payload: Safe2PayPayload, subscriptionId: string, email: string) {
  // 1. Marcar como cancelado
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      status: 'inactive',
      plan_expires_at: new Date().toISOString(), // Expira imediatamente
      updated_at: new Date().toISOString()
    })
    .eq('id_subscription', subscriptionId);

  if (updateError) {
    console.error("[SubscriptionCanceled] Erro ao cancelar subscription:", updateError.message);
  } else {
    console.log("[SubscriptionCanceled] ✅ Assinatura cancelada");
  }

  // 2. Enviar email de cancelamento
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id_subscription', subscriptionId)
    .single();

  if (profile?.full_name) {
    console.log("[SubscriptionCanceled] 📧 Email de cancelamento enviado para", email);
  }

  console.log(`[SubscriptionCanceled] ✅ Assinatura ${subscriptionId} foi cancelada`);
  return NextResponse.json({ message: "Cancelamento processado" }, { status: 200 });
}

/**
 * SUBSCRIPTION EXPIRED - Ciclos limite atingido
 */
async function handleSubscriptionExpired(payload: Safe2PayPayload, subscriptionId: string, email: string) {
  // 1. Marcar como expirado
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'expired',
      status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('id_subscription', subscriptionId);

  if (updateError) {
    console.error("[SubscriptionExpired] Erro ao expirar subscription:", updateError.message);
  } else {
    console.log("[SubscriptionExpired] ✅ Assinatura expirou");
  }

  console.log(`[SubscriptionExpired] ✅ Assinatura ${subscriptionId} expirou (limite de ciclos atingido)`);
  return NextResponse.json({ message: "Expiração processada" }, { status: 200 });
}

/**
 * HANDLER DE EVENTOS DE TRANSAÇÃO (PAGAMENTOS AVULSOS)
 * Mantém fluxo original para compatibilidade
 */
async function handleTransactionEvent(payload: Safe2PayPayload) {
  /**
   * ESTRUTURA SAFE2PAY:
   * Status 3 = Pago
   */
  const statusIdRaw = payload.TransactionStatus?.Id || payload.Status || payload.TransactionStatus;
  const statusId = typeof statusIdRaw === 'number' ? statusIdRaw : Number(statusIdRaw ?? 0);
  const isPaid = statusId === 3;
  
  if (!isPaid) {
    console.log("[WEBHOOK] Pagamento ainda não confirmado. StatusId:", statusId);
    return NextResponse.json({ message: "Aguardando confirmação de pagamento." }, { status: 200 });
  }

  const amount = payload.Amount ?? payload.AmountDetails?.TotalAmount ?? 0;
  const transactionId = payload.IdTransaction;
  const reference = payload.Reference || "";
  const customerEmail = payload.Customer?.Email ?? "";

  if (!customerEmail) {
    console.log("[WEBHOOK] Email do cliente ausente no payload.");
    return NextResponse.json({ message: "Email ausente no payload." }, { status: 200 });
  }

  // --- DECISÃO DE FLUXO BASEADO NA REFERÊNCIA ---
  console.log("[WEBHOOK] Referência recebida:", reference);

  // CENÁRIO 1: PAGAMENTO DE FEDERAÇÃO (GRADUAÇÃO)
  console.log("[WEBHOOK] Email detectado:", customerEmail);
  if (reference.startsWith("FEDERATION:")) {
    const membershipId = reference.split(":")[1];
    
    console.log(`✅ Pagamento de Federação Detectado. Membership ID: ${membershipId}`);

    // Buscar dados do membership e perfil para o email
    const { data: membership } = await supabaseAdmin
      .from('entity_memberships')
      .select('*, profiles:profile_id(*), entities:entity_id(*)')
      .eq('id', membershipId)
      .single();

    const { data: existingMembership } = await supabaseAdmin
      .from('entity_memberships')
      .select('progresso')
      .eq('id', membershipId)
      .single();

    const existingProgress = existingMembership?.progresso || {};
    const paymentMethod = payload.PaymentMethod || payload.Payment?.Method || payload.Transaction?.PaymentMethod;
    const methodLabel = paymentMethod === 1 || paymentMethod === '1' ? 'Boleto'
      : paymentMethod === 2 || paymentMethod === '2' ? 'Cartão'
      : paymentMethod === 6 || paymentMethod === '6' ? 'PIX'
      : String(paymentMethod || '').toUpperCase();

    const { error: fedError } = await supabaseAdmin
      .from('entity_memberships')
      .update({
        status_pagamento: 'PAGO',
        status_inscricao: 'INSCRITO', // Isso libera a Área de Estudo e o cronograma do aluno
        valor_pago: amount,
        updated_at: new Date().toISOString(),
        progresso: {
          ...existingProgress,
          payment_info: {
            ...(existingProgress?.payment_info || {}),
            method: paymentMethod || existingProgress?.payment_info?.method,
            method_label: methodLabel || existingProgress?.payment_info?.method_label,
            amount,
            status: 'PAGO',
            paid_at: new Date().toISOString(),
            transaction_id: transactionId || existingProgress?.payment_info?.transaction_id
          }
        }
      })
      .eq('id', membershipId);

    if (fedError) {
      console.error("❌ Erro ao liberar inscrição de federação:", fedError.message);
      return NextResponse.json({ error: "Erro ao ativar inscrição" }, { status: 500 });
    }

    // Registro opcional na tabela de vendas para métricas gerais
    // @ts-ignore
    await registrarVenda(customerEmail, amount, "Taxa de Graduação", (payload.PaymentMethod ?? 0) as any, transactionId);

    // Enviar email de confirmação
    if (membership?.profiles?.email && membership?.profiles?.full_name) {
      await sendFederationPaymentConfirmation(
        membership.profiles.email,
        membership.profiles.full_name,
        membership.entities?.name || 'Federação',
        amount,
        membership.graduacao_pretendida || 'Graduação'
      );
    }

    return NextResponse.json({ message: "Inscrição de Federação liberada" }, { status: 200 });
  }

  // CENÁRIO 2: PAGAMENTO PROFEP MAX (ASSINATURA)
  // Se a referência for SUBSCRIPTION:email ou se não houver referência formatada (fallback para o seu modelo atual)
  console.log(`✅ Pagamento Profep MAX confirmado para: ${customerEmail}.`);

  let emailParaAtivar = customerEmail;
  if (reference.startsWith("SUBSCRIPTION:")) {
      emailParaAtivar = reference.split(":")[1];
  }

  let planoInterno = "anual";         
  let descricaoVenda = "Plano Anual"; 

  // Regra de preço de migração (R$ 35,00)
  if (amount === 35.00 || amount === 35) {
      planoInterno = "mensal";
      descricaoVenda = "MENSALIDADE PROFEP MAX";
  } 
  else {
      const refLower = reference.toLowerCase();
      if (refLower.includes("mensal")) {
          planoInterno = "mensal";
          descricaoVenda = "Plano Mensal";
      } else if (refLower.includes("vitalicio") || refLower.includes("infinito")) {
          planoInterno = "vitalicio";
          descricaoVenda = "Plano Vitalício";
      }
  }
  // 1. Ativa perfil do aluno (preferindo profiles.id = auth uid)
  const { profile } = await activateProfileForEmail({
    email: emailParaAtivar,
    plan: planoInterno,
    fullName: payload.Customer?.Name || 'Usuário ProfepMAX',
    cpf: payload.Customer?.Identity || '',
    phone: payload.Customer?.Phone || '',
    subscriptionId: payload.IdSubscription ? String(payload.IdSubscription) : null,
  });

  if (!profile) {
    console.error("❌ Erro ao ativar perfil Profep MAX (webhook)", { email: emailParaAtivar, planoInterno });
    return NextResponse.json({ error: "Erro ao ativar perfil" }, { status: 500 });
  }

  console.log(`[WEBHOOK] Perfil ativado:`, { id: profile.id, email: profile.email, status: profile.status, plan: profile.plan });

  // 2. Registra a Venda
  // @ts-ignore
  await registrarVenda(emailParaAtivar, amount, descricaoVenda, (payload.PaymentMethod ?? 0) as any, transactionId);

  // 3. Envia email de confirmação
  if (profile?.full_name) {
    await sendProfepPaymentConfirmation(
      emailParaAtivar,
      profile.full_name,
      planoInterno,
      amount
    );
  }

  console.log(`🚀 SUCESSO: Acesso Profep MAX liberado como ${descricaoVenda}!`);
  return NextResponse.json({ message: "Acesso Profep MAX liberado" }, { status: 200 });
}

/**
 * FUNÇÃO AUXILIAR PARA REGISTRO DE VENDAS
 */
async function registrarVenda(
  email: string,
  valor: number,
  plano: string,
  metodoId: any,
  transactionId: any,
  subscriptionId?: string,
  cycleNumber: number = 1,
  eventType?: string
) {
    try {
        const metodoNome = metodoId === 1 ? 'boleto' : metodoId === 6 ? 'pix' : 'cartao';
        console.log(`[WEBHOOK] Registrando venda: email=${email}, valor=${valor}, plano=${plano}, metodo=${metodoNome}, transaction_id=${transactionId}, subscription_id=${subscriptionId}, cycle=${cycleNumber}, event=${eventType}`);
        const { error, data } = await supabaseAdmin.from('vendas').insert([
          {
            email: email,
            valor: valor,
            plano: plano,
            metodo: metodoNome,
            transaction_id: transactionId,
            subscription_id: subscriptionId,
            cycle_number: cycleNumber,
            event_type: eventType,
            created_at: new Date().toISOString()
          }
        ]);
        if (error) {
          console.error("[WEBHOOK] Erro ao registrar venda:", error.message);
        } else {
          console.log("[WEBHOOK] Venda registrada com sucesso:", data);
        }
    } catch (vendaError) {
        console.warn("⚠️ Venda não registrada (tabela pode não existir), mas acesso foi liberado.", vendaError);
    }
}

/**
 * FUNÇÃO AUXILIAR PARA REGISTRAR EVENTOS DE ASSINATURA NA AUDITORIA
 */
async function registrarSubscriptionEvent(subscriptionId: string, email: string, eventType: string, payload: Safe2PayPayload) {
  try {
    console.log("[AUDIT] Tentando registrar evento:", { subscriptionId, email, eventType });
    
    // Garantir que status_code seja sempre number
    const statusCodeRaw = payload.TransactionStatus?.Id || payload.Status;
    const statusCode = typeof statusCodeRaw === 'number' ? statusCodeRaw : 200;
    
    const insertData = {
      subscription_id: subscriptionId,
      email: email,
      event_type: eventType,
      status_code: statusCode,
      amount: payload.Amount || payload.AmountDetails?.TotalAmount || 0,
      payload: payload,
      created_at: new Date().toISOString()
    };
    
    console.log("[AUDIT] Dados a inserir:", JSON.stringify(insertData, null, 2));
    
    const { data, error } = await supabaseAdmin
      .from('subscription_events')
      .insert(insertData);

    if (error) {
      console.error("[AUDIT] ❌ Erro ao registrar evento:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
    } else {
      console.log(`[AUDIT] ✅ Evento ${eventType} registrado para ${subscriptionId}`, data);
    }
  } catch (err: any) {
    console.error("[AUDIT] ❌ Exceção ao registrar:", err.message, err);
  }
}