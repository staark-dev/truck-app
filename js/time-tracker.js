// Time Tracker - Activity and Work Time Management
class TimeTracker {
    constructor() {
        this.currentSession = null;
        this.currentActivity = null;
        this.activities = new Map();
        this.dailyStats = this.initializeDailyStats();
        this.complianceRules = this.getDefaultComplianceRules();
    }

    initializeDailyStats() {
        return {
            driving: 0,
            break: 0,
            work: 0,
            other: 0,
            totalProgram: 0,
            lastUpdate: Date.now()
        };
    }

    getDefaultComplianceRules() {
        return {
            maxDrivingTime: 9 * 60 * 60 * 1000, // 9 hours in milliseconds
            extendedDrivingTime: 10 * 60 * 60 * 1000, // 10 hours (max 2 times per week)
            mandatoryBreakAfter: 4.5 * 60 * 60 * 1000, // 4.5 hours
            minBreakDuration: 45 * 60 * 1000, // 45 minutes
            dailyRestPeriod: 11 * 60 * 60 * 1000, // 11 hours
            weeklyRestPeriod: 45 * 60 * 60 * 1000, // 45 hours
            maxWeeklyDrivingTime: 56 * 60 * 60 * 1000, // 56 hours
            maxBiWeeklyDrivingTime: 90 * 60 * 60 * 1000 // 90 hours in 2 weeks
        };
    }

    // Session Management
    startProgram(startTime = new Date()) {
        console.log('⏱️ Starting work program tracking');
        
        this.currentSession = {
            id: this.generateId(),
            startTime: startTime,
            endTime: null,
            activities: [],
            totalDuration: 0
        };
        
        // Reset daily stats for new session
        this.dailyStats = this.initializeDailyStats();
        this.dailyStats.sessionStart = startTime.getTime();
        
        return this.currentSession.id;
    }

    endProgram(endTime = new Date()) {
        if (!this.currentSession) {
            console.warn('⚠️ No active session to end');
            return null;
        }
        
        console.log('⏹️ Ending work program tracking');
        
        // End current activity if active
        if (this.currentActivity) {
            this.endActivity(endTime);
        }
        
        // Finalize session
        this.currentSession.endTime = endTime;
        this.currentSession.totalDuration = endTime.getTime() - this.currentSession.startTime.getTime();
        
        // Calculate final stats
        const finalStats = this.calculateSessionStats();
        
        // Prepare session data for storage
        const sessionData = {
            ...this.currentSession,
            stats: finalStats,
            complianceReport: this.generateComplianceReport()
        };
        
        // Clear current session
        this.currentSession = null;
        this.currentActivity = null;
        
        return sessionData;
    }

    // Activity Management
    startActivity(activityType, startTime = new Date()) {
        if (!this.currentSession) {
            console.warn('⚠️ Cannot start activity without active session');
            return false;
        }
        
        // End previous activity if exists
        if (this.currentActivity) {
            this.endActivity(startTime);
        }
        
        console.log(`🎯 Starting activity: ${activityType}`);
        
        this.currentActivity = {
            id: this.generateId(),
            type: activityType,
            startTime: startTime,
            endTime: null,
            duration: 0
        };
        
        return this.currentActivity.id;
    }

    endActivity(endTime = new Date()) {
        if (!this.currentActivity) {
            console.warn('⚠️ No active activity to end');
            return null;
        }
        
        console.log(`⏸️ Ending activity: ${this.currentActivity.type}`);
        
        // Calculate duration
        this.currentActivity.endTime = endTime;
        this.currentActivity.duration = endTime.getTime() - this.currentActivity.startTime.getTime();
        
        // Add to session activities
        this.currentSession.activities.push({ ...this.currentActivity });
        
        // Update daily stats
        this.updateDailyStats(this.currentActivity.type, this.currentActivity.duration);
        
        const completedActivity = { ...this.currentActivity };
        this.currentActivity = null;
        
        return completedActivity;
    }

    // Statistics Calculation
    updateDailyStats(activityType, duration) {
        if (this.dailyStats[activityType] !== undefined) {
            this.dailyStats[activityType] += duration;
        } else {
            console.warn(`⚠️ Unknown activity type: ${activityType}`);
        }
        
        this.dailyStats.lastUpdate = Date.now();
        
        // Update total program time
        if (this.currentSession) {
            this.dailyStats.totalProgram = Date.now() - this.currentSession.startTime.getTime();
        }
    }

    getTodayStats() {
        // Include current activity time if active
        const stats = { ...this.dailyStats };
        
        if (this.currentActivity) {
            const currentDuration = Date.now() - this.currentActivity.startTime.getTime();
            const activityType = this.currentActivity.type;
            
            if (stats[activityType] !== undefined) {
                stats[activityType] += currentDuration;
            }
        }
        
        // Update total program time
        if (this.currentSession) {
            stats.totalProgram = Date.now() - this.currentSession.startTime.getTime();
        }
        
        return stats;
    }

