import React from 'react';
import { Play, Archive, RotateCcw } from 'lucide-react';

/**
 * NDRCard component - Displays an NDR summary card with action buttons
 * @param {Object} ndr - The NDR object
 * @param {Function} onView - Callback to view NDR details
 * @param {Function} onEnd - Callback to end NDR
 * @param {Function} onArchive - Callback to archive NDR
 * @param {Function} onActivate - Callback to activate NDR
 */
const NDRCard = ({ ndr, onView, onEnd, onArchive, onActivate }) => {
  const formatDateTime = (date) => {
    if (!date) return '';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-800">{ndr.eventName}</h4>
          <p className="text-sm text-gray-600">{formatDateTime(ndr.eventDate)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          ndr.status === 'active' ? 'bg-green-100 text-green-800' :
          ndr.status === 'completed' ? 'bg-blue-100 text-blue-800' :
          ndr.status === 'archived' ? 'bg-gray-100 text-gray-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {ndr.status?.toUpperCase() || 'PENDING'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-4">
        <div>
          <p className="text-gray-500">Members</p>
          <p className="font-semibold">{ndr.signedUpMembers?.length || 0}</p>
        </div>
        <div>
          <p className="text-gray-500">Cars Available</p>
          <p className="font-semibold text-blue-600">{ndr.availableCars || 0}</p>
        </div>
        <div>
          <p className="text-gray-500">Completed</p>
          <p className="font-semibold text-green-600">{ndr.completedRiders || 0} riders</p>
        </div>
        <div>
          <p className="text-gray-500">Cancelled</p>
          <p className="font-semibold text-red-600">{ndr.cancelledRiders || 0} riders</p>
        </div>
        <div>
          <p className="text-gray-500">Terminated</p>
          <p className="font-semibold text-orange-600">{ndr.terminatedRiders || 0} riders</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onView(ndr)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          View Details
        </button>
        {ndr.status === 'pending' && (
          <button
            onClick={() => onActivate(ndr.id)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-2"
          >
            <Play size={16} />
            Activate
          </button>
        )}
        {ndr.status === 'active' && (
          <button
            onClick={() => onEnd(ndr.id)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            End NDR
          </button>
        )}
        {ndr.status === 'completed' && (
          <button
            onClick={() => onArchive(ndr.id)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm flex items-center gap-2"
          >
            <Archive size={16} />
            Archive
          </button>
        )}
        {ndr.status === 'archived' && (
          <button
            onClick={() => onActivate(ndr.id)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Reactivate
          </button>
        )}
      </div>
    </div>
  );
};

export default NDRCard;
