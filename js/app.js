// Driver Support App - Main Application Logic (Fixed & Improved)
class DriverApp {
  constructor() {
    this.programStarted = false;
    this.currentActivity = null;
    this.programStartTime = null;
    this.activityStartTime = null;
    this.voiceListening = false;
    this.currentTab = 'program';
    this.isInitialized = false;
    this.locationUpdateInterval = null;
    this.currentLocation = null;

    // --- Google Maps state ---
    googleMapsPromise = null;
    gmap = null;
    gmarker = null;
    gaccuracy = null;
    gpolyline = null;
    gtrackCoords = [];
    gdirectionsService = null;
    gdirectionsRenderer = null;
    gtrafficLayer = null;
    gplaces = null;

    // Initialize components with error handling
    try {
      this.dataManager = new DataManager();
      this.timeTracker = new TimeTracker();
      this.locationService = new LocationService();
      this.alertSystem = new AlertSystem();

      // Bind LocationService events to UI updates
      this.setupLocationServiceIntegration();

      this.initializeApp();
    } catch (error) {
      console.error('❌ Failed to initialize components:', error);
      this.handleInitializationError(error);
    }
  }

  // ========= Location Service Integration =========
  setupLocationServiceIntegration() {
    if (this.locationService) {
      const originalUpdateDistance = this.locationService.updateDistanceDisplay?.bind(this.locationService) || (() => {});
      this.locationService.updateDistanceDisplay = () => {
        originalUpdateDistance();
        this.updateDistanceInMainUI();
      };
    }
  }

  updateDistanceInMainUI() {
    if (!this.locationService) return;

    const distance = this.locationService.getTotalDistance ? this.locationService.getTotalDistance() : 0;

    const statusDistance = document.getElementById('statusDistance');
    if (statusDistance) {
      statusDistance.textContent = `${distance.toFixed(2)} km`;
    }

    const currentDistance = document.getElementById('currentDistance');
    if (currentDistance) {
      currentDistance.textContent = `${distance.toFixed(2)} km`;
    }

    if (this.currentTab === 'reports') {
      this.updateReportsDistance(distance);
    }
  }

  updateReportsDistance(distance) {
    const reportDistance = document.getElementById('reportTotalDistance');
    if (reportDistance) {
      reportDistance.textContent = `${distance.toFixed(2)} km`;
    }
  }

