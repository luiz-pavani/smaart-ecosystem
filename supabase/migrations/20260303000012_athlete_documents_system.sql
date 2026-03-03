-- ============================================================================
-- MIGRATION: Sistema de Geração de Documentos de Atletas
-- Data: 2026-03-03
-- Descrição: Cria infraestrutura para geração automática de identidades
--            esportivas (PNG) e certificados de graduação (PDF)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELA: document_templates
-- Armazena configuração de templates para diferentes tipos de documentos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_templates (
  id BIGSERIAL PRIMARY KEY,
  template_type TEXT NOT NULL CHECK (template_type IN ('identidade', 'certificado')),
  template_name TEXT NOT NULL,
  background_url TEXT NOT NULL, -- URL no Supabase Storage
  output_format TEXT NOT NULL CHECK (output_format IN ('png', 'jpg', 'pdf')),
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  
  -- Configuração de campos dinâmicos (JSON)
  -- Exemplo: {"nome": {"x": 400, "y": 300, "fontSize": 48, "fontFamily": "Arial Bold", "color": "#FFFFFF", "align": "center"}}
  field_config JSONB NOT NULL DEFAULT '{}',
  
  -- Metadados
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(template_type, template_name)
);

COMMENT ON TABLE public.document_templates IS 'Templates para geração automática de documentos de atletas';
COMMENT ON COLUMN public.document_templates.field_config IS 'Configuração JSON com posicionamento e estilo de cada campo dinâmico';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_document_templates_updated_at();

-- -----------------------------------------------------------------------------
-- 2. TABELA: academy_logos
-- Mapeia academias para seus logos (usados nos documentos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academy_logos (
  id BIGSERIAL PRIMARY KEY,
  academia_nome TEXT NOT NULL UNIQUE, -- Nome normalizado da academia
  logo_url TEXT NOT NULL, -- URL no Supabase Storage
  logo_width INTEGER, -- Largura sugerida para renderização
  logo_height INTEGER, -- Altura sugerida para renderização
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.academy_logos IS 'Logos de academias para uso em documentos de atletas';

CREATE TRIGGER trg_update_academy_logos_updated_at
  BEFORE UPDATE ON public.academy_logos
  FOR EACH ROW
  EXECUTE FUNCTION update_document_templates_updated_at();

-- -----------------------------------------------------------------------------
-- 3. TABELA: generated_documents
-- Histórico e cache de documentos gerados
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generated_documents (
  id BIGSERIAL PRIMARY KEY,
  atleta_id BIGINT NOT NULL REFERENCES public.user_fed_lrsj(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('identidade', 'certificado')),
  document_url TEXT NOT NULL, -- URL do documento gerado no Storage
  template_id BIGINT REFERENCES public.document_templates(id) ON DELETE SET NULL,
  
  -- Snapshot dos dados utilizados (para auditoria)
  data_snapshot JSONB NOT NULL DEFAULT '{}',
  
  -- Hash para verificar se o documento precisa ser regerado
  -- Hash baseado em: atleta data + template version
  content_hash TEXT NOT NULL,
  
  -- Status para invalidar documentos antigos
  is_current BOOLEAN NOT NULL DEFAULT true,
  
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  
  -- Index para busca rápida de documentos atuais por atleta
  UNIQUE(atleta_id, document_type, is_current) WHERE is_current = true
);

COMMENT ON TABLE public.generated_documents IS 'Histórico de documentos gerados para atletas (cache e auditoria)';
COMMENT ON COLUMN public.generated_documents.content_hash IS 'Hash MD5 dos dados do atleta + versão do template';
COMMENT ON COLUMN public.generated_documents.data_snapshot IS 'Snapshot JSON dos dados do atleta no momento da geração';

CREATE INDEX idx_generated_documents_atleta_current 
  ON public.generated_documents(atleta_id, document_type, is_current) 
  WHERE is_current = true;

CREATE INDEX idx_generated_documents_content_hash 
  ON public.generated_documents(content_hash);

-- -----------------------------------------------------------------------------
-- 4. STORAGE BUCKETS (executar manualmente via Supabase Dashboard ou API)
-- -----------------------------------------------------------------------------
-- NOTA: Buckets precisam ser criados via Dashboard ou via API
-- Buckets necessários:
--   - 'document-templates': Templates (fundos) de documentos
--   - 'academy-logos': Logos de academias
--   - 'athlete-documents': Documentos gerados (identidades e certificados)

-- -----------------------------------------------------------------------------
-- 5. RLS POLICIES
-- -----------------------------------------------------------------------------

-- Habilitar RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_logos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Templates: master_access pode gerenciar, todos podem ler activos
CREATE POLICY "master_access pode gerenciar templates"
  ON public.document_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'master_access'
    )
  );

CREATE POLICY "Templates ativos visíveis para autenticados"
  ON public.document_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Academy Logos: federacao_admin e master_access podem gerenciar
CREATE POLICY "Federação e master podem gerenciar logos"
  ON public.academy_logos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('master_access', 'federacao_admin')
    )
  );

