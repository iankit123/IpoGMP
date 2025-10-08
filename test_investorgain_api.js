#!/usr/bin/env node

// Test script to check the InvestorGain API endpoint
async function testInvestorGainAPI() {
    try {
        console.log('🌐 Testing InvestorGain API endpoint...');
        
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
            console.error('❌ Unexpected API response:', json);
            return;
        }

        const rows = json.reportTableData;
        console.log(`📊 Found ${rows.length} IPO records from API`);

        // Show first few records
        console.log('📋 First 3 records:');
        rows.slice(0, 3).forEach((row, index) => {
            console.log(`\n--- Record ${index + 1} ---`);
            console.log('Name:', row["~ipo_name"]);
            console.log('GMP:', row["GMP"]);
            console.log('Price:', row["Price"]);
            console.log('Open:', row["Open"]);
            console.log('Close:', row["Close"]);
            console.log('Listing:', row["Listing"]);
            console.log('Category:', row["~IPO_Category"]);
        });

        // Test cleaning function
        const clean = (str) =>
            typeof str === "string"
                ? str
                    .replace(/<[^>]+>/g, "")
                    .replace(/&#8377;/g, "₹")
                    .replace(/&.*?;/g, "")
                    .trim()
                : str;

        console.log('\n🧹 Testing cleaning function:');
        console.log('Original GMP:', rows[0]["GMP"]);
        console.log('Cleaned GMP:', clean(rows[0]["GMP"]));

    } catch (error) {
        console.error('❌ Error testing API:', error);
    }
}

testInvestorGainAPI();
