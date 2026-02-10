const https = require('https');

// --- FUNÇÃO GERADORA DE CPF VÁLIDO ---
function gerarCPF() {
  const rand = (n) => Math.floor(Math.random() * n);
  const mod = (dividendo, divisor) => Math.round(dividendo - (Math.floor(dividendo / divisor) * divisor));
  
  const n1 = rand(9);
  const n2 = rand(9);
  const n3 = rand(9);
  const n4 = rand(9);
  const n5 = rand(9);
  const n6 = rand(9);
  const n7 = rand(9);
  const n8 = rand(9);
  const n9 = rand(9);
  
  let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
  d1 = 11 - (mod(d1, 11));
  if (d1 >= 10) d1 = 0;
  
  let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
  d2 = 11 - (mod(d2, 11));
  if (d2 >= 10) d2 = 0;
  
  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

// --- SEUS DADOS ---
const TOKEN = '11336254CEBF491099FB33B8D3F022E5'; 
// ATENÇÃO: Verifique se seu Ngrok mudou. Se sim, atualize aqui!
const NGROK = 'https://cramponnae-felicita-meningococcic.ngrok-free.dev/api/webhooks/safe2pay'; 

const cpfValido = gerarCPF();

console.log(`🆔 CPF Gerado para o teste: ${cpfValido}`);

const payload = JSON.stringify({
  "IsSandbox": true,
  "Application": "ProfepMax Teste",
  "Vendor": "Luiz Pavani",
  "CallbackUrl": NGROK,
  "PaymentMethod": "2", // Cartão de Crédito
  
  // --- AQUI ESTÁ A MUDANÇA ---
  "Reference": "luizpavani@gmail.com", // Enviamos o email aqui para garantir que ele volte no Webhook
  // ---------------------------

  "Customer": {
    "Name": "Aluno Teste Pavani",
    "Identity": cpfValido, 
    "Email": "luizpavani@gmail.com", 
    "Phone": "51999999999",
    "Address": {
      "ZipCode": "90560002",
      "Street": "Rua Teste",
      "Number": "123",
      "District": "Moinhos de Vento",
      "CityName": "Porto Alegre",
      "StateInitials": "RS",
      "CountryName": "Brasil"
    }
  },
  "Products": [
    {
      "Code": "001",
      "Description": "Plano Mestre Teste Final",
      "UnitPrice": 10.00,
      "Quantity": 1
    }
  ],
  "PaymentObject": {
    "Holder": "Luiz Pavani",
    "CardNumber": "4024007153763191", // Visa Teste Safe2Pay
    "ExpirationDate": "12/2029",
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

console.log(`🥋 Enviando Pagamento com Etiqueta (Reference)...`);

const req = https.request(options, (res) => {
  console.log(`🚦 STATUS CODE: ${res.statusCode}`);
  
  let body = '';
  res.on('data', chunk => body += chunk);
  
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      
      if (!response.HasError) {
        console.log("✅ SUCESSO! Pagamento Aprovado.");
        console.log(`🆔 ID da Transação: ${response.ResponseDetail.IdTransaction}`);
        console.log("\n👀 🔔 OLHE O TERMINAL DO SITE AGORA (npm run dev)!");
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