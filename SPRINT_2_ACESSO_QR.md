# 🔐 SPRINT 2 (Semana 2-3) - Sistema de Acesso & Controle de Frequência

**Objetivo:** QR Code de acesso + validação em tempo real + registro de presença

---

## 📊 ARQUITETURA DE ACESSO

### Fluxo Completo

```
1. Aluno faz login no app
   ↓
2. App gera QR Code da sessão (válido por 24h)
   QR = encode(usuario_id + timestamp + signature)
   ↓
3. Aluno apresenta QR para catraca/portaria
   ↓
4. Scanner lê QR → chama POST /api/checkin
   ↓
5. Backend valida:
   - QR é válido (não expirou)
   - Plano está ativo (plan_status = 'active')
   - Não foi usado neste dia (1 check per day)
   ↓
6. Se válido: ✅ Entrada autorizada + log presença
   Se inválido: ❌ Acesso negado + notificação gestor
   ↓
7. Dashboard mostra frequência em tempo real
```

---

## 🗄️ ESTRUTURA DE DADOS

### Nova Tabela: `frequencia`

```sql
CREATE TABLE frequencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id),
  atleta_id UUID NOT NULL REFERENCES atletas(id),
  
  -- Informações de Acesso
  data_entrada DATE,
  hora_entrada TIME,
  data_saida DATE,
  hora_saida TIME,
  
  -- Metadata
  metodo_validacao VARCHAR(20), -- qr, biometria, manual
  ip_origem INET,
  dispositivo VARCHAR(100), -- smartphone, tablet, portaria
  
  -- Status
  status VARCHAR(20) DEFAULT 'ativo', -- ativo, autorizado, negado, manual
  motivo_negacao TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_frequencia_academia_data ON frequencia(academia_id, data_entrada);
CREATE INDEX idx_frequencia_atleta ON frequencia(atleta_id);
CREATE INDEX idx_frequencia_data ON frequencia(data_entrada);

-- RLS
CREATE POLICY "Atletas veem sua frequência"
  ON frequencia FOR SELECT
  USING (atleta_id = auth.uid());

CREATE POLICY "Gestores veem frequência da academia"
  ON frequencia FOR SELECT
  USING (
    academia_id IN (
      SELECT academia_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('academia_admin', 'academia_gestor')
    )
  );
```

### Nova Tabela: `sessoes_qr`

```sql
CREATE TABLE sessoes_qr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id UUID NOT NULL REFERENCES atletas(id),
  
  -- QR Metadata
  qr_token VARCHAR(500) UNIQUE NOT NULL,
  qr_image_url TEXT, -- URL do PNG armazenado no Storage
  
  -- Válidade
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_expiracao TIMESTAMP,
  
  -- Uso
  usado BOOLEAN DEFAULT FALSE,
  data_uso TIMESTAMP,
  academia_uso UUID REFERENCES academias(id),
  
  -- Segurança
  ip_criacao INET,
  user_agent TEXT
);

CREATE INDEX idx_sessoes_qr_atleta ON sessoes_qr(atleta_id);
CREATE INDEX idx_sessoes_qr_token ON sessoes_qr(qr_token);
CREATE INDEX idx_sessoes_qr_expiracao ON sessoes_qr(data_expiracao);
```

---

## 🎯 ENDPOINTS API

### GET `/api/acesso/gerar-qr`
Gera QR Code para o usuário autenticado

```typescript
// REQUEST
// GET /api/acesso/gerar-qr
// Headers: Authorization: Bearer <token>

// RESPONSE
{
  qr_token: "eyJ0eXAiOiJKV1QiLCJhbGc...",
  qr_image_url: "https://storage.supabase.../qr_abc123.png",
  validade_ate: "2026-02-18T14:30:00Z",
  instrucoes: "Apresente este código no acesso"
}
```

### POST `/api/checkin`
Valida QR Code e registra entrada

```typescript
// REQUEST
{
  qr_token: string,
  academia_id: UUID,
  dispositivo: "smartphone" | "catraca"
}

// RESPONSE (Sucesso)
{
  status: 'aprovado',
  mensagem: 'Bem-vindo ao Judo!',
  atleta_nome: string,
  frequencia_este_mes: number,
  plano_vence_em: "15 dias"
}

// RESPONSE (Falha)
{
  status: 'negado',
  motivo: 'plano_expirado' | 'qr_expirado' | 'ja_utilisado_hoje',
  mensagem: string,
  sugestao: string // ex: "Faça a renovação do plano"
}

// ACTIONS:
// 1. Decodifica e valida QR token
// 2. Se inválido ou expirado → 403 + log
// 3. Se já usado hoje → 409 + log
// 4. Valida plan_status do atleta
// 5. Se plano expirado → 403 + notificação gestor
// 6. Se tudo OK:
//    - Insere em frequencia table
//    - Atualiza sessoes_qr.usado = true
//    - Log em webhooks_log
//    - Retorna 200 + dados de entrada
// 7. Envia notificação para gestor (opcional, agregada)
```

### GET `/api/acesso/historico`
Retorna histórico de frequência (últimos 30 dias)

