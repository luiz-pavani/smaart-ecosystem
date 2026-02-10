"use server";

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cria a transação de exame na Safe2Pay com precificação dinâmica.
 * @param entitySlug Slug da federação (ex: 'lrsj')
 * @param paymentMethod 'pix' ou 'card'
 * @param installments Número de parcelas (1 a 12)
 */
export async function createFederationSubscription(
  entitySlug: string, 
  paymentMethod: 'pix' | 'card',
  installments: number = 1
) {
  const cookieStore = await cookies(); // Ajuste para Next.js 15/16
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Seguro ignorar se chamado de Server Components
          }
        },
      },
    }
  );

  // 1. Validar Sessão do Usuário
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  // 2. Buscar Dados da Federação e Configurações de Preço
  const { data: entity, error: entError } = await supabase
    .from('entities')
    .select('*')
    .eq('slug', entitySlug)
    .single();

  if (entError || !entity) throw new Error("Federação não encontrada.");

  // 3. Lógica de Precificação Dinâmica (Check Profep MAX)
  // Verificamos se o perfil global do usuário está como ATIVO
  const { data: profile } = await supabase
    .from('profiles')
    .select('cond, full_name, email, cpf')
    .eq('id', user.id)
    .single();

  const isProfepActive = profile?.cond === 'ATIVO';
  
  // Define o preço com base no status do Profep MAX
  const totalAmount = isProfepActive 
    ? (entity.preco_exame_profep_discount || 380.00) 
    : (entity.preco_exame_completo || 450.00);

  // 4. Integração com Safe2Pay
  // O token da federação específica é usado para que o dinheiro caia na conta certa
  const s2pToken = entity.safe2pay_token;
  if (!s2pToken) throw new Error("Configuração de pagamento da federação incompleta.");

  const payload = {
    IsPreAuthorization: false,
    PaymentMethod: paymentMethod === 'pix' ? "6" : "1", // 6=Pix, 1=Cartão
    Customer: {
      Name: profile?.full_name || user.user_metadata.full_name,
      Identity: profile?.cpf || user.user_metadata.cpf,
      Email: profile?.email || user.email
    },
    Products: [
      {
        Code: "EXAME_COMPLETO",
        Description: `Processo de Exame de Graus - ${entity.name}`,
        UnitPrice: totalAmount,
        Quantity: 1
      }
    ],
    // Lógica de Parcelamento para Cartão
    PaymentObject: paymentMethod === 'card' ? {
      InstallmentQuantity: installments,
      Holder: profile?.full_name,
      CardNumber: "0000000000000000", // Isso é preenchido pelo Checkout da S2P ou iFrame
      ExpirationDate: "12/2030",
      SecurityCode: "000"
    } : {}
  };

  try {
    // Chamada fictícia para a API (Substitua pela URL real da Safe2Pay)
    const response = await fetch("https://payment.safe2pay.com.br/v2/payment", {
      method: "POST",
      headers: {
        "x-api-key": s2pToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.Success) {
      // 5. Registrar Transação no Membership do Aluno
      await supabase
        .from('entity_memberships')
        .update({
          status_pagamento: 'Processando',
          last_transaction_id: result.ResponseDetail.IdTransaction,
          valor_pago: totalAmount
        })
        .eq('profile_id', user.id)
        .eq('entity_id', entity.id);
    }

    return result;
  } catch (error) {
    console.error("Erro Safe2Pay:", error);
    return { Success: false, Error: "Falha na comunicação com o processador." };
  }
}