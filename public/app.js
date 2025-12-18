// IPO GMP Tracker - Frontend JavaScript
// This replaces your Flask frontend with Supabase integration

// Supabase configuration
const SUPABASE_URL = 'https://jztpxmdiaqsafpzfcpib.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU'

// Initialize Supabase client
// Use window object to avoid conflicts with cached/duplicate script loads
if (typeof window.supabaseClient === 'undefined') {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error('Supabase library not loaded. Please ensure the Supabase script is loaded before app.js');
        // Create a dummy client to prevent errors
        window.supabaseClient = {
            from: () => ({
                select: () => ({ eq: () => ({ not: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) })
            })
        };
    }
}
// Use window.supabaseClient as supabase throughout the code
const supabase = window.supabaseClient;

// Global variables
let allIPOs = []
let allInvestorGainIPOs = []
let filteredIPOs = []
let currentFilter = ''
let currentSearch = ''
let deferredPrompt = null
let currentDataSource = 'investorgain' // Default to InvestorGain

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp()
    setupEventListeners()
    loadIPOData()
    
    // Auto-refresh data when app opens (after initial load)
    setTimeout(() => {
        console.log('🔄 Auto-refreshing data on app open...')
        showAutoRefreshIndicator()
        refreshData('investorgain')
    }, 2000) // Wait 2 seconds after initial load
    
    // Auto-refresh data every 5 minutes
    setInterval(() => {
        console.log('Auto-refreshing data...')
        loadIPOData()
    }, 5 * 60 * 1000)
})

// Also load data when user returns to the app
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        console.log('App became visible, refreshing data...')
        loadIPOData()
    }
})

function initializeApp() {
    console.log('IPO GMP Tracker initialized')
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'))
    }
    
    // Setup PWA install prompt
    setupPWAInstall()
}

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input')
    searchInput.addEventListener('input', handleSearch)
    
    // GMP filter
    const gmpFilter = document.getElementById('gmp-filter')
    gmpFilter.addEventListener('change', handleFilter)
}

