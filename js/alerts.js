// Alert System - Compliance and Safety Alerts
class AlertSystem {
    constructor() {
        this.activeAlerts = new Map();
        this.alertQueue = [];
        this.alertSettings = this.getDefaultAlertSettings();
        this.complianceTimers = new Map();
        this.lastAlertCheck = 0;
        this.alertCheckInterval = 60000; // Check every minute
        
        // Alert types and their configurations
        this.alertTypes = {
            compliance: {
                priority: 'high',
                persistent: true,
                sound: true,
                vibration: true
            },
            safety: {
                priority: 'high',
                persistent: true,
                sound: true,
                vibration: true
            },
            information: {
                priority: 'medium',
                persistent: false,
                sound: false,
                vibration: false
            },
            warning: {
                priority: 'medium',
                persistent: true,
                sound: true,
                vibration: false
            }
        };
    }

    // Initialize alert system
    initialize() {
        console.log('🚨 Initializing Alert System...');
        
        // Load user alert preferences
        this.loadAlertSettings();
        
        // Setup periodic compliance checks
        this.setupComplianceChecks();
        
        // Request notification permission
        this.requestNotificationPermission();
        
        // Setup vibration API if available
        this.setupVibration();
        
        console.log('✅ Alert System initialized');
    }

    // Load alert settings from storage
    loadAlertSettings() {
        if (window.app && window.app.dataManager) {
            const settings = window.app.dataManager.getSettings();
            this.alertSettings = {
                ...this.getDefaultAlertSettings(),
                ...settings.alerts
            };
        }
    }

    // Get default alert settings
    getDefaultAlertSettings() {
        return {
            complianceAlerts: true,
            safetyAlerts: true,
            soundEnabled: true,
            vibrationEnabled: true,
            mandatoryBreakWarning: 30, // 30 minutes before
            maxDrivingWarning: 60, // 60 minutes before
            restPeriodWarning: 60, // 60 minutes before
            weatherAlerts: true,
            fuelAlerts: true,
            maintenanceAlerts: true
        };
    }

