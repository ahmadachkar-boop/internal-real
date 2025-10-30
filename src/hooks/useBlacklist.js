import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook to manage blacklist data (addresses and phone numbers)
 * Returns approved blacklists and filters by active NDR scope
 */
export const useBlacklist = (activeNDR) => {
  const [blacklistedAddresses, setBlacklistedAddresses] = useState([]);
  const [blacklistedPhones, setBlacklistedPhones] = useState([]);

  // Helper function to get active blacklists (permanent + temporary for this NDR)
  const getActiveBlacklists = (blacklists) => {
    if (!activeNDR) return [];

    return blacklists.filter(item => {
      if (item.scope === 'permanent') return true;
      if (item.scope === 'temporary') {
        return item.ndrId === activeNDR.id;
      }
      return false;
    });
  };

  useEffect(() => {
    const addressBlacklistQuery = query(
      collection(db, 'addressBlacklist'),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(addressBlacklistQuery, (snapshot) => {
      const addresses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBlacklistedAddresses(addresses);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const phoneBlacklistQuery = query(
      collection(db, 'phoneBlacklist'),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(phoneBlacklistQuery, (snapshot) => {
      const phones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBlacklistedPhones(phones);
    });

    return () => unsubscribe();
  }, []);

  return {
    blacklistedAddresses,
    blacklistedPhones,
    getActiveBlacklists
  };
};
