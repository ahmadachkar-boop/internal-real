import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import useNDRData from '../hooks/useNDRData';
import useNDRActions from '../hooks/useNDRActions';
import ActiveNDRBanner from './NDRReports/ActiveNDRBanner';
import NDRList from './NDRReports/NDRList';
import NDRDetail from './NDRDetail';

/**
 * NDRReports - Main listing component for NDR management
 * Displays active, pending, completed, and archived NDRs
 */
const NDRReports = () => {
  const [selectedNdr, setSelectedNdr] = useState(null);
  const [selectedPendingNdrIndex, setSelectedPendingNdrIndex] = useState(0);
  const { userProfile } = useAuth();

  // Fetch and categorize all NDRs
  const {
    ndrs,
    loading,
    activeNDR,
    pendingNDRs,
    completedNDRs,
    archivedNDRs
  } = useNDRData();

  // Get NDR lifecycle action functions
  const { activateNDR, endNDR, archiveNDR } = useNDRActions(userProfile, ndrs);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">NDR Reports</h2>
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500">Loading NDR reports...</p>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedNdr) {
    return <NDRDetail ndr={selectedNdr} onBack={() => setSelectedNdr(null)} />;
  }

  // Main listing view
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">NDR Reports</h2>

      {/* Active NDR Banner */}
      <ActiveNDRBanner
        activeNDR={activeNDR}
        onView={setSelectedNdr}
        onEnd={endNDR}
        onArchive={archiveNDR}
        onActivate={activateNDR}
      />

      {/* Pending NDRs */}
      <NDRList
        title="Next NDR to Activate"
        type="pending"
        ndrs={pendingNDRs}
        selectedIndex={selectedPendingNdrIndex}
        onSelectIndex={setSelectedPendingNdrIndex}
        onView={setSelectedNdr}
        onEnd={endNDR}
        onArchive={archiveNDR}
        onActivate={activateNDR}
      />

      {/* Completed NDRs */}
      <NDRList
        title="Completed NDRs"
        type="completed"
        ndrs={completedNDRs}
        onView={setSelectedNdr}
        onEnd={endNDR}
        onArchive={archiveNDR}
        onActivate={activateNDR}
      />

      {/* Archived NDRs */}
      <NDRList
        title="Archived NDRs"
        type="archived"
        ndrs={archivedNDRs}
        onView={setSelectedNdr}
        onEnd={endNDR}
        onArchive={archiveNDR}
        onActivate={activateNDR}
      />

      {/* No active or pending NDRs message */}
      {!activeNDR && pendingNDRs.length === 0 && ndrs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">All NDRs have been completed or archived.</p>
        </div>
      )}
    </div>
  );
};

export default NDRReports;
