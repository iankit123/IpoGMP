// Supabase Edge Function for IPO Scraping
// This scrapes ipowatch.in and updates the database automatically

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting IPO scraping...')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://jztpxmdiaqsafpzfcpib.supabase.co'
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch HTML from ipowatch.in
    console.log('Fetching data from ipowatch.in...')
    const response = await fetch('https://ipowatch.in/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ipowatch.in: ${response.status}`)
    }
    
    const html = await response.text()
    console.log(`Fetched HTML (${html.length} bytes)`)
    
    // Parse HTML using DOMParser
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    if (!doc) {
      throw new Error('Failed to parse HTML')
    }
    
    // Find all IPO tables
    const tables = doc.querySelectorAll('table')
    console.log(`Found ${tables.length} tables`)
    
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
    
    console.log(`Parsed ${ipos.length} IPOs`)
    
    // Update database
    let newCount = 0
    let updatedCount = 0
    
    for (const ipo of ipos) {
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
        
        if (!error) updatedCount++
      } else {
        // Insert new IPO
        const { error } = await supabase
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
        
        if (!error) newCount++
      }
    }
    
    console.log(`Database updated: ${newCount} new, ${updatedCount} updated`)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Scraping completed: ${newCount} new IPOs, ${updatedCount} updated`,
        newCount,
        updatedCount,
        totalScraped: ipos.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
    
  } catch (error) {
    console.error('Error in scraping function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function parseIPORow(cells: any[]): any {
  try {
    // Extract text from cells
    const cellTexts = Array.from(cells).map(cell => 
      cell.textContent?.trim().replace(/\s+/g, ' ') || ''
    )
    
    if (cellTexts.length < 4) return null
    
    // Parse IPO name (first column)
    const name = cellTexts[0]
    if (!name || name.length < 2) return null
    
    // Parse GMP percentage (second column)
    let gmp_percentage = null
    const gmpText = cellTexts[1]
    const gmpMatch = gmpText.match(/([+-]?\d+\.?\d*)/)
    if (gmpMatch) {
      gmp_percentage = parseFloat(gmpMatch[1])
    }
    
    // Parse issue price (third column)
    let issue_price = null
    const priceText = cellTexts[2]
    const priceMatch = priceText.match(/(\d+)/)
    if (priceMatch) {
      issue_price = parseFloat(priceMatch[1])
    }
    
    // Parse lot size (fourth column or beyond)
    let lot_size = null
    const lotText = cellTexts[3] || ''
    const lotMatch = lotText.match(/(\d+)/)
    if (lotMatch) {
      lot_size = parseInt(lotMatch[1])
    }
    
    // Parse dates (look for date patterns in all cells)
    let open_date = null
    let close_date = null
    
    for (const cellText of cellTexts) {
      // Look for date patterns like "7-9 Oct" or "26-6 Oct"
      const dateMatch = cellText.match(/(\d{1,2})[-\/](\d{1,2})\s*([A-Za-z]+)/)
      if (dateMatch) {
        const today = new Date()
        const currentYear = today.getFullYear()
        const monthName = dateMatch[3]
        
        // Map month names to numbers
        const monthMap: { [key: string]: number } = {
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
        break
      }
    }
    
    return {
      name,
      gmp_percentage,
      issue_price,
      lot_size,
      open_date,
      close_date
    }
  } catch (error) {
    console.error('Error parsing IPO row:', error)
    return null
  }
}