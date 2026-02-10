# Sistema de Cupons Promocionais - Profep MAX

## 📋 Visão Geral

O sistema de cupons permite criar campanhas promocionais flexíveis com descontos por percentual ou valor fixo, com controle de período de validade e limite de usos.

## 🗄️ Estrutura da Tabela `coupons`

Crie a tabela no Supabase com os seguintes campos:

```sql
CREATE TABLE coupons (
  id BIGINT PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_percent DECIMAL(5,2) DEFAULT NULL,
  discount_fixed DECIMAL(10,2) DEFAULT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  max_uses BIGINT DEFAULT -1,
  used_count BIGINT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  plan_type VARCHAR(50) DEFAULT 'mensal',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_status ON coupons(status);
```

## 📊 Campos Explicados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `code` | VARCHAR | Código do cupom (ex: LAUNCH20) |
| `description` | TEXT | Descrição legível (ex: "20% de desconto - Lançamento") |
| `discount_percent` | DECIMAL | Desconto em percentual (ex: 20 para 20%) |
| `discount_fixed` | DECIMAL | Desconto em valor fixo (ex: 10.00 para R$ 10) |
| `valid_from` | TIMESTAMP | Data/hora de início da validade |
| `valid_until` | TIMESTAMP | Data/hora de fim da validade |
| `max_uses` | BIGINT | Limite de usos (-1 = ilimitado) |
| `used_count` | BIGINT | Quantidade de usos até agora |
| `status` | VARCHAR | 'ACTIVE' ou 'INACTIVE' |
| `plan_type` | VARCHAR | Tipo de plano (mensal, anual, vitalicio) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data da última atualização |

## 🎯 Exemplos de Cupons

### Exemplo 1: Cupom de Lançamento (20% de desconto)
```sql
INSERT INTO coupons (code, description, discount_percent, valid_from, valid_until, max_uses, status, plan_type)
VALUES (
  'LAUNCH20',
  '20% de desconto - Promoção de Lançamento',
  20,
  NOW(),
  NOW() + INTERVAL '30 days',
  -1,
  'ACTIVE',
  'mensal'
);
```

### Exemplo 2: Cupom de Aluno Ativo (R$ 10 de desconto)
```sql
INSERT INTO coupons (code, description, discount_fixed, valid_from, valid_until, max_uses, status, plan_type)
VALUES (
  'ATIVO2026',
  'R$ 10 de desconto - Benefício Alunos Antigos',
  10.00,
  NOW(),
  NOW() + INTERVAL '365 days',
  -1,
  'ACTIVE',
  'mensal'
);
```

### Exemplo 3: Black Friday (30% de desconto, limitado a 100 usos)
```sql
INSERT INTO coupons (code, description, discount_percent, valid_from, valid_until, max_uses, status, plan_type)
VALUES (
  'BLACKFRI30',
  '30% de desconto - Black Friday',
  30,
  '2026-11-24 00:00:00',
  '2026-11-30 23:59:59',
  100,
  'ACTIVE',
  'mensal'
);
```

## 🔄 Fluxo de Validação

1. **Frontend**: Usuário insere o código do cupom
2. **POST /api/coupon/validate**: Sistema valida
   - ✓ Cupom existe e está ACTIVE
   - ✓ Data está dentro do período válido
   - ✓ Não atingiu limite de usos
3. **Frontend**: Mostra desconto e aplica na visualização
4. **POST /api/checkout**: Durante o checkout
   - Valida novamente
   - Aplica desconto ao valor final
   - Incrementa `used_count` em +1

## 🚀 Como Usar

### Criar um novo cupom (via Supabase Dashboard ou SQL)

1. Acesse Supabase → Editor SQL
2. Execute o INSERT conforme exemplos acima
3. Pronto! Cupom já estará disponível

### Ativar/Desativar cupom

```sql
UPDATE coupons SET status = 'INACTIVE' WHERE code = 'LAUNCH20';
```

### Ver uso de um cupom

```sql
SELECT code, used_count, max_uses FROM coupons WHERE code = 'LAUNCH20';
```

### Reset de cupom (para reutilizar)

```sql
UPDATE coupons SET used_count = 0 WHERE code = 'LAUNCH20';
```

## 🔐 Regras de Negócio

- Apenas um cupom por checkout
- Desconto não pode ser negativo (valor final mínimo é R$ 0)
- Se ambos `discount_percent` e `discount_fixed` estão definidos, usa o percentual
- Validação ocorre em tempo real no frontend (UX) e no backend (segurança)

## 💡 Estratégias de Campanha

### 1. Lançamento
- Cupom: LAUNCH20 (20% off)
- Válido: 30 dias
- Usos: Ilimitado

### 2. Retenção de Alunos Antigos
- Cupom: ATIVO2026 (R$ 10 off)
- Válido: 1 ano
- Usos: Ilimitado

### 3. Eventos Sazonais
- Black Friday, Cyber Monday, Ano Novo
- Cupons com validade curta e limite de usos

### 4. Email Marketing
- Cupom exclusivo enviado por email
- Exemplo: PROMO_EMAIL_50 (50% off por email)
- Max 500 usos

## 📱 Endpoints

### POST /api/coupon/validate
```json
{
  "code": "LAUNCH20"
}
```

**Resposta (sucesso)**:
```json
{
  "code": "LAUNCH20",
  "discount_percent": 20,
  "discount_fixed": null,
  "description": "20% de desconto - Promoção de Lançamento"
}
```

**Resposta (erro)**:
```json
{
  "error": "Cupom inválido"
}
```

### POST /api/checkout
Agora aceita parâmetro `coupon`:
```json
{
  "plan": "mensal",
  "email": "user@example.com",
  "coupon": "LAUNCH20",
  ...
}
```

## 🔍 Troubleshooting

| Erro | Solução |
|------|---------|
| "Cupom inválido" | Verificar code, status deve ser 'ACTIVE' |
| "Fora do período de validade" | Verificar valid_from e valid_until |
| "Cupom expirou (limite de usos)" | Aumentar max_uses ou criar novo cupom |

---

**Última atualização**: 21 de janeiro de 2026
