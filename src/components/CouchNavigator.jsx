import React, { useState, useEffect, useRef, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useActiveNDR } from '../ActiveNDRContext';
import { useAuth } from '../AuthContext';
import { AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { useGoogleMaps } from '../GoogleMapsProvider';
import { isNativeApp } from '../capacitorUtils';
import QueueManager from './QueueManager';
import { Capacitor } from '@capacitor/core';
import { navigationLogger, markersLogger } from '../logger';

// Custom Hooks
import { useNavigatorAssignment } from '../hooks/useNavigatorAssignment';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { useMessaging } from '../hooks/useMessaging';
import { useRideTracking } from '../hooks/useRideTracking';
import { useCarLocations } from '../hooks/useCarLocations';
import { useMapRouting } from '../hooks/useMapRouting';
import { useNotifications } from '../hooks/useNotifications';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useHistoryTracking } from '../hooks/useHistoryTracking';

// UI Components
import ViewModeSwitcher from './CouchNavigator/ViewModeSwitcher';
import CarSelector from './CouchNavigator/CarSelector';
import LocationControls from './CouchNavigator/LocationControls';
import NotificationControls from './CouchNavigator/NotificationControls';
import ConnectionStatus from './CouchNavigator/ConnectionStatus';
import MapContainer from './CouchNavigator/MapContainer';
import ChatBox from './CouchNavigator/ChatBox';
import DebugPanel from './CouchNavigator/DebugPanel';
import HistoricalViewBanner from './CouchNavigator/HistoricalViewBanner';

