#!/bin/bash

# Quick Deployment Script for IPO GMP Tracker
# This deploys everything automatically

echo "🚀 IPO GMP Tracker - Complete Deployment"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "📦 Installing Supabase CLI..."
    npm install -g supabase
fi

# Login to Supabase
echo "🔐 Logging in to Supabase..."
supabase login

# Link project
echo "🔗 Linking Supabase project..."
supabase link --project-ref jztpxmdiaqsafpzfcpib

# Deploy Edge Function
echo "🚀 Deploying Edge Function..."
supabase functions deploy scrape-ipos

echo ""
echo "✅ Edge Function deployed successfully!"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Set up Cron Job in Supabase:"
echo "   - Go to Supabase Dashboard → SQL Editor"
echo "   - Run the SQL from COMPLETE_FREE_DEPLOYMENT.md"
echo ""
echo "2. Deploy Frontend to Netlify:"
echo "   - Go to netlify.com"
echo "   - Drag the 'public/' folder"
echo ""
echo "3. Test the Edge Function:"
echo "   curl -X POST https://jztpxmdiaqsafpzfcpib.supabase.co/functions/v1/scrape-ipos \\"
echo "     -H \"Authorization: Bearer YOUR_ANON_KEY\""
echo ""
echo "🎉 Your app will now update automatically every day!"
echo ""
