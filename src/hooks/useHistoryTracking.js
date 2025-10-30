import { useRef, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook for tracking and rendering location history polylines for rides
 * Saves and loads location history from Firestore, renders polylines on map
 *
 * @param {Object} mapRef - Reference to the Google Map instance
 * @param {boolean} googleMapsLoaded - Whether Google Maps API is loaded
 * @param {Array} activeRides - Array of active rides
 * @param {Object} carLocations - Car locations object
 * @returns {Object} History tracking functions
 */
export const useHistoryTracking = (mapRef, googleMapsLoaded, activeRides, carLocations) => {
  const historyPolylinesRef = useRef({});
  const carLocationHistoryRef = useRef({});

  // Save history to Firestore
  const saveHistoryToFirestore = async (rideId, history) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await setDoc(rideRef, {
        locationHistory: history.map(point => ({
          lat: point.lat,
          lng: point.lng,
          timestamp: Timestamp.now()
        }))
      }, { merge: true });
      console.log(`💾 Saved history to Firestore for ride ${rideId} (${history.length} points)`);
    } catch (error) {
      console.error(`❌ Error saving history to Firestore for ride ${rideId}:`, error);
    }
  };

  // Load history from Firestore
  const loadHistoryFromFirestore = async (rideId) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      const rideDoc = await getDoc(rideRef);

      if (rideDoc.exists() && rideDoc.data().locationHistory) {
        const history = rideDoc.data().locationHistory.map(point => ({
          lat: point.lat,
          lng: point.lng
        }));
        console.log(`📥 Loaded history from Firestore for ride ${rideId} (${history.length} points)`);
        return history;
      }

      return [];
    } catch (error) {
      console.error(`❌ Error loading history from Firestore for ride ${rideId}:`, error);
      return [];
    }
  };

  // Restore history polyline from loaded data
  const restoreHistoryPolyline = (rideId, history) => {
    if (!mapRef.current || !googleMapsLoaded || !window.google) {
      console.log(`⏭️ Cannot restore history for ride ${rideId} - map not ready`);
      return;
    }

    if (!history || history.length === 0) {
      console.log(`⏭️ No history to restore for ride ${rideId}`);
      return;
    }

    carLocationHistoryRef.current[rideId] = history;
    console.log(`📝 Restored history array for ride ${rideId} (${history.length} points)`);

    if (history.length > 1) {
      const polyline = new window.google.maps.Polyline({
        path: history,
        geodesic: true,
        strokeColor: '#EF4444',
        strokeOpacity: 0.6,
        strokeWeight: 3,
        icons: [{
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            scale: 2
          },
          offset: '0',
          repeat: '10px'
        }],
        zIndex: 50,
        map: mapRef.current
      });

      historyPolylinesRef.current[rideId] = polyline;
      console.log(`🔴 Restored history trail for ride ${rideId} (${history.length} points)`);
    }
  };

  // Update or create history polyline for a ride
  const updateHistoryPolyline = async (rideId, carNumber, newLocation) => {
    if (!mapRef.current || !googleMapsLoaded || !window.google) {
      console.log(`⏭️ Cannot update history for ride ${rideId} - map not ready`);
      return;
    }

    if (!carLocationHistoryRef.current[rideId]) {
      carLocationHistoryRef.current[rideId] = [];
      console.log(`📝 Initialized history array for ride ${rideId}`);
    }

    const history = carLocationHistoryRef.current[rideId];
    const latLng = { lat: newLocation.latitude, lng: newLocation.longitude };

    const lastPoint = history[history.length - 1];
    if (!lastPoint || lastPoint.lat !== latLng.lat || lastPoint.lng !== latLng.lng) {
      history.push(latLng);
      console.log(`📍 Added point to history for ride ${rideId}. Total points: ${history.length}`);

      // Keep only last 100 points
      if (history.length > 100) {
        history.shift();
      }

      // Save to Firestore (async)
      saveHistoryToFirestore(rideId, history).catch(err => {
        console.error('Error saving history:', err);
      });

      // Update or create polyline
      if (historyPolylinesRef.current[rideId]) {
        historyPolylinesRef.current[rideId].setPath(history);
        console.log(`🔄 Updated existing history polyline for ride ${rideId}`);
      } else if (history.length > 1) {
        const polyline = new window.google.maps.Polyline({
          path: history,
          geodesic: true,
          strokeColor: '#EF4444',
          strokeOpacity: 0.6,
          strokeWeight: 3,
          icons: [{
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 2
            },
            offset: '0',
            repeat: '10px'
          }],
          zIndex: 50,
          map: mapRef.current
        });

        historyPolylinesRef.current[rideId] = polyline;
        console.log(`🔴 Created history trail for ride ${rideId} (${history.length} points)`);
      }
    } else {
      console.log(`⏭️ Location duplicate, not adding to history`);
    }
  };

  // Clear history polyline for a specific ride
  const clearHistoryPolyline = async (rideId, deleteFromFirestore = false) => {
    if (historyPolylinesRef.current[rideId]) {
      historyPolylinesRef.current[rideId].setMap(null);
      delete historyPolylinesRef.current[rideId];
    }

    if (deleteFromFirestore) {
      delete carLocationHistoryRef.current[rideId];

      try {
        const rideRef = doc(db, 'rides', rideId);
        await setDoc(rideRef, {
          locationHistory: []
        }, { merge: true });
        console.log(`🗑️ Deleted history from Firestore for completed ride ${rideId}`);
      } catch (error) {
        console.error(`❌ Error deleting history from Firestore for ride ${rideId}:`, error);
      }
    }
  };

  // Clear all history polylines
  const clearAllHistoryPolylines = () => {
    Object.keys(historyPolylinesRef.current).forEach(rideId => {
      if (historyPolylinesRef.current[rideId]) {
        historyPolylinesRef.current[rideId].setMap(null);
        delete historyPolylinesRef.current[rideId];
      }
    });
  };

  // Load history from Firestore when rides mount
  useEffect(() => {
    if (!mapRef.current || !googleMapsLoaded || !window.google) {
      console.log('⏭️ Cannot load history - map not ready');
      return;
    }

    if (!activeRides.length) {
      console.log('⏭️ No active rides to load history for');
      return;
    }

    console.log('📥 Loading history from Firestore for active rides');

    activeRides.forEach(async (ride) => {
      if (!carLocationHistoryRef.current[ride.id] || carLocationHistoryRef.current[ride.id].length === 0) {
        console.log(`📥 Loading history for ride ${ride.id}`);
        const history = await loadHistoryFromFirestore(ride.id);
        if (history.length > 0) {
          restoreHistoryPolyline(ride.id, history);
        }
      }
    });
  }, [activeRides, googleMapsLoaded]);

  // Track car location history for active rides
  useEffect(() => {
    if (!activeRides.length || !Object.keys(carLocations).length) return;

    console.log('🔍 History tracking - Active rides:', activeRides.length, 'Car locations:', Object.keys(carLocations));

    activeRides.forEach(ride => {
      if (ride.carNumber) {
        const carNum = ride.carNumber;
        const location = carLocations[carNum];

        if (location && location.latitude && location.longitude) {
          console.log(`✅ Updating history for ride ${ride.id}, car ${carNum}`);
          updateHistoryPolyline(ride.id, carNum, location);
        }
      }
    });
  }, [carLocations, activeRides]);

  // Clear history when rides complete
  useEffect(() => {
    if (!activeRides.length) {
      Object.keys(carLocationHistoryRef.current).forEach(rideId => {
        console.log(`🧹 Clearing history for completed ride ${rideId} (no active rides)`);
        clearHistoryPolyline(rideId, true);
      });
    } else {
      const activeRideIds = activeRides.map(r => r.id);
      Object.keys(carLocationHistoryRef.current).forEach(rideId => {
        if (!activeRideIds.includes(rideId)) {
          console.log(`🧹 Clearing history for completed ride ${rideId}`);
          clearHistoryPolyline(rideId, true);
        }
      });
    }
  }, [activeRides]);

  return {
    saveHistoryToFirestore,
    loadHistoryFromFirestore,
    restoreHistoryPolyline,
    updateHistoryPolyline,
    clearHistoryPolyline,
    clearAllHistoryPolylines,
    historyPolylinesRef,
    carLocationHistoryRef
  };
};
