// Location Service - GPS and Location Management
class LocationService {
constructor() {
this.watchId = null;
this.lastKnownPosition = null;
this.isTracking = false;
this.trackingInterval = null;
this.accuracy = ‘high’; // high, medium, low
this.updateFrequency = 2000; // 2 seconds for active tracking
this.locationBuffer = [];
this.maxBufferSize = 100;
this.totalDistance = 0; // Track total distance in km
this.isMoving = false;
this.movementThreshold = 1; // m/s (3.6 km/h)

    // Optimized geolocation options
    this.geoOptions = {
        high: {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 1000 // Fresh GPS data
        },
        medium: {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 3000
        },
        low: {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 10000
        }
    };
}

// Initialize location service
async initialize() {
    console.log('📍 Initializing Location Service...');
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
        console.error('❌ Geolocation is not supported by this browser');
        this.updateLocationStatus('unavailable');
        return false;
    }
    
    // Check permissions
    try {
        const permission = await this.checkLocationPermission();
        if (permission === 'granted') {
            console.log('✅ Location permission granted');
            this.updateLocationStatus('ready');
            return true;
        } else if (permission === 'denied') {
            console.warn('❌ Location permission denied');
            this.updateLocationStatus('denied');
            return false;
        } else {
            console.log('⚠️ Location permission prompt needed');
            this.updateLocationStatus('prompt_needed');
            return false;
        }
    } catch (error) {
        console.error('❌ Error checking location permission:', error);
        this.updateLocationStatus('error');
        return false;
    }
}

// Check location permission
async checkLocationPermission() {
    if ('permissions' in navigator) {
        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            return result.state;
        } catch (error) {
            console.warn('⚠️ Permission API not supported, using fallback');
        }
    }
    
    // Fallback for browsers without Permission API
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            () => resolve('granted'),
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    resolve('denied');
                } else {
                    resolve('prompt');
                }
            },
            { timeout: 5000 }
        );
    });
}

// Start location tracking
async startTracking() {
    if (this.isTracking) {
        console.log('📍 Location tracking already active');
        return true;
    }
    
    console.log('▶️ Starting location tracking...');
    
    try {
        // Get initial position
        const position = await this.getCurrentPosition();
        if (position) {
            this.handleLocationUpdate(position);
            this.isTracking = true;
            
            // Start continuous tracking
            this.startContinuousTracking();
            
            this.updateLocationStatus('tracking');
            console.log('✅ Location tracking started');
            return true;
        }
    } catch (error) {
        console.error('❌ Failed to start location tracking:', error);
        this.updateLocationStatus('error');
        return false;
    }
}

// Stop location tracking
stopTracking() {
    if (!this.isTracking) {
        console.log('📍 Location tracking not active');
        return;
    }
    
    console.log('⏹️ Stopping location tracking...');
    
    if (this.watchId) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
    }
    
    if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
    }
    
    this.isTracking = false;
    this.updateLocationStatus('ready');
    
    console.log('✅ Location tracking stopped');
}

// Get current position (one-time)
getCurrentPosition() {
    return new Promise((resolve, reject) => {
        const options = this.geoOptions[this.accuracy];
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('📍 Got current position:', position.coords.latitude, position.coords.longitude);
                resolve(position);
            },
            (error) => {
                console.error('❌ Geolocation error:', error);
                this.handleLocationError(error);
                reject(error);
            },
            options
        );
    });
}

// Start continuous tracking - optimized
startContinuousTracking() {
    const options = this.geoOptions[this.accuracy];
    
    // Use watchPosition for real-time tracking
    this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        options
    );
    
    // No redundant interval - watchPosition handles continuous updates
    console.log('📍 Continuous GPS tracking started with watchPosition');
}

