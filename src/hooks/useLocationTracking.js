import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, deleteDoc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  isNativeApp,
  requestNativeLocationPermission,
  getNativePosition,
  watchNativePosition,
  clearNativeWatch,
  requestAlwaysLocationPermission,
  getIOSSettingsInstructions
} from '../capacitorUtils';
import { cacheLocation, getCachedLocation } from '../offlineUtils';
import { hapticLocationEnabled } from '../hapticUtils';
import { locationLogger } from '../logger';

// Debouncer helper for batching location updates
const createDebouncer = (delay) => {
  let timeoutId;
  let pendingUpdate = null;

  return {
    debounce: (fn) => {
      pendingUpdate = fn;

      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          if (pendingUpdate) {
            pendingUpdate();
            pendingUpdate = null;
          }
          timeoutId = null;
        }, delay);
      }
    },
    flush: () => {
      if (pendingUpdate) {
        clearTimeout(timeoutId);
        pendingUpdate();
        pendingUpdate = null;
        timeoutId = null;
      }
    }
  };
};

/**
 * Custom hook for location tracking in navigator mode
 * Handles geolocation permissions, watching position, and updating Firestore
 * Supports both web and native app (Capacitor) location tracking
 *
 * @param {string} viewMode - Current view mode ('navigator' or 'couch')
 * @param {string} selectedCar - Selected car number
 * @param {Object} activeNDR - Active NDR object
 * @param {Object} platformInfo - Platform information (isIOS, isAndroid, etc.)
 * @returns {Object} Location tracking state and control functions
 */
