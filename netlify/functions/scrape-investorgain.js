const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://jztpxmdiaqsafpzfcpib.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Temporary solution: Return mock data while we work on the Python API deployment
async function scrapeInvestorGain() {
    try {
        console.log('🌐 Starting InvestorGain scraping (temporary mock)...');
        
        // For now, return a mock response indicating the issue
        // This will help us test the UI integration while we work on the real solution
        console.log('⚠️ Using temporary mock response - InvestorGain requires dynamic content loading');
        
        return {
            success: true,
            count: 0,
            message: 'InvestorGain scraping temporarily unavailable - requires dynamic content loading. Working on solution...'
        };
        
    } catch (error) {
        console.error('❌ Error in mock scraper:', error);
        console.error('❌ Error stack:', error.stack);
        throw error;
    }
}

exports.handler = async (event, context) => {
    console.log('🚀 Netlify function started');
    console.log('📋 Event:', JSON.stringify(event, null, 2));
    console.log('📋 Context:', JSON.stringify(context, null, 2));
    
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        console.log('✅ Handling OPTIONS request');
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }
    
    try {
        console.log('🔄 InvestorGain scraping function called');
        console.log('📡 HTTP Method:', event.httpMethod);
        console.log('📡 Headers:', event.headers);
        
        // Check if Supabase client is properly initialized
        console.log('🔍 Supabase URL:', supabaseUrl);
        console.log('🔍 Supabase Key length:', supabaseKey ? supabaseKey.length : 'undefined');
        
        // Call Python API to scrape data
        console.log('🌐 Starting web scraping via Python API...');
        const result = await scrapeInvestorGain();
        console.log(`📊 Python API result:`, result);
        
        if (!result.success) {
            console.log('⚠️ Python API failed');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Python API failed to scrape data',
                    count: 0
                }),
            };
        }
        
        console.log(`✅ Python API successfully processed ${result.count} IPOs`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: result.message || `InvestorGain data refreshed successfully! ${result.count} IPOs updated.`,
                count: result.count
            }),
        };
        
    } catch (error) {
        console.error('❌ Function error:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to refresh InvestorGain data',
                details: error.message,
                stack: error.stack
            }),
        };
    }
};
