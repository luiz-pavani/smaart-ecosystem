const https = require('https');

// --- SEUS DADOS ---
const TOKEN = '11336254CEBF491099FB33B8D3F022E5'; 
// Confirme se seu Ngrok ainda é este. Se mudou, atualize aqui!
const NGROK = 'https://cramponnae-felicita-meningococcic.ngrok-free.dev/api/webhooks/safe2pay';

// Data de vencimento para amanhã (Obrigatório para Boleto)
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dueDate = tomorrow.toLocaleDateString('pt-BR'); // Formato DD/MM/AAAA

const payload = JSON.stringify({
  "IsSandbox": true,
  "Application": "ProfepMax Teste",
  "Vendor": "Luiz Pavani",
  "CallbackUrl": NGROK, // <--- Aqui vai o nosso "Ouvido"
  "PaymentMethod": "1", // 1 = Boleto (Mais seguro para Sandbox)
  "Customer": {
    "Name": "Luiz Pavani",
    "Identity": "08930740990",
    "Email": "luizpavani@gmail.com",
    "Phone": "51999999999",
    "Address": {
      "ZipCode": "90000000",
      "Street": "Rua Teste",
      "Number": "123",
      "District": "Centro",
      "CityName": "Porto Alegre",
      "StateInitials": "RS",
      "CountryName": "Brasil"
    }
  },
  "Products": [
    {
      "Code": "001",
      "Description": "Plano Mestre",
      "UnitPrice": 1.00,
      "Quantity": 1
    }
  ],
  "PaymentObject": {
    "DueDate": dueDate, // Boleto exige data de vencimento
    "Instruction": "Teste de Integração",
    "Message": ["Não pagar - Boleto de Teste"]
  }
});

const options = {
  hostname: 'payment.safe2pay.com.br', // <--- ENDPOINT CORRETO
  path: '/v2/payment',                 // <--- CAMINHO CORRETO
  method: 'POST',
  headers: {
    'x-api-key': TOKEN,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log(`🥋 Enviando Boleto de Teste para: ${options.hostname}${options.path}`);

const req = https.request(options, (res) => {
  console.log(`🚦 STATUS CODE: ${res.statusCode}`);
  
  let body = '';
  res.on('data', chunk => body += chunk);
  
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      
      if (!response.HasError) {
        console.log("✅ SUCESSO! Boleto Criado.");
        console.log(`🆔 ID da Transação: ${response.ResponseDetail.IdTransaction}`);
        console.log("\n👀 OLHE AGORA O TERMINAL DO SITE (npm run dev)...");
        console.log("   O Webhook deve chegar em instantes avisando 'Transação Criada'.");
      } else {
        console.log("❌ Erro do Safe2Pay:", response.Error);
      }
    } catch (e) {
      console.log("📦 Resposta Bruta:", body);
    }
  });
});

req.on('error', (e) => {
  console.error(`🔥 Erro: ${e.message}`);
});

req.write(payload);
req.end();