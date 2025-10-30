import React, { useCallback } from 'react';
import { Car } from 'lucide-react';
import CarStatusCard from './CarStatusCard';

/**
 * Grid of car status cards
 *
 * @param {Object} props
 * @param {number} props.availableCars - Number of available cars
 * @param {Object} props.carStatuses - Car statuses object
 * @param {Object} props.carLocations - Car locations object
 * @param {Date} props.currentTime - Current time
 */
const CarStatusGrid = ({ availableCars, carStatuses, carLocations, currentTime }) => {
  // Memoized status color helper
  const getCarStatusColor = useCallback((status) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'en_route':
        return 'bg-blue-500';
      case 'with_patron':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  }, []);

  // Memoized status label helper
  const getCarStatusLabel = useCallback((status) => {
    switch (status) {
      case 'available':
        return 'AVAILABLE';
      case 'en_route':
        return 'EN ROUTE';
      case 'with_patron':
        return 'WITH PATRON';
      default:
        return 'UNKNOWN';
    }
  }, []);

  if (availableCars === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Car size={20} />
        Car Status Board
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: availableCars }, (_, i) => i + 1).map(carNum => {
          const status = carStatuses[carNum] || { status: 'available', currentRide: null, ridesCompleted: 0 };
          const location = carLocations[carNum];

          return (
            <CarStatusCard
              key={carNum}
              carNum={carNum}
              status={status}
              location={location}
              currentTime={currentTime}
              getCarStatusColor={getCarStatusColor}
              getCarStatusLabel={getCarStatusLabel}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CarStatusGrid;
