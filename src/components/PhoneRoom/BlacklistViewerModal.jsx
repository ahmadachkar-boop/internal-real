import React, { useState } from 'react';
import { Shield, X, MapPin, Phone } from 'lucide-react';

/**
 * BlacklistViewerModal Component
 *
 * Modal for viewing currently active blacklists (approved only).
 * Shows both permanent blacklists and temporary ones for the active event.
 * Displays addresses and phone numbers in separate tabs.
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Function to close the modal
 * @param {object} activeNDR - The currently active NDR event
 * @param {array} blacklistedAddresses - List of all blacklisted addresses
 * @param {array} blacklistedPhones - List of all blacklisted phone numbers
 * @param {function} getActiveBlacklists - Function to filter blacklists for active event
 */
const BlacklistViewerModal = ({
  isOpen,
  onClose,
  activeNDR,
  blacklistedAddresses,
  blacklistedPhones,
  getActiveBlacklists
}) => {
  const [viewerTab, setViewerTab] = useState('addresses');

  if (!isOpen) return null;

  // Filter and get active blacklists
  const activeAddresses = activeNDR ? getActiveBlacklists(blacklistedAddresses, 'address').filter(a => a.status === 'approved') : [];
  const activePhones = activeNDR ? getActiveBlacklists(blacklistedPhones, 'phone').filter(p => p.status === 'approved') : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <Shield className="text-gray-800" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Active Blacklists</h3>
                <p className="text-white/90 text-sm">View currently blocked addresses and phone numbers</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {activeNDR && (
          <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
            <div className="flex gap-2">
              <button
                onClick={() => setViewerTab('addresses')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  viewerTab === 'addresses'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Addresses ({activeAddresses.length})
              </button>
              <button
                onClick={() => setViewerTab('phones')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  viewerTab === 'phones'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Phone Numbers ({activePhones.length})
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewerTab === 'addresses' ? (
            <div className="space-y-3">
              {activeAddresses.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No blocked addresses for this event</p>
              ) : (
                activeAddresses.map((item) => (
                  <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-red-600 flex-shrink-0" />
                        <p className="font-bold text-gray-900">{item.address}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        item.scope === 'temporary' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.scope === 'temporary' ? 'TEMP' : 'PERM'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Reason:</strong> {item.reason}
                    </p>
                    <div className="flex gap-2 text-xs text-gray-500">
                      {item.appliesToPickup && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Pickup</span>
                      )}
                      {item.appliesToDropoff && (
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">Dropoff</span>
                      )}
                    </div>
                    {item.approvedBy && (
                      <p className="text-xs text-gray-500 mt-2">
                        Approved by {item.approvedBy} on {item.approvedAt?.toDate().toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activePhones.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No blocked phone numbers for this event</p>
              ) : (
                activePhones.map((item) => (
                  <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Phone size={18} className="text-red-600" />
                          <p className="font-bold text-gray-900">{item.phone}</p>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            item.scope === 'temporary' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.scope === 'temporary' ? 'TEMP' : 'PERM'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Reason:</strong> {item.reason}
                        </p>
                        {item.approvedBy && (
                          <p className="text-xs text-gray-500">
                            Approved by {item.approvedBy} on {item.approvedAt?.toDate().toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlacklistViewerModal;
