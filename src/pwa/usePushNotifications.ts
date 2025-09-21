import { useState, useEffect } from 'react';

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | null;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: null,
    isSubscribed: false,
    subscription: null,
  });

  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      
      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false }));
        return;
      }

      const permission = Notification.permission;
      let subscription: PushSubscription | null = null;
      let isSubscribed = false;

      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          subscription = await registration.pushManager.getSubscription();
          isSubscribed = !!subscription;
        } catch (error) {
          console.error('Error checking push subscription:', error);
        }
      }

      setState({
        isSupported: true,
        permission,
        isSubscribed,
        subscription,
      });
    };

    checkSupport();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!state.isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const subscribe = async (): Promise<PushSubscription | null> => {
    if (!state.isSupported || state.permission !== 'granted') return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // You'll need to replace this with your actual VAPID public key
      const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY_HERE';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      setState(prev => ({ 
        ...prev, 
        isSubscribed: true, 
        subscription 
      }));

      // Send subscription to your server here
      await sendSubscriptionToServer(subscription);

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!state.subscription) return false;

    try {
      await state.subscription.unsubscribe();
      
      // Remove subscription from your server here
      await removeSubscriptionFromServer(state.subscription);

      setState(prev => ({ 
        ...prev, 
        isSubscribed: false, 
        subscription: null 
      }));

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  };

  const sendTestNotification = async () => {
    if (state.permission === 'granted') {
      new Notification('Thingtrax Test', {
        body: 'Push notifications are working!',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
      });
    }
  };

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

// Placeholder functions - you'll need to implement these with your backend
async function sendSubscriptionToServer(subscription: PushSubscription) {
  // Send the subscription to your server to store it
  console.log('Subscription to send to server:', subscription);
}

async function removeSubscriptionFromServer(subscription: PushSubscription) {
  // Remove the subscription from your server
  console.log('Subscription to remove from server:', subscription);
}