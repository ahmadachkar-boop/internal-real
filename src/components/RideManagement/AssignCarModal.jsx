import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Modal for assigning cars to rides with eligibility checking
 *
 * @param {Object} props
 * @param {Object} props.ride - Ride being assigned
 * @param {string} props.selectedCar - Selected car number
 * @param {Function} props.onSelectCar - Car selection handler
 * @param {Function} props.onAssign - Assign handler
 * @param {Function} props.onCancel - Cancel handler
 * @param {Object} props.eligibleCars - Eligible cars object
 * @param {boolean} props.checkingEligibility - Is checking eligibility
 * @param {boolean} props.isAssigning - Is assigning
 * @param {number} props.availableCars - Number of available cars
 */
const AssignCarModal = ({
  ride,
  selectedCar,
  onSelectCar,
  onAssign,
  onCancel,
  eligibleCars,
  checkingEligibility,
  isAssigning,
  availableCars
}) => {
  if (!ride) return null;

  return (
    <div className="space-y-3">
      <p className="font-semibold">Assign car to {ride.patronName}</p>
      {checkingEligibility && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="text-blue-800 text-sm font-medium">
            Checking car eligibility...
          </p>
        </div>
      )}
      {ride.riders === 1 && !checkingEligibility && (
        <>
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            <p className="text-yellow-800 text-sm font-medium">
              Single rider rides MUST be assigned to a car with opposite gender members for safety.
            </p>
          </div>
          {Object.keys(eligibleCars).length > 0 && Object.values(eligibleCars).every(car => !car.eligible) && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
              <p className="text-red-800 text-sm font-semibold">
                No cars are eligible! All cars need at least 2 members with opposite genders assigned.
              </p>
              <p className="text-red-700 text-xs mt-1">
                Please update car assignments in the NDR before accepting single rider rides.
              </p>
            </div>
          )}
        </>
      )}
      <select
        value={selectedCar}
        onChange={(e) => onSelectCar(e.target.value)}
        className="w-full px-3 py-2 border rounded"
        disabled={checkingEligibility}
      >
        <option value="">{checkingEligibility ? 'Checking eligibility...' : 'Select a car...'}</option>
        {Array.from({ length: availableCars }, (_, i) => i + 1).map(num => {
          const carEligibility = eligibleCars[num];
          const isEligible = !carEligibility || carEligibility.eligible;
          const reason = carEligibility?.reason || '';
          const maleCount = carEligibility?.maleCount || 0;
          const femaleCount = carEligibility?.femaleCount || 0;

          // Build gender breakdown display
          let genderInfo = '';
          if (ride.riders === 1 && carEligibility) {
            genderInfo = ` (${maleCount}M, ${femaleCount}F)`;
          }

          return (
            <option
              key={num}
              value={num}
              disabled={!isEligible}
            >
              Car {num}{genderInfo}{!isEligible ? ` - ${reason}` : isEligible && ride.riders === 1 ? ' ✓' : ''}
            </option>
          );
        })}
      </select>
      <div className="flex gap-2">
        <button
          onClick={onAssign}
          disabled={isAssigning || checkingEligibility}
          className="px-4 py-3 md:py-2 min-h-touch bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
        >
          {isAssigning && <Loader2 size={16} className="animate-spin" />}
          {isAssigning ? 'Assigning...' : 'Assign'}
        </button>
        <button
          onClick={onCancel}
          disabled={isAssigning}
          className="px-4 py-3 md:py-2 min-h-touch bg-gray-300 text-gray-700 rounded hover:bg-gray-400 active:bg-gray-500 touch-manipulation disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AssignCarModal;
