-- Migration 006: Atletas (Athletes)
-- Created: 2025-01-XX
-- Description: Athlete management system with belt ranks, dan levels, referee certifications, and Smoothcomp-style fields

-- Create atletas table
CREATE TABLE atletas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federacao_id UUID NOT NULL REFERENCES federacoes(id) ON DELETE CASCADE,
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE RESTRICT,
  
  -- Personal Information
  nome_completo VARCHAR(255),
  cpf VARCHAR(14) UNIQUE NOT NULL,
  rg VARCHAR(20),
  data_nascimento DATE NOT NULL,
  genero VARCHAR(20), -- Masculino/Feminino/Outro
  
  -- Contact Information
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  
  -- Address
  cep VARCHAR(9),
  endereco VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  
  -- Judo Specific Information
  graduacao VARCHAR(50) NOT NULL, -- BRANCA|MÚKYŪ, CINZA|NANA-KYU, AZUL|ROKKYŪ, AMARELA|GOKYÚ, LARANJA|YONKYŪ, VERDE|SANKYŪ, ROXA|NIKYŪ, MARROM|IKKYŪ, FAIXA PRETA|YUDANSHA
  dan_nivel VARCHAR(20), -- SHODAN, NIDAN, SANDAN, YONDAN, GODAN, ROKUDAN, NANADAN, HACHIDAN (only if FAIXA PRETA)
  data_graduacao DATE, -- Date when current belt was achieved
  
  -- Referee Certification
  nivel_arbitragem VARCHAR(50), -- Regional, Estadual, Nacional, Internacional, etc.
  certificado_arbitragem_url TEXT, -- Certificate file URL
  
  -- Dan Certificate (for black belts)
  certificado_dan_url TEXT, -- Dan certificate file URL
  numero_diploma_dan VARCHAR(50), -- Official dan diploma number
  
  -- Photos
  foto_perfil_url TEXT, -- Profile photo
  foto_documento_url TEXT, -- ID/Document photo
  
  -- Batch/Registration Info
  lote VARCHAR(20), -- e.g., "2026 1", "2025 2"
  numero_registro VARCHAR(50) UNIQUE, -- Internal athlete registration number
  
  -- Status
  status VARCHAR(20) DEFAULT 'ativo', -- ativo, inativo, suspenso, transferido
  status_pagamento VARCHAR(20) DEFAULT 'pendente', -- em_dia, pendente, atrasado, isento
  
  -- Observations/Notes
  observacoes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id), -- Admin who registered the athlete
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_atletas_federacao ON atletas(federacao_id);
CREATE INDEX idx_atletas_academia ON atletas(academia_id);
CREATE INDEX idx_atletas_cpf ON atletas(cpf);
CREATE INDEX idx_atletas_graduacao ON atletas(graduacao);
CREATE INDEX idx_atletas_status ON atletas(status);
CREATE INDEX idx_atletas_lote ON atletas(lote);

-- Function to generate automatic athlete registration number
-- Format: FED-ACAD-YYYY-NNNN (e.g., LRSJ-ABC-2026-0001)
CREATE OR REPLACE FUNCTION gerar_numero_registro_atleta(
  p_federacao_id UUID,
  p_academia_id UUID,
  p_ano INTEGER
) RETURNS VARCHAR AS $$
DECLARE
  v_sigla_federacao VARCHAR(10);
  v_sigla_academia VARCHAR(10);
  v_ultimo_numero INTEGER;
  v_novo_numero VARCHAR(4);
  v_numero_completo VARCHAR(50);
BEGIN
  -- Get federation initials
  SELECT sigla INTO v_sigla_federacao
  FROM federacoes
  WHERE id = p_federacao_id;
  
  -- Get first 3 letters of academia name as code
  SELECT UPPER(LEFT(REGEXP_REPLACE(nome, '[^A-Za-z]', '', 'g'), 3))
  INTO v_sigla_academia
  FROM academias
  WHERE id = p_academia_id;
  
  -- Find the last registration number for this federation + academia + year
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(numero_registro FROM LENGTH(numero_registro) - 3) AS INTEGER
    )
  ), 0) INTO v_ultimo_numero
  FROM atletas
  WHERE federacao_id = p_federacao_id
    AND academia_id = p_academia_id
    AND numero_registro LIKE v_sigla_federacao || '-' || v_sigla_academia || '-' || p_ano || '-%';
  
  -- Generate new sequential number with leading zeros
  v_novo_numero := LPAD((v_ultimo_numero + 1)::TEXT, 4, '0');
  
  -- Build complete registration number
  v_numero_completo := v_sigla_federacao || '-' || v_sigla_academia || '-' || p_ano || '-' || v_novo_numero;
  
  RETURN v_numero_completo;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate registration number before insert
