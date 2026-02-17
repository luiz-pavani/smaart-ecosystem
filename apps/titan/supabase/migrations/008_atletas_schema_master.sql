-- Migration 008: Atletas Schema Master - Cadastro Central Unificado
-- Created: 2026-02-17
-- Description: Expandir atletas para incluir TODAS as informações necessárias para:
--              - Federação (gestão administrativa)
--              - Eventos (competições/kata/shiai)
--              - Academia (mensalidades/frequência)
--              - Filiações (anuidades/licenças)

-- ============================================================
-- SEÇÃO 1: EVENTOS E COMPETIÇÕES
-- ============================================================

-- Categorias de Competição
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS categoria_idade VARCHAR(20), -- SUB_7, SUB_9, SUB_11, SUB_13, SUB_15, SUB_18, SUB_21, SENIOR, VETERANOS_1, VETERANOS_2, VETERANOS_3
ADD COLUMN IF NOT EXISTS peso_atual_kg DECIMAL(5,2), -- Peso atual em kg (ex: 73.50)
ADD COLUMN IF NOT EXISTS categoria_peso VARCHAR(20), -- S_LIGEIRO, LIGEIRO, M_LEVE, LEVE, M_MEDIO, MEDIO, M_PESADO, PESADO, S_PESADO, ABSOLUTO
ADD COLUMN IF NOT EXISTS ultima_pesagem_data DATE,
ADD COLUMN IF NOT EXISTS ultima_pesagem_kg DECIMAL(5,2);

-- KATA (Demonstração)
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS participa_kata BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS kata_modalidade VARCHAR(50), -- KODOMO_NO_KATA, SEIRYOKU_ZENYYO, NAGE_NO_KATA, KATAME_NO_KATA, KODOKAN_GOSHIN_JUTSU, JU_NO_KATA, KIME_NO_KATA
ADD COLUMN IF NOT EXISTS kata_divisao VARCHAR(50), -- DIVISAO_1, DIVISAO_2, PRINCIPAL
ADD COLUMN IF NOT EXISTS kata_nivel VARCHAR(50); -- Baseado em graduação/idade

-- SHIAI (Combate)
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS participa_shiai BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS shiai_tipo VARCHAR(20), -- FESTIVAL, MENORES, MAIORES, VETERANOS, ABSOLUTO
ADD COLUMN IF NOT EXISTS tempo_combate VARCHAR(10), -- 2_MIN, 3_MIN, 4_MIN (calculado automaticamente)
ADD COLUMN IF NOT EXISTS shiai_naipe VARCHAR(20); -- MASCULINO, FEMININO (geralmente baseado em genero)

-- Restrições e Licenças
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS restricoes_medicas TEXT, -- Alergias, restrições, medicamentos
ADD COLUMN IF NOT EXISTS tipo_licenca VARCHAR(30), -- FEDERADO, NAO_FEDERADO, OPEN, ASPIRANTE
ADD COLUMN IF NOT EXISTS numero_licenca VARCHAR(50),
ADD COLUMN IF NOT EXISTS validade_licenca DATE,
ADD COLUMN IF NOT EXISTS licenca_veteranos BOOLEAN DEFAULT false;

-- Histórico de Competições
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS ranking_nacional INTEGER,
ADD COLUMN IF NOT EXISTS ranking_estadual INTEGER,
ADD COLUMN IF NOT EXISTS pontos_ranking INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS historico_medalhas JSONB, -- {"ouro": 5, "prata": 3, "bronze": 8, "eventos": [...]}
ADD COLUMN IF NOT EXISTS ultima_competicao_data DATE,
ADD COLUMN IF NOT EXISTS total_competicoes INTEGER DEFAULT 0;

-- ============================================================
-- SEÇÃO 2: GESTÃO DE ACADEMIA
-- ============================================================

-- Mensalidades e Planos
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS plano_mensalidade VARCHAR(50), -- MENSAL, TRIMESTRAL, SEMESTRAL, ANUAL, PERSONALIZADO
ADD COLUMN IF NOT EXISTS valor_mensalidade DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER, -- 1-31
ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30), -- CARTAO, BOLETO, PIX, DINHEIRO, TRANSFERENCIA
ADD COLUMN IF NOT EXISTS status_mensalidade VARCHAR(20) DEFAULT 'pendente', -- EM_DIA, PENDENTE, ATRASADO, ISENTO
ADD COLUMN IF NOT EXISTS ultima_mensalidade_paga_em DATE,
ADD COLUMN IF NOT EXISTS proxima_mensalidade_vencimento DATE,
ADD COLUMN IF NOT EXISTS mensalidades_em_atraso INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_total_devido DECIMAL(10,2) DEFAULT 0;

