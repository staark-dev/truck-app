// Driver Support App - Main Application Logic (Fixed Version)
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
        
        // Initialize components with error handling
        try {
            this.dataManager = new DataManager();
            this.timeTracker = new TimeTracker();
            this.locationService = new LocationService();
            this.alertSystem = new AlertSystem();
            
            this.initializeApp();
        } catch (error) {
            console.error('❌ Failed to initialize components:', error);
            this.handleInitializationError(error);
        }
    }

    async initializeApp() {
        console.log('🚛 Driver Support App initializing...');
        
        try {
            // Show loading screen briefly
            this.showLoadingScreen();
            
            // Fast initialization - parallel operations
            await this.fastInitialize();
            
            // Hide loading screen quickly (max 2 seconds)
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ App initialized successfully');
            
            // Continue with background initialization (non-blocking)
            this.backgroundInitialize();
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    async fastInitialize() {
        // Essential initialization only (fast path)
        this.updateLoadingProgress(20, 'Inițializez componentele...');
        
        // Initialize core components quickly
        await this.initializeComponents();
        
        this.updateLoadingProgress(50, 'Încarc datele salvate...');
        
        // Load saved data (fast, local storage)
        this.loadSavedData();
        
        this.updateLoadingProgress(80, 'Finalizez...');
        
        // Basic setup
        this.setupEventListeners();
        this.updateNetworkStatus();
        
        this.updateLoadingProgress(100, 'Gata!');
        
        // Small delay for smooth UX
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    async backgroundInitialize() {
        // Background initialization (non-blocking, after app is shown)
        console.log('🔄 Starting background initialization...');
        
        try {
            // Request permissions in background (non-blocking)
            this.requestPermissionsInBackground();
            
            // Initialize location services
            this.initializeLocationServices();
            
            // Load weather data
            this.loadWeatherData();
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            console.log('✅ Background initialization complete');
        } catch (error) {
            console.warn('⚠️ Background initialization issues:', error);
        }
    }

    async requestPermissionsInBackground() {
        // Request permissions without blocking the UI
        const permissionsState = this.getPermissionsState();
        
        // Only request if not already handled and user interacted
        setTimeout(() => {
            if (!permissionsState.location.asked) {
                this.requestLocationPermission();
            }
        }, 1000);
        
        setTimeout(() => {
            if (!permissionsState.notifications.asked) {
                this.requestNotificationPermission();
            }
        }, 2000);
        
        setTimeout(() => {
            if (!permissionsState.microphone.asked) {
                this.requestMicrophonePermission();
            }
        }, 3000);
    }

    initializeLocationServices() {
        // Initialize location in background
        setTimeout(() => {
            this.initializeHomePageLocation();
        }, 500);
    }

    showLoadingScreen() {
        const loadingHTML = `
            <div id="loadingScreen" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                font-family: Arial, sans-serif;
                opacity: 1;
                transition: opacity 0.5s ease;
            ">
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 20px; animation: bounce 1s ease-in-out infinite alternate;">🚛</div>
                    <h2 style="margin-bottom: 10px; animation: fadeIn 0.8s ease-in;">Driver Support App</h2>
                    <div id="loadingStatus" style="margin-bottom: 30px; opacity: 0.8; min-height: 20px;">Se inițializează...</div>
                    <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
                        <div id="loadingProgress" style="width: 0%; height: 100%; background: white; border-radius: 2px; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="margin-top: 15px; font-size: 12px; opacity: 0.6;">Aplicația se încarcă rapid...</div>
                </div>
            </div>
            
            <style>
                @keyframes bounce {
                    from { transform: translateY(0px); }
                    to { transform: translateY(-10px); }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes loadingPulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
                
                #loadingStatus {
                    animation: loadingPulse 2s ease-in-out infinite;
                }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
        
        // Auto-hide after maximum 3 seconds (safety net)
        this.loadingTimeout = setTimeout(() => {
            console.warn('⚠️ Loading took too long, force hiding...');
            this.hideLoadingScreen();
        }, 3000);
    }

    updateLoadingProgress(percent, status) {
        const progressBar = document.getElementById('loadingProgress');
        const statusText = document.getElementById('loadingStatus');
        
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
        
        if (statusText) {
            statusText.textContent = status;
        }
        
        // Auto-advance progress for smooth UX
        if (percent >= 100) {
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 300);
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        
        if (loadingScreen) {
            // Clear timeout
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            
            // Smooth fade out
            loadingScreen.style.opacity = '0';
            loadingScreen.style.pointerEvents = 'none';
            
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    loadingScreen.remove();
                }
            }, 500);
            
            // Show app content
            const appContent = document.querySelector('.app-container, .content, main, body > *:not(#loadingScreen)');
            if (appContent) {
                appContent.style.opacity = '0';
                appContent.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    appContent.style.opacity = '1';
                }, 100);
            }
        }
    }

    async initializeComponents() {
        this.updateLoadingProgress(20, 'Inițializez componentele...');
        
        // Add methods to AlertSystem if they don't exist
        if (this.alertSystem && typeof this.alertSystem.checkDrivingCompliance !== 'function') {
            this.alertSystem.checkDrivingCompliance = () => {
                console.log('🔍 Checking driving compliance...');
                
                if (!this.timeTracker || !this.timeTracker.hasActiveSession || !this.timeTracker.hasActiveSession()) {
                    console.warn('No active session for compliance check');
                    return false;
                }
                
                const drivingTime = this.timeTracker.getActivityTime('driving');
                const totalTime = this.timeTracker.getTotalProgramTime();
                
                // Check if driving too long (example: max 4.5 hours)
                if (drivingTime > 4.5 * 60 * 60 * 1000) {
                    this.alertSystem.showAlert('warning', 'Atenție: Timp de conducere prelungit. Luați o pauză!');
                    return false;
                }
                
                return true;
            };
        }
        
        // Add hasActiveSession method to TimeTracker if it doesn't exist
        if (this.timeTracker && typeof this.timeTracker.hasActiveSession !== 'function') {
            this.timeTracker.hasActiveSession = () => {
                return this.programStarted && this.programStartTime;
            };
        }
        
        // Add missing methods to TimeTracker
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
                
                this.timeTracker.currentActivity = {
                    type: activityType,
                    startTime: startTime,
                    endTime: null
                };
                
                console.log(`📊 TimeTracker: Activity started - ${activityType}`);
                return true;
            };
        }
    }

    async requestPermissions() {
        this.updateLoadingProgress(40, 'Se verifică permisiunile...');
        
        // Check if permissions were already requested
        const permissionsState = this.getPermissionsState();
        
        // Request location permission only if not already handled
        if (!permissionsState.location.asked) {
            await this.requestLocationPermission();
        }
        
        // Request notification permission only if not already handled
        if (!permissionsState.notifications.asked) {
            await this.requestNotificationPermission();
        }
        
        // Request microphone permission only if not already handled
        if (!permissionsState.microphone.asked) {
            await this.requestMicrophonePermission();
        }
    }

    getPermissionsState() {
        const saved = localStorage.getItem('driverapp_permissions');
        if (saved) {
            return JSON.parse(saved);
        }
        
        return {
            location: { asked: false, granted: false },
            notifications: { asked: false, granted: false },
            microphone: { asked: false, granted: false }
        };
    }

    savePermissionsState(type, granted) {
        const state = this.getPermissionsState();
        state[type] = { asked: true, granted: granted };
        localStorage.setItem('driverapp_permissions', JSON.stringify(state));
    }

    // Reset permissions - useful for testing or settings reset
    resetPermissions() {
        localStorage.removeItem('driverapp_permissions');
        this.showToast('🔄 Permisiunile au fost resetate');
    }

    // Reactivate GPS - called from GPS page buttons
    async reactivateGPS() {
        // Reset location permission state to force re-asking
        const state = this.getPermissionsState();
        state.location = { asked: false, granted: false };
        localStorage.setItem('driverapp_permissions', JSON.stringify(state));
        
        // Request permission again
        const granted = await this.requestLocationPermission();
        
        if (granted) {
            // Reload GPS page content
            setTimeout(() => {
                this.loadGPSPage();
            }, 500);
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
            
            // Check if already granted
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('📍 Location permission already granted');
                    this.savePermissionsState('location', true);
                    resolve(true);
                },
                (error) => {
                    // Permission not granted yet, show modal
                    const modal = this.createPermissionModal(
                        '📍 Permisiune Locație',
                        'Această aplicație are nevoie de acces la locația ta pentru a oferi funcții GPS și de navigație.',
                        async () => {
                            try {
                                const position = await new Promise((res, rej) => {
                                    navigator.geolocation.getCurrentPosition(res, rej, {
                                        timeout: 10000,
                                        enableHighAccuracy: true
                                    });
                                });
                                
                                console.log('📍 Location permission granted');
                                this.showToast('✅ Locația a fost activată');
                                this.savePermissionsState('location', true);
                                modal.remove();
                                resolve(true);
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
            if (!('Notification' in window)) {
                console.log('🔔 Notifications not supported');
                this.savePermissionsState('notifications', false);
                resolve(false);
                return;
            }
            
            if (Notification.permission === 'granted') {
                this.savePermissionsState('notifications', true);
                resolve(true);
                return;
            }
            
            if (Notification.permission === 'denied') {
                this.savePermissionsState('notifications', false);
                resolve(false);
                return;
            }
            
            const modal = this.createPermissionModal(
                '🔔 Permisiune Notificări',
                'Aplicația va trimite notificări importante despre timp de conducere și pauze obligatorii.',
                async () => {
                    try {
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                            console.log('🔔 Notification permission granted');
                            this.showToast('✅ Notificările au fost activate');
                            
                            // Test notification
                            new Notification('Driver Support App', {
                                body: 'Notificările sunt acum active!',
                                icon: '/icon-192.png'
                            });
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
                () => {
                    console.log('🔔 Notification permission declined by user');
                    this.savePermissionsState('notifications', false);
                    modal.remove();
                    resolve(false);
                }
            );
        });
    }

    async requestMicrophonePermission() {
        return new Promise((resolve) => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.log('🎤 Microphone not supported');
                this.savePermissionsState('microphone', false);
                resolve(false);
                return;
            }
            
            const modal = this.createPermissionModal(
                '🎤 Permisiune Microfon',
                'Pentru controlul vocal, aplicația are nevoie de acces la microfon.',
                async () => {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        console.log('🎤 Microphone permission granted');
                        this.showToast('✅ Microfonul a fost activat');
                        
                        // Stop the stream immediately
                        stream.getTracks().forEach(track => track.stop());
                        
                        this.savePermissionsState('microphone', true);
                        modal.remove();
                        resolve(true);
                    } catch (error) {
                        console.log('🎤 Microphone permission denied');
                        this.showToast('⚠️ Microfonul nu este disponibil');
                        this.savePermissionsState('microphone', false);
                        modal.remove();
                        resolve(false);
                    }
                },
                () => {
                    console.log('🎤 Microphone permission declined by user');
                    this.savePermissionsState('microphone', false);
                    modal.remove();
                    resolve(false);
                }
            );
        });
    }

    createPermissionModal(title, message, onAllow, onDeny) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 400px;
                margin: 20px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            ">
                <h3 style="margin-bottom: 15px; color: #2c3e50;">${title}</h3>
                <p style="margin-bottom: 25px; color: #7f8c8d; line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="permissionDeny" style="
                        padding: 12px 24px;
                        border: 2px solid #95a5a6;
                        background: white;
                        color: #7f8c8d;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">Nu acum</button>
                    <button id="permissionAllow" style="
                        padding: 12px 24px;
                        border: 2px solid #3498db;
                        background: #3498db;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">Permite</button>
                </div>
            </div>
        `;
        
        modal.querySelector('#permissionAllow').onclick = onAllow;
        modal.querySelector('#permissionDeny').onclick = onDeny;
        
        document.body.appendChild(modal);
        return modal;
    }

    async initializeServices() {
        this.updateLoadingProgress(60, 'Inițializez serviciile...');
        
        try {
            if (this.locationService && typeof this.locationService.initialize === 'function') {
                await this.locationService.initialize();
            }
            
            if (this.alertSystem && typeof this.alertSystem.initialize === 'function') {
                await this.alertSystem.initialize();
            }
            
            // Initialize location for home page
            this.initializeHomePageLocation();
        } catch (error) {
            console.warn('⚠️ Some services failed to initialize:', error);
        }
        
        this.updateLoadingProgress(80, 'Finalizez inițializarea...');
    }

    initializeHomePageLocation() {
        // Get initial location for home page
        this.updateHomePageLocation();
        
        // Set up periodic updates for home page location (every 30 seconds)
        setInterval(() => {
            if (this.currentTab === 'program') {
                this.updateHomePageLocation();
            }
        }, 30000);
    }

    async updateHomePageLocation() {
        try {
            const locationData = await this.getRealLocationData();
            this.currentLocation = locationData;
            
            // Update location display on home page
            const locationDisplay = document.getElementById('currentLocation');
            const lastUpdateDisplay = document.getElementById('locationLastUpdate');
            const speedDisplay = document.getElementById('currentSpeed');
            
            if (locationDisplay) {
                // Extract city/area from address
                const parts = locationData.address.split(', ');
                const cityArea = parts.length > 1 ? parts[parts.length - 2] + ', ' + parts[parts.length - 1] : locationData.address;
                locationDisplay.textContent = cityArea;
            }
            
            if (lastUpdateDisplay) {
                lastUpdateDisplay.textContent = this.formatTime(locationData.timestamp);
            }
            
            if (speedDisplay) {
                const speed = locationData.speed ? Math.round(locationData.speed * 3.6) : 0;
                speedDisplay.textContent = `${speed} km/h`;
            }
            
            // Update weather based on location
            this.updateWeatherForLocation(locationData);
            
            console.log('📍 Home page location updated');
        } catch (error) {
            console.warn('⚠️ Failed to update home page location:', error);
            
            // Show fallback location
            const locationDisplay = document.getElementById('currentLocation');
            if (locationDisplay) {
                locationDisplay.textContent = 'Locație indisponibilă';
            }
        }
    }

    async updateWeatherForLocation(locationData) {
        try {
            // Use real coordinates for weather API (if you have a weather API key)
            // For now, we'll use a simulated weather update based on location
            const weatherTemp = document.getElementById('weatherTemp');
            const weatherDesc = document.getElementById('weatherDesc');
            
            if (weatherTemp && weatherDesc) {
                // Simulate weather data with some variation based on location
                const lat = locationData.latitude;
                const temperature = Math.round(15 + Math.sin(lat * Math.PI / 180) * 10 + Math.random() * 5);
                
                const weatherConditions = [
                    '☀️ Însorit', 
                    '⛅ Parțial înnorat', 
                    '☁️ Înnorat', 
                    '🌧️ Ploaie ușoară'
                ];
                
                const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
                
                // Extract city from address
                const cityParts = locationData.address.split(', ');
                const city = cityParts.length > 1 ? cityParts[cityParts.length - 2] : 'Locația curentă';
                
                weatherTemp.textContent = `${temperature}°C`;
                weatherDesc.textContent = `${condition} • ${city}`;
            }
        } catch (error) {
            console.warn('⚠️ Weather update failed:', error);
        }
    }

    startPeriodicUpdates() {
        // Start periodic updates with error handling
        setInterval(() => {
            try {
                this.updateUI();
            } catch (error) {
                console.error('Error in UI update:', error);
            }
        }, 1000);
        
        setInterval(() => {
            try {
                this.updateNetworkStatus();
            } catch (error) {
                console.error('Error in network status update:', error);
            }
        }, 30000);
    }

    handleInitializationError(error) {
        const errorModal = document.createElement('div');
        errorModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        errorModal.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h2 style="margin-bottom: 15px;">Eroare de Inițializare</h2>
                <p style="margin-bottom: 25px; opacity: 0.9;">${error.message}</p>
                <button onclick="location.reload()" style="
                    padding: 12px 24px;
                    border: 2px solid white;
                    background: transparent;
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">Reîncearcă</button>
            </div>
        `;
        
        document.body.appendChild(errorModal);
    }

    loadSavedData() {
        this.updateLoadingProgress(90, 'Încarc datele salvate...');
        
        try {
            const settings = this.dataManager.getSettings();
            const driverData = this.dataManager.getDriverData();
            const sessionData = this.dataManager.getSessionData();
            
            // Apply settings
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
            
            // Load driver info
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
            
            // Restore session if active
            if (sessionData.isActive) {
                this.restoreSession(sessionData);
            }
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
            
            // Update UI elements safely
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
            
            // Initialize time tracker
            if (this.timeTracker && typeof this.timeTracker.startProgram === 'function') {
                this.timeTracker.startProgram(this.programStartTime);
            }
            
            // Restore current activity
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
            // Reset session data if restoration fails
            this.dataManager.saveSessionData({ isActive: false });
        }
    }

    setupEventListeners() {
        // Add touch event handlers for better mobile experience
        document.querySelectorAll('.control-btn, .nav-item').forEach(button => {
            button.addEventListener('touchstart', function(e) {
                this.style.transform = 'scale(0.95)';
            }, { passive: true });
            
            button.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
            }, { passive: true });
        });

        // Prevent context menu on long press
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });

        // Handle visibility change for battery optimization
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 App backgrounded - reducing updates');
            } else {
                console.log('📱 App foregrounded - resuming updates');
                if (this.isInitialized) {
                    this.updateUI();
                }
            }
        });
    }

    // Program Control Methods
    startProgram() {
        if (this.programStarted) return;
        
        console.log('▶️ Starting program...');
        
        this.programStarted = true;
        this.programStartTime = new Date();
        
        // Update UI safely
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
        
        // Save session data
        this.dataManager.saveSessionData({
            isActive: true,
            startTime: this.programStartTime.toISOString(),
            activities: []
        });
        
        // Start time tracking
        if (this.timeTracker && typeof this.timeTracker.startProgram === 'function') {
            this.timeTracker.startProgram(this.programStartTime);
        }
        
        // Setup compliance alerts
        if (this.alertSystem && typeof this.alertSystem.scheduleComplianceAlerts === 'function') {
            this.alertSystem.scheduleComplianceAlerts();
        }
        
        this.showToast('Program pornit cu succes!');
        
        // Demo alert after 5 seconds
        setTimeout(() => {
            if (this.alertSystem && typeof this.alertSystem.showAlert === 'function') {
                this.alertSystem.showAlert('info', 'Sistem de monitorizare activ');
            }
        }, 5000);
    }

    endProgram() {
        if (!this.programStarted) return;
        
        if (!confirm('Sigur doriți să terminați programul?')) {
            return;
        }
        
        console.log('⏹️ Ending program...');
        
        this.programStarted = false;
        this.currentActivity = null;
        this.programStartTime = null;
        this.activityStartTime = null;
        
        // Update UI safely
        const startButton = document.getElementById('startButton');
        const statusCard = document.getElementById('statusCard');
        const controlButtons = document.getElementById('controlButtons');
        
        if (startButton) startButton.style.display = 'block';
        if (statusCard) statusCard.classList.remove('show');
        if (controlButtons) controlButtons.classList.remove('show');
        
        // Reset button states
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Save final session data
        let sessionData = {};
        if (this.timeTracker && typeof this.timeTracker.endProgram === 'function') {
            sessionData = this.timeTracker.endProgram();
        }
        
        this.dataManager.saveSessionData({ isActive: false });
        this.dataManager.saveDailyReport(sessionData);
        
        // Clear alerts
        if (this.alertSystem && typeof this.alertSystem.clearAlerts === 'function') {
            this.alertSystem.clearAlerts();
        }
        
        this.showToast('Program terminat!');
    }

    setActivity(activityType, activityName, button) {
        if (!this.programStarted) {
            this.showToast('⚠️ Pornește mai întâi programul');
            return;
        }
        
        console.log(`🎯 Setting activity: ${activityType}`);
        
        // Remove active class from all buttons
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to current button
        if (button) {
            button.classList.add('active');
        }
        
        // End previous activity
        if (this.currentActivity && this.timeTracker && typeof this.timeTracker.endActivity === 'function') {
            this.timeTracker.endActivity();
        }
        
        // Start new activity
        this.currentActivity = { type: activityType, name: activityName };
        this.activityStartTime = new Date();
        
        // Update UI
        const currentActivityEl = document.getElementById('currentActivity');
        if (currentActivityEl) {
            currentActivityEl.textContent = activityName;
        }
        
        // Start tracking new activity
        if (this.timeTracker && typeof this.timeTracker.startActivity === 'function') {
            this.timeTracker.startActivity(activityType, this.activityStartTime);
        }
        
        // Save session data
        try {
            const sessionData = this.dataManager.getSessionData();
            sessionData.currentActivity = this.currentActivity;
            this.dataManager.saveSessionData(sessionData);
        } catch (error) {
            console.warn('⚠️ Could not save session data:', error);
        }
        
        // Check compliance for driving activities
        if (activityType === 'driving') {
            if (this.alertSystem && typeof this.alertSystem.checkDrivingCompliance === 'function') {
                this.alertSystem.checkDrivingCompliance();
            }
        }
        
        this.showToast(`Activitate: ${activityName}`);
    }

    // Voice Control
    toggleVoiceControl() {
        const settings = this.dataManager.getSettings();
        if (!settings.voiceControl) {
            this.showToast('Control vocal dezactivat în setări');
            return;
        }

        const btn = document.getElementById('voiceBtn');
        if (!btn) return;
        
        this.voiceListening = !this.voiceListening;
        
        if (this.voiceListening) {
            btn.classList.add('listening');
            btn.textContent = '🎙️';
            this.showToast('Ascult... Spune comanda!');
            
            // Simulate voice recognition (in real app, use Web Speech API)
            setTimeout(() => {
                this.voiceListening = false;
                btn.classList.remove('listening');
                btn.textContent = '🎤';
                
                // Simulate recognized command
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
            if (this.programStarted) {
                this.setActivity('break', 'Pauză', document.getElementById('btnBreak'));
                this.showToast(`Comanda recunoscută: "${command}"`);
            }
        } else if (lowerCommand.includes('start condus') || lowerCommand.includes('condus')) {
            if (this.programStarted) {
                this.setActivity('driving', 'Condus', document.getElementById('btnDriving'));
                this.showToast(`Comanda recunoscută: "${command}"`);
            }
        } else if (lowerCommand.includes('start program')) {
            this.startProgram();
            this.showToast(`Comanda recunoscută: "${command}"`);
        } else if (lowerCommand.includes('termină program')) {
            this.endProgram();
            this.showToast(`Comanda recunoscută: "${command}"`);
        } else if (lowerCommand.includes('status')) {
            this.speakStatus();
            this.showToast(`Comanda recunoscută: "${command}"`);
        } else {
            this.showToast('Comandă nerecunoscută. Încearcă din nou.');
        }
    }

    speakStatus() {
        if (!this.programStarted) {
            this.showToast('🔊 Program oprit');
            return;
        }
        
        let totalTime = 0;
        let drivingTime = 0;
        
        if (this.timeTracker) {
            if (typeof this.timeTracker.getTotalProgramTime === 'function') {
                totalTime = this.timeTracker.getTotalProgramTime();
            }
            if (typeof this.timeTracker.getActivityTime === 'function') {
                drivingTime = this.timeTracker.getActivityTime('driving');
            }
        }
        
        const activity = this.currentActivity ? this.currentActivity.name : 'Nicio activitate';
        
        this.showToast(`🔊 Status: ${activity}. Program: ${this.formatDuration(totalTime)}. Condus: ${this.formatDuration(drivingTime)}`);
    }

    // Tab Navigation
    switchTab(element, tabName) {
        console.log(`📱 Switching to tab: ${tabName}`);
        
        try {
            // Stop location updates if leaving GPS tab
            if (window.app?.currentTab === 'gps' && tabName !== 'gps' && window.app?.locationUpdateInterval) {
                clearInterval(window.app.locationUpdateInterval);
                window.app.locationUpdateInterval = null;
            }
            
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked item
            if (element) {
                element.classList.add('active');
            }
            
            // FORCE HIDE ALL PAGES (including pageProgram)
            const allPages = document.querySelectorAll('.page');
            allPages.forEach(page => {
                page.classList.remove('active');
                page.style.display = 'none';           // Force hide
                page.style.visibility = 'hidden';      // Double safety
                page.style.opacity = '0';              // Triple safety
            });
            
            console.log(`🔍 Hidden ${allPages.length} pages`);
            
            // Show selected page
            const pageMap = {
                'program': 'pageProgram',
                'gps': 'pageGPS',
                'fuel': 'pageFuel',
                'reports': 'pageReports',
                'settings': 'pageSettings'
            };
            
            const targetPageId = pageMap[tabName];
            const targetPage = document.getElementById(targetPageId);
            
            if (targetPage) {
                // FORCE SHOW target page
                targetPage.classList.add('active');
                targetPage.style.display = 'block';        // Force show
                targetPage.style.visibility = 'visible';   // Double safety
                targetPage.style.opacity = '1';            // Triple safety
                
                console.log(`✅ Showed page: ${targetPageId}`);
                
                // Update current tab in app
                if (window.app) {
                    window.app.currentTab = tabName;
                }
                
                // Load page content if needed
                if (window.app && typeof window.app.loadPageContent === 'function') {
                    window.app.loadPageContent(tabName);
                }
                
                // Show toast
                if (window.app && typeof window.app.showToast === 'function') {
                    window.app.showToast(`${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
                }
            } else {
                console.error(`❌ Page not found: ${targetPageId}`);
            }
            
        } catch (error) {
            console.error('❌ Error in switchTab:', error);
        }
    }

    /*switchTab(element, tabName) {
        console.log(`📱 Switching to tab: ${tabName}`);
        
        // Stop location updates if leaving GPS tab
        if (this.currentTab === 'gps' && tabName !== 'gps' && this.locationUpdateInterval) {
            clearInterval(this.locationUpdateInterval);
            this.locationUpdateInterval = null;
        }
        
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        if (element) {
            element.classList.add('active');
        }
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        const pageMap = {
            'program': 'pageProgram',
            'gps': 'pageGPS',
            'fuel': 'pageFuel',
            'reports': 'pageReports',
            'settings': 'pageSettings'
        };
        
        const targetPage = document.getElementById(pageMap[tabName]);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentTab = tabName;
            
            // Load page content if needed
            this.loadPageContent(tabName);
        }
        
        this.showToast(`${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    }*/

    loadPageContent(tabName) {
        // Lazy load page content for better performance
        switch (tabName) {
            case 'gps':
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

    loadGPSPage() {
        const gpsContent = document.getElementById('gpsContent');
        if (gpsContent && gpsContent.innerHTML.includes('Încărcare')) {
            // Show loading state
            gpsContent.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <div>Se obține locația...</div>
                </div>
            `;
            
            // Get real location data
            this.getRealLocationData()
                .then(locationData => {
                    gpsContent.innerHTML = this.createGPSPageContent(locationData);
                    // Start location updates
                    this.startLocationUpdates();
                })
                .catch(error => {
                    console.error('Error getting location:', error);
                    gpsContent.innerHTML = this.createGPSPageContent(null);
                });
        }
    }

    async getRealLocationData() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const coords = position.coords;
                    
                    // Get address from coordinates
                    const address = await this.reverseGeocode(coords.latitude, coords.longitude);
                    
                    const locationData = {
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        accuracy: coords.accuracy,
                        speed: coords.speed || 0,
                        heading: coords.heading,
                        timestamp: new Date(position.timestamp),
                        address: address,
                        connected: true
                    };
                    
                    resolve(locationData);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 30000
                }
            );
        });
    }

    async reverseGeocode(lat, lon) {
        try {
            // Using OpenStreetMap Nominatim API (free)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'DriverSupportApp/1.0'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Geocoding failed');
            }
            
            const data = await response.json();
            
            // Extract meaningful address components
            const address = data.address || {};
            const parts = [];
            
            if (address.road) parts.push(address.road);
            if (address.house_number) parts.push(address.house_number);
            if (address.city || address.town || address.village) {
                parts.push(address.city || address.town || address.village);
            }
            if (address.country) parts.push(address.country);
            
            return parts.length > 0 ? parts.join(', ') : `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        }
    }

    createGPSPageContent(locationData) {
        if (!locationData) {
            return `
                <div style="background: #ffebee; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #f44336;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <div style="width: 30px; height: 30px; border-radius: 50%; background: #f44336; display: flex; align-items: center; justify-content: center; color: white;">⚠️</div>
                        <div>
                            <div style="font-weight: bold;">GPS Deconectat</div>
                            <div style="font-size: 12px; color: #666;">Verifică permisiunile</div>
                        </div>
                    </div>
                    <div style="color: #666;">
                        Nu se poate obține locația. Asigură-te că ai permis accesul la locație și că GPS-ul este activat.
                    </div>
                </div>
                
                <div style="display: grid; gap: 10px;">
                    <button class="control-btn" onclick="app.reactivateGPS()">🔄 Reactivează GPS</button>
                    <button class="control-btn" onclick="app.showToast('Setări GPS...')">⚙️ Setări GPS</button>
                </div>
            `;
        }

        const speed = locationData.speed ? Math.round(locationData.speed * 3.6) : 0; // Convert m/s to km/h
        const accuracy = Math.round(locationData.accuracy);
        const lastUpdate = this.formatTime(locationData.timestamp);

        return `
            <div style="background: #e8f5e8; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #4caf50;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <div style="width: 30px; height: 30px; border-radius: 50%; background: #4caf50; display: flex; align-items: center; justify-content: center; color: white;">📍</div>
                    <div>
                        <div style="font-weight: bold;">GPS Conectat</div>
                        <div style="font-size: 12px; color: #666;">Precizie: ±${accuracy}m</div>
                    </div>
                </div>
                <div style="font-weight: bold; margin-bottom: 8px;">Locația Curentă</div>
                <div style="margin-bottom: 5px;">📍 ${locationData.address}</div>
                <div style="margin-bottom: 5px;">🕐 Ultimul update: ${lastUpdate}</div>
                <div style="margin-bottom: 5px;">🚗 Viteză: ${speed} km/h ${speed === 0 ? '(oprit)' : ''}</div>
                <div style="font-size: 12px; color: #666;">
                    Coordonate: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}
                </div>
            </div>
            
            <div style="height: 200px; background: linear-gradient(135deg, #74b9ff, #0984e3); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; margin-bottom: 20px; position: relative; overflow: hidden;">
                <div style="background: rgba(255,255,255,0.1); border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                    🗺️
                </div>
                <div>HARTĂ GPS</div>
                <small style="opacity: 0.8;">Locația în timp real</small>
                <div style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 15px; font-size: 12px;">
                    Live
                </div>
            </div>
            
            <div style="display: grid; gap: 10px;">
                <button class="control-btn" onclick="app.calculateRoute()">📍 Calculează Ruta</button>
                <button class="control-btn" onclick="app.findParkingZones()">🅿️ Zone Parcare</button>
                <button class="control-btn" onclick="app.findGasStations()">⛽ Stații Combustibil</button>
                <button class="control-btn" onclick="app.shareLocation()">📤 Trimite Locația</button>
            </div>
        `;
    }

    startLocationUpdates() {
        // Update location every 10 seconds when GPS tab is active
        if (this.locationUpdateInterval) {
            clearInterval(this.locationUpdateInterval);
        }

        this.locationUpdateInterval = setInterval(() => {
            if (this.currentTab === 'gps') {
                this.updateGPSData();
            }
        }, 10000);
    }

    async updateGPSData() {
        try {
            const locationData = await this.getRealLocationData();
            this.currentLocation = locationData; // Save current location for sharing
            
            const gpsContent = document.getElementById('gpsContent');
            
            if (gpsContent && !gpsContent.innerHTML.includes('Încărcare')) {
                // Update only the status part to avoid full page reload
                const statusDiv = gpsContent.querySelector('div[style*="background: #e8f5e8"]');
                if (statusDiv) {
                    const speed = locationData.speed ? Math.round(locationData.speed * 3.6) : 0;
                    const accuracy = Math.round(locationData.accuracy);
                    const lastUpdate = this.formatTime(locationData.timestamp);
                    
                    statusDiv.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <div style="width: 30px; height: 30px; border-radius: 50%; background: #4caf50; display: flex; align-items: center; justify-content: center; color: white;">📍</div>
                            <div>
                                <div style="font-weight: bold;">GPS Conectat</div>
                                <div style="font-size: 12px; color: #666;">Precizie: ±${accuracy}m</div>
                            </div>
                        </div>
                        <div style="font-weight: bold; margin-bottom: 8px;">Locația Curentă</div>
                        <div style="margin-bottom: 5px;">📍 ${locationData.address}</div>
                        <div style="margin-bottom: 5px;">🕐 Ultimul update: ${lastUpdate}</div>
                        <div style="margin-bottom: 5px;">🚗 Viteză: ${speed} km/h ${speed === 0 ? '(oprit)' : ''}</div>
                        <div style="font-size: 12px; color: #666;">
                            Coordonate: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.warn('GPS update failed:', error);
        }
    }

    // GPS helper functions
    calculateRoute() {
        this.showToast('🗺️ Calculez cea mai bună rută...');
        // Here you would integrate with a routing service
        setTimeout(() => {
            this.showToast('✅ Ruta calculată! Timp estimat: 2h 15min');
        }, 2000);
    }

    findParkingZones() {
        this.showToast('🅿️ Caut zone de parcare în apropiere...');
        // Here you would search for parking areas
        setTimeout(() => {
            this.showToast('✅ Găsite 3 zone de parcare într-un radius de 5km');
        }, 1500);
    }

    findGasStations() {
        this.showToast('⛽ Caut stații de combustibil...');
        // Here you would search for gas stations
        setTimeout(() => {
            this.showToast('✅ Găsite 5 stații într-un radius de 10km');
        }, 1500);
    }

    shareLocation() {
        if (navigator.share) {
            navigator.share({
                title: 'Locația mea curentă',
                text: 'Iată unde mă aflu acum:',
                url: `https://maps.google.com/?q=${this.currentLocation?.latitude},${this.currentLocation?.longitude}`
            }).catch(console.error);
        } else {
            // Fallback - copy to clipboard
            const url = `https://maps.google.com/?q=${this.currentLocation?.latitude || 0},${this.currentLocation?.longitude || 0}`;
            navigator.clipboard.writeText(url);
            this.showToast('📋 Link-ul locației a fost copiat!');
        }
    }

    loadFuelPage() {
        // Create fuel page content dynamically
        const fuelPage = document.getElementById('pageFuel');
        if (!fuelPage) {
            const newPage = document.createElement('div');
            newPage.className = 'page';
            newPage.id = 'pageFuel';
            newPage.innerHTML = `
                <div class="page-content">
                    <h2 class="page-title">Management Combustibil</h2>
                    
                    <div style="background: linear-gradient(135deg, #fd79a8, #e84393); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                        <h3 style="margin-bottom: 15px;">⛽ Status Combustibil</h3>
                        <div style="font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 15px;">
                            76% • 380L
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div style="text-align: center;">
                                <div style="font-size: 18px; font-weight: bold;">8.2L</div>
                                <div style="font-size: 12px; opacity: 0.9;">Consum/100km</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 18px; font-weight: bold;">520km</div>
                                <div style="font-size: 12px; opacity: 0.9;">Autonomie</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="card-title">Adaugă Alimentare</h3>
                        <div style="display: grid; gap: 15px;">
                            <div>
                                <label style="font-weight: 500; display: block; margin-bottom: 5px;">Cantitate (L):</label>
                                <input type="number" id="fuelAmount" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Litri combustibil..." />
                            </div>
                            <div>
                                <label style="font-weight: 500; display: block; margin-bottom: 5px;">Preț/L (€):</label>
                                <input type="number" id="fuelPrice" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="1.45" />
                            </div>
                            <button class="control-btn" style="background: #27ae60; color: white; border-color: #27ae60;" onclick="app.saveFuelData()">💾 Salvează Alimentare</button>
                        </div>
                    </div>
                </div>
            `;
            const content = document.querySelector('.content');
            if (content) {
                content.appendChild(newPage);
            }
        }
    }

    loadReportsPage() {
        // Always reload reports page content to get fresh data
        let reportsPage = document.getElementById('pageReports');
        if (reportsPage) {
            return; //reportsPage.remove();
        }
        
        const newPage = document.createElement('div');
        newPage.className = 'page';
        newPage.id = 'pageReports';
        
        const todayStats = this.getTodayStatsReal();
        const weekStats = this.getWeekStats();
        const monthStats = this.getMonthStats();
        
        newPage.innerHTML = `
            <div class="page-content">
                <h2 class="page-title">Rapoarte și Istoric</h2>
                
                ${this.createCurrentProgramCard(todayStats)}
                ${this.createDailyStatsCard(todayStats)}
                ${this.createWeeklyStatsCard(weekStats)}
                ${this.createComplianceCard()}
                ${this.createExportCard()}
            </div>
        `;
        
        const content = document.querySelector('.content');
        if (content) {
            content.appendChild(newPage);
        }
    }

    getTodayStatsReal() {
        // Get real stats from timeTracker or calculate from session data
        if (this.timeTracker && typeof this.timeTracker.getTodayStats === 'function') {
            return this.timeTracker.getTodayStats();
        }
        
        // Fallback calculation
        const sessionData = this.dataManager.getSessionData();
        const stats = {
            driving: 0,
            break: 0,
            work: 0,
            other: 0,
            totalTime: 0
        };
        
        if (this.programStarted && this.programStartTime) {
            const now = Date.now();
            stats.totalTime = now - this.programStartTime.getTime();
            
            // Estimate based on current activity
            if (this.currentActivity) {
                const activityTime = now - this.activityStartTime.getTime();
                stats[this.currentActivity.type] = activityTime;
            }
        }
        
        return stats;
    }

    getWeekStats() {
        // Simulate weekly stats (in a real app, this would come from stored data)
        return {
            totalHours: 38.5,
            drivingHours: 28.2,
            breakHours: 6.8,
            otherHours: 3.5,
            daysWorked: 5,
            avgDayHours: 7.7
        };
    }

    getMonthStats() {
        // Simulate monthly stats
        return {
            totalHours: 162.3,
            drivingHours: 118.5,
            breakHours: 28.9,
            otherHours: 14.9,
            daysWorked: 21,
            avgDayHours: 7.7
        };
    }

    createCurrentProgramCard(stats) {
        const programStatus = this.programStarted ? 'Activ' : 'Oprit';
        const startTime = this.programStartTime ? this.formatTime(this.programStartTime) : '-';
        const currentActivity = this.currentActivity ? this.currentActivity.name : 'Nicio activitate';
        
        return `
            <div class="card">
                <h3 class="card-title">Program Curent</h3>
                <div style="background: ${this.programStarted ? '#e8f5e8' : '#ffebee'}; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${this.programStarted ? '#4caf50' : '#f44336'};"></div>
                        <span style="font-weight: bold;">${programStatus}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                        <div>
                            <div style="color: #666; margin-bottom: 5px;">Început la:</div>
                            <div style="font-weight: bold;">${startTime}</div>
                        </div>
                        <div>
                            <div style="color: #666; margin-bottom: 5px;">Activitate curentă:</div>
                            <div style="font-weight: bold;">${currentActivity}</div>
                        </div>
                    </div>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
                    <div style="font-weight: bold; margin-bottom: 10px;">Timp Today</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>🚗 Conducere:</span>
                            <span style="font-weight: bold;">${this.formatDuration(stats.driving)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>☕ Pauze:</span>
                            <span style="font-weight: bold;">${this.formatDuration(stats.break)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>🔧 Lucru:</span>
                            <span style="font-weight: bold;">${this.formatDuration(stats.work)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>📋 Altele:</span>
                            <span style="font-weight: bold;">${this.formatDuration(stats.other)}</span>
                        </div>
                    </div>
                    <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>⏱️ Total:</span>
                        <span>${this.formatDuration(stats.totalTime || stats.driving + stats.break + stats.work + stats.other)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    createDailyStatsCard(stats) {
        const totalHours = (stats.totalTime || stats.driving + stats.break + stats.work + stats.other) / (1000 * 60 * 60);
        const drivingPercent = stats.totalTime > 0 ? Math.round((stats.driving / stats.totalTime) * 100) : 0;
        
        return `
            <div class="card">
                <h3 class="card-title">Statistici Ziua Curentă</h3>
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 12px; margin-bottom: 15px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 32px; font-weight: bold;">${totalHours.toFixed(1)}h</div>
                        <div style="opacity: 0.9;">Total astăzi</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                        <div>
                            <div style="font-size: 18px; font-weight: bold;">${drivingPercent}%</div>
                            <div style="font-size: 12px; opacity: 0.9;">Conducere</div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: bold;">${Math.round((stats.driving / (1000 * 60 * 60)) * 10) / 10}h</div>
                            <div style="font-size: 12px; opacity: 0.9;">La volan</div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: bold;">${Math.round((stats.break / (1000 * 60 * 60)) * 10) / 10}h</div>
                            <div style="font-size: 12px; opacity: 0.9;">Pauze</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createWeeklyStatsCard(weekStats) {
        return `
            <div class="card">
                <h3 class="card-title">Statistici Săptămâna Aceasta</h3>
                <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: #3498db;">${weekStats.totalHours}h</div>
                            <div style="font-size: 12px; color: #666;">Total săptămână</div>
                        </div>
                        <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: #27ae60;">${weekStats.daysWorked}</div>
                            <div style="font-size: 12px; color: #666;">Zile lucrate</div>
                        </div>
                    </div>
                    <div style="font-size: 14px; line-height: 1.6;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>🚗 Timp conducere:</span>
                            <span style="font-weight: bold;">${weekStats.drivingHours}h</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>☕ Timp pauze:</span>
                            <span style="font-weight: bold;">${weekStats.breakHours}h</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>📊 Medie pe zi:</span>
                            <span style="font-weight: bold;">${weekStats.avgDayHours}h</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createComplianceCard() {
        const drivingTime = this.getTodayStatsReal().driving / (1000 * 60 * 60); // hours
        const maxDrivingTime = 9; // EU regulation: max 9 hours/day
        const remainingTime = Math.max(0, maxDrivingTime - drivingTime);
        const compliancePercent = Math.min(100, (drivingTime / maxDrivingTime) * 100);
        
        let statusColor = '#27ae60';
        let statusText = 'Conformitate bună';
        
        if (compliancePercent > 80) {
            statusColor = '#f39c12';
            statusText = 'Atenție - aproape de limită';
        }
        if (compliancePercent >= 100) {
            statusColor = '#e74c3c';
            statusText = 'Limită depășită!';
        }
        
        return `
            <div class="card">
                <h3 class="card-title">Conformitate Legală</h3>
                <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${statusColor};"></div>
                        <span style="font-weight: bold; color: ${statusColor};">${statusText}</span>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px;">
                            <span>Timp conducere astăzi:</span>
                            <span style="font-weight: bold;">${drivingTime.toFixed(1)}h / ${maxDrivingTime}h</span>
                        </div>
                        <div style="background: #e0e0e0; border-radius: 10px; height: 8px; overflow: hidden;">
                            <div style="background: ${statusColor}; height: 100%; width: ${Math.min(100, compliancePercent)}%; transition: width 0.3s;"></div>
                        </div>
                    </div>
                    
                    <div style="font-size: 14px; color: #666;">
                        <div>⏰ Timp rămas: <strong>${remainingTime.toFixed(1)}h</strong></div>
                        <div>🚛 Pauză obligatorie la fiecare 4.5h</div>
                        <div>📅 Odihnă săptămânală: 45h consecutiv</div>
                    </div>
                </div>
            </div>
        `;
    }

    createExportCard() {
        return `
            <div class="card">
                <h3 class="card-title">Exportă Rapoarte</h3>
                <div style="display: grid; gap: 10px;">
                    <button class="control-btn" onclick="app.exportToPDF()" style="background: #e74c3c; border-color: #e74c3c;">
                        📄 Export PDF Zilnic
                    </button>
                    <button class="control-btn" onclick="app.exportToExcel()" style="background: #27ae60; border-color: #27ae60;">
                        📊 Export Excel Săptămânal
                    </button>
                    <button class="control-btn" onclick="app.sendEmail()" style="background: #3498db; border-color: #3498db;">
                        📧 Trimite Raport Email
                    </button>
                    <button class="control-btn" onclick="app.printReport()" style="background: #9b59b6; border-color: #9b59b6;">
                        🖨️ Printează Raport
                    </button>
                </div>
            </div>
        `;
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
        const date = new Date().toLocaleDateString('ro-RO');
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Raport Driver Support App - ${date}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .stats { margin: 20px 0; }
                    .stat-row { display: flex; justify-content: space-between; margin: 10px 0; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Driver Support App</h1>
                    <h2>Raport Zilnic - ${date}</h2>
                </div>
                
                <div class="stats">
                    <h3>Activități</h3>
                    <div class="stat-row">
                        <span>Program început la:</span>
                        <span>${this.programStartTime ? this.formatTime(this.programStartTime) : '-'}</span>
                    </div>
                    <div class="stat-row">
                        <span>Timp conducere:</span>
                        <span>${this.formatDuration(stats.driving)}</span>
                    </div>
                    <div class="stat-row">
                        <span>Timp pauze:</span>
                        <span>${this.formatDuration(stats.break)}</span>
                    </div>
                    <div class="stat-row">
                        <span>Timp lucru:</span>
                        <span>${this.formatDuration(stats.work)}</span>
                    </div>
                    <div class="stat-row">
                        <span><strong>Total:</strong></span>
                        <span><strong>${this.formatDuration(stats.totalTime || stats.driving + stats.break + stats.work + stats.other)}</strong></span>
                    </div>
                </div>
                
                <div style="margin-top: 40px; font-size: 12px; text-align: center; color: #666;">
                    Generat automatic de Driver Support App
                </div>
            </body>
            </html>
        `;
    }

    // Settings Management
    saveSettings() {
        const settings = {
            darkMode: document.getElementById('darkModeToggle')?.checked || false,
            voiceControl: document.getElementById('voiceControlToggle')?.checked || false,
            soundAlerts: document.getElementById('soundAlertsToggle')?.checked || false
        };
        
        const driverData = {
            name: document.getElementById('settingDriverName')?.value || '',
            truckNumber: document.getElementById('settingTruckNumber')?.value || ''
        };
        
        this.dataManager.saveSettings(settings);
        this.dataManager.saveDriverData(driverData);
        
        // Update UI
        const driverNameEl = document.getElementById('driverName');
        const truckNumberEl = document.getElementById('truckNumber');
        
        if (driverNameEl) driverNameEl.textContent = driverData.name;
        if (truckNumberEl) truckNumberEl.textContent = `Camion #${driverData.truckNumber}`;
        
        this.showToast('Setări salvate cu succes!');
    }

    toggleDarkMode() {
        const isDark = document.getElementById('darkModeToggle')?.checked || false;
        document.body.classList.toggle('dark-mode', isDark);
        
        // Save setting
        const settings = this.dataManager.getSettings();
        settings.darkMode = isDark;
        this.dataManager.saveSettings(settings);
        
        this.showToast(isDark ? 'Mod întunecat activat' : 'Mod luminos activat');
    }

    // UI Update Methods
    updateUI() {
        if (!this.programStarted) return;
        
        try {
            // Update activity time
            if (this.activityStartTime) {
                const activityDuration = Date.now() - this.activityStartTime.getTime();
                const activityTimeEl = document.getElementById('activityTime');
                if (activityTimeEl) {
                    activityTimeEl.textContent = this.formatDuration(activityDuration);
                }
            }
            
            // Update total program time
            if (this.programStartTime) {
                const totalDuration = Date.now() - this.programStartTime.getTime();
                const totalProgramTimeEl = document.getElementById('totalProgramTime');
                if (totalProgramTimeEl) {
                    totalProgramTimeEl.textContent = this.formatDuration(totalDuration);
                }
            }
            
            // Update progress rings
            this.updateProgressRings();
        } catch (error) {
            console.warn('⚠️ Error updating UI:', error);
        }
    }

    updateProgressRings() {
        if (!this.timeTracker || typeof this.timeTracker.getTodayStats !== 'function') {
            return;
        }
        
        try {
            const stats = this.timeTracker.getTodayStats();
            const total = stats.driving + stats.break + stats.work + stats.other;
            
            if (total === 0) return;
            
            const drivingPercent = Math.round((stats.driving / total) * 100);
            const breakPercent = Math.round((stats.break / total) * 100);
            const workPercent = Math.round(((stats.work + stats.other) / total) * 100);
            
            // Update driving progress
            const drivingProgress = document.getElementById('drivingProgress');
            const drivingPercentage = document.getElementById('drivingPercentage');
            if (drivingProgress && drivingPercentage) {
                const drivingDegrees = (drivingPercent / 100) * 360;
                drivingProgress.style.background = 
                    `conic-gradient(#3498db ${drivingDegrees}deg, #ecf0f1 ${drivingDegrees}deg)`;
                drivingPercentage.textContent = `${drivingPercent}%`;
            }
            
            // Update break progress
            const breakProgress = document.getElementById('breakProgress');
            const breakPercentage = document.getElementById('breakPercentage');
            if (breakProgress && breakPercentage) {
                const breakDegrees = (breakPercent / 100) * 360;
                breakProgress.style.background = 
                    `conic-gradient(#27ae60 ${breakDegrees}deg, #ecf0f1 ${breakDegrees}deg)`;
                breakPercentage.textContent = `${breakPercent}%`;
            }
            
            // Update work progress
            const workProgress = document.getElementById('workProgress');
            const workPercentage = document.getElementById('workPercentage');
            if (workProgress && workPercentage) {
                const workDegrees = (workPercent / 100) * 360;
                workProgress.style.background = 
                    `conic-gradient(#f39c12 ${workDegrees}deg, #ecf0f1 ${workDegrees}deg)`;
                workPercentage.textContent = `${workPercent}%`;
            }
        } catch (error) {
            console.warn('⚠️ Error updating progress rings:', error);
        }
    }

    updateNetworkStatus() {
        const statusElement = document.getElementById('networkStatus');
        
        if (statusElement) {
            if (navigator.onLine) {
                statusElement.innerHTML = '<span class="status-dot status-online"></span>Online';
            } else {
                statusElement.innerHTML = '<span class="status-dot status-offline"></span>Offline Ready';
            }
        }
    }

    async loadWeatherData() {
        // This will be called initially, then updated by location updates
        const weatherTemp = document.getElementById('weatherTemp');
        const weatherDesc = document.getElementById('weatherDesc');
        
        if (!weatherTemp || !weatherDesc) return;
        
        try {
            // Try to get location-based weather
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        
                        // Get address for weather location
                        const address = await this.reverseGeocode(lat, lon);
                        const cityParts = address.split(', ');
                        const city = cityParts.length > 1 ? cityParts[cityParts.length - 2] : 'Locația curentă';
                        
                        // Simulate weather based on coordinates
                        const temperature = Math.round(15 + Math.sin(lat * Math.PI / 180) * 10 + Math.random() * 5);
                        const conditions = ['☀️ Însorit', '⛅ Parțial înnorat', '☁️ Înnorat', '🌧️ Ploaie ușoară'];
                        const condition = conditions[Math.floor(Math.random() * conditions.length)];
                        
                        weatherTemp.textContent = `${temperature}°C`;
                        weatherDesc.textContent = `${condition} • ${city}`;
                        
                        console.log('🌤️ Weather data loaded with real location');
                    },
                    (error) => {
                        // Fallback to mock weather if location fails
                        this.loadMockWeather(weatherTemp, weatherDesc);
                    },
                    { timeout: 5000 }
                );
            } else {
                this.loadMockWeather(weatherTemp, weatherDesc);
            }
        } catch (error) {
            console.error('❌ Weather data failed to load:', error);
            this.loadMockWeather(weatherTemp, weatherDesc);
        }
    }

    loadMockWeather(weatherTemp, weatherDesc) {
        // Fallback mock weather
        const weather = {
            temperature: Math.round(Math.random() * 20 + 5),
            description: ['☀️ Însorit', '☁️ Înnorat', '🌧️ Ploios', '❄️ Ninsoare'][Math.floor(Math.random() * 4)],
            location: 'Stockholm'
        };
        
        weatherTemp.textContent = `${weather.temperature}°C`;
        weatherDesc.textContent = `${weather.description} • ${weather.location}`;
    }

    // Add function to share current location from home page
    shareCurrentLocation() {
        if (!this.currentLocation) {
            this.showToast('⚠️ Locația nu este disponibilă');
            return;
        }
        
        const message = `📍 Sunt aici: ${this.currentLocation.address}\n🗺️ Coordonate: ${this.currentLocation.latitude.toFixed(6)}, ${this.currentLocation.longitude.toFixed(6)}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Locația mea curentă',
                text: message,
                url: `https://maps.google.com/?q=${this.currentLocation.latitude},${this.currentLocation.longitude}`
            }).catch(console.error);
        } else {
            // Fallback - copy to clipboard
            const url = `https://maps.google.com/?q=${this.currentLocation.latitude},${this.currentLocation.longitude}`;
            navigator.clipboard.writeText(url);
            this.showToast('📋 Link-ul locației a fost copiat!');
        }
    }

    // Add function to open location in maps
    openLocationInMaps() {
        if (!this.currentLocation) {
            this.showToast('⚠️ Locația nu este disponibilă');
            return;
        }
        
        const url = `https://maps.google.com/?q=${this.currentLocation.latitude},${this.currentLocation.longitude}`;
        window.open(url, '_blank');
        this.showToast('🗺️ Deschid în Google Maps...');
    }

    // Add function to refresh location manually
    async refreshLocation() {
        this.showToast('🔄 Actualizez locația...');
        
        try {
            await this.updateHomePageLocation();
            this.showToast('✅ Locația a fost actualizată');
        } catch (error) {
            this.showToast('❌ Nu pot actualiza locația');
        }
    }

    // Export Methods
    exportToPDF() {
        let data = {};
        if (this.timeTracker && typeof this.timeTracker.getTodayStats === 'function') {
            data = this.timeTracker.getTodayStats();
        }
        
        this.showToast('📄 Export PDF în curs...');
        // Simulate export
        setTimeout(() => {
            this.showToast('✅ Raport PDF generat cu succes!');
        }, 2000);
    }

    exportToExcel() {
        let data = {};
        if (this.timeTracker && typeof this.timeTracker.getTodayStats === 'function') {
            data = this.timeTracker.getTodayStats();
        }
        
        this.showToast('📊 Export Excel în curs...');
        // Simulate export
        setTimeout(() => {
            this.showToast('✅ Raport Excel generat cu succes!');
        }, 2000);
    }

    sendEmail() {
        this.showToast('📧 Trimitere email în curs...');
        // Simulate email
        setTimeout(() => {
            this.showToast('✅ Email trimis cu succes!');
        }, 2000);
    }

    saveFuelData() {
        const fuelAmountEl = document.getElementById('fuelAmount');
        const fuelPriceEl = document.getElementById('fuelPrice');
        
        if (!fuelAmountEl || !fuelPriceEl) {
            this.showToast('❌ Elementele formularului nu sunt disponibile');
            return;
        }
        
        const amount = fuelAmountEl.value;
        const price = fuelPriceEl.value;
        
        if (!amount || !price) {
            this.showToast('❌ Completează toate câmpurile');
            return;
        }
        
        // Save fuel data
        const fuelData = {
            amount: parseFloat(amount),
            price: parseFloat(price),
            timestamp: new Date().toISOString(),
            totalCost: parseFloat(amount) * parseFloat(price)
        };
        
        this.dataManager.saveFuelData(fuelData);
        
        // Clear inputs
        fuelAmountEl.value = '';
        fuelPriceEl.value = '';
        
        this.showToast('⛽ Alimentare salvată cu succes!');
    }

    // Utility Methods
    formatTime(date) {
        if (!date) return '--:--';
        
        return date.toLocaleTimeString('ro-RO', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
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
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
        }, 3000);
    }
}

