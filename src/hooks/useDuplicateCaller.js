import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const isDev = process.env.NODE_ENV === 'development';
const devError = (...args) => {
  if (isDev) console.error(...args);
};

/**
 * Custom hook to detect if a phone number has already called tonight
 * Only triggers check when phone number is fully formatted (###) ###-####
 */
export const useDuplicateCaller = (activeNDR, phoneNumber) => {
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  useEffect(() => {
    const checkDuplicateCaller = async () => {
      // Only check when phone is fully formatted (###) ###-####
      if (!activeNDR || !phoneNumber || phoneNumber.length !== 14) {
        setDuplicateWarning(null);
        return;
      }

      try {
        const ridesRef = collection(db, 'rides');
        const ridesQuery = query(
          ridesRef,
          where('ndrId', '==', activeNDR.id),
          where('phone', '==', phoneNumber)
        );

        const snapshot = await getDocs(ridesQuery);

        if (!snapshot.empty) {
          const previousRides = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            requestedAt: doc.data().requestedAt?.toDate()
          }));

          setDuplicateWarning({
            count: previousRides.length,
            rides: previousRides
          });
        } else {
          setDuplicateWarning(null);
        }
      } catch (error) {
        devError('Error checking duplicate caller:', error);
      }
    };

    // Only trigger check when phone is fully formatted
    if (phoneNumber.length === 14) {
      const debounce = setTimeout(checkDuplicateCaller, 300);
      return () => clearTimeout(debounce);
    } else {
      setDuplicateWarning(null);
    }
  }, [phoneNumber, activeNDR]);

  return duplicateWarning;
};
