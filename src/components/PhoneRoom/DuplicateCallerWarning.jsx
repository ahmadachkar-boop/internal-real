import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Warning component displayed when a duplicate caller is detected
 * Shows previous ride history for the phone number
 */
const DuplicateCallerWarning = ({ duplicateCallerWarning }) => {
  if (!duplicateCallerWarning) return null;

  return (
    <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
        <div className="flex-1">
          <p className="font-bold text-red-900 text-lg mb-2">
            ⚠️ DUPLICATE CALLER DETECTED
          </p>
          <p className="text-red-800 font-semibold mb-2">
            This phone number has already requested {duplicateCallerWarning.count} ride{duplicateCallerWarning.count > 1 ? 's' : ''} tonight:
          </p>
          <div className="space-y-2">
            {duplicateCallerWarning.rides.map((ride, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 border border-red-300">
                <p className="text-sm font-semibold text-gray-900">
                  {ride.patronName} - {ride.requestedAt?.toLocaleTimeString()}
                </p>
                <p className="text-sm text-gray-700">
                  Status: <span className="font-bold capitalize">{ride.status}</span>
                </p>
                {ride.status === 'cancelled' && ride.cancellationReason && (
                  <p className="text-xs text-gray-600">
                    Cancelled: {ride.cancellationReason}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-red-900 font-bold mt-3 text-sm">
            🚫 POLICY: Only ONE ride request per person per night
          </p>
        </div>
      </div>
    </div>
  );
};

export default DuplicateCallerWarning;
