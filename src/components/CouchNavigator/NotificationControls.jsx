import React from 'react';
import { Bell, BellOff } from 'lucide-react';

/**
 * Component for notification permission controls
 */
const NotificationControls = ({ notificationsEnabled, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition whitespace-nowrap flex items-center gap-2 ${
        notificationsEnabled
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
      <span className="hidden sm:inline">Notifications</span>
    </button>
  );
};

export default NotificationControls;
