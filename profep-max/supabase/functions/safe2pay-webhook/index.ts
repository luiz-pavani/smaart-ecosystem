import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4?dts";

type Safe2PayPayload = {
  EventType?: string;
  IdSubscription?: string | number;
  IdTransaction?: string | number;
  Tid?: string | number;
  TransactionStatus?: { Id?: number } | number;
  Status?: number;
  ResponseDetail?: { Status?: number; TransactionStatus?: { Id?: number } };
  Amount?: number;
  AmountDetails?: { TotalAmount?: number };
  Reference?: string;
  Customer?: { Email?: string; Name?: string; Identity?: string; Phone?: string };
  Email?: string;
  PaymentMethod?: number | string;
  [key: string]: unknown;
};

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function getStatusId(payload: Safe2PayPayload): number {
  const raw =
    (payload.TransactionStatus as any)?.Id ??
    payload.Status ??
    payload.TransactionStatus ??
    (payload as any)?.ResponseDetail?.TransactionStatus?.Id ??
    (payload as any)?.ResponseDetail?.Status;
  return typeof raw === "number" ? raw : Number(raw ?? 0);
}

function getTransactionId(payload: Safe2PayPayload): string | null {
  const id = payload.IdTransaction ?? payload.Tid;
  return id ? String(id) : null;
}

async function fetchTransactionDetails(transactionId: string) {
  const apiKey = Deno.env.get('SAFE2PAY_API_KEY') || Deno.env.get('SAFE2PAY_TOKEN') || '';
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://payment.safe2pay.com.br/v2/Transaction/${transactionId}`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey }
    });
    if (!res.ok) {
      console.warn('[Safe2Pay Webhook] fetchTransactionDetails status:', res.status);
      return null;
    }
    const data = await res.json();
    return data as Safe2PayPayload;
  } catch (err) {
    console.warn('[Safe2Pay Webhook] fetchTransactionDetails error:', err);
    return null;
  }
}

async function logWebhookPayload(supabase: any, params: {
  email: string;
  transactionId?: string | number | null;
  subscriptionId?: string | number | null;
  statusId: number;
  eventType?: string | null;
  payload: Safe2PayPayload;
  headers: Record<string, string>;
}) {
  try {
    await supabase.from('payment_webhook_logs').insert({
      source: 'safe2pay',
      email: normalizeEmail(params.email) || null,
      transaction_id: params.transactionId ? String(params.transactionId) : null,
      subscription_id: params.subscriptionId ? String(params.subscriptionId) : null,
      status_id: params.statusId ?? null,
      event_type: params.eventType ?? null,
      payload: params.payload as any,
      headers: params.headers as any,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Safe2Pay Webhook] Falha ao gravar payment_webhook_logs:', err);
  }
}

function computePlanExpiresAt(plan: string): string | null {
  const plano = String(plan || "").toLowerCase();
  if (plano === "vitalicio") return null;
  const d = new Date();
  if (plano === "mensal") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

async function findAuthUserIdByEmail(supabase: any, email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  try {
    const perPage = 1000;
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.warn("[Safe2Pay Webhook] listUsers error:", error.message);
        return null;
      }
      const users = (data as any)?.users || [];
      const match = users.find((u: any) => normalizeEmail(u?.email) === normalized);
      if (match?.id) return String(match.id);
      if (!Array.isArray(users) || users.length < perPage) break;
    }
  } catch (err) {
    console.warn("[Safe2Pay Webhook] findAuthUserIdByEmail exception:", err);
  }

  return null;
}

async function createOrFindAuthUser(supabase: any, email: string, password?: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  // Tenta encontrar primeiro
  let userId = await findAuthUserIdByEmail(supabase, email);
  if (userId) return userId;

  // Se não encontrou, cria um novo user
  console.log(`[Safe2Pay Webhook] User não encontrado para ${email}, criando...`);
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalized,
      password: password || `TempPass_${Math.random().toString(36).slice(2, 10)}`,
      email_confirm: true, // Auto-confirma para não exigir email verification
    });

    if (error) {
      console.error("[Safe2Pay Webhook] Erro ao criar user:", error.message);
      return null;
    }

    userId = (data as any)?.user?.id;
    if (userId) {
      console.log(`[Safe2Pay Webhook] User criado com sucesso: ${userId}`);
      return String(userId);
    }
  } catch (err) {
    console.error("[Safe2Pay Webhook] Exception ao criar user:", err);
  }

  return null;
}

