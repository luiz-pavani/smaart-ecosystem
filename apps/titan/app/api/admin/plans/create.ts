import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPlan } from '@/lib/safe2pay';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { erro: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { erro: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Check if user is admin (has academy_admin role)
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'academy_admin')
      .single();

    if (!userRole) {
      return NextResponse.json(
        { erro: 'Only academy admins can create plans' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const {
      name,
      amount,
      frequency, // 1=mensal, 2=trimestral, 3=semestral, 4=anual
      chargeDay,
      billingCycle,
      isImmediateCharge = true,
      description,
      federacao_id, // Required: safe2pay credentials stored here
    } = body;

    // 4. Validate required fields
    if (!name || amount === undefined || !frequency || !federacao_id) {
      return NextResponse.json(
        { erro: 'Missing required fields: name, amount, frequency, federacao_id' },
        { status: 400 }
      );
    }

    // 5. Fetch Safe2Pay credentials from federacao
    const { data: federacao, error: fedError } = await supabase
      .from('federacoes')
      .select('safe2pay_api_token')
      .eq('federacao_id', federacao_id)
      .single();

    if (fedError || !federacao?.safe2pay_api_token) {
      return NextResponse.json(
        { erro: 'Safe2Pay credentials not configured for this federation' },
        { status: 400 }
      );
    }

    // 6. Build webhook URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://titan.smaartpro.com';
    const webhookUrl = `${siteUrl}/api/webhooks/safe2pay`;

    // 7. Call Safe2Pay API to create plan
    const result = await createPlan({
      name,
      amount: parseFloat(String(amount)),
      frequency: parseInt(String(frequency)) as 1 | 2 | 3 | 4,
      chargeDay: chargeDay ? parseInt(String(chargeDay)) : 10,
      billingCycle: billingCycle ? parseInt(String(billingCycle)) : undefined,
      isImmediateCharge,
      description: description || name,
      webhookUrl, // ✅ NOVO: Register webhook at plan creation
      apiToken: federacao.safe2pay_api_token,
    });

    if (result.error) {
      console.error('[PLAN_CREATE] Erro Safe2Pay:', result.error);
      return NextResponse.json(
        { erro: `Falha ao criar plano: ${result.error}` },
        { status: 400 }
      );
    }

    // 8. Success response
    return NextResponse.json(
      {
        sucesso: true,
        planId: result.planId,
        nome: name,
        valor: amount,
        frequencia: frequency,
        webhookUrl,
        mensagem: '✅ Plano criado com sucesso no Safe2Pay com webhook registrado',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[PLAN_CREATE] Erro:', error);
    return NextResponse.json(
      { erro: 'Internal server error' },
      { status: 500 }
    );
  }
}