// Handle location updates with distance calculation
handleLocationUpdate(position) {
    const locationData = {
        timestamp: new Date(position.timestamp),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed
    };
    
    // Calculate distance if we have a previous position and good accuracy
    if (this.lastKnownPosition && locationData.accuracy < 30) {
        const distance = this.calculateDistance(
            this.lastKnownPosition.latitude,
            this.lastKnownPosition.longitude,
            locationData.latitude,
            locationData.longitude
        );
        
        // Calculate speed for filtering
        const timeDiff = (locationData.timestamp - this.lastKnownPosition.timestamp) / 1000;
        const calculatedSpeed = timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0; // km/h
        
        // Filter GPS drift and unrealistic movements
        if (calculatedSpeed >= 2 && calculatedSpeed <= 200 && distance <= 200 && timeDiff > 0.5) {
            this.totalDistance += distance / 1000; // convert to km
            console.log(`📏 Distance added: ${(distance/1000).toFixed(3)}km, Total: ${this.totalDistance.toFixed(2)}km, Speed: ${calculatedSpeed.toFixed(1)}km/h`);
        }
    }
    
    this.lastKnownPosition = locationData;
    
    // Add to buffer
    this.addToLocationBuffer(locationData);
    
    // Update UI
    this.updateLocationDisplay(locationData);
    this.updateDistanceDisplay();
    
    // Save to storage (if significant movement)
    if (this.shouldSaveLocation(locationData)) {
        this.saveLocationToStorage(locationData);
    }
    
    // Trigger location-based events
    this.checkLocationTriggers(locationData);
    
    console.log('📍 Location updated:', locationData.latitude, locationData.longitude);
}

// Update distance display in UI
updateDistanceDisplay() {
    // Update main distance display
    const distanceElement = document.getElementById('totalDistance');
    if (distanceElement) {
        distanceElement.textContent = `${this.totalDistance.toFixed(2)} km`;
    }
    
    // Update status card distance
    const statusDistance = document.getElementById('statusDistance');
    if (statusDistance) {
        statusDistance.textContent = `${this.totalDistance.toFixed(2)} km`;
    }
    
    // Update any other distance displays
    const distanceDisplays = document.querySelectorAll('.distance-display');
    distanceDisplays.forEach(display => {
        display.textContent = `${this.totalDistance.toFixed(2)} km`;
    });
}

// Handle location errors
handleLocationError(error) {
    let message = 'Location error';
    let status = 'error';
    
    switch (error.code) {
        case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            status = 'denied';
            break;
        case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            status = 'unavailable';
            break;
        case error.TIMEOUT:
            message = 'Location request timed out';
            status = 'timeout';
            break;
        default:
            message = 'Unknown location error';
            break;
    }
    
    console.error('❌ Location error:', message);
    this.updateLocationStatus(status);
    
    // Try to continue with cached location if available
    if (this.lastKnownPosition && status === 'timeout') {
        console.log('📍 Using last known position');
        this.updateLocationDisplay(this.lastKnownPosition);
    }
}

// Location buffer management
addToLocationBuffer(locationData) {
    this.locationBuffer.push(locationData);
    
    // Maintain buffer size
    if (this.locationBuffer.length > this.maxBufferSize) {
        this.locationBuffer.shift();
    }
}

// Check if location should be saved - more permissive thresholds
shouldSaveLocation(newLocation) {
    if (!this.lastKnownPosition) return true;
    
    const distance = this.calculateDistance(
        this.lastKnownPosition.latitude,
        this.lastKnownPosition.longitude,
        newLocation.latitude,
        newLocation.longitude
    );
    
    // More permissive thresholds for continuous tracking
    const timeThreshold = 60 * 1000; // 1 minute instead of 5
    const distanceThreshold = 10; // 10 meters instead of 100
    const timeDiff = newLocation.timestamp - this.lastKnownPosition.timestamp;
    
    return distance > distanceThreshold || timeDiff > timeThreshold;
}

// Calculate distance between two points (Haversine formula)
calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
}

// Save location to storage
saveLocationToStorage(locationData) {
    if (window.app && window.app.dataManager) {
        window.app.dataManager.saveLocation(locationData);
    }
}