async function loadIPOData() {
    try {
        showLoading(true)
        
        // Fetch IPO data from both sources
        const [iposResult, investorgainResult] = await Promise.all([
            supabase
                .from('ipos')
                .select('*')
                .eq('is_active', true)
                .not('close_date', 'is', null)
                .order('close_date', { ascending: false }),
            
            supabase
                .from('ipo_investorgain')
                .select('*')
                .eq('is_active', true)
                .not('close_date', 'is', null)
                .order('close_date', { ascending: false })
        ])
        
        if (iposResult.error) {
            console.error('Error fetching IPOs:', iposResult.error)
            showError('Failed to load IPO data: ' + iposResult.error.message)
            return
        }
        
        if (investorgainResult.error) {
            console.error('Error fetching InvestorGain IPOs:', investorgainResult.error)
            // Don't fail completely, just log the error
        }
        
        // Debug logging
        console.log('📊 Raw IPO data from Supabase:', {
            iposCount: iposResult.data?.length || 0,
            investorgainCount: investorgainResult.data?.length || 0,
            iposSample: iposResult.data?.slice(0, 2),
            investorgainSample: investorgainResult.data?.slice(0, 2)
        })
        
        // Process IPO Watch data
        const today = new Date().toISOString().split('T')[0]
        const todayDate = new Date(today)
        console.log('📅 Filtering for IPOs with close_date >=', today)
        console.log('📅 Today date object:', todayDate)
        
        // Log sample dates to debug format
        if (iposResult.data && iposResult.data.length > 0) {
            const sample = iposResult.data[0]
            console.log('📅 Sample IPO date format:', {
                open_date: sample.open_date,
                close_date: sample.close_date,
                close_date_type: typeof sample.close_date,
                close_date_parsed: new Date(sample.close_date)
            })
        }
        
        allIPOs = (iposResult.data || [])
            .filter(ipo => ipo.open_date && ipo.close_date)
            .filter(ipo => {
                // Handle both string and date formats
                const closeDate = ipo.close_date ? new Date(ipo.close_date).toISOString().split('T')[0] : null
                return closeDate && closeDate >= today
            })
            .sort((a, b) => {
                const todayDate = new Date()
                const aOpen = new Date(a.open_date)
                const aClose = new Date(a.close_date)
                const bOpen = new Date(b.open_date)
                const bClose = new Date(b.close_date)
                
                // Check if IPO is currently open
                const aIsOpen = todayDate >= aOpen && todayDate <= aClose
                const bIsOpen = todayDate >= bOpen && todayDate <= bClose
                
                // Open IPOs first, then upcoming IPOs
                if (aIsOpen && !bIsOpen) return -1
                if (!aIsOpen && bIsOpen) return 1
                
                // Within same category, sort by close date (ascending for open, descending for upcoming)
                if (aIsOpen && bIsOpen) {
                    return new Date(a.close_date) - new Date(b.close_date) // Open: closest to closing first
                } else {
                    return new Date(b.close_date) - new Date(a.close_date) // Upcoming: furthest first
                }
            })
        
        // Process InvestorGain data
        allInvestorGainIPOs = (investorgainResult.data || [])
            .filter(ipo => ipo.open_date && ipo.close_date)
            .filter(ipo => {
                // Handle both string and date formats
                const closeDate = ipo.close_date ? new Date(ipo.close_date).toISOString().split('T')[0] : null
                return closeDate && closeDate >= today
            })
            .sort((a, b) => {
                const todayDate = new Date()
                const aOpen = new Date(a.open_date)
                const aClose = new Date(a.close_date)
                const bOpen = new Date(b.open_date)
                const bClose = new Date(b.close_date)
                
                // Check if IPO is currently open
                const aIsOpen = todayDate >= aOpen && todayDate <= aClose
                const bIsOpen = todayDate >= bOpen && todayDate <= bClose
                
                // Open IPOs first, then upcoming IPOs
                if (aIsOpen && !bIsOpen) return -1
                if (!aIsOpen && bIsOpen) return 1
                
                // Within same category, sort by close date (ascending for open, descending for upcoming)
                if (aIsOpen && bIsOpen) {
                    return new Date(a.close_date) - new Date(b.close_date) // Open: closest to closing first
                } else {
                    return new Date(b.close_date) - new Date(a.close_date) // Upcoming: furthest first
                }
            })
        
        // Set current data based on source
        if (currentDataSource === 'investorgain') {
            filteredIPOs = [...allInvestorGainIPOs]
        } else {
            filteredIPOs = [...allIPOs]
        }
        
        console.log(`📊 Loaded ${allIPOs.length} primary IPOs and ${allInvestorGainIPOs.length} secondary IPOs`)
        console.log(`📊 After filtering (close_date >= today): ${allIPOs.length} primary, ${allInvestorGainIPOs.length} secondary`)
        
        // If no data, log more details
        if (allIPOs.length === 0 && allInvestorGainIPOs.length === 0) {
            console.warn('⚠️ No IPOs found. Possible reasons:')
            console.warn('  1. Tables are empty in Supabase')
            console.warn('  2. All IPOs have close_date < today')
            console.warn('  3. RLS policies might be blocking access')
            console.warn('  4. Data might be in different tables')
            console.warn(`  Raw data counts: ${iposResult.data?.length || 0} from 'ipos', ${investorgainResult.data?.length || 0} from 'ipo_investorgain'`)
        }
        
        updateStatusCards()
        updateDataSourceIndicator()
        renderIPOCards()
        showLoading(false)
        
    } catch (error) {
        console.error('Error loading IPO data:', error)
        showError('Failed to load IPO data: ' + error.message)
        showLoading(false)
    }
}

function updateDataSourceIndicator() {
    const indicator = document.getElementById('data-source-indicator')
    if (indicator) {
        indicator.textContent = 'Current Data'
        indicator.className = 'text-muted'
    }
}

