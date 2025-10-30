import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook for tracking active rides assigned to a car
 * Fetches and listens to rides in real-time for the active NDR
 *
 * @param {Object} effectiveNDR - The effective NDR (active or historical)
 * @param {string} selectedCar - Selected car number
 * @param {string} viewMode - Current view mode ('navigator' or 'couch')
 * @returns {Object} Active rides and loading state
 */
export const useRideTracking = (effectiveNDR, selectedCar, viewMode) => {
  const [activeRides, setActiveRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveNDR) {
      setActiveRides([]);
      setLoading(false);
      return;
    }

    if (viewMode === 'navigator' && !selectedCar) {
      setActiveRides([]);
      setLoading(false);
      return;
    }

    let ridesQuery;

    if (viewMode === 'couch' && selectedCar) {
      // Couch view with selected car - show active and pending rides for that car
      ridesQuery = query(
        collection(db, 'rides'),
        where('ndrId', '==', effectiveNDR.id),
        where('carNumber', '==', parseInt(selectedCar, 10)),
        where('status', 'in', ['active', 'pending'])
      );
    } else if (viewMode === 'couch' && !selectedCar) {
      // Couch view without selected car - show ALL active/pending rides
      ridesQuery = query(
        collection(db, 'rides'),
        where('ndrId', '==', effectiveNDR.id),
        where('status', 'in', ['active', 'pending'])
      );
    } else if (viewMode === 'navigator' && selectedCar) {
      // Navigator view - only show active rides for their car
      ridesQuery = query(
        collection(db, 'rides'),
        where('ndrId', '==', effectiveNDR.id),
        where('carNumber', '==', parseInt(selectedCar, 10)),
        where('status', '==', 'active')
      );
    } else {
      setActiveRides([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ridesQuery,
      (snapshot) => {
        if (snapshot.empty) {
          console.log('No active rides found');
          setActiveRides([]);
        } else {
          const rides = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().patronName,
            phone: doc.data().phone,
            pickup: doc.data().pickup,
            dropoffs: doc.data().dropoffs || [doc.data().dropoff],
            riders: doc.data().riders,
            status: doc.data().status,
            carNumber: doc.data().carNumber
          }));
          setActiveRides(rides);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error loading rides:', error);
        setActiveRides([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [effectiveNDR, selectedCar, viewMode]);

  return { activeRides, loading };
};
