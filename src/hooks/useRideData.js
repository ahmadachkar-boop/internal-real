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
    let unsubPending, unsubActive, unsubCompleted;

    // Pending rides query
    const pendingQuery = query(ridesRef, where('status', '==', 'pending'), where('ndrId', '==', activeNDR.id));
    unsubPending = onSnapshot(
      pendingQuery,
      (snapshot) => {
        const pendingRides = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            requestedAt: data.requestedAt?.toDate() || new Date()
          };
        }).sort((a, b) => a.requestedAt - b.requestedAt);

        setRides(prev => ({ ...prev, pending: pendingRides }));
        setLoading(false);
      },
      (error) => {
        logError('Pending Rides Query', error);
        setLoading(false);
      }
    );

    // Active rides query
    const activeQuery = query(ridesRef, where('status', '==', 'active'), where('ndrId', '==', activeNDR.id));
    unsubActive = onSnapshot(
      activeQuery,
      (snapshot) => {
        const activeRides = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            requestedAt: data.requestedAt?.toDate() || new Date(),
            assignedAt: data.assignedAt?.toDate() || null,
            pickedUpAt: data.pickedUpAt?.toDate() || null
          };
        }).sort((a, b) => b.requestedAt - a.requestedAt);

        setRides(prev => ({ ...prev, active: activeRides }));
      },
      (error) => {
        logError('Active Rides Query', error);
      }
    );

    // Completed rides query
    const completedQuery = query(
      ridesRef,
      where('status', 'in', ['completed', 'cancelled', 'terminated']),
      where('ndrId', '==', activeNDR.id)
    );
    unsubCompleted = onSnapshot(
      completedQuery,
      (snapshot) => {
        const completedRides = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            requestedAt: data.requestedAt?.toDate() || new Date(),
            assignedAt: data.assignedAt?.toDate() || null,
            pickedUpAt: data.pickedUpAt?.toDate() || null,
            completedAt: data.completedAt?.toDate() || new Date()
          };
        }).sort((a, b) => b.completedAt - a.completedAt);

        setRides(prev => ({ ...prev, completed: completedRides }));
      },
      (error) => {
        logError('Completed Rides Query', error);
      }
    );

    return () => {
      if (unsubPending) unsubPending();
      if (unsubActive) unsubActive();
      if (unsubCompleted) unsubCompleted();
    };
  }, [activeNDR]);

  return { rides, loading };
};