-- Frequência e Treinos
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS frequencia_semanal INTEGER, -- Quantas vezes por semana treina (1-7)
ADD COLUMN IF NOT EXISTS horario_preferencial VARCHAR(50), -- MANHA, TARDE, NOITE, VARIADO
ADD COLUMN IF NOT EXISTS horarios_treino JSONB, -- [{"dia": "SEGUNDA", "hora": "18:00"}, ...]
ADD COLUMN IF NOT EXISTS ultima_presenca_data DATE,
ADD COLUMN IF NOT EXISTS total_presencas_mes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS percentual_frequencia DECIMAL(5,2); -- % de presença mensal

-- Responsável Legal (para menores de idade)
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR(255),
ADD COLUMN IF NOT EXISTS responsavel_cpf VARCHAR(14),
ADD COLUMN IF NOT EXISTS responsavel_rg VARCHAR(20),
ADD COLUMN IF NOT EXISTS responsavel_telefone VARCHAR(20),
ADD COLUMN IF NOT EXISTS responsavel_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS responsavel_parentesco VARCHAR(30); -- PAI, MAE, RESPONSAVEL_LEGAL, TUTOR

-- Observações Internas da Academia
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS observacoes_academia TEXT, -- Notas privadas da academia
ADD COLUMN IF NOT EXISTS objetivo_treino TEXT, -- Competição, lazer, defesa pessoal, etc
ADD COLUMN IF NOT EXISTS nivel_comprometimento VARCHAR(20); -- BAIXO, MEDIO, ALTO

-- ============================================================
-- SEÇÃO 3: FILIAÇÃO E ANUIDADES
-- ============================================================

-- Filiação
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS ano_primeira_filiacao INTEGER,
ADD COLUMN IF NOT EXISTS anos_filiado INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS filiacao_ativa BOOLEAN DEFAULT true;

-- Anuidades por Ano (2024-2026)
-- 2024
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS anuidade_2024_status VARCHAR(20) DEFAULT 'pendente', -- PAGA, PENDENTE, ISENTA, CANCELADA
ADD COLUMN IF NOT EXISTS anuidade_2024_valor DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS anuidade_2024_paga_em DATE,
ADD COLUMN IF NOT EXISTS anuidade_2024_comprovante_url TEXT;

-- 2025
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS anuidade_2025_status VARCHAR(20) DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS anuidade_2025_valor DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS anuidade_2025_paga_em DATE,
ADD COLUMN IF NOT EXISTS anuidade_2025_comprovante_url TEXT;

-- 2026
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS anuidade_2026_status VARCHAR(20) DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS anuidade_2026_valor DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS anuidade_2026_paga_em DATE,
ADD COLUMN IF NOT EXISTS anuidade_2026_comprovante_url TEXT;

-- Carteirinha e Documentação
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS carteirinha_numero VARCHAR(50),
ADD COLUMN IF NOT EXISTS carteirinha_validade DATE,
ADD COLUMN IF NOT EXISTS carteirinha_emitida_em DATE,
ADD COLUMN IF NOT EXISTS carteirinha_url TEXT; -- Link para carteirinha digital

-- ============================================================
-- COMENTÁRIOS NAS COLUNAS
-- ============================================================

-- Eventos/Competições
COMMENT ON COLUMN atletas.categoria_idade IS 'Categoria de idade para competições: SUB_7, SUB_9, SUB_11, SUB_13, SUB_15, SUB_18, SUB_21, SENIOR, VETERANOS_1/2/3';
COMMENT ON COLUMN atletas.peso_atual_kg IS 'Peso atual do atleta em kg';
COMMENT ON COLUMN atletas.categoria_peso IS 'Categoria de peso: S_LIGEIRO, LIGEIRO, M_LEVE, LEVE, M_MEDIO, MEDIO, M_PESADO, PESADO, S_PESADO, ABSOLUTO';
COMMENT ON COLUMN atletas.participa_kata IS 'Se o atleta participa de demonstrações de kata';
COMMENT ON COLUMN atletas.kata_modalidade IS 'Tipo de kata: KODOMO_NO_KATA, NAGE_NO_KATA, etc';
COMMENT ON COLUMN atletas.participa_shiai IS 'Se o atleta participa de combates (shiai)';
COMMENT ON COLUMN atletas.tipo_licenca IS 'Tipo de licença: FEDERADO, NAO_FEDERADO, OPEN, ASPIRANTE';
COMMENT ON COLUMN atletas.historico_medalhas IS 'JSON com histórico de medalhas e competições';

