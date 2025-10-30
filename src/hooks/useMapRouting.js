import { useState, useRef, useEffect } from 'react';
import { routeLogger, etaLogger } from '../logger';

/**
 * Custom hook for Google Maps route calculation and rendering
 * Handles route rendering, ETA calculation, and waypoint management
 *
 * @param {Object} mapRef - Reference to the Google Map instance
 * @param {boolean} googleMapsLoaded - Whether Google Maps API is loaded
 * @param {Array} activeRides - Array of active rides
 * @param {Object} carLocations - Car locations object
 * @param {string} selectedCar - Selected car number
 * @param {string} viewMode - Current view mode
 * @returns {Object} Route state and control functions
 */
export const useMapRouting = (mapRef, googleMapsLoaded, activeRides, carLocations, selectedCar, viewMode) => {
  const [routeInfo, setRouteInfo] = useState(null);
  const [eta, setEta] = useState(null);

  const directionsRendererRef = useRef(null);
  const routePolylineRef = useRef(null);
  const lastRenderedRouteRef = useRef(null);

  // Route cache to avoid recalculating the same routes
  const routeCache = useRef(new Map());

  // Helper functions for route caching
  const getCachedRoute = (pickup, dropoffs) => {
    const key = `${pickup}-${dropoffs.join('-')}`;
    const cached = routeCache.current.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache
      routeLogger.log('✅ Using cached route for:', key);
      return cached.data;
    }
    return null;
  };

  const setCachedRoute = (pickup, dropoffs, data) => {
    const key = `${pickup}-${dropoffs.join('-')}`;
    routeCache.current.set(key, {
      data,
      timestamp: Date.now()
    });

    // Limit cache size to 20 routes
    if (routeCache.current.size > 20) {
      const firstKey = routeCache.current.keys().next().value;
      routeCache.current.delete(firstKey);
      routeLogger.log('🗑️ Removed oldest route from cache');
    }
  };

  // Clear route from map
  const clearRoute = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    setRouteInfo(null);
    setEta(null);
    lastRenderedRouteRef.current = null;
  };

  // Render route on map
  const renderRoute = async (pickup, dropoffs, shouldFitBounds = false) => {
    if (!mapRef.current || !googleMapsLoaded || !window.google?.maps?.DirectionsService) {
      routeLogger.log('⏭️ Cannot render route - map not ready');
      return;
    }

    // Don't clear route if it's just an update
    if (!shouldFitBounds && directionsRendererRef.current) {
      routeLogger.log('⏭️ Route already exists, skipping re-render');
      return;
    }

    clearRoute();

    // Check cache first
    const cachedRoute = getCachedRoute(pickup, dropoffs);

    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#4285F4',
        strokeWeight: 5,
        strokeOpacity: 0.7,
        zIndex: 100
      }
    });

    directionsRendererRef.current = directionsRenderer;

    let result;

    if (cachedRoute) {
      // Use cached route
      result = cachedRoute;
      directionsRenderer.setDirections(result);
      routeLogger.log('✅ Route rendered from cache');
    } else {
      // Calculate new route
      const directionsService = new window.google.maps.DirectionsService();

      const waypoints = dropoffs.slice(0, -1).map(dropoff => ({
        location: dropoff,
        stopover: true
      }));

      const request = {
        origin: pickup,
        destination: dropoffs[dropoffs.length - 1],
        waypoints: waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true
      };

      try {
        result = await directionsService.route(request);
        directionsRenderer.setDirections(result);

        // Cache the result
        setCachedRoute(pickup, dropoffs, result);
        routeLogger.log('✅ Route rendered and cached');
      } catch (error) {
        routeLogger.warn('⚠️ Route rendering failed (API may need a few minutes to activate):', error.message);
        setRouteInfo(null);
        return;
      }
    }

    // Calculate route info
    let totalDuration = 0;
    let totalDistance = 0;
    result.routes[0].legs.forEach(leg => {
      totalDuration += leg.duration.value;
      totalDistance += leg.distance.value;
    });

    const etaDate = new Date(Date.now() + totalDuration * 1000);

    setRouteInfo({
      duration: totalDuration,
      durationText: Math.round(totalDuration / 60) + ' min',
      distance: totalDistance,
      distanceText: (totalDistance / 1609.34).toFixed(1) + ' mi',
      eta: etaDate
    });

    routeLogger.log('📍 Route info:', {
      duration: totalDuration,
      distance: totalDistance,
      eta: etaDate
    });

    // Only fit bounds on initial route load
    if (shouldFitBounds) {
      routeLogger.log('🎯 Fitting bounds to route');
      const bounds = new window.google.maps.LatLngBounds();
      result.routes[0].legs.forEach(leg => {
        bounds.extend(leg.start_location);
        bounds.extend(leg.end_location);
      });

      // Include car location in bounds if available
      if (selectedCar && carLocations[selectedCar]) {
        const carLoc = carLocations[selectedCar];
        if (carLoc.latitude && carLoc.longitude) {
          bounds.extend({ lat: carLoc.latitude, lng: carLoc.longitude });
          routeLogger.log('📍 Including car location in bounds');
        }
      }

      mapRef.current.fitBounds(bounds);
    }
  };

  // Calculate ETA from car location to next destination
  const calculateETAFromCarLocation = async (carNum) => {
    if (!carLocations[carNum] || !activeRides.length || !googleMapsLoaded || !window.google?.maps?.DirectionsService) {
      setEta(null);
      return;
    }

    const carLocation = carLocations[carNum];
    const ride = activeRides[0];

    const destination = ride.status === 'pending' ? ride.pickup : ride.dropoffs[0];

    const directionsService = new window.google.maps.DirectionsService();

    const request = {
      origin: { lat: carLocation.latitude, lng: carLocation.longitude },
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING
    };

    try {
      const result = await directionsService.route(request);
      const leg = result.routes[0].legs[0];

      const etaDate = new Date(Date.now() + leg.duration.value * 1000);

      setEta({
        duration: leg.duration.value,
        durationText: leg.duration.text,
        distance: leg.distance.value,
        distanceText: leg.distance.text,
        eta: etaDate,
        destination: ride.status === 'pending' ? 'Pickup' : 'Dropoff'
      });

      etaLogger.log('🕐 ETA calculated:', {
        durationText: leg.duration.text,
        distanceText: leg.distance.text,
        eta: etaDate.toLocaleTimeString()
      });
    } catch (error) {
      etaLogger.log('⚠️ ETA calculation failed:', error.message);
      setEta(null);
    }
  };

  // Auto-render routes when active rides change
  useEffect(() => {
    console.log('🛣️ Route rendering effect triggered');

    if (!mapRef.current || !googleMapsLoaded || !window.google) {
      console.log('⏭️ Route rendering skipped - map not ready');
      return;
    }

    if (activeRides.length === 0) {
      console.log('⏭️ Route rendering skipped - no active rides');
      clearRoute();
      return;
    }

    if (viewMode === 'navigator' && !selectedCar) {
      console.log('⏭️ Route rendering skipped - navigator view without selected car');
      clearRoute();
      return;
    }

    const ride = activeRides[0];
    if (!ride.pickup || !ride.dropoffs) {
      console.log('⏭️ Route rendering skipped - ride missing pickup or dropoffs');
      return;
    }

    const routeKey = `${ride.pickup}-${ride.dropoffs.join('-')}-${ride.id}`;
    const isNewRoute = lastRenderedRouteRef.current !== routeKey;
    const routeExists = directionsRendererRef.current && directionsRendererRef.current.getMap();

    if (isNewRoute || !routeExists) {
      routeLogger.log('🛣️ Rendering route for ride:', ride.id, isNewRoute ? '(new)' : '(refresh)');
      renderRoute(ride.pickup, ride.dropoffs, true);
      lastRenderedRouteRef.current = routeKey;
    }
  }, [activeRides, selectedCar, viewMode, googleMapsLoaded]);

  // Calculate ETA when car location updates
  useEffect(() => {
    if (selectedCar && carLocations[selectedCar] && activeRides.length > 0) {
      calculateETAFromCarLocation(selectedCar);
    }
  }, [carLocations, selectedCar, activeRides]);

  return {
    routeInfo,
    eta,
    renderRoute,
    clearRoute,
    calculateETAFromCarLocation
  };
};