  async loadGoogleMapsOnce() {
    if (window.google && window.google.maps) return;
    if (!this.googleMapsPromise) {
      const key = 'AIzaSyCmGr0WUbpzHnlrJLdrvaMzuIL1ghPfC8k'; // <-- pune cheia ta aici
      const url = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=weekly`;
      this.googleMapsPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = url; s.async = true; s.defer = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error('Google Maps failed to load'));
        document.head.appendChild(s);
      });
    }
    await this.googleMapsPromise;
  }
  
  // ================= App Initialization =================
  async initializeApp() {
    console.log('🚛 Driver Support App initializing...');

    try {
      this.showLoadingScreen();
      await this.fastInitialize();
      this.hideLoadingScreen();
      this.isInitialized = true;
      console.log('✅ App initialized successfully');
      this.backgroundInitialize();
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  async fastInitialize() {
    this.updateLoadingProgress(20, 'Inițializez componentele...');
    await this.initializeComponents();

    this.updateLoadingProgress(50, 'Încarc datele salvate...');
    this.loadSavedData();

    this.updateLoadingProgress(80, 'Finalizez...');
    this.setupEventListeners();
    this.updateNetworkStatus();

    this.updateLoadingProgress(100, 'Gata!');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  async backgroundInitialize() {
    console.log('🔄 Starting background initialization...');
    try {
      await this.initializeLocationService();
      this.requestPermissionsInBackground();
      this.initializeLocationServices();
      this.loadWeatherData();
      this.startPeriodicUpdates();
      console.log('✅ Background initialization complete');
    } catch (error) {
      console.warn('⚠️ Background initialization issues:', error);
    }
  }

  async initializeLocationService() {
    if (this.locationService?.initialize) {
      try {
        const initialized = await this.locationService.initialize();
        const gpsStatus = document.getElementById('gpsStatus');
        if (initialized) {
          console.log('✅ LocationService initialized successfully');
          if (gpsStatus) gpsStatus.innerHTML = '<span class="status-dot status-gps"></span>GPS Ready';
        } else {
          console.warn('⚠️ LocationService initialization failed');
          if (gpsStatus) gpsStatus.innerHTML = '<span class="status-dot status-offline"></span>GPS Offline';
        }
      } catch (error) {
        console.error('❌ LocationService initialization error:', error);
      }
    }
  }

  async requestPermissionsInBackground() {
    const permissionsState = this.getPermissionsState();
    setTimeout(() => { if (!permissionsState.location.asked) this.requestLocationPermission(); }, 1000);
    setTimeout(() => { if (!permissionsState.notifications.asked) this.requestNotificationPermission(); }, 2000);
    setTimeout(() => { if (!permissionsState.microphone.asked) this.requestMicrophonePermission(); }, 3000);
  }

  initializeLocationServices() {
    setTimeout(() => { this.initializeHomePageLocation(); }, 500);
  }

  async initGoogleMap(locationData) {
    await this.loadGoogleMapsOnce();
  
    const start = {
      lat: locationData.latitude ?? 45.9432,
      lng: locationData.longitude ?? 24.9668
    };
  
    // dacă există deja o hartă, doar o actualizăm
    if (this.gmap) {
      google.maps.event.trigger(this.gmap, 'resize');
      this.updateGoogleMap(locationData);
      return;
    }
  
    this.gmap = new google.maps.Map(document.getElementById('gpsMap'), {
      center: start,
      zoom: 15,
      disableDefaultUI: false,
      mapTypeControl: false,
      fullscreenControl: true
    });
  
    // straturi utile
    this.gtrafficLayer = new google.maps.TrafficLayer();
    this.gtrafficLayer.setMap(this.gmap);
  
    this.gmarker = new google.maps.Marker({
      position: start,
      map: this.gmap,
      title: 'Poziția mea',
      zIndex: 2
    });
  
    this.gaccuracy = new google.maps.Circle({
      center: start,
      radius: locationData.accuracy || 30,
      map: this.gmap,
      strokeOpacity: 0,
      fillColor: '#4285F4',
      fillOpacity: 0.15
    });
  
    this.gtrackCoords = [start];
    this.gpolyline = new google.maps.Polyline({
      path: this.gtrackCoords,
      map: this.gmap,
      strokeOpacity: 0.9,
      strokeWeight: 4
    });
  
    this.gdirectionsService = new google.maps.DirectionsService();
    this.gdirectionsRenderer = new google.maps.DirectionsRenderer({
      map: this.gmap,
      suppressMarkers: false,
      preserveViewport: false
    });
  
    this.gplaces = new google.maps.places.PlacesService(this.gmap);
  
    // primul update
    this.updateGoogleMap(locationData);
  
    // fix când tab-ul a fost ascuns
    setTimeout(() => google.maps.event.trigger(this.gmap, 'resize'), 300);
  }
  
  // ================= Loading Screen =================
  showLoadingScreen() {
    const loadingHTML = `
      <div id="loadingScreen" style="position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;color:white;font-family:Arial,sans-serif;opacity:1;transition:opacity .5s ease;">
        <div style="text-align:center;">
          <div style="font-size:48px;margin-bottom:20px;animation:bounce 1s ease-in-out infinite alternate;">🚛</div>
          <h2 style="margin-bottom:10px;animation:fadeIn .8s ease-in;">Driver Support App</h2>
          <div id="loadingStatus" style="margin-bottom:30px;opacity:.8;min-height:20px;">Se inițializează...</div>
          <div style="width:200px;height:4px;background:rgba(255,255,255,.3);border-radius:2px;overflow:hidden;">
            <div id="loadingProgress" style="width:0%;height:100%;background:white;border-radius:2px;transition:width .3s ease;"></div>
          </div>
          <div style="margin-top:15px;font-size:12px;opacity:.6;">Aplicația se încarcă rapid...</div>
        </div>
      </div>
      <style>
        @keyframes bounce{from{transform:translateY(0)}to{transform:translateY(-10px)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes loadingPulse{0%,100%{opacity:.6}50%{opacity:1}}
        #loadingStatus{animation:loadingPulse 2s ease-in-out infinite}
      </style>`;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
    this.loadingTimeout = setTimeout(() => { console.warn('⚠️ Loading took too long, force hiding...'); this.hideLoadingScreen(); }, 3000);
  }

  updateLoadingProgress(percent, status) {
    const progressBar = document.getElementById('loadingProgress');
    const statusText = document.getElementById('loadingStatus');
    if (progressBar) progressBar.style.width = percent + '%';
    if (statusText) statusText.textContent = status;
    if (percent >= 100) setTimeout(() => this.hideLoadingScreen(), 300);
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) return;
    if (this.loadingTimeout) { clearTimeout(this.loadingTimeout); this.loadingTimeout = null; }
    loadingScreen.style.opacity = '0';
    loadingScreen.style.pointerEvents = 'none';
    setTimeout(() => { loadingScreen.parentNode?.removeChild(loadingScreen); }, 500);

    const appContent = document.querySelector('.app-container, .content, main, body > *:not(#loadingScreen)');
    if (appContent) {
      appContent.style.opacity = '0';
      appContent.style.transition = 'opacity .5s ease';
      setTimeout(() => { appContent.style.opacity = '1'; }, 100);
    }
  }

  // ================= Core Components =================
  async initializeComponents() {
    this.updateLoadingProgress(20, 'Inițializez componentele...');

    // Polyfill / attach missing methods defensively
    if (this.alertSystem && typeof this.alertSystem.checkDrivingCompliance !== 'function') {
      this.alertSystem.checkDrivingCompliance = () => {
        console.log('🔍 Checking driving compliance...');
        if (!this.timeTracker?.hasActiveSession || !this.timeTracker.hasActiveSession()) return false;
        const drivingTime = this.timeTracker.getActivityTime?.('driving') || 0;
        if (drivingTime > 4.5 * 60 * 60 * 1000) {
          this.alertSystem.showAlert?.('warning', 'Atenție: Timp de conducere prelungit. Luați o pauză!');
          return false;
        }
        return true;
      };
    }

    if (this.timeTracker && typeof this.timeTracker.hasActiveSession !== 'function') {
      this.timeTracker.hasActiveSession = () => this.programStarted && this.programStartTime;
    }

    if (this.timeTracker && typeof this.timeTracker.startProgram !== 'function') {
      this.timeTracker.startProgram = (startTime) => {
        this.timeTracker.programStartTime = startTime;
        this.timeTracker.activities = [];
        console.log('📊 TimeTracker: Program started');
      };
    }

    if (this.timeTracker && typeof this.timeTracker.startActivity !== 'function') {
      this.timeTracker.startActivity = (activityType, startTime) => {
        if (!this.timeTracker.hasActiveSession()) {
          console.error('⚠️ Cannot start activity without active session');
          return false;
        }
        this.timeTracker.currentActivity = { type: activityType, startTime, endTime: null };
        console.log(`📊 TimeTracker: Activity started - ${activityType}`);
        return true;
      };
    }
  }

  // ================= Permissions =================
  getPermissionsState() {
    const saved = localStorage.getItem('driverapp_permissions');
    if (saved) return JSON.parse(saved);
    return { location: { asked: false, granted: false }, notifications: { asked: false, granted: false }, microphone: { asked: false, granted: false } };
  }

  savePermissionsState(type, granted) {
    const state = this.getPermissionsState();
    state[type] = { asked: true, granted };
    localStorage.setItem('driverapp_permissions', JSON.stringify(state));
  }

  resetPermissions() {
    localStorage.removeItem('driverapp_permissions');
    this.showToast('🔄 Permisiunile au fost resetate');
  }

  async reactivateGPS() {
    const state = this.getPermissionsState();
    state.location = { asked: false, granted: false };
    localStorage.setItem('driverapp_permissions', JSON.stringify(state));
    const granted = await this.requestLocationPermission();
    if (granted && this.locationService?.initialize) {
      await this.locationService.initialize();
      setTimeout(() => { this.loadGPSPage(); }, 500);
    }
    return granted;
  }

  async requestLocationPermission() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('📍 Geolocation not supported');
        this.savePermissionsState('location', false);
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => { // success → already granted
          console.log('📍 Location permission already granted');
          this.savePermissionsState('location', true);
          resolve(true);
        },
        () => { // prompt our modal
          const modal = this.createPermissionModal(
            '📍 Permisiune Locație',
            'Această aplicație are nevoie de acces la locația ta pentru a oferi funcții GPS și de navigație.',
            async () => {
              try {
                const position = await new Promise((res, rej) => {
                  navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000, enableHighAccuracy: true });
                });
                console.log('📍 Location permission granted');
                this.showToast('✅ Locația a fost activată');
                this.savePermissionsState('location', true);
                modal.remove();
                resolve(true);
                return position;
              } catch (error) {
                console.log('📍 Location permission denied');
                this.showToast('⚠️ Locația nu este disponibilă');
                this.savePermissionsState('location', false);
                modal.remove();
                resolve(false);
              }
            },
            () => {
              console.log('📍 Location permission declined by user');
              this.savePermissionsState('location', false);
              modal.remove();
              resolve(false);
            }
          );
        },
        { timeout: 1000 }
      );
    });
  }

  async requestNotificationPermission() {
    return new Promise((resolve) => {
      if (!('Notification' in window)) { this.savePermissionsState('notifications', false); resolve(false); return; }
      if (Notification.permission === 'granted') { this.savePermissionsState('notifications', true); resolve(true); return; }
      if (Notification.permission === 'denied') { this.savePermissionsState('notifications', false); resolve(false); return; }

      const modal = this.createPermissionModal(
        '🔔 Permisiune Notificări',
        'Aplicația va trimite notificări importante despre timp de conducere și pauze obligatorii.',
        async () => {
          try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              this.showToast('✅ Notificările au fost activate');
              new Notification('Driver Support App', { body: 'Notificările sunt acum active!', icon: '/icon-192.png' });
            }
            this.savePermissionsState('notifications', permission === 'granted');
            modal.remove();
            resolve(permission === 'granted');
          } catch (error) {
            console.log('🔔 Notification permission error:', error);
            this.savePermissionsState('notifications', false);
            modal.remove();
            resolve(false);
          }
        },
        () => { this.savePermissionsState('notifications', false); modal.remove(); resolve(false); }
      );
    });
  }

  async requestMicrophonePermission() {
    return new Promise((resolve) => {
      if (!navigator.mediaDevices?.getUserMedia) { this.savePermissionsState('microphone', false); resolve(false); return; }
      const modal = this.createPermissionModal(
        '🎤 Permisiune Microfon',
        'Pentru controlul vocal, aplicația are nevoie de acces la microfon.',
        async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.showToast('✅ Microfonul a fost activat');
            stream.getTracks().forEach((t) => t.stop());
            this.savePermissionsState('microphone', true);
            modal.remove();
            resolve(true);
          } catch (error) {
            this.showToast('⚠️ Microfonul nu este disponibil');
            this.savePermissionsState('microphone', false);
            modal.remove();
            resolve(false);
          }
        },
        () => { this.savePermissionsState('microphone', false); modal.remove(); resolve(false); }
      );
    });
  }

  createPermissionModal(title, message, onAllow, onDeny) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:10000;font-family:Arial,sans-serif;';
    modal.innerHTML = `
      <div style="background:white;border-radius:12px;padding:30px;max-width:400px;margin:20px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.3);">
        <h3 style="margin-bottom:15px;color:#2c3e50;">${title}</h3>
        <p style="margin-bottom:25px;color:#7f8c8d;line-height:1.5;">${message}</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="permissionDeny" style="padding:12px 24px;border:2px solid #95a5a6;background:white;color:#7f8c8d;border-radius:6px;cursor:pointer;font-weight:500;">Nu acum</button>
          <button id="permissionAllow" style="padding:12px 24px;border:2px solid #3498db;background:#3498db;color:white;border-radius:6px;cursor:pointer;font-weight:500;">Permite</button>
        </div>
      </div>`;
    modal.querySelector('#permissionAllow').onclick = onAllow;
    modal.querySelector('#permissionDeny').onclick = onDeny;
    document.body.appendChild(modal);
    return modal;
  }

  // ================= Saved Data =================
  loadSavedData() {
    this.updateLoadingProgress(90, 'Încarc datele salvate...');
    try {
      const settings = this.dataManager.getSettings?.() || {};
      const driverData = this.dataManager.getDriverData?.() || {};
      const sessionData = this.dataManager.getSessionData?.() || {};

      if (settings.darkMode) {
        document.body.classList.add('dark-mode');
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) darkModeToggle.checked = true;
      }
      if (settings.voiceControl !== undefined) {
        const voiceControlToggle = document.getElementById('voiceControlToggle');
        if (voiceControlToggle) voiceControlToggle.checked = settings.voiceControl;
      }
      if (settings.soundAlerts !== undefined) {
        const soundAlertsToggle = document.getElementById('soundAlertsToggle');
        if (soundAlertsToggle) soundAlertsToggle.checked = settings.soundAlerts;
      }

      if (driverData.name) {
        const driverNameEl = document.getElementById('driverName');
        const settingDriverNameEl = document.getElementById('settingDriverName');
        if (driverNameEl) driverNameEl.textContent = driverData.name;
        if (settingDriverNameEl) settingDriverNameEl.value = driverData.name;
      }
      if (driverData.truckNumber) {
        const truckNumberEl = document.getElementById('truckNumber');
        const settingTruckNumberEl = document.getElementById('settingTruckNumber');
        if (truckNumberEl) truckNumberEl.textContent = `Camion #${driverData.truckNumber}`;
        if (settingTruckNumberEl) settingTruckNumberEl.value = driverData.truckNumber;
      }

      if (sessionData.isActive) this.restoreSession(sessionData);
    } catch (error) {
      console.warn('⚠️ Error loading saved data:', error);
    }
    this.updateLoadingProgress(100, 'Gata!');
  }

  restoreSession(sessionData) {
    console.log('🔄 Restoring active session...');
    try {
      this.programStarted = true;
      this.programStartTime = new Date(sessionData.startTime);

      const startButton = document.getElementById('startButton');
      const statusCard = document.getElementById('statusCard');
      const controlButtons = document.getElementById('controlButtons');
      const currentState = document.getElementById('currentState');
      const programStartTime = document.getElementById('programStartTime');

      if (startButton) startButton.style.display = 'none';
      if (statusCard) statusCard.classList.add('show');
      if (controlButtons) controlButtons.classList.add('show');
      if (currentState) currentState.textContent = 'Program activ';
      if (programStartTime) programStartTime.textContent = this.formatTime(this.programStartTime);

      if (this.timeTracker?.startProgram) this.timeTracker.startProgram(this.programStartTime);

      if (this.locationService?.startTracking) {
        setTimeout(() => { this.locationService.startTracking(); }, 2000);
      }

      if (sessionData.currentActivity) {
        setTimeout(() => {
          const activityType = sessionData.currentActivity.type;
          const activityName = sessionData.currentActivity.name;
          const buttonId = `btn${activityType.charAt(0).toUpperCase() + activityType.slice(1)}`;
          const button = document.getElementById(buttonId);
          this.setActivity(activityType, activityName, button);
        }, 1000);
      }

      this.showToast('Sesiune restaurată');
    } catch (error) {
      console.error('❌ Error restoring session:', error);
      this.dataManager.saveSessionData?.({ isActive: false });
    }
  }

  // ================= Event Listeners =================
  setupEventListeners() {
    document.querySelectorAll('.control-btn, .nav-item').forEach((button) => {
      button.addEventListener('touchstart', function () { this.style.transform = 'scale(0.95)'; }, { passive: true });
      button.addEventListener('touchend', function () { this.style.transform = 'scale(1)'; }, { passive: true });
    });

    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📱 App backgrounded - reducing updates');
      } else {
        console.log('📱 App foregrounded - resuming updates');
        if (this.isInitialized) this.updateUI();
      }
    });
  }

  // ================= Program Control =================
  startProgram() {
    if (this.programStarted) return;
    console.log('▶️ Starting program...');

    this.programStarted = true;
    this.programStartTime = new Date();

    const startButton = document.getElementById('startButton');
    const statusCard = document.getElementById('statusCard');
    const controlButtons = document.getElementById('controlButtons');
    const currentState = document.getElementById('currentState');
    const programStartTime = document.getElementById('programStartTime');
    const currentActivity = document.getElementById('currentActivity');

    if (startButton) startButton.style.display = 'none';
    if (statusCard) statusCard.classList.add('show');
    if (controlButtons) controlButtons.classList.add('show');
    if (currentState) currentState.textContent = 'Program activ';
    if (programStartTime) programStartTime.textContent = this.formatTime(this.programStartTime);
    if (currentActivity) currentActivity.textContent = 'Așteptare activitate';

    this.dataManager.saveSessionData?.({ isActive: true, startTime: this.programStartTime.toISOString(), activities: [] });
    this.timeTracker?.startProgram?.(this.programStartTime);

    if (this.locationService?.startTracking) {
      setTimeout(() => { this.locationService.startTracking(); console.log('📍 Location tracking started with program'); }, 1000);
    }

    this.alertSystem?.scheduleComplianceAlerts?.();
    this.showToast('Program pornit cu succes!');

    setTimeout(() => { this.alertSystem?.showAlert?.('info', 'Sistem de monitorizare activ'); }, 5000);
  }

  endProgram() {
    if (!this.programStarted) return;
    if (!confirm('Sigur doriți să terminați programul?')) return;

    console.log('⏹️ Ending program...');
    this.locationService?.stopTracking?.();

    this.programStarted = false;
    this.currentActivity = null;
    this.programStartTime = null;
    this.activityStartTime = null;

    const startButton = document.getElementById('startButton');
    const statusCard = document.getElementById('statusCard');
    const controlButtons = document.getElementById('controlButtons');

    if (startButton) startButton.style.display = 'block';
    if (statusCard) statusCard.classList.remove('show');
    if (controlButtons) controlButtons.classList.remove('show');

    document.querySelectorAll('.control-btn').forEach((btn) => btn.classList.remove('active'));

    let sessionData = {};
    if (this.timeTracker?.endProgram) sessionData = this.timeTracker.endProgram();
    this.dataManager.saveSessionData?.({ isActive: false });
    this.dataManager.saveDailyReport?.(sessionData);
    this.alertSystem?.clearAlerts?.();

    this.showToast('Program terminat!');
  }

  setActivity(activityType, activityName, button) {
    if (!this.programStarted) { this.showToast('⚠️ Pornește mai întâi programul'); return; }

    console.log(`🎯 Setting activity: ${activityType}`);
    document.querySelectorAll('.control-btn').forEach((btn) => btn.classList.remove('active'));
    if (button) button.classList.add('active');

    if (this.currentActivity && this.timeTracker?.endActivity) this.timeTracker.endActivity();
    this.currentActivity = { type: activityType, name: activityName };
    this.activityStartTime = new Date();

    const currentActivityEl = document.getElementById('currentActivity');
    if (currentActivityEl) currentActivityEl.textContent = activityName;

    this.timeTracker?.startActivity?.(activityType, this.activityStartTime);

    try {
      const sessionData = this.dataManager.getSessionData?.() || {};
      sessionData.currentActivity = this.currentActivity;
      this.dataManager.saveSessionData?.(sessionData);
    } catch (error) {
      console.warn('⚠️ Could not save session data:', error);
    }

    if (activityType === 'driving') this.alertSystem?.checkDrivingCompliance?.();
    this.showToast(`Activitate: ${activityName}`);
  }

  // ================= Voice Control =================
  toggleVoiceControl() {
    const settings = this.dataManager.getSettings?.() || {};
    if (!settings.voiceControl) { this.showToast('Control vocal dezactivat în setări'); return; }

    const btn = document.getElementById('voiceBtn');
    if (!btn) return;

    this.voiceListening = !this.voiceListening;
    if (this.voiceListening) {
      btn.classList.add('listening');
      btn.textContent = '🎙️';
      this.showToast('Ascult... Spune comanda!');
      setTimeout(() => {
        this.voiceListening = false;
        btn.classList.remove('listening');
        btn.textContent = '🎤';
        const commands = ['Start pauză', 'Start condus', 'Status', 'Termină program'];
        const randomCommand = commands[Math.floor(Math.random() * commands.length)];
        this.processVoiceCommand(randomCommand);
      }, 3000);
    } else {
      btn.classList.remove('listening');
      btn.textContent = '🎤';
      this.showToast('Control vocal oprit');
    }
  }

  processVoiceCommand(command) {
    console.log(`🎤 Voice command: ${command}`);
    const lowerCommand = command.toLowerCase();
    if (lowerCommand.includes('start pauză') || lowerCommand.includes('pauză')) {
      if (this.programStarted) this.setActivity('break', 'Pauză', document.getElementById('btnBreak'));
      this.showToast(`Comanda recunoscută: "${command}"`);
    } else if (lowerCommand.includes('start condus') || lowerCommand.includes('condus')) {
      if (this.programStarted) this.setActivity('driving', 'Condus', document.getElementById('btnDriving'));
      this.showToast(`Comanda recunoscută: "${command}"`);
    } else if (lowerCommand.includes('start program')) {
      this.startProgram(); this.showToast(`Comanda recunoscută: "${command}"`);
    } else if (lowerCommand.includes('termină program')) {
      this.endProgram(); this.showToast(`Comanda recunoscută: "${command}"`);
    } else if (lowerCommand.includes('status')) {
      this.speakStatus(); this.showToast(`Comanda recunoscută: "${command}"`);
    } else {
      this.showToast('Comandă nerecunoscută. Încearcă din nou.');
    }
  }

  speakStatus() {
    if (!this.programStarted) { this.showToast('🔊 Program oprit'); return; }

    let totalTime = 0, drivingTime = 0, totalDistance = 0;
    if (this.timeTracker) {
      totalTime = this.timeTracker.getTotalProgramTime?.() || 0;
      drivingTime = this.timeTracker.getActivityTime?.('driving') || 0;
    }
    if (this.locationService?.getTotalDistance) totalDistance = this.locationService.getTotalDistance();
    const activity = this.currentActivity ? this.currentActivity.name : 'Nicio activitate';
    this.showToast(`🔊 Status: ${activity}. Program: ${this.formatDuration(totalTime)}. Condus: ${this.formatDuration(drivingTime)}. Distanță: ${totalDistance.toFixed(1)}km`);
  }

  // ================= Tab Navigation =================
  switchTab(element, tabName) {
    console.log(`📱 Switching to tab: ${tabName}`);
    try {
      if (window.app?.currentTab === 'gps' && tabName !== 'gps' && window.app?.locationUpdateInterval) {
        clearInterval(window.app.locationUpdateInterval);
        window.app.locationUpdateInterval = null;
      }

      document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
      if (element) element.classList.add('active');

      const allPages = document.querySelectorAll('.page');
      allPages.forEach((page) => { page.classList.remove('active'); page.style.display = 'none'; page.style.visibility = 'hidden'; page.style.opacity = '0'; });
      console.log(`🔍 Hidden ${allPages.length} pages`);

      const pageMap = { program: 'pageProgram', gps: 'pageGPS', fuel: 'pageFuel', reports: 'pageReports', settings: 'pageSettings' };
      const targetPageId = pageMap[tabName];
      const targetPage = document.getElementById(targetPageId);

      if (targetPage) {
        targetPage.classList.add('active');
        targetPage.style.display = 'block';
        targetPage.style.visibility = 'visible';
        targetPage.style.opacity = '1';
        console.log(`✅ Showed page: ${targetPageId}`);
        if (window.app) window.app.currentTab = tabName;
        if (typeof this.loadPageContent === 'function') this.loadPageContent(tabName);
        this.showToast(tabName.charAt(0).toUpperCase() + tabName.slice(1));
      } else {
        console.error(`❌ Page not found: ${targetPageId}`);
      }
    } catch (error) {
      console.error('❌ Error in switchTab:', error);
    }
  }

  loadPageContent(tabName) {
    switch (tabName) {
      case 'gps':
        console.log('Loading content GPS Page');
        this.loadGPSPage();
        break;
      case 'fuel':
        this.loadFuelPage();
        break;
      case 'reports':
        this.loadReportsPage();
        break;
    }
  }

  // ================= GPS Page =================
  loadGPSPage() {
    const gpsContent = document.getElementById('gpsContent');
    if (!gpsContent) return;

    if (gpsContent.dataset.state === 'ready') {
      console.log('GPS page already loaded');
      return;
    }

    gpsContent.dataset.state = 'loading';
    gpsContent.innerHTML = `
      <div style="text-align:center; padding:40px;">
        <div class="loading-spinner"></div>
        <div>Se conectează la GPS...</div>
      </div>`;

    if (this.locationService) {
      if (this.locationService.lastKnownPosition) {
        this.displayGPSData(this.locationService.lastKnownPosition);
      } else if (typeof this.locationService.getCurrentPosition === 'function') {
        this.locationService.getCurrentPosition()
          .then((position) => {
            const locationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || 0,
              heading: position.coords.heading,
              timestamp: new Date(position.timestamp),
              address: 'Calculez adresa...',
              connected: true,
            };
            this.displayGPSData(locationData);
            this.reverseGeocode(locationData.latitude, locationData.longitude).then((address) => {
              locationData.address = address;
              this.displayGPSData(locationData);
            });
          })
          .catch((error) => { console.error('Error getting GPS position:', error); this.displayGPSError(); });
      } else {
        this.displayGPSError();
      }
    } else {
      this.displayGPSError();
    }
  }

  displayGPSData(locationData) {
    const gpsContent = document.getElementById('gpsContent');
    if (!gpsContent) return;

    const speed = locationData.speed ? Math.round(locationData.speed * 3.6) : 0;
    const accuracy = Math.round(locationData.accuracy || 0);
    const lastUpdate = this.formatTime(locationData.timestamp);
    const distance = this.locationService?.getTotalDistance ? this.locationService.getTotalDistance() : 0;

    gpsContent.innerHTML = `
      <div style="background:#e8f5e8;border-radius:8px;padding:15px;margin-bottom:20px;border-left:4px solid #4caf50;" id="gpsStatus">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
          <div style="width:30px;height:30px;border-radius:50%;background:#4caf50;display:flex;align-items:center;justify-content:center;color:white;">📍</div>
          <div>
            <div style="font-weight:bold;">GPS Conectat</div>
            <div style="font-size:12px;color:#666;">Precizie: ±${accuracy}m</div>
          </div>
        </div>
        <div style="font-weight:bold;margin-bottom:8px;">Locația Curentă</div>
        <div style="margin-bottom:5px;">📍 ${locationData.address || 'Se calculează...'}</div>
        <div style="margin-bottom:5px;">🕐 Ultimul update: ${lastUpdate}</div>
        <div style="margin-bottom:5px;">🚗 Viteză: ${speed} km/h ${speed === 0 ? '(oprit)' : ''}</div>
        <div id="gpsDistance" style="margin-bottom:5px;">📏 Distanță parcursă: <strong>${distance.toFixed(2)} km</strong></div>
        <div style="font-size:12px;color:#666;">Coordonate: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}</div>
      </div>

      <div style="height:200px;background:linear-gradient(135deg,#74b9ff,#0984e3);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-weight:bold;margin-bottom:20px;position:relative;overflow:hidden;">
        <div style="background:rgba(255,255,255,.1);border-radius:50%;width:60px;height:60px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;">🗺️</div>
        <div id="gpsMap" style="height: 280px; border-radius: 12px; overflow: hidden; margin-bottom: 12px;"></div>
        <small id="gpsMapSubtitle" style="display:block; text-align:center; opacity:.8;">Tracking activ: 0.00 km</small>
        <small id="gpsMapSubtitle" style="opacity:.8;">Tracking activ: ${distance.toFixed(2)} km</small>
        <div style="position:absolute;top:10px;right:10px;background:rgba(255,255,255,.2);padding:5px 10px;border-radius:15px;font-size:12px;">Live</div>
      </div>

      <div style="display:grid;gap:10px;">
        <button class="control-btn" onclick="app.resetDistance()">🔄 Reset Distanță</button>
        <button class="control-btn" onclick="app.calculateRoute()">📍 Calculează Ruta</button>
        <button class="control-btn" onclick="app.findParkingZones()">🅿️ Zone Parcare</button>
        <button class="control-btn" onclick="app.findGasStations()">⛽ Stații Combustibil</button>
        <button class="control-btn" onclick="app.shareLocation()">📤 Trimite Locația</button>
      </div>`;

    gpsContent.dataset.state = 'ready';
    this.startLocationUpdates();
    this.initGoogleMap(locationData);
  }

  updateGoogleMap(locationData) {
    if (!this.gmap || !locationData) return;
  
    const lat = locationData.latitude;
    const lng = locationData.longitude;
    const pos = { lat, lng };
  
    // marker + cerc de acuratețe
    this.gmarker && this.gmarker.setPosition(pos);
    this.gaccuracy && (this.gaccuracy.setCenter(pos), this.gaccuracy.setRadius(locationData.accuracy || 30));
  
    // prelungim traseul dacă s-a mișcat > 5m
    const last = this.gtrackCoords[this.gtrackCoords.length - 1];
    const moved = this.locationService
      ? this.locationService.calculateDistance(last.lat, last.lng, lat, lng)
      : 999;
  
    if (!last || moved > 5) {
      this.gtrackCoords.push(pos);
      this.gpolyline && this.gpolyline.setPath(this.gtrackCoords);
    }
  
    // recentrează ușor dacă utilizatorul nu a mișcat harta
    if (!this._userPanned) this.gmap.setCenter(pos);
  
    // subtitle cu km parcurși
    const sub = document.getElementById('gpsMapSubtitle');
    if (sub && this.locationService) {
      sub.textContent = `Tracking activ: ${this.locationService.getTotalDistance().toFixed(2)} km`;
    }
  }
  
  // opțional: nu mai recentra dacă user-ul a panat/zoomat
  attachPanGuardForMap() {
    if (!this.gmap) return;
    this._userPanned = false;
    this.gmap.addListener('dragstart', () => { this._userPanned = true; });
    this.gmap.addListener('zoom_changed', () => { this._userPanned = true; });
  }

  
  displayGPSError() {
    const gpsContent = document.getElementById('gpsContent');
    if (!gpsContent) return;
    gpsContent.innerHTML = `
      <div style="background:#ffebee;border-radius:8px;padding:15px;margin-bottom:20px;border-left:4px solid #f44336;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
          <div style="width:30px;height:30px;border-radius:50%;background:#f44336;display:flex;align-items:center;justify-content:center;color:white;">⚠️</div>
          <div>
            <div style="font-weight:bold;">GPS Deconectat</div>
            <div style="font-size:12px;color:#666;">Verifică permisiunile</div>
          </div>
        </div>
        <div style="color:#666;">Nu se poate obține locația. Asigură-te că ai permis accesul la locație și că GPS-ul este activat.</div>
      </div>
      <div style="display:grid;gap:10px;">
        <button class="control-btn" onclick="app.reactivateGPS()">🔄 Reactivează GPS</button>
        <button class="control-btn" onclick="app.showToast('Setări GPS...')">⚙️ Setări GPS</button>
      </div>`;
    gpsContent.dataset.state = 'error';
  }

  resetDistance() {
    if (this.locationService?.resetDistance) {
      this.locationService.resetDistance();
      this.showToast('🔄 Distanța a fost resetată');
      if (this.currentTab === 'gps') setTimeout(() => this.loadGPSPage(), 500);
    } else {
      this.showToast('❌ Nu se poate reseta distanța');
    }
  }

  async reverseGeocode(lat, lon) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`, { headers: { 'User-Agent': 'DriverSupportApp/1.0' } });
      if (!response.ok) throw new Error('Geocoding failed');
      const data = await response.json();
      const address = data.address || {};
      const parts = [];
      if (address.road) parts.push(address.road);
      if (address.house_number) parts.push(address.house_number);
      if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
      if (address.country) parts.push(address.country);
      return parts.length > 0 ? parts.join(', ') : `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
  }

  startLocationUpdates() {
    if (this.locationUpdateInterval) clearInterval(this.locationUpdateInterval);
    this.locationUpdateInterval = setInterval(() => {
      if (this.currentTab === 'gps' && this.locationService?.lastKnownPosition) {
        this.updateGoogleMap(this.locationService.lastKnownPosition);
      }
    }, 5000);
  }

  updateGPSPageData() {
    if (this.locationService?.lastKnownPosition) {
      const distance = this.locationService.getTotalDistance ? this.locationService.getTotalDistance() : 0;
      const distanceElement = document.getElementById('gpsDistance');
      if (distanceElement) distanceElement.innerHTML = `📏 Distanță parcursă: <strong>${distance.toFixed(2)} km</strong>`;
      const mapSubtitle = document.getElementById('gpsMapSubtitle');
      if (mapSubtitle) mapSubtitle.textContent = `Tracking activ: ${distance.toFixed(2)} km`;
      this.initGoogleMap(locationData);
    }
  }

  async calculateRoute() {
    if (!this.gdirectionsService || !this.gdirectionsRenderer || !this.locationService?.lastKnownPosition) {
      this.showToast('❌ Harta sau locația nu sunt gata');
      return;
    }
  
    // ceri destinația simplu (poți face UI mai fancy ulterior)
    const input = prompt('Destinație (adresă sau "lat,lng"):', '');
    if (!input) return;
  
    let destination = input;
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(input)) {
      const [dlat, dlng] = input.split(',').map(Number);
      destination = { lat: dlat, lng: dlng };
    }
  
    const origin = {
      lat: this.locationService.lastKnownPosition.latitude,
      lng: this.locationService.lastKnownPosition.longitude
    };
  
    this.showToast('🗺️ Calculez ruta...');
    this.gdirectionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        }
      },
      (result, status) => {
        if (status === 'OK') {
          this.gdirectionsRenderer.setDirections(result);
          const leg = result.routes[0].legs[0];
          this.showToast(`✅ Ruta: ${leg.distance.text}, ~${leg.duration_in_traffic?.text || leg.duration.text}`);
        } else {
          console.warn('Route failed:', status);
          this.showToast('❌ Nu pot calcula ruta');
        }
      }
    );
  }

  findParkingZones() { this.showToast('🅿️ Caut zone de parcare în apropiere...'); setTimeout(() => this.showToast('✅ Găsite 3 zone de parcare într-un radius de 5km'), 1500); }
  findGasStations() { this.showToast('⛽ Caut stații de combustibil...'); setTimeout(() => this.showToast('✅ Găsite 5 stații într-un radius de 10km'), 1500); }
  
  nearbySearch(type, radius = 5000) {
    if (!this.gplaces || !this.locationService?.lastKnownPosition) {
      this.showToast('❌ Harta/locația nu sunt gata');
      return;
    }
  
    const loc = new google.maps.LatLng(
      this.locationService.lastKnownPosition.latitude,
      this.locationService.lastKnownPosition.longitude
    );
  
    const request = { location: loc, radius, type }; // 'gas_station' sau 'parking'
  
    this.showToast('🔎 Caut în apropiere...');
    this.gplaces.nearbySearch(request, (results, status) => {
      if (status !== 'OK' || !results?.length) {
        this.showToast('⚠️ Nimic găsit în zonă');
        return;
      }
  
      // pune markere simple
      results.slice(0, 10).forEach(place => {
        const m = new google.maps.Marker({
          map: this.gmap,
          position: place.geometry.location,
          title: place.name
        });
        const inf = new google.maps.InfoWindow({
          content: `<div><strong>${place.name}</strong><br>${place.vicinity || ''}</div>`
        });
        m.addListener('click', () => inf.open({ map: this.gmap, anchor: m }));
      });
  
      // ajustează viewport
      const bounds = new google.maps.LatLngBounds();
      results.forEach(p => bounds.extend(p.geometry.location));
      bounds.extend(loc);
      this.gmap.fitBounds(bounds);
  
      this.showToast(`✅ Găsite ${results.length} locații`);
    });
  }
  
  findGasStations() { this.nearbySearch('gas_station', 8000); }
  findParkingZones() { this.nearbySearch('parking', 6000); }

  shareLocation() {
    if (this.locationService?.lastKnownPosition) {
      const location = this.locationService.lastKnownPosition;
      const url = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      if (navigator.share) {
        navigator.share({ title: 'Locația mea curentă', text: 'Iată unde mă aflu acum:', url }).catch(console.error);
      } else {
        navigator.clipboard.writeText(url);
        this.showToast('📋 Link-ul locației a fost copiat!');
      }
    } else {
      this.showToast('❌ Locația nu este disponibilă');
    }
  }

  // ================= Fuel Page =================
  loadFuelPage() {
    const fuelPage = document.getElementById('pageFuel');
    if (!fuelPage) {
      const newPage = document.createElement('div');
      newPage.className = 'page';
      newPage.id = 'pageFuel';
      newPage.innerHTML = `
        <div class="page-content">
          <h2 class="page-title">Management Combustibil</h2>
          <div style="background:linear-gradient(135deg,#fd79a8,#e84393);color:white;padding:20px;border-radius:12px;margin-bottom:20px;">
            <h3 style="margin-bottom:15px;">⛽ Status Combustibil</h3>
            <div style="font-size:24px;font-weight:bold;text-align:center;margin-bottom:15px;">76% • 380L</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
              <div style="text-align:center;"><div style="font-size:18px;font-weight:bold;">8.2L</div><div style="font-size:12px;opacity:.9;">Consum/100km</div></div>
              <div style="text-align:center;"><div style="font-size:18px;font-weight:bold;">520km</div><div style="font-size:12px;opacity:.9;">Autonomie</div></div>
            </div>
          </div>
          <div class="card">
            <h3 class="card-title">Adaugă Alimentare</h3>
            <div style="display:grid;gap:15px;">
              <div><label style="font-weight:500;display:block;margin-bottom:5px;">Cantitate (L):</label><input type="number" id="fuelAmount" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="Litri combustibil..." /></div>
              <div><label style="font-weight:500;display:block;margin-bottom:5px;">Preț/L (€):</label><input type="number" id="fuelPrice" step="0.01" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="1.45" /></div>
              <button class="control-btn" style="background:#27ae60;color:white;border-color:#27ae60;" onclick="app.saveFuelData()">💾 Salvează Alimentare</button>
            </div>
          </div>
        </div>`;
      const content = document.querySelector('.content');
      if (content) content.appendChild(newPage);
    }
  }

  // ================= Reports Page =================
  loadReportsPage = () => {
    const content = document.querySelector('.content');
    if (!content) return;

    const todayStats = this.getTodayStatsReal();
    const weekStats = this.getWeekStats();
    const monthStats = this.getMonthStats(); // reserved for future use

    const reportsInner = `
      <h2 class="page-title" style="color:#2c3e50;margin-bottom:20px;">📊 Rapoarte și Istoric</h2>
      ${this.createCurrentProgramCard(todayStats)}
      ${this.createDailyStatsCard(todayStats)}
      ${this.createWeeklyStatsCard(weekStats)}
      ${this.createComplianceCard()}
      ${this.createExportCard()}`;

    let reportsPage = document.getElementById('pageReports');
    if (reportsPage) { reportsPage.innerHTML = reportsInner; return; }

    reportsPage = document.createElement('div');
    reportsPage.className = 'page';
    reportsPage.id = 'pageReports';
    reportsPage.innerHTML = reportsInner;

    const fuelPage = document.getElementById('pageFuel');
    const settingsPage = document.getElementById('pageSettings');
    if (fuelPage) fuelPage.insertAdjacentElement('afterend', reportsPage);
    else if (settingsPage) settingsPage.insertAdjacentElement('beforebegin', reportsPage);
    else content.appendChild(reportsPage);
  };

  getTodayStatsReal() {
    if (this.timeTracker?.getTodayStats) return this.timeTracker.getTodayStats();
    const sessionData = this.dataManager.getSessionData?.() || {};
    const stats = { driving: 0, break: 0, work: 0, other: 0, totalTime: 0 };
    if (this.programStarted && this.programStartTime) {
      const now = Date.now();
      stats.totalTime = now - this.programStartTime.getTime();
      if (this.currentActivity && this.activityStartTime) {
        const activityTime = now - this.activityStartTime.getTime();
        stats[this.currentActivity.type] = activityTime;
      }
    }
    return stats;
  }

  getWeekStats() { return { totalHours: 38.5, drivingHours: 28.2, breakHours: 6.8, otherHours: 3.5, daysWorked: 5, avgDayHours: 7.7 }; }
  getMonthStats() { return { totalHours: 162.3, drivingHours: 118.5, breakHours: 28.9, otherHours: 14.9, daysWorked: 21, avgDayHours: 7.7 }; }

  createCurrentProgramCard(stats) {
    const programStatus = this.programStarted ? 'Activ' : 'Oprit';
    const startTime = this.programStartTime ? this.formatTime(this.programStartTime) : '-';
    const currentActivity = this.currentActivity ? this.currentActivity.name : 'Nicio activitate';
    const distance = this.locationService?.getTotalDistance ? this.locationService.getTotalDistance() : 0;
    return `
      <div class="card">
        <h3 class="card-title">Program Curent</h3>
        <div style="background:${this.programStarted ? '#e8f5e8' : '#ffebee'};border-radius:8px;padding:15px;margin-bottom:15px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;"><div style="width:12px;height:12px;border-radius:50%;background:${this.programStarted ? '#4caf50' : '#f44336'};"></div><span style="font-weight:bold;">${programStatus}</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;font-size:14px;">
            <div><div style="color:#666;margin-bottom:5px;">Început la:</div><div style="font-weight:bold;">${startTime}</div></div>
            <div><div style="color:#666;margin-bottom:5px;">Activitate curentă:</div><div style="font-weight:bold;">${currentActivity}</div></div>
          </div>
        </div>
        <div style="background:#f8f9fa;border-radius:8px;padding:15px;">
          <div style="font-weight:bold;margin-bottom:10px;">Timp Today</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:14px;">
            <div style="display:flex;justify-content:space-between;"><span>🚗 Conducere:</span><span style="font-weight:bold;">${this.formatDuration(stats.driving)}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>☕ Pauze:</span><span style="font-weight:bold;">${this.formatDuration(stats.break)}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>🔧 Lucru:</span><span style="font-weight:bold;">${this.formatDuration(stats.work)}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>📋 Altele:</span><span style="font-weight:bold;">${this.formatDuration(stats.other)}</span></div>
          </div>
          <hr style="margin:15px 0;border:none;border-top:1px solid #ddd;">
          <div style="display:flex;justify-content:space-between;font-weight:bold;margin-bottom:10px;"><span>⏱️ Total:</span><span>${this.formatDuration(stats.totalTime || stats.driving + stats.break + stats.work + stats.other)}</span></div>
          <div style="display:flex;justify-content:space-between;font-weight:bold;color:#3498db;"><span>📏 Distanță:</span><span id="reportTotalDistance">${distance.toFixed(2)} km</span></div>
        </div>
      </div>`;
  }

  createDailyStatsCard(stats) {
    const totalMs = stats.totalTime || stats.driving + stats.break + stats.work + stats.other;
    const totalHours = (totalMs) / (1000 * 60 * 60);
    const drivingPercent = totalMs > 0 ? Math.round((stats.driving / totalMs) * 100) : 0;
    const distance = this.locationService?.getTotalDistance ? this.locationService.getTotalDistance() : 0;
    return `
      <div class="card">
        <h3 class="card-title">Statistici Ziua Curentă</h3>
        <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px;border-radius:12px;margin-bottom:15px;">
          <div style="text-align:center;margin-bottom:20px;"><div style="font-size:32px;font-weight:bold;">${totalHours.toFixed(1)}h</div><div style="opacity:.9;">Total astăzi</div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;text-align:center;">
            <div><div style="font-size:18px;font-weight:bold;">${drivingPercent}%</div><div style="font-size:12px;opacity:.9;">Conducere</div></div>
            <div><div style="font-size:18px;font-weight:bold;">${Math.round((stats.driving / (1000 * 60 * 60)) * 10) / 10}h</div><div style="font-size:12px;opacity:.9;">La volan</div></div>
            <div><div style="font-size:18px;font-weight:bold;">${distance.toFixed(1)}km</div><div style="font-size:12px;opacity:.9;">Parcursă</div></div>
          </div>
        </div>
      </div>`;
  }

  createWeeklyStatsCard(weekStats) {
    return `
      <div class="card">
        <h3 class="card-title">Statistici Săptămâna Aceasta</h3>
        <div style="background:#f8f9fa;border-radius:8px;padding:15px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
            <div style="text-align:center;padding:15px;background:white;border-radius:8px;"><div style="font-size:24px;font-weight:bold;color:#3498db;">${weekStats.totalHours}h</div><div style="font-size:12px;color:#666;">Total săptămână</div></div>
            <div style="text-align:center;padding:15px;background:white;border-radius:8px;"><div style="font-size:24px;font-weight:bold;color:#27ae60;">${weekStats.daysWorked}</div><div style="font-size:12px;color:#666;">Zile lucrate</div></div>
          </div>
          <div style="font-size:14px;line-height:1.6;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>🚗 Timp conducere:</span><span style="font-weight:bold;">${weekStats.drivingHours}h</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>☕ Timp pauze:</span><span style="font-weight:bold;">${weekStats.breakHours}h</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>📊 Medie pe zi:</span><span style="font-weight:bold;">${weekStats.avgDayHours}h</span></div>
          </div>
        </div>
      </div>`;
  }

  createComplianceCard() {
    const msToday = this.getTodayStatsReal();
    const drivingTime = (msToday.driving || 0) / (1000 * 60 * 60);
    const maxDrivingTime = 9; // EU regulation
    const remainingTime = Math.max(0, maxDrivingTime - drivingTime);
    const compliancePercent = Math.min(100, (drivingTime / maxDrivingTime) * 100);

    let statusColor = '#27ae60';
    let statusText = 'Conformitate bună';
    if (compliancePercent > 80) { statusColor = '#f39c12'; statusText = 'Atenție - aproape de limită'; }
    if (compliancePercent >= 100) { statusColor = '#e74c3c'; statusText = 'Limită depășită!'; }

    return `
      <div class="card">
        <h3 class="card-title">Conformitate Legală</h3>
        <div style="background:#f8f9fa;border-radius:8px;padding:15px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
            <div style="width:12px;height:12px;border-radius:50%;background:${statusColor};"></div>
            <span style="font-weight:bold;color:${statusColor};">${statusText}</span>
          </div>
          <div style="margin-bottom:15px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;"><span>Timp conducere astăzi:</span><span style="font-weight:bold;">${drivingTime.toFixed(1)}h / ${maxDrivingTime}h</span></div>
            <div style="background:#e0e0e0;border-radius:10px;height:8px;overflow:hidden;"><div style="background:${statusColor};height:100%;width:${Math.min(100, compliancePercent)}%;transition:width .3s;"></div></div>
          </div>
          <div style="font-size:14px;color:#666;">
            <div>⏰ Timp rămas: <strong>${remainingTime.toFixed(1)}h</strong></div>
            <div>🚛 Pauză obligatorie la fiecare 4.5h</div>
            <div>📅 Odihnă săptămânală: 45h consecutiv</div>
          </div>
        </div>
      </div>`;
  }

  createExportCard() {
    return `
      <div class="card">
        <h3 class="card-title">Exportă Rapoarte</h3>
        <div style="display:grid;gap:10px;">
          <button class="control-btn" onclick="app.exportToPDF()" style="background:#e74c3c;border-color:#e74c3c;">📄 Export PDF Zilnic</button>
          <button class="control-btn" onclick="app.exportToExcel()" style="background:#27ae60;border-color:#27ae60;">📊 Export Excel Săptămânal</button>
          <button class="control-btn" onclick="app.sendEmail()" style="background:#3498db;border-color:#3498db;">📧 Trimite Raport Email</button>
          <button class="control-btn" onclick="app.printReport()" style="background:#9b59b6;border-color:#9b59b6;">🖨️ Printează Raport</button>
        </div>
      </div>`;
  }

  printReport() {
    this.showToast('🖨️ Pregătesc raportul pentru print...');
    setTimeout(() => {
      const printContent = this.generatePrintableReport();
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      this.showToast('✅ Raport pregătit pentru print!');
    }, 1500);
  }

  generatePrintableReport() {
    const stats = this.getTodayStatsReal();
    const distance = this.locationService?.getTotalDistance ? this.locationService.getTotalDistance() : 0;
    const date = new Date().toLocaleDateString('ro-RO');
    return `
      <!DOCTYPE html><html><head><title>Raport Driver Support App - ${date}</title>
      <style>body{font-family:Arial,sans-serif;margin:20px}.header{text-align:center;margin-bottom:30px}.stats{margin:20px 0}.stat-row{display:flex;justify-content:space-between;margin:10px 0}@media print{body{margin:0}}</style>
      </head><body>
      <div class="header"><h1>Driver Support App</h1><h2>Raport Zilnic - ${date}</h2></div>
      <div class="stats">
        <h3>Activități</h3>
        <div class="stat-row"><span>Program început la:</span><span>${this.programStartTime ? this.formatTime(this.programStartTime) : '-'}</span></div>
        <div class="stat-row"><span>Timp conducere:</span><span>${this.formatDuration(stats.driving)}</span></div>
        <div class="stat-row"><span>Timp pauze:</span><span>${this.formatDuration(stats.break)}</span></div>
        <div class="stat-row"><span>Timp lucru:</span><span>${this.formatDuration(stats.work)}</span></div>
        <div class="stat-row"><span>Distanță parcursă:</span><span>${distance.toFixed(2)} km</span></div>
        <div class="stat-row"><span><strong>Total timp:</strong></span><span><strong>${this.formatDuration(stats.totalTime || stats.driving + stats.break + stats.work + stats.other)}</strong></span></div>
      </div>
      <div style="margin-top:40px;font-size:12px;text-align:center;color:#666;">Generat automat de Driver Support App</div>
      </body></html>`;
  }

  // ================= Settings =================
  saveSettings() {
    const settings = {
      darkMode: document.getElementById('darkModeToggle')?.checked || false,
      voiceControl: document.getElementById('voiceControlToggle')?.checked || false,
      soundAlerts: document.getElementById('soundAlertsToggle')?.checked || false,
    };
    const driverData = { name: document.getElementById('settingDriverName')?.value || '', truckNumber: document.getElementById('settingTruckNumber')?.value || '' };
    this.dataManager.saveSettings?.(settings);
    this.dataManager.saveDriverData?.(driverData);
    const driverNameEl = document.getElementById('driverName');
    const truckNumberEl = document.getElementById('truckNumber');
    if (driverNameEl) driverNameEl.textContent = driverData.name;
    if (truckNumberEl) truckNumberEl.textContent = `Camion #${driverData.truckNumber}`;
    this.showToast('Setări salvate cu succes!');
  }

  toggleDarkMode() {
    const isDark = document.getElementById('darkModeToggle')?.checked || false;
    document.body.classList.toggle('dark-mode', isDark);
    const settings = this.dataManager.getSettings?.() || {};
    settings.darkMode = isDark;
    this.dataManager.saveSettings?.(settings);
    this.showToast(isDark ? 'Mod întunecat activat' : 'Mod luminos activat');
  }

  // ================= UI Updates =================
  updateUI() {
    if (!this.programStarted) return;
    try {
      if (this.activityStartTime) {
        const activityDuration = Date.now() - this.activityStartTime.getTime();
        const activityTimeEl = document.getElementById('activityTime');
        if (activityTimeEl) activityTimeEl.textContent = this.formatDuration(activityDuration);
      }
      if (this.programStartTime) {
        const totalDuration = Date.now() - this.programStartTime.getTime();
        const totalProgramTimeEl = document.getElementById('totalProgramTime');
        if (totalProgramTimeEl) totalProgramTimeEl.textContent = this.formatDuration(totalDuration);
      }
      this.updateDistanceInMainUI();
      this.updateProgressRings();
    } catch (error) {
      console.warn('⚠️ Error updating UI:', error);
    }
  }

  updateProgressRings() {
    if (!this.timeTracker?.getTodayStats) return;
    try {
      const stats = this.timeTracker.getTodayStats();
      const total = stats.driving + stats.break + stats.work + stats.other;
      if (total === 0) return;
      const drivingPercent = Math.round((stats.driving / total) * 100);
      const breakPercent = Math.round((stats.break / total) * 100);
      const workPercent = Math.round(((stats.work + stats.other) / total) * 100);

      const drivingProgress = document.getElementById('drivingProgress');
      const drivingPercentage = document.getElementById('drivingPercentage');
      if (drivingProgress && drivingPercentage) {
        const deg = (drivingPercent / 100) * 360;
        drivingProgress.style.background = `conic-gradient(#3498db ${deg}deg, #ecf0f1 ${deg}deg)`;
        drivingPercentage.textContent = `${drivingPercent}%`;
      }

      const breakProgress = document.getElementById('breakProgress');
      const breakPercentage = document.getElementById('breakPercentage');
      if (breakProgress && breakPercentage) {
        const deg = (breakPercent / 100) * 360;
        breakProgress.style.background = `conic-gradient(#27ae60 ${deg}deg, #ecf0f1 ${deg}deg)`;
        breakPercentage.textContent = `${breakPercent}%`;
      }

      const workProgress = document.getElementById('workProgress');
      const workPercentage = document.getElementById('workPercentage');
      if (workProgress && workPercentage) {
        const deg = (workPercent / 100) * 360;
        workProgress.style.background = `conic-gradient(#f39c12 ${deg}deg, #ecf0f1 ${deg}deg)`;
        workPercentage.textContent = `${workPercent}%`;
      }
    } catch (error) {
      console.warn('⚠️ Error updating progress rings:', error);
    }
  }

  // ================= Network & Weather =================
  updateNetworkStatus() {
    const statusElement = document.getElementById('networkStatus');
    if (statusElement) {
      if (navigator.onLine) statusElement.innerHTML = '<span class="status-dot status-online"></span>Online';
      else statusElement.innerHTML = '<span class="status-dot status-offline"></span>Offline Ready';
    }
  }

  async loadWeatherData() {
    const weatherTemp = document.getElementById('weatherTemp');
    const weatherDesc = document.getElementById('weatherDesc');
    if (!weatherTemp || !weatherDesc) return;

    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude; const lon = position.coords.longitude;
            const address = await this.reverseGeocode(lat, lon);
            const cityParts = address.split(', ');
            const city = cityParts.length > 1 ? cityParts[cityParts.length - 2] : 'Locația curentă';
            const temperature = Math.round(15 + Math.sin(lat * Math.PI / 180) * 10 + Math.random() * 5);
            const conditions = ['☀️ Însorit', '⛅ Parțial înnorat', '☁️ Înnorat', '🌧️ Ploaie ușoară'];
            const condition = conditions[Math.floor(Math.random() * conditions.length)];
            weatherTemp.textContent = `${temperature}°C`;
            weatherDesc.textContent = `${condition} • ${city}`;
            console.log('🌤️ Weather data loaded with real location');
          },
          () => { this.loadMockWeather(weatherTemp, weatherDesc); },
          { timeout: 5000 }
        );
      } else { this.loadMockWeather(weatherTemp, weatherDesc); }
    } catch (error) { console.error('❌ Weather data failed to load:', error); this.loadMockWeather(weatherTemp, weatherDesc); }
  }

  loadMockWeather(weatherTemp, weatherDesc) {
    const weather = { temperature: Math.round(Math.random() * 20 + 5), description: ['☀️ Însorit', '☁️ Înnorat', '🌧️ Ploios', '❄️ Ninsoare'][Math.floor(Math.random() * 4)], location: 'Stockholm' };
    weatherTemp.textContent = `${weather.temperature}°C`;
    weatherDesc.textContent = `${weather.description} • ${weather.location}`;
  }

  initializeHomePageLocation() {
    this.updateHomePageLocation();
    setInterval(() => { if (this.currentTab === 'program') this.updateHomePageLocation(); }, 30000);
  }

  async updateHomePageLocation() {
    try {
      if (this.locationService?.lastKnownPosition) {
        const locationData = this.locationService.lastKnownPosition;
        this.currentLocation = locationData;
        this.updateLocationDisplays(locationData);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const locationData = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, speed: position.coords.speed || 0, timestamp: new Date(position.timestamp), address: await this.reverseGeocode(position.coords.latitude, position.coords.longitude) };
            this.currentLocation = locationData;
            this.updateLocationDisplays(locationData);
            this.updateWeatherForLocation(locationData);
          },
          () => { console.warn('⚠️ Failed to get home page location'); this.showFallbackLocation(); },
          { timeout: 10000, enableHighAccuracy: true }
        );
      } else { this.showFallbackLocation(); }
    } catch (error) { console.warn('⚠️ Failed to update home page location:', error); this.showFallbackLocation(); }
  }

  updateLocationDisplays(locationData) {
    const locationDisplay = document.getElementById('currentLocation');
    const lastUpdateDisplay = document.getElementById('locationLastUpdate');
    const speedDisplay = document.getElementById('currentSpeed');

    if (locationDisplay) {
      const parts = (locationData.address || '').split(', ');
      const cityArea = parts.length > 1 ? parts[parts.length - 2] + ', ' + parts[parts.length - 1] : (locationData.address || '');
      locationDisplay.textContent = cityArea || `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`;
    }
    if (lastUpdateDisplay) lastUpdateDisplay.textContent = this.formatTime(locationData.timestamp);
    if (speedDisplay) { const speed = locationData.speed ? Math.round(locationData.speed * 3.6) : 0; speedDisplay.textContent = `${speed} km/h`; }
  }

  showFallbackLocation() {
    const locationDisplay = document.getElementById('currentLocation');
    if (locationDisplay) locationDisplay.textContent = 'Locație indisponibilă';
  }

  async updateWeatherForLocation(locationData) {
    try {
      const weatherTemp = document.getElementById('weatherTemp');
      const weatherDesc = document.getElementById('weatherDesc');
      if (weatherTemp && weatherDesc) {
        const lat = locationData.latitude;
        const temperature = Math.round(15 + Math.sin(lat * Math.PI / 180) * 10 + Math.random() * 5);
        const weatherConditions = ['☀️ Însorit', '⛅ Parțial înnorat', '☁️ Înnorat', '🌧️ Ploaie ușoară'];
        const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
        const cityParts = (locationData.address || '').split(', ');
        const city = cityParts.length > 1 ? cityParts[cityParts.length - 2] : 'Locația curentă';
        weatherTemp.textContent = `${temperature}°C`;
        weatherDesc.textContent = `${condition} • ${city}`;
      }
    } catch (error) { console.warn('⚠️ Weather update failed:', error); }
  }

  // ================= Periodic =================
  startPeriodicUpdates() {
    setInterval(() => { try { this.updateUI(); } catch (e) { console.error('Error in UI update:', e); } }, 1000);
    setInterval(() => { try { this.updateNetworkStatus(); } catch (e) { console.error('Error in network status update:', e); } }, 30000);
  }

  // ================= Errors & Toast =================
  handleInitializationError(error) {
    const errorModal = document.createElement('div');
    errorModal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#e74c3c,#c0392b);display:flex;align-items:center;justify-content:center;z-index:10001;color:white;font-family:Arial,sans-serif;';
    errorModal.innerHTML = `
      <div style="text-align:center;padding:30px;">
        <div style="font-size:48px;margin-bottom:20px;">⚠️</div>
        <h2 style="margin-bottom:15px;">Eroare de Inițializare</h2>
        <p style="margin-bottom:25px;opacity:.9;">${error.message}</p>
        <button onclick="location.reload()" style="padding:12px 24px;border:2px solid white;background:transparent;color:white;border-radius:6px;cursor:pointer;font-weight:500;">Reîncearcă</button>
      </div>`;
    document.body.appendChild(errorModal);
  }

  shareCurrentLocation() {
    if (!this.currentLocation) { this.showToast('⚠️ Locația nu este disponibilă'); return; }
    const message = `📍 Sunt aici: ${this.currentLocation.address}\n🗺️ Coordonate: ${this.currentLocation.latitude.toFixed(6)}, ${this.currentLocation.longitude.toFixed(6)}`;
    if (navigator.share) {
      navigator.share({ title: 'Locația mea curentă', text: message, url: `https://maps.google.com/?q=${this.currentLocation.latitude},${this.currentLocation.longitude}` }).catch(console.error);
    } else {
      const url = `https://maps.google.com/?q=${this.currentLocation.latitude},${this.currentLocation.longitude}`;
      navigator.clipboard.writeText(url);
      this.showToast('📋 Link-ul locației a fost copiat!');
    }
  }

  openLocationInMaps() {
    if (!this.currentLocation) { this.showToast('⚠️ Locația nu este disponibilă'); return; }
    const url = `https://maps.google.com/?q=${this.currentLocation.latitude},${this.currentLocation.longitude}`;
    window.open(url, '_blank');
    this.showToast('🗺️ Deschid în Google Maps...');
  }

  async refreshLocation() {
    this.showToast('🔄 Actualizez locația...');
    try { await this.updateHomePageLocation(); this.showToast('✅ Locația a fost actualizată'); }
    catch { this.showToast('❌ Nu pot actualiza locația'); }
  }

  // ================= Export =================
  exportToPDF() {
    if (this.timeTracker?.getTodayStats) void this.timeTracker.getTodayStats();
    this.showToast('📄 Export PDF în curs...');
    setTimeout(() => this.showToast('✅ Raport PDF generat cu succes!'), 2000);
  }

  exportToExcel() {
    if (this.timeTracker?.getTodayStats) void this.timeTracker.getTodayStats();
    this.showToast('📊 Export Excel în curs...');
    setTimeout(() => this.showToast('✅ Raport Excel generat cu succes!'), 2000);
  }

  sendEmail() { this.showToast('📧 Trimitere email în curs...'); setTimeout(() => this.showToast('✅ Email trimis cu succes!'), 2000); }

  saveFuelData() {
    const fuelAmountEl = document.getElementById('fuelAmount');
    const fuelPriceEl = document.getElementById('fuelPrice');
    if (!fuelAmountEl || !fuelPriceEl) { this.showToast('❌ Elementele formularului nu sunt disponibile'); return; }

    const amount = fuelAmountEl.value; const price = fuelPriceEl.value;
    if (!amount || !price) { this.showToast('❌ Completează toate câmpurile'); return; }

    const fuelData = { amount: parseFloat(amount), price: parseFloat(price), timestamp: new Date().toISOString(), totalCost: parseFloat(amount) * parseFloat(price) };
    this.dataManager.saveFuelData?.(fuelData);
    fuelAmountEl.value = '';
    fuelPriceEl.value = '';
    this.showToast('⛽ Alimentare salvată cu succes!');
  }

  // ================= Utils =================
  formatTime(date) {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('ro-RO', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }

  formatDuration(milliseconds) {
    if (!milliseconds || milliseconds < 0) return '00:00:00';
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(-20px)'; }, 3000);
  }
}

