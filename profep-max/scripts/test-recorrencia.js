#!/usr/bin/env node

/**
 * Script de Testes - Ciclo Completo de Recorrência Safe2Pay
 * 
 * Simula os seguintes eventos:
 * 1. SubscriptionCreated - Primeira cobrança confirmada
 * 2. SubscriptionRenewed - Renovação automática (ciclo 2)
 * 3. SubscriptionFailed - Falha na cobrança
 * 4. SubscriptionCanceled - Cancelamento de assinatura
 */

const axios = require('axios');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/safe2pay';
const TEST_EMAIL = 'teste-recorrencia@example.com';
const TEST_SUBSCRIPTION_ID = 'SUB_' + Date.now();

console.log('🔧 TESTES DE RECORRÊNCIA SAFE2PAY');
console.log('==================================');
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log(`Email de teste: ${TEST_EMAIL}`);
console.log(`IdSubscription: ${TEST_SUBSCRIPTION_ID}`);
console.log('');

/**
 * 1. SUBSCRIPTION CREATED - Primeira cobrança confirmada
 */
async function testSubscriptionCreated() {
  console.log('\n📝 Teste 1: SubscriptionCreated (Primeira cobrança)');
  console.log('═══════════════════════════════════════════════════');

  const payload = {
    EventType: 'SubscriptionCreated',
    IdSubscription: TEST_SUBSCRIPTION_ID,
    IdTransaction: 'TXN_' + Date.now(),
    TransactionStatus: { Id: 3 }, // 3 = Pago
    Amount: 49.90,
    Reference: 'SUBSCRIPTION:' + TEST_EMAIL,
    Customer: {
      Email: TEST_EMAIL,
      Name: 'João Silva',
      Identity: '12345678900',
      Phone: '51999999999'
    },
    PaymentMethod: 6, // PIX
  };

  try {
    console.log('📤 Enviando payload...');
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`✅ Resposta: ${response.status} ${response.statusText}`);
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Resposta: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('   Nenhuma resposta do servidor (network error)');
    }
    return false;
  }
}

/**
 * 2. SUBSCRIPTION RENEWED - Renovação automática (ciclo 2)
 */
async function testSubscriptionRenewed() {
  console.log('\n📝 Teste 2: SubscriptionRenewed (Renovação - Ciclo 2)');
  console.log('════════════════════════════════════════════════════');

  const payload = {
    EventType: 'SubscriptionRenewed',
    IdSubscription: TEST_SUBSCRIPTION_ID,
    IdTransaction: 'TXN_' + (Date.now() + 1000),
    TransactionStatus: { Id: 3 }, // 3 = Pago
    Amount: 49.90,
    Reference: 'SUBSCRIPTION:' + TEST_EMAIL,
    Customer: {
      Email: TEST_EMAIL,
      Name: 'João Silva',
      Identity: '12345678900',
      Phone: '51999999999'
    },
    PaymentMethod: 6, // PIX
  };

  try {
    console.log('📤 Enviando payload...');
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`✅ Resposta: ${response.status} ${response.statusText}`);
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Resposta: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * 3. SUBSCRIPTION FAILED - Falha na cobrança
 */
async function testSubscriptionFailed() {
  console.log('\n📝 Teste 3: SubscriptionFailed (Falha na cobrança)');
  console.log('════════════════════════════════════════════════');

  const payload = {
    EventType: 'SubscriptionFailed',
    IdSubscription: TEST_SUBSCRIPTION_ID,
    IdTransaction: 'TXN_' + (Date.now() + 2000),
    TransactionStatus: { Id: 2 }, // 2 = Erro/Falha
    Amount: 49.90,
    Reference: 'SUBSCRIPTION:' + TEST_EMAIL,
    Customer: {
      Email: TEST_EMAIL,
      Name: 'João Silva',
      Identity: '12345678900',
      Phone: '51999999999'
    },
    PaymentMethod: 2, // Cartão
    Message: 'Cartão recusado pela operadora',
    Description: 'Insuficiente de fundos',
  };

  try {
    console.log('📤 Enviando payload...');
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`✅ Resposta: ${response.status} ${response.statusText}`);
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Resposta: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * 4. SUBSCRIPTION CANCELED - Cancelamento
 */
async function testSubscriptionCanceled() {
  console.log('\n📝 Teste 4: SubscriptionCanceled (Cancelamento)');
  console.log('═════════════════════════════════════════════');

  const payload = {
    EventType: 'SubscriptionCanceled',
    IdSubscription: TEST_SUBSCRIPTION_ID,
    IdTransaction: 'TXN_' + (Date.now() + 3000),
    TransactionStatus: { Id: 5 }, // 5 = Cancelado
    Amount: 0,
    Reference: 'SUBSCRIPTION:' + TEST_EMAIL,
    Customer: {
      Email: TEST_EMAIL,
      Name: 'João Silva',
      Identity: '12345678900',
      Phone: '51999999999'
    },
    Message: 'Assinatura cancelada pelo usuário',
  };

  try {
    console.log('📤 Enviando payload...');
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`✅ Resposta: ${response.status} ${response.statusText}`);
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Resposta: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * EXECUTAR TODOS OS TESTES
 */
async function runAllTests() {
  const results = [];

  results.push({
    name: 'SubscriptionCreated',
    passed: await testSubscriptionCreated()
  });

  // Aguardar um pouco antes do próximo teste
  await new Promise(resolve => setTimeout(resolve, 1000));

  results.push({
    name: 'SubscriptionRenewed',
    passed: await testSubscriptionRenewed()
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  results.push({
    name: 'SubscriptionFailed',
    passed: await testSubscriptionFailed()
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  results.push({
    name: 'SubscriptionCanceled',
    passed: await testSubscriptionCanceled()
  });

  // Resumo
  console.log('\n\n📊 RESUMO DOS TESTES');
  console.log('═══════════════════════');
  results.forEach(result => {
    const status = result.passed ? '✅ PASSOU' : '❌ FALHOU';
    console.log(`${status}: ${result.name}`);
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\n${passed}/${total} testes passaram`);

  if (passed === total) {
    console.log('🎉 Todos os testes passaram! Sistema de recorrência está funcionando corretamente.');
  } else {
    console.log('⚠️  Alguns testes falharam. Verifique os erros acima.');
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  runAllTests().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
}

module.exports = { testSubscriptionCreated, testSubscriptionRenewed, testSubscriptionFailed, testSubscriptionCanceled, runAllTests };
