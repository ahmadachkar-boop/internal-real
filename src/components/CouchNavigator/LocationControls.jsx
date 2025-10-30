import React from 'react';
import { Navigation, CheckCircle, X } from 'lucide-react';
import IOSLocationInstructions from './IOSLocationInstructions';

/**
 * Component for location tracking controls
 * Shows enable/disable buttons and status for location sharing
 */
const LocationControls = ({
  locationEnabled,
  locationError,
  lastLocationUpdate,
  onStartTracking,
  onStopTracking,
  platformInfo,
  isNativeApp,
  hasAlwaysPermission,
  onRequestBackgroundPermission
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Navigation size={20} className="text-blue-600" />
        Location Sharing
      </h3>

      {!locationEnabled ? (
        <div className="space-y-3">
          <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3 sm:p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">
              📍 Location sharing allows the couch to track your position in real-time.
            </p>
            <IOSLocationInstructions platformInfo={platformInfo} />
          </div>

          <button
            onClick={onStartTracking}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 touch-manipulation"
          >
            <Navigation size={20} />
            Enable Location Sharing
          </button>

          {locationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-800">{locationError}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800 font-medium flex items-center gap-2">
              <CheckCircle size={16} />
              Location sharing is active
            </p>
            {lastLocationUpdate && (
              <p className="text-xs text-green-700 mt-1">
                Last update: {lastLocationUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>

          {platformInfo.isIOS && isNativeApp && !hasAlwaysPermission && (
            <button
              onClick={onRequestBackgroundPermission}
              className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition text-sm touch-manipulation"
            >
              📍 Enable Background Tracking
            </button>
          )}

          <button
            onClick={onStopTracking}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition flex items-center justify-center gap-2 touch-manipulation"
          >
            <X size={20} />
            Stop Sharing Location
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationControls;
