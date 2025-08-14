// Data Manager - Local Storage and Data Persistence
class DataManager {
    constructor() {
        this.storagePrefix = 'driverapp_';
        this.initializeStorage();
    }

    initializeStorage() {
        // Check if localStorage is available
        if (!this.isStorageAvailable()) {
            console.warn('⚠️ localStorage not available, using memory storage');
            this.useMemoryStorage = true;
            this.memoryStorage = {};
        }
        
        // Initialize default data structures
        this.ensureDataStructure();
    }

    isStorageAvailable() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    ensureDataStructure() {
        // Ensure all required data structures exist with defaults
        const defaultStructures = {
            settings: {
                darkMode: false,
                voiceControl: true,
                soundAlerts: true,
                gpsEnabled: true,
                autoBackup: true,
                language: 'ro'
            },
            driverData: {
                name: 'Alexandru Popescu',
                truckNumber: 'SE-4521',
                licenseNumber: '',
                company: ''
            },
            sessionData: {
                isActive: false,
                startTime: null,
                currentActivity: null,
                activities: []
            },
            dailyReports: [],
            fuelData: [],
            locations: [],
            complianceRules: {
                maxDrivingTime: 9 * 60 * 60 * 1000, // 9 hours in milliseconds
                mandatoryBreakAfter: 4.5 * 60 * 60 * 1000, // 4.5 hours
                minBreakDuration: 45 * 60 * 1000, // 45 minutes
                dailyRestPeriod: 11 * 60 * 60 * 1000, // 11 hours
                weeklyRestPeriod: 45 * 60 * 60 * 1000 // 45 hours
            }
        };

        for (const [key, defaultValue] of Object.entries(defaultStructures)) {
            if (!this.getData(key)) {
                this.setData(key, defaultValue);
            }
        }
    }

    // Core storage methods
    setData(key, value) {
        const fullKey = this.storagePrefix + key;
        const serializedValue = JSON.stringify(value);
        
        try {
            if (this.useMemoryStorage) {
                this.memoryStorage[fullKey] = serializedValue;
            } else {
                localStorage.setItem(fullKey, serializedValue);
            }
            return true;
        } catch (error) {
            console.error(`❌ Failed to save ${key}:`, error);
            return false;
        }
    }

    getData(key) {
        const fullKey = this.storagePrefix + key;
        
        try {
            let serializedValue;
            if (this.useMemoryStorage) {
                serializedValue = this.memoryStorage[fullKey];
            } else {
                serializedValue = localStorage.getItem(fullKey);
            }
            
            return serializedValue ? JSON.parse(serializedValue) : null;
        } catch (error) {
            console.error(`❌ Failed to load ${key}:`, error);
            return null;
        }
    }

    removeData(key) {
        const fullKey = this.storagePrefix + key;
        
        try {
            if (this.useMemoryStorage) {
                delete this.memoryStorage[fullKey];
            } else {
                localStorage.removeItem(fullKey);
            }
            return true;
        } catch (error) {
            console.error(`❌ Failed to remove ${key}:`, error);
            return false;
        }
    }

    // Settings management
    getSettings() {
        return this.getData('settings') || {};
    }

    saveSettings(settings) {
        const currentSettings = this.getSettings();
        const updatedSettings = { ...currentSettings, ...settings };
        return this.setData('settings', updatedSettings);
    }

    // Driver data management
    getDriverData() {
        return this.getData('driverData') || {};
    }

    saveDriverData(driverData) {
        const currentData = this.getDriverData();
        const updatedData = { ...currentData, ...driverData };
        return this.setData('driverData', updatedData);
    }

    // Session data management
    getSessionData() {
        return this.getData('sessionData') || { isActive: false, activities: [] };
    }

    saveSessionData(sessionData) {
        const currentSession = this.getSessionData();
        const updatedSession = { ...currentSession, ...sessionData };
        return this.setData('sessionData', updatedSession);
    }

    // Activity tracking
    addActivity(activity) {
        const sessionData = this.getSessionData();
        sessionData.activities = sessionData.activities || [];
        sessionData.activities.push({
            ...activity,
            id: this.generateId(),
            timestamp: new Date().toISOString()
        });
        return this.saveSessionData(sessionData);
    }

    updateLastActivity(updates) {
        const sessionData = this.getSessionData();
        const activities = sessionData.activities || [];
        
        if (activities.length > 0) {
            const lastActivity = activities[activities.length - 1];
            activities[activities.length - 1] = { ...lastActivity, ...updates };
            return this.saveSessionData(sessionData);
        }
        return false;
    }

    // Daily reports management
    getDailyReports() {
        return this.getData('dailyReports') || [];
    }

    saveDailyReport(reportData) {
        const reports = this.getDailyReports();
        const today = new Date().toDateString();
        
        // Remove existing report for today if it exists
        const filteredReports = reports.filter(report => 
            new Date(report.date).toDateString() !== today
        );
        
        // Add new report
        filteredReports.push({
            ...reportData,
            id: this.generateId(),
            date: new Date().toISOString()
        });
        
        // Keep only last 30 days
        const last30Days = filteredReports
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 30);
        
