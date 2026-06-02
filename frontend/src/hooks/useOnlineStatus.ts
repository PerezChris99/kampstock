/**
 * useOnlineStatus — tracks navigator.onLine and fires a callback whenever
 * connectivity is restored. Used by the POS page to auto-flush the offline queue.
 */

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { flushOfflineQueue, pendingSaleCount } from '../lib/offlineQueue';

interface OnlineStatusOptions {
  /** Called after the offline queue is flushed. Receives the number of synced items. */
  onReconnect?: (synced: number) => void;
}

export function useOnlineStatus(options: OnlineStatusOptions = {}) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const qc = useQueryClient();

  const refreshPendingCount = useCallback(async () => {
    const n = await pendingSaleCount();
    setPendingCount(n);
  }, []);

  useEffect(() => {
    // Eagerly check pending count on mount
    void refreshPendingCount();

    const handleOnline = async () => {
      setIsOnline(true);
      const synced = await flushOfflineQueue();
      if (synced > 0) {
        // Invalidate relevant queries so dashboards reflect newly synced data
        qc.invalidateQueries({ queryKey: ['daily-sales'] });
        qc.invalidateQueries({ queryKey: ['sales'] });
        qc.invalidateQueries({ queryKey: ['stock'] });
      }
      await refreshPendingCount();
      options.onReconnect?.(synced);
    };

    const handleOffline = () => {
      setIsOnline(false);
      void refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [qc, options.onReconnect, refreshPendingCount]);

  return { isOnline, pendingCount, refreshPendingCount };
}
