// Location Service - GPS and Location Management (fixed quotes, cleaned strings, safer DOM updates)
class LocationService {
  constructor() {
    this.watchId = null;
    this.lastKnownPosition = null;
    this.isTracking = false;
    this.trackingInterval = null;
    this.accuracy = 'high'; // 'high' | 'medium' | 'low'
    this.updateFrequency = 2000; // 2 seconds for active tracking
    this.locationBuffer = [];
    this.maxBufferSize = 100;
    this.totalDistance = 0; // km
    this.isMoving = false;
    this.movementThreshold = 1; // m/s (≈3.6 km/h)

    // Optimized geolocation options
    this.geoOptions = {
      high: { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 },
      medium: { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 },
      low: { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 },
    };
  }

  // Initialize location service
  async initialize() {
    console.log('📍 Initializing Location Service...');
    if (!('geolocation' in navigator)) {
      console.error('❌ Geolocation is not supported by this browser');
      this.updateLocationStatus('unavailable');
      return false;
    }

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
    if ('permissions' in navigator && navigator.permissions?.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state; // 'granted' | 'denied' | 'prompt'
      } catch (_) {
        console.warn('⚠️ Permission API failed, using fallback');
      }
    }
    // Fallback
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (error) => {
          if (error?.code === error.PERMISSION_DENIED) resolve('denied');
          else resolve('prompt');
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
      const position = await this.getCurrentPosition();
      if (position) {
        this.handleLocationUpdate(position);
        this.isTracking = true;
        this.startContinuousTracking();
        this.updateLocationStatus('tracking');
        console.log('✅ Location tracking started');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to start location tracking:', error);
      this.updateLocationStatus('error');
    }
    return false;
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

  // One-time position
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      const options = this.geoOptions[this.accuracy] || this.geoOptions.high;
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

  // Real-time tracking
  startContinuousTracking() {
    const options = this.geoOptions[this.accuracy] || this.geoOptions.high;
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleLocationError(error),
      options
    );
    console.log('📍 Continuous GPS tracking started with watchPosition');
  }

  // Handle updates + distance
  handleLocationUpdate(position) {
    const locationData = {
      timestamp: new Date(position.timestamp || Date.now()),
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? 9999,
      altitude: position.coords.altitude ?? null,
      altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? 0,
    };

    // Distance calc if we have a previous point and decent accuracy
    if (this.lastKnownPosition && (locationData.accuracy || 9999) < 30) {
      const distanceM = this.calculateDistance(
        this.lastKnownPosition.latitude,
        this.lastKnownPosition.longitude,
        locationData.latitude,
        locationData.longitude
      );
      const timeDiffS = Math.max(0.001, (locationData.timestamp - this.lastKnownPosition.timestamp) / 1000);
      const calcSpeedKmh = (distanceM / timeDiffS) * 3.6;

      // Filter drift/unrealistic jumps
      if (calcSpeedKmh >= 2 && calcSpeedKmh <= 200 && distanceM <= 200 && timeDiffS > 0.5) {
        this.totalDistance += distanceM / 1000; // km
        console.log(`📏 Distance added: ${(distanceM / 1000).toFixed(3)}km, Total: ${this.totalDistance.toFixed(2)}km, Speed: ${calcSpeedKmh.toFixed(1)}km/h`);
      }
    }

    this.lastKnownPosition = locationData;
    this.addToLocationBuffer(locationData);

    // UI hooks
    this.updateLocationDisplay(locationData);
    this.updateDistanceDisplay();

    // Persist if significant
    if (this.shouldSaveLocation(locationData)) {
      this.saveLocationToStorage(locationData);
    }

    // Triggers
    this.checkLocationTriggers(locationData);
    console.log('📍 Location updated:', locationData.latitude, locationData.longitude);
  }

