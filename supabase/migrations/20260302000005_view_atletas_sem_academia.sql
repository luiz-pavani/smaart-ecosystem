-- ====================================================
-- AÇÃO 2 (OPÇÃO A): MONITORAMENTO DE ATLETAS SEM ACADEMIA
-- ====================================================
-- Este SQL cria uma view para facilitar o monitoramento dos 86 atletas
-- que estão sem academia_id mapeado
-- ====================================================

-- View para monitoramento de atletas sem academia
CREATE OR REPLACE VIEW vw_atletas_sem_academia AS
SELECT 
  u.id,
  u.nome_completo,
  u.numero_associado,
  u.cpf,
  u.email,
  u.status,
  u.academias AS academia_texto_importacao,
  u.data_filiacao,
  f.nome AS federacao_nome,
  -- Flag para identificar o motivo
  CASE 
    WHEN u.academias IS NULL OR TRIM(u.academias) = '' THEN 'SEM_INFORMACAO'
    ELSE 'ACADEMIA_NAO_CADASTRADA'
  END AS motivo_sem_academia,
  -- Sugestão de ação
  CASE 
    WHEN u.academias IS NULL OR TRIM(u.academias) = '' THEN 'Contatar atleta para informar academia'
    ELSE 'Cadastrar academia: ' || u.academias
  END AS acao_sugerida
FROM 
  user_fed_lrsj u
LEFT JOIN 
  federacoes f ON u.federacao_id = f.id
WHERE 
  u.academia_id IS NULL
ORDER BY 
  u.data_filiacao DESC;

-- Comentário na view
COMMENT ON VIEW vw_atletas_sem_academia IS 
'View para monitoramento dos atletas sem academia_id mapeado. 
Criado em 2026-02-19 como parte da Auditoria de Mapeamento de Academias.
Meta: Acompanhar os 86 atletas sem academia e facilitar cadastro futuro.';
