import { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  getMessageQueue,
  removeQueuedMessage,
  cacheLocation,
  getCachedLocation,
  addConnectionListener,
  addFirestoreConnectionListener,
  syncQueuedMessages,
  isSyncInProgress,
  setSyncCallback,
  addAppResumeListener
} from '../offlineUtils';
import { hapticSuccess } from '../hapticUtils';

/**
 * Custom hook for offline support and message queuing
 * Monitors connection status and syncs queued messages when back online
 *
 * @param {Object} activeNDR - Active NDR object
 * @param {string} selectedCar - Selected car number
 * @param {boolean} locationEnabled - Whether location is enabled
 * @returns {Object} Offline sync state and functions
 */
export const useOfflineSync = (activeNDR, selectedCar, locationEnabled) => {
  const [isOnline, setIsOnline] = useState(true);
  const [firestoreConnected, setFirestoreConnected] = useState(true);
  const [queuedMessagesCount, setQueuedMessagesCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Auto-sync queued messages
  const syncMessages = async () => {
    if (!activeNDR || isSyncInProgress()) {
      return;
    }

    setIsSyncing(true);
    console.log('🔄 Starting auto-sync...');

    try {
      const result = await syncQueuedMessages(async (messageData) => {
        await addDoc(collection(db, 'couchMessages'), messageData);
      });

      if (result.synced > 0) {
        hapticSuccess();
        console.log(`✅ Successfully synced ${result.synced} messages`);
      }

      if (result.failed > 0) {
        console.warn(`⚠️ ${result.failed} messages failed to sync`);
      }

      setQueuedMessagesCount(getMessageQueue().length);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('❌ Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Connection status monitoring
  useEffect(() => {
    const syncOnReconnect = async () => {
      if (!activeNDR) return;

      try {
        const queueLength = getMessageQueue().length;
        if (queueLength > 0) {
          console.log('🔄 Auto-syncing queued messages...');
          await syncMessages();
        }
      } catch (error) {
        console.error('Error in syncOnReconnect:', error);
      }
    };

    const unsubscribeConnection = addConnectionListener((online) => {
      try {
        setIsOnline(online);
        if (online) {
          console.log('🟢 Back online - checking for queued messages');
          const queueLength = getMessageQueue().length;
          setQueuedMessagesCount(queueLength);

          setTimeout(() => syncOnReconnect(), 1000);
        }
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });

    const unsubscribeFirestore = addFirestoreConnectionListener((connected) => {
      try {
        setFirestoreConnected(connected);
      } catch (error) {
        console.error('Error in Firestore connection listener:', error);
      }
    });

    // Initial queue check
    try {
      setQueuedMessagesCount(getMessageQueue().length);
    } catch (error) {
      console.error('Error checking initial queue:', error);
    }

    // Register sync callback for app resume
    try {
      setSyncCallback(() => {
        if (activeNDR && activeNDR.id) {
          syncMessages();
        }
      });
    } catch (error) {
      console.error('Error setting sync callback:', error);
    }

    return () => {
      try {
        if (unsubscribeConnection && typeof unsubscribeConnection === 'function') {
          unsubscribeConnection();
        }
        if (unsubscribeFirestore && typeof unsubscribeFirestore === 'function') {
          unsubscribeFirestore();
        }
      } catch (error) {
        console.error('Error cleaning up connection monitoring:', error);
      }
    };
  }, [activeNDR]);

  // App resume detection
  useEffect(() => {
    const unsubscribeResume = addAppResumeListener(() => {
      try {
        console.log('📱 App resumed - reconnecting...');

        setQueuedMessagesCount(getMessageQueue().length);

        // Load cached location if available
        const cachedLoc = getCachedLocation();
        if (cachedLoc && selectedCar && locationEnabled) {
          console.log('📍 Using cached location from resume');
        }
      } catch (error) {
        console.error('Error in app resume handler:', error);
      }
    });

    return () => {
      try {
        if (unsubscribeResume && typeof unsubscribeResume === 'function') {
          unsubscribeResume();
        }
      } catch (error) {
        console.error('Error cleaning up app resume listener:', error);
      }
    };
  }, [selectedCar, locationEnabled]);

  // Retry a queued message
  const retryMessage = async (messageData) => {
    if (!isOnline || !firestoreConnected) {
      alert('Cannot retry - you are offline');
      return;
    }

    try {
      await addDoc(collection(db, 'couchMessages'), messageData);
      removeQueuedMessage(messageData.id);
      setQueuedMessagesCount(getMessageQueue().length);
      hapticSuccess();
      console.log('✅ Message retried successfully');
    } catch (error) {
      console.error('❌ Retry failed:', error);
      alert(`Failed to retry message: ${error.message}`);
    }
  };

  // Delete a queued message
  const deleteQueuedMessage = (messageId) => {
    removeQueuedMessage(messageId);
    setQueuedMessagesCount(getMessageQueue().length);
    console.log('🗑️ Message deleted from queue');
  };

  return {
    isOnline,
    firestoreConnected,
    queuedMessagesCount,
    isSyncing,
    lastSyncTime,
    syncMessages,
    retryMessage,
    deleteQueuedMessage,
    setQueuedMessagesCount,
    setFirestoreConnected
  };
};
