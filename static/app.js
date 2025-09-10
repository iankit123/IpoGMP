// Main JavaScript file for IPO Tracker PWA

class IPOTracker {
  constructor() {
    this.isOnline = navigator.onLine;
    this.swRegistration = null;
    this.notificationPermission = 'default';
    
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