    getActivityTime(activityType) {
        const stats = this.getTodayStats();
        return stats[activityType] || 0;
    }

    getTotalProgramTime() {
        if (!this.currentSession) return 0;
        return Date.now() - this.currentSession.startTime.getTime();
    }

    getCurrentActivityDuration() {
        if (!this.currentActivity) return 0;
        return Date.now() - this.currentActivity.startTime.getTime();
    }

    // Compliance Checking
    checkDrivingCompliance() {
        const drivingTime = this.getActivityTime('driving');
        const compliance = {
            isCompliant: true,
            warnings: [],
            violations: []
        };
        
        // Check maximum driving time
        if (drivingTime >= this.complianceRules.maxDrivingTime) {
            compliance.isCompliant = false;
            compliance.violations.push({
                type: 'MAX_DRIVING_TIME_EXCEEDED',
                message: 'Timpul maxim de conducere (9h) a fost depășit',
                severity: 'high'
            });
        } else if (drivingTime >= this.complianceRules.maxDrivingTime * 0.9) {
            compliance.warnings.push({
                type: 'APPROACHING_MAX_DRIVING_TIME',
                message: 'Te apropii de timpul maxim de conducere',
                severity: 'medium'
            });
        }
        
        // Check mandatory break requirement
        const lastBreak = this.getLastActivityOfType('break');
        const timeSinceLastBreak = lastBreak ? 
            Date.now() - lastBreak.endTime.getTime() : 
            this.getTotalProgramTime();
        
        if (timeSinceLastBreak >= this.complianceRules.mandatoryBreakAfter) {
            compliance.isCompliant = false;
            compliance.violations.push({
                type: 'MANDATORY_BREAK_REQUIRED',
                message: 'Pauza obligatorie după 4.5h de activitate este necesară',
                severity: 'high'
            });
        } else if (timeSinceLastBreak >= this.complianceRules.mandatoryBreakAfter * 0.8) {
            compliance.warnings.push({
                type: 'APPROACHING_MANDATORY_BREAK',
                message: 'Pauza obligatorie va fi necesară în curând',
                severity: 'medium'
            });
        }
        
        return compliance;
    }

    checkRestCompliance() {
        const totalProgramTime = this.getTotalProgramTime();
        const compliance = {
            needsRestPeriod: false,
            restType: null,
            message: ''
        };
        
        // Check if daily rest period is needed (after 13 hours of program)
        const maxDailyProgramTime = 13 * 60 * 60 * 1000; // 13 hours
        
        if (totalProgramTime >= maxDailyProgramTime) {
            compliance.needsRestPeriod = true;
            compliance.restType = 'daily';
            compliance.message = 'Perioada de repaus zilnic (11h) este necesară';
        }
        
        return compliance;
    }

    generateComplianceReport() {
        const drivingCompliance = this.checkDrivingCompliance();
        const restCompliance = this.checkRestCompliance();
        const stats = this.getTodayStats();
        
        return {
            timestamp: new Date().toISOString(),
            isCompliant: drivingCompliance.isCompliant,
            stats: stats,
            drivingCompliance: drivingCompliance,
            restCompliance: restCompliance,
            recommendations: this.generateRecommendations(stats, drivingCompliance)
        };
    }

    generateRecommendations(stats, compliance) {
        const recommendations = [];
        
        // Driving time recommendations
        const drivingHours = stats.driving / (60 * 60 * 1000);
        if (drivingHours > 7) {
            recommendations.push({
                type: 'break',
                priority: 'high',
                message: 'Consider o pauză prelungită pentru recuperare'
            });
        }
        
        // Break recommendations
        const breakRatio = stats.break / stats.totalProgram;
        if (breakRatio < 0.15) { // Less than 15% breaks
            recommendations.push({
                type: 'break',
                priority: 'medium',
                message: 'Ia pauze mai frecvente pentru a menține alerta'
            });
        }
        
        // Efficiency recommendations
        if (stats.driving > 0 && stats.other > stats.driving) {
            recommendations.push({
                type: 'efficiency',
                priority: 'low',
                message: 'Timpul de conducere este sub timpul altor activități'
            });
        }
        
        return recommendations;
    }

    // Helper Methods
    getLastActivityOfType(activityType) {
        if (!this.currentSession) return null;
        
        const activities = this.currentSession.activities;
        for (let i = activities.length - 1; i >= 0; i--) {
            if (activities[i].type === activityType) {
                return activities[i];
            }
        }
        return null;
    }

