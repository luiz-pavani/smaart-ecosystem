const https = require('https');

// SEUS DADOS
const TOKEN = '11336254CEBF491099FB33B8D3F022E5'; 
// Confirme se seu Ngrok ainda é este!
const NGROK = 'https://cramponnae-felicita-meningococcic.ngrok-free.dev/api/webhooks/safe2pay';

const payload = JSON.stringify({
  "IsSandbox": true,
  "Application": "ProfepMax Teste",
  "Vendor": "Luiz Pavani",
  "CallbackUrl": NGROK, // <--- Onde o Webhook vai bater
  "PaymentMethod": "2", // 2 = Cartão de Crédito
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
      "Description": "Plano Mestre CC",
      "UnitPrice": 10.00,
      "Quantity": 1
    }
  ],
  "PaymentObject": {
    // DADOS DE TESTE OFICIAIS DO SAFE2PAY
    "Holder": "Luiz Pavani",
    "CardNumber": "4024007153763191", // Cartão Visa de Teste
    "ExpirationDate": "12/2028",
    "SecurityCode": "123",
    "InstallmentQuantity": 1,
    "SoftDescriptor": "PROFEPMAX"
  }
});

const options = {
  hostname: 'payment.safe2pay.com.br',
  path: '/v2/payment',
  method: 'POST',
  headers: {
    'x-api-key': TOKEN,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log(`🥋 Enviando Cartão de Teste para: ${options.hostname}${options.path}`);

const req = https.request(options, (res) => {
  console.log(`🚦 STATUS CODE: ${res.statusCode}`);
  
  let body = '';
  res.on('data', chunk => body += chunk);
  
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      
      if (!response.HasError) {
        console.log("✅ SUCESSO! Pagamento com Cartão Aprovado.");
        console.log(`🆔 ID da Transação: ${response.ResponseDetail.IdTransaction}`);
        console.log("\n👀 CORRA PARA O TERMINAL DO SITE (npm run dev)!");
        console.log("   A mágica deve aparecer lá agora.");
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