export const useLocationTracking = (viewMode, selectedCar, activeNDR, platformInfo) => {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [updateInterval, setUpdateInterval] = useState(5000);
  const [hasAlwaysPermission, setHasAlwaysPermission] = useState(false);
  const [debugStatus, setDebugStatus] = useState('');

  const locationWatchId = useRef(null);
  const lastLocationRef = useRef(null);
  const locationUpdateTimerRef = useRef(null);
  const locationDebouncer = useRef(createDebouncer(2000)); // 2 second debounce
  const documentExists = useRef(false);
  const lastUpdatePosition = useRef(null);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Update location to Firestore with debouncing
  const updateLocationToFirestore = async (position) => {
    if (!activeNDR || !selectedCar) {
      console.log('⏭️ Skipping location update');
      return;
    }

    const { latitude, longitude, speed, accuracy } = position.coords;

    console.log(`📍 Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracy}m)`);

    // Distance check (keep existing 30m logic)
    if (lastUpdatePosition.current) {
      const distance = calculateDistance(
        lastUpdatePosition.current.latitude,
        lastUpdatePosition.current.longitude,
        latitude,
        longitude
      );

      if (distance < 30 && accuracy < 100) {
        console.log(`⏭️ Skipping update - movement only ${Math.round(distance)}m`);
        return;
      }

      console.log(`📏 Moved ${Math.round(distance)}m since last update`);
    }

    let newInterval = 5000;
    if (speed !== null && speed !== undefined) {
      if (speed > 20) {
        newInterval = 3000;
      } else if (speed > 5) {
        newInterval = 5000;
      } else if (speed > 1) {
        newInterval = 10000;
      } else {
        newInterval = 30000;
      }
      console.log(`🏃 Speed: ${speed.toFixed(1)} m/s, interval: ${newInterval}ms`);
    }

    if (newInterval !== updateInterval) {
      setUpdateInterval(newInterval);
    }

    // DEBOUNCE: Accumulate updates, flush every 2 seconds
    locationDebouncer.current.debounce(async () => {
      try {
        const carNum = parseInt(selectedCar, 10);
        const locationId = `${activeNDR.id}_${carNum}`;
        const carLocationRef = doc(db, 'carLocations', locationId);

        console.log(`💾 Updating Firestore for car ${carNum}...`);

        // Check if document exists ONCE per session (not every time)
        if (!documentExists.current) {
          const existingDoc = await getDoc(carLocationRef);
          documentExists.current = existingDoc.exists();
        }

        const locationData = {
          ndrId: activeNDR.id,
          carNumber: carNum,
          latitude,
          longitude,
          accuracy,
          updatedAt: Timestamp.now()
        };

        if (!documentExists.current) {
          await setDoc(carLocationRef, locationData);
          documentExists.current = true;
          console.log('✅ Location document created');
        } else {
          await updateDoc(carLocationRef, locationData);
          console.log('✅ Location updated in Firestore');
        }

        lastUpdatePosition.current = { latitude, longitude };
        lastLocationRef.current = {
          latitude,
          longitude,
          lastWriteSuccess: true
        };

        // Cache location for offline recovery
        cacheLocation({
          latitude,
          longitude,
          accuracy,
          carNumber: carNum,
          ndrId: activeNDR.id
        });

        setLastLocationUpdate(new Date());
        setLocationError('');

      } catch (error) {
        console.error('❌ Error updating location to Firestore:', error);

        if (lastLocationRef.current) {
          lastLocationRef.current.lastWriteSuccess = false;
        }

        setDebugStatus('⚠️ Firestore update failed - will retry');
        setTimeout(() => setDebugStatus(''), 3000);
      }
    });
  };

  // Check location permission status
  const checkLocationPermission = async () => {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        console.log('📍 Permission state:', result.state);
        return result.state;
      } catch (error) {
        console.log('Permissions API not available:', error);
        return 'prompt';
      }
    }
    return 'prompt';
  };

  // Request location permission and start tracking
  const startLocationTracking = async () => {
    if (!navigator.geolocation) {
      setLocationError('❌ Geolocation is not supported by your device');
      return;
    }

    setLocationError('');
    setDebugStatus('📍 Checking permission...');

    if (isNativeApp) {
      console.log('🔵 Using NATIVE location API');

      const permissionResult = await requestNativeLocationPermission();

      if (permissionResult.success) {
        const positionResult = await getNativePosition();

        if (positionResult.success) {
          console.log('✅ Native location obtained!', positionResult.coords);

          await updateLocationToFirestore(positionResult);

          setLocationEnabled(true);
          localStorage.setItem('locationEnabled', 'true');
          setDebugStatus('✅ Native location enabled!');
          setLocationError('');
          hapticLocationEnabled();
          setTimeout(() => setDebugStatus(''), 3000);
          return;
        }
      }

      setLocationError('❌ Failed to get native location permission');
      setDebugStatus('❌ Permission failed');
      return;
    }

    console.log('🌐 Using WEB location API');

    const permissionState = await checkLocationPermission();
    console.log('Current permission state:', permissionState);

    if (permissionState === 'denied') {
      let errorMessage = '⚠️ Location access is blocked. ';
      if (platformInfo.isIOS) {
        errorMessage += 'Go to Settings > Privacy > Location Services to enable.';
      } else {
        errorMessage += 'Check your browser settings.';
      }
      setLocationError(errorMessage);
      return;
    }

    try {
      console.log('Requesting initial position...');
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });

      console.log('✅ Got initial position:', position.coords);

      await updateLocationToFirestore(position);

      setLocationEnabled(true);
      localStorage.setItem('locationEnabled', 'true');
      setDebugStatus('✅ Location enabled!');
      setLocationError('');
      hapticLocationEnabled();
      setTimeout(() => setDebugStatus(''), 3000);

    } catch (error) {
      console.error('Error getting location:', error);

      let errorMessage = '❌ Location error: ';

      if (error.code === 1) {
        if (platformInfo.isIOS) {
          errorMessage = '⚠️ Permission denied. Go to iPhone Settings > Privacy > Location Services and enable for Safari/Chrome.';
        } else {
          errorMessage = '⚠️ Permission denied. Check your browser settings.';
        }
      } else if (error.code === 2) {
        errorMessage += 'Position unavailable. Check your device GPS.';
      } else if (error.code === 3) {
        errorMessage += 'Request timeout. Try again.';
      } else {
        errorMessage += error.message;
      }

      setLocationError(errorMessage);
      setDebugStatus(errorMessage);
    }
  };

  // Stop location sharing
  const stopLocationTracking = async () => {
    if (!activeNDR || !selectedCar) return;

    try {
      const carNum = parseInt(selectedCar, 10);

      // Send message first
      console.log('📤 Sending location sharing stopped message...');
      await addDoc(collection(db, 'couchMessages'), {
        ndrId: activeNDR.id,
        carNumber: carNum,
        sender: 'navigator',
        senderName: `Car ${carNum}`,
        message: '📍 Location sharing stopped',
        timestamp: Timestamp.now()
      });
      console.log('✅ Message sent successfully');

      // Delete location document from Firestore
      const locationsRef = collection(db, 'carLocations');
      const existingQuery = query(
        locationsRef,
        where('ndrId', '==', activeNDR.id),
        where('carNumber', '==', carNum)
      );

      const existingDocs = await getDocs(existingQuery);

      if (!existingDocs.empty) {
        await deleteDoc(doc(db, 'carLocations', existingDocs.docs[0].id));
        console.log('✅ Location document deleted');
      }

      // Update local state
      setLocationEnabled(false);
      setLastLocationUpdate(null);
      localStorage.setItem('locationEnabled', 'false');
      setDebugStatus('📍 Location sharing stopped');
      setTimeout(() => setDebugStatus(''), 2000);
    } catch (error) {
      console.error('❌ Error stopping location sharing:', error);

      // Even if message fails, still disable location tracking locally
      setLocationEnabled(false);
      setLastLocationUpdate(null);
      localStorage.setItem('locationEnabled', 'false');

      setDebugStatus('❌ Error stopping location - check connection');
      setTimeout(() => setDebugStatus(''), 3000);
    }
  };

  // Request "Always" location permission for iOS background tracking
  const requestBackgroundPermission = async () => {
    try {
      const result = await requestAlwaysLocationPermission();
      console.log('Always permission result:', result);

      if (result.success || result.granted) {
        setHasAlwaysPermission(true);
        setDebugStatus('✅ Permission granted! Enable "Always" in Settings for background tracking');

        // Show instructions for enabling "Always" permission
        if (result.message) {
          setTimeout(() => {
            const instructions = getIOSSettingsInstructions();
            if (window.confirm('📍 Background Location Setup\n\n' + instructions.alwaysLocation + '\n\nWould you like to open Settings now?')) {
              window.open('app-settings:');
            }
          }, 1000);
        }

        setTimeout(() => setDebugStatus(''), 5000);
      } else if (result.needsSettings) {
        const instructions = getIOSSettingsInstructions();
        alert('📍 Background Location Access Required\n\n' + instructions.alwaysLocation);
      } else {
        alert('Unable to enable background tracking. Please check your device settings.');
      }
    } catch (error) {
      console.error('Background permission error:', error);
      const instructions = getIOSSettingsInstructions();
      alert('📍 Background Location Setup\n\n' + instructions.alwaysLocation);
    }
  };

  // Restore location state from localStorage
  useEffect(() => {
    const savedLocationEnabled = localStorage.getItem('locationEnabled') === 'true';
    if (savedLocationEnabled && selectedCar) {
      setLocationEnabled(true);
      locationLogger.log('Restored location enabled state - will auto-resume tracking');
    }
  }, [selectedCar]);

  // Auto-resume location tracking if it was previously enabled
  useEffect(() => {
    if (viewMode !== 'navigator' || !locationEnabled || !selectedCar || !activeNDR) {
      locationLogger.log('Location tracking inactive');
      return;
    }

    locationLogger.log('🎯 Starting location tracking...');

    const handleError = (error) => {
      console.error('Location error:', error);
      let errorMessage = 'Location error: ';

      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Permission denied';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'Position unavailable';
          break;
        case error.TIMEOUT:
          errorMessage += 'Request timeout';
          break;
        default:
          errorMessage += 'Unknown error';
      }

      setLocationError(errorMessage);
      setDebugStatus(errorMessage);
    };

    if (isNativeApp) {
      console.log('🔵 Using NATIVE location tracking');

      const watchId = watchNativePosition(
        (position) => {
          console.log('✅ NATIVE location update:', position.coords);
          updateLocationToFirestore(position);
        },
        handleError
      );

      locationWatchId.current = watchId;

      return () => {
        console.log('🔴 Cleaning up NATIVE location tracking');
        if (locationWatchId.current) {
          clearNativeWatch(locationWatchId.current);
          locationWatchId.current = null;
        }
      };
    }

    console.log('🌐 Using WEB location tracking');

    const watchOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Initial WEB position:', position.coords);
        updateLocationToFirestore(position);
      },
      handleError,
      watchOptions
    );

    locationWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        console.log('✅ WEB location update:', position.coords);
        updateLocationToFirestore(position);
      },
      handleError,
      watchOptions
    );

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 App backgrounded');
      } else {
        console.log('📱 App foregrounded');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('🔴 Cleaning up WEB location tracking');
      if (locationWatchId.current) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
      if (locationUpdateTimerRef.current) {
        clearInterval(locationUpdateTimerRef.current);
        locationUpdateTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [viewMode, selectedCar, locationEnabled, activeNDR]);

  return {
    locationEnabled,
    locationError,
    lastLocationUpdate,
    hasAlwaysPermission,
    debugStatus,
    startLocationTracking,
    stopLocationTracking,
    requestBackgroundPermission,
    setLocationEnabled,
    setDebugStatus
  };
};
