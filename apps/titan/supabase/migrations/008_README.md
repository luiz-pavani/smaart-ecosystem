# Migration 008: Cadastro Master de Atletas

## 📊 Visão Geral

Esta migration transforma a tabela `atletas` em um **cadastro central unificado** que alimenta TODOS os contextos do sistema:

- **Federação** (gestão administrativa e filiações)
- **Academia** (mensalidades, frequência, treinos)
- **Eventos** (competições, categorias, licenças)

## 🎯 Problema Resolvido

**ANTES:** Dados de atletas separados por contexto → duplicação e inconsistências

**DEPOIS:** Um único cadastro master com 117 campos totais (46 existentes + 71 novos)

## 📈 Novos Campos Adicionados: 71

### 🏆 SEÇÃO 1: EVENTOS E COMPETIÇÕES (29 campos)

#### Categorias de Competição
- `categoria_idade` - SUB_7, SUB_9, SUB_11, SUB_13, SUB_15, SUB_18, SUB_21, SENIOR, VETERANOS_1/2/3
- `peso_atual_kg` - Peso atual em quilogramas
- `categoria_peso` - S_LIGEIRO, LIGEIRO, M_LEVE, LEVE, M_MEDIO, MEDIO, M_PESADO, PESADO, S_PESADO, ABSOLUTO
- `ultima_pesagem_data` - Data da última pesagem oficial
- `ultima_pesagem_kg` - Peso na última pesagem

#### KATA (Demonstração)
- `participa_kata` - Boolean: se participa de kata
- `kata_modalidade` - KODOMO_NO_KATA, SEIRYOKU_ZENYYO, NAGE_NO_KATA, KATAME_NO_KATA, etc.
- `kata_divisao` - DIVISAO_1, DIVISAO_2, PRINCIPAL
- `kata_nivel` - Nível técnico baseado em graduação

#### SHIAI (Combate)
- `participa_shiai` - Boolean: se participa de combates
- `shiai_tipo` - FESTIVAL, MENORES, MAIORES, VETERANOS, ABSOLUTO
- `tempo_combate` - 2_MIN, 3_MIN, 4_MIN (calculado automaticamente)
- `shiai_naipe` - MASCULINO, FEMININO

#### Licenças e Restrições
- `restricoes_medicas` - Alergias, restrições, medicamentos necessários
- `tipo_licenca` - FEDERADO, NAO_FEDERADO, OPEN, ASPIRANTE
- `numero_licenca` - Número da licença
- `validade_licenca` - Data de validade
- `licenca_veteranos` - Boolean: se possui licença de veteranos

#### Histórico e Rankings
- `ranking_nacional` - Posição no ranking nacional
- `ranking_estadual` - Posição no ranking estadual
- `pontos_ranking` - Total de pontos acumulados
- `historico_medalhas` - JSONB: `{"ouro": 5, "prata": 3, "bronze": 8}`
- `ultima_competicao_data` - Data da última competição
- `total_competicoes` - Total de competições participadas

---

### 🥋 SEÇÃO 2: GESTÃO DE ACADEMIA (27 campos)

#### Mensalidades e Planos
- `plano_mensalidade` - MENSAL, TRIMESTRAL, SEMESTRAL, ANUAL, PERSONALIZADO
- `valor_mensalidade` - Valor em R$
- `dia_vencimento` - Dia do mês (1-31)
- `forma_pagamento` - CARTAO, BOLETO, PIX, DINHEIRO, TRANSFERENCIA
- `status_mensalidade` - EM_DIA, PENDENTE, ATRASADO, ISENTO
- `ultima_mensalidade_paga_em` - Data do último pagamento
- `proxima_mensalidade_vencimento` - Data do próximo vencimento
- `mensalidades_em_atraso` - Quantidade de mensalidades atrasadas
- `valor_total_devido` - Total devido em R$

#### Frequência e Treinos
- `frequencia_semanal` - Quantas vezes treina por semana (1-7)
- `horario_preferencial` - MANHA, TARDE, NOITE, VARIADO
- `horarios_treino` - JSONB: `[{"dia": "SEGUNDA", "hora": "18:00"}]`
- `ultima_presenca_data` - Data da última presença
- `total_presencas_mes` - Total de presenças no mês
- `percentual_frequencia` - % de frequência mensal

#### Responsável Legal (menores)
- `responsavel_nome` - Nome completo do responsável
- `responsavel_cpf` - CPF do responsável
- `responsavel_rg` - RG do responsável
- `responsavel_telefone` - Telefone do responsável
- `responsavel_email` - Email do responsável
- `responsavel_parentesco` - PAI, MAE, RESPONSAVEL_LEGAL, TUTOR