-- Academia
COMMENT ON COLUMN atletas.plano_mensalidade IS 'Plano contratado: MENSAL, TRIMESTRAL, SEMESTRAL, ANUAL';
COMMENT ON COLUMN atletas.valor_mensalidade IS 'Valor da mensalidade em R$';
COMMENT ON COLUMN atletas.status_mensalidade IS 'Status atual: EM_DIA, PENDENTE, ATRASADO, ISENTO';
COMMENT ON COLUMN atletas.frequencia_semanal IS 'Quantas vezes por semana o atleta treina';
COMMENT ON COLUMN atletas.horarios_treino IS 'JSON com dias e horários de treino';
COMMENT ON COLUMN atletas.responsavel_nome IS 'Nome do responsável legal (para menores de idade)';

-- Filiação/Anuidades
COMMENT ON COLUMN atletas.ano_primeira_filiacao IS 'Ano da primeira filiação à federação';
COMMENT ON COLUMN atletas.anuidade_2024_status IS 'Status da anuidade 2024: PAGA, PENDENTE, ISENTA, CANCELADA';
COMMENT ON COLUMN atletas.anuidade_2025_status IS 'Status da anuidade 2025: PAGA, PENDENTE, ISENTA, CANCELADA';
COMMENT ON COLUMN atletas.anuidade_2026_status IS 'Status da anuidade 2026: PAGA, PENDENTE, ISENTA, CANCELADA';
COMMENT ON COLUMN atletas.carteirinha_numero IS 'Número da carteirinha de filiação';

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índices para Competições
CREATE INDEX IF NOT EXISTS idx_atletas_categoria_idade ON atletas(categoria_idade);
CREATE INDEX IF NOT EXISTS idx_atletas_categoria_peso ON atletas(categoria_peso);
CREATE INDEX IF NOT EXISTS idx_atletas_participa_kata ON atletas(participa_kata);
CREATE INDEX IF NOT EXISTS idx_atletas_participa_shiai ON atletas(participa_shiai);
CREATE INDEX IF NOT EXISTS idx_atletas_tipo_licenca ON atletas(tipo_licenca);

-- Índices para Academia
CREATE INDEX IF NOT EXISTS idx_atletas_status_mensalidade ON atletas(status_mensalidade);
CREATE INDEX IF NOT EXISTS idx_atletas_proxima_mensalidade ON atletas(proxima_mensalidade_vencimento);
CREATE INDEX IF NOT EXISTS idx_atletas_plano_mensalidade ON atletas(plano_mensalidade);

-- Índices para Filiação
CREATE INDEX IF NOT EXISTS idx_atletas_filiacao_ativa ON atletas(filiacao_ativa);
CREATE INDEX IF NOT EXISTS idx_atletas_anuidade_2026 ON atletas(anuidade_2026_status);
CREATE INDEX IF NOT EXISTS idx_atletas_carteirinha_validade ON atletas(carteirinha_validade);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Função para calcular categoria de idade baseada na data de nascimento
CREATE OR REPLACE FUNCTION calcular_categoria_idade(p_data_nascimento DATE, p_data_referencia DATE DEFAULT CURRENT_DATE)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_idade INTEGER;
BEGIN
  v_idade := EXTRACT(YEAR FROM AGE(p_data_referencia, p_data_nascimento));
  
  CASE
    WHEN v_idade <= 7 THEN RETURN 'SUB_7';
    WHEN v_idade <= 9 THEN RETURN 'SUB_9';
    WHEN v_idade <= 11 THEN RETURN 'SUB_11';
    WHEN v_idade <= 13 THEN RETURN 'SUB_13';
    WHEN v_idade <= 15 THEN RETURN 'SUB_15';
    WHEN v_idade <= 18 THEN RETURN 'SUB_18';
    WHEN v_idade <= 21 THEN RETURN 'SUB_21';
    WHEN v_idade <= 29 THEN RETURN 'SENIOR';
    WHEN v_idade <= 39 THEN RETURN 'VETERANOS_1';
    WHEN v_idade <= 49 THEN RETURN 'VETERANOS_2';
    ELSE RETURN 'VETERANOS_3';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para calcular tempo de combate baseado na categoria
