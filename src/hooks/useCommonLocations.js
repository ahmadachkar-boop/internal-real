import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook to track common pickup/dropoff locations for the active NDR
 * Returns the top 10 most frequently used locations from tonight's rides
 */
export const useCommonLocations = (activeNDR) => {
  const [commonLocations, setCommonLocations] = useState([]);

  useEffect(() => {
    if (!activeNDR) {
      setCommonLocations([]);
      return;
    }

    const ridesRef = collection(db, 'rides');
    const ridesQuery = query(ridesRef, where('ndrId', '==', activeNDR.id));

    const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
      const locations = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();

        // Count pickups
        if (data.pickup) {
          locations[data.pickup] = (locations[data.pickup] || 0) + 1;
        }

        // Count dropoffs
        if (data.dropoffs) {
          data.dropoffs.forEach(dropoff => {
            locations[dropoff] = (locations[dropoff] || 0) + 1;
          });
        } else if (data.dropoff) {
          locations[data.dropoff] = (locations[data.dropoff] || 0) + 1;
        }
      });

      // Sort by frequency and take top 10
      const sortedLocations = Object.entries(locations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([address, count]) => ({ address, count }));

      setCommonLocations(sortedLocations);
    });

    return () => unsubscribe();
  }, [activeNDR]);

  return commonLocations;
};
