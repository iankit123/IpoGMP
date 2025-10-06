// Simple API endpoint to trigger IPO scraping
// This can be deployed as a serverless function or used directly

const SUPABASE_URL = 'https://jztpxmdiaqsafpzfcpib.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU'

// Initialize Supabase client
const { createClient } = supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Main scraping function
async function scrapeIPOData() {
  try {
    console.log('🚀 Starting IPO data scraping...')
    
    // Fetch HTML from ipowatch.in
    const response = await fetch('https://ipowatch.in/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ipowatch.in: ${response.status}`)
    }
    
    const html = await response.text()
    console.log(`📄 Fetched HTML (${html.length} bytes)`)
    
    // Parse HTML using DOMParser
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    if (!doc) {
      throw new Error('Failed to parse HTML')
    }
    
    // Find all IPO tables
    const tables = doc.querySelectorAll('table')
    console.log(`📊 Found ${tables.length} tables`)
    
    const ipos = []
    
    // Parse each table
    for (const table of tables) {
      const rows = table.querySelectorAll('tr')
      
      for (const row of rows) {
        const cells = row.querySelectorAll('td')
        
        if (cells.length >= 4) {
          try {
            const ipo = parseIPORow(cells)
            if (ipo && ipo.name) {
              ipos.push(ipo)
            }
          } catch (error) {
            console.error('Error parsing row:', error)
          }
        }
      }
    }
    
    console.log(`📈 Parsed ${ipos.length} IPOs`)
    
    // Update database
    let newCount = 0
    let updatedCount = 0
    let errorCount = 0
    
    for (const ipo of ipos) {
      try {
        // Check if IPO exists
        const { data: existingIPO } = await supabaseClient
          .from('ipos')
          .select('id')
          .eq('name', ipo.name)
          .single()
        
        if (existingIPO) {
          // Update existing IPO
          const { error } = await supabaseClient
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
          const { error } = await supabaseClient
            .from('ipos')
            .insert([{
              name: ipo.name,
              gmp_percentage: ipo.gmp_percentage,
              issue_price: ipo.issue_price,
              lot_size: ipo.lot_size,
              open_date: ipo.open_date,
              close_date: ipo.close_date,
              is_active: true
            }])
          
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
    
    console.log(`✅ Database updated: ${newCount} new, ${updatedCount} updated, ${errorCount} errors`)
    
    return {
      success: true,
      message: `Scraping completed: ${newCount} new IPOs, ${updatedCount} updated`,
      newCount,
      updatedCount,
      errorCount,
      totalScraped: ipos.length,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('❌ Error in scraping function:', error)
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

// Parse IPO row from table cells
function parseIPORow(cells) {
  try {
    const name = cells[0]?.textContent?.trim()
    const gmpText = cells[1]?.textContent?.trim()
    const issuePriceText = cells[2]?.textContent?.trim()
    const lotSizeText = cells[3]?.textContent?.trim()
    const dateText = cells[4]?.textContent?.trim()
    
    if (!name) return null
    
    // Parse GMP percentage
    let gmpPercentage = null
    if (gmpText) {
      const gmpMatch = gmpText.match(/(\d+(?:\.\d+)?)/)
      if (gmpMatch) {
        gmpPercentage = parseFloat(gmpMatch[1])
      }
    }
    
    // Parse issue price
    let issuePrice = null
    if (issuePriceText) {
      const priceMatch = issuePriceText.match(/(\d+(?:\.\d+)?)/)
      if (priceMatch) {
        issuePrice = parseFloat(priceMatch[1])
      }
    }
    
    // Parse lot size
    let lotSize = null
    if (lotSizeText) {
      const lotMatch = lotSizeText.match(/(\d+)/)
      if (lotMatch) {
        lotSize = parseInt(lotMatch[1])
      }
    }
    
    // Parse dates
    let openDate = null
    let closeDate = null
    if (dateText) {
      const dates = parseDateRange(dateText)
      openDate = dates.openDate
      closeDate = dates.closeDate
    }
    
    return {
      name,
      gmp_percentage: gmpPercentage,
      issue_price: issuePrice,
      lot_size: lotSize,
      open_date: openDate,
      close_date: closeDate
    }
    
  } catch (error) {
    console.error('Error parsing IPO row:', error)
    return null
  }
}

// Parse date range like "10-12 Sept" or "15 Sept"
function parseDateRange(dateText) {
  try {
    const today = new Date()
    const currentYear = today.getFullYear()
    
    // Common patterns
    const patterns = [
      /(\d+)\s*-\s*(\d+)\s+(\w+)/, // "10-12 Sept"
      /(\d+)\s+(\w+)/, // "15 Sept"
      /(\d+)\/(\d+)\/(\d+)/, // "10/09/2024"
      /(\d+)-(\d+)-(\d+)/, // "10-09-2024"
    ]
    
    for (const pattern of patterns) {
      const match = dateText.match(pattern)
      if (match) {
        if (pattern === patterns[0]) { // "10-12 Sept"
          const startDay = parseInt(match[1])
          const endDay = parseInt(match[2])
          const monthName = match[3]
          
          const openDate = new Date(`${startDay} ${monthName} ${currentYear}`)
          const closeDate = new Date(`${endDay} ${monthName} ${currentYear}`)
          
          return {
            openDate: openDate.toISOString().split('T')[0],
            closeDate: closeDate.toISOString().split('T')[0]
          }
        } else if (pattern === patterns[1]) { // "15 Sept"
          const day = parseInt(match[1])
          const monthName = match[2]
          
          const date = new Date(`${day} ${monthName} ${currentYear}`)
          
          return {
            openDate: date.toISOString().split('T')[0],
            closeDate: date.toISOString().split('T')[0]
          }
        } else if (pattern === patterns[2] || pattern === patterns[3]) { // "10/09/2024" or "10-09-2024"
          const day = parseInt(match[1])
          const month = parseInt(match[2])
          const year = parseInt(match[3]) || currentYear
          
          const date = new Date(year, month - 1, day)
          
          return {
            openDate: date.toISOString().split('T')[0],
            closeDate: date.toISOString().split('T')[0]
          }
        }
      }
    }
    
    return { openDate: null, closeDate: null }
  } catch (error) {
    console.error('Error parsing date range:', error)
    return { openDate: null, closeDate: null }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scrapeIPOData, corsHeaders }
}

// For browser usage
if (typeof window !== 'undefined') {
  window.scrapeIPOData = scrapeIPOData
  window.corsHeaders = corsHeaders
}
