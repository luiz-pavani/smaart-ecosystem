import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      email, name, cpf, phone, paymentMethod, address, card, 
      entitySlug, membershipId, amount, installments, dueDate 
    } = body;

    // Buscar configurações da federação
    const { data: entity } = await supabase
      .from('entities')
      .select('*')
      .eq('slug', entitySlug)
      .single();

    if (!entity) {
      return NextResponse.json({ error: 'Federação não encontrada' }, { status: 404 });
    }

    // URL da API Safe2Pay
    const API_URL = "https://payment.safe2pay.com.br/v2/payment";
    
    // Token específico da federação (cada federação tem sua própria conta Safe2Pay)
    const API_TOKEN = entity.safe2pay_token || process.env.SAFE2PAY_API_TOKEN;

    if (!API_TOKEN) {
      return NextResponse.json({ error: 'Token de pagamento não configurado' }, { status: 500 });
    }

    const safe2payPayload: any = {
      "IsSandbox": false,
      "Application": `FEDERATION_${entity.name.toUpperCase()}`,
      "Vendor": entity.name,
      "CallbackUrl": `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/safe2pay`,
      "ReturnUrl": `${process.env.NEXT_PUBLIC_SITE_URL}/federation/${entitySlug}/candidato`,
      "Reference": `FEDERATION:${membershipId}`,
      "PaymentMethod": paymentMethod,
      "Customer": {
        "Name": name,
        "Identity": cpf.replace(/\D/g, ""),
        "Email": email,
        "Phone": phone.replace(/\D/g, ""),
        "Address": {
          "ZipCode": address?.zipCode || "00000000",
          "Street": address?.street || "Rua",
          "Number": address?.number || "0",
          "District": address?.district || "Centro",
          "CityName": address?.city || "Porto Alegre",
          "StateInitials": address?.state || "RS",
          "CountryName": "Brasil"
        }
      },
      "Products": [{
        "Code": "001",
        "Description": `Taxa de Graduação - ${entity.name}`,
        "UnitPrice": amount,
        "Quantity": 1
      }]
    };

    const addMonths = (date: Date, months: number) => {
      const d = new Date(date);
      d.setMonth(d.getMonth() + months);
      return d;
    };

    const formatDateISO = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const buildBoletoPaymentObject = (due: Date, totalInstallments: number, currentIndex: number) => ({
      "DueDate": formatDateISO(due),
      "Instruction": `Pagamento em ${totalInstallments}x - Parcela ${currentIndex + 1}/${totalInstallments}`,
      "Message": [],
      "Discount": { "Amount": 0, "DueDate": "" },
      "Interest": { "Amount": 0 },
      "Fine": { "Amount": 0 }
    });

    // Adicionar dados do cartão para transações com cartão de crédito
    if (paymentMethod === "2" && card?.cardNumber) {
      const cardHolder = (card.cardHolder || "").trim();
      const month = (card.cardExpiryMonth || "").trim().padStart(2, "0");
      const year = (card.cardExpiryYear || "").trim();
      const expDate = month && year ? `${month}/${year}` : "";
      
      safe2payPayload.PaymentObject = {
        "CardNumber": (card.cardNumber || "").trim(),
        "CardHolder": cardHolder,
        "Holder": cardHolder,
        "CardExpiryMonth": month,
        "CardExpiryYear": year,
        "ExpirationMonth": month,
        "ExpirationYear": year,
        "ExpirationDate": expDate,
        "CardExpiration": expDate,
        "CardCVV": (card.cardCVV || "").trim(),
        "SecurityCode": (card.cardCVV || "").trim(),
        "InstallmentQuantity": installments || 1,
        "IsRecurrent": false
      };
    }

    // Boleto sempre precisa de vencimento
    if (paymentMethod === "1") {
      const firstDue = dueDate ? new Date(dueDate) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      safe2payPayload.PaymentObject = buildBoletoPaymentObject(firstDue, installments || 1, 0);
    }

    // Se for boleto parcelado, gerar 1 boleto por parcela e retornar antes da chamada principal
    if (paymentMethod === "1" && installments && installments > 1) {
      const firstDue = dueDate ? new Date(dueDate) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const perInstallment = Number((amount / installments).toFixed(2));
      const boletos: any[] = [];
      const transactionIds: string[] = [];

      for (let i = 0; i < installments; i += 1) {
        const isLast = i === installments - 1;
        const installmentAmount = isLast
          ? Number((amount - perInstallment * (installments - 1)).toFixed(2))
          : perInstallment;

        const payload = {
          ...safe2payPayload,
          Reference: `FEDERATION:${membershipId}:${i + 1}/${installments}`,
          Products: [{
            "Code": "001",
            "Description": `Taxa de Graduação - ${entity.name} (${i + 1}/${installments})`,
            "UnitPrice": installmentAmount,
            "Quantity": 1
          }],
          PaymentObject: buildBoletoPaymentObject(addMonths(firstDue, i), installments, i)
        };

        const installmentResponse = await axios.post(API_URL, payload, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_TOKEN,
            "User-Agent": "Axios/1.6.0"
          },
          timeout: 15000
        });

        if (installmentResponse.data?.HasError) {
          const errMsg = installmentResponse.data.ErrorMessage || installmentResponse.data.Error || "Erro desconhecido";
          return NextResponse.json({ error: errMsg, detail: installmentResponse.data }, { status: 400 });
        }

        const rd = installmentResponse.data.ResponseDetail || {};
        const slipUrl = rd.BankSlipUrl;
        if (!slipUrl) {
          return NextResponse.json({ error: 'Resposta de boleto inesperada' }, { status: 400 });
        }

        boletos.push({
          bankSlipUrl: slipUrl,
          digitableLine: rd.DigitableLine,
          barcode: rd.Barcode,
          dueDate: rd.DueDate || addMonths(firstDue, i).toISOString(),
          idTransaction: rd.IdTransaction,
          amount: installmentAmount,
          installment: i + 1
        });
        if (rd.IdTransaction) transactionIds.push(rd.IdTransaction);
      }

      if (membershipId) {
        const { data: membershipData } = await supabase
          .from('entity_memberships')
          .select('progresso')
          .eq('id', membershipId)
          .single();
        const existingProgress = membershipData?.progresso || {};
        await supabase
          .from('entity_memberships')
          .update({
            last_transaction_id: transactionIds[0] || null,
            valor_pago: amount,
            status_pagamento: 'PENDENTE',
            progresso: {
              ...existingProgress,
              payment_info: {
                ...(existingProgress?.payment_info || {}),
                method: paymentMethod,
                method_label: 'Boleto',
                installments,
                due_date: dueDate || null,
                amount,
                boletos
              }
            }
          })
          .eq('id', membershipId);
      }

      return NextResponse.json({ boletos });
    }

    console.log(`[FEDERATION CHECKOUT] Iniciando transação para ${entitySlug}...`);
    console.log(`[PAYLOAD]`, JSON.stringify(safe2payPayload, null, 2));

    try {
      const response = await axios.post(API_URL, safe2payPayload, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_TOKEN,
          "User-Agent": "Axios/1.6.0"
        },
        timeout: 15000
      });

      if (!response.data.HasError) {
        console.log(`[SUCESSO] Transação gerada!`);
        console.log(`[RESPOSTA]`, JSON.stringify(response.data, null, 2));

        // Atualizar membership com ID da transação + info de pagamento
        const transactionId = response.data.ResponseDetail?.IdTransaction;
        if (transactionId && membershipId) {
          const { data: membershipData } = await supabase
            .from('entity_memberships')
            .select('progresso')
            .eq('id', membershipId)
            .single();

          const existingProgress = membershipData?.progresso || {};
          const methodLabel = paymentMethod === "1" ? "Boleto" : paymentMethod === "2" ? "Cartão" : paymentMethod === "6" ? "PIX" : String(paymentMethod || '').toUpperCase();

          await supabase
            .from('entity_memberships')
            .update({
              last_transaction_id: transactionId,
              valor_pago: amount,
              status_pagamento: 'PENDENTE',
              progresso: {
                ...existingProgress,
                payment_info: {
                  ...(existingProgress?.payment_info || {}),
                  method: paymentMethod,
                  method_label: methodLabel,
                  installments: installments || 1,
                  due_date: dueDate || null,
                  amount,
                  transaction_id: transactionId
                }
              }
            })
            .eq('id', membershipId);
        }

        // Boleto
        const bankSlipUrl = response.data.ResponseDetail?.BankSlipUrl;
        if (paymentMethod === "1" && bankSlipUrl) {
          const digitableLine = response.data.ResponseDetail?.DigitableLine;
          const barcode = response.data.ResponseDetail?.Barcode;
          const dueDate = response.data.ResponseDetail?.DueDate;
          if (membershipId) {
            const { data: membershipData } = await supabase
              .from('entity_memberships')
              .select('progresso')
              .eq('id', membershipId)
              .single();
            const existingProgress = membershipData?.progresso || {};
            await supabase
              .from('entity_memberships')
              .update({
                progresso: {
                  ...existingProgress,
                  payment_info: {
                    ...(existingProgress?.payment_info || {}),
                    due_date: dueDate || existingProgress?.payment_info?.due_date || null,
                    boleto: { bankSlipUrl, digitableLine, barcode }
                  }
                }
              })
              .eq('id', membershipId);
          }
          const boleto = { bankSlipUrl, digitableLine, barcode, dueDate, idTransaction: transactionId };
          return NextResponse.json({ url: bankSlipUrl, boleto });
        }

        // Cartão
        if (paymentMethod === "2") {
          const rd = response.data.ResponseDetail || {};
          const card = {
            status: rd.Status,
            message: rd.Message || rd.Description,
            idTransaction: rd.IdTransaction,
            authorizationCode: rd.AuthorizationCode,
            tid: rd.Tid,
            token: rd.Token,
            returnCode: rd.CreditCard?.ReturnCode,
            providerMessage: rd.CreditCard?.MessageProvider,
          };
          return NextResponse.json({ card });
        }

        // PIX
        const qrCode = response.data.ResponseDetail?.QrCode;
        const pixKey = response.data.ResponseDetail?.Key;
        if (paymentMethod === "6" && (qrCode || pixKey)) {
          return NextResponse.json({ pix: { qrCode, key: pixKey, idTransaction: transactionId } });
        }

        // URL de pagamento genérica
        const paymentUrl = response.data.ResponseDetail?.PaymentUrl || response.data.PaymentUrl;
        if (paymentUrl) {
          return NextResponse.json({ url: paymentUrl });
        }

        return NextResponse.json({ error: "Resposta de pagamento inesperada" }, { status: 400 });
      } else {
        console.error("[ERRO SAFE2PAY]:", JSON.stringify(response.data, null, 2));
        const errMsg = response.data.ErrorMessage || response.data.Error || "Erro desconhecido";
        return NextResponse.json({ error: errMsg, detail: response.data }, { status: 400 });
      }
    } catch (axiosError: any) {
      console.error(`[ERRO DE CONEXÃO]: ${axiosError.message}`);
      console.error(`[RESPOSTA]:`, axiosError.response?.data);
      const errMsg = axiosError.response?.data?.ErrorMessage || axiosError.response?.data?.Error || axiosError.message;
      return NextResponse.json({ error: `Erro no checkout: ${errMsg}`, detail: axiosError.response?.data }, { status: 502 });
    }
  } catch (error: any) {
    console.error("[ERRO INTERNO]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
