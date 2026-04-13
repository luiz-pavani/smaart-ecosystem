/// <reference types="node" />
/**
 * Safe2Pay Utilities para Titan Academy
 * Integração com API de Pagamento e Recorrência Safe2Pay
 */

const SAFE2PAY_RECURRENCE_URL = 'https://services.safe2pay.com.br/recurrence/v1'
const SAFE2PAY_PAYMENT_URL = 'https://payment.safe2pay.com.br/v2'

export const SAFE2PAY_API_KEY = process.env.SAFE2PAY_API_KEY || ''

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Safe2PayCustomer {
  Name: string
  Identity: string   // CPF sem formatação
  Phone: string      // ex: "55 51 99999-9999"
  Email: string
  Address?: {
    ZipCode?: string
    Street?: string
    Number?: string
    Complement?: string
    District?: string
    CityName?: string
    StateInitials?: string
    CountryName?: string
  }
}

export interface PixChargeResult {
  idTransaction?: number
  qrCode?: string       // EMV Pix copia-e-cola
  qrCodeUrl?: string    // URL da imagem do QR code
  status?: number
  error?: string
}

export interface CardChargeResult {
  idTransaction?: number
  status?: number
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function s2pHeaders(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  }
}

/** Extrai planId da resposta — Safe2Pay usa casing inconsistente entre ambientes */
function extractPlanId(data: any): string | undefined {
  const id = data?.Output?.IdPlan ?? data?.IdPlan ?? data?.idPlan ?? data?.Id ?? data?.id
  return id != null ? String(id) : undefined
}

/** Extrai token da tokenização */
function extractToken(data: any): string | undefined {
  return data?.Output ?? data?.token ?? data?.Token ?? data?.TokenizedCard ?? undefined
}

/** Garante que o Customer tenha Address e Phone válidos (Safe2Pay exige) */
function ensureAddress(customer: Safe2PayCustomer): Safe2PayCustomer {
  // Phone: 10-11 dígitos, só números
  let phone = (customer.Phone || '').replace(/\D/g, '')
  if (phone.startsWith('55') && phone.length > 11) phone = phone.slice(2)
  if (phone.length < 10) phone = '55984085000'  // fallback LRSJ

  return {
    ...customer,
    Phone: phone,
    Address: customer.Address?.ZipCode ? customer.Address : {
      ZipCode: '97015-020',
      Street: 'Rua do Acampamento',
      Number: '380',
      District: 'Centro',
      CityName: 'Santa Maria',
      StateInitials: 'RS',
      CountryName: 'Brasil',
      ...customer.Address,
    },
  }
}

// ─── Criar Plano de Recorrência ───────────────────────────────────────────────

