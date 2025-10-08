const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://jztpxmdiaqsafpzfcpib.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple web scraping function using fetch and DOMParser
async function scrapeInvestorGain() {
    try {
        console.log('Starting InvestorGain scraping...');
        
        // Fetch the InvestorGain page
        const response = await fetch('https://www.investorgain.com/report/live-ipo-gmp/331/all/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`Fetched HTML, length: ${html.length}`);
        
        // Parse HTML using DOMParser (available in Node.js 18+)
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // Find the table with IPO data
        const table = document.querySelector('table');
        if (!table) {
            throw new Error('No table found on the page');
        }
        
        const rows = table.querySelectorAll('tr');
        console.log(`Found ${rows.length} table rows`);
        
        const ipoData = [];
        
        // Skip header row and process data rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');
            
            if (cells.length < 3) continue;
            
            // Extract data using data-label attributes
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
            
            // Parse each cell
            cells.forEach(cell => {
                const dataLabel = cell.getAttribute('data-label')?.toLowerCase();
                const cellText = cell.textContent.trim();
                
                if (dataLabel === 'name') {
                    ipoInfo.name = cellText;
                } else if (dataLabel === 'gmp') {
                    const gmpMatch = cellText.match(/₹?(\d+(?:\.\d+)?)/);
                    if (gmpMatch) {
                        ipoInfo.gmp_value = parseFloat(gmpMatch[1]);
                    }
                    
                    const percentMatch = cellText.match(/\((\d+(?:\.\d+)?)%\)/);
                    if (percentMatch) {
                        ipoInfo.gmp_percentage = parseFloat(percentMatch[1]);
                    }
                } else if (dataLabel === 'price') {
                    const priceMatch = cellText.match(/₹?(\d+(?:\.\d+)?)/);
                    if (priceMatch) {
                        ipoInfo.price = parseFloat(priceMatch[1]);
                    }
                } else if (dataLabel === 'ipo size') {
                    const sizeMatch = cellText.match(/₹?(\d+(?:\.\d+)?)/);
                    if (sizeMatch) {
                        ipoInfo.ipo_size = parseFloat(sizeMatch[1]);
                    }
                } else if (dataLabel === 'lot') {
                    const lotMatch = cellText.match(/(\d+)/);
                    if (lotMatch) {
                        ipoInfo.lot_size = parseInt(lotMatch[1]);
                    }
                } else if (dataLabel === 'sub') {
                    const subMatch = cellText.match(/(\d+(?:\.\d+)?)x?/);
                    if (subMatch) {
                        ipoInfo.subscription_multiple = parseFloat(subMatch[1]);
                    }
                } else if (dataLabel === 'open') {
                    ipoInfo.open_date = cellText;
                } else if (dataLabel === 'close') {
                    ipoInfo.close_date = cellText;
                }
            });
            
            // Only add if we have a name
            if (ipoInfo.name && ipoInfo.name !== 'Loading...') {
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
