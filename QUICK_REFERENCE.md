# TAMU Carpool - Quick Reference Guide

## Key Files & Locations

### Authentication & Core State
- `src/AuthContext.jsx` - User auth + profile real-time sync
- `src/ActiveNDRContext.jsx` - Current operating night tracking
- `src/firebase.js` - Firebase initialization (Firestore + Auth)

### Main Components
- `src/components/Dashboard.jsx` (495 lines) - Home page with stats
- `src/components/PhoneRoom.jsx` (840 lines) - Ride intake form
- `src/components/CouchNavigator.jsx` (1,083 lines) - Driver/navigator view
- `src/components/RideManagement.jsx` (726 lines) - Admin ride panel

### Custom Hooks (23 total, 3,878 lines)
**Location**: `src/hooks/`
- `useRideData.js` - Fetch all ride statuses
- `useLocationTracking.js` (533 lines) - Driver location tracking
- `useWaitTime.js` (477 lines) - ETA calculation
- `useRideActions.js` (438 lines) - Ride state transitions
- `useMessaging.js` (310 lines) - Real-time chat
- `useMapRouting.js` (281 lines) - Route optimization

### Utilities
- `src/utils/storageUtils.js` - Platform-aware storage (Preferences/localStorage)
- `src/fcmUtils.js` - Push notifications
- `src/capacitorUtils.js` - Native app helpers
- `src/offlineUtils.js` - Message queue + location cache
- `src/logger.js` - Debug logging

### Firebase Backend
- `functions/index.js` - Cloud Functions (email, notifications)
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Custom database indexes

---

## Quick Problem Fixes

### Dashboard Shows Stale Data
**Problem**: 7 listeners updating independently
**File**: `src/components/Dashboard.jsx:116-162`
**Fix**: Consolidate 3 ride listeners into 1
```javascript
// Current (WRONG): 3 separate listeners
onSnapshot(query(ridesRef, where('status', '==', 'pending')), ...)
onSnapshot(query(ridesRef, where('status', '==', 'active')), ...)
onSnapshot(query(ridesRef, where('status', '==', 'completed')), ...)

// Better (1 listener):
onSnapshot(
  query(ridesRef, where('status', 'in', ['pending', 'active', 'completed'])),
  (snapshot) => {
    // Sort by status locally
  }
)
```

### Form Submission Is Slow
**Problem**: 2 blacklist queries on every form submit
**File**: `src/components/PhoneRoom.jsx:328-348`
**Fix**: Pre-load and cache blacklist
```javascript
// Create new hook: useBlacklistCache
// Pre-load on NDR start
// Check locally before Firestore
```

### App Boots Slowly
**Problem**: Google Maps loads for everyone, even if not using CouchNavigator
**File**: `src/GoogleMapsProvider.js`
**Fix**: Move provider down to CouchNavigator level only

### Component Renders Too Often
**Problem**: PhoneRoom and RideManagement not memoized
**File**: `src/components/PhoneRoom.jsx`, `src/components/RideManagement.jsx`
**Fix**: 
```javascript
export default memo(PhoneRoom);
// Add useCallback for all event handlers
```

### Driver Location Not Updating
**Problem**: May have too many listeners
**File**: Check `src/hooks/useLocationTracking.js`
**Note**: Already has 2-second debounce ✅

---

## Performance Metrics to Monitor

### Listener Count
```javascript
// Count active listeners
const listenerCount = 
  (Dashboard: 7) + 
  (CouchNavigator: 10+) + 
  (AuthContext: 1) + 
  (ActiveNDRContext: 1) = 20+
// Target: <10 during normal operation
```

### Firestore Reads
- PhoneRoom form submit: 2 reads
- Dashboard load: 7 listeners (reads on every change)
- Each ride assignment: 1-10 reads depending on member count

### Component Re-renders
- Monitor using React DevTools Profiler
- Large components (>700 lines) should re-render <1s on average

---

## Hooks to Know

### Data Fetching
| Hook | What it does | Listener | Returns |
|------|-------------|----------|---------|
| `useRideData` | Get all rides for NDR | Yes | `{rides: {pending, active, completed}, loading}` |
| `useCommonLocations` | Frequent addresses | Yes | `[{address, count}]` |
| `useCarLocations` | Driver positions | Yes | `{[carNum]: {lat, lng}}` |
| `useBlacklist` | Blocked phones/addresses | Yes | `{blacklistedAddresses, blacklistedPhones}` |

