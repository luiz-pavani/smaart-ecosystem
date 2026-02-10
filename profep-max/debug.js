const https = require('https');

// SEUS DADOS
const TOKEN = '11336254CEBF491099FB33B8D3F022E5'; 
const NGROK = 'https://cramponnae-felicita-meningococcic.ngrok-free.dev/api/webhooks/safe2pay';

const data = JSON.stringify({
  "IsSandbox": true,
  "Application": "ProfepMax Debug",
  "Vendor": "Luiz Pavani",
  "CallbackUrl": NGROK,
  "PaymentMethod": "2",
  "Customer": {
    "Name": "Luiz Pavani",
    "Identity": "08930740990",
    "Email": "luizpavani@gmail.com",
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
      "Description": "Plano Debug",
      "UnitPrice": 1.00,
      "Quantity": 1
    }
  ]
});

const options = {
  hostname: 'payment.safe2pay.com.br',
  path: '/v2/Transaction',
  method: 'POST',
  headers: {
    'x-api-key': TOKEN,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data), // Cálculo mais seguro
    'User-Agent': 'Node.jsClient' // Alguns servidores exigem isso
  }
};

console.log("🕵️‍♂️ Iniciando Diagnóstico de Conexão...");
console.log(`📡 Alvo: ${options.hostname}${options.path}`);

const req = https.request(options, (res) => {
  console.log(`\n🚦 STATUS CODE: ${res.statusCode}`);
  console.log(`📋 HEADERS:`, JSON.stringify(res.headers, null, 2));
  
  let body = '';
  res.on('data', chunk => body += chunk);
  
  res.on('end', () => {
    console.log("\n📦 CORPO DA RESPOSTA (RAW):");
    console.log("---------------------------------------------------");
    console.log(body || "(Vazio)");
    console.log("---------------------------------------------------");

    try {
      const json = JSON.parse(body);
      if (json.HasError) {
        console.log("❌ O Safe2Pay retornou erro na lógica:", json.Error);
      } else {
        console.log("✅ SUCESSO! Transação criada.");
        console.log("👀 Verifique o terminal do site agora!");
      }
    } catch (e) {
      console.log("⚠️ A resposta não é um JSON válido.");
    }
  });
});

req.on('error', (e) => {
  console.error(`🔥 ERRO GRAVE DE CONEXÃO: ${e.message}`);
});

req.write(data);
req.end();