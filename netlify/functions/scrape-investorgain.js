const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://jztpxmdiaqsafpzfcpib.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple web scraping function using regex parsing (more reliable than jsdom)
async function scrapeInvestorGain() {
    try {
        console.log('🌐 Starting InvestorGain scraping...');
        
        // Fetch the InvestorGain page
        console.log('📡 Fetching InvestorGain page...');
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
        console.log(`📄 Fetched HTML, length: ${html.length}`);
        
        // Check if we got the expected content
        if (html.length < 1000) {
            console.log('⚠️ HTML content seems too short, first 500 chars:', html.substring(0, 500));
        }
        
        // Use regex to extract table data (more reliable than DOM parsing)
        const ipoData = [];
        
        // Find all table rows with data-label attributes
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
        const rows = html.match(rowRegex) || [];
        
        console.log(`🔍 Found ${rows.length} table rows`);
        
        // Log first few rows for debugging
        if (rows.length > 0) {
            console.log('🔍 First row sample:', rows[0].substring(0, 200));
        }
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Skip header rows
            if (row.includes('data-label="Name"') || row.includes('th>')) {
                console.log(`⏭️ Skipping header row ${i}`);
                continue;
            }
            
            // Extract data using regex patterns
            const ipoInfo = {
                name: null,
                gmp_value: null,
                gmp_percentage: null,
                price: null,
                ipo_size: null,
                lot_size: null,
                subscription_multiple: null,
                open_date: null,
                close_date: null,
                updated_on: new Date().toISOString(),
                data_source: 'investorgain',
                is_active: true
            };
            
            // Extract name
            const nameMatch = row.match(/data-label="Name"[^>]*>([^<]+)</);
            if (nameMatch) {
                ipoInfo.name = nameMatch[1].trim();
            }
            
            // Extract GMP value and percentage
            const gmpMatch = row.match(/data-label="GMP"[^>]*>([^<]+)</);
            if (gmpMatch) {
                const gmpText = gmpMatch[1].trim();
                const valueMatch = gmpText.match(/₹?(\d+(?:\.\d+)?)/);
                if (valueMatch) {
                    ipoInfo.gmp_value = parseFloat(valueMatch[1]);
                }
                
                const percentMatch = gmpText.match(/\((\d+(?:\.\d+)?)%\)/);
                if (percentMatch) {
                    ipoInfo.gmp_percentage = parseFloat(percentMatch[1]);
                }
            }
            
            // Extract price
            const priceMatch = row.match(/data-label="Price"[^>]*>([^<]+)</);
            if (priceMatch) {
                const priceText = priceMatch[1].trim();
                const valueMatch = priceText.match(/₹?(\d+(?:\.\d+)?)/);
                if (valueMatch) {
                    ipoInfo.price = parseFloat(valueMatch[1]);
                }
            }
            
            // Extract IPO size
            const sizeMatch = row.match(/data-label="IPO Size"[^>]*>([^<]+)</);
            if (sizeMatch) {
                const sizeText = sizeMatch[1].trim();
                const valueMatch = sizeText.match(/₹?(\d+(?:\.\d+)?)/);
                if (valueMatch) {
                    ipoInfo.ipo_size = parseFloat(valueMatch[1]);
                }
            }
            
            // Extract lot size
            const lotMatch = row.match(/data-label="Lot"[^>]*>([^<]+)</);
            if (lotMatch) {
                const lotText = lotMatch[1].trim();
                const valueMatch = lotText.match(/(\d+)/);
                if (valueMatch) {
                    ipoInfo.lot_size = parseInt(valueMatch[1]);
                }
            }
            
            // Extract subscription multiple
            const subMatch = row.match(/data-label="Sub"[^>]*>([^<]+)</);
            if (subMatch) {
                const subText = subMatch[1].trim();
                const valueMatch = subText.match(/(\d+(?:\.\d+)?)x?/);
                if (valueMatch) {
                    ipoInfo.subscription_multiple = parseFloat(valueMatch[1]);
                }
            }
            
            // Extract open date
            const openMatch = row.match(/data-label="Open"[^>]*>([^<]+)</);
            if (openMatch) {
                ipoInfo.open_date = openMatch[1].trim();
            }
            
            // Extract close date
            const closeMatch = row.match(/data-label="Close"[^>]*>([^<]+)</);
            if (closeMatch) {
                ipoInfo.close_date = closeMatch[1].trim();
            }
            
            // Only add if we have a name
            if (ipoInfo.name && ipoInfo.name !== 'Loading...' && ipoInfo.name.length > 0) {
                ipoData.push(ipoInfo);
                console.log(`✅ Parsed IPO ${ipoData.length}: ${ipoInfo.name}`);
            } else {
                console.log(`⏭️ Skipping row ${i} - no valid name found`);
            }
        }
        
        console.log(`📊 Successfully parsed ${ipoData.length} IPOs`);
        return ipoData;
        
    } catch (error) {
        console.error('❌ Error scraping InvestorGain:', error);
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
        
        // Scrape data from InvestorGain
        console.log('🌐 Starting web scraping...');
        const ipoData = await scrapeInvestorGain();
        console.log(`📊 Scraped ${ipoData.length} IPOs`);
        
        if (ipoData.length === 0) {
            console.log('⚠️ No IPO data found');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'No IPO data found',
                    count: 0
                }),
            };
        }
        
        // Clear existing data
        console.log('🗑️ Clearing existing data...');
        const { error: deleteError } = await supabase
            .from('ipo_investorgain')
            .delete()
            .neq('id', 0);
        
        if (deleteError) {
            console.error('❌ Error clearing existing data:', deleteError);
        } else {
            console.log('✅ Existing data cleared');
        }
        
        // Insert new data
        console.log('💾 Inserting new data...');
        const { data, error } = await supabase
            .from('ipo_investorgain')
            .insert(ipoData);
        
        if (error) {
            console.error('❌ Error inserting data:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to save data to database',
                    details: error.message
                }),
            };
        }
        
        console.log(`✅ Successfully saved ${ipoData.length} IPOs`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `InvestorGain data refreshed successfully! ${ipoData.length} IPOs updated.`,
                count: ipoData.length
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
