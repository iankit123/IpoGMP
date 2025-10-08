#!/usr/bin/env node

// Test script to check what HTML we get from InvestorGain
async function testInvestorGainHTML() {
    try {
        console.log('🌐 Testing InvestorGain HTML structure...');
        
        const response = await fetch('https://www.investorgain.com/report/live-ipo-gmp/331/all/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`📄 HTML length: ${html.length}`);
        
        // Check for common patterns
        console.log('🔍 Checking for table patterns...');
        console.log('Has <table>:', html.includes('<table'));
        console.log('Has data-label:', html.includes('data-label'));
        console.log('Has tr tags:', html.includes('<tr'));
        console.log('Has td tags:', html.includes('<td'));
        
        // Look for specific data-label patterns
        const nameLabels = html.match(/data-label="[^"]*[Nn]ame[^"]*"/g) || [];
        const gmpLabels = html.match(/data-label="[^"]*[Gg][Mm][Pp][^"]*"/g) || [];
        const priceLabels = html.match(/data-label="[^"]*[Pp]rice[^"]*"/g) || [];
        
        console.log('📊 Found data-label patterns:');
        console.log('Name labels:', nameLabels);
        console.log('GMP labels:', gmpLabels);
        console.log('Price labels:', priceLabels);
        
        // Check for table structure
        const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/g) || [];
        console.log(`📋 Found ${tableMatches.length} tables`);
        
        if (tableMatches.length > 0) {
            console.log('📋 First table sample:', tableMatches[0].substring(0, 500));
        }
        
        // Check for IPO-related content
        const ipoKeywords = ['IPO', 'GMP', 'Grey Market', 'Premium', 'Subscription'];
        for (const keyword of ipoKeywords) {
            const count = (html.match(new RegExp(keyword, 'gi')) || []).length;
            console.log(`🔍 "${keyword}" appears ${count} times`);
        }
        
        // Save HTML to file for inspection
        const fs = require('fs');
        fs.writeFileSync('investorgain_debug.html', html);
        console.log('💾 HTML saved to investorgain_debug.html for inspection');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testInvestorGainHTML();
