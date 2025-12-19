
const { createClient } = require('@supabase/supabase-js');

// Configuration from netlify/functions/scrape-investorgain.js
const supabaseUrl = process.env.SUPABASE_URL || 'https://jztpxmdiaqsafpzfcpib.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogic() {
    console.log('🔍 Testing Supabase Read Permissions...');

    // 1. Try to read existing data
    const { data: existingRows, error: fetchError } = await supabase
        .from('ipo_investorgain')
        .select('*')
        .ilike('name', '%MARC Technocrats%');

    if (fetchError) {
        console.error('❌ Error fetching existing data:', fetchError);
    } else {
        console.log(`✅ Fetched ${existingRows.length} records`);
        if (existingRows.length > 0) {
            console.log('📋 Record:', existingRows[0]);
            console.log('   Price:', existingRows[0].price);
            console.log('   Size:', existingRows[0].ipo_size);
        } else {
            console.warn('⚠️ No records found for MARC Technocrats. RLS might be hiding them, or they are missing.');
        }
    }

    // 2. Simulate the "New Data" which lacks price/size
    const newIpoData = [{
        name: 'MARC Technocrats NSE SME',
        price: null,
        ipo_size: null,
        updated_on: new Date().toISOString()
    }];

    console.log('\n🔄 Simulating Merge Logic...');

    // Create map of existing data (simulating the full fetch)
    const { data: allRows } = await supabase.from('ipo_investorgain').select('*');
    const existingMap = new Map();
    if (allRows) {
        allRows.forEach(row => {
            if (row.name) {
                existingMap.set(row.name.toLowerCase().trim(), row);
            }
        });
    }

    const mergedData = newIpoData.map(newIpo => {
        const normalizedName = newIpo.name.toLowerCase().trim();
        const existing = existingMap.get(normalizedName);

        if (existing) {
            console.log(`   Found existing record for ${newIpo.name}`);
            if (!newIpo.price && existing.price) {
                newIpo.price = existing.price;
                console.log(`   ✅ Preserved price: ${newIpo.price}`);
            } else {
                console.log(`   ❌ Price not preserved. New: ${newIpo.price}, Existing: ${existing.price}`);
            }

            if (!newIpo.ipo_size && existing.ipo_size) {
                newIpo.ipo_size = existing.ipo_size;
                console.log(`   ✅ Preserved size: ${newIpo.ipo_size}`);
            }
        } else {
            console.log(`   ⚠️ No existing record found in map for ${normalizedName}`);
        }
        return newIpo;
    });
}

testLogic();
