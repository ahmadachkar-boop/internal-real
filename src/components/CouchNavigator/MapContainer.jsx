import React, { memo } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { Navigation, Clock } from 'lucide-react';

// Memoized map component to prevent re-renders
const StableMap = memo(({ initialCenter, onMapLoad, mapOptions, mapContainerStyle }) => {
  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      defaultCenter={initialCenter}
      defaultZoom={16}
      onLoad={onMapLoad}
      options={mapOptions}
    />
  );
});
StableMap.displayName = 'StableMap';

/**
 * Component for Google Maps container with markers and routes
 */
const MapContainer = ({
  selectedCar,
  carLocations,
  onMapLoad,
  initialCenter,
  onRecenter,
  showRecenterButton = true,
  title,
  viewMode
}) => {
  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '12px',
    minHeight: '300px'
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    gestureHandling: 'greedy'
  };

  const DEFAULT_MAP_CENTER = { lat: 30.6187, lng: -96.3365 };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
      {title && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Navigation size={20} className="text-blue-600" />
            {title}
          </h3>
          {showRecenterButton && selectedCar && carLocations[selectedCar] && (
            <button
              onClick={onRecenter}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2 touch-manipulation whitespace-nowrap"
            >
              <Navigation size={16} />
              Recenter
            </button>
          )}
        </div>
      )}

      <StableMap
        key={`map-${viewMode}-${selectedCar}`}
        initialCenter={initialCenter || DEFAULT_MAP_CENTER}
        onMapLoad={onMapLoad}
        mapOptions={mapOptions}
        mapContainerStyle={mapContainerStyle}
      />

      {selectedCar && !carLocations[selectedCar] && (
        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
          <Clock size={12} />
          Waiting for location data...
        </p>
      )}

      {selectedCar && carLocations[selectedCar] && (
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <Clock size={12} />
          Last updated: {carLocations[selectedCar].updatedAt?.toLocaleTimeString() || 'Unknown'}
        </p>
      )}
    </div>
  );
};

export default MapContainer;
