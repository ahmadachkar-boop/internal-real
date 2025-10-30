import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Component to display estimated wait time with live routing information
 * Shows min/max wait time, queue status, and car availability
 */
const EstimatedWaitTime = ({ estimatedWaitTime, calculatingWait }) => {
  if (calculatingWait && !estimatedWaitTime) {
    return (
      <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-600">Calculating wait time with live traffic data...</p>
      </div>
    );
  }

  if (!estimatedWaitTime) return null;

  return (
    <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock size={24} className="text-blue-600" />
          <div>
            <p className="text-xs font-semibold text-blue-800 uppercase flex items-center gap-2">
              Estimated Wait Time
              {estimatedWaitTime.usingRealRouting && (
                <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  LIVE ROUTING
                </span>
              )}
              {estimatedWaitTime.fallback && (
                <span className="bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  ESTIMATE
                </span>
              )}
            </p>
            <p className="text-2xl font-bold text-blue-900">
              {estimatedWaitTime.min}-{estimatedWaitTime.max} minutes
            </p>
            {estimatedWaitTime.fastestCar && (
              <p className="text-xs text-blue-700 mt-1">
                Fastest: Car {estimatedWaitTime.fastestCar}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-700">In Queue: {estimatedWaitTime.pendingCount}</p>
          <p className="text-xs text-blue-700">Free Cars: {estimatedWaitTime.freeCars}/{estimatedWaitTime.availableCars}</p>
        </div>
      </div>
    </div>
  );
};

export default EstimatedWaitTime;
