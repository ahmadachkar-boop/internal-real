import React from 'react';
import { Wifi, WifiOff, CloudOff } from 'lucide-react';
import { hapticLight } from '../../hapticUtils';

/**
 * Component showing online/offline connection status
 * Clickable to open queue manager when there are queued messages
 */
const ConnectionStatus = ({ isOnline, firestoreConnected, queuedMessagesCount, onShowQueue }) => {
  const handleClick = () => {
    if (queuedMessagesCount > 0) {
      onShowQueue();
      hapticLight();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition whitespace-nowrap flex items-center gap-2 ${
        isOnline && firestoreConnected
          ? 'bg-green-100 text-green-800'
          : !isOnline
          ? 'bg-red-100 text-red-800'
          : 'bg-yellow-100 text-yellow-800'
      } ${queuedMessagesCount > 0 ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
      title={`Network: ${isOnline ? 'Online' : 'Offline'} | Firestore: ${firestoreConnected ? 'Connected' : 'Disconnected'}${queuedMessagesCount > 0 ? ` | Click to view ${queuedMessagesCount} queued message(s)` : ''}`}
    >
      {isOnline && firestoreConnected ? (
        <Wifi size={16} />
      ) : !isOnline ? (
        <WifiOff size={16} />
      ) : (
        <CloudOff size={16} />
      )}
      <span className="hidden sm:inline">
        {isOnline && firestoreConnected ? 'Online' : !isOnline ? 'Offline' : 'Syncing...'}
      </span>
      {queuedMessagesCount > 0 && (
        <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs animate-pulse">
          {queuedMessagesCount}
        </span>
      )}
    </button>
  );
};

export default ConnectionStatus;
