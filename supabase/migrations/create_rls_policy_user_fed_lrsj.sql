-- Habilitar RLS na tabela user_fed_lrsj (se ainda não estiver habilitado)
ALTER TABLE user_fed_lrsj ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura por usuários autenticados
CREATE POLICY "Permitir leitura de atletas para usuários autenticados"
ON user_fed_lrsj
FOR SELECT
TO authenticated
USING (true);

-- Opcional: Política mais restritiva (apenas usuários da mesma federação)
-- DROP POLICY IF EXISTS "Permitir leitura de atletas para usuários autenticados" ON user_fed_lrsj;
-- CREATE POLICY "Permitir leitura de atletas da mesma federação"
-- ON user_fed_lrsj
-- FOR SELECT
-- TO authenticated
-- USING (
--   federacao_id IN (
--     SELECT federacao_id 
--     FROM user_roles 
--     WHERE user_id = auth.uid()
--   )
-- );