        return this.setData('dailyReports', last30Days);
    }

    getTodayReport() {
        const reports = this.getDailyReports();
        const today = new Date().toDateString();
        
        return reports.find(report => 
            new Date(report.date).toDateString() === today
        );
    }

    // Fuel data management
    getFuelData() {
        return this.getData('fuelData') || [];
    }

    saveFuelData(fuelEntry) {
        const fuelData = this.getFuelData();
        fuelData.push({
            ...fuelEntry,
            id: this.generateId(),
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 entries
        const limitedData = fuelData.slice(-100);
        
        return this.setData('fuelData', limitedData);
    }

    // Location data management
    getLocationData() {
        return this.getData('locations') || [];
    }

    saveLocation(locationData) {
        const locations = this.getLocationData();
        locations.push({
            ...locationData,
            id: this.generateId(),
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 1000 locations (to prevent storage overflow)
        const limitedLocations = locations.slice(-1000);
        
        return this.setData('locations', limitedLocations);
    }

    // Compliance rules
    getComplianceRules() {
        return this.getData('complianceRules') || {};
    }

    saveComplianceRules(rules) {
        const currentRules = this.getComplianceRules();
        const updatedRules = { ...currentRules, ...rules };
        return this.setData('complianceRules', updatedRules);
    }

    // Data export methods
    exportAllData() {
        const allData = {
            settings: this.getSettings(),
            driverData: this.getDriverData(),
            dailyReports: this.getDailyReports(),
            fuelData: this.getFuelData(),
            complianceRules: this.getComplianceRules(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        return allData;
    }

    importData(data) {
        try {
            // Validate data structure
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format');
            }
            
            // Import each section
            const sections = ['settings', 'driverData', 'dailyReports', 'fuelData', 'complianceRules'];
            let importedSections = 0;
            
            for (const section of sections) {
                if (data[section]) {
                    if (this.setData(section, data[section])) {
                        importedSections++;
                    }
                }
            }
            
            console.log(`✅ Imported ${importedSections} data sections`);
            return true;
        } catch (error) {
            console.error('❌ Data import failed:', error);
            return false;
        }
    }

    // Data analysis methods
    getWeeklyStats() {
        const reports = this.getDailyReports();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const weeklyReports = reports.filter(report => 
            new Date(report.date) >= weekAgo
        );
        
        return weeklyReports.reduce((stats, report) => {
            stats.totalDriving += report.drivingTime || 0;
            stats.totalBreaks += report.breakTime || 0;
            stats.totalWork += report.workTime || 0;
            stats.daysWorked += 1;
            return stats;
        }, {
            totalDriving: 0,
            totalBreaks: 0,
            totalWork: 0,
            daysWorked: 0
        });
    }

    getMonthlyStats() {
        const reports = this.getDailyReports();
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        
        const monthlyReports = reports.filter(report => 
            new Date(report.date) >= monthAgo
        );
        
        return monthlyReports.reduce((stats, report) => {
            stats.totalDriving += report.drivingTime || 0;
            stats.totalBreaks += report.breakTime || 0;
            stats.totalWork += report.workTime || 0;
            stats.daysWorked += 1;
            return stats;
        }, {
            totalDriving: 0,
            totalBreaks: 0,
            totalWork: 0,
            daysWorked: 0
        });
    }

    // Cleanup methods
    clearOldData() {
        // Clear data older than 90 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        
        // Clean daily reports
        const reports = this.getDailyReports();
        const recentReports = reports.filter(report => 
            new Date(report.date) >= cutoffDate
        );
        this.setData('dailyReports', recentReports);
        
        // Clean fuel data
        const fuelData = this.getFuelData();
        const recentFuelData = fuelData.filter(entry => 
            new Date(entry.timestamp) >= cutoffDate
        );
        this.setData('fuelData', recentFuelData);
        
        // Clean location data (keep last 30 days only)
        const locationCutoff = new Date();
        locationCutoff.setDate(locationCutoff.getDate() - 30);
        
        const locations = this.getLocationData();
        const recentLocations = locations.filter(location => 
            new Date(location.timestamp) >= locationCutoff
        );
        this.setData('locations', recentLocations);
        
        console.log('🧹 Old data cleaned up');
    }

    clearAllData() {
        const keys = ['settings', 'driverData', 'sessionData', 'dailyReports', 'fuelData', 'locations'];
        
        keys.forEach(key => {
            this.removeData(key);
        });
        
        // Reinitialize with defaults
        this.ensureDataStructure();
        
        console.log('🗑️ All data cleared and reset to defaults');
    }

    // Storage size methods
    getStorageUsage() {
        if (this.useMemoryStorage) {
            const totalSize = Object.values(this.memoryStorage)
                .reduce((size, value) => size + value.length, 0);
            return {
                used: totalSize,
                available: Infinity,
                percentage: 0
            };
        }
        
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (key.startsWith(this.storagePrefix)) {
                    totalSize += localStorage[key].length;
                }
            }
            
            // Estimate available space (localStorage limit is usually 5-10MB)
            const estimatedLimit = 5 * 1024 * 1024; // 5MB
            const percentage = (totalSize / estimatedLimit) * 100;
            
            return {
                used: totalSize,
                available: estimatedLimit - totalSize,
                percentage: Math.min(percentage, 100)
            };
        } catch (error) {
            console.error('❌ Failed to calculate storage usage:', error);
            return { used: 0, available: 0, percentage: 0 };
        }
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Backup methods
    createBackup() {
        const backup = {
            data: this.exportAllData(),
            created: new Date().toISOString(),
            version: '1.0'
        };
        
        return JSON.stringify(backup);
    }

    restoreFromBackup(backupString) {
        try {
            const backup = JSON.parse(backupString);
            
            if (!backup.data) {
                throw new Error('Invalid backup format');
            }
            
            return this.importData(backup.data);
        } catch (error) {
            console.error('❌ Backup restore failed:', error);
            return false;
        }
    }

    // Sync methods (for future cloud integration)
    async syncToCloud() {
        // Placeholder for cloud sync functionality
        console.log('☁️ Cloud sync not implemented yet');
        return false;
    }

    async syncFromCloud() {
        // Placeholder for cloud sync functionality
        console.log('☁️ Cloud sync not implemented yet');
        return false;
    }
}

console.log('💾 DataManager loaded');