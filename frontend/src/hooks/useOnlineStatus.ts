/**
 * useOnlineStatus — tracks navigator.onLine and fires a callback whenever
 * connectivity is restored. Used by the POS page to auto-flush the offline queue.
 */

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { flushOfflineQueue, pendingSaleCount, failedSaleCount } from '../lib/offlineQueue';

interface OnlineStatusOptions {
  /** Called after the offline queue is flushed. Receives the number of synced items. */
  onReconnect?: (synced: number) => void;
  /** Called when one or more queued sales permanently failed to sync. */
  onFailedSales?: (count: number) => void;
}

export function useOnlineStatus(options: OnlineStatusOptions = {}) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const qc = useQueryClient();

  const refreshPendingCount = useCallback(async () => {
    const [n, f] = await Promise.all([pendingSaleCount(), failedSaleCount()]);
    setPendingCount(n);
    setFailedCount(f);
  }, []);

  useEffect(() => {
    // Eagerly check pending count on mount
    void refreshPendingCount();

    const handleOnline = async () => {
      setIsOnline(true);
      const prevFailed = await failedSaleCount();
      const synced = await flushOfflineQueue();
      const nowFailed = await failedSaleCount();
      const newlyFailed = nowFailed - prevFailed;
      if (synced > 0) {
        // Invalidate relevant queries so dashboards reflect newly synced data
        qc.invalidateQueries({ queryKey: ['daily-sales'] });
        qc.invalidateQueries({ queryKey: ['sales'] });
        qc.invalidateQueries({ queryKey: ['stock'] });
      }
      await refreshPendingCount();
      options.onReconnect?.(synced);
      if (newlyFailed > 0) {
        options.onFailedSales?.(newlyFailed);
      }
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
  }, [qc, options.onReconnect, options.onFailedSales, refreshPendingCount]);

  return { isOnline, pendingCount, failedCount, refreshPendingCount };
}
