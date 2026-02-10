import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

function normalizeEmail(email: string) {
	return String(email || "").trim().toLowerCase();
}

function getSupabaseProjectRef(): string {
	const explicit = String(process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || "").trim();
	if (explicit) return explicit;
	const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
	try {
		const host = new URL(url).hostname; // <ref>.supabase.co
		const ref = host.split(".")[0];
		return ref || "";
	} catch {
		return "";
	}
}

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Utilitário para buscar valor atualizado do plano
async function getPlanPrice(plan: string) {
	const { data: configs } = await supabase
		.from('configuracoes')
		.select('chave, valor')
		.eq('chave', `preco_${plan}`);
	const baseConfig = configs?.find(c => c.chave === `preco_${plan}`)?.valor;
	const defaultPrices: any = {
		mensal: 49.90,
		anual: 359.00,
		vitalicio: 997.00
	};
	return parseFloat(baseConfig || `${defaultPrices[plan] || 49.90}`) || defaultPrices[plan] || 49.90;
}

// Utilitário para validar e aplicar cupom
async function applyCoupon(plan: string, paymentMethod: string, coupon: string) {
	let firstMonthPercent = 0, firstMonthFixed = 0, mainPercent = 0, mainFixed = 0;
	let recurringPercent = 0, recurringFixed = 0;
	let cupomAplicado = null;
	if (coupon && coupon.trim()) {
		const { data: couponData, error: couponError } = await supabase
			.from('coupons')
			.select('*')
			.eq('code', coupon.toUpperCase())
			.eq('status', 'ACTIVE')
			.single();
		if (!couponError && couponData) {
			const now = new Date();
			const validFrom = new Date(couponData.valid_from);
			const validUntil = new Date(couponData.valid_until);
			if (now >= validFrom && now <= validUntil) {
				if (couponData.max_uses === -1 || couponData.used_count < couponData.max_uses) {
					if (couponData.payment_method && paymentMethod) {
						const allowed = Array.isArray(couponData.payment_method)
							? couponData.payment_method
							: String(couponData.payment_method).split(',').map((v: string) => v.trim()).filter(Boolean);
						if (allowed.length > 0 && !allowed.includes(paymentMethod)) {
							return { error: `Este cupom é válido apenas para ${allowed.join(', ')}` };
						}
					}
					firstMonthPercent = Number(couponData.first_month_discount_percent) || 0;
					firstMonthFixed = Number(couponData.first_month_discount_fixed) || 0;
					mainPercent = Number(couponData.discount_percent) || 0;
					mainFixed = Number(couponData.discount_fixed) || 0;
					recurringPercent = Number(couponData.recurring_discount_percent) || 0;
					recurringFixed = Number(couponData.recurring_discount_fixed) || 0;
					cupomAplicado = couponData.code;
					// Incrementar contador de uso
					await supabase
						.from('coupons')
						.update({ used_count: couponData.used_count + 1 })
						.eq('id', couponData.id);
				} else {
					return { error: 'Cupom expirou (limite de usos atingido)' };
				}
			} else {
				return { error: 'Cupom fora do período de validade' };
			}
		} else {
			return { error: 'Cupom inválido' };
		}
	}
	return {
		firstMonthPercent,
		firstMonthFixed,
		mainPercent,
		mainFixed,
		recurringPercent,
		recurringFixed,
		cupomAplicado
	};
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { plan, email, name, cpf, phone, paymentMethod, address, dueDate, card, coupon } = body;
		const normalizedEmail = normalizeEmail(email);

		// Persistir dados do checkout no perfil (para preencher /perfil)
		if (normalizedEmail) {
			try {
				const { data: existing } = await supabase
					.from('profiles')
					.select('id, metadata')
					.ilike('email', normalizedEmail)
					.maybeSingle();

				const nextMetadata = {
					...((existing as any)?.metadata || {}),
					cep: address?.zipCode || (existing as any)?.metadata?.cep || '',
					logradouro: address?.street || (existing as any)?.metadata?.logradouro || '',
					bairro: address?.district || (existing as any)?.metadata?.bairro || '',
					cidade: address?.city || (existing as any)?.metadata?.cidade || '',
					uf: address?.state || (existing as any)?.metadata?.uf || '',
					numero: address?.number || (existing as any)?.metadata?.numero || '',
				};

				await supabase
					.from('profiles')
					.update({
						email: normalizedEmail,
						full_name: String(name || '').trim() || undefined,
						cpf: String(cpf || ''),
						phone: String(phone || ''),
						metadata: nextMetadata,
						updated_at: new Date().toISOString(),
					} as any)
					.ilike('email', normalizedEmail);
			} catch (err) {
				console.warn('[CHECKOUT] Falha ao persistir dados no perfil:', err);
			}
		}
		// 1. Buscar valor atualizado do plano
		let valorBase = await getPlanPrice(plan);
		let valorFinal = valorBase;
		// 2. Validar e aplicar cupom
		const cupomResult = await applyCoupon(plan, paymentMethod, coupon);
		if (cupomResult.error) {
			return NextResponse.json({ error: cupomResult.error }, { status: 400 });
		}
		// 3. Aplicar desconto do cupom (1º mês ou principal) OU desconto automático de 20% no cartão para mensal (mas nunca ambos)
		if (plan === 'mensal') {
			if (cupomResult.firstMonthPercent || cupomResult.firstMonthFixed) {
				if (cupomResult.firstMonthPercent) {
					valorFinal = valorBase * (1 - cupomResult.firstMonthPercent / 100);
				} else if (cupomResult.firstMonthFixed) {
					valorFinal = Number(cupomResult.firstMonthFixed);
				}
			} else if (cupomResult.mainPercent || cupomResult.mainFixed) {
				if (cupomResult.mainPercent) {
					valorFinal = valorBase * (1 - cupomResult.mainPercent / 100);
				} else if (cupomResult.mainFixed) {
					valorFinal = Number(cupomResult.mainFixed);
				}
			} else if (paymentMethod === "2") {
				// Só aplica o desconto automático de 20% se NÃO houver cupom
				valorFinal = valorBase * 0.8;
			}
		} else {
			if (cupomResult.mainPercent) {
				valorFinal = valorBase * (1 - cupomResult.mainPercent / 100);
			} else if (cupomResult.mainFixed) {
				valorFinal = Number(cupomResult.mainFixed);
			}
		}
		if (valorFinal <= 0) valorFinal = 1;
		// 4. Preparar payload Safe2Pay
		const API_URL = "https://payment.safe2pay.com.br/v2/payment";
		const isRecurrent = plan === 'mensal' || plan === 'anual';
		const planNames: any = {
			mensal: 'MENSAL',
			anual: 'ANUAL',
			vitalicio: 'VITALÍCIO'
		};
		let valorRecorrente = valorBase;
		if (plan === 'mensal') {
			if (cupomResult.recurringPercent || cupomResult.recurringFixed) {
				if (cupomResult.recurringPercent) {
					valorRecorrente = valorBase * (1 - cupomResult.recurringPercent / 100);
				} else if (cupomResult.recurringFixed) {
					valorRecorrente = Number(cupomResult.recurringFixed);
				}
			} else if (paymentMethod === "2" && !(cupomResult.firstMonthPercent || cupomResult.firstMonthFixed || cupomResult.mainPercent || cupomResult.mainFixed)) {
				// Só aplica o desconto automático de 20% na recorrência se NÃO houver cupom
				valorRecorrente = valorBase * 0.8;
			}
		}
		const safe2payPayload: any = {
			"IsSandbox": false,
			"Application": "PROFEPMAX",
			"Vendor": "PROFEPMAX EDUCAÇÃO",
			"CallbackUrl": (() => {
				const ref = getSupabaseProjectRef();
				if (!ref) throw new Error('Supabase project ref ausente (defina NEXT_PUBLIC_SUPABASE_PROJECT_ID ou NEXT_PUBLIC_SUPABASE_URL)');
				return `https://${ref}.supabase.co/functions/v1/safe2pay-webhook`;
			})(),
			"ReturnUrl": `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/sucesso`,
			"Reference": normalizedEmail ? `SUBSCRIPTION:${plan}:${normalizedEmail}` : plan,
			"IsRecurrent": isRecurrent,
			"PaymentMethod": paymentMethod || "6",
			"Customer": {
				"Name": name,
				"Identity": cpf?.replace(/\D/g, "") || "",
				"Email": normalizedEmail || email,
				"Phone": phone?.replace(/\D/g, "") || "",
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
				"Description": `PROFEPMAX - PLANO ${planNames[plan] || plan.toUpperCase()}`,
				"UnitPrice": valorFinal,
				"Quantity": 1
			}],
		};
		// Adicionar recorrência para mensal/anual
		if (isRecurrent) {
			safe2payPayload["Recurrent"] = {
				"Interval": plan === 'mensal' ? "Monthly" : "Yearly",
				"Value": valorRecorrente
			};
		}
		// Adicionar PaymentObject para Boleto
		if (paymentMethod === "1" && dueDate) {
			safe2payPayload.PaymentObject = {
				"DueDate": new Date(dueDate).toLocaleDateString('pt-BR'),
				"Instruction": "Válido até a data de vencimento",
				"Message": [],
				"IsRecurrent": isRecurrent
			};
		}
		// Adicionar dados do cartão
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
				"IsRecurrent": isRecurrent
			};
		}
		// 5. Chamar Safe2Pay
		try {
			       // LOG: Payload enviado para Safe2Pay
			       console.log('[CHECKOUT] Payload enviado para Safe2Pay:', JSON.stringify(safe2payPayload));
			       const response = await axios.post(API_URL, safe2payPayload, {
				       headers: {
					       "Content-Type": "application/json",
					       "x-api-key": process.env.SAFE2PAY_API_TOKEN || process.env.SAFE2PAY_TOKEN || "",
					       "User-Agent": "Axios/1.6.0"
				       },
				       timeout: 15000
			       });
			   if (!response.data.HasError) {
				const paymentUrl = response.data.ResponseDetail?.PaymentUrl || response.data.PaymentUrl;
				const bankSlipUrl = response.data.ResponseDetail?.BankSlipUrl;
				const idSubscription = response.data.ResponseDetail?.IdSubscription; // Capturar IdSubscription para recorrências
				
				// Se é recorrente, armazenar o IdSubscription no perfil para rastreamento
				if (isRecurrent && idSubscription && normalizedEmail) {
					try {
						await supabase
							.from('profiles')
							.update({ id_subscription: idSubscription.toString() })
							.eq('email', normalizedEmail);
						console.log(`✅ IdSubscription ${idSubscription} armazenado para ${normalizedEmail}`);
					} catch (err) {
						console.error(`❌ Erro ao armazenar IdSubscription:`, err);
					}
				}
				
				if (paymentUrl) {
					return NextResponse.json({ url: paymentUrl, cupom: cupomResult.cupomAplicado, idSubscription: isRecurrent ? idSubscription : undefined });
				}
				if (safe2payPayload.PaymentMethod === "1" && bankSlipUrl) {
					const digitableLine = response.data.ResponseDetail?.DigitableLine;
					const barcode = response.data.ResponseDetail?.Barcode;
					const dueDate = response.data.ResponseDetail?.DueDate;
					const idTransaction = response.data.ResponseDetail?.IdTransaction;
					const boleto = { bankSlipUrl, digitableLine, barcode, dueDate, idTransaction };
					return NextResponse.json({ url: bankSlipUrl, boleto, cupom: cupomResult.cupomAplicado, idSubscription: isRecurrent ? idSubscription : undefined });
				}
				if (safe2payPayload.PaymentMethod === "2") {
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
					return NextResponse.json({ card, cupom: cupomResult.cupomAplicado, idSubscription: isRecurrent ? idSubscription : undefined });
				}
				const qrCode = response.data.ResponseDetail?.QrCode;
				const pixKey = response.data.ResponseDetail?.Key;
				const idTransaction = response.data.ResponseDetail?.IdTransaction;
				if (safe2payPayload.PaymentMethod === "6" && (qrCode || pixKey)) {
					return NextResponse.json({ pix: { qrCode, key: pixKey, idTransaction }, cupom: cupomResult.cupomAplicado, idSubscription: isRecurrent ? idSubscription : undefined });
				}
				return NextResponse.json({ error: "Resposta de pagamento inesperada" }, { status: 400 });
				       } else {
					       // LOG: Resposta de erro da Safe2Pay
					       console.error('[CHECKOUT] Erro Safe2Pay:', JSON.stringify(response.data));
					       // Extrai mensagem detalhada do erro do cartão, se existir
					       let errMsg = response.data.ErrorMessage || response.data.Error || "Erro desconhecido";
					       const detail = response.data.ResponseDetail;
					       if (detail) {
						       if (detail.MessageProvider) {
							       errMsg = detail.MessageProvider;
						       } else if (detail.Message) {
							       errMsg = detail.Message;
						       } else if (detail.Description) {
							       errMsg = detail.Description;
						       }
					       }
					       return NextResponse.json({ error: errMsg, detail: response.data }, { status: 400 });
				       }
		} catch (axiosError: any) {
			       // LOG: Erro de requisição para Safe2Pay
			       console.error('[CHECKOUT] Erro na requisição para Safe2Pay:', JSON.stringify({
				       error: axiosError.message,
				       response: axiosError.response?.data,
				       payload: safe2payPayload
			       }));
			       const errMsg = axiosError.response?.data?.ErrorMessage || axiosError.response?.data?.Error || axiosError.message;
			       return NextResponse.json({ error: `Erro no checkout: ${errMsg}`, detail: axiosError.response?.data }, { status: 502 });
		}
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}