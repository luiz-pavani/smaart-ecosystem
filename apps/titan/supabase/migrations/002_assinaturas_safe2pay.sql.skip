-- Tabela de Assinaturas Recorrentes
CREATE TABLE IF NOT EXISTS assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  id_subscription TEXT NOT NULL UNIQUE, -- ID do Safe2Pay
  valor DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'expirado')),
  tipo TEXT NOT NULL CHECK (tipo IN ('mensal', 'trimestral', 'anual')),
  data_inicio TIMESTAMP NOT NULL DEFAULT now(),
  data_proxima_cobranca TIMESTAMP,
  data_cancelamento TIMESTAMP,
  eventos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_assinaturas_atleta_id ON assinaturas(atleta_id);
CREATE INDEX idx_assinaturas_academia_id ON assinaturas(academia_id);
CREATE INDEX idx_assinaturas_id_subscription ON assinaturas(id_subscription);
CREATE INDEX idx_assinaturas_status ON assinaturas(status);

-- Tabela de Logs de Webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'safe2pay', 'stripe', etc.
  event_type TEXT NOT NULL,
  subscription_id TEXT,
  payload JSONB NOT NULL,
  action_taken TEXT,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_subscription_id ON webhook_logs(subscription_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);

-- Adicionar coluna subscription_id na tabela pedidos (se não existir)
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS subscription_id TEXT REFERENCES assinaturas(id_subscription) ON DELETE SET NULL;

CREATE INDEX idx_pedidos_subscription_id ON pedidos(subscription_id);

-- Comentários para documentação
COMMENT ON TABLE assinaturas IS 'Registra assinaturas recorrentes criadas via Safe2Pay';
COMMENT ON COLUMN assinaturas.id_subscription IS 'ID único da assinatura no Safe2Pay';
COMMENT ON COLUMN assinaturas.status IS 'Status da assinatura: ativo, suspenso, cancelado, expirado';
COMMENT ON COLUMN assinaturas.eventos IS 'Array JSON de eventos (created, renewed, failed, canceled, expired)';
COMMENT ON TABLE webhook_logs IS 'Log de todos os webhooks recebidos de provedores de pagamento';
