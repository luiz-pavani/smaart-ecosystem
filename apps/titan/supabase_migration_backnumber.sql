-- Migration: Backnumber fields for user_fed_lrsj
-- Run via: Supabase Dashboard > SQL Editor, or supabase db push
-- Date: 2026-03-23

-- Sigla da academia para exibição no backnumber (ex: "CJU")
-- Quando vazio, o sistema faz fallback para academias.sigla
ALTER TABLE user_fed_lrsj
  ADD COLUMN IF NOT EXISTS siglas text;

-- Cor do topo do backnumber: 'azul' (#0030a4) ou 'rosa' (#b751b8)
-- Padrão azul. Rosa disponível apenas para tamanho P.
ALTER TABLE user_fed_lrsj
  ADD COLUMN IF NOT EXISTS cor_patch text DEFAULT 'azul'
    CHECK (cor_patch IN ('azul', 'rosa'));

-- tamanho_patch: 'P' (28x28cm) | 'M' (34x34cm) | 'G' (41x41cm)
-- Adicionar apenas se ainda não existir
ALTER TABLE user_fed_lrsj
  ADD COLUMN IF NOT EXISTS tamanho_patch text DEFAULT 'P'
    CHECK (tamanho_patch IN ('P', 'M', 'G'));

-- Índice opcional para queries de geração em lote
CREATE INDEX IF NOT EXISTS idx_user_fed_lrsj_tamanho_patch
  ON user_fed_lrsj (tamanho_patch);

-- Após adicionar colunas, cadastre os templates de fundo em document_templates:
--
-- INSERT INTO document_templates (template_type, background_url, is_active, created_at)
-- VALUES
--   ('backnumber_azul', '<URL_DO_FUNDO_AZUL_NO_STORAGE>', true, now()),
--   ('backnumber_rosa', '<URL_DO_FUNDO_ROSA_NO_STORAGE>', true, now());
--
-- Faça upload dos templates PNG para:
--   Supabase Storage > bucket "documents" (ou "templates")
--   Nomeie como: backnumber-fundo-azul.png  /  backnumber-fundo-rosa.png
