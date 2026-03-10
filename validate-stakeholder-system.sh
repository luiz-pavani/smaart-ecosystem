#!/bin/bash

##############################################################################
# E2E Stakeholder System Validation Script
# Purpose: Quick automated checks after manual functional testing
# Usage: bash validate-stakeholder-system.sh
##############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Stakeholder System E2E Validation ===${NC}\n"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLI not found. Install: npm install -g @supabase/cli${NC}"
    exit 1
fi

# Check if we're linked to a Supabase project
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}✗ Not linked to any Supabase project${NC}"
    echo "Run: supabase link --project-ref YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI connected${NC}\n"

# Get project ref for queries
PROJECT_REF=$(supabase projects list --json | jq -r '.[0].ref' 2>/dev/null || echo "")
if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}✗ Could not detect project reference${NC}"
    exit 1
fi

echo -e "${BLUE}Project: $PROJECT_REF${NC}\n"

##############################################################################
# Validation 1: Check Migrations Applied
##############################################################################
echo -e "${BLUE}[1/5] Checking Migration Status...${NC}"

MIGRATIONS=$(supabase migration list --linked 2>/dev/null | grep -E "019|020|021|022|023" | wc -l)

if [ "$MIGRATIONS" -eq 5 ]; then
    echo -e "${GREEN}✓ All 5 stakeholder migrations present (019-023)${NC}"
    echo "  Status:"
    supabase migration list --linked | grep -E "019|020|021|022|023" || true
else
    echo -e "${RED}✗ Expected 5 migrations, found $MIGRATIONS${NC}"
    echo "  Run: supabase migration list --linked"
fi

echo ""

##############################################################################
# Validation 2: Check Gap Audit View
##############################################################################
echo -e "${BLUE}[2/5] Checking Stakeholder Link Gaps...${NC}"

# Create a temporary SQL file for the query
TEMP_SQL=$(mktemp)
cat > "$TEMP_SQL" << 'EOF'
SELECT 
  'federacoes' as table_name,
  COUNT(*) as total_records,
  COUNT(stakeholder_id) as with_stakeholder_id,
  COUNT(*) - COUNT(stakeholder_id) as missing_stakeholder_id
FROM federacoes
UNION ALL
SELECT 'academias',
  COUNT(*),
  COUNT(stakeholder_id),
  COUNT(*) - COUNT(stakeholder_id)
FROM academias
UNION ALL
SELECT 'atletas',
  COUNT(*),
  COUNT(stakeholder_id),
  COUNT(*) - COUNT(stakeholder_id)
FROM atletas;
EOF

# Execute query via psql (requires PGPASSWORD or .pgpass)
if command -v psql &> /dev/null; then
    echo "  Fetching gap statistics..."
    # Note: This requires database connection setup (omitted for safety)
    echo "  ⓘ Gap check requires database credentials. Run manually in Supabase Dashboard:"
    echo "    SELECT * FROM vw_stakeholder_link_gaps;"
else
    echo -e "${YELLOW}ⓘ Install psql to auto-check gaps (postgres client)${NC}"
fi

rm -f "$TEMP_SQL"
echo ""

##############################################################################
# Validation 3: Check Constraint Definitions
##############################################################################
echo -e "${BLUE}[3/5] Checking Constraint Hardening...${NC}"

cat > "$TEMP_SQL" << 'EOF'
SELECT 
  tc.constraint_name,
  tc.table_name,
  tc.constraint_type
FROM information_schema.constraint_column_usage ccu
JOIN information_schema.table_constraints tc 
  ON tc.table_name = ccu.table_name
WHERE tc.table_name IN ('federacoes', 'academias', 'atletas')
  AND tc.constraint_name LIKE '%stakeholder%'
ORDER BY tc.table_name;
EOF

echo "  Expected constraints:"
echo "    • ck_federacoes_stakeholder_required"
echo "    • ck_academias_stakeholder_required"  
echo "    • ck_atletas_stakeholder_required"
echo ""
echo "  ⓘ Verify via Supabase Dashboard > SQL Editor"

rm -f "$TEMP_SQL"
echo ""

##############################################################################
# Validation 4: Check RLS Policies
##############################################################################
echo -e "${BLUE}[4/5] Checking RLS Policies...${NC}"

cat > "$TEMP_SQL" << 'EOF'
SELECT 
  policyname as policy_name,
  action,
  permissive,
  roles,
  qual as policy_expression
FROM pg_policies 
WHERE tablename = 'stakeholders'
ORDER BY action;
EOF

echo "  Expected policies:"
echo "    • INSERT (SELECT, INSERT, UPDATE for auth.uid())"
echo "    • SELECT (for auth.uid())"
echo "    • UPDATE (for auth.uid())"
echo ""
echo "  ⓘ Verify via Supabase Dashboard > SQL Editor"

rm -f "$TEMP_SQL"
echo ""

##############################################################################
# Validation 5: Test Data Integrity
##############################################################################
echo -e "${BLUE}[5/5] Test Data Integrity Commands...${NC}"

echo "  Run these in Supabase Dashboard > SQL Editor to validate:"
echo ""
echo "  ${YELLOW}A) Check for test records created today:${NC}"
cat << 'EOF'
SELECT 
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_federacoes,
  COUNT(*) FILTER (WHERE stakeholder_id IS NOT NULL AND DATE(created_at) = CURRENT_DATE) as today_with_stakeholder
FROM federacoes;
EOF
echo ""

echo "  ${YELLOW}B) Check all records have stakeholder_id:${NC}"
cat << 'EOF'
SELECT 
  'federacoes' as table_name,
  COUNT(CASE WHEN stakeholder_id IS NULL THEN 1 END) as null_stakeholder_ids
FROM federacoes
UNION ALL
SELECT 'academias', COUNT(CASE WHEN stakeholder_id IS NULL THEN 1 END) FROM academias
UNION ALL  
SELECT 'atletas', COUNT(CASE WHEN stakeholder_id IS NULL THEN 1 END) FROM atletas;
EOF
echo ""

echo "  ${YELLOW}C) Verify stakeholder chain for your user:${NC}"
cat << 'EOF'
SELECT 
  s.id as stakeholder_id,
  s.email,
  COUNT(DISTINCT f.id) as federacoes_count,
  COUNT(DISTINCT a.id) as academias_count,
  COUNT(DISTINCT ath.id) as atletas_count
FROM stakeholders s
LEFT JOIN federacoes f ON f.stakeholder_id = s.id
LEFT JOIN academias a ON a.stakeholder_id = s.id
LEFT JOIN atletas ath ON ath.stakeholder_id = s.id
WHERE s.email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
GROUP BY s.id, s.email;
EOF
echo ""

##############################################################################
# Summary
##############################################################################
echo -e "${BLUE}=== Validation Complete ===${NC}\n"
echo -e "${GREEN}Checklist:${NC}"
echo "  ☐ All migrations 019-023 appear in 'supabase migration list --linked'"
echo "  ☐ vw_stakeholder_link_gaps shows 0 missing links for all tables"
echo "  ☐ All 3 CHECK constraints exist on federacoes/academias/atletas"
echo "  ☐ RLS policies active for stakeholders table"
echo "  ☐ Test records created today have non-NULL stakeholder_id"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Copy each SQL query above"
echo "  2. Paste in Supabase Dashboard > SQL Editor"
echo "  3. Execute and review results"
echo "  4. If all pass: system ready for production"
echo ""

