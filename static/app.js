// Main JavaScript file for IPO Tracker PWA

class IPOTracker {
  constructor() {
    this.isOnline = navigator.onLine;
    this.swRegistration = null;
    this.notificationPermission = 'default';
    this.deferredPrompt = null;
    
    this.init();
  }

  async init() {
    // Register service worker
    await this.registerServiceWorker();
    
    // Initialize push notifications
    this.initPushNotifications();
    
    // Setup offline/online detection
    this.setupOfflineDetection();
    
    // Setup notification button
    this.setupNotificationButton();
    
    // Setup admin functions
    this.setupAdminFunctions();
    
    // Setup PWA install prompt
    this.setupInstallPrompt();
    
    console.log('IPO Tracker initialized');
  }

  // Register service worker for PWA functionality
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
        
        // Listen for updates
        this.swRegistration.addEventListener('updatefound', () => {
          console.log('Service Worker update found');
          const newWorker = this.swRegistration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              this.showUpdateNotification();
            }
          });
        });
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Initialize push notifications
  async initPushNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return;
    }

    this.notificationPermission = Notification.permission;
    this.updateNotificationUI();
  }

  // Setup notification button functionality
  setupNotificationButton() {
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationText = document.getElementById('notificationText');
    
    if (notificationBtn) {
      notificationBtn.addEventListener('click', async () => {
        if (this.notificationPermission === 'granted') {
          await this.unsubscribeFromNotifications();
        } else {
          await this.subscribeToNotifications();
        }
      });
    }
  }

  // Subscribe to push notifications
  async subscribeToNotifications() {
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      
      if (permission !== 'granted') {
        alert('Notification permission denied');
        return;
      }

      // Get VAPID public key
      const response = await fetch('/api/vapid-public-key');
      if (!response.ok) {
        throw new Error('Failed to get VAPID public key');
      }
      
      const { publicKey } = await response.json();
      
      // Subscribe to push notifications
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      const subscribeResponse = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription.toJSON())
      });

      if (subscribeResponse.ok) {
        console.log('Successfully subscribed to push notifications');
        this.updateNotificationUI();
        this.showNotification('Notifications Enabled', 'You will receive alerts for high GMP IPOs');
      } else {
        throw new Error('Failed to save subscription');
      }

    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      alert('Failed to enable notifications. Please try again.');
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromNotifications() {
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server
        await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription.toJSON())
        });
      }

      this.notificationPermission = 'default';
      this.updateNotificationUI();
      console.log('Unsubscribed from push notifications');

    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
    }
  }

  // Update notification button UI
  updateNotificationUI() {
    const notificationText = document.getElementById('notificationText');
    const notificationStatus = document.getElementById('notificationStatus');
    
    if (notificationText) {
      if (this.notificationPermission === 'granted') {
        notificationText.textContent = 'Disable Notifications';
      } else {
        notificationText.textContent = 'Enable Notifications';
      }
    }
    
    if (notificationStatus) {
      if (this.notificationPermission === 'granted') {
        notificationStatus.innerHTML = '<span class="badge bg-success">Enabled</span>';
      } else {
        notificationStatus.innerHTML = '<span class="badge bg-secondary">Disabled</span>';
      }
    }
  }

  // Setup offline/online detection
  setupOfflineDetection() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showNotification('Back Online', 'Connection restored');
      console.log('App is online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showNotification('Offline Mode', 'App will work with cached data');
      console.log('App is offline');
    });
  }

  // Setup admin functions
  setupAdminFunctions() {
    // Make admin functions globally available
    window.manualScrape = this.manualScrape.bind(this);
    window.testNotification = this.testNotification.bind(this);
  }

  // Setup PWA install prompt
  setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBottomSheet();
    });

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.hideInstallBottomSheet();
      this.deferredPrompt = null;
    });

    // For iOS Safari, show bottom sheet if not already dismissed
    if (this.isIOS() && !this.isInStandaloneMode() && !localStorage.getItem('pwa-install-dismissed')) {
      setTimeout(() => {
        this.showInstallBottomSheet(true);
      }, 2000);
    }
  }

  // Check if device is iOS
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  // Check if app is running in standalone mode (already installed)
  isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  }

  // Show install bottom sheet
  showInstallBottomSheet(isIOS = false) {
    // Don't show if already dismissed
    if (localStorage.getItem('pwa-install-dismissed')) {
      return;
    }

    const bottomSheet = this.createInstallBottomSheet(isIOS);
    document.body.appendChild(bottomSheet);
    
    // Animate in
    setTimeout(() => {
      bottomSheet.classList.add('show');
    }, 100);
  }

  // Create install bottom sheet HTML
  createInstallBottomSheet(isIOS = false) {
    const bottomSheet = document.createElement('div');
    bottomSheet.className = 'install-bottom-sheet';
    bottomSheet.id = 'installBottomSheet';
    
    const message = isIOS 
      ? 'Save app on phone to get alerts on GMP stocks' 
      : 'Install app to get instant notifications on high GMP stocks';
    
    const buttonText = isIOS ? 'Add to Home Screen' : 'Install App';
    
    bottomSheet.innerHTML = `
      <div class="bottom-sheet-content">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-body">
          <div class="d-flex align-items-center">
            <i data-feather="smartphone" class="me-3 text-primary"></i>
            <div class="flex-grow-1">
              <h6 class="mb-1">${message}</h6>
              <small class="text-muted">Get notified when IPOs have high GMP and are closing soon</small>
            </div>
          </div>
          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-primary btn-sm" id="installAppBtn">
              <i data-feather="download" class="me-1"></i>
              ${buttonText}
            </button>
            <button class="btn btn-outline-secondary btn-sm" id="dismissInstallBtn">
              Later
            </button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const installBtn = bottomSheet.querySelector('#installAppBtn');
    const dismissBtn = bottomSheet.querySelector('#dismissInstallBtn');
    
    installBtn.addEventListener('click', () => {
      if (isIOS) {
        this.showIOSInstallInstructions();
      } else {
        this.promptInstall();
      }
    });
    
    dismissBtn.addEventListener('click', () => {
      this.dismissInstallPrompt();
    });

    return bottomSheet;
  }

  // Show iOS install instructions
  showIOSInstallInstructions() {
    const modal = document.createElement('div');
    modal.className = 'modal fade show';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add to Home Screen</h5>
            <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
          </div>
          <div class="modal-body text-center">
            <p>To install this app on your iPhone:</p>
            <div class="install-steps">
              <div class="step mb-3">
                <i data-feather="share" class="text-primary mb-2"></i>
                <p>1. Tap the <strong>Share</strong> button in Safari</p>
              </div>
              <div class="step mb-3">
                <i data-feather="plus-square" class="text-primary mb-2"></i>
                <p>2. Scroll down and tap <strong>"Add to Home Screen"</strong></p>
              </div>
              <div class="step">
                <i data-feather="smartphone" class="text-primary mb-2"></i>
                <p>3. Tap <strong>"Add"</strong> to install the app</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="this.closest('.modal').remove()">Got it!</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.hideInstallBottomSheet();
    localStorage.setItem('pwa-install-dismissed', 'true');
    
    // Replace feather icons
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }

  // Prompt native install
  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('No install prompt available');
      return;
    }

    try {
      const result = await this.deferredPrompt.prompt();
      console.log('Install prompt result:', result.outcome);
      
      if (result.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      this.deferredPrompt = null;
      this.hideInstallBottomSheet();
      localStorage.setItem('pwa-install-dismissed', 'true');
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  }

  // Dismiss install prompt
  dismissInstallPrompt() {
    this.hideInstallBottomSheet();
    localStorage.setItem('pwa-install-dismissed', 'true');
    console.log('Install prompt dismissed');
  }

  // Hide install bottom sheet
  hideInstallBottomSheet() {
    const bottomSheet = document.getElementById('installBottomSheet');
    if (bottomSheet) {
      bottomSheet.classList.remove('show');
      setTimeout(() => {
        bottomSheet.remove();
      }, 300);
    }
  }

  // Manual scrape function
  async manualScrape() {
    try {
      const response = await fetch('/admin/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Scraping triggered successfully! Page will refresh in 3 seconds.');
        setTimeout(() => {
          location.reload();
        }, 3000);
      } else {
        alert('Failed to trigger scraping: ' + result.error);
      }

    } catch (error) {
      console.error('Error triggering scrape:', error);
      alert('Failed to trigger scraping. Please try again.');
    }
  }

  // Test notification function
  async testNotification() {
    try {
      const response = await fetch('/admin/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
      } else {
        alert('Failed to send test notification: ' + result.error);
      }

    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Failed to send test notification. Please try again.');
    }
  }

  // Show local notification
  showNotification(title, body, options = {}) {
    if (this.notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/static/icons/icon-192.png',
        badge: '/static/icons/icon-192.png',
        ...options
      });
    }
  }

  // Show update notification
  showUpdateNotification() {
    if (confirm('A new version of the app is available. Update now?')) {
      if (this.swRegistration.waiting) {
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  }

  // Utility function to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new IPOTracker();
});

// Listen for service worker messages
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'BACKGROUND_SYNC_SUCCESS') {
      console.log('Background sync completed:', event.data.data);
      // Optionally refresh the page or update UI
    }
  });
}
