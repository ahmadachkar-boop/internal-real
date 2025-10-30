import React from 'react';
import { Split, Loader2 } from 'lucide-react';

/**
 * Modal for splitting rides
 *
 * @param {Object} props
 * @param {Object} props.ride - Ride being split
 * @param {Object} props.splitRiders - {ride1: number, ride2: number}
 * @param {Function} props.onChangeSplit - Split change handler
 * @param {Function} props.onSplit - Split handler
 * @param {Function} props.onCancel - Cancel handler
 * @param {boolean} props.isSplitting - Is splitting
 */
const SplitRideModal = ({
  ride,
  splitRiders,
  onChangeSplit,
  onSplit,
  onCancel,
  isSplitting
}) => {
  if (!ride) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-md sm:m-4 p-6 pb-safe-offset-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Split size={24} className="text-purple-600" />
          <span className="truncate">Split Ride: {ride.patronName}</span>
        </h3>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            Total Riders: <span className="font-bold">{ride.riders}</span>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Split into two separate rides. Useful when a car needs to make multiple trips or riders need to go at different times.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              First Ride - Number of Riders
            </label>
            <input
              type="number"
              min="1"
              max={ride.riders - 1}
              value={splitRiders.ride1}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                onChangeSplit({ ride1: val, ride2: ride.riders - val });
              }}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-touch"
              inputMode="numeric"
              disabled={isSplitting}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Second Ride - Number of Riders
            </label>
            <input
              type="number"
              min="1"
              max={ride.riders - 1}
              value={splitRiders.ride2}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                onChangeSplit({ ride1: ride.riders - val, ride2: val });
              }}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-touch"
              inputMode="numeric"
              disabled={isSplitting}
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Result:</span> Ride 1 will have {splitRiders.ride1} {splitRiders.ride1 === 1 ? 'rider' : 'riders'}, Ride 2 will have {splitRiders.ride2} {splitRiders.ride2 === 1 ? 'rider' : 'riders'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onSplit}
            disabled={isSplitting}
            className="flex-1 px-4 py-3 min-h-touch bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
          >
            {isSplitting && <Loader2 size={16} className="animate-spin" />}
            {isSplitting ? 'Splitting...' : 'Split Ride'}
          </button>
          <button
            onClick={onCancel}
            disabled={isSplitting}
            className="flex-1 px-4 py-3 min-h-touch bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold touch-manipulation disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplitRideModal;
