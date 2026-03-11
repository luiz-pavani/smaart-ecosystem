-- Migration 024: Remove overly restrictive UNIQUE constraints on stakeholder_id
-- 
-- Issue: Migration 019 created UNIQUE constraints preventing stakeholders from owning
-- multiple entities (e.g., can't own both a federation AND an academy).
-- 
-- Business Reality:
-- - A person can own multiple academies
-- - A federation president can also own/manage an academy
-- - A stakeholder should be allowed to have multiple roles across entities
--
-- Fix: Drop the UNIQUE indexes while keeping foreign key relationships intact

-- =====================================================
-- RESTORE MISSING TABLES (idempotent)
-- Migrations 001 and 006 are marked as applied but these tables
-- may be missing due to failed transactions. Create them if needed.
-- =====================================================

-- Ensure uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Restore user_roles table (from migration 001)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  federacao_id UUID REFERENCES federacoes(id) ON DELETE CASCADE,
  academia_id UUID REFERENCES academias(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role, federacao_id, academia_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_federacao ON user_roles(federacao_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_academia ON user_roles(academia_id);

DO $$
BEGIN
  ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Restore atletas table (from migration 006)
CREATE TABLE IF NOT EXISTS atletas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federacao_id UUID NOT NULL REFERENCES federacoes(id) ON DELETE CASCADE,
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE RESTRICT,
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  nome_completo VARCHAR(255),
  cpf VARCHAR(14) UNIQUE NOT NULL,
  rg VARCHAR(20),
  data_nascimento DATE NOT NULL,
  genero VARCHAR(20),
  user_id UUID UNIQUE,
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  cep VARCHAR(9),
  endereco VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  pais VARCHAR(100) DEFAULT 'Brasil',
  graduacao VARCHAR(50),
  dan_nivel VARCHAR(20),
  data_graduacao DATE,
  nivel_arbitragem VARCHAR(50),
  certificado_arbitragem_url TEXT,
  certificado_dan_url TEXT,
  numero_diploma_dan VARCHAR(50),
  foto_perfil_url TEXT,
  foto_documento_url TEXT,
  lote VARCHAR(20),
  numero_registro VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'ativo',
  status_pagamento VARCHAR(20) DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_atletas_federacao ON atletas(federacao_id);
CREATE INDEX IF NOT EXISTS idx_atletas_academia ON atletas(academia_id);
CREATE INDEX IF NOT EXISTS idx_atletas_cpf ON atletas(cpf);
CREATE INDEX IF NOT EXISTS idx_atletas_status ON atletas(status);
CREATE INDEX IF NOT EXISTS idx_atletas_lote ON atletas(lote);

DO $$
BEGIN
  ALTER TABLE atletas ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Restore assinaturas table (from migration 002)
CREATE TABLE IF NOT EXISTS assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  plan_name VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  safe2pay_subscription_id VARCHAR(100),
  valor DECIMAL(10,2),
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_academia ON assinaturas(academia_id);

DO $$
BEGIN
  ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =====================================================
-- Original migration 024 logic below
-- =====================================================

DROP INDEX IF EXISTS idx_federacoes_stakeholder_id_unique;
DROP INDEX IF EXISTS idx_academias_stakeholder_id_unique;
DROP INDEX IF EXISTS idx_atletas_stakeholder_id_unique;

-- Create regular (non-unique) indexes for query performance
-- These help with lookups without enforcing 1:1 relationships
CREATE INDEX IF NOT EXISTS idx_federacoes_stakeholder_id 
  ON federacoes(stakeholder_id) 
  WHERE stakeholder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_academias_stakeholder_id 
  ON academias(stakeholder_id) 
  WHERE stakeholder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atletas_stakeholder_id 
  ON atletas(stakeholder_id) 
  WHERE stakeholder_id IS NOT NULL;

-- Verification queries (run these after migration to validate)
-- SELECT 'Federações', COUNT(*) as total, COUNT(stakeholder_id) as with_stakeholder FROM federacoes
-- UNION ALL
-- SELECT 'Academias', COUNT(*), COUNT(stakeholder_id) FROM academias
-- UNION ALL
-- SELECT 'Atletas', COUNT(*), COUNT(stakeholder_id) FROM atletas;
