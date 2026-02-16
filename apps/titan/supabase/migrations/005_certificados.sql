-- =====================================================
-- CERTIFICADOS/ALVARÁS DE FUNCIONAMENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS certificados (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  federacao_id UUID NOT NULL REFERENCES federacoes(id) ON DELETE CASCADE,
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  
  -- Dados do Certificado
  numero_certificado VARCHAR(50) NOT NULL UNIQUE, -- Ex: LRSJ-2026-00001
  ano_validade INTEGER NOT NULL, -- 2026
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE NOT NULL, -- 31/12/2026
  
  -- QR Code / Validação
  hash_validacao VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hash para validação pública
  
  -- Status
  status VARCHAR(20) DEFAULT 'ativo', -- ativo, cancelado, expirado
  motivo_cancelamento TEXT,
  
  -- Metadata
  emitido_por_user_id UUID REFERENCES auth.users(id),
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_certificados_federacao ON certificados(federacao_id);
CREATE INDEX IF NOT EXISTS idx_certificados_academia ON certificados(academia_id);
CREATE INDEX IF NOT EXISTS idx_certificados_hash ON certificados(hash_validacao);
CREATE INDEX IF NOT EXISTS idx_certificados_numero ON certificados(numero_certificado);
CREATE INDEX IF NOT EXISTS idx_certificados_status ON certificados(status, ano_validade);

-- Trigger para updated_at
CREATE TRIGGER certificados_updated_at BEFORE UPDATE ON certificados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE certificados ENABLE ROW LEVEL SECURITY;

-- Federação admins podem ver certificados de suas academias
CREATE POLICY "Federação admins can view their certificates"
  ON certificados FOR SELECT
  USING (
    federacao_id IN (
      SELECT federacao_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('federacao_admin', 'federacao_secretario')
    )
  );

-- Federação admins podem criar certificados
CREATE POLICY "Federação admins can insert certificates"
  ON certificados FOR INSERT
  WITH CHECK (
    federacao_id IN (
      SELECT federacao_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'federacao_admin'
    )
  );

-- Federação admins podem atualizar/cancelar certificados
CREATE POLICY "Federação admins can update their certificates"
  ON certificados FOR UPDATE
  USING (
    federacao_id IN (
      SELECT federacao_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'federacao_admin'
    )
  );

-- Academia admins podem ver seus próprios certificados
CREATE POLICY "Academia admins can view their own certificates"
  ON certificados FOR SELECT
  USING (
    academia_id IN (
      SELECT academia_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'academia_admin'
    )
  );

-- =====================================================
-- FUNCTION: Gerar próximo número de certificado
-- =====================================================

CREATE OR REPLACE FUNCTION gerar_numero_certificado(
  p_federacao_id UUID,
  p_sigla_federacao VARCHAR(10),
  p_ano INTEGER
)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_ultimo_numero INTEGER;
  v_proximo_numero VARCHAR(5);
BEGIN
  -- Buscar o último número emitido no ano
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(numero_certificado FROM '\d+$') AS INTEGER
    )
  ), 0)
  INTO v_ultimo_numero
  FROM certificados
  WHERE federacao_id = p_federacao_id
    AND ano_validade = p_ano;
  
  -- Incrementar e formatar com zeros à esquerda
  v_proximo_numero := LPAD((v_ultimo_numero + 1)::TEXT, 5, '0');
  
  -- Retornar no formato: SIGLA-ANO-NUMERO
  RETURN p_sigla_federacao || '-' || p_ano || '-' || v_proximo_numero;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ALTER academias: adicionar campo certificado_2026_id
-- =====================================================

ALTER TABLE academias 
ADD COLUMN IF NOT EXISTS certificado_2026_id UUID REFERENCES certificados(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_academias_certificado ON academias(certificado_2026_id);
