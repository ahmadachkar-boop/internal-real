import React from 'react';

/**
 * Component for displaying debug information
 */
const DebugPanel = ({
  showDebug,
  onClose,
  selectedCar,
  viewMode,
  activeNDR,
  availableCars,
  messages,
  locationEnabled,
  isOnline,
  firestoreConnected,
  queuedMessagesCount,
  eta,
  debugStatus
}) => {
  if (!showDebug) return null;

  return (
    <div className="mb-6 bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-white">🔍 Debug Panel</h3>
        <button
          onClick={onClose}
          className="text-white hover:text-red-400"
        >
          ✕
        </button>
      </div>
      <div className="space-y-1">
        <div className={selectedCar ? 'text-green-400' : 'text-red-400'}>
          Selected Car: {selectedCar || 'NONE'} {selectedCar && `(Type: ${typeof selectedCar})`}
        </div>
        <div>View Mode: {viewMode}</div>
        <div>Active NDR: {activeNDR?.id || 'none'}</div>
        <div>Available Cars: {availableCars.length} loaded</div>
        <div className="text-xs text-blue-300">
          Cars Data: {JSON.stringify(availableCars.slice(0, 2))}
        </div>
        <div>Messages Loaded: {messages.length}</div>
        <div>Location: {locationEnabled ? '🟢 Enabled' : '🔴 Disabled'}</div>
        <div className={isOnline ? 'text-green-400' : 'text-red-400'}>
          Network: {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
        <div className={firestoreConnected ? 'text-green-400' : 'text-yellow-400'}>
          Firestore: {firestoreConnected ? '🟢 Connected' : '🟡 Disconnected'}
        </div>
        {queuedMessagesCount > 0 && (
          <div className="text-orange-400">
            Queued Messages: {queuedMessagesCount} 📦
          </div>
        )}
        {eta && (
          <div className="text-purple-300">
            ETA: {eta.durationText} to {eta.destination}
          </div>
        )}
        {debugStatus && (
          <div className="text-yellow-300 mt-2 bg-gray-800 p-2 rounded">
            Status: {debugStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;
