const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://jztpxmdiaqsafpzfcpib.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Real InvestorGain API scraper
async function scrapeInvestorGain() {
    try {
        console.log('🌐 Starting InvestorGain API scraping...');
        
        // --- Compute dynamic financial year ---
        const now = new Date();
        const year = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
        const fyEnd = String(year + 1).slice(-2);
        const financialYear = `${year}-${fyEnd}`;

        // --- Random cache buster ---
        const v = `15-${Math.floor(40 + Math.random() * 60)}`;

        const url = `https://webnodejs.investorgain.com/cloud/report/data-read/331/1/10/${year}/${financialYear}/0/all?search=&v=${v}`;

        console.log('📡 Fetching from InvestorGain API:', url);

        const headers = {
            "accept": "application/json, text/plain, */*",
            "origin": "https://www.investorgain.com",
            "referer": "https://www.investorgain.com/",
            "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
        };

        const response = await fetch(url, { headers });
        const status = response.status;
        const json = await response.json();

        console.log('📡 API Response status:', status);
        console.log('📡 API Response keys:', Object.keys(json));

        if (status !== 200 || !json.reportTableData) {
            throw new Error(`Unexpected API response: ${status}, data: ${JSON.stringify(json)}`);
        }

        const rows = json.reportTableData;
        console.log(`📊 Found ${rows.length} IPO records from API`);

        // --- Clean text fields ---
        const clean = (str) =>
            typeof str === "string"
                ? str
                    .replace(/<[^>]+>/g, "")
                    .replace(/&#8377;/g, "₹")
                    .replace(/&.*?;/g, "")
                    .trim()
                : str;

        const ipoData = rows.map((r, index) => {
            try {
                // Helper function to handle date fields
                const parseDate = (dateStr) => {
                    const cleaned = clean(dateStr);
                    if (!cleaned || cleaned.trim() === '') {
                        return null;
                    }
                    
                    // Convert "14-Oct" format to "YYYY-MM-DD" format for PostgreSQL DATE type
                    try {
                        // Parse "14-Oct" format
                        const match = cleaned.match(/(\d{1,2})-([A-Za-z]{3})/);
                        if (match) {
                            const day = match[1].padStart(2, '0');
                            const monthName = match[2];
                            
                            // Map month names to numbers
                            const monthMap = {
                                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                            };
                            
                            const month = monthMap[monthName];
                            if (month) {
                                const currentYear = new Date().getFullYear();
                                return `${currentYear}-${month}-${day}`;
                            }
                        }
                        
                        // If parsing fails, return null to avoid database errors
                        console.warn(`⚠️ Could not parse date: ${cleaned}`);
                        return null;
                    } catch (error) {
                        console.error(`❌ Error parsing date ${cleaned}:`, error);
                        return null;
                    }
                };
                
                const ipo = {
                    name: clean(r["~ipo_name"]),
                    gmp_value: parseFloat(clean(r["GMP"]).replace(/[₹,]/g, '')) || null,
                    gmp_percentage: parseFloat(clean(r["GMP"]).match(/\((\d+(?:\.\d+)?)%\)/)?.[1]) || null,
                    price: parseFloat(clean(r["Price"]).replace(/[₹,]/g, '')) || null,
                    ipo_size: parseFloat(clean(r["IPO Size"]).replace(/[₹,]/g, '')) || null,
                    lot_size: parseInt(clean(r["Lot"])) || null,
                    subscription_multiple: parseFloat(clean(r["Sub"]).replace('x', '')) || null,
                    open_date: parseDate(r["Open"]),
                    close_date: parseDate(r["Close"]),
                    updated_on: new Date().toISOString(),
                    data_source: 'investorgain',
                    is_active: true
                };
                
                // Log first few records for debugging
                if (index < 3) {
                    console.log(`📋 Sample IPO ${index + 1}:`, ipo);
                }
                
                return ipo;
            } catch (error) {
                console.error(`❌ Error parsing IPO row ${index}:`, error);
                console.error(`❌ Row data:`, r);
                return null;
            }
        }).filter(ipo => ipo !== null && ipo.name && ipo.name.trim() !== '');

        console.log(`✅ Successfully parsed ${ipoData.length} IPOs from API`);
        return ipoData;
        
    } catch (error) {
        console.error('❌ Error scraping InvestorGain API:', error);
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
        
        // Scrape data from InvestorGain API
        console.log('🌐 Starting InvestorGain API scraping...');
        const ipoData = await scrapeInvestorGain();
        console.log(`📊 Scraped ${ipoData.length} IPOs from API`);
        
        if (ipoData.length === 0) {
            console.log('⚠️ No IPO data found from API');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'No IPO data found from InvestorGain API',
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
        
        console.log(`✅ Successfully saved ${ipoData.length} IPOs to Supabase`);
        
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
