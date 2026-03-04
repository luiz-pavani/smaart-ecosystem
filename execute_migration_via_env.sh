#!/bin/bash

# Get the database URL from environment or supabase config
DB_URL="postgresql://postgres.gsbnunyxvfguzn:$(security find-generic-password -w -s "supabase-password" 2>/dev/null || echo "unknown")@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Try to execute the migration via PSQL
psql "$DB_URL" << SQL_SCRIPT
UPDATE public.document_templates
SET field_config = jsonb_set(
  field_config,
  '{width}',
  '9000'
)
WHERE template_type = 'identidade';
SQL_SCRIPT

echo "Migration execution completed"