export async function createPlan(params: {
  name: string
  amount: number
  frequency: 1 | 2 | 3 | 4  // 1=mensal, 2=trimestral, 3=semestral, 4=anual
  chargeDay?: number
  billingCycle?: number       // undefined = infinito
  isImmediateCharge?: boolean
  description?: string
  webhookUrl?: string
  apiToken?: string
}): Promise<{ planId?: string; error?: string }> {
  const {
    name, amount, frequency,
    chargeDay = 10,
    billingCycle,
    isImmediateCharge = true,
    description,
    webhookUrl,
    apiToken = SAFE2PAY_API_KEY,
  } = params

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
  }

  if (billingCycle) payload.BillingCycle = billingCycle
  if (webhookUrl) payload.CallbackUrl = webhookUrl

  try {
    const res = await fetch(`${SAFE2PAY_RECURRENCE_URL}/plans/`, {
      method: 'POST',
      headers: s2pHeaders(apiToken),
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (res.ok && !data?.HasError) {
      const planId = extractPlanId(data)
      if (planId) {
        console.log(`[S2P] Plano criado: ${planId}`)
        return { planId }
      }
    }

    const errorMsg = data?.Error || data?.Message || `HTTP ${res.status}`
    console.error('[S2P] createPlan erro:', data)
    return { error: errorMsg }
  } catch (err: any) {
    return { error: err?.message || 'Network error' }
  }
}

// ─── Tokenizar Cartão ─────────────────────────────────────────────────────────

export async function tokenizeCard(params: {
  cardNumber: string
  holderName: string
  expirationDate: string  // MM/YYYY
  securityCode: string
  apiToken?: string
}): Promise<{ token?: string; error?: string }> {
  const { cardNumber, holderName, expirationDate, securityCode, apiToken = SAFE2PAY_API_KEY } = params

  try {
    const res = await fetch(`${SAFE2PAY_PAYMENT_URL}/Token`, {
      method: 'POST',
      headers: s2pHeaders(apiToken),
      body: JSON.stringify({
        CardNumber: cardNumber.replace(/\D/g, ''),
        Holder: holderName,
        ExpirationDate: expirationDate,
        SecurityCode: securityCode,
      }),
    })
    const data = await res.json()

    if (!data?.HasError && data?.ResponseDetail?.Token) {
      return { token: data.ResponseDetail.Token }
    }

    return { error: data?.Error || data?.ResponseDetail?.Message || data?.title || 'Token não retornado' }
  } catch (err: any) {
    return { error: err?.message || 'Network error' }
  }
}

// ─── Criar Cobrança Pix (única) ───────────────────────────────────────────────

export async function createPixCharge(params: {
  amount: number
  customer: Safe2PayCustomer
  description: string
  referenceCode?: string  // ID interno (filiacao_pedido, etc.)
  webhookUrl?: string
  apiToken?: string
}): Promise<PixChargeResult> {
  const {
    amount, customer, description, referenceCode,
    webhookUrl = `https://titan.smaartpro.com/api/webhooks/safe2pay`,
    apiToken = SAFE2PAY_API_KEY,
  } = params

  const payload = {
    IsSandbox: false,
    Application: 'Titan Academy',
    Vendor: 'SMAART PRO',
    CallbackUrl: webhookUrl,
    PaymentMethod: '6',
    Reference: referenceCode || '',
    Customer: ensureAddress(customer),
    Products: [
      {
        Code: referenceCode || 'TITAN',
        Description: description,
        UnitPrice: amount.toFixed(2),
        Quantity: 1,
      },
    ],
  }

  try {
    const res = await fetch(`${SAFE2PAY_PAYMENT_URL}/payment`, {
      method: 'POST',
      headers: s2pHeaders(apiToken),
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (data?.HasError) {
      return { error: data?.Error || data?.Message || 'Erro ao criar Pix' }
    }

    const out = data?.ResponseDetail ?? data?.Output ?? data
    return {
      idTransaction: out?.IdTransaction,
      qrCode: out?.Key,                  // EMV copia-e-cola
      qrCodeUrl: out?.QrCode,            // URL da imagem PNG do QR
      status: typeof out?.Status === 'object' ? out.Status.Id : Number(out?.Status) || undefined,
    }
  } catch (err: any) {
    return { error: err?.message || 'Network error' }
  }
}

// ─── Criar Cobrança Cartão (única) ────────────────────────────────────────────

export async function createCardCharge(params: {
  amount: number
  customer: Safe2PayCustomer
  tokenizedCard: string
  installments?: number
  description: string
  referenceCode?: string
  webhookUrl?: string
  apiToken?: string
}): Promise<CardChargeResult> {
  const {
    amount, customer, tokenizedCard, installments = 1,
    description, referenceCode,
    webhookUrl = `https://titan.smaartpro.com/api/webhooks/safe2pay`,
    apiToken = SAFE2PAY_API_KEY,
  } = params

  const payload = {
    IsSandbox: false,
    Application: 'Titan Academy',
    Vendor: 'SMAART PRO',
    CallbackUrl: webhookUrl,
    PaymentMethod: '2',
    Reference: referenceCode || '',
    Customer: ensureAddress(customer),
    Products: [
      {
        Code: referenceCode || 'TITAN',
        Description: description,
        UnitPrice: amount.toFixed(2),
        Quantity: 1,
      },
    ],
    PaymentObject: {
      Token: tokenizedCard,
      Installments: installments,
    },
  }

  try {
    const res = await fetch(`${SAFE2PAY_PAYMENT_URL}/payment`, {
      method: 'POST',
      headers: s2pHeaders(apiToken),
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (data?.HasError) {
      return { error: data?.Error || data?.Message || 'Erro ao cobrar cartão' }
    }

    const out = data?.ResponseDetail ?? data?.Output ?? data
    return {
      idTransaction: out?.IdTransaction,
      status: typeof out?.Status === 'object' ? out.Status.Id : Number(out?.Status) || undefined,
    }
  } catch (err: any) {
    return { error: err?.message || 'Network error' }
  }
}

// ─── Criar Assinatura Recorrente ──────────────────────────────────────────────

export async function createSubscription(params: {
  planId: string
  tokenizedCard: string
  customer: Safe2PayCustomer
  nextBillingDate?: string   // YYYY-MM-DD
  apiToken?: string
}): Promise<{ subscriptionId?: string; error?: string }> {
  const { planId, tokenizedCard, customer, nextBillingDate, apiToken = SAFE2PAY_API_KEY } = params

  const payload: any = {
    PlanId: planId,
    TokenizedCard: tokenizedCard,
    Customer: ensureAddress(customer),
  }

  if (nextBillingDate) payload.NextBillingDate = nextBillingDate

  try {
    const res = await fetch(`${SAFE2PAY_RECURRENCE_URL}/plans/${planId}/subscriptions`, {
      method: 'POST',
      headers: s2pHeaders(apiToken),
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (res.ok && !data?.HasError) {
      const subId =
        data?.Output?.IdSubscription ??
        data?.Subscription?.IdSubscription ??
        data?.IdSubscription ??
        data?.idSubscription
      if (subId) {
        console.log(`[S2P] Assinatura criada: ${subId}`)
        return { subscriptionId: String(subId) }
      }
    }

    return { error: data?.Error || data?.Message || 'Assinatura não retornada' }
  } catch (err: any) {
    return { error: err?.message || 'Network error' }
  }
}

// ─── Consultar Transação ──────────────────────────────────────────────────────

export async function getTransaction(params: {
  idTransaction: number | string
  apiToken?: string
}): Promise<{ status?: number; error?: string }> {
  const { idTransaction, apiToken = SAFE2PAY_API_KEY } = params

  try {
    const res = await fetch(`${SAFE2PAY_PAYMENT_URL}/payment/${idTransaction}`, {
      headers: { 'x-api-key': apiToken },
    })
    const data = await res.json()

    if (res.ok && !data?.HasError) {
      const out = data?.Output ?? data
      return { status: out?.Status?.Id ?? out?.StatusId }
    }

    return { error: data?.Error || data?.Message || `HTTP ${res.status}` }
  } catch (err: any) {
    return { error: err?.message || 'Network error' }
  }
}

// ─── Cancelar Assinatura ──────────────────────────────────────────────────────

export async function cancelSubscription(params: {
  subscriptionId: string
  apiToken?: string
}): Promise<{ success?: boolean; error?: string }> {
  const { subscriptionId, apiToken = SAFE2PAY_API_KEY } = params

  try {
    const res = await fetch(
      `${SAFE2PAY_RECURRENCE_URL}/subscriptions/${subscriptionId}/disable`,
      {
        method: 'POST',
        headers: s2pHeaders(apiToken),
        body: JSON.stringify({}),
      }
    )

    if (res.ok) return { success: true }

    const data = await res.json()
    return { error: data?.Message || `HTTP ${res.status}` }
  } catch (err: any) {
    return { error: err?.message || 'Network error' }
  }
}
