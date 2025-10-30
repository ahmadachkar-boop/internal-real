import React from 'react';
import NDRCard from './NDRCard';
import { FileText, Archive } from 'lucide-react';

/**
 * NDRList component - Displays a list of NDRs with optional dropdown selector
 * @param {string} title - Section title
 * @param {string} type - Type of NDRs ('pending', 'completed', 'archived')
 * @param {Array} ndrs - Array of NDR objects
 * @param {number} selectedIndex - Index of selected NDR (for pending only)
 * @param {Function} onSelectIndex - Callback when selection changes (for pending only)
 * @param {Function} onView - Callback to view NDR details
 * @param {Function} onEnd - Callback to end NDR
 * @param {Function} onArchive - Callback to archive NDR
 * @param {Function} onActivate - Callback to activate NDR
 */
const NDRList = ({
  title,
  type,
  ndrs,
  selectedIndex = 0,
  onSelectIndex,
  onView,
  onEnd,
  onArchive,
  onActivate
}) => {
  if (ndrs.length === 0) return null;

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

  const getBgColor = () => {
    switch(type) {
      case 'pending': return 'bg-blue-50';
      case 'completed': return 'bg-blue-50';
      case 'archived': return 'bg-gray-50';
      default: return 'bg-white';
    }
  };

  const getTitleColor = () => {
    switch(type) {
      case 'pending': return 'text-blue-800';
      case 'completed': return 'text-blue-800';
      case 'archived': return 'text-gray-800';
      default: return 'text-gray-800';
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'archived': return <Archive size={20} />;
      default: return <FileText size={20} />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className={`p-4 border-b ${getBgColor()}`}>
        <h3 className={`text-lg font-semibold ${getTitleColor()} flex items-center gap-2`}>
          {getIcon()}
          {title} ({ndrs.length})
        </h3>
      </div>
      <div className="p-4">
        {type === 'pending' && onSelectIndex && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Event:
            </label>
            <select
              value={selectedIndex}
              onChange={(e) => onSelectIndex(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ndrs.map((ndr, index) => (
                <option key={ndr.id} value={index}>
                  {ndr.eventName} - {formatDateTime(ndr.eventDate)}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'pending' && onSelectIndex ? (
          <NDRCard
            ndr={ndrs[selectedIndex]}
            onView={onView}
            onEnd={onEnd}
            onArchive={onArchive}
            onActivate={onActivate}
          />
        ) : (
          <div className="space-y-4">
            {ndrs.map(ndr => (
              <NDRCard
                key={ndr.id}
                ndr={ndr}
                onView={onView}
                onEnd={onEnd}
                onArchive={onArchive}
                onActivate={onActivate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NDRList;