CREATE OR REPLACE FUNCTION trigger_gerar_numero_registro()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_registro IS NULL THEN
    NEW.numero_registro := gerar_numero_registro_atleta(
      NEW.federacao_id,
      NEW.academia_id,
      EXTRACT(YEAR FROM NOW())::INTEGER
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER atletas_gerar_numero_registro
  BEFORE INSERT ON atletas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_gerar_numero_registro();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_atletas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER atletas_updated_at
  BEFORE UPDATE ON atletas
  FOR EACH ROW
  EXECUTE FUNCTION update_atletas_updated_at();

-- Enable Row Level Security
ALTER TABLE atletas ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Federation admins can see all athletes in their federation
CREATE POLICY "Federation admins can view all athletes in their federation"
  ON atletas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.federacao_id = atletas.federacao_id
        AND user_roles.role IN ('federacao_admin', 'federacao_staff')
    )
  );

-- Academia admins can see only their academy's athletes
CREATE POLICY "Academia admins can view their academy athletes"
  ON atletas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.academia_id = atletas.academia_id
        AND user_roles.role IN ('academia_admin', 'academia_staff')
    )
  );

-- Federation admins can insert athletes for any academy in their federation
CREATE POLICY "Federation admins can insert athletes"
  ON atletas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.federacao_id = atletas.federacao_id
        AND user_roles.role IN ('federacao_admin', 'federacao_staff')
    )
  );

-- Academia admins can insert athletes only for their academy
CREATE POLICY "Academia admins can insert athletes for their academy"
  ON atletas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.academia_id = atletas.academia_id
        AND user_roles.role IN ('academia_admin', 'academia_staff')
    )
  );

-- Federation admins can update any athlete in their federation
CREATE POLICY "Federation admins can update athletes"
  ON atletas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.federacao_id = atletas.federacao_id
        AND user_roles.role IN ('federacao_admin', 'federacao_staff')
    )
  );

-- Academia admins can update only their academy's athletes
CREATE POLICY "Academia admins can update their academy athletes"
  ON atletas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.academia_id = atletas.academia_id
        AND user_roles.role IN ('academia_admin', 'academia_staff')
    )
  );

-- Only federation admins can delete athletes
CREATE POLICY "Federation admins can delete athletes"
  ON atletas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.federacao_id = atletas.federacao_id
        AND user_roles.role = 'federacao_admin'
    )
  );

-- Comments for documentation
COMMENT ON TABLE atletas IS 'Athletes/students registered in the system with complete judo-specific information';
COMMENT ON COLUMN atletas.graduacao IS 'Belt rank: BRANCA|MÚKYŪ, CINZA|NANA-KYU, AZUL|ROKKYŪ, AMARELA|GOKYÚ, LARANJA|YONKYŪ, VERDE|SANKYŪ, ROXA|NIKYŪ, MARROM|IKKYŪ, FAIXA PRETA|YUDANSHA';
COMMENT ON COLUMN atletas.dan_nivel IS 'Dan level for black belts: SHODAN through HACHIDAN';
COMMENT ON COLUMN atletas.lote IS 'Registration batch identifier, e.g., "2026 1", "2025 2"';
COMMENT ON COLUMN atletas.numero_registro IS 'Auto-generated unique registration number format: FED-ACAD-YYYY-NNNN';
COMMENT ON COLUMN atletas.nivel_arbitragem IS 'Referee certification level: Regional, Estadual, Nacional, Internacional';
COMMENT ON COLUMN atletas.status IS 'Athlete status: ativo, inativo, suspenso, transferido';
COMMENT ON COLUMN atletas.status_pagamento IS 'Payment status: em_dia, pendente, atrasado, isento';
