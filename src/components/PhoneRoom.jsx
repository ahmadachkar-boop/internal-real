import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { useActiveNDR } from '../ActiveNDRContext';
import { AlertCircle, Phone, Users, Send, CheckCircle, XCircle, Shield, AlertTriangle } from 'lucide-react';
import { useGoogleMaps } from '../GoogleMapsProvider';
import { useCommonLocations } from '../hooks/useCommonLocations';
import { useDuplicateCaller } from '../hooks/useDuplicateCaller';
import { useWaitTime } from '../hooks/useWaitTime';
import { useBlacklist } from '../hooks/useBlacklist';
import DuplicateCallerWarning from './PhoneRoom/DuplicateCallerWarning';
import EstimatedWaitTime from './PhoneRoom/EstimatedWaitTime';
import BlacklistRequestModal from './PhoneRoom/BlacklistRequestModal';
import BlacklistViewerModal from './PhoneRoom/BlacklistViewerModal';
import AddressAutocomplete from './PhoneRoom/AddressAutocomplete';

// Development logging helper
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args) => {
  if (isDev) console.log(...args);
};
const devError = (...args) => {
  if (isDev) console.error(...args);
};

// Phone validation regex - valid US phone format
const PHONE_REGEX = /^[2-9]\d{2}[2-9]\d{6}$/;

// Valid zip codes and cities for address validation
const VALID_ZIP_CODES = ['77801', '77802', '77803', '77807', '77808', '77840', '77841', '77842', '77843', '77844', '77845'];
const VALID_CITIES = ['bryan', 'college station', 'college-station'];

