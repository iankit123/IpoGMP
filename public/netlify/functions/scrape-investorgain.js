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
        
        if (status !== 200) {
            const errorText = await response.text();
            console.error('❌ API returned non-200 status:', status);
            console.error('❌ Response body:', errorText);
            throw new Error(`API returned status ${status}: ${errorText}`);
        }
        
        const json = await response.json();

        console.log('📡 API Response status:', status);
        console.log('📡 API Response keys:', Object.keys(json));
        console.log('📡 API Response sample (first 500 chars):', JSON.stringify(json).substring(0, 500));

        // Check for different possible response structures
        let rows = null;
        if (json.reportTableData) {
            rows = json.reportTableData;
        } else if (json.data) {
            rows = json.data;
        } else if (Array.isArray(json)) {
            rows = json;
        } else if (json.tableData) {
            rows = json.tableData;
        } else {
            console.error('❌ Unexpected API response structure:', JSON.stringify(json).substring(0, 1000));
            throw new Error(`Unexpected API response structure. Keys: ${Object.keys(json).join(', ')}`);
        }

        if (!rows || !Array.isArray(rows)) {
            console.error('❌ Rows is not an array:', typeof rows, rows);
            throw new Error(`Expected array of IPO data, got ${typeof rows}`);
        }

        console.log(`📊 Found ${rows.length} IPO records from API`);
        
        if (rows.length === 0) {
            console.warn('⚠️ API returned empty array. Full response:', JSON.stringify(json).substring(0, 2000));
        }

        // --- Clean text fields ---
        const clean = (str) =>
            typeof str === "string"
                ? str
                    .replace(/<[^>]+>/g, "")
                    .replace(/&#8377;/g, "₹")
                    .replace(/&.*?;/g, "")
                    .trim()
                : str || '';

        const ipoData = rows.map((r, index) => {
            try {
                // Log raw row data for first few records
                if (index < 3) {
                    console.log(`📋 Raw row ${index + 1} keys:`, Object.keys(r));
                    console.log(`📋 Raw row ${index + 1} sample:`, JSON.stringify(r).substring(0, 300));
                }
                
                // Helper function to handle date fields
                const parseDate = (dateStr) => {
                    const cleaned = clean(dateStr);
                    if (!cleaned || cleaned.trim() === '' || cleaned === '-' || cleaned === 'N/A') {
                        return null;
                    }
                    
                    // Convert "14-Oct" format to "YYYY-MM-DD" format for PostgreSQL DATE type
                    try {
                        // Parse "14-Oct" format
                        const match = cleaned.match(/(\d{1,2})-([A-Za-z]{3})/i);
                        if (match) {
                            const day = match[1].padStart(2, '0');
                            const monthName = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
                            
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
                        
                        // Try to parse other date formats (DD-MM-YYYY, YYYY-MM-DD, etc.)
                        const dateFormats = [
                            /(\d{2})-(\d{2})-(\d{4})/,  // DD-MM-YYYY
                            /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
                            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY or MM/DD/YYYY
                        ];
                        
                        for (const format of dateFormats) {
                            const match = cleaned.match(format);
                            if (match) {
                                // Try DD-MM-YYYY first
                                if (format === dateFormats[0]) {
                                    return `${match[3]}-${match[2]}-${match[1]}`;
                                }
                                // YYYY-MM-DD
                                if (format === dateFormats[1]) {
                                    return cleaned;
                                }
                                // DD/MM/YYYY
                                if (format === dateFormats[2]) {
                                    // Assume DD/MM/YYYY format
                                    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
                                }
                            }
                        }
                        
                        // If parsing fails, return null to avoid database errors
                        if (index < 5) {
                            console.warn(`⚠️ Could not parse date: ${cleaned} (row ${index + 1})`);
                        }
                        return null;
                    } catch (error) {
                        if (index < 5) {
                            console.error(`❌ Error parsing date ${cleaned}:`, error);
                        }
                        return null;
                    }
                };
                
                // Helper to safely parse numeric values
                const safeParseFloat = (value) => {
                    if (!value) return null;
                    const cleaned = clean(value);
                    if (!cleaned || cleaned === '-' || cleaned === 'N/A') return null;
                    const num = parseFloat(cleaned.replace(/[₹,]/g, ''));
                    return isNaN(num) ? null : num;
                };
                
                const safeParseInt = (value) => {
                    if (!value) return null;
                    const cleaned = clean(value);
                    if (!cleaned || cleaned === '-' || cleaned === 'N/A') return null;
                    const num = parseInt(cleaned.replace(/[₹,]/g, ''));
                    return isNaN(num) ? null : num;
                };
                
                // Parse GMP value and percentage
                const gmpStr = clean(r["GMP"] || r["GMP Value"] || '');
                let gmpValue = null;
                let gmpPercentage = null;
                
                if (gmpStr && gmpStr !== '-' && gmpStr !== 'N/A') {
                    // Try to extract percentage from string like "₹10 (5%)"
                    const percentMatch = gmpStr.match(/\((\d+(?:\.\d+)?)%\)/);
                    if (percentMatch) {
                        gmpPercentage = parseFloat(percentMatch[1]);
                    }
                    // Extract numeric value
                    gmpValue = safeParseFloat(gmpStr);
                }
                
                // Extract name with multiple fallback options
                const ipoName = clean(r["~ipo_name"] || r["IPO Name"] || r["Name"] || r["ipo_name"] || '');
                
                // Skip if name is empty
                if (!ipoName || ipoName.trim() === '') {
                    if (index < 5) {
                        console.warn(`⚠️ Skipping row ${index + 1}: empty name. Raw row:`, JSON.stringify(r).substring(0, 200));
                    }
                    return null;
                }
                
                const ipo = {
                    name: ipoName,
                    gmp_value: gmpValue,
                    gmp_percentage: gmpPercentage,
                    price: safeParseFloat(r["Price"] || r["Issue Price"] || r["price"] || ''),
                    ipo_size: safeParseFloat(r["IPO Size"] || r["Size"] || r["ipo_size"] || r["size"] || ''),
                    lot_size: safeParseInt(r["Lot"] || r["Lot Size"] || r["lot"] || r["lot_size"] || ''),
                    subscription_multiple: safeParseFloat(r["Sub"] || r["Subscription"] || r["sub"] || r["subscription"] || ''),
                    open_date: parseDate(r["Open"] || r["Open Date"] || r["open"] || r["open_date"] || ''),
                    close_date: parseDate(r["Close"] || r["Close Date"] || r["close"] || r["close_date"] || ''),
                    updated_on: new Date().toISOString(),
                    data_source: 'investorgain',
                    is_active: true
                };
                
                // Log first few records for debugging
                if (index < 3) {
                    console.log(`📋 Sample IPO ${index + 1}:`, JSON.stringify(ipo, null, 2));
                }
                
                return ipo;
            } catch (error) {
                console.error(`❌ Error parsing IPO row ${index}:`, error);
                console.error(`❌ Row data:`, r);
                return null;
            }
        }).filter(ipo => ipo !== null && ipo.name && ipo.name.trim() !== '');

        console.log(`✅ Successfully parsed ${ipoData.length} IPOs from API (from ${rows.length} raw rows)`);
        
        if (ipoData.length === 0 && rows.length > 0) {
            console.error('⚠️ All rows were filtered out!');
            console.error('⚠️ Sample raw row (first 3):');
            rows.slice(0, 3).forEach((row, idx) => {
                console.error(`   Row ${idx + 1}:`, JSON.stringify(row, null, 2).substring(0, 500));
            });
            console.error('⚠️ Checking field names in first row:', Object.keys(rows[0] || {}));
        }
        
        if (ipoData.length === 0 && rows.length === 0) {
            console.error('⚠️ API returned empty array. Full response structure:', JSON.stringify(json, null, 2).substring(0, 2000));
        }
        
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

