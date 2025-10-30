import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { isNativeApp } from '../capacitorUtils';
import { savePendingFCMToken } from '../fcmUtils';

/**
 * Custom hook to manage user assignment and access control
 * Checks if user is assigned to couch or a specific car for the active NDR
 *
 * @param {Object} activeNDR - The active NDR object
 * @param {Object} userProfile - The user profile object
 * @returns {Object} User assignment state and loading status
 */
export const useNavigatorAssignment = (activeNDR, userProfile) => {
  const [userAssignment, setUserAssignment] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const fcmTokenUploadedRef = useRef(false);

  useEffect(() => {
    const checkUserAssignment = async () => {
      if (!activeNDR || !userProfile) {
        setAssignmentLoading(false);
        return;
      }

      setAssignmentLoading(true);
      console.log('🔐 Checking user assignment for:', userProfile.id);

      try {
        const ndrDocRef = doc(db, 'ndrs', activeNDR.id);
        const ndrDoc = await getDoc(ndrDocRef);

        if (!ndrDoc.exists()) {
          console.log('❌ NDR document not found');
          setUserAssignment({ type: 'unassigned' });
          setAssignmentLoading(false);
          return;
        }

        const ndrData = ndrDoc.data();
        const assignments = ndrData.assignments || {};
        const userId = userProfile.id;

        // Check if user is assigned to couch
        if (assignments.couch && Array.isArray(assignments.couch) && assignments.couch.includes(userId)) {
          console.log('✅ User is assigned to COUCH');
          setUserAssignment({ type: 'couch' });

          // Upload FCM token after role confirmation (only once)
          if (isNativeApp && !fcmTokenUploadedRef.current) {
            fcmTokenUploadedRef.current = true;
            savePendingFCMToken(userId).catch(error => {
              console.error('❌ Failed to upload FCM token:', error);
              fcmTokenUploadedRef.current = false;
            });
          }
        }
        // Check if user is assigned to any car
        else if (assignments.cars) {
          let assignedCarNumber = null;

          for (const [carNum, memberIds] of Object.entries(assignments.cars)) {
            if (Array.isArray(memberIds) && memberIds.includes(userId)) {
              assignedCarNumber = parseInt(carNum, 10);
              break;
            }
          }

          if (assignedCarNumber) {
            console.log(`✅ User is assigned to CAR ${assignedCarNumber}`);
            setUserAssignment({ type: 'car', carNumber: assignedCarNumber });

            // Upload FCM token after role confirmation (only once)
            if (isNativeApp && !fcmTokenUploadedRef.current) {
              fcmTokenUploadedRef.current = true;
              savePendingFCMToken(userId).catch(error => {
                console.error('❌ Failed to upload FCM token:', error);
                fcmTokenUploadedRef.current = false;
              });
            }
          } else {
            console.log('❌ User is NOT assigned to any role');
            setUserAssignment({ type: 'unassigned' });
          }
        } else {
          console.log('❌ User is NOT assigned to any role');
          setUserAssignment({ type: 'unassigned' });
        }

        setAssignmentLoading(false);
      } catch (error) {
        console.error('❌ Error checking user assignment:', error);
        setUserAssignment({ type: 'unassigned' });
        setAssignmentLoading(false);
      }
    };

    checkUserAssignment();
  }, [activeNDR, userProfile]);

  return { userAssignment, assignmentLoading };
};
