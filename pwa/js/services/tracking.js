/**
 * TrackingService - Web version of session tracking service
 * Handles manual session tracking, timers, and session quality assessment
 */

class TrackingService {
    constructor() {
        this.currentSession = null;
        this.sessionTimer = null;
        this.eventListeners = new Map();
        this.isPageVisible = true;
        this.setupVisibilityTracking();
    }

    // Singleton pattern
    static getInstance() {
        if (!TrackingService.instance) {
            TrackingService.instance = new TrackingService();
        }
        return TrackingService.instance;
    }

    // Event system
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in tracking event listener:', error);
                }
            });
        }
    }

    // Page visibility tracking for better session quality
    setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            this.isPageVisible = !document.hidden;
            
            if (this.currentSession && this.currentSession.isActive) {
                if (this.isPageVisible) {
                    this.emit('sessionResumed', this.currentSession);
                } else {
                    this.emit('sessionPaused', this.currentSession);
                }
            }
        });

        // Track when user switches tabs/apps
        window.addEventListener('blur', () => {
            if (this.currentSession && this.currentSession.isActive) {
                this.currentSession.backgroundTime = this.currentSession.backgroundTime || 0;
                this.currentSession.lastBackgroundStart = Date.now();
            }
        });

        window.addEventListener('focus', () => {
            if (this.currentSession && this.currentSession.isActive && this.currentSession.lastBackgroundStart) {
                const backgroundDuration = Date.now() - this.currentSession.lastBackgroundStart;
                this.currentSession.backgroundTime += backgroundDuration;
                this.currentSession.lastBackgroundStart = null;
            }
        });
    }

    // Session management
    startManualSession(goalId = null) {
        if (this.currentSession && this.currentSession.isActive) {
            return { success: false, message: 'Session already active' };
        }

        this.currentSession = {
            startTime: new Date(),
            duration: 0,
            isActive: true,
            goalId: goalId,
            backgroundTime: 0,
            pauseCount: 0,
            quality: 'excellent' // Start optimistic
        };

        this.startSessionTimer();
        this.emit('sessionStarted', this.currentSession);
        
        // Request notification permission if not already granted
        this.requestNotificationPermission();
        
        return { success: true, session: this.currentSession };
    }

    endManualSession() {
        if (!this.currentSession || !this.currentSession.isActive) {
            return { success: false, message: 'No active session' };
        }

        this.currentSession.endTime = new Date();
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
        this.currentSession.isActive = false;

        // Calculate session quality
        this.calculateSessionQuality();

        // Stop timer
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }

        const completedSession = { ...this.currentSession };
        this.currentSession = null;

        // Emit completion event
        this.emit('sessionCompleted', completedSession);

        // Update user data
        const userDataService = UserDataService.getInstance();
        userDataService.completeSession(completedSession);

        return { 
            success: true, 
            session: completedSession,
            feedback: this.generateSessionFeedback(completedSession)
        };
    }

    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            if (this.currentSession && this.currentSession.isActive) {
                this.currentSession.duration = Date.now() - this.currentSession.startTime;
                this.emit('sessionTick', {
                    duration: this.currentSession.duration,
                    formattedTime: this.formatDuration(this.currentSession.duration)
                });
            }
        }, 1000);
    }

    calculateSessionQuality() {
        if (!this.currentSession) return;

        const totalDuration = this.currentSession.duration;
        const backgroundTime = this.currentSession.backgroundTime || 0;
        const focusRatio = 1 - (backgroundTime / totalDuration);
        const durationMinutes = totalDuration / (1000 * 60);

        // Quality assessment based on focus ratio and duration
        if (focusRatio >= 0.9 && durationMinutes >= 30) {
            this.currentSession.quality = 'excellent';
        } else if (focusRatio >= 0.8 && durationMinutes >= 20) {
            this.currentSession.quality = 'great';
        } else if (focusRatio >= 0.7 && durationMinutes >= 10) {
            this.currentSession.quality = 'good';
        } else if (focusRatio >= 0.5 && durationMinutes >= 5) {
            this.currentSession.quality = 'fair';
        } else {
            this.currentSession.quality = 'needs_improvement';
        }

        this.currentSession.focusRatio = focusRatio;
    }

    generateSessionFeedback(session) {
        const durationMinutes = Math.floor(session.duration / (1000 * 60));
        const durationSeconds = Math.floor((session.duration % (1000 * 60)) / 1000);
        
        const messages = {
            excellent: [
                "Outstanding focus! You're mastering digital wellness! 🌟",
                "Incredible session! Your mindfulness is inspiring! ✨",
                "Perfect focus! You're becoming a digital zen master! 🧘‍♀️"
            ],
            great: [
                "Great job! Your focus is really improving! 🎯",
                "Excellent work! You're building strong habits! 💪",
                "Well done! Your dedication is paying off! 🌟"
            ],
            good: [
                "Good session! You're on the right track! 👍",
                "Nice work! Keep building that focus muscle! 💪",
                "Solid effort! Every session counts! 🎯"
            ],
            fair: [
                "Not bad! Remember, progress takes practice! 🌱",
                "Good start! Try to minimize distractions next time! 📱",
                "Keep going! You're building important habits! 🌿"
            ],
            needs_improvement: [
                "Every attempt counts! Try a shorter session next time! 🌱",
                "Don't give up! Start with smaller goals! 💪",
                "Practice makes progress! You've got this! 🌟"
            ]
        };

        const qualityMessages = messages[session.quality] || messages.fair;
        const randomMessage = qualityMessages[Math.floor(Math.random() * qualityMessages.length)];

        return {
            message: randomMessage,
            duration: session.duration,
            durationMinutes,
            durationSeconds,
            quality: session.quality,
            focusRatio: session.focusRatio,
            xpEarned: durationMinutes,
            goalAchieved: session.goalId ? this.checkGoalAchievement(session) : false
        };
    }

    checkGoalAchievement(session) {
        if (!session.goalId) return false;

        const userDataService = UserDataService.getInstance();
        const goals = userDataService.getUserProfile().sessionGoals;
        const goal = goals.find(g => g.id === session.goalId);

        if (!goal) return false;

        const durationMinutes = session.duration / (1000 * 60);
        return durationMinutes >= goal.targetMinutes;
    }

    // Utility methods
    formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    getCurrentSession() {
        return this.currentSession;
    }

    isSessionActive() {
        return this.currentSession && this.currentSession.isActive;
    }

    getSessionDuration() {
        if (!this.currentSession || !this.currentSession.isActive) {
            return 0;
        }
        return Date.now() - this.currentSession.startTime;
    }

    getFormattedSessionTime() {
        return this.formatDuration(this.getSessionDuration());
    }

    // Notification support
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            } catch (error) {
                console.log('Notification permission request failed:', error);
                return false;
            }
        }
        return Notification.permission === 'granted';
    }

    showSessionReminder(message = 'Great job! Keep focusing! 🎯') {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('Unplug Session', {
                    body: message,
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/icon-72x72.png',
                    tag: 'session-reminder',
                    requireInteraction: false,
                    silent: false
                });
            } catch (error) {
                console.log('Failed to show notification:', error);
            }
        }
    }

    // Session goals
    setSessionGoal(goalId) {
        if (this.currentSession && this.currentSession.isActive) {
            this.currentSession.goalId = goalId;
            this.emit('goalSet', { goalId, session: this.currentSession });
            return true;
        }
        return false;
    }

    // Analytics support
    getSessionStats() {
        const userDataService = UserDataService.getInstance();
        const profile = userDataService.getUserProfile();
        
        return {
            totalSessions: profile.totalSessions,
            totalOfflineHours: profile.totalOfflineHours,
            averageSessionLength: profile.totalSessions > 0 ? 
                (profile.totalOfflineHours * 60) / profile.totalSessions : 0,
            currentStreak: profile.currentStreak,
            longestStreak: profile.longestStreak
        };
    }

    // PWA-specific features
    setupSessionReminders() {
        // Set up periodic reminders during long sessions
        if (this.currentSession && this.currentSession.isActive) {
            const reminderInterval = 30 * 60 * 1000; // 30 minutes
            
            setTimeout(() => {
                if (this.currentSession && this.currentSession.isActive) {
                    this.showSessionReminder('You\'re doing great! 30 minutes of focused time! 🌟');
                    this.setupSessionReminders(); // Schedule next reminder
                }
            }, reminderInterval);
        }
    }

    // Background sync support (for future enhancement)
    scheduleBackgroundSync() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                return registration.sync.register('session-sync');
            }).catch(error => {
                console.log('Background sync registration failed:', error);
            });
        }
    }
}

// Export for use in other modules
window.TrackingService = TrackingService;