// Location-based triggers
checkLocationTriggers(locationData) {
    // Check if vehicle is moving (speed detection)
    if (locationData.speed !== null) {
        const isMoving = locationData.speed > this.movementThreshold; // > 1 m/s (3.6 km/h)
        this.updateMovementStatus(isMoving);
    }
    
    // Check for geofence events (future feature)
    // this.checkGeofences(locationData);
    
    // Trigger location-based alerts if needed
    this.checkLocationBasedAlerts(locationData);
}

// Update movement status with auto-tracking
updateMovementStatus(isMoving) {
    this.isMoving = isMoving;
    
    const statusElement = document.getElementById('movementStatus');
    if (statusElement) {
        statusElement.textContent = isMoving ? 'În mișcare' : 'Oprit';
        statusElement.className = isMoving ? 'status-moving' : 'status-stopped';
    }
    
    // Auto-start tracking when movement detected
    if (isMoving && !this.isTracking) {
        console.log('🚛 Movement detected - auto-starting GPS tracking');
        this.startTracking();
    }
    
    // Auto-detect driving activity based on movement
    if (window.app && window.app.programStarted && !window.app.currentActivity && isMoving) {
        console.log('🚛 Auto-detected vehicle movement - suggesting driving activity');
        // Could trigger suggestion to start driving activity
    }
}

// Location-based alerts
checkLocationBasedAlerts(locationData) {
    // Example: Alert if accuracy is poor
    if (locationData.accuracy > 100) { // > 100 meters accuracy
        console.warn('⚠️ Poor GPS accuracy:', locationData.accuracy + 'm');
    }
    
    // Example: Alert if in restricted area (future feature)
    // this.checkRestrictedAreas(locationData);
}

// Update location display in UI
updateLocationDisplay(locationData) {
    // Update GPS status in header
    const gpsStatus = document.getElementById('gpsStatus');
    if (gpsStatus) {
        gpsStatus.innerHTML = '<span class="status-dot status-gps"></span>GPS Activ';
    }
    
    // Update current location in status card
    const currentLocation = document.getElementById('currentLocation');
    if (currentLocation) {
        // Reverse geocoding would be done here in a real app
        const coords = `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`;
        currentLocation.textContent = `${coords} (±${Math.round(locationData.accuracy)}m)`;
    }
    
    // Update detailed location info if GPS page is active
    if (window.app && window.app.currentTab === 'gps') {
        this.updateGPSPageInfo(locationData);
    }
}