    // Request notification permission
    async requestNotificationPermission() {
        if ('Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                console.log('🔔 Notification permission:', permission);
                return permission === 'granted';
            } catch (error) {
                console.warn('⚠️ Notification permission request failed:', error);
                return false;
            }
        }
        return false;
    }

    // Setup vibration
    setupVibration() {
        this.vibrationSupported = 'vibrate' in navigator;
        if (this.vibrationSupported) {
            console.log('📳 Vibration API available');
        }
    }

    // Setup compliance monitoring
    setupComplianceChecks() {
        // Main compliance check interval
        setInterval(() => {
            this.performComplianceCheck();
        }, this.alertCheckInterval);
        
        console.log('⏰ Compliance checks scheduled');
    }

    // Schedule compliance alerts based on current activity
    scheduleComplianceAlerts() {
        console.log('📅 Scheduling compliance alerts...');
        
        // Clear existing timers
        this.clearComplianceTimers();
        
        if (!window.app || !window.app.programStarted) {
            return;
        }
        
        // Schedule mandatory break alert
        this.scheduleMandatoryBreakAlert();
        
        // Schedule maximum driving time alert
        this.scheduleMaxDrivingAlert();
        
        // Schedule daily rest period alert
        this.scheduleDailyRestAlert();
    }

    // Schedule mandatory break alert (4.5 hours rule)
    scheduleMandatoryBreakAlert() {
        if (!this.alertSettings.complianceAlerts) return;
        
        const timeTracker = window.app.timeTracker;
        const timeUntilBreak = timeTracker.getTimeUntilMandatoryBreak();
        
        if (timeUntilBreak > 0) {
            const warningTime = this.alertSettings.mandatoryBreakWarning * 60 * 1000; // Convert to ms
            const alertTime = Math.max(0, timeUntilBreak - warningTime);
            
            const timerId = setTimeout(() => {
                this.showAlert('compliance', 'Pauza obligatorie necesară în ' + this.alertSettings.mandatoryBreakWarning + ' minute!', {
                    actions: ['break'],
                    urgent: true
                });
            }, alertTime);
            
            this.complianceTimers.set('mandatoryBreak', timerId);
            console.log(`⏰ Mandatory break alert scheduled in ${alertTime / 1000}s`);
        }
    }

    // Schedule maximum driving time alert (9 hour rule)
    scheduleMaxDrivingAlert() {
        if (!this.alertSettings.complianceAlerts) return;
        
        const timeTracker = window.app.timeTracker;
        const timeUntilMax = timeTracker.getTimeUntilMaxDriving();
        
        if (timeUntilMax > 0) {
            const warningTime = this.alertSettings.maxDrivingWarning * 60 * 1000; // Convert to ms
            const alertTime = Math.max(0, timeUntilMax - warningTime);
            
            const timerId = setTimeout(() => {
                this.showAlert('compliance', 'Atingi timpul maxim de conducere în ' + this.alertSettings.maxDrivingWarning + ' minute!', {
                    actions: ['break', 'rest'],
                    urgent: true
                });
            }, alertTime);
            
            this.complianceTimers.set('maxDriving', timerId);
            console.log(`⏰ Max driving alert scheduled in ${alertTime / 1000}s`);
        }
    }

    // Schedule daily rest period alert
    scheduleDailyRestAlert() {
        if (!this.alertSettings.complianceAlerts) return;
        
        const timeTracker = window.app.timeTracker;
        const totalProgramTime = timeTracker.getTotalProgramTime();
        const maxProgramTime = 13 * 60 * 60 * 1000; // 13 hours
        const timeUntilRest = maxProgramTime - totalProgramTime;
        
        if (timeUntilRest > 0) {
            const warningTime = this.alertSettings.restPeriodWarning * 60 * 1000; // Convert to ms
            const alertTime = Math.max(0, timeUntilRest - warningTime);
            
            const timerId = setTimeout(() => {
                this.showAlert('compliance', 'Perioada de repaus zilnic (11h) va fi necesară în ' + this.alertSettings.restPeriodWarning + ' minute!', {
                    actions: ['rest'],
                    urgent: true
                });
            }, alertTime);
            
            this.complianceTimers.set('dailyRest', timerId);
            console.log(`⏰ Daily rest alert scheduled in ${alertTime / 1000}s`);
        }
    }

    // Clear compliance timers
    clearComplianceTimers() {
        this.complianceTimers.forEach((timerId, key) => {
            clearTimeout(timerId);
        });
        this.complianceTimers.clear();
    }

    // Perform periodic compliance check
    performComplianceCheck() {
        if (!window.app || !window.app.programStarted) {
            return;
        }
        
        const now = Date.now();
        if (now - this.lastAlertCheck < this.alertCheckInterval) {
            return; // Throttle checks
        }
        
        this.lastAlertCheck = now;
        
        const timeTracker = window.app.timeTracker;
        const compliance = timeTracker.checkDrivingCompliance();
        
        // Handle compliance violations
        if (!compliance.isCompliant) {
            compliance.violations.forEach(violation => {
                this.handleComplianceViolation(violation);
            });
        }
        
        // Handle compliance warnings
        compliance.warnings.forEach(warning => {
            this.handleComplianceWarning(warning);
        });
        
        // Check rest compliance
        const restCompliance = timeTracker.checkRestCompliance();
        if (restCompliance.needsRestPeriod) {
            this.handleRestPeriodAlert(restCompliance);
        }
    }

    // Handle compliance violations
    handleComplianceViolation(violation) {
        const alertId = `violation_${violation.type}`;
        
        if (!this.activeAlerts.has(alertId)) {
            this.showAlert('compliance', violation.message, {
                id: alertId,
                persistent: true,
                urgent: true,
                violation: true
            });
        }
    }

    // Handle compliance warnings
    handleComplianceWarning(warning) {
        const alertId = `warning_${warning.type}`;
        
        // Only show warning once per session
        if (!this.activeAlerts.has(alertId)) {
            this.showAlert('warning', warning.message, {
                id: alertId,
                persistent: false
            });
        }
    }

    // Handle rest period alerts
    handleRestPeriodAlert(restCompliance) {
        const alertId = 'rest_period_required';
        
        if (!this.activeAlerts.has(alertId)) {
            this.showAlert('compliance', restCompliance.message, {
                id: alertId,
                persistent: true,
                urgent: true,
                actions: ['rest']
            });
        }
    }

    // Show alert
    showAlert(type, message, options = {}) {
        const alert = {
            id: options.id || this.generateAlertId(),
            type: type,
            message: message,
            timestamp: new Date(),
            dismissed: false,
            persistent: options.persistent !== false,
            urgent: options.urgent || false,
            actions: options.actions || [],
            ...options
        };
        
        console.log(`🚨 Showing ${type} alert:`, message);
        
        // Add to active alerts
        this.activeAlerts.set(alert.id, alert);
        
        // Show in UI
        this.displayAlertInUI(alert);
        
        // Play sound if enabled
        if (this.shouldPlaySound(alert)) {
            this.playAlertSound(alert);
        }
        
        // Trigger vibration if enabled
        if (this.shouldVibrate(alert)) {
            this.triggerVibration(alert);
        }
        
        // Show browser notification
        if (this.shouldShowNotification(alert)) {
            this.showBrowserNotification(alert);
        }
        
        // Auto-dismiss if not persistent
        if (!alert.persistent) {
            setTimeout(() => {
                this.dismissAlert(alert.id);
            }, 5000);
        }
        
        return alert.id;
    }

    // Display alert in UI
    displayAlertInUI(alert) {
        const alertPanel = document.getElementById('alertPanel');
        const alertMessage = document.getElementById('alertMessage');
        
        if (alertPanel && alertMessage) {
            // Update alert content
            alertMessage.textContent = alert.message;
            
            // Set alert style based on type
            alertPanel.className = `alert-panel show alert-${alert.type}`;
            if (alert.urgent) {
                alertPanel.classList.add('alert-urgent');
            }
            
            // Add action buttons if provided
            if (alert.actions && alert.actions.length > 0) {
                this.addAlertActions(alertPanel, alert.actions);
            }
        }
    }

    // Add action buttons to alert
    addAlertActions(alertPanel, actions) {
        // Remove existing actions
        const existingActions = alertPanel.querySelector('.alert-actions');
        if (existingActions) {
            existingActions.remove();
        }
        
        // Create new actions container
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'alert-actions';
        actionsContainer.style.cssText = 'margin-top: 10px; display: flex; gap: 10px;';
        
        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = 'alert-action-btn';
            button.style.cssText = 'background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;';
            
            switch (action) {
                case 'break':
                    button.textContent = 'Start Pauză';
                    button.onclick = () => {
                        if (window.app) {
                            window.app.setActivity('break', 'Pauză', document.getElementById('btnBreak'));
                        }
                        this.hideAlert();
                    };
                    break;
                case 'rest':
                    button.textContent = 'Termină Program';
                    button.onclick = () => {
                        if (window.app) {
                            window.app.endProgram();
                        }
                        this.hideAlert();
                    };
                    break;
                default:
                    button.textContent = action;
            }
            
            actionsContainer.appendChild(button);
        });
        
        alertPanel.appendChild(actionsContainer);
    }

    // Hide alert from UI
    hideAlert() {
        const alertPanel = document.getElementById('alertPanel');
        if (alertPanel) {
            alertPanel.classList.remove('show');
        }
    }

    // Play alert sound
    playAlertSound(alert) {
        if (!this.alertSettings.soundEnabled) return;
        
        try {
            // Create audio context for sound generation
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Configure sound based on alert type
            if (alert.urgent || alert.type === 'compliance') {
                // Urgent alert: High-pitched beeps
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
                
                // Second beep
                setTimeout(() => {
                    const osc2 = audioContext.createOscillator();
                    const gain2 = audioContext.createGain();
                    osc2.connect(gain2);
                    gain2.connect(audioContext.destination);
                    osc2.frequency.setValueAtTime(800, audioContext.currentTime);
                    gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
                    osc2.start();
                    osc2.stop(audioContext.currentTime + 0.2);
                }, 300);
            } else {
                // Regular alert: Single tone
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
            }
        } catch (error) {
            console.warn('⚠️ Failed to play alert sound:', error);
        }
    }

    // Trigger vibration
    triggerVibration(alert) {
        if (!this.alertSettings.vibrationEnabled || !this.vibrationSupported) return;
        
        try {
            if (alert.urgent || alert.type === 'compliance') {
                // Urgent vibration pattern
                navigator.vibrate([200, 100, 200, 100, 200]);
            } else {
                // Regular vibration
                navigator.vibrate([300]);
            }
        } catch (error) {
            console.warn('⚠️ Vibration failed:', error);
        }
    }

    // Show browser notification
    showBrowserNotification(alert) {
        if (Notification.permission !== 'granted') return;
        
        const notification = new Notification('Driver Support Alert', {
            body: alert.message,
            icon: 'icons/icon-192x192.png',
            badge: 'icons/icon-192x192.png',
            tag: alert.id,
            requireInteraction: alert.persistent,
            silent: !this.alertSettings.soundEnabled
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        
        // Auto-close after 10 seconds if not persistent
        if (!alert.persistent) {
            setTimeout(() => notification.close(), 10000);
        }
    }

    // Check if should play sound
    shouldPlaySound(alert) {
        return this.alertSettings.soundEnabled && 
               this.alertTypes[alert.type]?.sound !== false;
    }

    // Check if should vibrate
    shouldVibrate(alert) {
        return this.alertSettings.vibrationEnabled && 
               this.alertTypes[alert.type]?.vibration !== false;
    }

    // Check if should show notification
    shouldShowNotification(alert) {
        return Notification.permission === 'granted' &&
               (alert.urgent || alert.persistent);
    }

    // Dismiss alert
    dismissAlert(alertId) {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
            alert.dismissed = true;
            this.activeAlerts.delete(alertId);
            console.log(`✅ Alert dismissed: ${alertId}`);
        }
    }

    // Clear all alerts
    clearAlerts() {
        this.activeAlerts.clear();
        this.clearComplianceTimers();
        this.hideAlert();
        console.log('🧹 All alerts cleared');
    }

    // Weather-based alerts
    checkWeatherAlerts(weatherData) {
        if (!this.alertSettings.weatherAlerts) return;
        
        // Example weather conditions that require alerts
        const alertConditions = {
            'heavy_rain': 'Ploaie torențială detectată. Conduceți cu prudență!',
            'snow': 'Ninsoare detectată. Verificați echipamentul de iarnă!',
            'fog': 'Ceață densă. Reduceți viteza și măriti distanța!',
            'strong_wind': 'Vânturi puternice. Atenție la manevrarea camionului!'
        };
        
        if (weatherData.condition && alertConditions[weatherData.condition]) {
            this.showAlert('safety', alertConditions[weatherData.condition], {
                id: `weather_${weatherData.condition}`,
                persistent: false
            });
        }
    }

    // Fuel-based alerts
    checkFuelAlerts(fuelLevel) {
        if (!this.alertSettings.fuelAlerts) return;
        
        if (fuelLevel < 20) {
            this.showAlert('warning', `Nivel combustibil scăzut: ${fuelLevel}%`, {
                id: 'fuel_low',
                persistent: false
            });
        } else if (fuelLevel < 10) {
            this.showAlert('safety', `Nivel combustibil critic: ${fuelLevel}%`, {
                id: 'fuel_critical',
                persistent: true,
                urgent: true
            });
        }
    }

    // Speed-based alerts
    checkSpeedAlerts(currentSpeed, speedLimit) {
        if (currentSpeed > speedLimit) {
            const overspeed = currentSpeed - speedLimit;
            if (overspeed > 10) {
                this.showAlert('safety', `Viteza depășită cu ${overspeed} km/h!`, {
                    id: 'speed_violation',
                    persistent: false,
                    urgent: true
                });
            }
        }
    }

    // Maintenance alerts
    scheduleMaintenanceAlert(maintenanceData) {
        if (!this.alertSettings.maintenanceAlerts) return;
        
        const { nextService, mileage, currentMileage } = maintenanceData;
        const mileageUntilService = nextService - currentMileage;
        
        if (mileageUntilService < 1000) {
            this.showAlert('information', `Service necesar în ${mileageUntilService} km`, {
                id: 'maintenance_due',
                persistent: false
            });
        }
    }

    // Update alert settings
    updateAlertSettings(newSettings) {
        this.alertSettings = { ...this.alertSettings, ...newSettings };
        
        // Save to storage
        if (window.app && window.app.dataManager) {
            const settings = window.app.dataManager.getSettings();
            settings.alerts = this.alertSettings;
            window.app.dataManager.saveSettings(settings);
        }
        
        console.log('💾 Alert settings updated');
    }

    // Get alert statistics
    getAlertStatistics() {
        const stats = {
            totalAlerts: this.alertQueue.length,
            activeAlerts: this.activeAlerts.size,
            alertsByType: {},
            alertsByPriority: {}
        };
        
        this.alertQueue.forEach(alert => {
            stats.alertsByType[alert.type] = (stats.alertsByType[alert.type] || 0) + 1;
            const priority = this.alertTypes[alert.type]?.priority || 'low';
            stats.alertsByPriority[priority] = (stats.alertsByPriority[priority] || 0) + 1;
        });
        
        return stats;
    }

    // Export alert data
    exportAlertData() {
        return {
            alertHistory: this.alertQueue,
            activeAlerts: Array.from(this.activeAlerts.values()),
            alertSettings: this.alertSettings,
            statistics: this.getAlertStatistics(),
            exportTimestamp: new Date().toISOString()
        };
    }

    // Utility methods
    generateAlertId() {
        return 'alert_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Cleanup
    cleanup() {
        this.clearAlerts();
        this.clearComplianceTimers();
        console.log('🧹 Alert system cleaned up');
    }
}

console.log('🚨 AlertSystem loaded');