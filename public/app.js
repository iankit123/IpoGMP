// IPO GMP Tracker - Frontend JavaScript
// This replaces your Flask frontend with Supabase integration

// Supabase configuration
const SUPABASE_URL = 'https://jztpxmdiaqsafpzfcpib.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU'

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Global variables
let allIPOs = []
let filteredIPOs = []
let currentFilter = ''
let currentSearch = ''
let deferredPrompt = null

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp()
    setupEventListeners()
    loadIPOData()
    
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
        
        // Fetch IPO data from Supabase
        const { data: ipos, error } = await supabase
            .from('ipos')
            .select('*')
            .eq('is_active', true)
            .not('close_date', 'is', null)  // Filter out IPOs without close_date
            .order('close_date', { ascending: false })  // Sort by latest close date first
        
        if (error) {
            console.error('Error fetching IPOs:', error)
            showError('Failed to load IPO data: ' + error.message)
            return
        }
        
        // Additional filter for IPOs with valid dates, exclude closed IPOs, and sort by close date
        const today = new Date().toISOString().split('T')[0] // Today in YYYY-MM-DD format
        
        allIPOs = (ipos || [])
            .filter(ipo => ipo.open_date && ipo.close_date) // Must have valid dates
            .filter(ipo => ipo.close_date >= today) // Only open and upcoming (exclude closed)
            .sort((a, b) => new Date(b.close_date) - new Date(a.close_date))  // Latest close date first
        filteredIPOs = [...allIPOs]
        
        console.log(`Loaded ${allIPOs.length} IPOs from Supabase (filtered by valid dates)`)
        
        updateStatusCards()
        renderIPOCards()
        showLoading(false)
        
    } catch (error) {
        console.error('Error loading IPO data:', error)
        showError('Failed to load IPO data: ' + error.message)
        showLoading(false)
    }
}

function updateStatusCards() {
    const today = new Date()
    const openIPOs = allIPOs.filter(ipo => {
        if (!ipo.open_date || !ipo.close_date) return false
        const openDate = new Date(ipo.open_date)
        const closeDate = new Date(ipo.close_date)
        return today >= openDate && today <= closeDate
    })
    
    const upcomingIPOs = allIPOs.filter(ipo => {
        if (!ipo.open_date) return false
        const openDate = new Date(ipo.open_date)
        return today < openDate
    })
    
    document.getElementById('total-ipos').textContent = allIPOs.length
    document.getElementById('open-ipos').textContent = openIPOs.length
    document.getElementById('upcoming-ipos').textContent = upcomingIPOs.length
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
                        <div class="d-flex justify-content-between align-items-center small">
                            <div class="text-muted">
                                ${dateInfo}
                            </div>
                            <div class="text-dark">
                                <span>Issue price - </span>
                                <span class="fw-medium">${ipo.issue_price ? `₹${ipo.issue_price.toFixed(0)}` : 'TBA'}</span>
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
    filteredIPOs = allIPOs.filter(ipo => {
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
    
    const apiUrls = [
        'http://localhost:3001/api/scrape',
        'http://127.0.0.1:3001/api/scrape',
        'http://192.168.1.2:3001/api/scrape',
        `http://${window.location.hostname}:3001/api/scrape`
    ]
    
    console.log('Testing API URLs:')
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
        alert('✅ API connectivity test passed!\n\nWorking URL: ' + workingUrl)
    } else {
        console.log('❌ No working API URL found')
        alert('❌ API connectivity test failed!\n\nPlease check:\n1. Scraper API is running: npm run api\n2. You\'re on the same network\n3. Firewall settings')
    }
}

// Menu functions
async function refreshData() {
    try {
        console.log('🔄 Triggering scraper to fetch latest data...')
        
        // Show loading state
        const originalContent = document.getElementById('ipo-container').innerHTML
        showLoading(true)
        
        // Check if we're on Netlify (production) or local development
        const isProduction = window.location.hostname.includes('netlify.app')
        
        if (isProduction) {
            // On Netlify, just reload data from Supabase (no local scraper)
            console.log('🔄 Production mode: Reloading data from Supabase...')
            await loadIPOData()
            alert('✅ Data refreshed from Supabase!')
            return
        }
        
        // Local development: Call local scraper API with dynamic URL detection
        const workingApiUrl = await detectApiUrl()
        
        if (!workingApiUrl) {
            throw new Error('Could not find a working scraper API URL. Please check:\n1. Scraper API is running: npm run api\n2. You\'re on the same network as the server\n3. Firewall is not blocking port 3001')
        }
        
        console.log(`🔄 Using API URL: ${workingApiUrl}`)
        
        const response = await fetch(workingApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000) // 10 second timeout
        })
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const result = await response.json()
        
        if (result.success) {
            console.log('✅ Scraper completed:', result)
            
            // Reload IPO data from Supabase
            await loadIPOData()
            
            alert(`✅ Data updated!\n\n📈 ${result.newCount} new IPOs\n🔄 ${result.updatedCount} updated IPOs`)
        } else {
            throw new Error(result.message || 'Scraper failed')
        }
        
    } catch (error) {
        console.error('❌ Error refreshing data:', error)
        alert('❌ Failed to refresh data.\n\nPossible solutions:\n1. Make sure the scraper API is running: npm run api\n2. Check if you\'re on the same network as the server\n3. Try accessing from localhost:8000 instead\n\nError details: ' + error.message)
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
            // On Netlify, just reload data from Supabase (no local scraper)
            console.log('🔄 Production mode: Force refreshing from Supabase...')
            await loadIPOData()
            alert('✅ Data force refreshed from Supabase!')
            return
        }
        
        // Local development: Trigger scraper
        await refreshData()
        
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
