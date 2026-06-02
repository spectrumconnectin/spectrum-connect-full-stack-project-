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
    if (typeof window === 'undefined' || !tokenStore.get()) {
      return;
    }

    // Mark user as online when page loads
    presence.setOnline().catch(() => {
      // Silently fail - presence tracking is not critical
    });

    // Update activity every 2 minutes to keep user marked as online
    const activityInterval = setInterval(() => {
      presence.updateActivity().catch(() => {
        // Silently fail
      });
    }, 2 * 60 * 1000);

    // Mark user as offline when leaving the page or tab is hidden
    const handleBeforeUnload = () => {
      presence.setOffline().catch(() => {
        // Silently fail
      });
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
