import React from 'react';
import { Phone, Users, MapPin, Clock, AlertTriangle, Navigation, Split, RefreshCw, Loader2 } from 'lucide-react';
import { formatTime, calculateWaitTime, formatWaitTime, isLongWait } from '../../utils/timeUtils';

/**
 * Individual ride card component
 *
 * @param {Object} props
 * @param {Object} props.ride - Ride data
 * @param {number} props.index - Index in list
 * @param {string} props.activeTab - Current active tab (pending/active/completed)
 * @param {Object} props.multiRideSuggestions - Multi-ride suggestions
 * @param {Object} props.loadingStates - Loading states
 * @param {Function} props.onAssignCar - Assign car handler
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onSplit - Split handler
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onStartRide - Start ride handler
 * @param {Function} props.onCompleteRide - Complete ride handler
 * @param {Function} props.onTerminateRide - Terminate ride handler
 * @param {Function} props.onReassign - Reassign handler
 * @param {Function} props.onAssignToActiveRide - Assign to active ride handler
 */
const RideCard = ({
  ride,
  index,
  activeTab,
  multiRideSuggestions,
  loadingStates,
  onAssignCar,
  onEdit,
  onSplit,
  onCancel,
  onStartRide,
  onCompleteRide,
  onTerminateRide,
  onReassign,
  onAssignToActiveRide
}) => {
  const waitMinutes = calculateWaitTime(ride.requestedAt);
  const isWaitLong = isLongWait(waitMinutes);

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      terminated: 'bg-orange-100 text-orange-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`mb-4 p-4 border-2 rounded-lg ${
      isWaitLong && activeTab === 'pending' ? 'border-red-500 bg-red-50' : 'border-gray-200'
    }`}>
      {/* Queue Position for Pending Rides */}
      {activeTab === 'pending' && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              index === 0 ? 'bg-green-500 text-white' :
              index === 1 ? 'bg-yellow-500 text-gray-900' :
              'bg-gray-300 text-gray-700'
            }`}>
              #{index + 1} in Queue
            </span>
            {index === 0 && (
              <span className="text-sm font-bold text-green-600 animate-pulse">
                ← NEXT UP
              </span>
            )}
          </div>

          {/* Wait Time Display */}
          <div className="flex flex-col gap-2">
            {/* Elapsed wait time */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              isWaitLong ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-100 text-blue-800'
            }`}>
              <Clock size={16} />
              <span className="text-sm font-bold">
                Waiting: {formatWaitTime(waitMinutes)}
              </span>
              {isWaitLong && (
                <AlertTriangle size={16} className="animate-bounce" />
              )}
            </div>

            {/* ETA to pickup */}
            {ride.estimatedPickupMinutes && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800">
                <Navigation size={16} />
                <span className="text-xs font-bold">
                  ETA: ~{ride.estimatedPickupMinutes} min
                </span>
                {ride.fastestCarNumber && (
                  <span className="text-xs bg-green-200 px-1.5 py-0.5 rounded">
                    Car {ride.fastestCarNumber}
                  </span>
                )}
                {ride.etaCalculatedAt && (
                  <span className="text-xs text-gray-500">
                    ({formatTime(ride.etaCalculatedAt.toDate())})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wait Time Display for Active Rides */}
      {activeTab === 'active' && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-purple-500 text-white">
              Car {ride.carNumber}
            </span>
            {ride.pickedUpAt ? (
              <span className="text-sm font-semibold text-yellow-600">
                In Transit
              </span>
            ) : (
              <span className="text-sm font-semibold text-blue-600">
                En Route to Pickup
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-800">
            <Clock size={16} />
            <span className="text-sm font-bold">
              Total: {formatWaitTime(waitMinutes)}
            </span>
          </div>
        </div>
      )}

      {/* Long Wait Alert */}
      {isWaitLong && activeTab === 'pending' && (
        <div className="mb-3 bg-red-100 border-2 border-red-500 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-900">
              LONG WAIT ALERT
            </p>
            <p className="text-xs text-red-700">
              This patron has been waiting for over 15 minutes. Consider prioritizing this ride.
            </p>
          </div>
        </div>
      )}

      {/* Ride Details */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{ride.patronName}</h3>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Phone size={14} />
            {ride.phone}
          </p>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Users size={14} />
            {ride.riders} {ride.riders === 1 ? 'rider' : 'riders'}
          </p>
        </div>

        <div className="text-right text-xs text-gray-500">
          <p>Requested: {formatTime(ride.requestedAt)}</p>
          {ride.assignedAt && <p>Assigned: {formatTime(ride.assignedAt)}</p>}
          {ride.pickedUpAt && <p>Picked up: {formatTime(ride.pickedUpAt)}</p>}
        </div>
      </div>

      {/* Addresses */}
      <div className="mb-3 space-y-2 text-sm">
        <p className="flex items-start gap-2">
          <MapPin size={14} className="text-blue-600 mt-1 flex-shrink-0" />
          <span>
            <span className="font-semibold">Pickup:</span> {ride.pickup}
          </span>
        </p>
        {(ride.dropoffs || [ride.dropoff]).map((dropoff, dropoffIndex) => (
          <p key={dropoffIndex} className="flex items-start gap-2">
            <MapPin size={14} className="text-red-600 mt-1 flex-shrink-0" />
            <span>
              <span className="font-semibold">
                Drop {(ride.dropoffs?.length || 0) > 1 ? `${dropoffIndex + 1}` : ''}:
              </span> {dropoff}
            </span>
          </p>
        ))}
      </div>

      {/* Completed Status Badge */}
      {activeTab === 'completed' && (
        <div className="mb-3">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(ride.status)}`}>
            {ride.status.toUpperCase()}
          </span>
          {ride.cancellationReason && (
            <p className="text-xs text-gray-600 mt-2">
              <span className="font-semibold">Cancelled:</span> {ride.cancellationReason}
            </p>
          )}
          {ride.terminationReason && (
            <p className="text-xs text-gray-600 mt-2">
              <span className="font-semibold">Terminated:</span> {ride.terminationReason}
            </p>
          )}
        </div>
      )}

      {/* Multi-Ride Suggestions */}
      {activeTab === 'pending' && multiRideSuggestions[ride.id] && multiRideSuggestions[ride.id].length > 0 && (
        <div className="mb-3 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
          <h4 className="font-bold text-green-900 text-sm mb-2 flex items-center gap-2">
            <Users size={16} />
            Multi-Ride Opportunities ({multiRideSuggestions[ride.id].length})
          </h4>
          <p className="text-xs text-green-700 mb-2">
            Assign to same car as another rider (≤15 min detour):
          </p>
          <div className="space-y-2">
            {multiRideSuggestions[ride.id].map((suggestion, idx) => (
              <div key={idx} className="bg-white border border-green-300 rounded p-2 flex justify-between items-center gap-2">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-900">
                    Car {suggestion.carNumber} - {suggestion.activeRidePatron}
                  </p>
                  <p className="text-xs text-gray-600">
                    +{suggestion.detourMinutes} min detour (both show as separate rides)
                  </p>
                </div>
                <button
                  onClick={() => onAssignToActiveRide(ride.id, suggestion.activeRideId)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold min-h-touch touch-manipulation"
                >
                  Assign
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {activeTab === 'pending' && (
          <>
            <button
              onClick={() => onAssignCar(ride)}
              className="px-4 py-3 md:py-2 min-h-touch bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 text-sm touch-manipulation"
            >
              Assign Car
            </button>
            <button
              onClick={() => onSplit(ride)}
              className="px-4 py-3 md:py-2 min-h-touch bg-purple-600 text-white rounded hover:bg-purple-700 active:bg-purple-800 text-sm flex items-center gap-1 touch-manipulation"
            >
              <Split size={16} />
              Split
            </button>
            <button
              onClick={() => onEdit(ride)}
              className="px-4 py-3 md:py-2 min-h-touch bg-gray-200 text-gray-700 rounded hover:bg-gray-300 active:bg-gray-400 text-sm touch-manipulation"
            >
              Edit
            </button>
            <button
              onClick={() => onCancel(ride.id)}
              className="px-4 py-3 md:py-2 min-h-touch bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 text-sm touch-manipulation"
            >
              Cancel
            </button>
          </>
        )}

        {activeTab === 'active' && (
          <>
            {!ride.pickedUpAt && (
              <button
                onClick={() => onStartRide(ride.id)}
                disabled={loadingStates.startingRide[ride.id]}
                className="px-4 py-3 md:py-2 min-h-touch bg-green-600 text-white rounded hover:bg-green-700 active:bg-green-800 text-sm touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingStates.startingRide[ride.id] && <Loader2 size={14} className="animate-spin" />}
                {loadingStates.startingRide[ride.id] ? 'Marking...' : 'Mark Picked Up'}
              </button>
            )}
            <button
              onClick={() => onCompleteRide(ride.id)}
              disabled={loadingStates.completingRide[ride.id]}
              className="px-4 py-3 md:py-2 min-h-touch bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 text-sm touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingStates.completingRide[ride.id] && <Loader2 size={14} className="animate-spin" />}
              {loadingStates.completingRide[ride.id] ? 'Completing...' : 'Complete'}
            </button>
            <button
              onClick={() => onEdit(ride)}
              className="px-4 py-3 md:py-2 min-h-touch bg-gray-200 text-gray-700 rounded hover:bg-gray-300 active:bg-gray-400 text-sm touch-manipulation"
            >
              Edit
            </button>
            <button
              onClick={() => onReassign(ride)}
              className="px-4 py-3 md:py-2 min-h-touch bg-purple-600 text-white rounded hover:bg-purple-700 active:bg-purple-800 text-sm touch-manipulation flex items-center gap-1"
            >
              <RefreshCw size={14} />
              Reassign
            </button>
            <button
              onClick={() => onCancel(ride.id)}
              disabled={loadingStates.cancellingRide[ride.id]}
              className="px-4 py-3 md:py-2 min-h-touch bg-red-500 text-white rounded hover:bg-red-600 active:bg-red-700 text-sm touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingStates.cancellingRide[ride.id] && <Loader2 size={14} className="animate-spin" />}
              {loadingStates.cancellingRide[ride.id] ? 'Cancelling...' : 'Cancel'}
            </button>
            <button
              onClick={() => onTerminateRide(ride.id)}
              disabled={loadingStates.terminatingRide[ride.id]}
              className="px-4 py-3 md:py-2 min-h-touch bg-orange-500 text-white rounded hover:bg-orange-600 active:bg-orange-700 text-sm touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingStates.terminatingRide[ride.id] && <Loader2 size={14} className="animate-spin" />}
              {loadingStates.terminatingRide[ride.id] ? 'Terminating...' : 'Terminate'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Wrap with React.memo for performance optimization
export default React.memo(RideCard, (prevProps, nextProps) => {
  // Return true if props are equal (no re-render needed)
  // Return false if props are different (re-render needed)

  // Check if the ride data changed
  if (prevProps.ride.id !== nextProps.ride.id) return false;
  if (prevProps.ride.status !== nextProps.ride.status) return false;
  if (prevProps.ride.riders !== nextProps.ride.riders) return false;
  if (prevProps.ride.carNumber !== nextProps.ride.carNumber) return false;
  if (prevProps.ride.pickedUpAt !== nextProps.ride.pickedUpAt) return false;
  if (prevProps.ride.requestedAt !== nextProps.ride.requestedAt) return false;
  if (prevProps.ride.patronName !== nextProps.ride.patronName) return false;
  if (prevProps.ride.phone !== nextProps.ride.phone) return false;
  if (prevProps.ride.pickup !== nextProps.ride.pickup) return false;

  // Check dropoffs array
  const prevDropoffs = prevProps.ride.dropoffs || [prevProps.ride.dropoff];
  const nextDropoffs = nextProps.ride.dropoffs || [nextProps.ride.dropoff];
  if (prevDropoffs.length !== nextDropoffs.length) return false;
  if (prevDropoffs.some((d, i) => d !== nextDropoffs[i])) return false;

  // Check other props
  if (prevProps.index !== nextProps.index) return false;
  if (prevProps.activeTab !== nextProps.activeTab) return false;

  // Check multi-ride suggestions
  const prevSuggestions = prevProps.multiRideSuggestions[prevProps.ride.id] || [];
  const nextSuggestions = nextProps.multiRideSuggestions[nextProps.ride.id] || [];
  if (prevSuggestions.length !== nextSuggestions.length) return false;

  // Check loading states for this specific ride
  const prevLoading = prevProps.loadingStates;
  const nextLoading = nextProps.loadingStates;
  if (prevLoading.startingRide[prevProps.ride.id] !== nextLoading.startingRide[nextProps.ride.id]) return false;
  if (prevLoading.completingRide[prevProps.ride.id] !== nextLoading.completingRide[nextProps.ride.id]) return false;
  if (prevLoading.cancellingRide[prevProps.ride.id] !== nextLoading.cancellingRide[nextProps.ride.id]) return false;
  if (prevLoading.terminatingRide[prevProps.ride.id] !== nextLoading.terminatingRide[nextProps.ride.id]) return false;

  // All relevant props are equal, skip re-render
  return true;
});
