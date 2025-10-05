// Simple Express server to handle scraper triggers
const express = require('express')
const { exec } = require('child_process')
const path = require('path')
const cors = require('cors')

const app = express()
const PORT = 3001

// Enable CORS for all origins (for development)
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'IPO Scraper API is running' })
})

// Trigger scraper endpoint
app.post('/api/scrape', (req, res) => {
  console.log('📡 Received scrape request...')
  
  const { source = 'ipowatch' } = req.body
  console.log(`📊 Scraping from source: ${source}`)
  
        let scriptPath
        if (source === 'investorgain') {
          scriptPath = path.join(__dirname, 'investorgain_scraper_real.py')
        } else {
          scriptPath = path.join(__dirname, 'auto-scraper.js')
        }
  
  const command = source === 'investorgain' ? `python3 ${scriptPath}` : `node ${scriptPath}`
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error running scraper:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to run scraper',
        error: error.message,
        source: source
      })
    }
    
    if (stderr) {
      console.error('⚠️ Scraper stderr:', stderr)
    }
    
    console.log('✅ Scraper output:', stdout)
    
    // Parse output to extract counts
    const newMatch = stdout.match(/📈 (\d+) new IPOs/)
    const updatedMatch = stdout.match(/🔄 (\d+) updated IPOs/)
    
    const newCount = newMatch ? parseInt(newMatch[1]) : 0
    const updatedCount = updatedMatch ? parseInt(updatedMatch[1]) : 0
    
    res.json({
      success: true,
      message: 'Scraper completed successfully',
      source: source,
      newCount,
      updatedCount,
      output: stdout
    })
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 IPO Scraper API running on http://localhost:${PORT}`)
  console.log(`   POST http://localhost:${PORT}/api/scrape - Trigger scraper`)
  console.log(`   Mobile access: http://192.168.1.2:${PORT}/api/scrape`)
})

