// Driver Support App - Main Application Logic
class DriverApp {
constructor() {
this.programStarted = false;
this.currentActivity = null;
this.programStartTime = null;
this.activityStartTime = null;
this.voiceListening = false;
this.currentTab = ‘program’;

    // Initialize components
    this.dataManager = new DataManager();
    this.timeTracker = new TimeTracker();
    this.locationService = new LocationService();
    this.alertSystem = new AlertSystem();
    
    this.initializeApp();
}

initializeApp() {
    console.log('🚛 Driver Support App initializing...');
    
    // Load saved data
    this.loadSavedData();
    
    // Initialize services
    this.locationService.initialize();
    this.alertSystem.initialize();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateNetworkStatus();
    this.loadWeatherData();
    
    // Start periodic updates
    setInterval(() => this.updateUI(), 1000);
    setInterval(() => this.updateNetworkStatus(), 30000);
    
    console.log('✅ App initialized successfully');
}

loadSavedData() {
    const settings = this.dataManager.getSettings();
    const driverData = this.dataManager.getDriverData();
    const sessionData = this.dataManager.getSessionData();
    
    // Apply settings
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').checked = true;
    }
    
    if (settings.voiceControl !== undefined) {
        document.getElementById('voiceControlToggle').checked = settings.voiceControl;
    }
    
    if (settings.soundAlerts !== undefined) {
        document.getElementById('soundAlertsToggle').checked = settings.soundAlerts;
    }
    
    // Load driver info
    if (driverData.name) {
        document.getElementById('driverName').textContent = driverData.name;
        document.getElementById('settingDriverName').value = driverData.name;
    }
    
    if (driverData.truckNumber) {
        document.getElementById('truckNumber').textContent = `Camion #${driverData.truckNumber}`;
        document.getElementById('settingTruckNumber').value = driverData.truckNumber;
    }
    
    // Restore session if active
    if (sessionData.isActive) {
        this.restoreSession(sessionData);
    }
}

restoreSession(sessionData) {
    console.log('🔄 Restoring active session...');
    
    this.programStarted = true;
    this.programStartTime = new Date(sessionData.startTime);
    
    // Update UI
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('statusCard').classList.add('show');
    document.getElementById('controlButtons').classList.add('show');
    
    document.getElementById('currentState').textContent = 'Program activ';
    document.getElementById('programStartTime').textContent = this.formatTime(this.programStartTime);
    
    // Restore current activity
    if (sessionData.currentActivity) {
        this.setActivity(
            sessionData.currentActivity.type,
            sessionData.currentActivity.name,
            document.getElementById(`btn${sessionData.currentActivity.type.charAt(0).toUpperCase() + sessionData.currentActivity.type.slice(1)}`)
        );
    }
    
    this.showToast('Sesiune restaurată');
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
            this.updateUI();
        }
    });
}