```typescript
// RESPONSE
{
  total_presencas_mes: number,
  presencas: [
    {
      data: "2026-02-15",
      hora_entrada: "07:30",
      hora_saida: "08:45",
      duracao_minutos: 75,
      academia: "LRSJ Bom Retiro"
    }
  ],
  frequencia_media_semana: 3.5,
  meta_presencas: 16,
  progresso_percentual: 65
}
```

### POST `/api/acesso/checkin-manual`
Registra entrada manualmente (gestor override)

```typescript
// REQUEST
{
  atleta_id: UUID,
  academia_id: UUID,
  data: "2026-02-15", // se diferente de hoje
  hora_entrada: "07:30"
}

// Requer role: academia_admin ou academia_gestor
```

---

## 🛠️ COMPONENTES REACT

### `components/qrcode/QRGenerator.tsx`

```typescript
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function QRGenerator() {
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function gerarQR() {
      try {
        const response = await fetch('/api/acesso/gerar-qr');
        const data = await response.json();
        setQrData(data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao gerar QR:', error);
        setLoading(false);
      }
    }

    gerarQR();
    
    // Regenerar a cada 4 horas
    const interval = setInterval(gerarQR, 4 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Gerando QR...</div>;

  return (
    <div className="text-center p-4">
      <h2 className="text-xl font-bold mb-4">Seu Código de Acesso</h2>
      {qrData?.qr_image_url && (
        <img 
          src={qrData.qr_image_url} 
          alt="QR Code"
          className="w-64 h-64 mx-auto mb-4 border-2 border-blue-500"
        />
      )}
      <p className="text-sm text-gray-600">
        Válido até: {new Date(qrData?.validade_ate).toLocaleString('pt-BR')}
      </p>
      <p className="text-xs text-gray-500 mt-2">
        Apresente na portaria ou escaneie no tablet
      </p>
    </div>
  );
}
```

### `components/qrcode/QRScanner.tsx` (para tablet/catraca)

```typescript
import { useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner'; // npm install qr-scanner

export function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const qrScanner = new QrScanner(
      videoRef.current,
      async (result) => {
        console.log('QR Detectado:', result.data);
        
        // Enviar para validação
        const response = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qr_token: result.data,
            academia_id: process.env.NEXT_PUBLIC_ACADEMIA_ID,
            dispositivo: 'catraca'
          })
        });

        const data = await response.json();
        setResult(data);
        
        // Limpar resultado após 3s
        setTimeout(() => setResult(null), 3000);
      },
      { maxScansPerSecond: 5 }
    );

    qrScanner.start();
    return () => qrScanner.destroy();
  }, []);

  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center">
      <video ref={videoRef} className="w-full h-full object-cover" />
      
      {result && (
        <div className={`absolute bottom-10 p-4 rounded-lg text-white text-lg font-bold ${
          result.status === 'aprovado' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {result.status === 'aprovado' 
            ? `✅ ${result.atleta_nome}` 
            : `❌ ${result.motivo}`
          }
        </div>
      )}
    </div>
  );
}
```

---

## 💾 IMPLEMENTAÇÃO - ENDPOINTS

### `app/api/acesso/gerar-qr.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401
    });
  }

  try {
    // 1. Gerar token JWT
    const qrToken = jwt.sign(
      { 
        user_id: user.id,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.QR_SECRET_KEY!,
      { expiresIn: '24h' }
    );

    // 2. Gerar imagem QR
    const qrImageUrl = await QRCode.toDataURL(qrToken);
    
    // 3. Salvar em Supabase Storage
    const fileName = `qr_${user.id}_${Date.now()}.png`;
    const buffer = Buffer.from(qrImageUrl.split(',')[1], 'base64');
    
    await supabase.storage
      .from('qr-codes')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    const { data } = supabase.storage
      .from('qr-codes')
      .getPublicUrl(fileName);

    // 4. Salvar sessão no DB
    await supabase.from('sessoes_qr').insert({
      atleta_id: user.id,
      qr_token: qrToken,
      qr_image_url: data.publicUrl,
      data_expiracao: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ip_criacao: request.headers.get('x-forwarded-for')
    });

    return new Response(JSON.stringify({
      qr_token: qrToken,
      qr_image_url: data.publicUrl,
      validade_ate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      instrucoes: 'Apresente este código no acesso'
    }), { status: 200 });

  } catch (error) {
    console.error('Erro ao gerar QR:', error);
    return new Response(JSON.stringify({ error: 'Erro ao gerar código' }), {
      status: 500
    });
  }
}
```

### `app/api/checkin.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { qr_token, academia_id, dispositivo } = await request.json();

  try {
    // 1. Validar JWT
    let decoded: any;
    try {
      decoded = jwt.verify(qr_token, process.env.QR_SECRET_KEY!);
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'negado',
        motivo: 'qr_expirado',
        mensagem: 'Código QR expirou. Regenere um novo.'
      }), { status: 403 });
    }

    const atleta_id = decoded.user_id;

    // 2. Verificar se já foi usado hoje
    const hoje = new Date().toISOString().split('T')[0];
    const { data: frequenciaHoje } = await supabase
      .from('frequencia')
      .select('id')
      .eq('atleta_id', atleta_id)
      .eq('data_entrada', hoje)
      .limit(1);

    if (frequenciaHoje && frequenciaHoje.length > 0) {
      return new Response(JSON.stringify({
        status: 'negado',
        motivo: 'ja_utilisado_hoje',
        mensagem: 'Você já foi registrado hoje.'
      }), { status: 409 });
    }

    // 3. Validar plano ativo
    const { data: academias } = await supabase
      .from('academias')
      .select('plan_status')
      .eq('id', academia_id)
      .limit(1);

    if (!academias || academias[0]?.plan_status !== 'active') {
      return new Response(JSON.stringify({
        status: 'negado',
        motivo: 'plano_expirado',
        mensagem: 'Plano expirado. Realize a renovação.'
      }), { status: 403 });
    }

    // 4. Registrar frequência
    const { data: atleta } = await supabase
      .from('atletas')
      .select('nome')
      .eq('id', atleta_id)
      .limit(1);

    const horaAgora = new Date().toLocaleTimeString('pt-BR');

    await supabase.from('frequencia').insert({
      academia_id,
      atleta_id,
      data_entrada: hoje,
      hora_entrada: horaAgora,
      metodo_validacao: 'qr',
      status: 'ativo',
      dispositivo
    });

    // 5. Log no webhooks_log
    await supabase.from('webhooks_log').insert({
      provider: 'qr_checkin',
      tipo_evento: 'checkin_sucesso',
      payload: { atleta_id, academia_id, hora: horaAgora },
      status_processamento: 'sucesso'
    });

    // 6. Retornar sucesso
    return new Response(JSON.stringify({
      status: 'aprovado',
      mensagem: 'Bem-vindo!',
      atleta_nome: atleta?.[0]?.nome || 'Atleta',
      frequencia_este_mes: 5, // TODO: calcular
      plano_vence_em: '15 dias'
    }), { status: 200 });

  } catch (error: any) {
    console.error('Erro no checkin:', error);
    
    await supabase.from('webhooks_log').insert({
      provider: 'qr_checkin',
      tipo_evento: 'checkin_erro',
      payload: { error: error.message },
      status_processamento: 'erro',
      mensagem_erro: error.message
    });

    return new Response(JSON.stringify({
      status: 'negado',
      motivo: 'erro_sistema',
      mensagem: 'Erro ao processar acesso. Contate o suporte.'
    }), { status: 500 });
  }
}
```

---

## 📱 PÁGINAS FRONTEND

### `app/(dashboard)/modulo-acesso/page.tsx`

```typescript
'use client';

