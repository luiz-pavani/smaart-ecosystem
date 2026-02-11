#!/usr/bin/env node

/**
 * Safe2Pay Test Email Function
 * Validates Resend email service is working
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('\n📧 Testing Resend Email Service\n');
console.log('=' .repeat(60));

// Read API key from .env.local
const envPath = path.join(__dirname, '../.env.local');
let apiKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/RESEND_API_KEY=["']?([^"'\n]+)["']?/);
  if (match) {
    apiKey = match[1];
  }
}

if (!apiKey) {
  console.error('❌ RESEND_API_KEY not found in .env.local');
  process.exit(1);
}

// Send test email
const emailData = JSON.stringify({
  from: 'PROFEP MAX <judo@profepmax.com.br>',
  to: 'deliver@resend.dev', // Resend test email (always succeeds)
  subject: '✅ Teste Safe2Pay Recurring Payments',
  html: `
    <h1>🎉 Sistema de Pagamentos Recorrentes</h1>
    <p>Teste de integração Safe2Pay com Resend</p>
    <p><strong>Data:</strong> ${new Date().toISOString()}</p>
    <p>Se você recebeu este email, a integração está funcionando! ✅</p>
  `,
});

const options = {
  hostname: 'api.resend.com',
  port: 443,
  path: '/emails',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': emailData.length,
    'Authorization': `Bearer ${apiKey}`,
  },
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const result = JSON.parse(data);
      console.log('\n✅ Email enviado com sucesso!\n');
      console.log(`  ID: ${result.id}`);
      console.log(`  De: judo@profepmax.com.br`);
      console.log(`  Para: deliver@resend.dev`);
      console.log(`  Status: ${res.statusCode} OK`);
      console.log('\n' + '=' .repeat(60));
      console.log('\n✨ Resend API está funcionando corretamente!\n');
    } else {
      console.error('\n❌ Erro ao enviar email\n');
      console.error(`Status: ${res.statusCode}`);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Erro de conexão: ${e.message}\n`);
  process.exit(1);
});

req.write(emailData);
req.end();