CREATE OR REPLACE FUNCTION calcular_tempo_combate(p_categoria_idade VARCHAR(20))
RETURNS VARCHAR(10) AS $$
BEGIN
  CASE p_categoria_idade
    WHEN 'SUB_7', 'SUB_9' THEN RETURN '2_MIN';
    WHEN 'SUB_11', 'SUB_13' THEN RETURN '2_MIN';
    WHEN 'SUB_15' THEN RETURN '3_MIN';
    WHEN 'SUB_18', 'SUB_21', 'SENIOR' THEN RETURN '4_MIN';
    WHEN 'VETERANOS_1', 'VETERANOS_2', 'VETERANOS_3' THEN RETURN '3_MIN';
    ELSE RETURN '4_MIN';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para determinar categoria de peso (masculino)
CREATE OR REPLACE FUNCTION calcular_categoria_peso_masculino(
  p_peso_kg DECIMAL,
  p_categoria_idade VARCHAR(20)
)
RETURNS VARCHAR(20) AS $$
BEGIN
  -- Sub 11
  IF p_categoria_idade IN ('SUB_7', 'SUB_9', 'SUB_11') THEN
    CASE
      WHEN p_peso_kg <= 24 THEN RETURN 'S_LIGEIRO';
      WHEN p_peso_kg <= 28 THEN RETURN 'LIGEIRO';
      WHEN p_peso_kg <= 31 THEN RETURN 'M_LEVE';
      WHEN p_peso_kg <= 34 THEN RETURN 'LEVE';
      WHEN p_peso_kg <= 38 THEN RETURN 'M_MEDIO';
      WHEN p_peso_kg <= 42 THEN RETURN 'MEDIO';
      WHEN p_peso_kg <= 47 THEN RETURN 'M_PESADO';
      WHEN p_peso_kg <= 52 THEN RETURN 'PESADO';
      ELSE RETURN 'S_PESADO';
    END CASE;
  
  -- Sub 13
  ELSIF p_categoria_idade = 'SUB_13' THEN
    CASE
      WHEN p_peso_kg <= 28 THEN RETURN 'S_LIGEIRO';
      WHEN p_peso_kg <= 31 THEN RETURN 'LIGEIRO';
      WHEN p_peso_kg <= 34 THEN RETURN 'M_LEVE';
      WHEN p_peso_kg <= 38 THEN RETURN 'LEVE';
      WHEN p_peso_kg <= 42 THEN RETURN 'M_MEDIO';
      WHEN p_peso_kg <= 47 THEN RETURN 'MEDIO';
      WHEN p_peso_kg <= 52 THEN RETURN 'M_PESADO';
      WHEN p_peso_kg <= 60 THEN RETURN 'PESADO';
      ELSE RETURN 'S_PESADO';
    END CASE;
  
  -- Sub 15
  ELSIF p_categoria_idade = 'SUB_15' THEN
    CASE
      WHEN p_peso_kg <= 40 THEN RETURN 'S_LIGEIRO';
      WHEN p_peso_kg <= 45 THEN RETURN 'LIGEIRO';
      WHEN p_peso_kg <= 50 THEN RETURN 'M_LEVE';
      WHEN p_peso_kg <= 55 THEN RETURN 'LEVE';
      WHEN p_peso_kg <= 60 THEN RETURN 'M_MEDIO';
      WHEN p_peso_kg <= 66 THEN RETURN 'MEDIO';
      WHEN p_peso_kg <= 73 THEN RETURN 'M_PESADO';
      WHEN p_peso_kg <= 81 THEN RETURN 'PESADO';
      ELSE RETURN 'S_PESADO';
    END CASE;
  
  -- Sub 18, Sub 21, Senior, Veteranos
  ELSE
    CASE
      WHEN p_peso_kg <= 50 THEN RETURN 'S_LIGEIRO';
      WHEN p_peso_kg <= 55 THEN RETURN 'LIGEIRO';
      WHEN p_peso_kg <= 60 THEN RETURN 'M_LEVE';
      WHEN p_peso_kg <= 66 THEN RETURN 'LEVE';
      WHEN p_peso_kg <= 73 THEN RETURN 'M_MEDIO';
      WHEN p_peso_kg <= 81 THEN RETURN 'MEDIO';
      WHEN p_peso_kg <= 90 THEN RETURN 'M_PESADO';
      WHEN p_peso_kg <= 100 THEN RETURN 'PESADO';
      ELSE RETURN 'S_PESADO';
    END CASE;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para determinar categoria de peso (feminino)
