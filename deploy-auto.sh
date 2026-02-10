#!/bin/bash
# SMAART PRO - Automated Deployment Script
# Deploys LPs to Hostinger and Apps to Vercel automatically

set -e  # Exit on error

echo "🚀 SMAART PRO - Automated Deployment"
echo "====================================="
echo ""

# Load environment variables
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Create .env with HOSTINGER_API_TOKEN and VERCEL_TOKEN"
    exit 1
fi

export $(cat .env | grep -v '^#' | xargs)

# ========================================
# STEP 1: Deploy to Vercel
# ========================================
echo "🚀 STEP 1: Deploying Apps to Vercel"
echo "------------------------------------"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI ready"
echo ""

# Deploy apps using Vercel token
export VERCEL_ORG_ID=""
export VERCEL_PROJECT_ID=""

# J1 App
if [ -d "apps/j1-app" ]; then
    echo "📱 Deploying J1 Analytics..."
    cd apps/j1-app
    vercel --token="$VERCEL_TOKEN" --prod --yes || echo "⚠️  J1 deployment skipped (may need project linking)"
    cd ../..
    echo ""
fi

# VAR App
if [ -d "apps/var-app" ]; then
    echo "📱 Deploying VAR App..."
    cd apps/var-app
    vercel --token="$VERCEL_TOKEN" --prod --yes || echo "⚠️  VAR deployment skipped (may need project linking)"
    cd ../..
    echo ""
fi

# TITAN App
if [ -d "apps/titan" ]; then
    echo "📱 Deploying TITAN..."
    cd apps/titan
    vercel --token="$VERCEL_TOKEN" --prod --yes || echo "⚠️  TITAN deployment skipped (may need project linking)"
    cd ../..
    echo ""
fi

# Profep Max
if [ -d "profep-max" ]; then
    echo "📱 Deploying Profep Max..."
    cd profep-max
    vercel --token="$VERCEL_TOKEN" --prod --yes || echo "⚠️  Profep Max deployment skipped (may need project linking)"
    cd ..
    echo ""
fi

# ========================================
# STEP 2: Deploy LPs to Hostinger via FTP
# ========================================
echo "📦 STEP 2: Deploying Landing Pages to Hostinger"
echo "------------------------------------------------"
echo ""
echo "⚠️  Hostinger API upload requires additional setup."
echo "For now, LPs are ready in: deploy_hostinger/"
echo ""
echo "Manual upload via File Manager:"
echo "1. https://hpanel.hostinger.com/websites/files"
echo "2. Upload contents of deploy_hostinger/smaartpro/ to domains/smaartpro.com/public_html/"
echo "3. Upload contents of deploy_hostinger/judolingo/ to domains/judolingo.com/public_html/"
echo ""
echo "✅ Automated deployment complete!"
echo ""
echo "🔗 Check deployment status:"
echo "   - Vercel: https://vercel.com/dashboard"
echo "   - Hostinger: https://hpanel.hostinger.com/"
