import React from 'react';
import { Car } from 'lucide-react';

/**
 * Component for selecting car number
 * Used in both navigator view (for initial selection) and couch view (for car monitoring)
 */
const CarSelector = ({
  selectedCar,
  carNumber,
  setCarNumber,
  onCarSelect,
  availableCars,
  viewMode,
  userAssignment,
  onDisconnect
}) => {
  // Navigator view - initial car selection
  if (viewMode === 'navigator' && !selectedCar) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Car size={20} />
          Select Your Car
        </h3>
        <select
          value={carNumber}
          onChange={(e) => {
            const num = e.target.value;
            setCarNumber(num);
            if (num) {
              onCarSelect(num);
              console.log('Selected car:', num);
            }
          }}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-gray-900 text-base"
        >
          <option value="">Choose your car number...</option>
          {availableCars.map(car => (
            <option key={car.carNumber} value={car.carNumber}>
              Car {car.carNumber}
              {car.driverName ? ` - ${car.driverName}` : ''}
            </option>
          ))}
        </select>

        <p className="text-sm text-gray-500 mt-3">
          💡 Select the car number you're driving to enable messaging with the couch
        </p>
      </div>
    );
  }

  // Navigator view - connected state
  if (viewMode === 'navigator' && selectedCar) {
    return (
      <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="font-bold text-blue-900">Connected as Car {selectedCar}</p>
          <p className="text-sm text-blue-700">You can now send and receive messages</p>
        </div>
        <button
          onClick={onDisconnect}
          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 touch-manipulation whitespace-nowrap"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Couch view - car selection
  if (viewMode === 'couch') {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {userAssignment && userAssignment.type === 'car'
            ? `Car ${userAssignment.carNumber}`
            : 'Select Car to Monitor'}
        </h3>

        {/* Only allow car selection for couch users */}
        {userAssignment && userAssignment.type === 'couch' ? (
          <select
            value={selectedCar || ''}
            onChange={(e) => onCarSelect(e.target.value || null)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-gray-900 text-base"
          >
            <option value="">Select a car...</option>
            {availableCars.map(car => (
              <option key={car.carNumber} value={car.carNumber}>
                Car {car.carNumber}
                {car.driverName ? ` - ${car.driverName}` : ''}
              </option>
            ))}
          </select>
        ) : (
          <div className="bg-gray-100 px-4 py-3 rounded-xl border-2 border-gray-300">
            <p className="text-gray-700 font-semibold">
              Car {userAssignment?.carNumber || selectedCar}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              You are locked to your assigned car
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default CarSelector;
