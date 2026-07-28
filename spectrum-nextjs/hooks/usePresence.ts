/**
 * usePresence Hook
 * ================
 * Tracks user online/offline status and activity.
 *
 * Usage:
 * const { isOnline } = usePresence();
 *
 * - Marks user as online when component mounts
 * - Updates activity every 2 minutes (keeps user marked as online)
 * - Marks user as offline when component unmounts or tab is hidden
 */

import { useEffect } from 'react';
import { presence, auth, tokenStore } from '@/lib/api';

export function usePresence() {
  useEffect(() => {
    // Only run on client side and if user is logged in
    if (typeof window === 'undefined' || !tokenStore.isLoggedIn()) {
      return;
    }

    // Mark user as online when page loads
    presence.setOnline().catch(() => {
      // Silently fail - presence tracking is not critical
    });

    // Heartbeat every 30 s — online window is 2 min so this gives a comfortable
    // 4× safety margin; prevents false-offline on slow connections.
    const activityInterval = setInterval(() => {
      presence.updateActivity().catch(() => {
        // Silently fail
      });
    }, 30 * 1000);

    // Mark user as offline when the page/tab unloads.
    // fetch() is cancelled before unload completes — navigator.sendBeacon() is
    // the only reliable mechanism because browsers guarantee it finishes even
    // after the page has been destroyed (spec: https://w3c.github.io/beacon/).
    const handleBeforeUnload = () => {
      const url = `${window.location.origin}/backend/presence/offline`;
      if (navigator.sendBeacon) {
        // sendBeacon can't set custom headers, but it's a same-origin request
        // so the browser attaches the httpOnly auth cookie automatically —
        // no need to pass a token in the body.
        navigator.sendBeacon(url);
      } else {
        // Fallback for very old browsers — best effort only.
        presence.setOffline().catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        presence.setOffline().catch(() => {
          // Silently fail
        });
      } else {
        presence.setOnline().catch(() => {
          // Silently fail
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(activityInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {};
}