function updateStatusCards() {
    // Use the current data source (filteredIPOs) which reflects what's actually displayed
    const dataToUse = filteredIPOs.length > 0 ? filteredIPOs : (currentDataSource === 'investorgain' ? allInvestorGainIPOs : allIPOs)
    
    const today = new Date()
    const openIPOs = dataToUse.filter(ipo => {
        if (!ipo.open_date || !ipo.close_date) return false
        const openDate = new Date(ipo.open_date)
        const closeDate = new Date(ipo.close_date)
        return today >= openDate && today <= closeDate
    })
    
    const upcomingIPOs = dataToUse.filter(ipo => {
        if (!ipo.open_date) return false
        const openDate = new Date(ipo.open_date)
        return today < openDate
    })
    
    document.getElementById('total-ipos').textContent = dataToUse.length
    document.getElementById('open-ipos').textContent = openIPOs.length
    document.getElementById('upcoming-ipos').textContent = upcomingIPOs.length
    
    // Debug logging
    console.log('📊 Status cards updated:', {
        total: dataToUse.length,
        open: openIPOs.length,
        upcoming: upcomingIPOs.length,
        dataSource: currentDataSource
    })
}

function renderIPOCards() {
    const container = document.getElementById('ipo-container')
    
    if (filteredIPOs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-feather="search"></i>
                <h5>No IPOs found</h5>
                <p>Try adjusting your search or filter criteria.</p>
            </div>
        `
        feather.replace()
        return
    }
    
    const today = new Date()
    
    container.innerHTML = filteredIPOs.map(ipo => {
        const openDate = ipo.open_date ? new Date(ipo.open_date) : null
        const closeDate = ipo.close_date ? new Date(ipo.close_date) : null
        
        let statusBadge = ''
        let statusClass = ''
        
        if (openDate && closeDate) {
            if (today >= openDate && today <= closeDate) {
                statusBadge = 'Open'
                statusClass = 'bg-success'
            } else if (today < openDate) {
                statusBadge = 'Upcoming'
                statusClass = 'bg-primary'
            }
        }
        
        const gmpClass = ipo.gmp_percentage > 0 ? 'gmp-positive' : 'gmp-negative'
        const gmpValue = ipo.gmp_percentage ? 
            `${ipo.gmp_percentage > 0 ? '+' : ''}${ipo.gmp_percentage.toFixed(1)}%` : 
            'N/A'
        
        let dateInfo = ''
        if (openDate && closeDate) {
            const daysLeft = Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24))
            let dateText = ''
            
            // Format date range
            if (openDate.getDate() !== closeDate.getDate()) {
                const openMonth = openDate.toLocaleDateString('en-US', { month: 'short' })
                const closeMonth = closeDate.toLocaleDateString('en-US', { month: 'short' })
                
                if (openMonth === closeMonth) {
                    dateText = `${openDate.getDate()}-${closeDate.getDate()}${closeMonth}`
                } else {
                    dateText = `${openDate.getDate()}${openMonth}-${closeDate.getDate()}${closeMonth}`
                }
            } else {
                dateText = `${openDate.getDate()}${openDate.toLocaleDateString('en-US', { month: 'short' })}`
            }
            
            // Add days left information
            if (daysLeft === 0) {
                dateText += ', <span class="text-danger fw-medium">Last day</span>'
            } else if (daysLeft === 1) {
                dateText += ', <span class="text-warning fw-medium">1 day left</span>'
            } else if (daysLeft > 1 && daysLeft <= 3) {
                dateText += `, <span class="text-info fw-medium">${daysLeft} days left</span>`
            } else if (daysLeft < 0) {
                dateText += ', <span class="text-muted">Closed</span>'
            }
            
            dateInfo = dateText
        } else if (openDate) {
            // Only open date available
            const daysLeft = Math.ceil((openDate - today) / (1000 * 60 * 60 * 24))
            let dateText = `${openDate.getDate()}${openDate.toLocaleDateString('en-US', { month: 'short' })}`
            
            if (daysLeft < 0) {
                dateText += ', <span class="text-success fw-medium">Open</span>'
            } else if (daysLeft === 0) {
                dateText += ', <span class="text-success fw-medium">Opens today</span>'
            } else if (daysLeft <= 3) {
                dateText += `, <span class="text-primary fw-medium">Opens in ${daysLeft} days</span>`
            }
            
            dateInfo = dateText
        }
        
        return `
            <div class="card ipo-card">
                <div class="card-body p-3">
                    <div>
                        <!-- Line 1: Name and GMP Label -->
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <h6 class="mb-0 fw-bold text-dark">${ipo.name}</h6>
                            <span class="text-dark small">GMP</span>
                        </div>
                        
                        <!-- Line 2: Status Badge and GMP Value -->
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                ${statusBadge ? `<span class="badge ${statusClass} rounded-pill px-2 py-1" style="font-size: 0.7rem;">${statusBadge}</span>` : ''}
                            </div>
                            <div>
                                <div class="fw-bold fs-3 ${gmpClass}">
                                    ${gmpValue}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Line 3: Date and Issue Price -->
                        <div class="d-flex justify-content-between align-items-center small mb-2">
                            <div class="text-muted">
                                ${dateInfo}
                            </div>
                            <div class="text-dark">
                                <span>Issue price - </span>
                                <span class="fw-medium">${ipo.price ? `₹${ipo.price.toFixed(0)}` : (ipo.issue_price ? `₹${ipo.issue_price.toFixed(0)}` : 'TBA')}</span>
                            </div>
                        </div>
                        
                        <!-- Line 4: IPO Size, Lot Size & Subscription -->
                        <div class="d-flex justify-content-between align-items-center small mt-3">
                            <div class="text-muted">
                                ${ipo.ipo_size ? `IPO Size: ₹${ipo.ipo_size.toFixed(0)} Cr` : ''}
                            </div>
                            <div class="text-muted">
                                ${ipo.lot_size ? `Lot: ${ipo.lot_size}` : ''}
                            </div>
                            <div class="text-muted">
                                ${ipo.subscription_multiple ? `Sub: ${ipo.subscription_multiple.toFixed(2)}x` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }).join('')
    
    feather.replace()
}

