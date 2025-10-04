// Automated IPO Scraper for Supabase
// This script scrapes ipowatch.in and updates Supabase automatically

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://jztpxmdiaqsafpzfcpib.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU'

const supabase = createClient(supabaseUrl, supabaseKey)

// Fetch and parse ipowatch.in
async function scrapeIPOData() {
  try {
    console.log('🔍 Fetching data from ipowatch.in GMP page...')
    
    const response = await fetch('https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }
    
    const html = await response.text()
    console.log(`✅ Fetched HTML (${html.length} bytes)`)
    
    // Parse HTML using regex (simple but effective)
    const ipos = parseHTML(html)
    console.log(`📊 Parsed ${ipos.length} IPOs`)
    
    return ipos
  } catch (error) {
    console.error('❌ Error scraping data:', error)
    throw error
  }
}

// Parse HTML to extract IPO data
function parseHTML(html) {
  const ipos = []
  
  // Find all table rows (skip header row)
  const tableRegex = /<tr[^>]*>(.*?)<\/tr>/gis
  const matches = html.matchAll(tableRegex)
  
  let isFirstRow = true
  
  for (const match of matches) {
    const rowHTML = match[1]
    
    // Skip header row (contains <strong>)
    if (isFirstRow || rowHTML.includes('<strong>Stock / IPO</strong>')) {
      isFirstRow = false
      continue
    }
    
    // Extract cell data
    const cellRegex = /<td[^>]*>(.*?)<\/td>/gis
    const cells = []
    const cellMatches = rowHTML.matchAll(cellRegex)
    
    for (const cellMatch of cellMatches) {
      const cellContent = cellMatch[1]
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp;
        .replace(/₹/g, '') // Remove rupee symbol
        .trim()
      cells.push(cellContent)
    }
    
    // Expected format: [Name, GMP, Price, Gain%, Date, Type]
    if (cells.length >= 5) {
      const ipo = parseIPORow(cells)
      if (ipo && ipo.name && ipo.name.length > 2) {
        ipos.push(ipo)
      }
    }
  }
  
  return ipos
}

// Parse individual IPO row
// Expected format: [Name, GMP, Price, Gain%, Date, Type]
function parseIPORow(cells) {
  try {
    const name = cells[0]?.trim()
    if (!name || name.length < 2 || name.toLowerCase().includes('stock') || name.toLowerCase().includes('ipo')) return null
    
    // Parse GMP percentage from column 4 (Gain %) - e.g., "15.35%"
    let gmp_percentage = null
    const gainText = cells[3] || ''
    const gainMatch = gainText.replace('%', '').trim()
    if (gainMatch && gainMatch !== '-' && !isNaN(parseFloat(gainMatch))) {
      gmp_percentage = parseFloat(gainMatch)
    }
    
    // Parse issue price from column 3 - e.g., "1140" or "95 to 100"
    let issue_price = null
    const priceText = cells[2] || ''
    if (priceText && priceText !== '-') {
      // Handle price ranges like "95 to 100" - take the upper price
      if (priceText.includes('to')) {
        const priceMatch = priceText.match(/to\s+(\d+)/)
        if (priceMatch) {
          issue_price = parseFloat(priceMatch[1])
        }
      } else {
        const priceMatch = priceText.match(/(\d+)/)
        if (priceMatch) {
          issue_price = parseFloat(priceMatch[1])
        }
      }
    }
    
    // We don't have lot size in this table format
    let lot_size = null
    
    // Parse dates from column 5 - e.g., "26-30 Sep", "30-6 Oct", "7-9 Oct"
    let open_date = null
    let close_date = null
    
    const dateText = cells[4] || ''
    if (dateText && dateText !== 'TBA' && dateText.trim() !== '-') {
      const dateMatch = dateText.match(/(\d{1,2})[-](\d{1,2})\s*([A-Za-z]+)/)
      if (dateMatch) {
        const today = new Date()
        const currentYear = today.getFullYear()
        const monthName = dateMatch[3]
        
        const monthMap = {
          'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
          'Jul': 7, 'Aug': 8, 'Sep': 9, 'Sept': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
        }
        
        const month = monthMap[monthName] || monthMap[monthName.substring(0, 3)]
        
        if (month) {
          const startDay = parseInt(dateMatch[1])
          const endDay = parseInt(dateMatch[2])
          
          // Handle cross-month ranges (e.g., 30-6 Oct means 30 Sep - 6 Oct)
          if (startDay > endDay) {
            const prevMonth = month === 1 ? 12 : month - 1
            const prevYear = month === 1 ? currentYear - 1 : currentYear
            open_date = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`
            close_date = `${currentYear}-${month.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`
          } else {
            open_date = `${currentYear}-${month.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`
            close_date = `${currentYear}-${month.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`
          }
        }
      }
    }
    
    // Skip IPOs with no date or TBA
    if (!open_date || !close_date) {
      console.log(`Skipping ${name} - no valid dates`)
      return null
    }
    
    return {
      name,
      gmp_percentage,
      issue_price,
      lot_size,
      open_date,
      close_date,
      is_active: true
    }
  } catch (error) {
    console.error('Error parsing row:', error)
    return null
  }
}

// Update Supabase database
async function updateDatabase(ipos) {
  console.log('💾 Updating Supabase database...')
  
  let newCount = 0
  let updatedCount = 0
  let errorCount = 0
  
  for (const ipo of ipos) {
    try {
      // Check if IPO exists
      const { data: existingIPO } = await supabase
        .from('ipos')
        .select('id')
        .eq('name', ipo.name)
        .single()
      
      if (existingIPO) {
        // Update existing IPO
        const { error } = await supabase
          .from('ipos')
          .update({
            gmp_percentage: ipo.gmp_percentage,
            issue_price: ipo.issue_price,
            lot_size: ipo.lot_size,
            open_date: ipo.open_date,
            close_date: ipo.close_date,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingIPO.id)
        
        if (error) {
          console.error(`Error updating ${ipo.name}:`, error)
          errorCount++
        } else {
          updatedCount++
        }
      } else {
        // Insert new IPO
        const { error } = await supabase
          .from('ipos')
          .insert([ipo])
        
        if (error) {
          console.error(`Error inserting ${ipo.name}:`, error)
          errorCount++
        } else {
          newCount++
        }
      }
    } catch (error) {
      console.error(`Error processing ${ipo.name}:`, error)
      errorCount++
    }
  }
  
  console.log(`\n✅ Database updated successfully!`)
  console.log(`   📈 ${newCount} new IPOs`)
  console.log(`   🔄 ${updatedCount} updated IPOs`)
  if (errorCount > 0) {
    console.log(`   ⚠️  ${errorCount} errors`)
  }
  
  return { newCount, updatedCount, errorCount }
}

// Main function
async function main() {
  console.log('🚀 IPO GMP Tracker - Automated Scraper')
  console.log('=====================================\n')
  
  try {
    // Scrape data
    const ipos = await scrapeIPOData()
    
    if (ipos.length === 0) {
      console.log('⚠️  No IPOs found. Please check the scraper logic.')
      return
    }
    
    // Update database
    const result = await updateDatabase(ipos)
    
    console.log(`\n🎉 Done! Your Supabase database now has the latest IPO data.`)
    console.log(`   Open your app to see the updated data!\n`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the scraper
main()
