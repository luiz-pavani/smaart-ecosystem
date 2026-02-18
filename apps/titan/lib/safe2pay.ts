/// <reference types="node" />
/**
 * Safe2Pay Utilities para Titan Academy
 * Integração com API de Recorrência Safe2Pay
 * 
 * ⚠️ IMPORTANTE: Webhooks devem ser registrados na criação do plano
 * Uses native fetch API (no axios dependency needed)
 */

const SAFE2PAY_RECURRENCE_URL = 'https://services.safe2pay.com.br/recurrence/v1';
const SAFE2PAY_PAYMENT_URL = 'https://payment.safe2pay.com.br/v2';

/**
 * Criar um plano de recorrência
 * 
 * ✅ FIX: Agora inclui CallbackUrl (webhook) durante criação
 * De acordo com S2P support, o webhook só pode ser registrado no momento de criação do plano.
 */
export async function createPlan(params: {
  name: string;
  amount: number;
  frequency: 1 | 2 | 3 | 4; // 1=mensal, 2=trimestral, 3=semestral, 4=anual
  chargeDay?: number;
  billingCycle?: number; // null/undefined = infinito
  isImmediateCharge?: boolean;
  description?: string;
  webhookUrl?: string; // ✅ NOVO: URL de callback (ex: https://titan.smaartpro.com/api/webhooks/safe2pay)
  apiToken: string;
}): Promise<{
  planId?: string;
  error?: string;
}> {
  const {
    name,
    amount,
    frequency,
    chargeDay = 10,
    billingCycle,
    isImmediateCharge = true,
    description,
    webhookUrl,
    apiToken,
  } = params;

  const payload: any = {
    PlanOption: 1,
    PlanFrequence: frequency,
    Name: name,
    Amount: amount.toFixed(2),
    Description: description || name,
    ChargeDay: chargeDay,
    IsImmediateCharge: isImmediateCharge,
    IsProRata: true,
    IsRetryCharge: true,
  };

  if (billingCycle) {
    payload.BillingCycle = billingCycle;
  }

  // ✅ Registrar webhook na criação do plano
  if (webhookUrl) {
    payload.CallbackUrl = webhookUrl;
    console.log(`[CREATE_PLAN] 🔗 Webhook registrado: ${webhookUrl}`);
  }

  try {
    const response = await fetch(`${SAFE2PAY_RECURRENCE_URL}/plans/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiToken,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data?.Id) {
      const planId = String(data.Id);
      console.log(`[CREATE_PLAN] ✅ Plano criado: ${planId}`);
      return { planId };
    }

    const errorMsg = data?.Message || data?.Error || `HTTP ${response.status}`;
    console.error('[CREATE_PLAN] Resposta inesperada:', data);
    return { error: errorMsg };
  } catch (error: any) {
    const errorMsg = error?.message || 'Network error';
    console.error('[CREATE_PLAN] ❌ Erro:', errorMsg);
    return { error: errorMsg };
  }
}

/**
 * Tokenizar cartão de crédito para uso em assinaturas
 */
export async function tokenizeCard(params: {
  cardNumber: string;
  holderName: string;
  expirationDate: string; // MM/YYYY
  securityCode: string;
  apiToken: string;
}): Promise<{
  token?: string;
  error?: string;
}> {
  const { cardNumber, holderName, expirationDate, securityCode, apiToken } = params;

  const payload = {
    CardNumber: cardNumber.replace(/\D/g, ''),
    HolderName: holderName,
    ExpirationDate: expirationDate,
    SecurityCode: securityCode,
  };

  try {
    const response = await fetch(`${SAFE2PAY_PAYMENT_URL}/card/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiToken,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data?.TokenizedCard) {
      return { token: data.TokenizedCard };
    }

    return { error: data?.Message || 'Token não retornado' };
  } catch (error: any) {
    console.error('[TOKENIZE] Erro:', error?.message);
    return { error: error?.message || 'Network error' };
  }
}

/**
 * Criar assinatura recorrente
 */
export async function createSubscription(params: {
  planId: string;
  tokenizedCard: string;
  holderEmail: string;
  studentName: string;
  nextBillingDate?: string; // YYYY-MM-DD
  apiToken: string;
}): Promise<{
  subscriptionId?: string;
  error?: string;
}> {
  const {
    planId,
    tokenizedCard,
    holderEmail,
    studentName,
    nextBillingDate,
    apiToken,
  } = params;

  const payload: any = {
    PlanId: planId,
    CustomerEmail: holderEmail,
    CustomerName: studentName,
    TokenizedCard: tokenizedCard,
  };

  if (nextBillingDate) {
    payload.NextBillingDate = nextBillingDate;
  }

  try {
    const response = await fetch(
      `${SAFE2PAY_RECURRENCE_URL}/plans/${planId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiToken,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (response.ok && data?.Subscription?.IdSubscription) {
      const subId = String(data.Subscription.IdSubscription);
      console.log(`[CREATE_SUB] ✅ Assinatura criada: ${subId}`);
      return { subscriptionId: subId };
    }

    return { error: data?.Message || 'Assinatura não retornada' };
  } catch (error: any) {
    console.error('[CREATE_SUB] Erro:', error?.message);
    return { error: error?.message || 'Network error' };
  }
}

/**
 * Buscar assinatura por ID
 */
export async function getSubscription(params: {
  subscriptionId: string;
  apiToken: string;
}): Promise<{
  subscription?: any;
  error?: string;
}> {
  const { subscriptionId, apiToken } = params;

  try {
    const response = await fetch(
      `${SAFE2PAY_RECURRENCE_URL}/subscriptions/${subscriptionId}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiToken,
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      return { subscription: data };
    }

    return { error: data?.Message || `HTTP ${response.status}` };
  } catch (error: any) {
    console.error('[GET_SUB] Erro:', error?.message);
    return { error: error?.message || 'Network error' };
  }
}

/**
 * Cancelar assinatura
 */
export async function cancelSubscription(params: {
  subscriptionId: string;
  apiToken: string;
}): Promise<{
  success?: boolean;
  error?: string;
}> {
  const { subscriptionId, apiToken } = params;

  try {
    const response = await fetch(
      `${SAFE2PAY_RECURRENCE_URL}/subscriptions/${subscriptionId}/disable`,
      {
        method: 'POST',
        headers: {
          'x-api-key': apiToken,
        },
        body: JSON.stringify({}),
      }
    );

    if (response.ok) {
      console.log(`[CANCEL_SUB] ✅ Assinatura ${subscriptionId} cancelada`);
      return { success: true };
    }

    const data = await response.json();
    return { error: data?.Message || `HTTP ${response.status}` };
  } catch (error: any) {
    console.error('[CANCEL_SUB] Erro:', error?.message);
    return { error: error?.message || 'Network error' };
  }
}