function handleSearch(event) {
    currentSearch = event.target.value.toLowerCase()
    applyFilters()
}

function handleFilter(event) {
    currentFilter = event.target.value
    applyFilters()
}

function applyFilters() {
    const sourceData = currentDataSource === 'investorgain' ? allInvestorGainIPOs : allIPOs
    
    filteredIPOs = sourceData.filter(ipo => {
        // Search filter
        if (currentSearch && !ipo.name.toLowerCase().includes(currentSearch)) {
            return false
        }
        
        // GMP filter
        if (currentFilter) {
            switch (currentFilter) {
                case 'positive':
                    if (!ipo.gmp_percentage || ipo.gmp_percentage <= 0) return false
                    break
                case 'negative':
                    if (!ipo.gmp_percentage || ipo.gmp_percentage >= 0) return false
                    break
                case 'high':
                    if (!ipo.gmp_percentage || ipo.gmp_percentage <= 10) return false
                    break
            }
        }
        
        return true
    }).sort((a, b) => {
        const todayDate = new Date()
        const aOpen = new Date(a.open_date)
        const aClose = new Date(a.close_date)
        const bOpen = new Date(b.open_date)
        const bClose = new Date(b.close_date)
        
        // Check if IPO is currently open
        const aIsOpen = todayDate >= aOpen && todayDate <= aClose
        const bIsOpen = todayDate >= bOpen && todayDate <= bClose
        
        // Open IPOs first, then upcoming IPOs
        if (aIsOpen && !bIsOpen) return -1
        if (!aIsOpen && bIsOpen) return 1
        
        // Within same category, sort by close date (ascending for open, descending for upcoming)
        if (aIsOpen && bIsOpen) {
            return new Date(a.close_date) - new Date(b.close_date) // Open: closest to closing first
        } else {
            return new Date(b.close_date) - new Date(a.close_date) // Upcoming: furthest first
        }
    })
    
    renderIPOCards()
}

