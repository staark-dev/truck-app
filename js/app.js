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
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize components in correct order
            await this.initializeComponents();
            
            // Request permissions
            await this.requestPermissions();
            
            // Load saved data
            this.loadSavedData();
            
            // Initialize services
            await this.initializeServices();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Update UI
            this.updateNetworkStatus();
            this.loadWeatherData();
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ App initialized successfully');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.handleInitializationError(error);
        }
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
            ">
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🚛</div>
                    <h2 style="margin-bottom: 10px;">Driver Support App</h2>
                    <div id="loadingStatus" style="margin-bottom: 30px; opacity: 0.8;">Se inițializează...</div>
                    <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
                        <div id="loadingProgress" style="width: 0%; height: 100%; background: white; border-radius: 2px; transition: width 0.3s;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
    }

    updateLoadingProgress(percent, status) {
        const progressBar = document.getElementById('loadingProgress');
        const statusText = document.getElementById('loadingStatus');
        if (progressBar) progressBar.style.width = percent + '%';
        if (statusText) statusText.textContent = status;
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transition = 'opacity 0.5s';
            setTimeout(() => loadingScreen.remove(), 500);
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
        this.updateLoadingProgress(40, 'Se solicită permisiuni...');
        
        // Request location permission
        await this.requestLocationPermission();
        
        // Request notification permission
        await this.requestNotificationPermission();
        
        // Request microphone permission for voice control
        await this.requestMicrophonePermission();
    }

    async requestLocationPermission() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.log('📍 Geolocation not supported');
                resolve(false);
                return;
            }
            
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
                        modal.remove();
                        resolve(true);
                    } catch (error) {
                        console.log('📍 Location permission denied');
                        this.showToast('⚠️ Locația nu este disponibilă');
                        modal.remove();
                        resolve(false);
                    }
                },
                () => {
                    console.log('📍 Location permission declined by user');
                    modal.remove();
                    resolve(false);
                }
            );
        });
    }

    async requestNotificationPermission() {
        return new Promise((resolve) => {
            if (!('Notification' in window)) {
                console.log('🔔 Notifications not supported');
                resolve(false);
                return;
            }
            
            if (Notification.permission === 'granted') {
                resolve(true);
                return;
            }
            
            if (Notification.permission === 'denied') {
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
                        modal.remove();
                        resolve(permission === 'granted');
                    } catch (error) {
                        console.log('🔔 Notification permission error:', error);
                        modal.remove();
                        resolve(false);
                    }
                },
                () => {
                    console.log('🔔 Notification permission declined by user');
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
                        
                        modal.remove();
                        resolve(true);
                    } catch (error) {
                        console.log('🎤 Microphone permission denied');
                        this.showToast('⚠️ Microfonul nu este disponibil');
                        modal.remove();
                        resolve(false);
                    }
                },
                () => {
                    console.log('🎤 Microphone permission declined by user');
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
        } catch (error) {
            console.warn('⚠️ Some services failed to initialize:', error);
        }
        
        this.updateLoadingProgress(80, 'Finalizez inițializarea...');
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
    }

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
            // Simulate loading GPS content
            setTimeout(() => {
                gpsContent.innerHTML = `
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <div style="width: 30px; height: 30px; border-radius: 50%; background: #27ae60; display: flex; align-items: center; justify-content: center; color: white;">📍</div>
                            <div>
                                <div style="font-weight: bold;">GPS Conectat</div>
                                <div style="font-size: 12px; color: #7f8c8d;">Precizie: ±3m</div>
                            </div>
                        </div>
                        <div style="font-weight: bold; margin-bottom: 8px;">Locația Curentă</div>
                        <div>📍 E4, Stockholm, Suedia</div>
                        <div>🕐 Ultimul update: acum 5 sec</div>
                        <div>🚗 Viteză: 0 km/h (oprit)</div>
                    </div>
                    
                    <div style="height: 200px; background: linear-gradient(135deg, #74b9ff, #0984e3); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-bottom: 20px;">
                        🗺️ HARTĂ GPS<br>
                        <small>Locația în timp real</small>
                    </div>
                    
                    <div style="display: grid; gap: 10px;">
                        <button class="control-btn" onclick="app.showToast('Calculez ruta...')">📍 Calculează Ruta</button>
                        <button class="control-btn" onclick="app.showToast('Găsesc zone de parcare...')">🅿️ Zone Parcare</button>
                        <button class="control-btn" onclick="app.showToast('Găsesc stații...')">⛽ Stații Combustibil</button>
                    </div>
                `;
            }, 1000);
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
        // Create reports page content dynamically
        const reportsPage = document.getElementById('pageReports');
        if (!reportsPage) {
            const newPage = document.createElement('div');
            newPage.className = 'page';
            newPage.id = 'pageReports';
            
            let todayStats = { driving: 0, break: 0, work: 0, other: 0 };
            if (this.timeTracker && typeof this.timeTracker.getTodayStats === 'function') {
                todayStats = this.timeTracker.getTodayStats();
            }
            
            newPage.innerHTML = `
                <div class="page-content">
                    <h2 class="page-title">Rapoarte și Istoric</h2>
                    
                    <div class="card">
                        <h3 class="card-title">Detalii Program Curent</h3>
                        <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ecf0f1;">
                                <span style="font-weight: 500; color: #7f8c8d;">Program început la:</span>
                                <span style="font-weight: bold; color: #2c3e50;">${this.programStartTime ? this.formatTime(this.programStartTime) : '-'}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ecf0f1;">
                                <span style="font-weight: 500; color: #7f8c8d;">Conducere:</span>
                                <span style="font-weight: bold; color: #2c3e50;">${this.formatDuration(todayStats.driving)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ecf0f1;">
                                <span style="font-weight: 500; color: #7f8c8d;">Pauze:</span>
                                <span style="font-weight: bold; color: #2c3e50;">${this.formatDuration(todayStats.break)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                <span style="font-weight: 500; color: #7f8c8d;">Alte activități:</span>
                                <span style="font-weight: bold; color: #2c3e50;">${this.formatDuration(todayStats.work + todayStats.other)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="card-title">Exportă Rapoarte</h3>
                        <div style="display: grid; gap: 10px;">
                            <button class="control-btn" onclick="app.exportToPDF()">📄 Export PDF</button>
                            <button class="control-btn" onclick="app.exportToExcel()">📊 Export Excel</button>
                            <button class="control-btn" onclick="app.sendEmail()">📧 Trimite email</button>
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
        const weatherTemp = document.getElementById('weatherTemp');
        const weatherDesc = document.getElementById('weatherDesc');
        
        if (!weatherTemp || !weatherDesc) return;
        
        try {
            // Simulate weather API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Mock weather data
            const weather = {
                temperature: Math.round(Math.random() * 20 + 5),
                description: ['☀️ Însorit', '☁️ Înnorat', '🌧️ Ploios', '❄️ Ninsoare'][Math.floor(Math.random() * 4)],
                location: 'Stockholm'
            };
            
            weatherTemp.textContent = `${weather.temperature}°C`;
            weatherDesc.textContent = `${weather.description} • ${weather.location}`;
            
            console.log('🌤️ Weather data loaded');
        } catch (error) {
            console.error('❌ Weather data failed to load:', error);
            weatherTemp.textContent = '--°C';
            weatherDesc.textContent = 'Informații meteo indisponibile';
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
    
    try {
        initializeApp();
        window.driverApp = new DriverApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});

console.log('📱 Driver Support App - JavaScript loaded');