import { QRGenerator } from '@/components/qrcode/QRGenerator';
import { useEffect, useState } from 'react';

export default function ModuloAcessoPage() {
  const [historico, setHistorico] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function carregarDados() {
      const response = await fetch('/api/acesso/historico');
      const data = await response.json();
      setStats(data);
      setHistorico(data.presencas || []);
    }

    carregarDados();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg border">
          <QRGenerator />
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-bold mb-4">Estatísticas</h3>
          <div className="space-y-2 text-sm">
            <p>📊 Presenças este mês: <strong>{stats?.total_presencas_mes}</strong></p>
            <p>📈 Frequência média: <strong>{stats?.frequencia_media_semana}x/sem</strong></p>
            <p>🎯 Meta: <strong>{stats?.meta_presencas}</strong> ({stats?.progresso_percentual}%)</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="font-bold mb-4">Histórico (Últimos 30 dias)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left">Data</th>
                <th className="text-left">Entrada</th>
                <th className="text-left">Saída</th>
                <th className="text-left">Duração</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((entrada, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td>{entrada.data}</td>
                  <td>{entrada.hora_entrada}</td>
                  <td>{entrada.hora_saida || '-'}</td>
                  <td>{entrada.duracao_minutos || '-'} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ CHECKLIST DA SPRINT

- [ ] Criar migrations SQL (frequencia, sessoes_qr)
- [ ] Implementar `/api/acesso/gerar-qr`
- [ ] Implementar `/api/checkin`
- [ ] Implementar `/api/acesso/historico`
- [ ] Criar `QRGenerator.tsx`
- [ ] Criar `QRScanner.tsx` (para tablet)
- [ ] Página `/modulo-acesso`
- [ ] Documentar fluxo de acesso para gestores
- [ ] Testes em staging
- [ ] Deploy em produção

---

## 🔗 INTEGRAÇÃO COM CATRACA

### Para Catraca Física:
1. Usar tablet Android/iPad
2. Acessar: `https://titan.app/catraca?academia_id=xxx`
3. Component `QRScanner` fica rodando
4. A cada QR lido → chamada para `/api/checkin`
5. Feedback visual (verde/vermelho)

### API da Catraca (Webhook):
Se usar catraca com API própria (Topaz, TechniS, etc):
- Catraca envia QR au: `POST /api/catraca-webhook`
- Backend valida e responde com acesso S/N

---

**Duração:** 1-2 semanas  
**Status:** 🔴 Não iniciado  
**Próximo:** Revisar com time
