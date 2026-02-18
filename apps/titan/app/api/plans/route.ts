import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface CreatePlanRequest {
  federationId: string;
  academyId?: string;
  planScope: 'federation' | 'academy';
  name: string;
  description?: string;
  price: number;
  frequency: number;
  maxAthletes?: number;
  maxAcademies?: number;
  trialDays?: number;
  discountType?: string;
  discountValue?: number;
  features?: string[];
  isFeatured?: boolean;
}

// Safe2Pay API token from environment
const SAFE2PAY_TOKEN = process.env.SAFE2PAY_TOKEN as string;
const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL || 'https://titan.smaartpro.com'}/api/webhooks/safe2pay`;

async function createSafe2PayPlan(planData: CreatePlanRequest) {
  const frequencyMap: Record<number, 'M' | 'W' | 'BW' | 'Q'> = {
    1: 'M',  // Monthly
    2: 'W',  // Weekly
    3: 'BW', // Biweekly
    4: 'Q',  // Quarterly
  };

  const response = await fetch('https://api.safe2pay.com.br/Recorrencia/Assinatura', {
    method: 'POST',
    headers: {
      'x-api-key': SAFE2PAY_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Nome: planData.name,
      Descricao: planData.description || planData.name,
      Valor: parseFloat(planData.price.toFixed(2)),
      Frequencia: frequencyMap[planData.frequency] || 'M',
      DiasAntecipacao: 0,
      CobrarAntecipado: true,
      PercentualTaxaAdministrativa: 0,
      UrlNotificacao: WEBHOOK_URL,
      DiasProrrogacao: 0,
      MaxProrrogacoes: 0,
      PermitirAlteracaoValor: false,
      PermitirAlteracaoFrequencia: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Safe2Pay API error: ${error.Mensagem || error.message || 'Unknown error'}`);
  }

  const data = await response.json();
  if (!data.Retorno?.ID) {
    throw new Error('Failed to create Safe2Pay plan: No ID returned');
  }

  return data.Retorno.ID;
}

async function checkFederationAdmin(userId: string, federationId: string) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: federation } = await supabase
    .from('federacoes')
    .select('admin_id')
    .eq('id', federationId)
    .single();

  if (!federation || federation.admin_id !== userId) {
    throw new Error('Not authorized to create plans for this federation');
  }
}

async function checkAcademyAdmin(userId: string, academyId: string) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: academy } = await supabase
    .from('academias')
    .select('admin_id')
    .eq('id', academyId)
    .single();

  if (!academy || academy.admin_id !== userId) {
    throw new Error('Not authorized to create plans for this academy');
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreatePlanRequest = await req.json();

    // Validate required fields
    if (!body.name || !body.federationId || body.price === undefined || !body.planScope) {
      return NextResponse.json(
        { message: 'Missing required fields: name, federationId, price, planScope' },
        { status: 400 }
      );
    }

    // Verify authorization based on plan scope
    if (body.planScope === 'federation') {
      await checkFederationAdmin(user.id, body.federationId);
    } else if (body.planScope === 'academy') {
      if (!body.academyId) {
        return NextResponse.json(
          { message: 'Academy ID required for academy-scoped plans' },
          { status: 400 }
        );
      }
      await checkAcademyAdmin(user.id, body.academyId);
    }

    // Create Safe2Pay plan
    const safe2payPlanId = await createSafe2PayPlan(body);

    // Store in database
    const { data: planData, error: insertError } = await supabase
      .from('plans')
      .insert({
        federation_id: body.federationId,
        academy_id: body.planScope === 'academy' ? body.academyId : null,
        plan_scope: body.planScope,
        safe2pay_plan_id: safe2payPlanId,
        name: body.name,
        description: body.description,
        price: body.price,
        frequency: body.frequency,
        max_athletes: body.maxAthletes || null,
        max_academies: body.maxAcademies || null,
        trial_days: body.trialDays || 0,
        discount_type: body.discountType || null,
        discount_value: body.discountValue || null,
        features: body.features ? { features: body.features } : {},
        is_featured: body.isFeatured || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database error: ${insertError.message}`);
    }

    return NextResponse.json({
      id: planData.id,
      name: planData.name,
      price: planData.price,
      safe2payId: planData.safe2pay_plan_id,
      message: 'Plan created successfully',
    });
  } catch (error) {
    console.error('Plan creation error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to create plan' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const federationId = searchParams.get('federationId');
    const academyId = searchParams.get('academyId');
    const onlyActive = searchParams.get('onlyActive') !== 'false';

    let query = supabase.from('plans').select('*');

    // Filter by federation or academy
    if (federationId) {
      query = query.eq('federation_id', federationId);
    }

    if (academyId) {
      query = query.eq('academy_id', academyId);
    }

    // Filter active plans by default
    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    // Sort by featured and sort_order
    query = query.order('is_featured', { ascending: false }).order('sort_order', { ascending: true });

    const { data: plans, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Plan retrieval error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to retrieve plans' },
      { status: 500 }
    );
  }
}