    calculateSessionStats() {
        if (!this.currentSession) return null;
        
        const stats = {
            driving: 0,
            break: 0,
            work: 0,
            other: 0,
            totalActivities: this.currentSession.activities.length,
            averageActivityDuration: 0
        };
        
        let totalActivityTime = 0;
        
        this.currentSession.activities.forEach(activity => {
            const activityType = activity.type;
            if (stats[activityType] !== undefined) {
                stats[activityType] += activity.duration;
            }
            totalActivityTime += activity.duration;
        });
        
        // Calculate average activity duration
        if (stats.totalActivities > 0) {
            stats.averageActivityDuration = totalActivityTime / stats.totalActivities;
        }
        
        // Calculate efficiency metrics
        stats.drivingEfficiency = stats.driving / this.currentSession.totalDuration;
        stats.activeTime = totalActivityTime;
        stats.idleTime = this.currentSession.totalDuration - totalActivityTime;
        
        return stats;
    }

    // Weekly and Monthly Statistics
    calculateWeeklyStats(reports) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const weeklyReports = reports.filter(report => 
            new Date(report.timestamp) >= weekAgo
        );
        
        return this.aggregateReports(weeklyReports);
    }

    calculateMonthlyStats(reports) {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        
        const monthlyReports = reports.filter(report => 
            new Date(report.timestamp) >= monthAgo
        );
        
        return this.aggregateReports(monthlyReports);
    }

    aggregateReports(reports) {
        const aggregated = {
            driving: 0,
            break: 0,
            work: 0,
            other: 0,
            totalProgram: 0,
            workDays: reports.length,
            averageDayDuration: 0,
            complianceRate: 0
        };
        
        let compliantDays = 0;
        
        reports.forEach(report => {
            if (report.stats) {
                aggregated.driving += report.stats.driving || 0;
                aggregated.break += report.stats.break || 0;
                aggregated.work += report.stats.work || 0;
                aggregated.other += report.stats.other || 0;
                aggregated.totalProgram += report.stats.totalProgram || 0;
            }
            
            if (report.complianceReport && report.complianceReport.isCompliant) {
                compliantDays++;
            }
        });
        
        // Calculate averages
        if (reports.length > 0) {
            aggregated.averageDayDuration = aggregated.totalProgram / reports.length;
            aggregated.complianceRate = (compliantDays / reports.length) * 100;
        }
        
        return aggregated;
    }

    // Export Methods
    exportTimeData(format = 'json') {
        const data = {
            currentSession: this.currentSession,
            currentActivity: this.currentActivity,
            dailyStats: this.getTodayStats(),
            complianceReport: this.generateComplianceReport(),
            exportTimestamp: new Date().toISOString()
        };
        
        switch (format) {
            case 'csv':
                return this.convertToCSV(data);
            case 'json':
            default:
                return JSON.stringify(data, null, 2);
        }
    }

    convertToCSV(data) {
        const stats = data.dailyStats;
        const csvLines = [
            'Activity,Duration (ms),Duration (hours)',
            `Driving,${stats.driving},${(stats.driving / (60 * 60 * 1000)).toFixed(2)}`,
            `Break,${stats.break},${(stats.break / (60 * 60 * 1000)).toFixed(2)}`,
            `Work,${stats.work},${(stats.work / (60 * 60 * 1000)).toFixed(2)}`,
            `Other,${stats.other},${(stats.other / (60 * 60 * 1000)).toFixed(2)}`,
            `Total Program,${stats.totalProgram},${(stats.totalProgram / (60 * 60 * 1000)).toFixed(2)}`
        ];
        
        return csvLines.join('\n');
    }

    // Utility Methods
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    parseTimeString(timeString) {
        const parts = timeString.split(':');
        if (parts.length !== 3) return 0;
        
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        
        return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Real-time monitoring
    getTimeUntilMandatoryBreak() {
        if (!this.currentSession) return null;
        
        const lastBreak = this.getLastActivityOfType('break');
        const timeSinceLastBreak = lastBreak ? 
            Date.now() - lastBreak.endTime.getTime() : 
            this.getTotalProgramTime();
        
        const timeUntilBreak = this.complianceRules.mandatoryBreakAfter - timeSinceLastBreak;
        
        return Math.max(0, timeUntilBreak);
    }

    getTimeUntilMaxDriving() {
        const drivingTime = this.getActivityTime('driving');
        const timeUntilMax = this.complianceRules.maxDrivingTime - drivingTime;
        
        return Math.max(0, timeUntilMax);
    }

    // Performance optimization
    shouldTriggerAlert() {
        const now = Date.now();
        
        // Check every minute
        if (!this.lastAlertCheck || now - this.lastAlertCheck > 60000) {
            this.lastAlertCheck = now;
            return true;
        }
        
        return false;
    }
}

console.log('⏱️ TimeTracker loaded');