#!/bin/bash
# SMAART PRO Ecosystem - Quick Deploy Script
# Run this script to deploy all landing pages and apps

echo "🚀 SMAART PRO Ecosystem Deployment"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -d "lp" ] || [ ! -d "apps" ]; then
    echo "❌ Error: Run this script from the smaart-ecosystem root directory"
    exit 1
fi

echo "📦 Step 1: Deploy Landing Pages to Hostinger"
echo "--------------------------------------------"
echo "✅ Deployment packages created in: deploy_hostinger/"
echo ""
echo "📥 Upload Instructions:"
echo "1. Go to Hostinger File Manager: https://hpanel.hostinger.com/websites/files"
echo "2. Navigate to domains/smaartpro.com/public_html/"
echo "3. Upload: deploy_hostinger/smaartpro_landing_pages.zip"
echo "4. Extract the zip file"
echo "5. Move contents of 'smaartpro' folder to public_html root"
echo ""
echo "For Judolingo (judolingo.com):"
echo "1. Navigate to domains/judolingo.com/public_html/lp/"
echo "2. Upload: deploy_hostinger/judolingo_landing_page.zip"
echo "3. Extract the zip file"
echo ""
read -p "Press ENTER when Hostinger upload is complete..."

echo ""
echo "🚀 Step 2: Deploy Apps to Vercel"
echo "--------------------------------------------"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
else
    echo "✅ Vercel CLI found"
fi

read -p "Deploy J1 Analytics to Vercel? (y/n): " deploy_j1
if [ "$deploy_j1" = "y" ]; then
    echo "📱 Deploying J1 Analytics..."
    cd apps/j1-app
    vercel --prod
    cd ../..
    echo "✅ J1 Analytics deployed!"
fi

read -p "Deploy TITAN to Vercel? (y/n): " deploy_titan
if [ "$deploy_titan" = "y" ]; then
    echo "🏢 Deploying TITAN..."
    cd apps/titan
    vercel --prod
    cd ../..
    echo "✅ TITAN deployed!"
fi

read -p "Deploy Profep Max to Vercel? (y/n): " deploy_profep
if [ "$deploy_profep" = "y" ]; then
    echo "📚 Deploying Profep Max..."
    cd profep-max
    vercel --prod
    cd ../..
    echo "✅ Profep Max deployed!"
fi

echo ""
echo "✅ Deployment Complete!"
echo "======================="
echo ""
echo "🌐 Verify Deployments:"
echo "- Master LP: https://smaartpro.com"
echo "- VAR LP: https://smaartpro.com/var/"
echo "- VAR App: https://smaartpro.com/varapp/"
echo "- J1 LP: https://smaartpro.com/j1/"
echo "- J1 App: https://j1.smaartpro.com"
echo "- TITAN LP: https://smaartpro.com/titan/"
echo "- TITAN App: https://titan.smaartpro.com"
echo "- Judolingo: https://judolingo.com"
echo "- Profep Max: https://profepmax.com.br"
echo ""
echo "📖 Full deployment guide: DEPLOYMENT.md"
