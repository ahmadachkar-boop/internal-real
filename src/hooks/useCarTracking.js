import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const CLOCK_UPDATE_INTERVAL_MS = 1000; // Update clock every second

/**
 * Custom hook for tracking car locations and statuses
 *
 * @param {Object} activeNDR - The active NDR object
 * @param {Object} rides - Rides object with {pending, active, completed}
 * @param {number} availableCars - Number of available cars
 * @returns {Object} Object containing:
 *   - carLocations: Object with car locations keyed by car number
 *   - carStatuses: Object with car statuses keyed by car number
 *   - currentTime: Current time (updates every second)
 */
export const useCarTracking = (activeNDR, rides, availableCars) => {
  const [carLocations, setCarLocations] = useState({});
  const [carStatuses, setCarStatuses] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Listen to car locations
  useEffect(() => {
    if (!activeNDR) return;

    const locationsRef = collection(db, 'carLocations');
    const locationsQuery = query(
      locationsRef,
      where('ndrId', '==', activeNDR.id)
    );

    const unsubscribe = onSnapshot(locationsQuery, (snapshot) => {
      const locations = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        locations[data.carNumber] = {
          ...data,
          updatedAt: data.updatedAt?.toDate()
        };
      });
      setCarLocations(locations);
    });

    return () => unsubscribe();
  }, [activeNDR]);

  // Calculate car statuses based on rides
  useEffect(() => {
    if (!activeNDR || !availableCars || !rides) return;

    const statuses = {};

    // Initialize all cars as available
    for (let i = 1; i <= availableCars; i++) {
      statuses[i] = {
        status: 'available',
        currentRide: null,
        ridesCompleted: 0,
        lastActivity: null
      };
    }

    // Update statuses based on active rides
    rides.active.forEach(ride => {
      if (ride.carNumber && statuses[ride.carNumber]) {
        statuses[ride.carNumber] = {
          status: ride.pickedUpAt ? 'with_patron' : 'en_route',
          currentRide: ride,
          ridesCompleted: statuses[ride.carNumber].ridesCompleted,
          lastActivity: ride.pickedUpAt || ride.assignedAt
        };
      }
    });

    // Count completed rides per car
    rides.completed.forEach(ride => {
      if (ride.carNumber && statuses[ride.carNumber] && ride.status === 'completed') {
        statuses[ride.carNumber].ridesCompleted++;
      }
    });

    setCarStatuses(statuses);
  }, [rides, availableCars, activeNDR]);

  // Update current time for timer displays
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, CLOCK_UPDATE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return { carLocations, carStatuses, currentTime };
};
