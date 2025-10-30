import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Component showing banner when viewing historical NDR data
 */
const HistoricalViewBanner = ({ isHistoricalView, eventName }) => {
  if (!isHistoricalView) return null;

  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-lg px-4 py-3">
      <div className="flex items-start gap-2">
        <Clock className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-bold text-amber-900">
            Historical Chat Logs
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Viewing archived communication from: {eventName || 'Past Event'}
          </p>
          <p className="text-xs text-amber-600 mt-1 italic">
            Read-only mode - Message sending and live features are disabled
          </p>
        </div>
      </div>
    </div>
  );
};

export default HistoricalViewBanner;
