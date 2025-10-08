const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://jztpxmdiaqsafpzfcpib.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple web scraping function using regex parsing (more reliable than jsdom)
async function scrapeInvestorGain() {
    try {
        console.log('Starting InvestorGain scraping...');
        
        // Fetch the InvestorGain page
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`Fetched HTML, length: ${html.length}`);
        
        // Use regex to extract table data (more reliable than DOM parsing)
        const ipoData = [];
        
        // Find all table rows with data-label attributes
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
        const rows = html.match(rowRegex) || [];
        
        console.log(`Found ${rows.length} table rows`);
        
        for (const row of rows) {
            // Skip header rows
            if (row.includes('data-label="Name"') || row.includes('th>')) {
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
            }
        }
        
        console.log(`Parsed ${ipoData.length} IPOs`);
        return ipoData;
        
    } catch (error) {
        console.error('Error scraping InvestorGain:', error);
        throw error;
    }
}

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }
    
    try {
        console.log('InvestorGain scraping function called');
        
        // Scrape data from InvestorGain
        const ipoData = await scrapeInvestorGain();
        
        if (ipoData.length === 0) {
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
        const { error: deleteError } = await supabase
            .from('ipo_investorgain')
            .delete()
            .neq('id', 0);
        
        if (deleteError) {
            console.error('Error clearing existing data:', deleteError);
        }
        
        // Insert new data
        const { data, error } = await supabase
            .from('ipo_investorgain')
            .insert(ipoData);
        
        if (error) {
            console.error('Error inserting data:', error);
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
        
        console.log(`Successfully saved ${ipoData.length} IPOs`);
        
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
        console.error('Function error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to refresh InvestorGain data',
                details: error.message
            }),
        };
    }
};
