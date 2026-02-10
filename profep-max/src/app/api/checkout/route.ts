import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import {
	tokenizeCard,
	createSubscription,
	getPlanId,
} from "@/lib/safe2pay-recurrence";

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

		// 4. Buscar Plan ID da API de Recorrência Safe2Pay
		const planId = getPlanId(plan);
		if (!planId) {
			console.error(`[CHECKOUT] Plan ID não encontrado para plano: ${plan}`);
			return NextResponse.json(
				{ error: `Plano não configurado. Entre em contato com o suporte.` },
				{ status: 500 }
			);
		}

		console.log(`[CHECKOUT] Plan ID: ${planId} | Plan: ${plan} | Email: ${normalizedEmail}`);

		const normalizedPaymentMethod = paymentMethod === "2" ? "2" : paymentMethod === "6" ? "6" : "1";
		const subscriptionReference = normalizedEmail
			? `SUBSCRIPTION:${plan}:${normalizedEmail}`
			: `SUBSCRIPTION:${plan}`;

		// 5. Tokenizar cartão (se for pagamento via cartão)
		let cardToken: string | undefined;
		if (normalizedPaymentMethod === "2" && card?.cardNumber) {
			console.log('[CHECKOUT] Tokenizando cartão...');
			const tokenResult = await tokenizeCard({
				cardNumber: card.cardNumber,
				cardHolder: card.cardHolder || name,
				cardExpiryMonth: card.cardExpiryMonth,
				cardExpiryYear: card.cardExpiryYear,
				cardCVV: card.cardCVV,
				apiToken: process.env.SAFE2PAY_API_TOKEN || process.env.SAFE2PAY_TOKEN || '',
			});

			if (!tokenResult || !tokenResult.token) {
				console.error('[CHECKOUT] Falha ao tokenizar cartão');
				return NextResponse.json(
					{ error: 'Falha ao processar dados do cartão. Verifique as informações.' },
					{ status: 400 }
				);
			}

			cardToken = tokenResult.token;
			console.log(`[CHECKOUT] Cartão tokenizado: ${cardToken} | Bandeira: ${tokenResult.brand || 'N/A'}`);
		}

		// 6. Criar assinatura na API de Recorrência Safe2Pay
		console.log('[CHECKOUT] Criando assinatura...');
		const subscriptionResult = await createSubscription({
			planId,
			paymentMethod: normalizedPaymentMethod, // 1=Boleto, 2=Cartao, 6=Pix
			reference: subscriptionReference,
			customerEmails: [normalizedEmail || email],
			customerName: String(name || '').trim() || undefined,
			customerIdentity: cpf?.replace(/\D/g, "") || undefined,
			customerPhone: phone?.replace(/\D/g, "") || undefined,
			customerAddress: {
				ZipCode: address?.zipCode || undefined,
				Street: address?.street || undefined,
				Number: address?.number || undefined,
				District: address?.district || undefined,
				CityName: address?.city || undefined,
				StateInitials: address?.state || undefined,
				CountryName: "Brasil",
			},
			cardToken: normalizedPaymentMethod === "2" ? cardToken : undefined,
			vendor: 'PROFEPMAX EDUCAÇÃO',
			apiToken: process.env.SAFE2PAY_API_TOKEN || process.env.SAFE2PAY_TOKEN || '',
		});

		if (subscriptionResult.error || !subscriptionResult.subscriptionId) {
			console.error('[CHECKOUT] Erro ao criar assinatura:', subscriptionResult.error);
			return NextResponse.json(
				{ error: subscriptionResult.error || 'Falha ao criar assinatura' },
				{ status: 400 }
			);
		}

		console.log(`[CHECKOUT] ✅ Assinatura criada: ${subscriptionResult.subscriptionId}`);

		// 7. Armazenar subscription_id no perfil para rastreamento futuro
		if (normalizedEmail && subscriptionResult.subscriptionId) {
			try {
				await supabase
					.from('profiles')
					.update({
						id_subscription: subscriptionResult.subscriptionId,
						updated_at: new Date().toISOString(),
					})
					.ilike('email', normalizedEmail);

				console.log(`✅ Subscription ID ${subscriptionResult.subscriptionId} armazenado para ${normalizedEmail}`);
			} catch (err) {
				console.error('❌ Erro ao armazenar Subscription ID:', err);
			}
		}

		// 8. Retornar resposta de sucesso
		return NextResponse.json({
			subscriptionId: subscriptionResult.subscriptionId,
			paymentUrl: subscriptionResult.paymentUrl, // Para boleto/pix pode ter URL de pagamento
			url: subscriptionResult.paymentUrl,
			cupom: cupomResult.cupomAplicado,
			message: 'Assinatura criada com sucesso!',
		});
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}