const PhoneRoom = () => {
  const { activeNDR, loading } = useActiveNDR();
  const { isLoaded, loadError } = useGoogleMaps();

  // Phone number formatting utility
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

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    pickup: '',
    dropoffs: [''],
    riders: 1
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Modal states
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showBlacklistViewer, setShowBlacklistViewer] = useState(false);

  // Use extracted hooks
  const commonLocations = useCommonLocations(activeNDR);
  const duplicateCallerWarning = useDuplicateCaller(formData.phone, activeNDR);
  const { estimatedWaitTime, calculatingWait } = useWaitTime(formData.pickup, activeNDR, isLoaded);
  const {
    blacklistedAddresses,
    blacklistedPhones,
    getActiveBlacklists,
    checkBlacklist
  } = useBlacklist(activeNDR);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Address validation helper
  const validateAddress = (address) => {
    const addressLower = address.toLowerCase();
    return VALID_ZIP_CODES.some(zip => address.includes(zip)) ||
           VALID_CITIES.some(city => addressLower.includes(city));
  };

  // Address normalization for blacklist checking
  const normalizeAddress = (addr) => {
    return addr.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,]/g, '')
      .trim();
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.pickup || formData.dropoffs.some(d => !d)) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setMessage('Please enter a valid 10-digit phone number');
      setMessageType('error');
      return;
    }

    // Enhanced phone validation - check for valid US phone format
    if (!PHONE_REGEX.test(phoneDigits)) {
      setMessage('Please enter a valid phone number (area code cannot start with 0 or 1)');
      setMessageType('error');
      return;
    }

    // Validate addresses are in Bryan/College Station area
    if (!validateAddress(formData.pickup)) {
      setMessage('Pickup address must be in Bryan/College Station area');
      setMessageType('error');
      return;
    }

    for (const dropoff of formData.dropoffs) {
      if (!validateAddress(dropoff)) {
        setMessage('All dropoff addresses must be in Bryan/College Station area');
        setMessageType('error');
        return;
      }
    }

    setSubmitLoading(true);
    setMessage('Verifying information...');
    setMessageType('info');

    try {
      // Check phone blacklist
      const phoneBlacklistRef = collection(db, 'phoneBlacklist');
      const phoneBlacklistQuery = query(
        phoneBlacklistRef,
        where('phone', '==', formData.phone),
        where('status', '==', 'approved')
      );
      const phoneSnapshot = await getDocs(phoneBlacklistQuery);

      const activePhoneBlacklist = getActiveBlacklists(
        phoneSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        'phone'
      );

      if (activePhoneBlacklist.length > 0) {
        setMessage(`This phone number is blacklisted: ${activePhoneBlacklist[0].reason}`);
        setMessageType('error');
        setSubmitLoading(false);
        return;
      }

      // Check address blacklist
      const activeAddressBlacklist = getActiveBlacklists(blacklistedAddresses, 'address');

      for (const item of activeAddressBlacklist) {
        const blacklistedAddr = normalizeAddress(item.address);

        if (item.appliesToPickup) {
          const pickupAddr = normalizeAddress(formData.pickup);
          if (pickupAddr.includes(blacklistedAddr) || blacklistedAddr.includes(pickupAddr)) {
            setMessage(`Pickup location is blacklisted: ${item.reason}`);
            setMessageType('error');
            setSubmitLoading(false);
            return;
          }
        }

        if (item.appliesToDropoff) {
          for (const dropoff of formData.dropoffs) {
            const dropoffAddr = normalizeAddress(dropoff);
            if (dropoffAddr.includes(blacklistedAddr) || blacklistedAddr.includes(dropoffAddr)) {
              setMessage(`Dropoff location is blacklisted: ${item.reason}`);
              setMessageType('error');
              setSubmitLoading(false);
              return;
            }
          }
        }
      }

      const rideData = {
        ndrId: activeNDR.id,
        patronName: formData.name.trim(),
        phone: formData.phone,
        pickup: formData.pickup.trim(),
        dropoffs: formData.dropoffs.map(d => d.trim()),
        riders: parseInt(formData.riders),
        status: 'pending',
        requestedAt: Timestamp.now(),
        requestedBy: currentUser?.uid || 'anonymous'
      };

      await addDoc(collection(db, 'rides'), rideData);

      setMessage('Ride request submitted successfully!');
      setMessageType('success');

      setFormData({
        name: '',
        phone: '',
        pickup: '',
        dropoffs: [''],
        riders: 1
      });

      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);

    } catch (error) {
      devError('Error submitting request:', error);
      setMessage('Error submitting request. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-0">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Phone Room</h2>
        <div className="bg-white p-4 md:p-8 lg:p-12 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 border-4 border-[#79F200] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!activeNDR) {
    return (
      <div className="space-y-6 p-4 md:p-0">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Phone Room</h2>
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-4 md:p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-600" size={64} />
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Active NDR</h3>
          <p className="text-gray-600 mb-4">
            Phone Room is currently unavailable. A director must activate an NDR from the NDR Reports page before you can add phone requests.
          </p>
          <p className="text-sm text-gray-600">
            Directors: Go to NDR Reports and activate an Operating Night event to enable Phone Room.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Phone Room</h2>
          <p className="text-gray-600 mt-1">Log incoming ride requests</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <button
            onClick={() => setShowBlacklistViewer(true)}
            className="px-4 py-3 md:py-2 min-h-touch bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 rounded-xl transition font-medium text-sm flex items-center justify-center gap-2 border-2 border-gray-300 touch-manipulation"
          >
            <Shield size={18} />
            View Blacklists
          </button>
          <button
            onClick={() => setShowBlacklistModal(true)}
            className="px-4 py-3 md:py-2 min-h-touch bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl transition font-medium text-sm flex items-center justify-center gap-2 shadow-lg touch-manipulation"
          >
            <AlertTriangle size={18} />
            Request Blacklist
          </button>
          <div className="bg-[#79F200] px-6 py-3 rounded-xl shadow-lg">
            <p className="text-sm font-medium text-gray-900">Active NDR</p>
            <p className="text-base md:text-lg font-bold text-gray-900">{activeNDR.eventName}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-[#79F200] p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Phone className="text-[#79F200]" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">New Request</h3>
              <p className="text-gray-900/80 text-sm font-medium">Enter caller information below</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {!isLoaded && !loadError && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <p className="text-sm text-blue-800 font-medium">Loading Google Maps...</p>
                <p className="text-xs text-blue-600 mt-1">This may take a few seconds. You can still submit requests.</p>
              </div>
            </div>
          )}

          {loadError && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    Google Maps failed to load
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Address autocomplete unavailable. You can still type addresses manually and submit requests.
                  </p>
                  <p className="text-xs text-yellow-600 mt-2">
                    <strong>Error:</strong> {loadError.message || 'Unknown error'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
              messageType === 'error'
                ? 'bg-red-50 border border-red-200'
                : messageType === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              {messageType === 'error' ? (
                <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              ) : messageType === 'success' ? (
                <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
              ) : (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              )}
              <p className={`text-sm font-medium ${
                messageType === 'error' ? 'text-red-700' : messageType === 'success' ? 'text-green-700' : 'text-blue-700'
              }`}>{message}</p>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Users size={16} />
                Patron Name
              </label>
              <input
                type="text"
                inputMode="text"
                autoComplete="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#79F200] focus:border-[#79F200] transition outline-none text-gray-900"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Phone size={16} />
                Phone Number
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: formatPhoneNumber(e.target.value)})}
                maxLength="14"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#79F200] focus:border-[#79F200] transition outline-none text-gray-900"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Use extracted DuplicateCallerWarning component */}
            {duplicateCallerWarning && (
              <DuplicateCallerWarning duplicateCallerWarning={duplicateCallerWarning} />
            )}

            {/* Use extracted EstimatedWaitTime component */}
            {estimatedWaitTime && !duplicateCallerWarning && (
              <EstimatedWaitTime
                estimatedWaitTime={estimatedWaitTime}
                calculatingWait={calculatingWait}
              />
            )}

            {calculatingWait && !estimatedWaitTime && (
              <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-600">Calculating wait time with live traffic data...</p>
              </div>
            )}

            {/* Use AddressAutocomplete component for pickup */}
            <AddressAutocomplete
              label="Pickup Location"
              value={formData.pickup}
              onChange={(value) => setFormData({ ...formData, pickup: value })}
              commonLocations={commonLocations}
              isLoaded={isLoaded}
            />

            {/* Use AddressAutocomplete component for dropoffs */}
            <div>
              <AddressAutocomplete
                label="Dropoff Location(s)"
                value={formData.dropoffs}
                onChange={(value) => setFormData({ ...formData, dropoffs: value })}
                commonLocations={commonLocations}
                isLoaded={isLoaded}
                multiple={true}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Users size={16} />
                Number of Riders
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="10"
                value={formData.riders}
                onChange={(e) => setFormData({...formData, riders: parseInt(e.target.value) || 1})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#79F200] focus:border-[#79F200] transition outline-none text-gray-900"
              />
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800 font-medium flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                  You can add multiple dropoff locations for this ride. Addresses outside the service area will be rejected.
                </span>
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitLoading || (duplicateCallerWarning !== null)}
              className="w-full py-4 bg-[#79F200] text-gray-900 rounded-xl hover:shadow-lg hover:shadow-[#79F200]/30 transform hover:scale-[1.02] transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
            >
              {submitLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : duplicateCallerWarning ? (
                <>
                  <AlertTriangle size={20} />
                  Cannot Submit - Duplicate Caller
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Use extracted BlacklistRequestModal component */}
      {showBlacklistModal && (
        <BlacklistRequestModal
          isOpen={showBlacklistModal}
          onClose={() => setShowBlacklistModal(false)}
          activeNDR={activeNDR}
          currentUser={currentUser}
          formatPhoneNumber={formatPhoneNumber}
          isLoaded={isLoaded}
        />
      )}

      {/* Use extracted BlacklistViewerModal component */}
      {showBlacklistViewer && (
        <BlacklistViewerModal
          isOpen={showBlacklistViewer}
          onClose={() => setShowBlacklistViewer(false)}
          activeNDR={activeNDR}
          blacklistedAddresses={blacklistedAddresses}
          blacklistedPhones={blacklistedPhones}
          getActiveBlacklists={getActiveBlacklists}
        />
      )}
    </div>
  );
};

export default PhoneRoom;
