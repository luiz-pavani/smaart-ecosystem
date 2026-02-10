#!/usr/bin/env node

/**
 * Script de Testes - Webhook Recorrência Safe2Pay em PRODUÇÃO
 * 
 * Simula os seguintes eventos:
 * 1. SubscriptionCreated - Primeira cobrança confirmada
 * 2. SubscriptionRenewed - Renovação automática (ciclo 2)
 * 3. SubscriptionFailed - Falha na cobrança
 * 4. SubscriptionCanceled - Cancelamento de assinatura
 */

const axios = require('axios');

const WEBHOOK_URL = 'https://www.profepmax.com.br/api/webhooks/safe2pay';
const TEST_EMAIL = 'teste-recorrencia-' + Date.now() + '@example.com';
const TEST_SUBSCRIPTION_ID = 'SUB_PROD_' + Date.now();

console.log('🔧 TESTES DE RECORRÊNCIA SAFE2PAY - PRODUÇÃO');
console.log('==========================================');
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log(`Email de teste: ${TEST_EMAIL}`);
console.log(`IdSubscription: ${TEST_SUBSCRIPTION_ID}`);
console.log('');

/**
 * 1. SUBSCRIPTION CREATED - Primeira cobrança confirmada
 */
async function testSubscriptionCreated() {
  console.log('\n📝 Teste 1: SubscriptionCreated (Primeira cobrança)');
  
  const payload = {
    EventType: 'SubscriptionCreated',
    Status: 'Success',
    IdSubscription: TEST_SUBSCRIPTION_ID,
    IdTransaction: 'TRX_' + Date.now() + '_1',
    Email: TEST_EMAIL,
    Amount: 9900,
    DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Installments: 1,
    InstallmentValue: 9900,
    Timestamp: new Date().toISOString()
  };

  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Sucesso! Status: ${response.status}`);
    console.log(`   IdSubscription: ${TEST_SUBSCRIPTION_ID}`);
    console.log(`   Email: ${TEST_EMAIL}`);
    return true;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * 2. SUBSCRIPTION RENEWED - Renovação automática (ciclo 2)
 */
async function testSubscriptionRenewed() {
  console.log('\n📝 Teste 2: SubscriptionRenewed (Ciclo 2)');
  
  const payload = {
    EventType: 'SubscriptionRenewed',
    Status: 'Success',
    IdSubscription: TEST_SUBSCRIPTION_ID,
    IdTransaction: 'TRX_' + Date.now() + '_2',
    Email: TEST_EMAIL,
    Amount: 9900,
    DueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Installments: 1,
    InstallmentValue: 9900,
    Timestamp: new Date().toISOString()
  };

  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Sucesso! Status: ${response.status}`);
    console.log(`   IdSubscription: ${TEST_SUBSCRIPTION_ID}`);
    console.log(`   Ciclo: 2`);
    return true;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * 3. SUBSCRIPTION FAILED - Falha na cobrança
 */
async function testSubscriptionFailed() {
  console.log('\n📝 Teste 3: SubscriptionFailed (Falha na cobrança)');
  
  const payload = {
    EventType: 'SubscriptionFailed',
    Status: 'Failed',
    IdSubscription: TEST_SUBSCRIPTION_ID,
    IdTransaction: 'TRX_' + Date.now() + '_3',
    Email: TEST_EMAIL,
    Amount: 9900,
    FailureReason: 'Cartão recusado pelo banco',
    DueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Timestamp: new Date().toISOString()
  };

  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Sucesso! Status: ${response.status}`);
    console.log(`   IdSubscription: ${TEST_SUBSCRIPTION_ID}`);
    console.log(`   Status: Falha`);
    return true;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * 4. SUBSCRIPTION CANCELED - Cancelamento de assinatura
 */
async function testSubscriptionCanceled() {
  console.log('\n📝 Teste 4: SubscriptionCanceled (Cancelamento)');
  
  const payload = {
    EventType: 'SubscriptionCanceled',
    Status: 'Canceled',
    IdSubscription: TEST_SUBSCRIPTION_ID,
    Email: TEST_EMAIL,
    CancellationReason: 'Cancelado pelo usuário',
    Timestamp: new Date().toISOString()
  };

  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Sucesso! Status: ${response.status}`);
    console.log(`   IdSubscription: ${TEST_SUBSCRIPTION_ID}`);
    console.log(`   Status: Cancelado`);
    return true;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
  const results = [];
  
  results.push(await testSubscriptionCreated());
  await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s entre testes
  
  results.push(await testSubscriptionRenewed());
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.push(await testSubscriptionFailed());
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.push(await testSubscriptionCanceled());

  // Resumo
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(45));
  if (passed === total) {
    console.log(`✅ ${passed}/${total} testes passaram! 🎉`);
    console.log('\nPróximos passos:');
    console.log('1. Acesse Supabase Dashboard');
    console.log('2. Vá para subscription_events');
    console.log('3. Confirme que todos os 4 eventos foram registrados');
    console.log('4. Verifique os campos em profiles e vendas');
  } else {
    console.log(`❌ ${passed}/${total} testes passaram`);
    console.log('Revise os erros acima');
  }
  console.log('='.repeat(45));
}

runAllTests().catch(console.error);
