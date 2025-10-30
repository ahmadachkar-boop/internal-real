import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

/**
 * Custom hook for fetching and categorizing NDR data
 * @returns {Object} NDR data including categorized arrays and loading state
 */
const useNDRData = () => {
  const [ndrs, setNdrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ndrsRef = collection(db, 'ndrs');
    const ndrsQuery = query(ndrsRef);

    const unsubscribe = onSnapshot(
      ndrsQuery,
      (snapshot) => {
        const ndrsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          activatedAt: doc.data().activatedAt?.toDate(),
          endedAt: doc.data().endedAt?.toDate(),
          archivedAt: doc.data().archivedAt?.toDate(),
          eventDate: doc.data().eventDate?.toDate()
        }));
        setNdrs(ndrsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching NDRs:', error);
        setLoading(false);
        setNdrs([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // Categorize NDRs
  const now = new Date();
  const pendingNDRs = ndrs
    .filter(n => n.status === 'pending' && n.eventDate && n.eventDate >= now)
    .sort((a, b) => a.eventDate - b.eventDate);

  const activeNDR = ndrs.find(n => n.status === 'active');
  const archivedNDRs = ndrs.filter(n => n.status === 'archived').sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
  const completedNDRs = ndrs.filter(n => n.status === 'completed').sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));

  return {
    ndrs,
    loading,
    activeNDR,
    pendingNDRs,
    completedNDRs,
    archivedNDRs
  };
};

export default useNDRData;
