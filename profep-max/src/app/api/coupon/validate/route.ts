import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, paymentMethod } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Cupom não fornecido' }, { status: 400 });
    }

    // Buscar cupom no banco de dados
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('status', 'ACTIVE')
      .single();

    if (error || !coupon) {
      return NextResponse.json({ error: 'Cupom inválido' }, { status: 400 });
    }

    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);

    // Validar período de validade
    if (now < validFrom || now > validUntil) {
      return NextResponse.json({ error: 'Cupom fora do período de validade' }, { status: 400 });
    }

    // Validar limite de usos
    if (coupon.max_uses !== -1 && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ error: 'Cupom expirou (limite de usos atingido)' }, { status: 400 });
    }

    // Validar método de pagamento (se especificado no cupom)
    if (coupon.payment_method && paymentMethod) {
      const allowed = Array.isArray(coupon.payment_method)
        ? coupon.payment_method
        : String(coupon.payment_method).split(',').map((v) => v.trim()).filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(paymentMethod)) {
        const methodNames: Record<string, string> = {
          '1': 'Boleto',
          '2': 'Cartão de Crédito',
          '6': 'Pix'
        };
        const requiredMethod = allowed.map((m: string) => methodNames[m] || m).join(', ');
        return NextResponse.json({ 
          error: `Este cupom é válido apenas para ${requiredMethod}` 
        }, { status: 400 });
      }
    }

    // Retornar dados do cupom (sem incrementar uso aqui - será feito no checkout)
    return NextResponse.json({
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      discount_fixed: coupon.discount_fixed,
      first_month_discount_percent: coupon.first_month_discount_percent,
      first_month_discount_fixed: coupon.first_month_discount_fixed,
      recurring_discount_percent: coupon.recurring_discount_percent,
      recurring_discount_fixed: coupon.recurring_discount_fixed,
      description: coupon.description,
      payment_method: coupon.payment_method
    });

  } catch (error: any) {
    console.error('Erro ao validar cupom:', error);
    return NextResponse.json({ error: 'Erro ao validar cupom' }, { status: 500 });
  }
}
