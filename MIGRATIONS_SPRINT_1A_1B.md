# 🗄️ MIGRATIONS - SPRINT 1A + 1B

**Objetivo:** Schema SQL completo para ambos os sprints  
**Destino:** Supabase SQL Editor → Copy/Paste → Execute  
**Data:** 18/02/2026

---

## 📋 SPRINT 1A - PAGAMENTOS (Copy/Paste Pronto)

### COPIE E COLE TUDO ISSO NO SUPABASE SQL EDITOR:

```sql
-- ============================================
-- SPRINT 1A: TABELAS DE PAGAMENTOS
-- ============================================

-- Tabela: PEDIDOS
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  atleta_id UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  
  -- Informações do Pedido
  valor DECIMAL(10,2) NOT NULL,
  moeda VARCHAR(3) DEFAULT 'BRL',
  descricao TEXT DEFAULT 'Mensalidade Academia',
  
  -- Status do Pagamento
  status VARCHAR(20) DEFAULT 'pendente',
  metodo_pagamento VARCHAR(30),
  
  -- Safe2Pay IDs
  safe2pay_reference VARCHAR(100) UNIQUE,
  safe2pay_transaction_id VARCHAR(100),
  
  -- Datas
  data_vencimento DATE,
  data_pagamento TIMESTAMP,
  mes_ref VARCHAR(7),
  
  -- Controle de Tentativas
  tentativas_cobranca INT DEFAULT 0,
  proxima_tentativa_cobranca TIMESTAMP,
  motivo_recusa TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pedidos_academia ON pedidos(academia_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_atleta ON pedidos(atleta_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_safe2pay_ref ON pedidos(safe2pay_reference);

-- RLS
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atletas_veem_seus_pedidos" ON pedidos
  FOR SELECT USING (atleta_id = auth.uid());

CREATE POLICY "gestores_veem_pedidos_academia" ON pedidos
  FOR SELECT USING (
    academia_id IN (
      SELECT academia_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('academia_admin', 'academia_gestor')
    )
  );

-- Tabela: WEBHOOKS_LOG
CREATE TABLE IF NOT EXISTS webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50),
  tipo_evento VARCHAR(100),
  payload JSONB,
  status_processamento VARCHAR(20) DEFAULT 'pendente',
  mensagem_erro TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_provider ON webhooks_log(provider);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks_log(status_processamento);

-- Tabela: INADIMPLENCIA_EVENTOS
CREATE TABLE IF NOT EXISTS inadimplencia_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  evento VARCHAR(50),
  data TIMESTAMP DEFAULT NOW(),
  motivo TEXT,
  enviado_para_aluno BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_inadimplencia_pedido ON inadimplencia_eventos(pedido_id);

-- RLS
ALTER TABLE inadimplencia_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "atletas_veem_seus_eventos" ON inadimplencia_eventos
  FOR SELECT USING (
    pedido_id IN (SELECT id FROM pedidos WHERE atleta_id = auth.uid())
  );
```

---

## 📋 SPRINT 1B - QR ACESSO (Copy/Paste Pronto)

### COPIE E COLE TUDO ISSO NO SUPABASE SQL EDITOR:

```sql
-- ============================================
-- SPRINT 1B: TABELAS DE ACESSO & FREQUÊNCIA
-- ============================================

-- Tabela: FREQUENCIA
CREATE TABLE IF NOT EXISTS frequencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  atleta_id UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  
  -- Informações de Acesso
  data_entrada DATE NOT NULL,
  hora_entrada TIME,
  hora_saida TIME,
  
  -- Metadata
  metodo_validacao VARCHAR(20) DEFAULT 'qr',
  dispositivo VARCHAR(100),
  
  -- Status
  status VARCHAR(20) DEFAULT 'ativo',
  motivo_negacao TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_frequencia_academia_data ON frequencia(academia_id, data_entrada);
CREATE INDEX IF NOT EXISTS idx_frequencia_atleta ON frequencia(atleta_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_data ON frequencia(data_entrada);

-- RLS
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atletas_veem_sua_frequencia" ON frequencia
  FOR SELECT USING (atleta_id = auth.uid());

CREATE POLICY "gestores_veem_frequencia_academia" ON frequencia
  FOR SELECT USING (
    academia_id IN (
      SELECT academia_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('academia_admin', 'academia_gestor')
    )
  );

-- Tabela: SESSOES_QR
CREATE TABLE IF NOT EXISTS sessoes_qr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  
  -- QR Metadata
  qr_token VARCHAR(500) UNIQUE NOT NULL,
  qr_image_url TEXT,
  
  -- Válidade
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_expiracao TIMESTAMP NOT NULL,
  
  -- Uso
  usado BOOLEAN DEFAULT FALSE,
  data_uso TIMESTAMP,
  academia_uso UUID REFERENCES academias(id),
  
  -- Segurança
  ip_criacao INET,
  user_agent TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sessoes_qr_atleta ON sessoes_qr(atleta_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_qr_token ON sessoes_qr(qr_token);
CREATE INDEX IF NOT EXISTS idx_sessoes_qr_expiracao ON sessoes_qr(data_expiracao);

-- RLS
ALTER TABLE sessoes_qr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atletas_veem_suas_sessoes" ON sessoes_qr
  FOR SELECT USING (atleta_id = auth.uid());

CREATE POLICY "atletas_inserem_sessoes" ON sessoes_qr
  FOR INSERT WITH CHECK (atleta_id = auth.uid());
```

---

## 🚀 COMO EXECUTAR

### Passo 1: Abrir Supabase
- Ir para: https://app.supabase.com
- Selecionar projeto Titan  
- Clicar em "SQL Editor"

### Passo 2: Copiar BlOCO SPRINT 1A
1. Selecione TODO o SQL acima (entre ``` e ```)
2. Copie (Ctrl+C / Cmd+C)

### Passo 3: Colar no Supabase
1. Crie uma nova query vazia
2. Ctrl+A (select all)
3. Ctrl+V (paste)
4. Clique em "Run" (botão azul)

### Passo 4: Copiar BLOCO SPRINT 1B
1. Repita passos 2-3 com o código Sprint 1B

### Passo 5: Verificação
1. Vá para "Tables" na barra esquerda
2. Confirme que vê:
   - `pedidos`
   - `webhooks_log`
   - `inadimplencia_eventos`
   - `frequencia`
   - `sessoes_qr`

---

## ✅ CHECKLIST DE EXECUÇÃO

- [ ] Login no Supabase
- [ ] Abrir SQL Editor
- [ ] Executar BLOCO SPRINT 1A
- [ ] Executar BLOCO SPRINT 1B
- [ ] Confirmar 5 tabelas criadas
- [ ] Confirmar índices criados
- [ ] Confirmar RLS habilitado

**Status:** 🟢 PRONTO PARA EXECUTAR

---

## 📊 RESUMO DO SCHEMA

| Tabela | Uso | Referências |
|--------|-----|------------|
| `pedidos` | Registra tentativas de cobrança | academias, atletas |
| `webhooks_log` | Auditoria de eventos | (standalone) |
| `inadimplencia_eventos` | Histórico de inadimplência | pedidos |
| `frequencia` | Log de entradas (presença) | academias, atletas |
| `sessoes_qr` | Tokens QR válidos | atletas |

**Total de tabelas:** 5 novas  
**Total de índices:** 11 novos  
**RLS policies:** 8 novas

---

**PRONTO?** Vá para ESTRUTURA_PASTAS_SPRINT.md

