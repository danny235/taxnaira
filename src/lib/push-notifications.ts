/**
 * Helper to convert base64 VAPID key to Uint8Array for browser subscription
 */
function urlBase64ToUint8Array(base64String: string) {
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
  
  /**
   * Registers a service worker and subscribes to push notifications
   */
  export async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported by this browser.');
      return null;
    }
  
    try {
      // 1. Get service worker registration
      const registration = await navigator.serviceWorker.ready;
  
      // 2. Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
  
      if (!subscription) {
        // 3. Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Notification permission denied');
        }
  
        // 4. Subscribe
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            throw new Error('VAPID public key not found in env');
        }
        
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
  
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      }
  
      // 5. Send subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
  
      if (!res.ok) {
        throw new Error('Failed to store push subscription on server');
      }
  
      return subscription;
    } catch (error) {
      console.error('Subscription failed:', error);
      throw error;
    }
  }
  
  /**
   * Checks current permission and subscription status
   */
  export async function getPushStatus() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported';
    
    if (Notification.permission === 'denied') return 'denied';
    if (Notification.permission === 'default') return 'prompt';
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return subscription ? 'subscribed' : 'prompt';
  }
