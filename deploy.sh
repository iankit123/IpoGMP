#!/bin/bash

# IPO GMP Tracker - Deployment Script
# This script helps deploy the app to Supabase + Netlify

echo "🚀 IPO GMP Tracker Deployment Script"
echo "====================================="

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    else
        echo "✅ $1 is installed"
    fi
}

echo "📋 Checking required tools..."
check_tool "node"
check_tool "npm"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "📦 Installing Supabase CLI..."
    npm install -g supabase
else
    echo "✅ Supabase CLI is installed"
fi

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
else
    echo "✅ Netlify CLI is installed"
fi

echo ""
echo "🔧 Setup Instructions:"
echo "======================"

echo ""
echo "1. 📊 Supabase Setup:"
echo "   - Go to https://supabase.com"
echo "   - Create a new project"
echo "   - Run the SQL script from supabase_setup.sql"
echo "   - Deploy the Edge Function:"
echo "     supabase functions deploy scrape-ipos"

echo ""
echo "2. 🌐 Netlify Deployment:"
echo "   - Option A: Drag and drop the 'public' folder to Netlify"
echo "   - Option B: Connect your GitHub repository"
echo "   - Option C: Use Netlify CLI:"
echo "     netlify deploy --prod --dir=public"

echo ""
echo "3. ⚙️  Configuration:"
echo "   - Update Supabase credentials in public/app.js"
echo "   - Set environment variables in Netlify dashboard"
echo "   - Test PWA functionality in browser"

echo ""
echo "4. 🧪 Testing:"
echo "   - Test PWA installation"
echo "   - Test push notifications"
echo "   - Test offline functionality"

echo ""
echo "📁 Project Structure:"
echo "===================="
echo "├── public/                 # Frontend files for Netlify"
echo "│   ├── index.html         # Main HTML file"
echo "│   ├── app.js             # Frontend JavaScript"
echo "│   ├── manifest.json      # PWA manifest"
echo "│   ├── sw.js              # Service worker"
echo "│   └── icons/             # PWA icons"
echo "├── supabase-functions/    # Supabase Edge Functions"
echo "│   └── scrape-ipos/       # IPO scraping function"
echo "├── supabase_setup.sql     # Database setup script"
echo "├── netlify.toml           # Netlify configuration"
echo "└── README.md              # This file"

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Follow the setup instructions above"
echo "2. Test your deployment"
echo "3. Share your PWA with users!"

echo ""
echo "✨ Happy coding!"
