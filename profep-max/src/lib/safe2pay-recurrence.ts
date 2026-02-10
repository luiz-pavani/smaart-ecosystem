/// <reference types="node" />
/**
 * Utilitários para Safe2Pay - API de Recorrência
 */

import axios from 'axios';

const SAFE2PAY_BASE_URL = 'https://services.safe2pay.com.br/recurrence/v1';
const SAFE2PAY_PAYMENT_URL = 'https://payment.safe2pay.com.br/v2';

/**
 * Tokenizar cartão de crédito para uso em assinaturas
 * Endpoint: POST /payment/v2/card/token
 */
export async function tokenizeCard(params: {
  cardNumber: string;
  cardHolder: string;
  cardExpiryMonth: string;
  cardExpiryYear: string;
  cardCVV: string;
  apiToken: string;
}): Promise<{ token: string; brand?: string } | null> {
  const { cardNumber, cardHolder, cardExpiryMonth, cardExpiryYear, cardCVV, apiToken } = params;

  const payload = {
    CardNumber: cardNumber.replace(/\s/g, ''),
    Holder: cardHolder.trim(),
    ExpirationDate: `${cardExpiryMonth.padStart(2, '0')}/${cardExpiryYear}`,
    SecurityCode: cardCVV,
  };

  try {
    const response = await axios.post(
      `${SAFE2PAY_PAYMENT_URL}/card/token`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiToken,
        },
        timeout: 15000,
      }
    );

    if (response.data && response.data.Token) {
      return {
        token: response.data.Token,
        brand: response.data.Brand || undefined,
      };
    }

    console.error('[TOKENIZE] Resposta inesperada:', response.data);
    return null;
  } catch (error: any) {
    console.error('[TOKENIZE] Erro ao tokenizar cartão:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Criar assinatura em um plano existente
 * Endpoint: POST /recurrence/v1/plans/{planId}/subscriptions
 */
export async function createSubscription(params: {
  planId: string;
  paymentMethod: '1' | '2' | '6'; // 1=Boleto, 2=Cartao, 6=Pix
  reference?: string;
  customerEmails: string[];
  customerName?: string;
  customerIdentity?: string;
  customerPhone?: string;
  customerAddress?: {
    ZipCode?: string;
    Street?: string;
    Number?: string;
    District?: string;
    CityName?: string;
    StateInitials?: string;
    CountryName?: string;
  };
  cardToken?: string; // Obrigatorio se paymentMethod=2
  vendor?: string;
  apiToken: string;
}): Promise<{
  subscriptionId?: string;
  paymentUrl?: string;
  error?: string;
}> {
  const {
    planId,
    paymentMethod,
    reference,
    customerEmails,
    customerName,
    customerIdentity,
    customerPhone,
    customerAddress,
    cardToken,
    vendor,
    apiToken,
  } = params;

  const payload: any = {
    PaymentMethod: paymentMethod,
    Customer: {
      Emails: customerEmails,
    },
  };

  if (reference) payload.Reference = reference;

  if (customerName) payload.Customer.Name = customerName;
  if (customerIdentity) payload.Customer.Identity = customerIdentity;
  if (customerPhone) payload.Customer.Phone = customerPhone;
  if (customerAddress) payload.Customer.Address = customerAddress;

  // Se for cartão e tiver token, adicionar
  if (paymentMethod === '2' && cardToken) {
    payload.Customer.Token = cardToken;
  }

  // Se tiver vendor, adicionar
  if (vendor) {
    payload.Vendor = vendor;
  }

  try {
    const response = await axios.post(
      `${SAFE2PAY_BASE_URL}/plans/${planId}/subscriptions`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiToken,
        },
        timeout: 15000,
      }
    );

    if (response.data && response.data.Id) {
      return {
        subscriptionId: response.data.Id,
        paymentUrl: response.data.PaymentUrl || response.data.Url,
      };
    }

    console.error('[SUBSCRIPTION] Resposta inesperada:', response.data);
    return { error: 'Resposta inesperada da API' };
  } catch (error: any) {
    const errorMsg = error.response?.data?.Message || error.response?.data?.Error || error.message;
    console.error('[SUBSCRIPTION] Erro ao criar assinatura:', error.response?.data || error.message);
    return { error: errorMsg };
  }
}

/**
 * Buscar informações de uma assinatura
 * Endpoint: GET /recurrence/v1/subscriptions/{subscriptionId}
 */
export async function getSubscription(params: {
  subscriptionId: string;
  apiToken: string;
}): Promise<any | null> {
  const { subscriptionId, apiToken } = params;

  try {
    const response = await axios.get(
      `${SAFE2PAY_BASE_URL}/subscriptions/${subscriptionId}`,
      {
        headers: {
          'x-api-key': apiToken,
        },
        timeout: 10000,
      }
    );

    return response.data || null;
  } catch (error: any) {
    console.error('[GET_SUBSCRIPTION] Erro:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Desabilitar assinatura
 * Endpoint: PATCH /recurrence/v1/subscriptions/{subscriptionId}/disable
 */
export async function disableSubscription(params: {
  subscriptionId: string;
  apiToken: string;
}): Promise<boolean> {
  const { subscriptionId, apiToken } = params;

  try {
    await axios.patch(
      `${SAFE2PAY_BASE_URL}/subscriptions/${subscriptionId}/disable`,
      {},
      {
        headers: {
          'x-api-key': apiToken,
        },
        timeout: 10000,
      }
    );

    return true;
  } catch (error: any) {
    console.error('[DISABLE_SUBSCRIPTION] Erro:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Obter Plan ID baseado no nome do plano
 */
export function getPlanId(plan: string): string | null {
  const planMap: { [key: string]: string } = {
    mensal: process.env.SAFE2PAY_PLAN_ID_MENSAL || '',
    anual: process.env.SAFE2PAY_PLAN_ID_ANUAL || '',
    vitalicio: process.env.SAFE2PAY_PLAN_ID_VITALICIO || '',
  };

  return planMap[plan.toLowerCase()] || null;
}