function showLoading(show) {
    const container = document.getElementById('ipo-container')
    if (show) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-feather="trending-up"></i>
                <h5>Loading IPO data...</h5>
                <p>Please wait while we fetch the latest IPO information.</p>
            </div>
        `
        feather.replace()
    }
}

function showAutoRefreshIndicator() {
    // Create a temporary notification for auto-refresh
    const indicator = document.createElement('div')
    indicator.className = 'alert alert-info alert-dismissible fade show position-fixed'
    indicator.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;'
    indicator.innerHTML = `
        <i data-feather="refresh-cw" class="me-2"></i>
        <strong>Auto-refreshing data...</strong>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `
    
    document.body.appendChild(indicator)
    feather.replace()
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.remove()
        }
    }, 3000)
}

function showError(message) {
    const container = document.getElementById('ipo-container')
    container.innerHTML = `
        <div class="empty-state">
            <i data-feather="alert-circle"></i>
            <h5>Error</h5>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="loadIPOData()">Retry</button>
        </div>
    `
    feather.replace()
}

// Helper function to detect the correct API URL
async function detectApiUrl() {
    const apiUrls = [
        'http://localhost:3001/api/scrape',
        'http://127.0.0.1:3001/api/scrape',
        'http://192.168.1.2:3001/api/scrape',
        `http://${window.location.hostname}:3001/api/scrape`
    ]
    
    for (const apiUrl of apiUrls) {
        try {
            const response = await fetch(apiUrl.replace('/api/scrape', '/health'), {
                method: 'GET',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            })
            
            if (response.ok) {
                console.log(`✅ Found working API URL: ${apiUrl}`)
                return apiUrl
            }
        } catch (error) {
            console.log(`❌ API URL not accessible: ${apiUrl}`)
        }
    }
    
    return null
}

// Make it available globally for debugging
window.detectApiUrl = detectApiUrl

// Debug function to help troubleshoot API connectivity
window.debugApiConnectivity = async function() {
    console.log('🔍 Debugging API connectivity...')
    console.log('Current hostname:', window.location.hostname)
    console.log('Current URL:', window.location.href)
    
    // Check if we're on Netlify (production) or local development
    const isProduction = window.location.hostname.includes('netlify.app')
    
    if (isProduction) {
        console.log('🌐 Production mode detected (Netlify)')
        console.log('✅ In production, data comes from Supabase automatically')
        console.log('ℹ️ No local scraper API needed - data is updated by scheduled jobs')
        
        // Test Supabase connectivity instead
        try {
            const { data, error } = await supabase
                .from('ipos')
                .select('count')
                .limit(1)
            
            if (error) {
                console.log('❌ Supabase connection failed:', error.message)
                alert('❌ Supabase connection failed!\n\nError: ' + error.message + '\n\nThis might be a temporary issue. Please try again later.')
            } else {
                console.log('✅ Supabase connection successful')
                alert('✅ Production app is working correctly!\n\n🌐 You\'re using the Netlify deployment\n📊 Data comes from Supabase automatically\n🔄 No manual refresh needed - data updates automatically')
            }
        } catch (error) {
            console.log('❌ Supabase test failed:', error.message)
            alert('❌ Supabase connection test failed!\n\nError: ' + error.message + '\n\nThis might be a temporary network issue.')
        }
        return
    }
    
    // Local development debugging
    console.log('🏠 Local development mode detected')
    
    const apiUrls = [
        'http://localhost:3001/api/scrape',
        'http://127.0.0.1:3001/api/scrape',
        'http://192.168.1.2:3001/api/scrape',
        `http://${window.location.hostname}:3001/api/scrape`
    ]
    
    console.log('Testing local API URLs:')
    for (const apiUrl of apiUrls) {
        const healthUrl = apiUrl.replace('/api/scrape', '/health')
        try {
            const response = await fetch(healthUrl, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            })
            console.log(`✅ ${apiUrl} - Status: ${response.status}`)
        } catch (error) {
            console.log(`❌ ${apiUrl} - Error: ${error.message}`)
        }
    }
    
    const workingUrl = await detectApiUrl()
    if (workingUrl) {
        console.log('✅ Working API URL found:', workingUrl)
        alert('✅ Local API connectivity test passed!\n\nWorking URL: ' + workingUrl)
    } else {
        console.log('❌ No working API URL found')
        alert('❌ Local API connectivity test failed!\n\nPlease check:\n1. Scraper API is running: npm run api\n2. You\'re on the same network\n3. Firewall settings')
    }
}