// Global functions for HTML event handlers
let app;

function initializeApp() {
    try {
        app = new DriverApp();
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
    }
}

function startProgram() {
    if (app && typeof app.startProgram === 'function') {
        app.startProgram();
    }
}

function endProgram() {
    if (app && typeof app.endProgram === 'function') {
        app.endProgram();
    }
}

function setActivity(type, name, button) {
    if (app && typeof app.setActivity === 'function') {
        app.setActivity(type, name, button);
    }
}

function toggleVoiceControl() {
    if (app && typeof app.toggleVoiceControl === 'function') {
        app.toggleVoiceControl();
    }
}

function switchTab(element, tabName) {
    if (app && typeof app.switchTab === 'function') {
        app.switchTab(element, tabName);
    }
}

function saveSettings() {
    if (app && typeof app.saveSettings === 'function') {
        app.saveSettings();
    }
}

function toggleDarkMode() {
    if (app && typeof app.toggleDarkMode === 'function') {
        app.toggleDarkMode();
    }
}

function hideAlert() {
    const alertPanel = document.getElementById('alertPanel');
    if (alertPanel) {
        alertPanel.classList.remove('show');
    }
}

// Location functions for home page
function shareCurrentLocation() {
    if (app && typeof app.shareCurrentLocation === 'function') {
        app.shareCurrentLocation();
    }
}

function openLocationInMaps() {
    if (app && typeof app.openLocationInMaps === 'function') {
        app.openLocationInMaps();
    }
}

function refreshLocation() {
    if (app && typeof app.refreshLocation === 'function') {
        app.refreshLocation();
    }
}

// Handle page visibility for battery optimization
document.addEventListener('visibilitychange', function() {
    if (app) {
        if (document.hidden) {
            console.log('📱 App backgrounded');
        } else {
            console.log('📱 App foregrounded');
        }
    }
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Driver Support App - JavaScript loaded');
    initializeApp();
});

console.log('📱 Driver Support App - JavaScript loaded');