-- Documentos Gerados: atleta pode ver seus próprios documentos
CREATE POLICY "Atleta pode ver seus documentos"
  ON public.generated_documents
  FOR SELECT
  TO authenticated
  USING (
    -- Atleta vê seus próprios documentos
    EXISTS (
      SELECT 1 FROM public.user_fed_lrsj ufl
      WHERE ufl.id = atleta_id
      AND ufl.user_id = auth.uid()
    )
  );

-- Federação/academia/master podem ver documentos dos seus atletas
CREATE POLICY "Admin pode ver documentos de atletas"
  ON public.generated_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('master_access', 'federacao_admin', 'academia_admin')
    )
  );

-- Sistema (service_role) pode inserir/atualizar documentos
CREATE POLICY "Sistema pode gerenciar documentos"
  ON public.generated_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('master_access', 'federacao_admin')
    )
  );

-- -----------------------------------------------------------------------------
-- 6. CONFIGURAÇÃO INICIAL: Templates padrão
-- -----------------------------------------------------------------------------

-- Template de Identidade Esportiva
INSERT INTO public.document_templates (
  template_type,
  template_name,
  background_url,
  output_format,
  width,
  height,
  field_config,
  is_active
) VALUES (
  'identidade',
  'Liga RS - Identidade 2026',
  'document-templates/identidade-fundo.png', -- Será atualizado após upload
  'png',
  768, -- Estimado da imagem fornecida
  1280, -- Estimado da imagem fornecida
  '{
    "nome": {
      "x": 384,
      "y": 340,
      "fontSize": 40,
      "fontFamily": "Arial",
      "fontWeight": "bold",
      "color": "#FFFFFF",
      "align": "center",
      "maxWidth": 500
    },
    "academia": {
      "x": 384,
      "y": 420,
      "fontSize": 24,
      "fontFamily": "Arial",
      "color": "#FFFFFF",
      "align": "center",
      "maxWidth": 500
    },
    "data_nascimento": {
      "x": 545,
      "y": 640,
      "fontSize": 28,
      "fontFamily": "Arial",
      "fontWeight": "bold",
      "color": "#FFFFFF",
      "align": "left"
    },
    "graduacao": {
      "x": 545,
      "y": 770,
      "fontSize": 28,
      "fontFamily": "Arial",
      "fontWeight": "bold",
      "color": "#FFFFFF",
      "align": "left"
    },
    "nivel_arbitragem": {
      "x": 545,
      "y": 905,
      "fontSize": 32,
      "fontFamily": "Arial",
      "fontWeight": "bold",
      "color": "#FFFFFF",
      "align": "center"
    },
    "validade": {
      "x": 545,
      "y": 1140,
      "fontSize": 28,
      "fontFamily": "Arial",
      "fontWeight": "bold",
      "color": "#FFFFFF",
      "align": "left"
    },
    "logo_academia": {
      "x": 230,
      "y": 180,
      "width": 120,
      "height": 120
    }
  }'::jsonb,
  true
) ON CONFLICT (template_type, template_name) DO NOTHING;

-- Template de Certificado de Graduação
INSERT INTO public.document_templates (
  template_type,
  template_name,
  background_url,
  output_format,
  width,
  height,
  field_config,
  is_active
) VALUES (
  'certificado',
  'Liga RS - Certificado 2026',
  'document-templates/certificado-fundo.png', -- Será atualizado após upload
  'pdf',
  1058, -- A4 landscape (aprox)
  794,
  '{
    "nome": {
      "x": 529,
      "y": 345,
      "fontSize": 48,
      "fontFamily": "Arial",
      "fontWeight": "bold",
      "color": "#FFFFFF",
      "align": "center",
      "maxWidth": 700
    },
    "graduacao": {
      "x": 529,
      "y": 480,
      "fontSize": 36,
      "fontFamily": "Arial",
      "color": "#FFFFFF",
      "align": "center",
      "maxWidth": 600
    },
    "ano": {
      "x": 950,
      "y": 130,
      "fontSize": 64,
      "fontFamily": "Arial",
      "fontWeight": "300",
      "color": "#FFFFFF",
      "align": "right"
    },
    "logo_academia": {
      "x": 880,
      "y": 520,
      "width": 140,
      "height": 140
    }
  }'::jsonb,
  true
) ON CONFLICT (template_type, template_name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. FUNÇÃO HELPER: Invalidar documentos antigos quando atleta atualiza
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION invalidate_athlete_documents()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando dados relevantes do atleta mudam, marcar documentos como não-current
  IF (OLD.nome_completo IS DISTINCT FROM NEW.nome_completo) OR
     (OLD.academias IS DISTINCT FROM NEW.academias) OR
     (OLD.data_nascimento IS DISTINCT FROM NEW.data_nascimento) OR
     (OLD.kyu_dan_id IS DISTINCT FROM NEW.kyu_dan_id) OR
     (OLD.nivel_arbitragem IS DISTINCT FROM NEW.nivel_arbitragem) OR
     (OLD.data_expiracao IS DISTINCT FROM NEW.data_expiracao) THEN
    
    UPDATE public.generated_documents
    SET is_current = false
    WHERE atleta_id = NEW.id AND is_current = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_athlete_documents
  AFTER UPDATE ON public.user_fed_lrsj
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_athlete_documents();

COMMENT ON FUNCTION invalidate_athlete_documents IS 'Invalida cache de documentos quando dados do atleta mudam';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