// Menu functions
async function refreshData(source = 'investorgain') {
    try {
        // Update current data source
        currentDataSource = source
        
        // Check if we're on Netlify (production) or local development
        const isProduction = window.location.hostname.includes('netlify.app')
        
        if (isProduction) {
            console.log(`🔄 Triggering InvestorGain scraper to fetch latest data...`)
        } else {
            console.log(`🔄 Reloading data from Supabase...`)
        }
        
        // Show loading state
        const originalContent = document.getElementById('ipo-container').innerHTML
        showLoading(true)
        
        if (isProduction) {
            // On Netlify, trigger the Netlify function to scrape InvestorGain
            console.log('🔄 Production mode: Triggering InvestorGain scraper via Netlify function...')
            
            try {
                console.log('📡 Making request to Netlify function...')
                const response = await fetch('/.netlify/functions/scrape-investorgain', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                
                console.log('📡 Response status:', response.status)
                console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
                
                if (!response.ok) {
                    const errorText = await response.text()
                    console.error('❌ HTTP Error Response:', errorText)
                    throw new Error(`HTTP ${response.status}: ${errorText}`)
                }
                
                const result = await response.json()
                console.log('📡 Function response:', result)
                
                if (result.success) {
                    console.log('✅ InvestorGain scraper completed successfully')
                    // Reload data from Supabase after scraping
                    await loadIPOData()
                    alert(`✅ ${result.message}\n\n📊 ${result.count} IPOs updated from InvestorGain`)
                } else {
                    console.error('❌ Scraper failed:', result.error || result.message)
                    alert(`❌ Failed to refresh data: ${result.error || result.message || 'Unknown error'}`)
                }
            } catch (error) {
                console.error('❌ Error calling Netlify function:', error)
                console.error('❌ Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                })
                alert(`❌ Failed to refresh data: ${error.message}`)
            }
            return
        }
        
        // Local development: Just reload from Supabase (same as production behavior)
        console.log('🔄 Local mode: Reloading data from Supabase...')
        await loadIPOData()
        console.log('✅ Data reloaded from Supabase')
        
    } catch (error) {
        console.error('❌ Error refreshing data:', error)
        alert('❌ Failed to refresh data.\n\nError: ' + error.message)
    } finally {
        showLoading(false)
    }
}

async function forceRefresh() {
    try {
        console.log('⚡ Force refreshing: clearing cache and fetching latest data...')
        
        // Clear service worker cache
        if ('caches' in window) {
            const cacheNames = await caches.keys()
            await Promise.all(cacheNames.map(name => caches.delete(name)))
            console.log('🗑️ Cache cleared')
        }
        
        // Check if we're on Netlify (production) or local development
        const isProduction = window.location.hostname.includes('netlify.app')
        
        if (isProduction) {
            // On Netlify, trigger the Netlify function to scrape InvestorGain
            console.log('🔄 Production mode: Force triggering InvestorGain scraper via Netlify function...')
            
            try {
                const response = await fetch('/.netlify/functions/scrape-investorgain', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                
                const result = await response.json()
                
                if (result.success) {
                    console.log('✅ InvestorGain scraper force completed successfully')
                    // Reload data from Supabase after scraping
                    await loadIPOData()
                    alert(`✅ ${result.message}\n\n📊 ${result.count} IPOs force updated from InvestorGain`)
                } else {
                    console.error('❌ Force scraper failed:', result.error)
                    alert(`❌ Failed to force refresh data: ${result.error}`)
                }
            } catch (error) {
                console.error('❌ Error calling Netlify function:', error)
                alert(`❌ Failed to force refresh data: ${error.message}`)
            }
            return
        }
        
        // Local development: Just reload from Supabase (same as production behavior)
        console.log('🔄 Local mode: Force reloading data from Supabase...')
        await loadIPOData()
        console.log('✅ Data force reloaded from Supabase')
        
    } catch (error) {
        console.error('❌ Error force refreshing data:', error)
        alert('❌ Failed to force refresh: ' + error.message)
    }
}

async function testAlert() {
    try {
        // Send test notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('IPO Tracker Test', {
                body: 'This is a test notification from IPO GMP Tracker',
                icon: '/icons/icon-192.png'
            })
        } else {
            alert('Notifications not enabled. Please enable notifications first.')
        }
    } catch (error) {
        console.error('Error sending test alert:', error)
        alert('Failed to send test alert')
    }
}