// Memoized ETA display component
const ETADisplay = memo(({ eta }) => {
  if (!eta) return null;

  return (
    <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-800 uppercase">
            ETA to {eta.destination}
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {eta.eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            {eta.durationText} • {eta.distanceText}
          </p>
        </div>
        <Clock size={32} className="text-blue-600" />
      </div>
    </div>
  );
});
ETADisplay.displayName = 'ETADisplay';

// Memoized route info display
const RouteInfoDisplay = memo(({ routeInfo }) => {
  if (!routeInfo) return null;

  return (
    <div className="bg-purple-50 border border-purple-300 rounded-xl p-4">
      <p className="text-xs font-semibold text-purple-800 uppercase mb-2">
        Total Route
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-purple-900">
            {routeInfo.durationText}
          </p>
          <p className="text-sm text-purple-700">
            {routeInfo.distanceText} total
          </p>
        </div>
      </div>
    </div>
  );
});
RouteInfoDisplay.displayName = 'RouteInfoDisplay';

// Memoized active ride display
const ActiveRideDisplay = memo(({ rides }) => {
  if (rides.length === 0) return null;

  return (
    <>
      {rides.map(ride => (
        <div key={ride.id} className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900">{ride.name}</p>
              <p className="text-sm text-gray-600">{ride.phone}</p>
              <div className="mt-2 space-y-1 text-sm">
                <p className="flex items-center gap-1">
                  <span className="text-green-600">📍</span>
                  <span className="font-medium">Pickup:</span> {ride.pickup}
                </p>
                {ride.dropoffs?.map((dropoff, idx) => (
                  <p key={idx} className="flex items-center gap-1">
                    <span className="text-red-600">📍</span>
                    <span className="font-medium">Drop {idx + 1}:</span> {dropoff}
                  </p>
                ))}
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
              {ride.status}
            </span>
          </div>
        </div>
      ))}
    </>
  );
});
ActiveRideDisplay.displayName = 'ActiveRideDisplay';

const CouchNavigator = () => {
  // ===== URL PARAMETERS AND CONTEXTS =====
  const [searchParams] = useSearchParams();
  const { activeNDR, loading: ndrLoading } = useActiveNDR();
  const { userProfile } = useAuth();
  const { isLoaded: googleMapsLoaded, loadError: googleMapsError } = useGoogleMaps();

  // Historical view mode
  const ndrIdFromQuery = searchParams.get('ndrId');
  const eventNameFromQuery = searchParams.get('eventName');
  const isHistoricalView = !!ndrIdFromQuery;

  // ===== LOCAL STATE =====
  const [historicalNDR, setHistoricalNDR] = useState(null);
  const [historicalNDRLoading, setHistoricalNDRLoading] = useState(false);
  const [viewMode, setViewMode] = useState('couch');
  const [selectedCar, setSelectedCar] = useState(null);
  const [carNumber, setCarNumber] = useState('');
  const [availableCars, setAvailableCars] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [showQueueManager, setShowQueueManager] = useState(false);
  const [platformInfo, setPlatformInfo] = useState({
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    isPWA: false
  });
  const [googleMapsMarkerReady, setGoogleMapsMarkerReady] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Refs
  const messagesEndRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const initialMapCenterRef = useRef(null);

  // Use historical NDR if in historical view mode, otherwise use active NDR
  const effectiveNDR = isHistoricalView ? historicalNDR : activeNDR;

  // ===== CUSTOM HOOKS =====
  const { userAssignment, assignmentLoading } = useNavigatorAssignment(activeNDR, userProfile);

  const {
    locationEnabled,
    locationError,
    lastLocationUpdate,
    hasAlwaysPermission,
    debugStatus: locationDebugStatus,
    startLocationTracking,
    stopLocationTracking,
    requestBackgroundPermission,
    setLocationEnabled,
    setDebugStatus: setLocationDebugStatus
  } = useLocationTracking(viewMode, selectedCar, activeNDR, platformInfo);

  const {
    messages,
    newMessage,
    setNewMessage,
    sendingMessage,
    isOtherTyping,
    debugStatus: messagingDebugStatus,
    queuedMessagesCount: messagingQueueCount,
    sendMessage,
    handleTyping,
    lastMessageCountRef,
    setDebugStatus: setMessagingDebugStatus
  } = useMessaging(effectiveNDR, selectedCar, viewMode, userProfile, true, isHistoricalView);

  const { activeRides } = useRideTracking(effectiveNDR, selectedCar, viewMode);

  const { carLocations } = useCarLocations(effectiveNDR, viewMode, selectedCar);

  const { routeInfo, eta } = useMapRouting(mapRef, googleMapsLoaded, activeRides, carLocations, selectedCar, viewMode);

  const { notificationsEnabled, toggleNotifications } = useNotifications(userProfile, platformInfo);

  const {
    isOnline,
    firestoreConnected,
    queuedMessagesCount,
    syncMessages,
    retryMessage,
    deleteQueuedMessage
  } = useOfflineSync(activeNDR, selectedCar, locationEnabled);

  useHistoryTracking(mapRef, googleMapsLoaded, activeRides, carLocations);

  // ===== EFFECTS =====

  // Platform detection
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /android/i.test(userAgent);
    const isMobile = isIOS || isAndroid;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true;

    setPlatformInfo({ isIOS, isAndroid, isMobile, isPWA });

    // Restore state from localStorage
    const savedCar = localStorage.getItem('selectedCar');
    const savedViewMode = localStorage.getItem('viewMode');

    if (savedCar) {
      setSelectedCar(savedCar);
      setCarNumber(savedCar);
      navigationLogger.log('Restored car selection:', savedCar);
    }

    if (savedViewMode) {
      setViewMode(savedViewMode);
      navigationLogger.log('Restored view mode:', savedViewMode);
    }

    console.log('🔔 Platform check:', {
      isNativeApp,
      capacitorPlatform: Capacitor.getPlatform(),
      capacitorNative: Capacitor.isNativePlatform()
    });
  }, []);

  // Load historical NDR
  useEffect(() => {
    if (!ndrIdFromQuery) {
      setHistoricalNDR(null);
      setHistoricalNDRLoading(false);
      return;
    }

    const loadHistoricalNDR = async () => {
      setHistoricalNDRLoading(true);
      try {
        const ndrDoc = await getDoc(doc(db, 'ndrs', ndrIdFromQuery));
        if (ndrDoc.exists()) {
          setHistoricalNDR({ id: ndrDoc.id, ...ndrDoc.data() });
        } else {
          console.error('Historical NDR not found:', ndrIdFromQuery);
          setHistoricalNDR(null);
        }
      } catch (error) {
        console.error('Error loading historical NDR:', error);
        setHistoricalNDR(null);
      } finally {
        setHistoricalNDRLoading(false);
      }
    };

    loadHistoricalNDR();
  }, [ndrIdFromQuery]);

  // Load available cars
  useEffect(() => {
    if (!effectiveNDR) return;

    const loadCars = async () => {
      try {
        const ndrDocRef = doc(db, 'ndrs', effectiveNDR.id);
        const ndrDoc = await getDoc(ndrDocRef);

        if (ndrDoc.exists()) {
          const ndrData = ndrDoc.data();
          let cars = [];

          if (ndrData.cars && ndrData.cars.length > 0) {
            cars = ndrData.cars;
          } else if (ndrData.availableCars) {
            cars = Array.from({ length: ndrData.availableCars }, (_, i) => ({
              carNumber: i + 1,
              driverName: null
            }));
          } else if (ndrData.assignments?.cars) {
            const carNumbers = Object.keys(ndrData.assignments.cars).map(n => parseInt(n));
            cars = carNumbers.map(num => ({ carNumber: num, driverName: null }));
          }

          setAvailableCars(cars);
        }
      } catch (error) {
        console.error('❌ Error loading cars:', error);
      }
    };

    loadCars();
  }, [effectiveNDR]);

  // Auto-apply user assignment
  useEffect(() => {
    if (!userAssignment || isHistoricalView) return;

    if (userAssignment.type === 'car') {
      setViewMode('navigator');
      setSelectedCar(String(userAssignment.carNumber));
      setCarNumber(String(userAssignment.carNumber));
      localStorage.setItem('selectedCar', String(userAssignment.carNumber));
      localStorage.setItem('viewMode', 'navigator');
    } else if (userAssignment.type === 'couch') {
      // Couch users can manually select view mode
    }
  }, [userAssignment, isHistoricalView]);

  // Save state to localStorage
  useEffect(() => {
    if (selectedCar) {
      localStorage.setItem('selectedCar', selectedCar);
    } else {
      localStorage.removeItem('selectedCar');
    }
  }, [selectedCar]);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  // Auto-scroll messages
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    lastMessageCountRef.current = messages.length;
  }, [messages]);

  // Set initial map center
  useEffect(() => {
    if (selectedCar && carLocations[selectedCar] && !initialMapCenterRef.current) {
      const location = carLocations[selectedCar];
      if (location.latitude && location.longitude &&
          typeof location.latitude === 'number' &&
          typeof location.longitude === 'number' &&
          !isNaN(location.latitude) && !isNaN(location.longitude)) {
        initialMapCenterRef.current = {
          lat: location.latitude,
          lng: location.longitude
        };
      }
    }
    if (!selectedCar) {
      initialMapCenterRef.current = null;
    }
  }, [selectedCar, carLocations]);

  // Poll for Google Maps Marker API readiness
  useEffect(() => {
    if (googleMapsMarkerReady) return;

    const checkMarkerAPI = () => {
      if (window.google?.maps?.Marker) {
        markersLogger.log('✅ Google Maps Marker API is now ready');
        setGoogleMapsMarkerReady(true);
        return true;
      }
      return false;
    };

    if (checkMarkerAPI()) return;

    const pollInterval = setInterval(() => {
      if (checkMarkerAPI()) {
        clearInterval(pollInterval);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (!googleMapsMarkerReady) {
        markersLogger.warn('⚠️ Google Maps Marker API not ready after 5 seconds');
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [googleMapsLoaded, googleMapsMarkerReady]);

  // Update markers on map
  useEffect(() => {
    if (!mapRef.current || !googleMapsLoaded || !googleMapsMarkerReady) {
      return;
    }

    const updateMarkers = () => {
      if (viewMode === 'navigator' && selectedCar) {
        const location = carLocations[selectedCar];
        if (location && location.latitude && location.longitude) {
          if (markersRef.current[selectedCar]) {
            markersRef.current[selectedCar].setPosition({
              lat: location.latitude,
              lng: location.longitude
            });
          } else {
            const marker = new window.google.maps.Marker({
              map: mapRef.current,
              position: { lat: location.latitude, lng: location.longitude },
              title: `Car ${selectedCar}`,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3
              },
              label: {
                text: String(selectedCar),
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold'
              },
              zIndex: 1000
            });
            markersRef.current[selectedCar] = marker;
          }
        }
      } else if (viewMode === 'couch' && selectedCar) {
        // Clear other markers
        Object.keys(markersRef.current).forEach(key => {
          if (key != selectedCar) {
            markersRef.current[key]?.setMap(null);
            delete markersRef.current[key];
          }
        });

        const location = carLocations[selectedCar];
        if (location && location.latitude && location.longitude) {
          if (markersRef.current[selectedCar]) {
            markersRef.current[selectedCar].setPosition({
              lat: location.latitude,
              lng: location.longitude
            });
          } else {
            const marker = new window.google.maps.Marker({
              map: mapRef.current,
              position: { lat: location.latitude, lng: location.longitude },
              title: `Car ${selectedCar}`,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3
              },
              label: {
                text: String(selectedCar),
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold'
              },
              zIndex: 1000
            });
            markersRef.current[selectedCar] = marker;
          }
        }
      } else if (viewMode === 'couch' && !selectedCar) {
        // Overview mode
        Object.keys(markersRef.current).forEach(carNum => {
          if (!carLocations[carNum]) {
            markersRef.current[carNum]?.setMap(null);
            delete markersRef.current[carNum];
          }
        });

        Object.entries(carLocations).forEach(([carNum, location]) => {
          if (!location.latitude || !location.longitude) return;

          const actualCarNumber = location.carNumber || parseInt(carNum, 10);

          if (markersRef.current[actualCarNumber]) {
            markersRef.current[actualCarNumber].setPosition({
              lat: location.latitude,
              lng: location.longitude
            });
          } else {
            const marker = new window.google.maps.Marker({
              map: mapRef.current,
              position: { lat: location.latitude, lng: location.longitude },
              title: `Car ${actualCarNumber}`,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
              },
              label: {
                text: String(actualCarNumber),
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold'
              },
              zIndex: 1000
            });
            markersRef.current[actualCarNumber] = marker;
          }
        });
      }
    };

    updateMarkers();
  }, [carLocations, googleMapsLoaded, googleMapsMarkerReady, selectedCar, viewMode, forceRefresh]);

  // Force refresh on car/view change
  useEffect(() => {
    if (googleMapsLoaded && mapRef.current) {
      setTimeout(() => setForceRefresh(prev => prev + 1), 100);
    }
  }, [selectedCar, viewMode]);

  // ===== HANDLERS =====

  const onMapLoad = (map) => {
    navigationLogger.log('🗺️ Map loaded!');
    mapRef.current = map;
    if (window.google?.maps?.Marker) {
      setGoogleMapsMarkerReady(true);
    }
  };

  const centerMapOnCar = (carNum) => {
    if (!mapRef.current || !carLocations[carNum]) return;
    const location = carLocations[carNum];
    mapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
    mapRef.current.setZoom(16);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

  const handleCarSelect = (car) => {
    if (car !== selectedCar) {
      initialMapCenterRef.current = null;
    }
    setSelectedCar(car);
  };

  const handleDisconnect = async () => {
    if (locationEnabled) {
      await stopLocationTracking();
    }
    Object.values(markersRef.current).forEach(marker => marker?.setMap(null));
    markersRef.current = {};
    initialMapCenterRef.current = null;
    localStorage.removeItem('selectedCar');
    setCarNumber('');
    setSelectedCar(null);
    setLocationEnabled(false);
    setLocationDebugStatus('🔴 Disconnected');
    setTimeout(() => setLocationDebugStatus(''), 2000);
  };

  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping(e.target.value.length > 0);
  };

  const handleMessageBlur = () => {
    handleTyping(false);
  };

  // ===== LOADING AND ERROR STATES =====

  if (ndrLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#79F200] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (googleMapsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border-2 border-red-200 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Google Maps Failed to Load</h2>
            <p className="text-gray-600 mb-4">The map couldn't be loaded.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isHistoricalView && historicalNDRLoading) {
    return (
      <div className="space-y-6 p-4">
        <h2 className="text-3xl font-bold text-gray-900">Loading Chat Logs...</h2>
        <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-8 text-center">
          <RefreshCw className="mx-auto mb-4 text-blue-600 animate-spin" size={64} />
          <p className="text-gray-600">Fetching chat logs for {eventNameFromQuery || 'this event'}...</p>
        </div>
      </div>
    );
  }

  if (isHistoricalView && !historicalNDR) {
    return (
      <div className="space-y-6 p-4">
        <h2 className="text-3xl font-bold text-gray-900">Chat Logs Not Found</h2>
        <div className="bg-red-50 border-2 border-red-400 rounded-xl p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={64} />
          <p className="text-gray-600">The requested NDR (ID: {ndrIdFromQuery}) could not be found.</p>
        </div>
      </div>
    );
  }

  if (!effectiveNDR && !isHistoricalView) {
    return (
      <div className="space-y-6 p-4">
        <h2 className="text-3xl font-bold text-gray-900">Couch Navigator</h2>
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-600" size={64} />
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Active NDR</h3>
          <p className="text-gray-600">
            This system requires an active NDR. Directors should activate an NDR from the NDR Reports page.
          </p>
        </div>
      </div>
    );
  }

  if (!isHistoricalView && assignmentLoading) {
    return (
      <div className="space-y-6 p-4">
        <h2 className="text-3xl font-bold text-gray-900">Couch Navigator</h2>
        <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-8 text-center">
          <RefreshCw className="mx-auto mb-4 text-blue-600 animate-spin" size={64} />
          <p className="text-gray-600">Verifying your role assignment for this NDR.</p>
        </div>
      </div>
    );
  }

  if (!isHistoricalView && userAssignment && userAssignment.type === 'unassigned') {
    return (
      <div className="space-y-6 p-4">
        <h2 className="text-3xl font-bold text-gray-900">Couch Navigator</h2>
        <div className="bg-red-50 border-2 border-red-400 rounded-xl p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={64} />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Access Restricted</h3>
          <p className="text-gray-600 mb-4">
            You are not assigned to any role for this NDR. Only assigned navigators and couch users can access this section.
          </p>
        </div>
      </div>
    );
  }

  // ===== MAIN RENDER =====

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col gap-3 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Couch Navigator</h1>

          <HistoricalViewBanner isHistoricalView={isHistoricalView} eventName={eventNameFromQuery} />

          {!isHistoricalView && userAssignment && userAssignment.type === 'car' && (
            <div className="bg-blue-50 border border-blue-300 rounded-lg px-4 py-2 mb-2">
              <p className="text-sm font-semibold text-blue-800">
                🚗 Assigned to Car {userAssignment.carNumber}
              </p>
              <p className="text-xs text-blue-600">
                You are locked into navigator mode for your assigned car.
              </p>
            </div>
          )}

          {!isHistoricalView && userAssignment && userAssignment.type === 'couch' && (
            <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-2 mb-2">
              <p className="text-sm font-semibold text-green-800">🛋️ Couch Navigator</p>
              <p className="text-xs text-green-600">You can view and switch between all cars.</p>
            </div>
          )}

          <ViewModeSwitcher
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            userAssignment={userAssignment}
            isHistoricalView={isHistoricalView}
          />

          <div className="flex flex-wrap gap-2">
            <NotificationControls
              notificationsEnabled={notificationsEnabled}
              onToggle={toggleNotifications}
            />

            <ConnectionStatus
              isOnline={isOnline}
              firestoreConnected={firestoreConnected}
              queuedMessagesCount={queuedMessagesCount}
              onShowQueue={() => setShowQueueManager(true)}
            />

            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm bg-gray-800 text-white hover:bg-gray-700 transition whitespace-nowrap"
            >
              🔍 Debug
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <DebugPanel
          showDebug={showDebug}
          onClose={() => setShowDebug(false)}
          selectedCar={selectedCar}
          viewMode={viewMode}
          activeNDR={activeNDR}
          availableCars={availableCars}
          messages={messages}
          locationEnabled={locationEnabled}
          isOnline={isOnline}
          firestoreConnected={firestoreConnected}
          queuedMessagesCount={queuedMessagesCount}
          eta={eta}
          debugStatus={locationDebugStatus || messagingDebugStatus}
        />

        {viewMode === 'navigator' ? (
          <div className="space-y-6">
            {!selectedCar ? (
              <CarSelector
                selectedCar={selectedCar}
                carNumber={carNumber}
                setCarNumber={setCarNumber}
                onCarSelect={handleCarSelect}
                availableCars={availableCars}
                viewMode={viewMode}
                userAssignment={userAssignment}
                onDisconnect={handleDisconnect}
              />
            ) : (
              <>
                <CarSelector
                  selectedCar={selectedCar}
                  carNumber={carNumber}
                  setCarNumber={setCarNumber}
                  onCarSelect={handleCarSelect}
                  availableCars={availableCars}
                  viewMode={viewMode}
                  userAssignment={userAssignment}
                  onDisconnect={handleDisconnect}
                />

                {activeRides.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Your Active Ride</h3>
                    <div className="space-y-3">
                      <ActiveRideDisplay rides={activeRides} />
                      <ETADisplay eta={eta} />
                      <RouteInfoDisplay routeInfo={routeInfo} />
                    </div>
                  </div>
                )}

                <LocationControls
                  locationEnabled={locationEnabled}
                  locationError={locationError}
                  lastLocationUpdate={lastLocationUpdate}
                  onStartTracking={startLocationTracking}
                  onStopTracking={stopLocationTracking}
                  platformInfo={platformInfo}
                  isNativeApp={isNativeApp}
                  hasAlwaysPermission={hasAlwaysPermission}
                  onRequestBackgroundPermission={requestBackgroundPermission}
                />

                {googleMapsLoaded && (
                  <MapContainer
                    selectedCar={selectedCar}
                    carLocations={carLocations}
                    onMapLoad={onMapLoad}
                    initialCenter={initialMapCenterRef.current}
                    onRecenter={() => centerMapOnCar(selectedCar)}
                    title={`Your Location${activeRides.length > 0 ? ' & Route' : ''}`}
                    viewMode={viewMode}
                  />
                )}

                <ChatBox
                  selectedCar={selectedCar}
                  messages={messages}
                  messagesEndRef={messagesEndRef}
                  viewMode={viewMode}
                  isOtherTyping={isOtherTyping}
                  newMessage={newMessage}
                  onMessageChange={handleMessageChange}
                  onMessageBlur={handleMessageBlur}
                  onSendMessage={sendMessage}
                  sendingMessage={sendingMessage}
                  isHistoricalView={isHistoricalView}
                />
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <CarSelector
              selectedCar={selectedCar}
              carNumber={carNumber}
              setCarNumber={setCarNumber}
              onCarSelect={handleCarSelect}
              availableCars={availableCars}
              viewMode={viewMode}
              userAssignment={userAssignment}
              onDisconnect={handleDisconnect}
            />

            {selectedCar && (
              <>
                {googleMapsLoaded && carLocations[selectedCar] && (
                  <MapContainer
                    selectedCar={selectedCar}
                    carLocations={carLocations}
                    onMapLoad={onMapLoad}
                    initialCenter={initialMapCenterRef.current}
                    onRecenter={() => centerMapOnCar(selectedCar)}
                    title={`Live Location - Car ${selectedCar}`}
                    viewMode={viewMode}
                  />
                )}

                {!carLocations[selectedCar] && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-800">
                      📍 Waiting for Car {selectedCar} navigator to enable location sharing...
                    </p>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Active Rides for Car {selectedCar}
                  </h3>
                  {activeRides.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No active rides</p>
                  ) : (
                    <div className="space-y-3">
                      <ActiveRideDisplay rides={activeRides} />
                      {carLocations[selectedCar] && <ETADisplay eta={eta} />}
                    </div>
                  )}
                </div>

                <ChatBox
                  selectedCar={selectedCar}
                  messages={messages}
                  messagesEndRef={messagesEndRef}
                  viewMode={viewMode}
                  isOtherTyping={isOtherTyping}
                  newMessage={newMessage}
                  onMessageChange={handleMessageChange}
                  onMessageBlur={handleMessageBlur}
                  onSendMessage={sendMessage}
                  sendingMessage={sendingMessage}
                  isHistoricalView={isHistoricalView}
                />
              </>
            )}
          </div>
        )}
      </div>

      <QueueManager
        isOpen={showQueueManager}
        onClose={() => setShowQueueManager(false)}
        onSync={syncMessages}
        onRetryMessage={retryMessage}
        onDeleteMessage={deleteQueuedMessage}
      />
    </div>
  );
};

export default CouchNavigator;