CREATE OR REPLACE FUNCTION calcular_categoria_peso_feminino(
  p_peso_kg DECIMAL,
  p_categoria_idade VARCHAR(20)
)
RETURNS VARCHAR(20) AS $$
BEGIN
  -- Sub 11
  IF p_categoria_idade IN ('SUB_7', 'SUB_9', 'SUB_11') THEN
    CASE
      WHEN p_peso_kg <= 24 THEN RETURN 'S_LIGEIRO';
      WHEN p_peso_kg <= 28 THEN RETURN 'LIGEIRO';
      WHEN p_peso_kg <= 31 THEN RETURN 'M_LEVE';
      WHEN p_peso_kg <= 34 THEN RETURN 'LEVE';
      WHEN p_peso_kg <= 38 THEN RETURN 'M_MEDIO';
      WHEN p_peso_kg <= 42 THEN RETURN 'MEDIO';
      WHEN p_peso_kg <= 47 THEN RETURN 'M_PESADO';
      WHEN p_peso_kg <= 52 THEN RETURN 'PESADO';
      ELSE RETURN 'S_PESADO';
    END CASE;
  
  -- Sub 13
  ELSIF p_categoria_idade = 'SUB_13' THEN
    CASE
      WHEN p_peso_kg <= 28 THEN RETURN 'S_LIGEIRO';
      WHEN p_peso_kg <= 31 THEN RETURN 'LIGEIRO';
      WHEN p_peso_kg <= 34 THEN RETURN 'M_LEVE';
      WHEN p_peso_kg <= 38 THEN RETURN 'LEVE';
      WHEN p_peso_kg <= 42 THEN RETURN 'M_MEDIO';
      WHEN p_peso_kg <= 47 THEN RETURN 'MEDIO';
      WHEN p_peso_kg <= 52 THEN RETURN 'M_PESADO';
      WHEN p_peso_kg <= 60 THEN RETURN 'PESADO';
      ELSE RETURN 'S_PESADO';
    END CASE;
  
  -- Sub 15
  ELSIF p_categoria_idade = 'SUB_15' THEN
    CASE
      WHEN p_peso_kg <= 36 THEN RETURN 'S_LIGEIRO';
      WHEN p_peso_kg <= 40 THEN RETURN 'LIGEIRO';
      WHEN p_peso_kg <= 44 THEN RETURN 'M_LEVE';
      WHEN p_peso_kg <= 48 THEN RETURN 'LEVE';
      WHEN p_peso_kg <= 53 THEN RETURN 'M_MEDIO';
      WHEN p_peso_kg <= 58 THEN RETURN 'MEDIO';
      WHEN p_peso_kg <= 63 THEN RETURN 'M_PESADO';
      WHEN p_peso_kg <= 70 THEN RETURN 'PESADO';
      ELSE RETURN 'S_PESADO';
    END CASE;
  
  -- Sub 18, Sub 21, Senior, Veteranos
  ELSE
    CASE
      WHEN p_peso_kg <= 40 THEN RETURN 'S_LIGEIRO';
      WHEN p_peso_kg <= 44 THEN RETURN 'LIGEIRO';
      WHEN p_peso_kg <= 48 THEN RETURN 'M_LEVE';
      WHEN p_peso_kg <= 52 THEN RETURN 'LEVE';
      WHEN p_peso_kg <= 57 THEN RETURN 'M_MEDIO';
      WHEN p_peso_kg <= 63 THEN RETURN 'MEDIO';
      WHEN p_peso_kg <= 70 THEN RETURN 'M_PESADO';
      WHEN p_peso_kg <= 78 THEN RETURN 'PESADO';
      ELSE RETURN 'S_PESADO';
    END CASE;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- TRIGGER PARA AUTO-CÁLCULO DE CATEGORIAS
-- ============================================================

