import React from 'react';
import NDRCard from './NDRCard';

/**
 * ActiveNDRBanner component - Displays the currently active NDR in a highlighted banner
 * @param {Object} activeNDR - The active NDR object
 * @param {Function} onView - Callback to view NDR details
 * @param {Function} onEnd - Callback to end NDR
 * @param {Function} onArchive - Callback to archive NDR
 * @param {Function} onActivate - Callback to activate NDR
 */
const ActiveNDRBanner = ({ activeNDR, onView, onEnd, onArchive, onActivate }) => {
  if (!activeNDR) return null;

  return (
    <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <h3 className="text-xl font-bold text-green-800">Currently Active</h3>
      </div>
      <NDRCard
        ndr={activeNDR}
        onView={onView}
        onEnd={onEnd}
        onArchive={onArchive}
        onActivate={onActivate}
      />
    </div>
  );
};

export default ActiveNDRBanner;
