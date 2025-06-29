/**
 * Notifications Service - Unplug PWA
 * Handles push notifications and permission management
 */

class NotificationsService {
    constructor() {
        this.storageService = StorageService.getInstance();
        this.isSupported = 'Notification' in window;
        this.permission = this.isSupported ? Notification.permission : 'denied';
        this.settings = this.loadSettings();
    }

    static getInstance() {
        if (!NotificationsService.instance) {
            NotificationsService.instance = new NotificationsService();
        }
        return NotificationsService.instance;
    }

    loadSettings() {
        return this.storageService.getItem('notification_settings', {
            enabled: false,
            achievements: true,
            reminders: true,
            sessionEnd: true,
            dailyGoal: true,
            reminderInterval: 120 // minutes
        });
    }

    saveSettings() {
        this.storageService.setItem('notification_settings', this.settings);
    }

    async requestPermission() {
        if (!this.isSupported) {
            console.warn('Notifications not supported in this browser');
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            if (permission === 'granted') {
                this.settings.enabled = true;
                this.saveSettings();
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    async showNotification(title, options = {}) {
        if (!this.canShowNotifications()) {
            console.warn('Cannot show notification: permission denied or disabled');
            return null;
        }

        const defaultOptions = {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            silent: false
        };

        const notificationOptions = { ...defaultOptions, ...options };

        try {
            // Use Service Worker if available for better reliability
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                return navigator.serviceWorker.ready.then(registration => {
                    return registration.showNotification(title, notificationOptions);
                });
            } else {
                // Fallback to regular notification
                return new Notification(title, notificationOptions);
            }
        } catch (error) {
            console.error('Error showing notification:', error);
            return null;
        }
    }

    canShowNotifications() {
        return this.isSupported && 
               this.permission === 'granted' && 
               this.settings.enabled;
    }

    async showAchievementNotification(achievement) {
        if (!this.settings.achievements) return null;

        return this.showNotification('🏆 Achievement Unlocked!', {
            body: `${achievement.name}: ${achievement.description}`,
            icon: '/icons/icon-192x192.png',
            tag: 'achievement',
            data: {
                type: 'achievement',
                achievementId: achievement.id
            },
            actions: [
                {
                    action: 'view',
                    title: 'View Achievement',
                    icon: '/icons/shortcut-achievements.png'
                }
            ]
        });
    }

    async showSessionEndNotification(sessionData) {
        if (!this.settings.sessionEnd) return null;

        const duration = this.formatDuration(sessionData.duration);
        const xpEarned = sessionData.xpEarned || 0;

        return this.showNotification('✅ Session Complete!', {
            body: `Great job! You stayed offline for ${duration} and earned ${xpEarned} XP.`,
            icon: '/icons/icon-192x192.png',
            tag: 'session-end',
            data: {
                type: 'session-end',
                sessionId: sessionData.id
            },
            actions: [
                {
                    action: 'view-stats',
                    title: 'View Stats',
                    icon: '/icons/shortcut-analytics.png'
                }
            ]
        });
    }

    async showDailyGoalNotification() {
        if (!this.settings.dailyGoal) return null;

        return this.showNotification('🎯 Daily Goal Achieved!', {
            body: 'Congratulations! You\'ve reached your daily offline goal.',
            icon: '/icons/icon-192x192.png',
            tag: 'daily-goal',
            data: {
                type: 'daily-goal'
            },
            actions: [
                {
                    action: 'celebrate',
                    title: 'Celebrate',
                    icon: '/icons/shortcut-achievements.png'
                }
            ]
        });
    }

    async showReminderNotification() {
        if (!this.settings.reminders) return null;

        const messages = [
            'Time for a digital break! 🧘‍♀️',
            'Ready for some offline time? 🌿',
            'Your mind deserves a rest from screens 💚',
            'How about a mindful moment? ✨',
            'Time to unplug and recharge! 🔋'
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        return this.showNotification('Unplug Reminder', {
            body: randomMessage,
            icon: '/icons/icon-192x192.png',
            tag: 'reminder',
            data: {
                type: 'reminder'
            },
            actions: [
                {
                    action: 'start-session',
                    title: 'Start Session',
                    icon: '/icons/shortcut-start.png'
                },
                {
                    action: 'snooze',
                    title: 'Remind Later',
                    icon: '/icons/shortcut-snooze.png'
                }
            ]
        });
    }

    scheduleReminder() {
        if (!this.settings.reminders || !this.canShowNotifications()) {
            return;
        }

        const intervalMs = this.settings.reminderInterval * 60 * 1000;
        
        // Clear existing reminder
        if (this.reminderTimeout) {
            clearTimeout(this.reminderTimeout);
        }

        // Schedule new reminder
        this.reminderTimeout = setTimeout(() => {
            this.showReminderNotification();
            this.scheduleReminder(); // Schedule next reminder
        }, intervalMs);
    }

    clearReminders() {
        if (this.reminderTimeout) {
            clearTimeout(this.reminderTimeout);
            this.reminderTimeout = null;
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();

        // Restart reminders if settings changed
        if (newSettings.reminders !== undefined || newSettings.reminderInterval !== undefined) {
            this.clearReminders();
            if (this.settings.reminders) {
                this.scheduleReminder();
            }
        }
    }

    getSettings() {
        return { ...this.settings };
    }

    getPermissionStatus() {
        return {
            supported: this.isSupported,
            permission: this.permission,
            enabled: this.settings.enabled
        };
    }

    formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (remainingMinutes === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }
        
        return `${hours}h ${remainingMinutes}m`;
    }

    // Handle notification clicks (called from service worker)
    handleNotificationClick(event) {
        const { action, data } = event;

        switch (data?.type) {
            case 'achievement':
                // Navigate to achievements page
                return '/?page=achievements';
            case 'session-end':
                // Navigate to analytics page
                return '/?page=analytics';
            case 'daily-goal':
                // Navigate to achievements page
                return '/?page=achievements';
            case 'reminder':
                if (action === 'start-session') {
                    return '/?action=start-session';
                } else if (action === 'snooze') {
                    // Snooze for 30 minutes
                    setTimeout(() => this.showReminderNotification(), 30 * 60 * 1000);
                    return null;
                }
                return '/';
            default:
                return '/';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationsService;
}
