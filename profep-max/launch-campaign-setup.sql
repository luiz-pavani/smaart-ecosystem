-- 🚀 CAMPANHA DE LANÇAMENTO - SETUP COMPLETO
-- Desconto: R$ 10 OFF PERMANENTE (R$ 59,90 → R$ 49,90/mês)
-- Público: Leads de publicidade
-- Rastreamento: Sim (aberturas, cliques, conversões)

-- ============================================
-- 1. CRIAR TABELA DE LEADS DA CAMPANHA
-- ============================================
CREATE TABLE IF NOT EXISTS launch_campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  source VARCHAR(100) DEFAULT 'advertising', -- origin: google_ads, facebook, tiktok, etc
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, opened, clicked, converted, bounced
  
  -- Rastreamento de envios
  email_sent_at timestamptz,
  email_opened_at timestamptz,
  email_clicked_at timestamptz,
  conversion_at timestamptz,
  
  -- Tracking ID para URLs
  tracking_id VARCHAR(100) UNIQUE DEFAULT gen_random_uuid()::text,
  
  -- Metadata
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  notes TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_launch_campaign_email ON launch_campaign_leads(email);
CREATE INDEX IF NOT EXISTS idx_launch_campaign_status ON launch_campaign_leads(status);
CREATE INDEX IF NOT EXISTS idx_launch_campaign_sent_at ON launch_campaign_leads(email_sent_at);
CREATE INDEX IF NOT EXISTS idx_launch_campaign_tracking_id ON launch_campaign_leads(tracking_id);

-- ============================================
-- 2. TRIGGER PARA ATUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_launch_campaign_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_launch_campaign_updated_at_trigger ON launch_campaign_leads;
CREATE TRIGGER update_launch_campaign_updated_at_trigger
BEFORE UPDATE ON launch_campaign_leads
FOR EACH ROW
EXECUTE FUNCTION update_launch_campaign_updated_at();

-- ============================================
-- 3. RLS POLICIES (Row Level Security)
-- ============================================
ALTER TABLE launch_campaign_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Service role pode fazer tudo
CREATE POLICY "Enable all for service role" ON launch_campaign_leads
  AS PERMISSIVE FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 4. ESTATÍSTICAS INICIAL (VIEW)
-- ============================================
CREATE OR REPLACE VIEW launch_campaign_stats AS
SELECT
  COUNT(*) as total_leads,
  COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as sent_count,
  COUNT(CASE WHEN email_opened_at IS NOT NULL THEN 1 END) as opened_count,
  COUNT(CASE WHEN email_clicked_at IS NOT NULL THEN 1 END) as clicked_count,
  COUNT(CASE WHEN conversion_at IS NOT NULL THEN 1 END) as converted_count,
  
  -- Taxas
  ROUND(100.0 * COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 2) as sent_rate,
  ROUND(100.0 * COUNT(CASE WHEN email_opened_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END), 0), 2) as open_rate,
  ROUND(100.0 * COUNT(CASE WHEN email_clicked_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END), 0), 2) as click_rate,
  ROUND(100.0 * COUNT(CASE WHEN conversion_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END), 0), 2) as conversion_rate
FROM launch_campaign_leads;

-- ============================================
-- 5. VALIDAR TABELA CRIADA
-- ============================================
-- Descomente a linha abaixo para validar
-- SELECT * FROM launch_campaign_stats;