function inferPlan(payload: Safe2PayPayload): { plan: string; descricao: string } {
  const amount = Number(payload.Amount ?? payload.AmountDetails?.TotalAmount ?? 0);
  const reference = String(payload.Reference || "");
  const refLower = reference.toLowerCase();

  if (refLower.startsWith("subscription:")) {
    const parts = refLower.split(":");
    const planFromRef = parts[1];
    if (planFromRef === "mensal") return { plan: "mensal", descricao: "Plano Mensal" };
    if (planFromRef === "anual") return { plan: "anual", descricao: "Plano Anual" };
    if (planFromRef === "vitalicio") return { plan: "vitalicio", descricao: "Plano Vitalício" };
  }

  if (amount === 35) return { plan: "mensal", descricao: "Plano Mensal" };
  if (refLower.includes("mensal")) return { plan: "mensal", descricao: "Plano Mensal" };
  if (refLower.includes("vital")) return { plan: "vitalicio", descricao: "Plano Vitalício" };
  return { plan: "anual", descricao: "Plano Anual" };
}

function inferEventType(payload: Safe2PayPayload): string {
  if (payload.EventType) return String(payload.EventType);
  // fallback simples
  if (payload.IdSubscription && getStatusId(payload) === 3) return "SubscriptionCreated";
  return "";
}

function parseReference(reference: string): { email?: string; plan?: string } {
  const ref = String(reference || "").toLowerCase();
  if (!ref.startsWith("subscription:")) return {};
  const parts = ref.split(":");
  if (parts.length >= 3) {
    return { plan: parts[1], email: parts.slice(2).join(":") };
  }
  if (parts.length === 2) {
    return { email: parts[1] };
  }
  return {};
}

async function activateProfileForEmail(supabase: any, params: {
  email: string;
  plan: string;
  fullName?: string;
  cpf?: string;
  phone?: string;
  subscriptionId?: string | null;
}) {
  const email = normalizeEmail(params.email);
  const fullName = (params.fullName || "").trim();
  const planExpiresAt = computePlanExpiresAt(params.plan);
  
  // Se user não existe em auth, cria automaticamente
  let authUserId = await findAuthUserIdByEmail(supabase, email);
  if (!authUserId) {
    authUserId = await createOrFindAuthUser(supabase, email);
    if (!authUserId) {
      console.warn("[Safe2Pay Webhook] Falha ao encontrar ou criar auth user para:", email);
    }
  }

  const baseUpdate = {
    email,
    status: "active",
    plan: params.plan,
    subscription_status: "active",
    id_subscription: params.subscriptionId || null,
    plan_expires_at: planExpiresAt,
    full_name: fullName || "Usuário",
    cpf: params.cpf || "",
    phone: params.phone || "",
    role: "student",
    updated_at: new Date().toISOString(),
  };

  if (authUserId) {
    const { data: updatedById, error: updateByIdError } = await supabase
      .from("profiles")
      .update(baseUpdate)
      .eq("id", authUserId)
      .select()
      .maybeSingle();

    if (updateByIdError) {
      console.warn("[Safe2Pay Webhook] update profile by id failed:", updateByIdError.message);
    }

    if (updatedById) return { profile: updatedById, authUserId };

    const { data: insertedById, error: insertByIdError } = await supabase
      .from("profiles")
      .insert([{ id: authUserId, ...baseUpdate, created_at: new Date().toISOString() }])
      .select()
      .single();

    if (!insertByIdError && insertedById) return { profile: insertedById, authUserId };

    if (insertByIdError) {
      console.warn("[Safe2Pay Webhook] insert profile by id failed:", insertByIdError.message);
    }
  }

  const { data: updatedByEmail, error: updateByEmailError } = await supabase
    .from("profiles")
    .update(baseUpdate)
    // usa ilike para tolerar case (email não é pattern aqui)
    .ilike("email", email)
    .select()
    .maybeSingle();

  if (updateByEmailError) {
    console.warn("[Safe2Pay Webhook] update profile by email failed:", updateByEmailError.message);
  }

  if (updatedByEmail) return { profile: updatedByEmail, authUserId };

  const { data: insertedLegacy, error: insertLegacyError } = await supabase
    .from("profiles")
    .insert([{ id: crypto.randomUUID(), ...baseUpdate, created_at: new Date().toISOString() }])
    .select()
    .single();

  if (insertLegacyError) {
    console.error("[Safe2Pay Webhook] insert legacy profile failed:", insertLegacyError.message);
    return { profile: null, authUserId };
  }
  return { profile: insertedLegacy, authUserId };
}

