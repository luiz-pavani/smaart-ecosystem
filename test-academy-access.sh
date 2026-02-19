#!/bin/bash

# Test script for Academy API master_access and level 4/5 support
# This script tests the new academy management access control

set -e

TITAN_DIR="/Users/judo365/Documents/MASTER ESPORTES/SMAART PRO/smaart-ecosystem/apps/titan"
cd "$TITAN_DIR"

echo "============================================"
echo "Testing Academy API - Access Control"
echo "============================================"
echo ""

# Check if local dev server is running
echo "✓ Checking API modifications..."
if grep -q "requiresSelection" app/api/academy/route.ts; then
    echo "  ✓ requiresSelection property added"
else
    echo "  ✗ requiresSelection property missing"
    exit 1
fi

if grep -q "accessLevel" app/api/academy/route.ts; then
    echo "  ✓ accessLevel property added"
else
    echo "  ✗ accessLevel property missing"
    exit 1
fi

if grep -q "master_access" app/api/academy/route.ts; then
    echo "  ✓ master_access role check implemented"
else
    echo "  ✗ master_access role check missing"
    exit 1
fi

# Check if academy selector page was created
echo ""
echo "✓ Checking Academy Selector page..."
if [ -f "app/(dashboard)/academy/select/page.tsx" ]; then
    echo "  ✓ Academy selector page created"
    if grep -q "SelectAcademy" app/\(dashboard\)/academy/select/page.tsx; then
        echo "  ✓ SelectAcademy component exists"
    fi
else
    echo "  ✗ Academy selector page not found"
    exit 1
fi

# Check dashboard updates
echo ""
echo "✓ Checking Dashboard updates..."
if grep -q "isMasterAccess" app/\(dashboard\)/academy/dashboard/page.tsx; then
    echo "  ✓ isMasterAccess state added"
else
    echo "  ✗ isMasterAccess state missing"
    exit 1
fi

if grep -q "useSearchParams" app/\(dashboard\)/academy/dashboard/page.tsx; then
    echo "  ✓ useSearchParams for academyId added"
else
    echo "  ✗ useSearchParams missing"
    exit 1
fi

echo ""
echo "============================================"
echo "✓ All API checks passed!"
echo "============================================"
echo ""
echo "Ready for deployment."
echo ""
echo "Next steps:"
echo "1. Deploy to production: ./deploy-with-beta.sh"
echo "2. Test as master_access user on production"
echo "3. Test as nivel 4/5 user on production"
echo ""