// Update GPS page with detailed info
updateGPSPageInfo(locationData) {
    const elements = {
        'gpsLatitude': locationData.latitude.toFixed(6),
        'gpsLongitude': locationData.longitude.toFixed(6),
        'gpsAccuracy': Math.round(locationData.accuracy) + 'm',
        'gpsSpeed': locationData.speed ? Math.round(locationData.speed * 3.6) + ' km/h' : '0 km/h',
        'gpsAltitude': locationData.altitude ? Math.round(locationData.altitude) + 'm' : 'N/A',
        'gpsTimestamp': locationData.timestamp.toLocaleTimeString('ro-RO')
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}

// Update location status
updateLocationStatus(status) {
    const statusElement = document.getElementById('gpsStatus');
    if (!statusElement) return;
    
    const statusConfig = {
        'ready': { text: 'GPS Ready', class: 'status-gps' },
        'tracking': { text: 'GPS Activ', class: 'status-gps' },
        'denied': { text: 'GPS Denied', class: 'status-alert' },
        'unavailable': { text: 'GPS Unavailable', class: 'status-offline' },
        'error': { text: 'GPS Error', class: 'status-alert' },
        'timeout': { text: 'GPS Timeout', class: 'status-offline' },
        'prompt_needed': { text: 'GPS Permission', class: 'status-offline' }
    };
    
    const config = statusConfig[status] || statusConfig['error'];
    statusElement.innerHTML = `<span class="status-dot ${config.class}"></span>${config.text}`;
}

// Settings management
setAccuracy(accuracy) {
    if (['high', 'medium', 'low'].includes(accuracy)) {
        this.accuracy = accuracy;
        console.log(`📍 GPS accuracy set to: ${accuracy}`);
        
        // Restart tracking with new accuracy if currently tracking
        if (this.isTracking) {
            this.stopTracking();
            setTimeout(() => this.startTracking(), 1000);
        }
    }
}

setUpdateFrequency(frequency) {
    this.updateFrequency = Math.max(1000, frequency); // Minimum 1 second
    console.log(`📍 GPS update frequency set to: ${this.updateFrequency}ms`);
    
    // Note: watchPosition handles its own frequency, this is mainly for backup systems
}

// Reset distance counter
resetDistance() {
    this.totalDistance = 0;
    this.updateDistanceDisplay();
    console.log('🔄 Distance counter reset to 0km');
}

// Get total distance
getTotalDistance() {
    return this.totalDistance;
}

// Get distance in different units
getDistanceFormatted(unit = 'km') {
    switch (unit) {
        case 'm':
            return `${(this.totalDistance * 1000).toFixed(0)} m`;
        case 'mi':
            return `${(this.totalDistance * 0.621371).toFixed(2)} mi`;
        case 'km':
        default:
            return `${this.totalDistance.toFixed(2)} km`;
    }
}

// Export location data
exportLocationData(format = 'json') {
    const data = {
        lastKnownPosition: this.lastKnownPosition,
        locationBuffer: this.locationBuffer,
        totalDistance: this.totalDistance,
        isTracking: this.isTracking,
        accuracy: this.accuracy,
        exportTimestamp: new Date().toISOString()
    };
    
    switch (format) {
        case 'gpx':
            return this.convertToGPX(this.locationBuffer);
        case 'csv':
            return this.convertToCSV(this.locationBuffer);
        case 'json':
        default:
            return JSON.stringify(data, null, 2);
    }
}

// Convert to GPX format
convertToGPX(locations) {
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
```

<gpx version="1.1" creator="Driver Support App">
<trk>
<name>Driving Route</name>
<trkseg>`;

```
    locations.forEach(location => {
        gpx += `
```

<trkpt lat="${location.latitude}" lon="${location.longitude}">
<time>${location.timestamp.toISOString()}</time>
<extensions>
<accuracy>${location.accuracy}</accuracy>
${location.speed ? `<speed>${location.speed}</speed>` : ''}
</extensions>
</trkpt>`;
        });

```
    gpx += `
```

</trkseg>
</trk>
</gpx>`;

```
    return gpx;
}

// Convert to CSV format
convertToCSV(locations) {
    const headers = 'Timestamp,Latitude,Longitude,Accuracy,Speed,Altitude';
    const rows = locations.map(location => [
        location.timestamp.toISOString(),
        location.latitude,
        location.longitude,
        location.accuracy,
        location.speed || '',
        location.altitude || ''
    ].join(','));
    
    return [headers, ...rows].join('\n');
}

// Cleanup
cleanup() {
    this.stopTracking();
    this.locationBuffer = [];
    this.lastKnownPosition = null;
    this.totalDistance = 0;
    console.log('🧹 Location service cleaned up');
}

// Get location statistics
getLocationStats() {
    if (this.locationBuffer.length === 0) {
        return null;
    }
    
    const speeds = this.locationBuffer
        .filter(loc => loc.speed !== null && loc.speed !== undefined)
        .map(loc => loc.speed);
    
    const accuracies = this.locationBuffer.map(loc => loc.accuracy);
    
    return {
        totalPoints: this.locationBuffer.length,
        totalDistance: this.totalDistance,
        averageAccuracy: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
        maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
        averageSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
        timeSpan: this.locationBuffer.length > 1 ? 
            this.locationBuffer[this.locationBuffer.length - 1].timestamp - this.locationBuffer[0].timestamp : 0
    };
}
```

}

console.log(‘📍 LocationService (Optimized) loaded’);