#!/usr/bin/env ts-node
/// <reference types="node" />
/**
 * Script de Setup - Criar Planos de Recorrência no Safe2Pay
 * Execute apenas UMA VEZ para criar os planos Mensal, Anual e Vitalício
 * 
 * Uso:
 *   npx ts-node scripts/setup-safe2pay-plans.ts
 * 
 * Depois de executar, armazene os IDs retornados nas variáveis de ambiente:
 *   SAFE2PAY_PLAN_ID_MENSAL=xxx
 *   SAFE2PAY_PLAN_ID_ANUAL=xxx
 *   SAFE2PAY_PLAN_ID_VITALICIO=xxx
 */

import dotenv from 'dotenv';
import { createPlan } from '../src/lib/safe2pay-recurrence';

dotenv.config({ path: '.env.local' });

const SAFE2PAY_TOKEN = process.env.SAFE2PAY_API_TOKEN || process.env.SAFE2PAY_TOKEN;
const WEBHOOK_URL = process.env.NEXT_PUBLIC_SITE_URL 
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/safe2pay`
  : 'https://profepmax.com.br/api/webhooks/safe2pay';

if (!SAFE2PAY_TOKEN) {
  console.error('❌ SAFE2PAY_TOKEN não encontrado no .env.local');
  process.exit(1);
}

interface PlanConfig {
  name: string;
  description: string;
  amount: number;
  frequency: number; // 1=Mensal, 2=Anual
  chargeDay: number;
  billingCycle: number | null; // null=infinito
  isImmediateCharge: boolean;
}

const PLANS: PlanConfig[] = [
  {
    name: 'Profep Max - Plano Mensal',
    description: 'Assinatura mensal com acesso completo à plataforma de preparação física',
    amount: 49.90,
    frequency: 1, // Mensal
    chargeDay: 1, // Cobra no dia 1 de cada mês
    billingCycle: null, // Infinito
    isImmediateCharge: true,
  },
  {
    name: 'Profep Max - Plano Anual',
    description: 'Assinatura anual com acesso completo à plataforma de preparação física',
    amount: 359.00,
    frequency: 2, // Anual
    chargeDay: 1,
    billingCycle: null, // Infinito
    isImmediateCharge: true,
  },
  {
    name: 'Profep Max - Plano Vitalício',
    description: 'Pagamento único com acesso vitalício à plataforma',
    amount: 997.00,
    frequency: 1, // Mensal (mas com 1 ciclo apenas)
    chargeDay: 1,
    billingCycle: 1, // Apenas 1 cobrança
    isImmediateCharge: true,
  },
];

// ✅ Use library function instead of calling API directly
async function createPlanWithLibrary(planConfig: PlanConfig): Promise<string | null> {
  try {
    console.log(`\n🔄 Criando plano: ${planConfig.name}...`);
    console.log(`   Valor: R$ ${planConfig.amount.toFixed(2)}`);
    console.log(`   Frequência: ${planConfig.frequency === 1 ? 'Mensal' : planConfig.frequency === 2 ? 'Anual' : 'Outro'}`);
    console.log(`   Ciclos: ${planConfig.billingCycle || 'Infinito'}`);
    console.log(`   Webhook: ${WEBHOOK_URL}`);

    const result = await createPlan({
      name: planConfig.name,
      amount: planConfig.amount,
      frequency: planConfig.frequency,
      chargeDay: planConfig.chargeDay,
      billingCycle: planConfig.billingCycle || undefined,
      isImmediateCharge: planConfig.isImmediateCharge,
      description: planConfig.description,
      webhookUrl: WEBHOOK_URL, // ✅ Now includes webhook URL
      apiToken: SAFE2PAY_TOKEN,
    });

    if (result.planId) {
      console.log(`✅ Plano criado com sucesso!`);
      console.log(`   Plan ID: ${result.planId}`);
      console.log(`   🔗 Webhook registrado!`);
      return result.planId;
    } else {
      console.error(`❌ Erro:`, result.error);
      return null;
    }
  } catch (error: any) {
    console.error(`❌ Erro ao criar plano:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Safe2Pay - Setup de Planos de Recorrência');
  console.log('============================================\n');
  console.log(`🌐 Webhook URL: ${WEBHOOK_URL}`);
  const tokenPreview = SAFE2PAY_TOKEN ? `${SAFE2PAY_TOKEN.substring(0, 20)}...` : 'N/A';
  console.log(`🔑 Token: ${tokenPreview}`);

  const results: { [key: string]: string | null } = {};

  // Criar plano mensal
  results.mensal = await createPlanWithLibrary(PLANS[0]);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s entre requests

  // Criar plano anual
  results.anual = await createPlanWithLibrary(PLANS[1]);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Criar plano vitalício
  results.vitalicio = await createPlanWithLibrary(PLANS[2]);

  console.log('\n\n📋 RESUMO DOS PLANOS CRIADOS');
  console.log('============================\n');

  if (results.mensal) {
    console.log(`✅ Plano Mensal:    ${results.mensal}`);
  } else {
    console.log(`❌ Plano Mensal:    FALHOU`);
  }

  if (results.anual) {
    console.log(`✅ Plano Anual:     ${results.anual}`);
  } else {
    console.log(`❌ Plano Anual:     FALHOU`);
  }

  if (results.vitalicio) {
    console.log(`✅ Plano Vitalício: ${results.vitalicio}`);
  } else {
    console.log(`❌ Plano Vitalício: FALHOU`);
  }

  console.log('\n\n🔧 PRÓXIMO PASSO: Adicione estes IDs ao .env.local:');
  console.log('====================================================\n');
  
  if (results.mensal) {
    console.log(`SAFE2PAY_PLAN_ID_MENSAL=${results.mensal}`);
  }
  if (results.anual) {
    console.log(`SAFE2PAY_PLAN_ID_ANUAL=${results.anual}`);
  }
  if (results.vitalicio) {
    console.log(`SAFE2PAY_PLAN_ID_VITALICIO=${results.vitalicio}`);
  }

  console.log('\n✅ Setup concluído!');
}

main().catch(console.error);