// Program Control Methods
startProgram() {
    if (this.programStarted) return;
    
    console.log('▶️ Starting program...');
    
    this.programStarted = true;
    this.programStartTime = new Date();
    
    // Update UI
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('statusCard').classList.add('show');
    document.getElementById('controlButtons').classList.add('show');
    
    document.getElementById('currentState').textContent = 'Program activ';
    document.getElementById('programStartTime').textContent = this.formatTime(this.programStartTime);
    document.getElementById('currentActivity').textContent = 'Așteptare activitate';
    
    // Save session data
    this.dataManager.saveSessionData({
        isActive: true,
        startTime: this.programStartTime.toISOString(),
        activities: []
    });
    
    // Start time tracking
    this.timeTracker.startProgram(this.programStartTime);
    
    // Setup compliance alerts
    this.alertSystem.scheduleComplianceAlerts();
    
    this.showToast('Program pornit cu succes!');
    
    // Demo alert after 5 seconds
    setTimeout(() => {
        this.alertSystem.showAlert('info', 'Sistem de monitorizare activ');
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
    
    // Update UI
    document.getElementById('startButton').style.display = 'block';
    document.getElementById('statusCard').classList.remove('show');
    document.getElementById('controlButtons').classList.remove('show');
    
    // Reset button states
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Save final session data
    const sessionData = this.timeTracker.endProgram();
    this.dataManager.saveSessionData({ isActive: false });
    this.dataManager.saveDailyReport(sessionData);
    
    // Clear alerts
    this.alertSystem.clearAlerts();
    
    this.showToast('Program terminat!');
}

setActivity(activityType, activityName, button) {
    if (!this.programStarted) return;
    
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
    if (this.currentActivity) {
        this.timeTracker.endActivity();
    }
    
    // Start new activity
    this.currentActivity = { type: activityType, name: activityName };
    this.activityStartTime = new Date();
    
    // Update UI
    document.getElementById('currentActivity').textContent = activityName;
    
    // Start tracking new activity
    this.timeTracker.startActivity(activityType, this.activityStartTime);
    
    // Save session data
    const sessionData = this.dataManager.getSessionData();
    sessionData.currentActivity = this.currentActivity;
    this.dataManager.saveSessionData(sessionData);
    
    // Check compliance for driving activities
    if (activityType === 'driving') {
        this.alertSystem.checkDrivingCompliance();
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
    
    const totalTime = this.timeTracker.getTotalProgramTime();
    const drivingTime = this.timeTracker.getActivityTime('driving');
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
    element.classList.add('active');
    
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
        document.querySelector('.content').appendChild(newPage);
    }
}

loadReportsPage() {
    // Create reports page content dynamically
    const reportsPage = document.getElementById('pageReports');
    if (!reportsPage) {
        const newPage = document.createElement('div');
        newPage.className = 'page';
        newPage.id = 'pageReports';
        
        const todayStats = this.timeTracker.getTodayStats();
        
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
        document.querySelector('.content').appendChild(newPage);
    }
}

// Settings Management
saveSettings() {
    const settings = {
        darkMode: document.getElementById('darkModeToggle').checked,
        voiceControl: document.getElementById('voiceControlToggle').checked,
        soundAlerts: document.getElementById('soundAlertsToggle').checked
    };
    
    const driverData = {
        name: document.getElementById('settingDriverName').value,
        truckNumber: document.getElementById('settingTruckNumber').value
    };
    
    this.dataManager.saveSettings(settings);
    this.dataManager.saveDriverData(driverData);
    
    // Update UI
    document.getElementById('driverName').textContent = driverData.name;
    document.getElementById('truckNumber').textContent = `Camion #${driverData.truckNumber}`;
    
    this.showToast('Setări salvate cu succes!');
}

toggleDarkMode() {
    const isDark = document.getElementById('darkModeToggle').checked;
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
    
    // Update activity time
    if (this.activityStartTime) {
        const activityDuration = Date.now() - this.activityStartTime.getTime();
        document.getElementById('activityTime').textContent = this.formatDuration(activityDuration);
    }
    
    // Update total program time
    if (this.programStartTime) {
        const totalDuration = Date.now() - this.programStartTime.getTime();
        document.getElementById('totalProgramTime').textContent = this.formatDuration(totalDuration);
    }
    
    // Update progress rings
    this.updateProgressRings();
}

updateProgressRings() {
    const stats = this.timeTracker.getTodayStats();
    const total = stats.driving + stats.break + stats.work + stats.other;
    
    if (total === 0) return;
    
    const drivingPercent = Math.round((stats.driving / total) * 100);
    const breakPercent = Math.round((stats.break / total) * 100);
    const workPercent = Math.round(((stats.work + stats.other) / total) * 100);
    
    // Update driving progress
    const drivingDegrees = (drivingPercent / 100) * 360;
    document.getElementById('drivingProgress').style.background = 
        `conic-gradient(#3498db ${drivingDegrees}deg, #ecf0f1 ${drivingDegrees}deg)`;
    document.getElementById('drivingPercentage').textContent = `${drivingPercent}%`;
    
    // Update break progress
    const breakDegrees = (breakPercent / 100) * 360;
    document.getElementById('breakProgress').style.background = 
        `conic-gradient(#27ae60 ${breakDegrees}deg, #ecf0f1 ${breakDegrees}deg)`;
    document.getElementById('breakPercentage').textContent = `${breakPercent}%`;
    
    // Update work progress
    const workDegrees = (workPercent / 100) * 360;
    document.getElementById('workProgress').style.background = 
        `conic-gradient(#f39c12 ${workDegrees}deg, #ecf0f1 ${workDegrees}deg)`;
    document.getElementById('workPercentage').textContent = `${workPercent}%`;
}

updateNetworkStatus() {
    const statusElement = document.getElementById('networkStatus');
    
    if (navigator.onLine) {
        statusElement.innerHTML = '<span class="status-dot status-online"></span>Online';
    } else {
        statusElement.innerHTML = '<span class="status-dot status-offline"></span>Offline Ready';
    }
}

async loadWeatherData() {
    const weatherTemp = document.getElementById('weatherTemp');
    const weatherDesc = document.getElementById('weatherDesc');
    
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
    const data = this.timeTracker.getTodayStats();
    this.showToast('📄 Export PDF în curs...');
    // Simulate export
    setTimeout(() => {
        this.showToast('✅ Raport PDF generat cu succes!');
    }, 2000);
}

exportToExcel() {
    const data = this.timeTracker.getTodayStats();
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
    const amount = document.getElementById('fuelAmount').value;
    const price = document.getElementById('fuelPrice').value;
    
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
    document.getElementById('fuelAmount').value = '';
    document.getElementById('fuelPrice').value = '';
    
    this.showToast('⛽ Alimentare salvată cu succes!');
}

// Utility Methods
formatTime(date) {
    return date.toLocaleTimeString('ro-RO', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
}

formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
    }, 3000);
}
```

}

// Global functions for HTML event handlers
let app;

function initializeApp() {
app = new DriverApp();
}

function startProgram() {
app.startProgram();
}

function endProgram() {
app.endProgram();
}

function setActivity(type, name, button) {
app.setActivity(type, name, button);
}

function toggleVoiceControl() {
app.toggleVoiceControl();
}

function switchTab(element, tabName) {
app.switchTab(element, tabName);
}

function saveSettings() {
app.saveSettings();
}

function toggleDarkMode() {
app.toggleDarkMode();
}

function hideAlert() {
const alertPanel = document.getElementById(‘alertPanel’);
alertPanel.classList.remove(‘show’);
}

// Handle page visibility for battery optimization
document.addEventListener(‘visibilitychange’, function() {
if (app) {
if (document.hidden) {
console.log(‘📱 App backgrounded’);
} else {
console.log(‘📱 App foregrounded’);
}
}
});

console.log(‘📱 Driver Support App - JavaScript loaded’);