#### Observações Internas
- `observacoes_academia` - Notas privadas da academia
- `objetivo_treino` - Competição, lazer, defesa pessoal, saúde
- `nivel_comprometimento` - BAIXO, MEDIO, ALTO

---

### 🏅 SEÇÃO 3: FILIAÇÃO E ANUIDADES (15 campos)

#### Filiação
- `ano_primeira_filiacao` - Ano da primeira filiação
- `anos_filiado` - Total de anos filiado (calculado automaticamente)
- `filiacao_ativa` - Boolean: se a filiação está ativa

#### Anuidades por Ano (2024, 2025, 2026)
Para cada ano:
- `anuidade_YYYY_status` - PAGA, PENDENTE, ISENTA, CANCELADA
- `anuidade_YYYY_valor` - Valor da anuidade em R$
- `anuidade_YYYY_paga_em` - Data do pagamento
- `anuidade_YYYY_comprovante_url` - Link do comprovante

#### Carteirinha
- `carteirinha_numero` - Número da carteirinha
- `carteirinha_validade` - Data de validade
- `carteirinha_emitida_em` - Data de emissão
- `carteirinha_url` - Link para carteirinha digital

---

## 🤖 Funções Automáticas

### 1. `calcular_categoria_idade(data_nascimento, data_referencia)`
Calcula automaticamente a categoria de idade baseada na data de nascimento.

**Exemplo:**
```sql
SELECT calcular_categoria_idade('2010-05-15'::DATE); 
-- Retorna: SUB_15
```

### 2. `calcular_tempo_combate(categoria_idade)`
Define o tempo de combate baseado na categoria:
- SUB_7 até SUB_13: 2 minutos
- SUB_15: 3 minutos
- SUB_18, SUB_21, SENIOR: 4 minutos
- VETERANOS: 3 minutos

### 3. `calcular_categoria_peso_masculino(peso_kg, categoria_idade)`
Calcula a categoria de peso para atletas masculinos conforme regras oficiais.

**Exemplo:**
```sql
SELECT calcular_categoria_peso_masculino(73.5, 'SENIOR');
-- Retorna: M_MEDIO (até 73kg)
```

### 4. `calcular_categoria_peso_feminino(peso_kg, categoria_idade)`
Calcula a categoria de peso para atletas femininas conforme regras oficiais.

---

## ⚡ Trigger: Auto-Cálculo

O trigger `trigger_auto_calcular_categorias` é executado **ANTES de INSERT ou UPDATE** e:

1. ✅ Calcula `categoria_idade` baseado em `data_nascimento`
2. ✅ Define `tempo_combate` adequado à categoria
3. ✅ Calcula `categoria_peso` se tiver `peso_atual_kg + genero + categoria_idade`
4. ✅ Define `shiai_naipe` baseado em `genero`
5. ✅ Calcula `anos_filiado` se tiver `ano_primeira_filiacao`

**Você não precisa preencher esses campos manualmente - o sistema faz automaticamente!**

---

## 👁️ Views por Contexto

### `vw_atletas_federacao`
Campos relevantes para **gestão administrativa da federação**:
- Dados pessoais completos
- Graduações e certificados
- Filiação e anuidades
- Status de pagamento

### `vw_atletas_academia`
Campos relevantes para **gestão interna da academia**:
- Dados básicos do atleta
- Mensalidades e pagamentos
- Frequência e horários
- Responsável legal
- Observações internas

### `vw_atletas_eventos`
Campos relevantes para **inscrições em competições**:
- Dados de identificação
- Categorias (idade, peso)
- Modalidades (kata, shiai)
- Licenças e restrições
- Histórico e rankings

---

## 📊 Índices Criados (11 novos)

### Competições
- `idx_atletas_categoria_idade`
- `idx_atletas_categoria_peso`
- `idx_atletas_participa_kata`
- `idx_atletas_participa_shiai`
- `idx_atletas_tipo_licenca`

### Academia
- `idx_atletas_status_mensalidade`
- `idx_atletas_proxima_mensalidade`
- `idx_atletas_plano_mensalidade`

### Filiação
- `idx_atletas_filiacao_ativa`
- `idx_atletas_anuidade_2026`
- `idx_atletas_carteirinha_validade`

---

## 🚀 Como Aplicar no Supabase

### Opção 1: Via Dashboard (Recomendado)
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **SQL Editor** → **New Query**
4. Cole todo o conteúdo de `008_atletas_schema_master.sql`
5. Clique em **Run** (Ctrl+Enter)

### Opção 2: Via CLI
```bash
# Certifique-se de estar no diretório correto
cd apps/titan

# Execute a migration
supabase db push
```

