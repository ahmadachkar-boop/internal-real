import React from 'react';

/**
 * Component for switching between couch and navigator view modes
 * Only visible for couch-assigned users
 */
const ViewModeSwitcher = ({ viewMode, onViewModeChange, userAssignment, isHistoricalView }) => {
  // Only show for couch users and not in historical view
  if (isHistoricalView || !userAssignment || userAssignment.type !== 'couch') {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onViewModeChange('couch')}
        className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition whitespace-nowrap ${
          viewMode === 'couch'
            ? 'bg-[#79F200] text-gray-900'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        🛋️ Couch
      </button>
      <button
        onClick={() => onViewModeChange('navigator')}
        className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition whitespace-nowrap ${
          viewMode === 'navigator'
            ? 'bg-[#79F200] text-gray-900'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        🚗 Navigator
      </button>
    </div>
  );
};

export default ViewModeSwitcher;
