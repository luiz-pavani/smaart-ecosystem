/// <reference types="node" />
/**
 * Utilitários para Safe2Pay - API de Recorrência (Produção)
 * Endpoints em produção (sem Sandbox)
 */

import axios from 'axios';

// URLs de Produção
const SAFE2PAY_RECURRENCE_URL = 'https://services.safe2pay.com.br/recurrence/v1';
const SAFE2PAY_PAYMENT_URL = 'https://payment.safe2pay.com.br/v2';

// Plan IDs para os planos de assinatura
// Estes devem ser criados uma vez e reutilizados
const PLAN_IDS: Record<string, string> = {
  mensal: process.env.SAFE2PAY_PLAN_ID_MENSAL || '',
  anual: process.env.SAFE2PAY_PLAN_ID_ANUAL || '',
  vitalicio: process.env.SAFE2PAY_PLAN_ID_VITALICIO || '',
};

/**
 * Criar um plano de recorrência (uso único/admin)
 * Endpoint: POST /recurrence/v1/plans/
 */
export async function createPlan(params: {
  name: string;
  amount: number;
  frequency: 1 | 2 | 3 | 4; // 1=mensal, 2=trimestral, 3=semestral, 4=anual
  chargeDay?: number; // Dia do mês para cobrança
  billingCycle?: number; // Número de ciclos (deixar vazio = infinito)
  isImmediateCharge?: boolean; // Cobrança imediata após assinatura
  description?: string;
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
    billingCycle, // deixar vazio para infinito
    isImmediateCharge = true,
    description,
    apiToken,
  } = params;

  const payload: any = {
    PlanOption: 1, // 1 = Personalizado, 2 = Fixo
    PlanFrequence: frequency, // 1=mensal, 2=trimestral, 3=semestral, 4=anual
    Name: name,
    Amount: amount.toFixed(2),
    Description: description || name,
    ChargeDay: chargeDay,
    IsImmediateCharge: isImmediateCharge,
    IsProRata: true,
    IsRetryCharge: true, // Permitir retentativas em falhas
  };

  if (billingCycle) {
    payload.BillingCycle = billingCycle;
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

    if (response.data?.data?.idPlan) {
      console.log(`[CREATE_PLAN] ✅ Plano criado: ${response.data.data.idPlan}`);
      return { planId: String(response.data.data.idPlan) };
    }

    console.error('[CREATE_PLAN] Resposta inesperada:', response.data);
    return { error: 'Resposta inesperada da API' };
  } catch (error: any) {
    const errorMsg = error.response?.data?.Message || error.response?.data?.Error || error.message;
    console.error('[CREATE_PLAN] Erro ao criar plano:', error.response?.data || error.message);
    return { error: errorMsg };
  }
}

/**
 * Obter Plan ID (usar existente ou criar novo)
 */
export function getPlanId(plan: string): string {
  return PLAN_IDS[plan] || '';
}

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
 * Suporta: Boleto (1), Cartão de Crédito (2), PIX (6)
 * Endpoint: POST /recurrence/v1/plans/{planId}/subscriptions
 */
export async function createSubscription(params: {
  planId: string;
  paymentMethod: '1' | '2' | '6'; // 1=Boleto, 2=Cartão, 6=Pix
  reference?: string;
  customerEmails: string[];
  customerName?: string;
  customerIdentity?: string;
  customerPhone?: string;
  customerAddress?: {
    ZipCode?: string;
    Street?: string;
    Number?: string;
    Complement?: string;
    District?: string;
    CityName?: string;
    StateInitials?: string;
    CountryName?: string;
  };
  cardToken?: string; // Obrigatório se paymentMethod=2
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

  if (!planId) {
    return { error: 'Plan ID não fornecido' };
  }

  const payload: any = {
    PaymentMethod: paymentMethod,
    Customer: {
      Emails: customerEmails,
    },
  };

  if (reference) payload.Reference = reference;

  if (customerName) payload.Customer.Name = customerName;
  if (customerIdentity) payload.Customer.Identity = customerIdentity?.replace(/\D/g, '');
  if (customerPhone) payload.Customer.Phone = customerPhone?.replace(/\D/g, '');
  
  if (customerAddress) {
    payload.Customer.Address = {
      Street: customerAddress.Street,
      Number: customerAddress.Number,
      Complement: customerAddress.Complement,
      District: customerAddress.District,
      ZipCode: customerAddress.ZipCode?.replace(/\D/g, ''),
      City: {
        CityName: customerAddress.CityName,
      },
    };
    
    if (customerAddress.StateInitials) {
      payload.Customer.Address.StateInitials = customerAddress.StateInitials;
    }
    if (customerAddress.CountryName) {
      payload.Customer.Address.CountryName = customerAddress.CountryName;
    }
  }

  // Se for cartão e tiver token, adicionar
  if (paymentMethod === '2' && cardToken) {
    payload.Customer.Token = cardToken;
  }

  // Se tiver vendor, adicionar
  if (vendor) {
    payload.Vendor = vendor;
  }

  try {
    console.log(`[CREATE_SUBSCRIPTION] Criando assinatura...`);
    console.log(`  - Plan ID: ${planId}`);
    console.log(`  - Método: ${paymentMethod === '1' ? 'Boleto' : paymentMethod === '2' ? 'Cartão' : 'PIX'}`);
    console.log(`  - Email(s): ${customerEmails.join(', ')}`);

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

    if (response.data && response.data.data?.idSubscription) {
      const subscriptionId = String(response.data.data.idSubscription);
      const paymentUrl = response.data.data.paymentUrl || response.data.data.Url;
      console.log(`[CREATE_SUBSCRIPTION] ✅ Assinatura criada: ${subscriptionId}`);
      return {
        subscriptionId,
        paymentUrl,
      };
    }

    console.error('[CREATE_SUBSCRIPTION] Resposta inesperada:', response.data);
    return { error: 'Resposta inesperada da API: sem idSubscription' };
  } catch (error: any) {
    const errorMsg = error.response?.data?.Message || error.response?.data?.message || error.response?.data?.Error || error.message;
    console.error('[CREATE_SUBSCRIPTION] Erro ao criar assinatura:', {
      status: error.response?.status,
      data: error.response?.data,
      message: errorMsg,
    });
    return { error: errorMsg || 'Erro desconhecido ao criar assinatura' };
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
      `${SAFE2PAY_RECURRENCE_URL}/subscriptions/${subscriptionId}`,
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
      `${SAFE2PAY_RECURRENCE_URL}/subscriptions/${subscriptionId}/disable`,
      {},
      {
        headers: {
          'x-api-key': apiToken,
        },
        timeout: 10000,
      }
    );

    console.log(`[DISABLE_SUBSCRIPTION] ✅ Assinatura ${subscriptionId} desabilitada`);
    return true;
  } catch (error: any) {
    console.error('[DISABLE_SUBSCRIPTION] Erro:', error.response?.data || error.message);
    return false;
  }
}