async function registrarVenda(supabase: any, params: {
  email: string;
  valor: number;
  plano: string;
  metodo: string;
  transactionId?: string | number | null;
  subscriptionId?: string | number | null;
  cycleNumber?: number;
  eventType?: string;
}) {
  const transactionId = params.transactionId ?? null;
  const email = normalizeEmail(params.email);
  
  console.log("[Safe2Pay Webhook] 🔄 registrarVenda:", { email, transactionId, valor: params.valor });

  try {
    const createdAt = new Date().toISOString();
    
    // INSERT direto (RLS agora está desabilitada)
    const { data: insertData, error: insertError } = await supabase
      .from("vendas")
      .insert({
        email: email,
        valor: Number(params.valor || 0),
        plano: params.plano,
        metodo: params.metodo,
        transaction_id: transactionId ? String(transactionId) : null,
        subscription_id: params.subscriptionId ? String(params.subscriptionId) : null,
        cycle_number: params.cycleNumber ?? 1,
        event_type: params.eventType ?? null,
        created_at: createdAt,
      });

    if (!insertError) {
      console.log("[Safe2Pay Webhook] ✅ Venda criada:", { email, transactionId, rows: (insertData as any)?.length || 1 });
      return;
    }

    console.error("[Safe2Pay Webhook] ❌ INSERT vendas error:", {
      message: insertError.message,
      code: insertError.code,
      details: insertError.details,
    });
  } catch (err) {
    console.error("[Safe2Pay Webhook] registrarVenda exception:", err);
  }
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const payload = (await req.json()) as Safe2PayPayload;
    console.log("[Safe2Pay Webhook] Payload recebido:", JSON.stringify(payload));

    let statusId = getStatusId(payload);
    let isPago = statusId === 3;
    const reference = String(payload.Reference || "");
    const referenceParsed = parseReference(reference);
    const rawEmail = (payload.Customer?.Email || payload.Email || "") as string;
    let email = normalizeEmail(rawEmail);
    if (!email && referenceParsed.email) {
      email = normalizeEmail(referenceParsed.email || '');
    }
    const amount = Number(payload.Amount ?? payload.AmountDetails?.TotalAmount ?? 0);
    const metodoId = payload.PaymentMethod;
    const transactionId = getTransactionId(payload);
    let subscriptionId = payload.IdSubscription;
    let eventType = inferEventType(payload);
    
    // FALLBACK: Se pagamento foi confirmado (pago), gerar subscription_id automaticamente
    // Isso garante rastreamento de recorrência mesmo sem Safe2Pay retornar o ID
    if (isPago && !subscriptionId && transactionId && email) {
      // Criar um ID de assinatura baseado em transaction + email hash + timestamp
      const emailHash = email.substring(0, 3).toUpperCase();
      subscriptionId = `SUB-${transactionId}-${emailHash}-${Date.now()}`.substring(0, 50);
      console.log('[Safe2Pay Webhook] Generated fallback subscriptionId:', subscriptionId, 'para email:', email);
    }

    if (!statusId && transactionId) {
      const details = await fetchTransactionDetails(transactionId);
      if (details) {
        statusId = getStatusId(details) || statusId;
        isPago = statusId === 3;
        if (!email) {
          const detailEmail = (details.Customer as any)?.Email || (details as any)?.Email || '';
          email = normalizeEmail(detailEmail);
        }
        if (!eventType) eventType = inferEventType(details);
      }
    }

    const headersObj: Record<string, string> = {};
    for (const [k, v] of req.headers.entries()) headersObj[k] = v;
    await logWebhookPayload(supabase, {
      email: email || (reference.startsWith('SUBSCRIPTION:') ? reference.split(':')[1] : ''),
      transactionId: transactionId ?? null,
      subscriptionId: subscriptionId ?? null,
      statusId,
      eventType: eventType || null,
      payload,
      headers: headersObj,
    });

    if (!isPago) {
      console.log(`[Safe2Pay Webhook] Status não é pago (${statusId}), ignorando.`);
      return new Response(JSON.stringify({ message: "Aguardando confirmação" }), { status: 200 });
    }

    // Ignorar callbacks de outros fluxos
    if (reference.startsWith("FEDERATION:")) {
      console.log("[Safe2Pay Webhook] Callback de FEDERATION detectado; ignorando neste endpoint.");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const { plan: planoInterno, descricao: descricaoVenda } = inferPlan({
      ...payload,
      Reference: referenceParsed.plan ? `subscription:${referenceParsed.plan}` : payload.Reference,
    });
    const metodoNome = metodoId === 1 || metodoId === "1" ? "boleto" : metodoId === 6 || metodoId === "6" ? "pix" : "cartao";

    // Eventos de assinatura: também podem chegar aqui
    if (eventType && ["SubscriptionCreated", "SubscriptionRenewed", "SubscriptionFailed", "SubscriptionCanceled", "SubscriptionExpired"].includes(eventType)) {
      if (!email) {
        console.warn("[Safe2Pay Webhook] Evento de assinatura sem email; ignorando.");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (eventType === "SubscriptionFailed") {
        await supabase
          .from("profiles")
          .update({ subscription_status: "suspended", updated_at: new Date().toISOString() })
          .ilike("email", email);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (eventType === "SubscriptionCanceled" || eventType === "SubscriptionExpired") {
        await supabase
          .from("profiles")
          .update({ subscription_status: eventType === "SubscriptionCanceled" ? "canceled" : "expired", status: "inactive", updated_at: new Date().toISOString() })
          .ilike("email", email);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (!isPago) {
        console.log(`[Safe2Pay Webhook] Assinatura ${eventType} mas status não é pago (${statusId}), ignorando.`);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      await activateProfileForEmail(supabase, {
        email,
        plan: planoInterno,
        fullName: String(payload.Customer?.Name || "Usuário"),
        cpf: String(payload.Customer?.Identity || ""),
        phone: String(payload.Customer?.Phone || ""),
        subscriptionId: subscriptionId ? String(subscriptionId) : null,
      });

      await registrarVenda(supabase, {
        email,
        valor: amount,
        plano: descricaoVenda,
        metodo: metodoNome,
        transactionId: transactionId ? String(transactionId) : null,
        subscriptionId: subscriptionId ? String(subscriptionId) : null,
        cycleNumber: eventType === "SubscriptionRenewed" ? 2 : 1,
        eventType,
      });

      return new Response(JSON.stringify({ success: true, message: "OK" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fluxo legado (pagamento avulso/primeira confirmação)
    if (!email) {
      console.log("[Safe2Pay Webhook] Email ausente no payload.");
      return new Response(JSON.stringify({ message: "Email ausente" }), { status: 200 });
    }

    if (!isPago) {
      console.log(`[Safe2Pay Webhook] Status não é pago (${statusId}), ignorando.`);
      return new Response(JSON.stringify({ message: "Aguardando confirmação" }), { status: 200 });
    }

    // Se veio no formato SUBSCRIPTION:email, respeitar (evita divergência)
    let emailParaAtivar = email;
    if (referenceParsed.email) {
      emailParaAtivar = normalizeEmail(referenceParsed.email || email);
    }

    await activateProfileForEmail(supabase, {
      email: emailParaAtivar,
      plan: planoInterno,
      fullName: String(payload.Customer?.Name || "Usuário"),
      cpf: String(payload.Customer?.Identity || ""),
      phone: String(payload.Customer?.Phone || ""),
      subscriptionId: subscriptionId ? String(subscriptionId) : null,
    });

    await registrarVenda(supabase, {
      email: emailParaAtivar,
      valor: amount,
      plano: descricaoVenda,
      metodo: metodoNome,
      transactionId: transactionId ? String(transactionId) : null,
      subscriptionId: subscriptionId ? String(subscriptionId) : null,
      cycleNumber: 1,
    });

    return new Response(JSON.stringify({ success: true, message: "Acesso Liberado" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Safe2Pay Webhook] Erro inesperado:`, errorMessage);
    // Retorne 200 para evitar retentativas infinitas, mas logue o erro
    return new Response(JSON.stringify({ error: errorMessage }), { status: 200 });
  }
});