async function enableNotifications() {
    try {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission()
            if (permission === 'granted') {
                alert('Notifications enabled successfully!')
            } else {
                alert('Notifications were not enabled.')
            }
        } else {
            alert('This browser does not support notifications.')
        }
    } catch (error) {
        console.error('Error enabling notifications:', error)
        alert('Failed to enable notifications')
    }
}

// PWA Install Functions
function setupPWAInstall() {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('PWA install prompt available')
        e.preventDefault()
        deferredPrompt = e
        
        // Show install prompt if not already installed
        if (!isAppInstalled()) {
            showInstallPrompt()
        }
    })
    
    // Listen for install button click
    const installBtn = document.getElementById('install-btn')
    if (installBtn) {
        installBtn.addEventListener('click', installPWA)
    }
    
    // Listen for dismiss button click
    const dismissBtn = document.getElementById('dismiss-install')
    if (dismissBtn) {
        dismissBtn.addEventListener('click', dismissInstallPrompt)
    }
    
    // Check if app is already installed
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed')
        hideInstallPrompt()
        localStorage.setItem('pwa-installed', 'true')
    })
    
    // For mobile browsers, show install prompt after a delay if not already shown
    setTimeout(() => {
        if (!isAppInstalled() && !deferredPrompt) {
            // Check if we're on mobile and PWA is installable
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            
            if (isMobile && !isStandalone) {
                console.log('Mobile detected, showing manual install prompt')
                showInstallPrompt()
            }
        }
    }, 3000) // Show after 3 seconds
}

function showInstallPrompt() {
    const prompt = document.getElementById('pwa-install-prompt')
    if (prompt && !isAppInstalled()) {
        prompt.classList.remove('d-none')
        feather.replace() // Refresh icons
    }
}

function hideInstallPrompt() {
    const prompt = document.getElementById('pwa-install-prompt')
    if (prompt) {
        prompt.classList.add('d-none')
    }
}

function dismissInstallPrompt() {
    hideInstallPrompt()
    localStorage.setItem('pwa-install-dismissed', 'true')
}

function isAppInstalled() {
    return localStorage.getItem('pwa-installed') === 'true' || 
           localStorage.getItem('pwa-install-dismissed') === 'true' ||
           window.matchMedia('(display-mode: standalone)').matches
}

async function installPWA() {
    if (deferredPrompt) {
        // Use the browser's install prompt
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log(`PWA install outcome: ${outcome}`)
        deferredPrompt = null
        
        if (outcome === 'accepted') {
            hideInstallPrompt()
        }
    } else {
        // Fallback for mobile browsers without beforeinstallprompt
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        
        if (isMobile) {
            // Show instructions for manual installation
            alert(`📱 To install this app on your mobile:\n\n` +
                  `Android Chrome:\n• Tap menu (⋮) → "Add to Home screen"\n\n` +
                  `iPhone Safari:\n• Tap Share → "Add to Home Screen"\n\n` +
                  `The app will work offline after installation!`)
            hideInstallPrompt()
        } else {
            alert('PWA installation not available in this browser. Try Chrome or Edge.')
        }
    }
}

// Auto-refresh every 5 minutes
setInterval(() => {
    loadIPOData()
}, 5 * 60 * 1000)
