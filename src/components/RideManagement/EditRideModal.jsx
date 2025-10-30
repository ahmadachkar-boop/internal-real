import React from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * Modal for editing ride details
 *
 * @param {Object} props
 * @param {Object} props.ride - Ride being edited
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.onSave - Save handler
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onUpdateDropoff - Update dropoff handler
 * @param {Function} props.onAddDropoff - Add dropoff handler
 * @param {Function} props.onRemoveDropoff - Remove dropoff handler
 * @param {boolean} props.isSaving - Is saving
 */
const EditRideModal = ({
  ride,
  onChange,
  onSave,
  onCancel,
  onUpdateDropoff,
  onAddDropoff,
  onRemoveDropoff,
  isSaving
}) => {
  if (!ride) return null;

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={ride.patronName}
        onChange={(e) => onChange({ ...ride, patronName: e.target.value })}
        className="w-full px-3 py-2 border rounded min-h-touch"
        placeholder="Name"
        inputMode="text"
        autoComplete="name"
      />
      <input
        type="tel"
        value={ride.phone}
        onChange={(e) => onChange({ ...ride, phone: e.target.value })}
        className="w-full px-3 py-2 border rounded min-h-touch"
        placeholder="Phone"
        inputMode="tel"
        autoComplete="tel"
      />
      <input
        type="text"
        value={ride.pickup}
        onChange={(e) => onChange({ ...ride, pickup: e.target.value })}
        className="w-full px-3 py-2 border rounded min-h-touch"
        placeholder="Pickup"
        inputMode="text"
        autoComplete="street-address"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dropoff Locations
        </label>
        {ride.dropoffs.map((dropoff, dropoffIndex) => (
          <div key={dropoffIndex} className="flex gap-2 mb-2">
            <input
              type="text"
              value={dropoff}
              onChange={(e) => onUpdateDropoff(dropoffIndex, e.target.value)}
              className="flex-1 px-3 py-2 border rounded min-h-touch"
              placeholder={`Dropoff ${dropoffIndex + 1}`}
              inputMode="text"
              autoComplete="street-address"
            />
            {ride.dropoffs.length > 1 && (
              <button
                onClick={() => onRemoveDropoff(dropoffIndex)}
                className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 min-h-touch touch-manipulation"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={onAddDropoff}
          className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm min-h-touch touch-manipulation"
        >
          + Add Dropoff
        </button>
      </div>

      <input
        type="number"
        value={ride.riders}
        onChange={(e) => onChange({ ...ride, riders: parseInt(e.target.value) })}
        className="w-full px-3 py-2 border rounded min-h-touch"
        placeholder="Riders"
        inputMode="numeric"
        min="1"
      />
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-3 md:py-2 min-h-touch bg-green-600 text-white rounded hover:bg-green-700 active:bg-green-800 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-3 md:py-2 min-h-touch bg-gray-300 text-gray-700 rounded hover:bg-gray-400 active:bg-gray-500 touch-manipulation disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default EditRideModal;
