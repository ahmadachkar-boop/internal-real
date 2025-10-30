import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { AlertTriangle, X, CheckCircle, XCircle, Send } from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';

/**
 * BlacklistRequestModal Component
 *
 * Modal for staff to request blacklisting of addresses or phone numbers.
 * Supports both temporary (event-specific) and permanent blacklists.
 * All requests require director approval before becoming active.
 *
 * @param {boolean} showBlacklistModal - Whether the modal is visible
 * @param {function} setShowBlacklistModal - Function to toggle modal visibility
 * @param {object} activeNDR - The currently active NDR event
 * @param {array} blacklistedAddresses - Current list of blacklisted addresses (unused in modal, but kept for consistency)
 * @param {object} currentUser - The currently logged-in user
 * @param {function} fetchAddressSuggestions - Function to fetch address autocomplete suggestions
 */
const BlacklistRequestModal = ({
  showBlacklistModal,
  setShowBlacklistModal,
  activeNDR,
  blacklistedAddresses,
  currentUser,
  fetchAddressSuggestions
}) => {
  // Form state
  const [blacklistRequest, setBlacklistRequest] = useState({
    type: 'address',
    value: '',
    reason: '',
    scope: 'permanent',
    appliesToPickup: true,
    appliesToDropoff: true
  });

  // UI state
  const [blacklistLoading, setBlacklistLoading] = useState(false);
  const [blacklistMessage, setBlacklistMessage] = useState('');
  const [blacklistMessageType, setBlacklistMessageType] = useState('');

  // Address autocomplete state
  const [blacklistAddressSuggestions, setBlacklistAddressSuggestions] = useState([]);
  const [showBlacklistSuggestions, setShowBlacklistSuggestions] = useState(false);
  const blacklistAddressRef = useRef(null);

  // Phone number formatter
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const limited = cleaned.slice(0, 10);

    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    } else {
      return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  };

  // Handle address value changes and fetch suggestions
  const handleBlacklistValueChange = (value) => {
    setBlacklistRequest({ ...blacklistRequest, value });

    if (blacklistRequest.type === 'address' && value.length >= 3) {
      fetchAddressSuggestions(value, (suggestions) => {
        setBlacklistAddressSuggestions(suggestions);
        setShowBlacklistSuggestions(true);
      });
    } else {
      setBlacklistAddressSuggestions([]);
      setShowBlacklistSuggestions(false);
    }
  };

  // Handle address suggestion selection
  const selectBlacklistAddressSuggestion = (address) => {
    setBlacklistRequest({ ...blacklistRequest, value: address });
    setShowBlacklistSuggestions(false);
    setBlacklistAddressSuggestions([]);
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (blacklistAddressRef.current && !blacklistAddressRef.current.contains(event.target)) {
        setShowBlacklistSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Submit blacklist request
  const submitBlacklistRequest = async (e) => {
    e.preventDefault();

    if (!blacklistRequest.value || !blacklistRequest.reason) {
      setBlacklistMessage('Please fill in all required fields');
      setBlacklistMessageType('error');
      return;
    }

    setBlacklistLoading(true);
    setBlacklistMessage('');

    try {
      const collectionName = blacklistRequest.type === 'address' ? 'addressBlacklist' : 'phoneBlacklist';

      // Check for duplicates
      const duplicateQuery = query(
        collection(db, collectionName),
        where(blacklistRequest.type === 'address' ? 'address' : 'phone', '==', blacklistRequest.value)
      );
      const duplicateSnapshot = await getDocs(duplicateQuery);

      if (!duplicateSnapshot.empty) {
        const existing = duplicateSnapshot.docs[0].data();
        setBlacklistMessage(`This ${blacklistRequest.type} is already blacklisted (Status: ${existing.status})`);
        setBlacklistMessageType('error');
        setBlacklistLoading(false);
        return;
      }

      // Build request data
      const requestData = {
        [blacklistRequest.type === 'address' ? 'address' : 'phone']: blacklistRequest.value,
        reason: blacklistRequest.reason,
        scope: blacklistRequest.scope,
        status: 'pending',
        requestedAt: Timestamp.now(),
        requestedBy: currentUser?.uid || 'anonymous',
        requestedByName: currentUser?.displayName || 'Staff Member'
      };

      // Add address-specific fields
      if (blacklistRequest.type === 'address') {
        requestData.appliesToPickup = blacklistRequest.appliesToPickup;
        requestData.appliesToDropoff = blacklistRequest.appliesToDropoff;
      }

      // Add NDR ID for temporary blacklists
      if (blacklistRequest.scope === 'temporary') {
        requestData.ndrId = activeNDR.id;
      }

      await addDoc(collection(db, collectionName), requestData);

      setBlacklistMessage('Blacklist request submitted! Waiting for director approval.');
      setBlacklistMessageType('success');

      // Reset form and close modal after success
      setTimeout(() => {
        setBlacklistRequest({
          type: 'address',
          value: '',
          reason: '',
          scope: 'permanent',
          appliesToPickup: true,
          appliesToDropoff: true
        });
        setShowBlacklistModal(false);
        setBlacklistMessage('');
        setBlacklistMessageType('');
      }, 2000);
    } catch (error) {
      console.error('Error submitting blacklist request:', error);
      setBlacklistMessage('Error submitting request: ' + error.message);
      setBlacklistMessageType('error');
    } finally {
      setBlacklistLoading(false);
    }
  };

  if (!showBlacklistModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <AlertTriangle className="text-orange-500" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Request Blacklist</h3>
                <p className="text-white/90 text-sm">Requires director approval</p>
              </div>
            </div>
            <button
              onClick={() => setShowBlacklistModal(false)}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Info banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This request will be pending until a director approves it.
              Only approved entries will be blocked.
            </p>
          </div>

          {/* Status message */}
          {blacklistMessage && (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${
              blacklistMessageType === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              {blacklistMessageType === 'error' ? (
                <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              ) : (
                <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
              )}
              <p className={`text-sm font-medium ${
                blacklistMessageType === 'error' ? 'text-red-700' : 'text-green-700'
              }`}>{blacklistMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submitBlacklistRequest} className="space-y-5">
            {/* Type selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type *
              </label>
              <select
                value={blacklistRequest.type}
                onChange={(e) => setBlacklistRequest({ ...blacklistRequest, type: e.target.value, value: '' })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition outline-none text-gray-900"
              >
                <option value="address">Address</option>
                <option value="phone">Phone Number</option>
              </select>
            </div>

            {/* Scope selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Scope *
              </label>
              <select
                value={blacklistRequest.scope}
                onChange={(e) => setBlacklistRequest({ ...blacklistRequest, scope: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition outline-none text-gray-900"
              >
                <option value="permanent">Permanent (All events)</option>
                <option value="temporary">Temporary (This event only)</option>
              </select>
            </div>

            {/* Value input - Address with autocomplete or Phone */}
            {blacklistRequest.type === 'address' ? (
              <AddressAutocomplete
                value={blacklistRequest.value}
                onChange={handleBlacklistValueChange}
                onSelect={selectBlacklistAddressSuggestion}
                label={blacklistRequest.type === 'address' ? 'Address *' : 'Phone Number *'}
                placeholder="Start typing address..."
                suggestions={blacklistAddressSuggestions}
                showSuggestions={showBlacklistSuggestions}
                setShowSuggestions={setShowBlacklistSuggestions}
                commonLocations={[]}
                showCommonLocations={false}
                setShowCommonLocations={() => {}}
                inputRef={blacklistAddressRef}
                required
                borderColor="border-orange-500"
              />
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="text"
                  value={blacklistRequest.value}
                  onChange={(e) => {
                    const value = formatPhoneNumber(e.target.value);
                    handleBlacklistValueChange(value);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition outline-none text-gray-900"
                  maxLength={14}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
            )}

            {/* Address-specific options */}
            {blacklistRequest.type === 'address' && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Apply To:
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={blacklistRequest.appliesToPickup}
                    onChange={(e) => setBlacklistRequest({ ...blacklistRequest, appliesToPickup: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Pickup Locations</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={blacklistRequest.appliesToDropoff}
                    onChange={(e) => setBlacklistRequest({ ...blacklistRequest, appliesToDropoff: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Dropoff Locations</span>
                </label>
              </div>
            )}

            {/* Reason textarea */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason *
              </label>
              <textarea
                value={blacklistRequest.reason}
                onChange={(e) => setBlacklistRequest({ ...blacklistRequest, reason: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition outline-none text-gray-900 min-h-24"
                placeholder="Explain why this should be blacklisted..."
                required
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={blacklistLoading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {blacklistLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Request
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BlacklistRequestModal;