CREATE OR REPLACE FUNCTION auto_calcular_categorias_atleta()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular categoria de idade
  IF NEW.data_nascimento IS NOT NULL THEN
    NEW.categoria_idade := calcular_categoria_idade(NEW.data_nascimento);
    NEW.tempo_combate := calcular_tempo_combate(NEW.categoria_idade);
  END IF;
  
  -- Calcular categoria de peso
  IF NEW.peso_atual_kg IS NOT NULL AND NEW.genero IS NOT NULL AND NEW.categoria_idade IS NOT NULL THEN
    IF NEW.genero = 'Masculino' THEN
      NEW.categoria_peso := calcular_categoria_peso_masculino(NEW.peso_atual_kg, NEW.categoria_idade);
    ELSIF NEW.genero = 'Feminino' THEN
      NEW.categoria_peso := calcular_categoria_peso_feminino(NEW.peso_atual_kg, NEW.categoria_idade);
    END IF;
  END IF;
  
  -- Calcular naipe (baseado em gênero)
  IF NEW.genero IS NOT NULL THEN
    NEW.shiai_naipe := CASE WHEN NEW.genero = 'Masculino' THEN 'MASCULINO' ELSE 'FEMININO' END;
  END IF;
  
  -- Calcular anos de filiação
  IF NEW.ano_primeira_filiacao IS NOT NULL THEN
    NEW.anos_filiado := EXTRACT(YEAR FROM CURRENT_DATE) - NEW.ano_primeira_filiacao;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calcular_categorias ON atletas;
CREATE TRIGGER trigger_auto_calcular_categorias
  BEFORE INSERT OR UPDATE ON atletas
  FOR EACH ROW
  EXECUTE FUNCTION auto_calcular_categorias_atleta();

-- ============================================================
-- VIEWS PARA DIFERENTES CONTEXTOS
-- ============================================================

-- View para Federação (gestão administrativa)
CREATE OR REPLACE VIEW vw_atletas_federacao AS
SELECT 
  id, federacao_id, academia_id,
  nome_completo, cpf, rg, data_nascimento, genero,
  email, celular, instagram, cidade, estado,
  graduacao, dan_nivel, data_graduacao,
  nivel_arbitragem, certificado_arbitragem_url,
  foto_perfil_url, lote, numero_registro,
  status, status_pagamento,
  -- Filiação
  filiacao_ativa, ano_primeira_filiacao, anos_filiado,
  anuidade_2024_status, anuidade_2025_status, anuidade_2026_status,
  carteirinha_numero, carteirinha_validade,
  created_at, updated_at
FROM atletas;

-- View para Academia (gestão interna)
CREATE OR REPLACE VIEW vw_atletas_academia AS
SELECT 
  id, academia_id,
  nome_completo, cpf, data_nascimento, genero,
  email, celular, instagram,
  graduacao, dan_nivel,
  foto_perfil_url,
  -- Mensalidades
  plano_mensalidade, valor_mensalidade, dia_vencimento,
  forma_pagamento, status_mensalidade,
  ultima_mensalidade_paga_em, proxima_mensalidade_vencimento,
  mensalidades_em_atraso, valor_total_devido,
  -- Frequência
  frequencia_semanal, horario_preferencial, horarios_treino,
  ultima_presenca_data, total_presencas_mes, percentual_frequencia,
  -- Responsável
  responsavel_nome, responsavel_telefone, responsavel_email,
  observacoes_academia, objetivo_treino, nivel_comprometimento,
  created_at, updated_at
FROM atletas;

-- View para Eventos (competições)
CREATE OR REPLACE VIEW vw_atletas_eventos AS
SELECT 
  id, federacao_id, academia_id,
  nome_completo, cpf, data_nascimento, genero,
  foto_perfil_url,
  graduacao, dan_nivel,
  -- Categorias
  categoria_idade, peso_atual_kg, categoria_peso,
  ultima_pesagem_data, ultima_pesagem_kg,
  -- Kata
  participa_kata, kata_modalidade, kata_divisao, kata_nivel,
  -- Shiai
  participa_shiai, shiai_tipo, tempo_combate, shiai_naipe,
  -- Licença
  tipo_licenca, numero_licenca, validade_licenca, licenca_veteranos,
  restricoes_medicas,
  -- Histórico
  ranking_nacional, ranking_estadual, pontos_ranking,
  historico_medalhas, ultima_competicao_data, total_competicoes,
  created_at
FROM atletas;

-- ============================================================
-- DADOS INICIAIS E COMENTÁRIOS
-- ============================================================

COMMENT ON VIEW vw_atletas_federacao IS 'View com dados relevantes para gestão administrativa da federação';
COMMENT ON VIEW vw_atletas_academia IS 'View com dados relevantes para gestão interna da academia';
COMMENT ON VIEW vw_atletas_eventos IS 'View com dados relevantes para inscrições em competições e eventos';

-- Adicionar comentário na tabela
COMMENT ON TABLE atletas IS 'Cadastro Master de Atletas - Unifica todos os dados necessários para Federação, Academia e Eventos';
