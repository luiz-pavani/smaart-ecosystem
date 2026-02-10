"use server";

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 1. Captura e Limpeza Total do Token
const SAFE2PAY_TOKEN = (process.env.SAFE2PAY_API_TOKEN || process.env.SAFE2PAY_TOKEN || "").trim();
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function createFederationSubscription(slug: string, method: 'pix' | 'card' | 'boleto', installments: number = 1) {
  try {
    if (!SAFE2PAY_TOKEN) throw new Error("Chave SAFE2PAY_API_TOKEN não configurada na Vercel.");

    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Sessão expirada. Refaça o login.");

    const { data: fed } = await supabaseAdmin.from('entities').select('*').eq('slug', slug).single();
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
    const { data: membership } = await supabaseAdmin.from('entity_memberships').select('*').eq('profile_id', user.id).eq('entity_id', fed.id).single();

    if (!fed || !profile || !membership) throw new Error("Dados incompletos no sistema.");

    const pricing = fed.settings?.pricing;
    const isLrsj = fed.slug === 'lrsj';
    const basePrice = isLrsj ? 2200.00 : (pricing?.base_price || 2200.00);
    const promoPrice = isLrsj ? 1880.00 : (pricing?.promo_price || 1880.00);
    const promoDeadline = isLrsj
      ? new Date('2026-02-01T00:00:00-03:00')
      : (pricing?.promo_deadline ? new Date(pricing.promo_deadline) : new Date());
    const isPromoActive = new Date() < promoDeadline;
    const finalPrice = (method === 'pix' && isPromoActive) ? promoPrice : basePrice;

    const venda = {
      "IsSandbox": false,
      "Application": "ProfepMax",
      "Reference": `FEDERATION:${membership.id}`,
      "Vendor": fed.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      "CallbackUrl": `${SITE_URL}/api/webhooks/safe2pay`,
      "PaymentMethod": method === 'pix' ? "6" : (method === 'card' ? "2" : "1"),
      "Customer": {
        "Name": profile.full_name,
        "Identity": profile.cpf?.replace(/\D/g, '') || "14611593030",
        "Email": user.email,
        "Phone": profile.phone?.replace(/\D/g, '') || "51999999999"
      },
      "Products": [{
          "Code": `GRAD_${fed.slug.toUpperCase()}`,
          "Description": `Inscrição Graduação - ${membership.graduacao_pretendida}`,
          "UnitPrice": finalPrice,
          "Quantity": 1
      }],
      "PaymentObject": method === 'card' ? { "InstallmentQuantity": installments, "IsRecurrent": false } : undefined
    };

    const response = await fetch("https://payment.safe2pay.com.br/v2/payment", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "x-api-key": SAFE2PAY_TOKEN 
      },
      body: JSON.stringify(venda)
    });

    // PROTEÇÃO CONTRA "Unexpected end of JSON":
    const responseText = await response.text();
    
    if (!response.ok) {
        console.error("❌ Resposta de erro do Safe2Pay:", responseText);
        throw new Error(`Erro na API (${response.status}): Verifique seu Token de Produção.`);
    }

    const result = JSON.parse(responseText);

    if (result.HasError) throw new Error(result.Error);

    await supabaseAdmin.from('entity_memberships').update({ 
      last_transaction_id: result.ResponseDetail.IdTransaction.toString(),
      status_pagamento: 'PENDENTE'
    }).eq('id', membership.id);

    return { Success: true, ResponseDetail: result.ResponseDetail };

  } catch (error: any) {
    console.error("💥 Falha no Motor Financeiro:", error.message);
    return { Success: false, Error: error.message };
  }
}