import { useState, useEffect } from 'react';
import { requestNotificationPermission, showNotification, initializeAudioContext } from '../notificationUtils';
import { initializeFCM, requestFCMToken, setupForegroundMessageListener } from '../fcmUtils';
import { isNativeApp } from '../capacitorUtils';
import { playNotificationSound } from '../notificationUtils';
import { hapticNewMessage } from '../hapticUtils';

/**
 * Custom hook for managing push notifications and FCM
 * Handles notification permissions, FCM token registration, and foreground messages
 *
 * @param {Object} userProfile - User profile object
 * @param {Object} platformInfo - Platform information
 * @returns {Object} Notification state and control functions
 */
export const useNotifications = (userProfile, platformInfo) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Check initial notification permission state
  useEffect(() => {
    if (platformInfo.isMobile && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      }
    }
  }, [platformInfo.isMobile]);

  // Initialize FCM/Push Notifications
  useEffect(() => {
    let foregroundUnsubscribe = null;

    const setupPushNotifications = async () => {
      if (!userProfile?.uid) return;

      try {
        if (isNativeApp) {
          console.log('✅ Native push notifications ready (token upload happens after role assignment)');
        } else {
          // Initialize web FCM
          try {
            const messaging = await initializeFCM();
            if (messaging) {
              // Setup foreground message listener
              foregroundUnsubscribe = await setupForegroundMessageListener((payload) => {
                console.log('📨 Foreground FCM message:', payload);
                const title = payload.notification?.title || 'New Message';
                const body = payload.notification?.body || '';
                showNotification(title, body);
                playNotificationSound();
                hapticNewMessage();
              });
              console.log('✅ FCM foreground listener setup');
            } else {
              console.log('⚠️ FCM not initialized - web push notifications disabled (this is OK for development)');
            }
          } catch (fcmError) {
            console.log('⚠️ FCM initialization failed - continuing without web push:', fcmError.message);
          }
        }
      } catch (error) {
        console.error('❌ Error setting up push notifications (non-critical):', error);
      }
    };

    setupPushNotifications();

    return () => {
      if (foregroundUnsubscribe) {
        foregroundUnsubscribe();
      }
    };
  }, [userProfile?.uid]);

  // Request notification permissions
  const requestNotifications = async () => {
    // Initialize audio context on first user interaction (iOS requirement)
    initializeAudioContext();

    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);

    if (granted) {
      // Request FCM token for web push notifications
      if (!isNativeApp && userProfile?.uid) {
        try {
          await requestFCMToken(userProfile.uid, true);
          console.log('✅ FCM token registered');
        } catch (error) {
          console.error('❌ Error registering FCM token:', error);
        }
      }

      // Show success notification
      await showNotification('Notifications Enabled', 'You will now receive message updates');
    }
  };

  // Toggle notifications
  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      await requestNotifications();
    } else {
      setNotificationsEnabled(false);
    }
  };

  return {
    notificationsEnabled,
    requestNotifications,
    toggleNotifications,
    setNotificationsEnabled
  };
};