  // Update distance in UI
  updateDistanceDisplay() {
    const value = `${this.totalDistance.toFixed(2)} km`;
    const ids = ['totalDistance', 'statusDistance', 'gpsDistance'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
    document.querySelectorAll('.distance-display').forEach((el) => (el.textContent = value));
    // Optional map subtitle
    const mapSubtitle = document.getElementById('gpsMapSubtitle');
    if (mapSubtitle) mapSubtitle.textContent = `Tracking activ: ${this.totalDistance.toFixed(2)} km`;
  }

  // Errors
  handleLocationError(error) {
    let status = 'error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        status = 'denied';
        break;
      case error.POSITION_UNAVAILABLE:
        status = 'unavailable';
        break;
      case error.TIMEOUT:
        status = 'timeout';
        break;
      default:
        status = 'error';
    }
    console.error('❌ Location error:', error?.message || status);
    this.updateLocationStatus(status);
    if (this.lastKnownPosition && status === 'timeout') {
      console.log('📍 Using last known position');
      this.updateLocationDisplay(this.lastKnownPosition);
    }
  }

  // Buffer mgmt
  addToLocationBuffer(locationData) {
    this.locationBuffer.push(locationData);
    if (this.locationBuffer.length > this.maxBufferSize) this.locationBuffer.shift();
  }

  // Save threshold
  shouldSaveLocation(newLocation) {
    if (!this.lastKnownPosition) return true;
    const distance = this.calculateDistance(
      this.lastKnownPosition.latitude,
      this.lastKnownPosition.longitude,
      newLocation.latitude,
      newLocation.longitude
    );
    const timeThreshold = 60 * 1000; // 1 minute
    const distanceThreshold = 10; // 10 m
    const timeDiff = newLocation.timestamp - this.lastKnownPosition.timestamp;
    return distance > distanceThreshold || timeDiff > timeThreshold;
  }

