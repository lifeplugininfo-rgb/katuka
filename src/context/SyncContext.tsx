import React, { createContext, useContext, useState, useEffect } from 'react';
import { OfflineSyncItem } from '../types';

interface SyncContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  toggleSimulatedOffline: () => void;
  syncQueue: OfflineSyncItem[];
  pendingCount: number;
  successfulCount: number;
  failedCount: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
  enqueueOfflineItem: (item: Omit<OfflineSyncItem, 'localId' | 'createdAt' | 'retryCount' | 'status'>) => void;
  syncQueueNow: () => Promise<{ success: boolean; syncedCount: number }>;
  clearSyncedItems: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [browserOnline, setBrowserOnline] = useState<boolean>(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [syncQueue, setSyncQueue] = useState<OfflineSyncItem[]>(() => {
    const saved = localStorage.getItem('aems_sync_queue');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });
  const [successfulCount, setSuccessfulCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => localStorage.getItem('aems_last_sync') || null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const isOnline = browserOnline && !isSimulatedOffline;

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('aems_sync_queue', JSON.stringify(syncQueue));
  }, [syncQueue]);

  // Auto-sync when coming back online if there are pending items
  useEffect(() => {
    if (isOnline && syncQueue.some((i) => i.status === 'PENDING') && !isSyncing) {
      syncQueueNow();
    }
  }, [isOnline]);

  const toggleSimulatedOffline = () => {
    setIsSimulatedOffline((prev) => !prev);
  };

  const enqueueOfflineItem = (itemData: Omit<OfflineSyncItem, 'localId' | 'createdAt' | 'retryCount' | 'status'>) => {
    const newItem: OfflineSyncItem = {
      ...itemData,
      localId: `local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'PENDING',
    };
    setSyncQueue((prev) => [newItem, ...prev]);
  };

  const syncQueueNow = async (): Promise<{ success: boolean; syncedCount: number }> => {
    const pendingItems = syncQueue.filter((i) => i.status === 'PENDING');
    if (pendingItems.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: pendingItems }),
      });
      const data = await res.json();

      if (data.success && data.processed) {
        const processedMap = new Map<string, { status: 'SUCCESS' | 'FAILED'; error?: string }>();
        data.processed.forEach((p: any) => processedMap.set(p.localId, p));

        let newlySuccess = 0;
        setSyncQueue((prev) =>
          prev.map((item) => {
            const resItem = processedMap.get(item.localId);
            if (resItem) {
              if (resItem.status === 'SUCCESS') newlySuccess++;
              return {
                ...item,
                status: resItem.status,
                errorMessage: resItem.error,
                retryCount: item.retryCount + 1,
              };
            }
            return item;
          })
        );

        setSuccessfulCount((c) => c + newlySuccess);
        const syncTimestamp = new Date().toLocaleTimeString();
        setLastSyncTime(syncTimestamp);
        localStorage.setItem('aems_last_sync', syncTimestamp);
        setIsSyncing(false);
        return { success: true, syncedCount: newlySuccess };
      }
    } catch (err) {
      // Network failure during sync
      setSyncQueue((prev) =>
        prev.map((item) => (item.status === 'PENDING' ? { ...item, retryCount: item.retryCount + 1 } : item))
      );
    }
    setIsSyncing(false);
    return { success: false, syncedCount: 0 };
  };

  const clearSyncedItems = () => {
    setSyncQueue((prev) => prev.filter((i) => i.status !== 'SUCCESS'));
  };

  const pendingCount = syncQueue.filter((i) => i.status === 'PENDING').length;
  const failedCount = syncQueue.filter((i) => i.status === 'FAILED').length;

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSimulatedOffline,
        toggleSimulatedOffline,
        syncQueue,
        pendingCount,
        successfulCount,
        failedCount,
        lastSyncTime,
        isSyncing,
        enqueueOfflineItem,
        syncQueueNow,
        clearSyncedItems,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
};
