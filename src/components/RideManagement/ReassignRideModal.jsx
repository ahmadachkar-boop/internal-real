import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Modal for reassigning active ride to different car
 *
 * @param {Object} props
 * @param {Object} props.ride - Ride being reassigned
 * @param {string} props.newCarNumber - New car number
 * @param {Function} props.onChangeCarNumber - Car number change handler
 * @param {Function} props.onReassign - Reassign handler
 * @param {Function} props.onCancel - Cancel handler
 * @param {number} props.availableCars - Number of available cars
 */
const ReassignRideModal = ({
  ride,
  newCarNumber,
  onChangeCarNumber,
  onReassign,
  onCancel,
  availableCars
}) => {
  if (!ride) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <RefreshCw size={24} className="text-blue-600" />
          Reassign Ride
        </h3>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Patron:</strong> {ride.patronName}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <strong>Current Car:</strong> {ride.carNumber}
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Reassign to Car:
          </label>
          <select
            value={newCarNumber || ''}
            onChange={(e) => onChangeCarNumber(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-touch"
          >
            <option value="">Select a car...</option>
            {Array.from({ length: availableCars }, (_, i) => i + 1)
              .filter(num => num !== ride.carNumber)
              .map(num => (
                <option key={num} value={num}>
                  Car {num}
                </option>
              ))}
          </select>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onReassign}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold min-h-touch touch-manipulation"
          >
            Reassign
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold min-h-touch touch-manipulation"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReassignRideModal;
