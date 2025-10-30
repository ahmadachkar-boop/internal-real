import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { logError } from '../utils/errorLogger';

/**
 * Custom hook for managing ride data (pending, active, completed)
 *
 * @param {Object} activeNDR - The active NDR object
 * @returns {Object} Object containing:
 *   - rides: {pending: [], active: [], completed: []} - Ride data
 *   - loading: boolean - Loading state
 */
export const useRideData = (activeNDR) => {
  const [rides, setRides] = useState({ pending: [], active: [], completed: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeNDR) {
      setLoading(false);
      return;
    }

    const ridesRef = collection(db, 'rides');

    // Single query for ALL statuses - let Firestore do the work
    const allRidesQuery = query(
      ridesRef,
      where('ndrId', '==', activeNDR.id),
      where('status', 'in', ['pending', 'active', 'completed', 'cancelled', 'terminated'])
    );

    const unsubscribe = onSnapshot(
      allRidesQuery,
      (snapshot) => {
        const pending = [];
        const active = [];
        const completed = [];

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const ride = {
            id: doc.id,
            ...data,
            requestedAt: data.requestedAt?.toDate() || new Date(),
            assignedAt: data.assignedAt?.toDate() || null,
            pickedUpAt: data.pickedUpAt?.toDate() || null,
            completedAt: data.completedAt?.toDate() || null
          };

          if (data.status === 'pending') {
            pending.push(ride);
          } else if (data.status === 'active') {
            active.push(ride);
          } else if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'terminated') {
            completed.push(ride);
          }
        });

        // Sort once per status
        pending.sort((a, b) => a.requestedAt - b.requestedAt);
        active.sort((a, b) => b.requestedAt - a.requestedAt);
        completed.sort((a, b) => b.completedAt - a.completedAt);

        setRides({ pending, active, completed });
        setLoading(false);
      },
      (error) => {
        logError('All Rides Query', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeNDR]);

  return { rides, loading };
};
