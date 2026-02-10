const https = require('https');

// --- SEUS DADOS (Extraídos dos Prints) ---
const TOKEN = '11336254CEBF491099FB33B8D3F022E5'; // Token Sandbox
const NGROK = 'https://cramponnae-felicita-meningococcic.ngrok-free.dev/api/webhooks/safe2pay'; // Seu Túnel

const payload = JSON.stringify({
  "IsSandbox": true,
  "Application": "ProfepMax Teste",
  "Vendor": "Luiz Pavani",
  "CallbackUrl": NGROK, // <--- O PULO DO GATO: Forçamos o aviso aqui!
  "PaymentMethod": "2", // Boleto
  "Customer": {
    "Name": "Luiz Pavani",
    "Identity": "08930740990",
    "Email": "luizpavani@gmail.com", // Seu email para liberar acesso
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
      "Description": "Plano Mestre", // Nome que ativa o plano
      "UnitPrice": 1.00,
      "Quantity": 1
    }
  ]
});

const options = {
  hostname: 'api.safe2pay.com.br', // <--- ENDEREÇO CORRIGIDO (Sem 'sandbox')
  path: '/v2/Transaction',
  method: 'POST',
  headers: {
    'x-api-key': TOKEN,
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

console.log("🥋 [1/2] Enviando venda forçada para o Safe2Pay...");

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      
      if (!response.HasError) {
        console.log("✅ Venda criada com sucesso!");
        console.log(`🆔 ID da Transação: ${response.ResponseDetail.IdTransaction}`);
        console.log("\n👀 [2/2] AGORA OLHE O OUTRO TERMINAL (do site)...");
        console.log("   O Webhook de 'Transação Criada' deve chegar em instantes.");
      } else {
        console.log("❌ Erro do Safe2Pay:", response.Error);
      }
    } catch (e) {
      console.log("❌ Erro ao ler resposta:", body);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Erro de conexão: ${e.message}`);
});

req.write(payload);
req.end();