import { db } from '../firebase';
import { doc, updateDoc, Timestamp, collection, query, where, getDocs, deleteDoc, getDoc } from 'firebase/firestore';

/**
 * Custom hook for NDR lifecycle actions (activate, end, archive, reactivate)
 * @param {Object} userProfile - Current user profile
 * @param {Array} ndrs - Array of all NDRs
 * @returns {Object} Action functions for NDR lifecycle management
 */
const useNDRActions = (userProfile, ndrs) => {
  /**
   * Activate an NDR, ending any currently active NDRs
   */
  const activateNDR = async (ndrId) => {
    if (window.confirm('Activate this NDR? This will enable Phone Room and Ride Management.')) {
      try {
        const activeNdrs = ndrs.filter(n => n.status === 'active');
        for (const activeNdr of activeNdrs) {
          await updateDoc(doc(db, 'ndrs', activeNdr.id), {
            status: 'completed',
            endedAt: Timestamp.now()
          });
        }

        await updateDoc(doc(db, 'ndrs', ndrId), {
          status: 'active',
          activatedAt: Timestamp.now(),
          activatedBy: userProfile.id
        });
        alert('NDR activated! Phone Room and Ride Management are now accessible.');
      } catch (error) {
        console.error('Error activating NDR:', error);
        alert('Error activating NDR: ' + error.message);
      }
    }
  };

  /**
   * End an NDR, calculating ride statistics and cleaning up temporary blacklists
   */
  const endNDR = async (ndrId) => {
    if (window.confirm('End this NDR? This will disable Phone Room and Ride Management.')) {
      try {
        // Calculate ride statistics
        const ridesRef = collection(db, 'rides');
        const ridesQuery = query(ridesRef, where('ndrId', '==', ndrId));
        const ridesSnapshot = await getDocs(ridesQuery);

        let completedRiders = 0, cancelledRiders = 0, terminatedRiders = 0;
        let completedRides = 0, cancelledRides = 0, terminatedRides = 0;

        ridesSnapshot.forEach(doc => {
          const data = doc.data();
          const status = data.status;
          const riders = data.riders || 1;

          if (status === 'completed') {
            completedRiders += riders;
            completedRides++;
          } else if (status === 'cancelled') {
            cancelledRiders += riders;
            cancelledRides++;
          } else if (status === 'terminated') {
            terminatedRiders += riders;
            terminatedRides++;
          }
        });

        // Cleanup temporary blacklists for this NDR

        // Remove temporary address blacklists for this NDR
        const addressBlacklistRef = collection(db, 'addressBlacklist');
        const addressBlacklistQuery = query(
          addressBlacklistRef,
          where('scope', '==', 'temporary'),
          where('ndrId', '==', ndrId)
        );
        const addressBlacklistSnapshot = await getDocs(addressBlacklistQuery);

        const addressDeletions = addressBlacklistSnapshot.docs.map(doc =>
          deleteDoc(doc.ref)
        );

        // Remove temporary phone blacklists for this NDR
        const phoneBlacklistRef = collection(db, 'phoneBlacklist');
        const phoneBlacklistQuery = query(
          phoneBlacklistRef,
          where('scope', '==', 'temporary'),
          where('ndrId', '==', ndrId)
        );
        const phoneBlacklistSnapshot = await getDocs(phoneBlacklistQuery);

        const phoneDeletions = phoneBlacklistSnapshot.docs.map(doc =>
          deleteDoc(doc.ref)
        );

        // Wait for all blacklist deletions to complete
        await Promise.all([...addressDeletions, ...phoneDeletions]);

        const totalBlacklistsRemoved = addressDeletions.length + phoneDeletions.length;

        console.log(`Removed ${totalBlacklistsRemoved} temporary blacklist(s) for NDR ${ndrId}`);

        // Update NDR status
        await updateDoc(doc(db, 'ndrs', ndrId), {
          status: 'completed',
          endedAt: Timestamp.now(),
          completedRiders,
          cancelledRiders,
          terminatedRiders,
          completedRides,
          cancelledRides,
          terminatedRides
        });

        const message = totalBlacklistsRemoved > 0
          ? `NDR ended. Phone Room and Ride Management are now disabled. Removed ${totalBlacklistsRemoved} temporary blacklist(s).`
          : 'NDR ended. Phone Room and Ride Management are now disabled.';

        alert(message);
      } catch (error) {
        console.error('Error ending NDR:', error);
        alert('Error ending NDR: ' + error.message);
      }
    }
  };

  /**
   * Archive an NDR with a generated summary
   */
  const archiveNDR = async (ndrId) => {
    if (window.confirm('Archive this NDR? You can reactivate it later if needed.')) {
      try {
        const ndrDoc = await getDoc(doc(db, 'ndrs', ndrId));
        const ndrData = ndrDoc.data();

        const summary = generateNDRSummary(ndrData);

        await updateDoc(doc(db, 'ndrs', ndrId), {
          status: 'archived',
          archivedAt: Timestamp.now(),
          archivedBy: userProfile.id,
          archivedSummary: summary
        });
        alert('NDR archived successfully!');
      } catch (error) {
        console.error('Error archiving NDR:', error);
        alert('Error archiving NDR: ' + error.message);
      }
    }
  };

  /**
   * Generate a text summary of an NDR for archiving
   */
  const generateNDRSummary = (ndrData) => {
    const parts = [];

    parts.push(`EVENT: ${ndrData.eventName}`);
    parts.push(`DATE: ${new Date(ndrData.eventDate?.seconds * 1000).toLocaleDateString()}`);
    parts.push(`LOCATION: ${ndrData.location || 'N/A'}`);
    parts.push('');

    parts.push('STATISTICS:');
    parts.push(`- Completed Riders: ${ndrData.completedRiders || 0}`);
    parts.push(`- Cancelled Riders: ${ndrData.cancelledRiders || 0}`);
    parts.push(`- Terminated Riders: ${ndrData.terminatedRiders || 0}`);
    parts.push(`- Total Members: ${ndrData.signedUpMembers?.length || 0}`);
    parts.push(`- Cars Available: ${ndrData.availableCars || 0}`);
    parts.push('');

    if (ndrData.notes?.leadership) {
      parts.push('LEADERSHIP:');
      if (ndrData.notes.leadership.don) parts.push(`- DON: ${ndrData.notes.leadership.don}`);
      if (ndrData.notes.leadership.doc) parts.push(`- DOC: ${ndrData.notes.leadership.doc}`);
      if (ndrData.notes.leadership.duc) parts.push(`- DUC: ${ndrData.notes.leadership.duc}`);
      if (ndrData.notes.leadership.execs) parts.push(`- Executives: ${ndrData.notes.leadership.execs}`);
      if (ndrData.notes.leadership.directors) parts.push(`- Directors: ${ndrData.notes.leadership.directors}`);
      parts.push('');
    }

    if (ndrData.notes?.couchPhoneRoles) {
      parts.push('ROLES:');
      if (ndrData.notes.couchPhoneRoles.couch) parts.push(`- Couch: ${ndrData.notes.couchPhoneRoles.couch}`);
      if (ndrData.notes.couchPhoneRoles.phones) parts.push(`- Phones: ${ndrData.notes.couchPhoneRoles.phones}`);
      parts.push('');
    }

    if (ndrData.cars && ndrData.cars.length > 0) {
      parts.push('CARS:');
      ndrData.cars.forEach(car => {
        parts.push(`Car ${car.carNumber}: ${car.make} ${car.model} ${car.color} (${car.licensePlate})`);
        if (car.driver) parts.push(`  Driver: ${car.driver}`);
        if (car.navigator) parts.push(`  Navigator: ${car.navigator}`);
      });
      parts.push('');
    }

    if (ndrData.notes?.updates && ndrData.notes.updates.length > 0) {
      parts.push('PROGRESS UPDATES:');
      ndrData.notes.updates.forEach(update => {
        parts.push(`[${update.time}] ${update.text}`);
      });
      parts.push('');
    }

    if (ndrData.notes?.summary) {
      parts.push('SUMMARY:');
      parts.push(ndrData.notes.summary);
    }

    return parts.join('\n');
  };

  return {
    activateNDR,
    endNDR,
    archiveNDR
  };
};

export default useNDRActions;
