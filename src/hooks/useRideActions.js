import { useState } from 'react';
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import { isMale, isFemale } from '../utils/genderUtils';
import { logError } from '../utils/errorLogger';

/**
 * Custom hook for ride action handlers (assign, start, complete, cancel, terminate)
 *
 * @param {Object} activeNDR - The active NDR object
 * @param {number} availableCars - Number of available cars
 * @returns {Object} Object containing action handlers and loading states
 */
export const useRideActions = (activeNDR, availableCars) => {
  const [loadingStates, setLoadingStates] = useState({
    assigningCar: false,
    startingRide: {},
    completingRide: {},
    cancellingRide: {},
    terminatingRide: {},
    savingEdit: false,
    splittingRide: false
  });

  const [eligibleCars, setEligibleCars] = useState({});
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  /**
   * Check which cars are eligible for a single rider ride
   * @param {Object} ride - The ride to check eligibility for
   */
  const checkCarEligibility = async (ride) => {
    setCheckingEligibility(true);

    if (ride.riders === 1) {
      try {
        const ndrDoc = await getDoc(doc(db, 'ndrs', activeNDR.id));
        const ndrData = ndrDoc.data();
        const carEligibility = {};

        // Collect all member IDs across all cars first (fixes N+1 query)
        const allMemberIds = new Set();
        for (let carNum = 1; carNum <= availableCars; carNum++) {
          const carAssignments = ndrData.assignments?.cars?.[carNum] || [];
          carAssignments.forEach(id => allMemberIds.add(id));
        }

        // Batch fetch all members at once
        const memberIds = Array.from(allMemberIds);
        const memberMap = {};

        if (memberIds.length > 0) {
          // Firestore has a limit of 10 for 'in' queries, so batch in chunks of 10
          for (let i = 0; i < memberIds.length; i += 10) {
            const chunk = memberIds.slice(i, i + 10);
            const membersQuery = query(
              collection(db, 'members'),
              where(documentId(), 'in', chunk)
            );
            const membersSnapshot = await getDocs(membersQuery);
            membersSnapshot.docs.forEach(doc => {
              memberMap[doc.id] = doc.data();
            });
          }
        }

        // Check each car using the cached member data
        for (let carNum = 1; carNum <= availableCars; carNum++) {
          const carAssignments = ndrData.assignments?.cars?.[carNum] || [];

          if (carAssignments.length < 2) {
            carEligibility[carNum] = {
              eligible: false,
              reason: 'Needs 2+ members',
              maleCount: 0,
              femaleCount: 0
            };
            continue;
          }

          // Use cached member data
          const carMembers = carAssignments
            .map(id => memberMap[id])
            .filter(Boolean);

          const maleCount = carMembers.filter(m => isMale(m)).length;
          const femaleCount = carMembers.filter(m => isFemale(m)).length;
          const hasMale = maleCount > 0;
          const hasFemale = femaleCount > 0;

          if (!hasMale || !hasFemale) {
            carEligibility[carNum] = {
              eligible: false,
              reason: 'Needs opposite genders',
              maleCount,
              femaleCount
            };
          } else {
            carEligibility[carNum] = {
              eligible: true,
              reason: '',
              maleCount,
              femaleCount
            };
          }
        }

        setEligibleCars(carEligibility);
      } catch (error) {
        logError('Car Eligibility Check', error, { rideId: ride.id });
      }
    } else {
      setEligibleCars({});
    }

    setCheckingEligibility(false);
  };

  /**
   * Assign a car to a ride
   * @param {string} rideId - The ride ID
   * @param {number} carNumber - The car number to assign
   * @returns {Promise<void>}
   */
  const assignCar = async (rideId, carNumber) => {
    setLoadingStates(prev => ({ ...prev, assigningCar: true }));

    try {
      const ndrDoc = await getDoc(doc(db, 'ndrs', activeNDR.id));
      const ndrData = ndrDoc.data();
      const cars = ndrData.cars || [];
      const carInfo = cars.find(c => c.carNumber === carNumber);

      // Verify ride still exists and is pending
      const rideDoc = await getDoc(doc(db, 'rides', rideId));
      if (!rideDoc.exists()) {
        throw new Error('Ride not found');
      }

      const currentRide = rideDoc.data();
      if (currentRide.status !== 'pending') {
        throw new Error('Ride already assigned');
      }

      const currentVersion = currentRide.version || 0;

      await updateDoc(doc(db, 'rides', rideId), {
        status: 'active',
        carNumber: carNumber,
        assignedDriver: carInfo ? `${carInfo.driverName}` : 'Unknown Driver',
        carInfo: carInfo || null,
        assignedAt: Timestamp.now(),
        version: currentVersion + 1
      });

      setLoadingStates(prev => ({ ...prev, assigningCar: false }));
      return { success: true };
    } catch (error) {
      logError('Assign Car', error, { rideId, carNumber });
      setLoadingStates(prev => ({ ...prev, assigningCar: false }));
      throw error;
    }
  };

  /**
   * Mark a ride as picked up
   * @param {string} rideId - The ride ID
   * @returns {Promise<void>}
   */
  const startRide = async (rideId) => {
    setLoadingStates(prev => ({ ...prev, startingRide: { ...prev.startingRide, [rideId]: true } }));

    try {
      await updateDoc(doc(db, 'rides', rideId), {
        pickedUpAt: Timestamp.now()
      });

      setLoadingStates(prev => ({ ...prev, startingRide: { ...prev.startingRide, [rideId]: false } }));
      return { success: true };
    } catch (error) {
      logError('Start Ride', error, { rideId });
      setLoadingStates(prev => ({ ...prev, startingRide: { ...prev.startingRide, [rideId]: false } }));
      throw error;
    }
  };

  /**
   * Mark a ride as completed
   * @param {string} rideId - The ride ID
   * @returns {Promise<Object>} Previous state for undo
   */
  const completeRide = async (rideId) => {
    setLoadingStates(prev => ({ ...prev, completingRide: { ...prev.completingRide, [rideId]: true } }));

    try {
      const rideDoc = await getDoc(doc(db, 'rides', rideId));
      const previousState = rideDoc.data();

      await updateDoc(doc(db, 'rides', rideId), {
        status: 'completed',
        completedAt: Timestamp.now()
      });

      setLoadingStates(prev => ({ ...prev, completingRide: { ...prev.completingRide, [rideId]: false } }));
      return { success: true, previousState };
    } catch (error) {
      logError('Complete Ride', error, { rideId });
      setLoadingStates(prev => ({ ...prev, completingRide: { ...prev.completingRide, [rideId]: false } }));
      throw error;
    }
  };

  /**
   * Cancel a ride
   * @param {string} rideId - The ride ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Previous state for undo
   */
  const cancelRide = async (rideId, reason) => {
    setLoadingStates(prev => ({ ...prev, cancellingRide: { ...prev.cancellingRide, [rideId]: true } }));

    try {
      const rideDoc = await getDoc(doc(db, 'rides', rideId));
      const previousState = rideDoc.data();

      await updateDoc(doc(db, 'rides', rideId), {
        status: 'cancelled',
        completedAt: Timestamp.now(),
        cancellationReason: reason || 'No reason provided'
      });

      setLoadingStates(prev => ({ ...prev, cancellingRide: { ...prev.cancellingRide, [rideId]: false } }));
      return { success: true, previousState };
    } catch (error) {
      logError('Cancel Ride', error, { rideId, reason });
      setLoadingStates(prev => ({ ...prev, cancellingRide: { ...prev.cancellingRide, [rideId]: false } }));
      throw error;
    }
  };

  /**
   * Terminate a ride
   * @param {string} rideId - The ride ID
   * @param {string} reason - Termination reason
   * @returns {Promise<Object>} Previous state for undo
   */
  const terminateRide = async (rideId, reason) => {
    setLoadingStates(prev => ({ ...prev, terminatingRide: { ...prev.terminatingRide, [rideId]: true } }));

    try {
      const rideDoc = await getDoc(doc(db, 'rides', rideId));
      const previousState = rideDoc.data();

      await updateDoc(doc(db, 'rides', rideId), {
        status: 'terminated',
        completedAt: Timestamp.now(),
        terminationReason: reason || 'No reason provided'
      });

      setLoadingStates(prev => ({ ...prev, terminatingRide: { ...prev.terminatingRide, [rideId]: false } }));
      return { success: true, previousState };
    } catch (error) {
      logError('Terminate Ride', error, { rideId, reason });
      setLoadingStates(prev => ({ ...prev, terminatingRide: { ...prev.terminatingRide, [rideId]: false } }));
      throw error;
    }
  };

  /**
   * Update ride details
   * @param {Object} rideData - Updated ride data
   * @returns {Promise<void>}
   */
  const updateRide = async (rideData) => {
    setLoadingStates(prev => ({ ...prev, savingEdit: true }));

    try {
      const rideDoc = await getDoc(doc(db, 'rides', rideData.id));
      if (!rideDoc.exists()) {
        throw new Error('Ride not found');
      }

      const currentRide = rideDoc.data();
      const currentVersion = currentRide.version || 0;

      await updateDoc(doc(db, 'rides', rideData.id), {
        patronName: rideData.patronName.trim(),
        phone: rideData.phone.trim(),
        pickup: rideData.pickup.trim(),
        dropoffs: rideData.dropoffs,
        riders: rideData.riders,
        version: currentVersion + 1
      });

      setLoadingStates(prev => ({ ...prev, savingEdit: false }));
      return { success: true };
    } catch (error) {
      logError('Update Ride', error, { rideId: rideData.id });
      setLoadingStates(prev => ({ ...prev, savingEdit: false }));
      throw error;
    }
  };

  /**
   * Split a ride into two separate rides
   * @param {Object} ride - Original ride
   * @param {Object} splitRiders - {ride1: number, ride2: number}
   * @returns {Promise<void>}
   */
  const splitRide = async (ride, splitRiders) => {
    setLoadingStates(prev => ({ ...prev, splittingRide: true }));

    try {
      await updateDoc(doc(db, 'rides', ride.id), {
        riders: splitRiders.ride1,
        version: (ride.version || 0) + 1
      });

      await addDoc(collection(db, 'rides'), {
        ndrId: ride.ndrId,
        patronName: ride.patronName,
        phone: ride.phone,
        pickup: ride.pickup,
        dropoffs: ride.dropoffs || [ride.dropoff],
        riders: splitRiders.ride2,
        status: 'pending',
        requestedAt: Timestamp.now(),
        requestedBy: ride.requestedBy,
        splitFrom: ride.id,
        version: 1
      });

      setLoadingStates(prev => ({ ...prev, splittingRide: false }));
      return { success: true };
    } catch (error) {
      logError('Split Ride', error, { rideId: ride.id, split: splitRiders });
      setLoadingStates(prev => ({ ...prev, splittingRide: false }));
      throw error;
    }
  };

  /**
   * Reassign active ride to different car
   * @param {string} rideId - The ride ID
   * @param {number} newCarNumber - New car number
   * @returns {Promise<void>}
   */
  const reassignRide = async (rideId, newCarNumber) => {
    try {
      const ndrDoc = await getDoc(doc(db, 'ndrs', activeNDR.id));
      const ndrData = ndrDoc.data();
      const cars = ndrData.cars || [];
      const carInfo = cars.find(c => c.carNumber === newCarNumber);

      await updateDoc(doc(db, 'rides', rideId), {
        carNumber: newCarNumber,
        assignedDriver: carInfo ? `${carInfo.driverName}` : 'Unknown Driver',
        carInfo: carInfo || null,
        reassignedAt: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      logError('Reassign Ride', error, { rideId });
      throw error;
    }
  };

  /**
   * Assign pending ride to same car as active ride
   * @param {string} pendingRideId - Pending ride ID
   * @param {string} activeRideId - Active ride ID
   * @returns {Promise<void>}
   */
  const assignToActiveRide = async (pendingRideId, activeRideId) => {
    try {
      const pendingRideDoc = await getDoc(doc(db, 'rides', pendingRideId));
      const activeRideDoc = await getDoc(doc(db, 'rides', activeRideId));

      if (!pendingRideDoc.exists() || !activeRideDoc.exists()) {
        throw new Error('One or both rides no longer exist');
      }

      const activeRide = activeRideDoc.data();

      await updateDoc(doc(db, 'rides', pendingRideId), {
        status: 'active',
        carNumber: activeRide.carNumber,
        assignedAt: Timestamp.now()
      });

      return { success: true, carNumber: activeRide.carNumber };
    } catch (error) {
      logError('Assign to Active Ride', error, { pendingRideId, activeRideId });
      throw error;
    }
  };

  /**
   * Undo last action
   * @param {Object} lastAction - {type, rideId, previousState}
   * @returns {Promise<void>}
   */
  const undoLastAction = async (lastAction) => {
    try {
      const { rideId, previousState } = lastAction;

      await updateDoc(doc(db, 'rides', rideId), {
        status: previousState.status,
        completedAt: previousState.completedAt || null,
        cancellationReason: previousState.cancellationReason || null,
        terminationReason: previousState.terminationReason || null
      });

      return { success: true };
    } catch (error) {
      logError('Undo Action', error, { lastAction });
      throw error;
    }
  };

  return {
    assignCar,
    startRide,
    completeRide,
    cancelRide,
    terminateRide,
    updateRide,
    splitRide,
    reassignRide,
    assignToActiveRide,
    undoLastAction,
    checkCarEligibility,
    eligibleCars,
    checkingEligibility,
    loadingStates
  };
};
