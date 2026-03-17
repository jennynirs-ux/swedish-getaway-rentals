import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for managing Web Push notification subscriptions.
 * Registers the service worker, requests permission, and stores
 * the push subscription in the profiles table.
 */

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      // Register service worker
      navigator.serviceWorker.register('/sw.js').catch(console.error);

      // Check current subscription
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;

    try {
      setLoading(true);

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;

      // Get VAPID public key from env or edge function
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn('VITE_VAPID_PUBLIC_KEY not set');
        return false;
      }

      // Subscribe to push
      const subscription = await reg.pushManager.subscribe({
        userActivated: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Store subscription in user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            push_subscription: JSON.stringify(subscription),
            push_enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscription failed:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    try {
      setLoading(true);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            push_subscription: null,
            push_enabled: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }

      setIsSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, isSupported, isSubscribed, loading, subscribe, unsubscribe };
}

// Convert VAPID key from base64 URL string to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}
