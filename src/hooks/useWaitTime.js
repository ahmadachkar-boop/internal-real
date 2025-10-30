import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args) => {
  if (isDev) console.log(...args);
};
const devError = (...args) => {
  if (isDev) console.error(...args);
};

/**
 * Custom hook to calculate estimated wait time using real routing with full queue simulation
 * Simulates the entire pending ride queue to calculate accurate ETAs
 */
export const useWaitTime = (activeNDR, pickup, isLoaded) => {
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(null);
  const [calculatingWait, setCalculatingWait] = useState(false);

  useEffect(() => {
    const calculateWaitTime = async () => {
      if (!activeNDR || !pickup) {
        setEstimatedWaitTime(null);
        return;
      }

      // If Google Maps not loaded, use simple fallback
      if (!isLoaded || !window.google) {
        devLog('Google Maps not loaded, using fallback calculation');
        setCalculatingWait(true);

        try {
          const ridesRef = collection(db, 'rides');
          const pendingQuery = query(
            ridesRef,
            where('ndrId', '==', activeNDR.id),
            where('status', '==', 'pending')
          );
          const pendingSnapshot = await getDocs(pendingQuery);
          const pendingCount = pendingSnapshot.size;

          const availableCars = activeNDR.availableCars || 0;
          const avgWait = 15 + (pendingCount * 3);

          setEstimatedWaitTime({
            min: Math.max(10, avgWait - 5),
            max: avgWait + 10,
            pendingCount,
            availableCars,
            freeCars: 0,
            fallback: true,
            reason: 'Google Maps unavailable'
          });
        } catch (error) {
          devError('Error in fallback calculation:', error);
          setEstimatedWaitTime({
            min: 15,
            max: 30,
            pendingCount: 0,
            availableCars: activeNDR.availableCars || 0,
            freeCars: 0,
            fallback: true
          });
        } finally {
          setCalculatingWait(false);
        }
        return;
      }

      setCalculatingWait(true);

      try {
        const directionsService = new window.google.maps.DirectionsService();
        const ridesRef = collection(db, 'rides');

        // Get pending rides IN ORDER (oldest first - this is the queue)
        const pendingQuery = query(
          ridesRef,
          where('ndrId', '==', activeNDR.id),
          where('status', '==', 'pending')
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        const pendingRides = pendingSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestedAt: doc.data().requestedAt?.toDate() || new Date()
        })).sort((a, b) => a.requestedAt - b.requestedAt); // Oldest first = queue order

        const pendingCount = pendingRides.length;

        // Get active rides with full route info
        const activeQuery = query(
          ridesRef,
          where('ndrId', '==', activeNDR.id),
          where('status', '==', 'active')
        );
        const activeSnapshot = await getDocs(activeQuery);

        // Get car locations
        const carLocationsRef = collection(db, 'carLocations');
        const carLocationsQuery = query(
          carLocationsRef,
          where('ndrId', '==', activeNDR.id)
        );
        const carLocationsSnapshot = await getDocs(carLocationsQuery);
        const carLocations = {};
        carLocationsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          carLocations[data.carNumber] = data;
        });

        const availableCars = activeNDR.availableCars || 0;
        const activeRides = activeSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        devLog(`🚗 Simulating queue: ${pendingCount} pending rides, ${availableCars} cars`);

        // Helper function to route a full ride
        const routeFullRide = async (origin, ride) => {
          try {
            const waypoints = [];
            const dropoffs = ride.dropoffs || [ride.dropoff];

            // Add pickup as waypoint
            waypoints.push({ location: ride.pickup, stopover: true });

            // Add intermediate dropoffs as waypoints
            dropoffs.slice(0, -1).forEach(dropoff => {
              waypoints.push({ location: dropoff, stopover: true });
            });

            const finalDropoff = dropoffs[dropoffs.length - 1];

            const result = await new Promise((resolve, reject) => {
              directionsService.route(
                {
                  origin: origin,
                  destination: finalDropoff,
                  waypoints: waypoints,
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

            let totalTime = 0;
            result.routes[0].legs.forEach(leg => {
              const duration = leg.duration_in_traffic || leg.duration;
              totalTime += duration.value;
            });

            // Add 2 min buffer per stop (pickup + each dropoff)
            const bufferMinutes = (waypoints.length + 1) * 2;
            const totalMinutes = Math.ceil(totalTime / 60) + bufferMinutes;

            return { minutes: totalMinutes, finalLocation: finalDropoff };
          } catch (error) {
            devError('Error routing ride:', error);
            // Fallback: 20 min average
            const dropoffs = ride.dropoffs || [ride.dropoff];
            return {
              minutes: 20,
              finalLocation: dropoffs[dropoffs.length - 1]
            };
          }
        };

        // Initialize car availability tracking
        const carTimeline = [];

        // STEP 1: Calculate when each car finishes its CURRENT active ride
        for (let carNum = 1; carNum <= availableCars; carNum++) {
          const activeRide = activeRides.find(r => r.carNumber === carNum);
          const location = carLocations[carNum];

          if (!activeRide) {
            // Car is FREE - ready now
            carTimeline.push({
              carNumber: carNum,
              availableAt: 0, // Available immediately
              currentLocation: location && location.latitude ?
                { lat: location.latitude, lng: location.longitude } :
                null
            });
          } else {
            // Car is BUSY - calculate time to finish current ride
            try {
              const waypoints = [];
              const dropoffs = activeRide.dropoffs || [activeRide.dropoff];

              let origin;
              if (activeRide.pickedUpAt) {
                // Already picked up, heading to dropoffs
                origin = activeRide.pickup;
              } else if (location && location.latitude && location.longitude) {
                // En route to pickup
                origin = { lat: location.latitude, lng: location.longitude };
                waypoints.push({ location: activeRide.pickup, stopover: true });
              } else {
                // No location, use pickup
                origin = activeRide.pickup;
              }

              // Add dropoffs
              dropoffs.forEach((dropoff, idx) => {
                if (idx < dropoffs.length - 1) {
                  waypoints.push({ location: dropoff, stopover: true });
                }
              });

              const finalDropoff = dropoffs[dropoffs.length - 1];

              const currentRouteResult = await new Promise((resolve, reject) => {
                directionsService.route(
                  {
                    origin: origin,
                    destination: finalDropoff,
                    waypoints: waypoints,
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

              let totalCurrentRouteTime = 0;
              currentRouteResult.routes[0].legs.forEach(leg => {
                const duration = leg.duration_in_traffic || leg.duration;
                totalCurrentRouteTime += duration.value;
              });

              const bufferMinutes = (waypoints.length + 1) * 2;
              const currentRouteMinutes = Math.ceil(totalCurrentRouteTime / 60) + bufferMinutes;

              carTimeline.push({
                carNumber: carNum,
                availableAt: currentRouteMinutes,
                currentLocation: finalDropoff
              });
            } catch (error) {
              devError(`Error routing current ride for car ${carNum}:`, error);
              const dropoffs = activeRide.dropoffs || [activeRide.dropoff];
              carTimeline.push({
                carNumber: carNum,
                availableAt: 30, // Fallback estimate
                currentLocation: dropoffs[dropoffs.length - 1]
              });
            }
          }
        }

        devLog('📊 Initial car availability:', carTimeline);

        // STEP 2: Simulate dispatching ALL pending rides in queue order
        for (let i = 0; i < pendingRides.length; i++) {
          const ride = pendingRides[i];

          // Find the car that will be available soonest
          carTimeline.sort((a, b) => a.availableAt - b.availableAt);
          const nextCar = carTimeline[0];

          devLog(`📋 Queue ${i + 1}/${pendingCount}: Assigning to Car ${nextCar.carNumber} (available in ${nextCar.availableAt} min)`);

          // Calculate route from car's next location to this ride
          const origin = nextCar.currentLocation || pickup; // Fallback if no location
          const rideResult = await routeFullRide(origin, ride);

          // Update this car's availability
          nextCar.availableAt += rideResult.minutes;
          nextCar.currentLocation = rideResult.finalLocation;

          devLog(`  → Ride takes ${rideResult.minutes} min, car available again at ${nextCar.availableAt} min`);
        }

        devLog('📊 After processing queue:', carTimeline);

        // STEP 3: Now calculate time to reach the NEW caller's pickup
        const finalCarTimeline = [];

        for (const car of carTimeline) {
          try {
            const result = await new Promise((resolve, reject) => {
              directionsService.route(
                {
                  origin: car.currentLocation || pickup,
                  destination: pickup,
                  travelMode: window.google.maps.TravelMode.DRIVING,
                  drivingOptions: {
                    departureTime: new Date(Date.now() + car.availableAt * 60000),
                    trafficModel: 'bestguess'
                  }
                },
                (result, status) => {
                  if (status === 'OK') resolve(result);
                  else reject(status);
                }
              );
            });

            const toNewPickupDuration = result.routes[0].legs[0].duration_in_traffic || result.routes[0].legs[0].duration;
            const toNewPickupMinutes = Math.ceil(toNewPickupDuration.value / 60);

            const totalAvailableInMinutes = car.availableAt + toNewPickupMinutes;

            finalCarTimeline.push({
              carNumber: car.carNumber,
              availableInMinutes: totalAvailableInMinutes
            });

            devLog(`🚗 Car ${car.carNumber}: Free at ${car.availableAt} min + ${toNewPickupMinutes} min drive = ${totalAvailableInMinutes} min total`);
          } catch (error) {
            devError(`Error routing to new pickup for car ${car.carNumber}:`, error);
            finalCarTimeline.push({
              carNumber: car.carNumber,
              availableInMinutes: car.availableAt + 10 // Fallback
            });
          }
        }

        // Find the fastest car
        if (finalCarTimeline.length > 0) {
          finalCarTimeline.sort((a, b) => a.availableInMinutes - b.availableInMinutes);
          const fastestCar = finalCarTimeline[0];

          const estimatedMinutes = fastestCar.availableInMinutes;
          const minWait = Math.max(5, estimatedMinutes - 3);
          const maxWait = estimatedMinutes + 5;

          devLog(`✅ Final result: Car ${fastestCar.carNumber} arrives in ${estimatedMinutes} min (${minWait}-${maxWait} min range)`);

          setEstimatedWaitTime({
            min: minWait,
            max: maxWait,
            pendingCount,
            availableCars,
            freeCars: carTimeline.filter(c => c.availableAt === 0).length,
            fastestCar: fastestCar.carNumber,
            usingRealRouting: true,
            queueSimulated: true
          });
        } else {
          // Fallback if no cars
          setEstimatedWaitTime({
            min: 15,
            max: 25,
            pendingCount,
            availableCars,
            freeCars: 0
          });
        }
      } catch (error) {
        devError('Error calculating wait time:', error);
        // Fallback calculation - fetch pending count separately
        try {
          const ridesRef = collection(db, 'rides');
          const pendingQuery = query(
            ridesRef,
            where('ndrId', '==', activeNDR.id),
            where('status', '==', 'pending')
          );
          const pendingSnapshot = await getDocs(pendingQuery);
          const pendingCount = pendingSnapshot.size;
          const avgWait = 15 + (pendingCount * 5);

          setEstimatedWaitTime({
            min: Math.max(10, avgWait - 5),
            max: avgWait + 10,
            pendingCount,
            availableCars: activeNDR.availableCars || 0,
            freeCars: 0,
            fallback: true
          });
        } catch (fallbackError) {
          devError('Error in fallback calculation:', fallbackError);
          // Ultimate fallback - just show generic estimate
          setEstimatedWaitTime({
            min: 15,
            max: 30,
            pendingCount: 0,
            availableCars: activeNDR.availableCars || 0,
            freeCars: 0,
            fallback: true
          });
        }
      } finally {
        setCalculatingWait(false);
      }
    };

    const debounce = setTimeout(calculateWaitTime, 1500);
    return () => clearTimeout(debounce);
  }, [pickup, activeNDR, isLoaded]);

  return { estimatedWaitTime, calculatingWait };
};