### Opção 3: Via psql (local)
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/008_atletas_schema_master.sql
```

---

## ✅ Validação Pós-Aplicação

Execute os seguintes comandos para validar:

```sql
-- 1. Verificar se as colunas foram adicionadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'atletas' 
ORDER BY ordinal_position;

-- Total esperado: 117 colunas (46 antigas + 71 novas)

-- 2. Verificar se as funções existem
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'calcular_%';

-- Esperado: 4 funções

-- 3. Verificar se as views foram criadas
SELECT table_name 
FROM information_schema.views 
WHERE table_name LIKE 'vw_atletas_%';

-- Esperado: 3 views

-- 4. Testar auto-cálculo
INSERT INTO atletas (
  federacao_id, academia_id, nome_completo, cpf, 
  data_nascimento, genero, graduacao, peso_atual_kg
) VALUES (
  'uuid-da-federacao', 'uuid-da-academia', 
  'Teste Auto-Calc', '12345678901',
  '2010-05-15', 'Masculino', 'Faixa Verde', 50.5
) RETURNING categoria_idade, categoria_peso, tempo_combate, shiai_naipe;

-- Esperado:
-- categoria_idade: SUB_15
-- categoria_peso: M_LEVE (50kg na categoria SUB_15)
-- tempo_combate: 3_MIN
-- shiai_naipe: MASCULINO
```

---

## 📚 Exemplos de Uso

### Inserir atleta com auto-cálculo de categorias
```sql
INSERT INTO atletas (
  federacao_id, academia_id,
  nome_completo, cpf, data_nascimento, genero,
  email, celular, cidade, estado,
  graduacao, peso_atual_kg,
  participa_kata, kata_modalidade,
  participa_shiai
) VALUES (
  '...', '...',
  'João Silva', '12345678901', '2005-03-20', 'Masculino',
  'joao@email.com', '11999999999', 'São Paulo', 'SP',
  'Faixa Preta 1º Dan', 73.5,
  true, 'NAGE_NO_KATA',
  true
);
-- Sistema calcula automaticamente:
-- categoria_idade = SUB_21 (19 anos em 2026)
-- categoria_peso = M_MEDIO (até 73kg)
-- tempo_combate = 4_MIN
-- shiai_naipe = MASCULINO
```

### Buscar atletas para um evento SUB_15 Masculino até 60kg
```sql
SELECT * FROM vw_atletas_eventos
WHERE categoria_idade = 'SUB_15'
  AND genero = 'Masculino'
  AND peso_atual_kg <= 60
  AND tipo_licenca IN ('FEDERADO', 'OPEN')
  AND validade_licenca >= CURRENT_DATE
ORDER BY academia_id, nome_completo;
```

### Listar atletas com mensalidades atrasadas
```sql
SELECT nome_completo, celular, mensalidades_em_atraso, valor_total_devido
FROM vw_atletas_academia
WHERE status_mensalidade = 'ATRASADO'
ORDER BY mensalidades_em_atraso DESC, valor_total_devido DESC;
```

### Relatório de filiações 2026
```sql
SELECT 
  COUNT(*) FILTER (WHERE anuidade_2026_status = 'PAGA') as pagas,
  COUNT(*) FILTER (WHERE anuidade_2026_status = 'PENDENTE') as pendentes,
  COUNT(*) FILTER (WHERE anuidade_2026_status = 'ISENTA') as isentas,
  SUM(anuidade_2026_valor) FILTER (WHERE anuidade_2026_status = 'PAGA') as total_arrecadado,
  SUM(anuidade_2026_valor) FILTER (WHERE anuidade_2026_status = 'PENDENTE') as total_pendente
FROM atletas
WHERE filiacao_ativa = true;
```

---

## 🎨 Próximos Passos

1. ✅ Migration criada e committada
2. ⏳ Aplicar migration no Supabase
3. ⏳ Atualizar forms com interface em abas (Federação / Academia / Eventos)
4. ⏳ Expandir templates CSV
5. ⏳ Atualizar API routes
6. ⏳ Testes e validação
7. ⏳ Deploy para produção

---

## 🔒 Segurança (RLS)

As políticas Row Level Security (RLS) existentes continuam valendo. Adicione novas políticas para as views:

```sql
-- Federação pode ver tudo
ALTER TABLE atletas ENABLE ROW LEVEL SECURITY;

-- Academia só vê seus atletas
CREATE POLICY "Academia vê apenas seus atletas"
  ON atletas FOR SELECT
  USING (academia_id = auth.uid() OR tipo_usuario = 'federacao');

-- Views herdam as políticas da tabela base
```

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Revise este README
2. Consulte o código SQL comentado
3. Valide com os comandos de teste acima
4. Check logs do Supabase Dashboard

---

**Migration 008** | Cadastro Master de Atletas | 117 campos | 4 funções | 3 views | 11 índices
