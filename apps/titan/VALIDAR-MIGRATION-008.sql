-- ============================================================
-- VALIDAÇÃO DA MIGRATION 008
-- Execute este SQL no Supabase para confirmar que tudo foi aplicado
-- ============================================================

-- 1. Contar total de colunas na tabela atletas
SELECT 
  COUNT(*) as total_colunas,
  'Esperado: 117 colunas (46 antigas + 71 novas)' as nota
FROM information_schema.columns 
WHERE table_name = 'atletas' AND table_schema = 'public';

-- 2. Listar NOVAS colunas adicionadas pela Migration 008
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'atletas' 
  AND table_schema = 'public'
  AND column_name IN (
    -- Eventos/Competições (29 campos)
    'categoria_idade', 'peso_atual_kg', 'categoria_peso', 'ultima_pesagem_data', 'ultima_pesagem_kg',
    'participa_kata', 'kata_modalidade', 'kata_divisao', 'kata_nivel',
    'participa_shiai', 'shiai_tipo', 'tempo_combate', 'shiai_naipe',
    'restricoes_medicas', 'tipo_licenca', 'numero_licenca', 'validade_licenca', 'licenca_veteranos',
    'ranking_nacional', 'ranking_estadual', 'pontos_ranking', 'historico_medalhas',
    'ultima_competicao_data', 'total_competicoes',
    -- Academia (27 campos)
    'plano_mensalidade', 'valor_mensalidade', 'dia_vencimento', 'forma_pagamento',
    'status_mensalidade', 'ultima_mensalidade_paga_em', 'proxima_mensalidade_vencimento',
    'mensalidades_em_atraso', 'valor_total_devido',
    'frequencia_semanal', 'horario_preferencial', 'horarios_treino',
    'ultima_presenca_data', 'total_presencas_mes', 'percentual_frequencia',
    'responsavel_nome', 'responsavel_cpf', 'responsavel_rg', 
    'responsavel_telefone', 'responsavel_email', 'responsavel_parentesco',
    'observacoes_academia', 'objetivo_treino', 'nivel_comprometimento',
    -- Filiação (15 campos)
    'ano_primeira_filiacao', 'anos_filiado', 'filiacao_ativa',
    'anuidade_2024_status', 'anuidade_2024_valor', 'anuidade_2024_paga_em', 'anuidade_2024_comprovante_url',
    'anuidade_2025_status', 'anuidade_2025_valor', 'anuidade_2025_paga_em', 'anuidade_2025_comprovante_url',
    'anuidade_2026_status', 'anuidade_2026_valor', 'anuidade_2026_paga_em', 'anuidade_2026_comprovante_url',
    'carteirinha_numero', 'carteirinha_validade', 'carteirinha_emitida_em', 'carteirinha_url'
  )
ORDER BY column_name;

-- 3. Verificar se as 4 funções foram criadas
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'calcular_categoria_idade',
    'calcular_tempo_combate',
    'calcular_categoria_peso_masculino',
    'calcular_categoria_peso_feminino'
  )
ORDER BY routine_name;

-- 4. Verificar se o trigger foi criado
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_calcular_categorias';

-- 5. Verificar se as 3 views foram criadas
SELECT 
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'vw_atletas_federacao',
    'vw_atletas_academia',
    'vw_atletas_eventos'
  )
ORDER BY table_name;

-- 6. Verificar índices criados
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'atletas'
  AND indexname IN (
    'idx_atletas_categoria_idade',
    'idx_atletas_categoria_peso',
    'idx_atletas_participa_kata',
    'idx_atletas_participa_shiai',
    'idx_atletas_tipo_licenca',
    'idx_atletas_status_mensalidade',
    'idx_atletas_proxima_mensalidade',
    'idx_atletas_plano_mensalidade',
    'idx_atletas_filiacao_ativa',
    'idx_atletas_anuidade_2026',
    'idx_atletas_carteirinha_validade'
  )
ORDER BY indexname;

-- 7. TESTE PRÁTICO: Inserir atleta teste e ver auto-cálculo
-- ATENÇÃO: Este INSERT será feito de verdade! Comente se não quiser testar agora.
/*
DO $$
DECLARE
  v_federacao_id UUID;
  v_academia_id UUID;
  v_atleta_id UUID;
BEGIN
  -- Pegar primeira federação e academia
  SELECT id INTO v_federacao_id FROM federacoes LIMIT 1;
  SELECT id INTO v_academia_id FROM academias LIMIT 1;
  
  -- Inserir atleta teste
  INSERT INTO atletas (
    federacao_id, academia_id,
    nome_completo, cpf, data_nascimento, genero,
    graduacao, peso_atual_kg
  ) VALUES (
    v_federacao_id, v_academia_id,
    'TESTE Migration 008', '99999999999',
    '2010-05-15', 'Masculino',
    'Faixa Verde', 50.5
  ) RETURNING id INTO v_atleta_id;
  
  -- Mostrar resultado do auto-cálculo
  RAISE NOTICE 'Atleta teste criado com ID: %', v_atleta_id;
  
  -- Buscar para validar
  SELECT 
    nome_completo,
    categoria_idade,
    categoria_peso,
    tempo_combate,
    shiai_naipe
  FROM atletas 
  WHERE id = v_atleta_id;
  
  -- Limpar teste
  DELETE FROM atletas WHERE id = v_atleta_id;
  RAISE NOTICE 'Atleta teste removido após validação';
END $$;
*/

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- Query 1: total_colunas = 117
-- Query 2: 71 linhas (todos os novos campos)
-- Query 3: 4 linhas (4 funções)
-- Query 4: 1 linha (trigger)
-- Query 5: 3 linhas (3 views)
-- Query 6: 11 linhas (11 índices)
-- Query 7 (se descomentar): AUTO-CÁLCULO funcionando
--   - categoria_idade = 'SUB_15'
--   - categoria_peso = 'M_LEVE' (50kg masculino sub15)
--   - tempo_combate = '3_MIN'
--   - shiai_naipe = 'MASCULINO'

-- ============================================================
-- ✅ SE TODOS OS RESULTADOS BATEREM: MIGRATION 100% APLICADA!
-- ============================================================
