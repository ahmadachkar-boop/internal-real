import React, { useState } from 'react';
import { X, Info, Loader2, AlertTriangle, Check } from 'lucide-react';
import { logError } from '../../utils/errorLogger';

/**
 * Modal for displaying traffic information
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Is modal open
 * @param {Function} props.onClose - Close handler
 * @param {boolean} props.googleMapsLoaded - Is Google Maps loaded
 */
const TrafficInfoModal = ({ isOpen, onClose, googleMapsLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [trafficData, setTrafficData] = useState(null);

  const loadTrafficData = async () => {
    setLoading(true);

    try {
      if (!googleMapsLoaded || !window.google) {
        throw new Error('Google Maps not loaded');
      }

      const directionsService = new window.google.maps.DirectionsService();

      // College Station center
      const csCenter = { lat: 30.6280, lng: -96.3344 };
      // Bryan center
      const bryanCenter = { lat: 30.6744, lng: -96.3700 };

      // Key routes to check
      const routes = [
        { name: 'Texas Ave (Northgate to Bryan)', origin: { lat: 30.6217, lng: -96.3401 }, destination: bryanCenter },
        { name: 'University Dr (East Campus)', origin: { lat: 30.6193, lng: -96.3369 }, destination: { lat: 30.6280, lng: -96.3080 } },
        { name: 'Wellborn Rd (North-South)', origin: { lat: 30.6500, lng: -96.2900 }, destination: { lat: 30.5800, lng: -96.2900 } },
        { name: 'Harvey Rd (East-West)', origin: { lat: 30.6000, lng: -96.3700 }, destination: { lat: 30.6000, lng: -96.2900 } },
        { name: 'George Bush Dr (Campus Loop)', origin: { lat: 30.6100, lng: -96.3500 }, destination: { lat: 30.6200, lng: -96.3200 } }
      ];

      const routeData = [];

      for (const route of routes) {
        try {
          const result = await new Promise((resolve, reject) => {
            directionsService.route(
              {
                origin: route.origin,
                destination: route.destination,
                travelMode: window.google.maps.TravelMode.DRIVING,
                drivingOptions: {
                  departureTime: new Date(),
                  trafficModel: 'bestguess'
                }
              },
              (result, status) => {
                if (status === 'OK') resolve(result);
                else reject(status);
              }
            );
          });

          const leg = result.routes[0].legs[0];
          const duration = leg.duration.value;
          const durationInTraffic = leg.duration_in_traffic ? leg.duration_in_traffic.value : duration;
          const delayMinutes = Math.round((durationInTraffic - duration) / 60);

          let status = 'CLEAR';
          if (delayMinutes > 10) status = 'HEAVY';
          else if (delayMinutes > 5) status = 'MODERATE';
          else if (delayMinutes > 2) status = 'LIGHT';

          routeData.push({
            name: route.name,
            duration: Math.round(duration / 60),
            durationInTraffic: Math.round(durationInTraffic / 60),
            delay: delayMinutes,
            status,
            distance: leg.distance.text
          });
        } catch (err) {
          logError('Traffic Route Check', err, { route: route.name });
        }
      }

      setTrafficData({
        routes: routeData,
        updatedAt: new Date()
      });
      setLoading(false);
    } catch (error) {
      logError('Traffic Info Fetch', error);
      setLoading(false);
      setTrafficData(null);
      alert('Failed to load traffic data. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h3 className="text-xl font-bold text-gray-900">Bryan/College Station Traffic Info</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!trafficData && !loading && (
            <div className="text-center py-8">
              <button
                onClick={loadTrafficData}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold flex items-center gap-2 mx-auto min-h-touch touch-manipulation"
              >
                <Info size={20} />
                Load Current Traffic Conditions
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Click to check traffic on major routes in Bryan/College Station
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 size={48} className="animate-spin text-orange-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Checking traffic conditions...</p>
            </div>
          )}

          {trafficData && (
            <div className="space-y-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Last Updated:</strong> {trafficData.updatedAt.toLocaleTimeString()}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 text-lg mb-3">Major Routes</h4>
                <div className="space-y-3">
                  {trafficData.routes.map((route, idx) => (
                    <div
                      key={idx}
                      className={`border-2 rounded-lg p-4 ${
                        route.status === 'HEAVY' ? 'bg-red-50 border-red-400' :
                        route.status === 'MODERATE' ? 'bg-orange-50 border-orange-400' :
                        route.status === 'LIGHT' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-green-50 border-green-400'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{route.name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {route.distance} - {route.durationInTraffic} min
                            {route.delay > 0 && (
                              <span className="font-semibold text-red-700"> (+{route.delay} min delay)</span>
                            )}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          route.status === 'HEAVY' ? 'bg-red-200 text-red-900' :
                          route.status === 'MODERATE' ? 'bg-orange-200 text-orange-900' :
                          route.status === 'LIGHT' ? 'bg-yellow-200 text-yellow-900' :
                          'bg-green-200 text-green-900'
                        }`}>
                          {route.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-2">Recommendations</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  {trafficData.routes.some(r => r.status === 'HEAVY') && (
                    <li className="flex gap-2">
                      <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Heavy traffic detected.</strong> Avoid heavily congested routes if possible.</span>
                    </li>
                  )}
                  {trafficData.routes.filter(r => r.status === 'HEAVY' || r.status === 'MODERATE').length === 0 && (
                    <li className="flex gap-2">
                      <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Traffic is currently light across all major routes.</span>
                    </li>
                  )}
                  <li className="flex gap-2">
                    <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Check back periodically during busy hours (evening rush, events).</span>
                  </li>
                  <li className="flex gap-2">
                    <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Consider alternative routes for heavily delayed areas.</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold min-h-touch touch-manipulation"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrafficInfoModal;
