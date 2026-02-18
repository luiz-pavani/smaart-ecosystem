-- ============================================
-- SPRINT 1B: TABELAS DE ACESSO & FREQUÊNCIA
-- ============================================

-- Tabela: FREQUENCIA (Histórico de entrada/saída)
CREATE TABLE IF NOT EXISTS frequencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  atleta_id UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  
  -- Informações de Acesso
  data_entrada DATE NOT NULL,
  hora_entrada TIME NOT NULL,
  data_saida DATE,
  hora_saida TIME,
  
  -- Metadata
  metodo_validacao VARCHAR(20) DEFAULT 'qr', -- qr, biometria, manual
  ip_origem INET,
  dispositivo VARCHAR(100), -- smartphone, tablet, portaria, web
  
  -- Status
  status VARCHAR(20) DEFAULT 'ativo', -- ativo, autorizado, negado, manual
  motivo_negacao TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para frequencia
CREATE INDEX IF NOT EXISTS idx_frequencia_academia_data ON frequencia(academia_id, data_entrada);
CREATE INDEX IF NOT EXISTS idx_frequencia_atleta ON frequencia(atleta_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_data ON frequencia(data_entrada);
CREATE INDEX IF NOT EXISTS idx_frequencia_atleta_data ON frequencia(atleta_id, data_entrada DESC);

-- RLS para frequencia
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;

-- Atletas veem sua frequência
DROP POLICY IF EXISTS "Atletas veem sua frequencia" ON frequencia;
CREATE POLICY "Atletas veem sua frequencia" ON frequencia
  FOR SELECT USING (atleta_id = auth.uid());

-- Gestores veem frequência da academia
DROP POLICY IF EXISTS "Gestores veem frequencia da academia" ON frequencia;
CREATE POLICY "Gestores veem frequencia da academia" ON frequencia
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.academia_id = frequencia.academia_id
      AND user_roles.role IN ('academia_admin', 'academia_gestor')
    )
  );

-- INSERT frequencia (gestores podem registrar manualmente)
DROP POLICY IF EXISTS "Gestores inserem frequencia" ON frequencia;
CREATE POLICY "Gestores inserem frequencia" ON frequencia
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.academia_id = frequencia.academia_id
      AND user_roles.role IN ('academia_admin', 'academia_gestor')
    )
  );

---

-- Tabela: SESSOES_QR (QR tokens com validade)
CREATE TABLE IF NOT EXISTS sessoes_qr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  
  -- QR Metadata
  qr_token VARCHAR(500) UNIQUE NOT NULL,
  qr_image_url TEXT, -- URL do PNG armazenado no Storage
  
  -- Válidade (24 horas por padrão)
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_expiracao TIMESTAMP NOT NULL,
  
  -- Uso
  usado BOOLEAN DEFAULT FALSE,
  data_uso TIMESTAMP,
  academia_uso UUID REFERENCES academias(id) ON DELETE SET NULL,
  
  -- Segurança
  ip_criacao INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para sessoes_qr
CREATE INDEX IF NOT EXISTS idx_sessoes_qr_atleta ON sessoes_qr(atleta_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_qr_token ON sessoes_qr(qr_token);
CREATE INDEX IF NOT EXISTS idx_sessoes_qr_expiracao ON sessoes_qr(data_expiracao);
CREATE INDEX IF NOT EXISTS idx_sessoes_qr_ativo ON sessoes_qr(atleta_id, usado, data_expiracao);

-- RLS para sessoes_qr
ALTER TABLE sessoes_qr ENABLE ROW LEVEL SECURITY;

-- Atletas veem seus QR codes
DROP POLICY IF EXISTS "Atletas veem seus QR codes" ON sessoes_qr;
CREATE POLICY "Atletas veem seus QR codes" ON sessoes_qr
  FOR SELECT USING (atleta_id = auth.uid());

-- Sistema cria novos QR codes
DROP POLICY IF EXISTS "Sistema cria QR codes" ON sessoes_qr;
CREATE POLICY "Sistema cria QR codes" ON sessoes_qr
  FOR INSERT WITH CHECK (atleta_id = auth.uid());

-- Sistema atualiza uso de QR codes
DROP POLICY IF EXISTS "Sistema atualiza QR codes" ON sessoes_qr;
CREATE POLICY "Sistema atualiza QR codes" ON sessoes_qr
  FOR UPDATE USING (atleta_id = auth.uid() OR NOT usado);
