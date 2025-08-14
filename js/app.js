// app.js - versiune îmbunătățită
class DriverApp {
    constructor() {
        this.components = {};
        this.isInitialized = false;
        this.initializeApp();
    }
    
    async initializeApp() {
        try {
            console.log('🚛 Driver Support App initializing...');
            
            // Inițializează componentele în ordinea corectă
            await this.initializeComponents();
            
            // Verifică dependențele
            if (!this.validateComponents()) {
                throw new Error('Component validation failed');
            }
            
            // Restaurează sesiunea
            await this.loadSavedData();
            
            this.isInitialized = true;
            console.log('✅ App initialized successfully');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.handleInitializationError(error);
        }
    }
    
    async initializeComponents() {
        this.dataManager = new DataManager();
        this.timeTracker = new TimeTracker();
        this.locationService = new LocationService();
        this.alertSystem = new AlertSystem();
        
        // Configurează dependențele
        this.alertSystem.setTimeTracker(this.timeTracker);
        this.alertSystem.setLocationService(this.locationService);
    }
    
    validateComponents() {
        const required = ['dataManager', 'timeTracker', 'locationService', 'alertSystem'];
        
        for (const component of required) {
            if (!this[component]) {
                console.error(`Missing component: ${component}`);
                return false;
            }
        }
        
        // Verifică metodele critice
        if (typeof this.alertSystem.checkDrivingCompliance !== 'function') {
            console.error('AlertSystem.checkDrivingCompliance method missing');
            return false;
        }
        
        return true;
    }
    
    async loadSavedData() {
        console.log('🔄 Restoring active session...');
        
        const savedSession = await this.dataManager.getSavedSession();
        
        if (savedSession) {
            this.timeTracker.restoreSession(savedSession);
        } else {
            this.timeTracker.startNewSession();
        }
        
        // Setează activitatea doar dacă sesiunea este activă
        if (this.timeTracker.hasActiveSession()) {
            console.log('🎯 Setting activity: driving');
            this.setActivity('driving');
        }
    }
    
    setActivity(activity) {
        if (!this.isInitialized) {
            console.warn('App not fully initialized yet');
            return;
        }
        
        try {
            // Verifică dacă există sesiune activă
            if (!this.timeTracker.hasActiveSession()) {
                console.warn('No active session, creating new one');
                this.timeTracker.startNewSession();
            }
            
            // Verifică conformitatea înainte de a seta activitatea
            if (this.alertSystem && typeof this.alertSystem.checkDrivingCompliance === 'function') {
                this.alertSystem.checkDrivingCompliance();
            }
            
            this.timeTracker.setActivity(activity);
            
        } catch (error) {
            console.error('Error setting activity:', error);
        }
    }
    
    handleInitializationError(error) {
        // Afișează mesaj de eroare utilizatorului
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; color: red;">
                <h2>Eroare de inițializare</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()">Reîncearcă</button>
            </div>
        `;
    }
}

// Inițializare sigură
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.driverApp = new DriverApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});
