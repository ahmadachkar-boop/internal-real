import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook to track real-time car locations for the active NDR
 * Filters locations based on view mode (couch sees all, navigator sees own car)
 *
 * @param {Object} effectiveNDR - The effective NDR (active or historical)
 * @param {string} viewMode - Current view mode ('navigator' or 'couch')
 * @param {string} selectedCar - Selected car number
 * @returns {Object} Car locations mapped by car number
 */
export const useCarLocations = (effectiveNDR, viewMode, selectedCar) => {
  const [carLocations, setCarLocations] = useState({});

  useEffect(() => {
    if (!effectiveNDR) {
      setCarLocations({});
      return;
    }

    const locationsQuery = query(
      collection(db, 'carLocations'),
      where('ndrId', '==', effectiveNDR.id)
    );

    const unsubscribe = onSnapshot(locationsQuery, (snapshot) => {
      const locations = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const carNum = data.carNumber;

        // Filter based on view mode
        if (viewMode === 'couch' || (viewMode === 'navigator' && selectedCar && carNum === parseInt(selectedCar))) {
          locations[carNum] = {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            updatedAt: data.updatedAt?.toDate(),
            carNumber: carNum
          };
        }
      });

      console.log('📍 Updated car locations:', locations);
      setCarLocations(locations);
    });

    return () => unsubscribe();
  }, [effectiveNDR, viewMode, selectedCar]);

  return { carLocations };
};