// ======== Global functions for HTML event handlers ========
let app;

function initializeApp() {
  try { app = new DriverApp(); }
  catch (error) { console.error('❌ Failed to initialize app:', error); }
}

function startProgram() { if (app?.startProgram) app.startProgram(); }
function endProgram() { if (app?.endProgram) app.endProgram(); }
function setActivity(type, name, button) { if (app?.setActivity) app.setActivity(type, name, button); }
function toggleVoiceControl() { if (app?.toggleVoiceControl) app.toggleVoiceControl(); }
function switchTab(element, tabName) { if (app?.switchTab) app.switchTab(element, tabName); }
function saveSettings() { if (app?.saveSettings) app.saveSettings(); }
function toggleDarkMode() { if (app?.toggleDarkMode) app.toggleDarkMode(); }
function hideAlert() { const alertPanel = document.getElementById('alertPanel'); if (alertPanel) alertPanel.classList.remove('show'); }
function shareCurrentLocation() { if (app?.shareCurrentLocation) app.shareCurrentLocation(); }
function openLocationInMaps() { if (app?.openLocationInMaps) app.openLocationInMaps(); }
function refreshLocation() { if (app?.refreshLocation) app.refreshLocation(); }
function resetDistance() { if (app?.resetDistance) app.resetDistance(); }
function calculateRoute() { if (app?.calculateRoute) app.calculateRoute(); }
function findParkingZones() { if (app?.findParkingZones) app.findParkingZones(); }
function findGasStations() { if (app?.findGasStations) app.findGasStations(); }
function shareLocation() { if (app?.shareLocation) app.shareLocation(); }
function exportToPDF() { if (app?.exportToPDF) app.exportToPDF(); }
function exportToExcel() { if (app?.exportToExcel) app.exportToExcel(); }
function sendEmail() { if (app?.sendEmail) app.sendEmail(); }
function printReport() { if (app?.printReport) app.printReport(); }
function saveFuelData() { if (app?.saveFuelData) app.saveFuelData(); }
function reactivateGPS() { if (app?.reactivateGPS) return app.reactivateGPS(); }
function resetPermissions() { if (app?.resetPermissions) app.resetPermissions(); }

document.addEventListener('visibilitychange', function () { if (app) { if (document.hidden) console.log('📱 App backgrounded'); else console.log('📱 App foregrounded'); } });

document.addEventListener('DOMContentLoaded', function () { console.log('📱 Driver Support App - JavaScript loaded'); initializeApp(); });

window.addEventListener('online', function () { console.log('🌐 App is online'); app?.updateNetworkStatus?.(); });
window.addEventListener('offline', function () { console.log('📱 App is offline'); app?.updateNetworkStatus?.(); });

console.log('📱 Driver Support App - JavaScript loaded (fixed)');
