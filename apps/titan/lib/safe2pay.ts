/// <reference types="node" />
/**
 * Safe2Pay Utilities para Titan Academy
 * Integração com API de Recorrência Safe2Pay
 * 
 * ⚠️ IMPORTANTE: Webhooks devem ser registrados na criação do plano
 */

import axios from 'axios';

const SAFE2PAY_RECURRENCE_URL = 'https://services.safe2pay.com.br/recurrence/v1';
const SAFE2PAY_PAYMENT_URL = 'https://payment.safe2pay.com.br/v2';

/**
 * Criar um plano de recorrência
 * 
 * ✅ FIX: Agora inclui CallbackUrl (webhook) durante criação
 * De acordo com S2P support, el webhook só pode ser registrado no momento de criação do plano.
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
    const response = await axios.post(
      `${SAFE2PAY_RECURRENCE_URL}/plans/`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiToken,
        },
        timeout: 15000,
      }
    );

    if (response.data?.Id) {
      const planId = String(response.data.Id);
      console.log(`[CREATE_PLAN] ✅ Plano criado: ${planId}`);
      return { planId };
    }

    console.error('[CREATE_PLAN] Resposta inesperada:', response.data);
    return { error: 'Resposta inesperada da API' };
  } catch (error: any) {
    const errorMsg = error.response?.data?.Message || error.response?.data?.Error || error.message;
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
    const response = await axios.post(`${SAFE2PAY_PAYMENT_URL}/card/token`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiToken,
      },
      timeout: 15000,
    });

    if (response.data?.TokenizedCard) {
      return { token: response.data.TokenizedCard };
    }

    return { error: 'Token não retornado' };
  } catch (error: any) {
    const errorMsg = error.response?.data?.Message || error.message;
    console.error('[TOKENIZE] Erro:', errorMsg);
    return { error: errorMsg };
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
    const response = await axios.post(
      `${SAFE2PAY_RECURRENCE_URL}/plans/${planId}/subscriptions`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiToken,
        },
        timeout: 15000,
      }
    );

    if (response.data?.Subscription?.IdSubscription) {
      const subId = String(response.data.Subscription.IdSubscription);
      console.log(`[CREATE_SUB] ✅ Assinatura criada: ${subId}`);
      return { subscriptionId: subId };
    }

    return { error: 'Assinatura não retornada' };
  } catch (error: any) {
    const errorMsg = error.response?.data?.Message || error.message;
    console.error('[CREATE_SUB] Erro:', errorMsg);
    return { error: errorMsg };
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
    const response = await axios.get(
      `${SAFE2PAY_RECURRENCE_URL}/subscriptions/${subscriptionId}`,
      {
        headers: {
          'x-api-key': apiToken,
        },
        timeout: 15000,
      }
    );

    return { subscription: response.data };
  } catch (error: any) {
    const errorMsg = error.response?.data?.Message || error.message;
    console.error('[GET_SUB] Erro:', errorMsg);
    return { error: errorMsg };
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
    await axios.post(
      `${SAFE2PAY_RECURRENCE_URL}/subscriptions/${subscriptionId}/disable`,
      {},
      {
        headers: {
          'x-api-key': apiToken,
        },
        timeout: 15000,
      }
    );

    console.log(`[CANCEL_SUB] ✅ Assinatura ${subscriptionId} cancelada`);
    return { success: true };
  } catch (error: any) {
    const errorMsg = error.response?.data?.Message || error.message;
    console.error('[CANCEL_SUB] Erro:', errorMsg);
    return { error: errorMsg };
  }
}