### Complex Logic
| Hook | What it does | Lines | Returns |
|------|-------------|-------|---------|
| `useRideActions` | Assign/complete/split rides | 438 | `{assignCar, startRide, completeRide, ...}` |
| `useLocationTracking` | Driver location sync | 533 | `{locationEnabled, updateInterval, ...}` |
| `useWaitTime` | ETA calculation | 477 | `{estimatedWaitTime, calculatingWait}` |
| `useMapRouting` | Route optimization | 281 | `{routes, selectedRoute, ...}` |

---

## Firebase Limits & Quotas

### Free Tier (Spark Plan)
- 20K reads/day
- 20K writes/day
- 20K deletes/day

### Current Usage (Estimate)
With 7 simultaneous listeners + 100 rides/night:
- Each change triggers 7 reads
- Could hit 20K reads in 10-15 minutes during busy NDR

### Optimization Impact
- **Consolidate Dashboard listeners**: -50% reads
- **Cache blacklist**: -200 reads per hour
- **Lazy load Google Maps**: -1 initial read
- **Listener pooling**: -30% wasted reads

---

## Testing Checklist

### Unit Tests Needed
- [ ] `useRideData` hook
- [ ] `useWaitTime` hook
- [ ] `useRideActions` hook
- [ ] Blacklist validation
- [ ] Phone number validation

### Integration Tests Needed
- [ ] Full ride lifecycle (request → pickup → complete)
- [ ] Offline message queue sync
- [ ] Location tracking + Firestore update
- [ ] Chat messaging

### Performance Tests Needed
- [ ] Dashboard load time
- [ ] PhoneRoom form submit latency
- [ ] CouchNavigator map rendering (100+ cars)
- [ ] Listener memory usage

---

## Debugging Tips

### Enable All Debug Logs
```javascript
// In logger.js, set all to true:
const DEBUG_CATEGORIES = {
  auth: true,
  firebase: true,
  messages: true,
  location: true,
  // etc.
};
```

### Monitor Firestore Operations
```javascript
// In Chrome DevTools:
// Application > Storage > IndexedDB > carpool-tamu-2446c
// View cached data in Firestore cache
```

### Check Active Listeners
```javascript
// No built-in method, but in Chrome DevTools:
// Search for "onSnapshot" in code
// Set breakpoints in callback functions
```

### Profile Component Performance
```javascript
// React DevTools Profiler:
// 1. Open React DevTools
// 2. Profiler tab
// 3. Record interactions
// 4. Look for slow commits
```

---

## Environment Variables
```bash
REACT_APP_GOOGLE_PLACES_API_KEY=...  # Google Maps API key
REACT_APP_VAPID_KEY=...               # Firebase Cloud Messaging VAPID key
```

---

## Important Notes

1. **Firebase API Keys are Public**: It's normal that API keys are visible in the code. They're restricted at Firebase level.

2. **Capacitor for Native**: The app uses Capacitor for iOS/Android. Different initialization needed for native vs web.

3. **Real-time is Expensive**: 51 listeners × 100+ changes per night = expensive. Consolidation is critical.

4. **Offline Support**: Already implemented with message queue and location caching. Good foundation.

5. **Error Boundary**: Only CouchNavigator wrapped. Should wrap more large components.

6. **Testing Gap**: Only App.test.js exists. No hook tests, component tests, or integration tests.

---

## Next Steps (Priority Order)

1. **This Week** - Consolidate Dashboard listeners (1-2 hours)
2. **This Week** - Add blacklist caching (2-3 hours)
3. **This Month** - Break down CouchNavigator (8-12 hours)
4. **This Month** - Add code splitting (4-6 hours)
5. **This Quarter** - Add comprehensive tests
6. **This Quarter** - Add performance monitoring (Sentry)

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Slow dashboard | 7 listeners | Consolidate to 1 |
| Slow form submit | 2 blacklist queries | Pre-cache blacklist |
| High bundle size | No code splitting | Add lazy loading by route |
| Memory leak | Listener not cleanup | Verify useEffect returns |
| Stale data | Multiple listeners | Use Context for sync |
| No offline support | ❌ Not working | Message queue works ✅ |

---

