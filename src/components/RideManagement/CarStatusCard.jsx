import React from 'react';
import { Car } from 'lucide-react';

/**
 * Memoized Car Status Card component to prevent re-renders every second
 *
 * @param {Object} props
 * @param {number} props.carNum - Car number
 * @param {Object} props.status - Car status object
 * @param {Object} props.location - Car location object
 * @param {Date} props.currentTime - Current time
 * @param {Function} props.getCarStatusColor - Get status color
 * @param {Function} props.getCarStatusLabel - Get status label
 */
const CarStatusCard = React.memo(({ carNum, status, location, currentTime, getCarStatusColor, getCarStatusLabel }) => {
  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Car size={20} className="text-gray-700" />
          <span className="font-bold text-lg text-gray-900">Car {carNum}</span>
        </div>
        <div className={`w-3 h-3 rounded-full ${getCarStatusColor(status.status)}`}></div>
      </div>

      <div className="space-y-2">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className={`text-xs font-bold ${
            status.status === 'available' ? 'text-green-700' :
            status.status === 'en_route' ? 'text-blue-700' :
            'text-yellow-700'
          }`}>
            {getCarStatusLabel(status.status)}
          </p>
        </div>

        {status.currentRide && (
          <div className="text-xs space-y-1">
            <p className="font-semibold text-gray-900 truncate">
              {status.currentRide.patronName}
            </p>
            <p className="text-gray-600">
              {status.currentRide.riders} {status.currentRide.riders === 1 ? 'rider' : 'riders'}
            </p>
            {status.currentRide.pickedUpAt ? (
              <p className="text-purple-600 font-semibold">
                → {status.currentRide.dropoffs?.[0]?.substring(0, 25) || 'Dropoff'}...
              </p>
            ) : (
              <p className="text-blue-600 font-semibold">
                → {status.currentRide.pickup?.substring(0, 25)}...
              </p>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {status.ridesCompleted} {status.ridesCompleted === 1 ? 'ride' : 'rides'} tonight
          </span>
          {location && (
            <span className="text-xs text-gray-400">
              {Math.floor((currentTime - location.updatedAt) / (1000 * 60))}m ago
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these change
  return (
    prevProps.status.status === nextProps.status.status &&
    prevProps.status.ridesCompleted === nextProps.status.ridesCompleted &&
    prevProps.status.currentRide?.id === nextProps.status.currentRide?.id &&
    Math.floor((prevProps.currentTime - prevProps.location?.updatedAt) / (1000 * 60)) === Math.floor((nextProps.currentTime - nextProps.location?.updatedAt) / (1000 * 60))
  );
});

export default CarStatusCard;