  // Haversine
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // meters
  }

  // Persistence hook
  saveLocationToStorage(locationData) {
    if (window.app?.dataManager?.saveLocation) {
      window.app.dataManager.saveLocation(locationData);
    }
  }

  // Triggers
  checkLocationTriggers(locationData) {
    if (locationData.speed !== null && locationData.speed !== undefined) {
      const moving = locationData.speed > this.movementThreshold; // >1 m/s
      this.updateMovementStatus(moving);
    }
    // future: geofences, alerts
    if (locationData.accuracy > 100) {
      console.warn('⚠️ Poor GPS accuracy:', `${locationData.accuracy}m`);
    }
  }

  // Movement status
  updateMovementStatus(isMoving) {
    this.isMoving = isMoving;
    const statusElement = document.getElementById('movementStatus');
    if (statusElement) {
      statusElement.textContent = isMoving ? 'În mișcare' : 'Oprit';
      statusElement.className = isMoving ? 'status-moving' : 'status-stopped';
    }
    if (isMoving && !this.isTracking) {
      console.log('🚛 Movement detected - auto-starting GPS tracking');
      this.startTracking();
    }
    if (window.app?.programStarted && !window.app.currentActivity && isMoving) {
      console.log('🚛 Auto-detected movement - consider starting driving activity');
    }
  }

  // UI updates
  updateLocationDisplay(locationData) {
    const gpsStatus = document.getElementById('gpsStatus');
    if (gpsStatus) gpsStatus.innerHTML = '<span class="status-dot status-gps"></span>GPS Activ';

    const currentLocation = document.getElementById('currentLocation');
    if (currentLocation) {
      const coords = `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`;
      currentLocation.textContent = `${coords} (±${Math.round(locationData.accuracy)}m)`;
    }

    if (window.app?.currentTab === 'gps') {
      this.updateGPSPageInfo(locationData);
    }
  }

  // Detailed GPS page info
  updateGPSPageInfo(locationData) {
    const mapping = {
      gpsLatitude: locationData.latitude.toFixed(6),
      gpsLongitude: locationData.longitude.toFixed(6),
      gpsAccuracy: `${Math.round(locationData.accuracy)}m`,
      gpsSpeed: `${locationData.speed ? Math.round(locationData.speed * 3.6) : 0} km/h`,
      gpsAltitude: locationData.altitude ? `${Math.round(locationData.altitude)}m` : 'N/A',
      gpsTimestamp: locationData.timestamp.toLocaleTimeString('ro-RO'),
    };
    Object.entries(mapping).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  }

  // Status pill text + class
  updateLocationStatus(status) {
    const statusElement = document.getElementById('gpsStatus');
    if (!statusElement) return;
    const cfg = {
      ready: { text: 'GPS Ready', cls: 'status-gps' },
      tracking: { text: 'GPS Activ', cls: 'status-gps' },
      denied: { text: 'GPS Denied', cls: 'status-alert' },
      unavailable: { text: 'GPS Unavailable', cls: 'status-offline' },
      error: { text: 'GPS Error', cls: 'status-alert' },
      timeout: { text: 'GPS Timeout', cls: 'status-offline' },
      prompt_needed: { text: 'GPS Permission', cls: 'status-offline' },
    }[status] || { text: 'GPS Error', cls: 'status-alert' };
    statusElement.innerHTML = `<span class="status-dot ${cfg.cls}"></span>${cfg.text}`;
  }

  // Settings
  setAccuracy(accuracy) {
    if (['high', 'medium', 'low'].includes(accuracy)) {
      this.accuracy = accuracy;
      console.log(`📍 GPS accuracy set to: ${accuracy}`);
      if (this.isTracking) {
        this.stopTracking();
        setTimeout(() => this.startTracking(), 1000);
      }
    }
  }

  setUpdateFrequency(frequency) {
    this.updateFrequency = Math.max(1000, Number(frequency) || 1000);
    console.log(`📍 GPS update frequency set to: ${this.updateFrequency}ms`);
  }

  // Distance API
  resetDistance() {
    this.totalDistance = 0;
    this.updateDistanceDisplay();
    console.log('🔄 Distance counter reset to 0km');
  }

  getTotalDistance() {
    return this.totalDistance;
  }

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

  // Export helpers
  exportLocationData(format = 'json') {
    const data = {
      lastKnownPosition: this.lastKnownPosition,
      locationBuffer: this.locationBuffer,
      totalDistance: this.totalDistance,
      isTracking: this.isTracking,
      accuracy: this.accuracy,
      exportTimestamp: new Date().toISOString(),
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

  convertToGPX(locations) {
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Driver Support App">\n<trk>\n<name>Driving Route</name>\n<trkseg>`;
    locations.forEach((loc) => {
      gpx += `\n<trkpt lat="${loc.latitude}" lon="${loc.longitude}">\n<time>${new Date(loc.timestamp).toISOString()}</time>\n<extensions>\n<accuracy>${loc.accuracy}</accuracy>\n${loc.speed ? `<speed>${loc.speed}</speed>` : ''}\n</extensions>\n</trkpt>`;
    });
    gpx += `\n</trkseg>\n</trk>\n</gpx>`;
    return gpx;
  }

  convertToCSV(locations) {
    const headers = 'Timestamp,Latitude,Longitude,Accuracy,Speed,Altitude';
    const rows = locations.map((loc) => [
      new Date(loc.timestamp).toISOString(),
      loc.latitude,
      loc.longitude,
      loc.accuracy,
      loc.speed ?? '',
      loc.altitude ?? '',
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

  // Simple stats
  getLocationStats() {
    if (this.locationBuffer.length === 0) return null;
    const speeds = this.locationBuffer
      .filter((l) => l.speed !== null && l.speed !== undefined)
      .map((l) => l.speed);
    const accuracies = this.locationBuffer.map((l) => l.accuracy);
    return {
      totalPoints: this.locationBuffer.length,
      totalDistance: this.totalDistance,
      averageAccuracy: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
      maxSpeed: speeds.length ? Math.max(...speeds) : 0,
      averageSpeed: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      timeSpan: this.locationBuffer.length > 1
        ? this.locationBuffer[this.locationBuffer.length - 1].timestamp - this.locationBuffer[0].timestamp
        : 0,
    };
  }
}

console.log('📍 LocationService (Optimized) loaded');
// la finalul LocationService.js
if (typeof window !== 'undefined') {
  window.LocationService = LocationService;
}
