/**
 * Main App Controller - Unplug PWA
 * Coordinates all services and manages the user interface
 */

class UnplugApp {
    constructor() {
        this.userDataService = UserDataService.getInstance();
        this.trackingService = TrackingService.getInstance();
        this.currentPage = 'home';
        this.installPromptEvent = null;
        
        this.init();
    }

    async init() {
        // Show loading screen
        this.showLoadingScreen();
        
        // Initialize services
        await this.initializeServices();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up PWA features
        this.setupPWAFeatures();
        
        // Initialize UI
        this.initializeUI();
        
        // Hide loading screen and show app
        this.hideLoadingScreen();
        
        // Check for onboarding
        this.checkOnboarding();
    }

    showLoadingScreen() {
        document.getElementById('loading-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }

    hideLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
        }, 1500); // Show loading for at least 1.5 seconds for better UX
    }

    async initializeServices() {
        // Services are already initialized via their getInstance() methods
        
        // Set up service event listeners
        this.userDataService.addEventListener('levelUp', (data) => {
            this.showCelebration(`Level Up! 🎉`, `You've reached ${data.levelData.title}!`);
            this.updateUI();
        });

        this.userDataService.addEventListener('achievementUnlocked', (achievement) => {
            this.showCelebration(`Achievement Unlocked! ${achievement.icon}`, achievement.title);
            this.updateUI();
        });

        this.trackingService.addEventListener('sessionStarted', () => {
            this.updateSessionUI();
            this.updateUI();
        });

        this.trackingService.addEventListener('sessionCompleted', (session) => {
            this.handleSessionCompleted(session);
            this.updateUI();
        });

        this.trackingService.addEventListener('sessionTick', (data) => {
            this.updateSessionTimer(data.formattedTime);
        });
    }

    setupEventListeners() {
        // Session controls
        document.getElementById('start-session-btn').addEventListener('click', () => {
            this.startSession();
        });

        document.getElementById('end-session-btn').addEventListener('click', () => {
            this.endSession();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Action cards
        document.getElementById('achievements-btn').addEventListener('click', () => {
            this.navigateToPage('achievements');
        });

        document.getElementById('analytics-btn').addEventListener('click', () => {
            this.navigateToPage('analytics');
        });

        document.getElementById('social-btn').addEventListener('click', () => {
            this.navigateToPage('social');
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // Settings and menu
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.navigateToPage('settings');
        });

        // Celebration modal
        document.getElementById('celebration-close').addEventListener('click', () => {
            this.hideCelebration();
        });

        // Install prompt
        document.getElementById('install-btn').addEventListener('click', () => {
            this.installApp();
        });

        document.getElementById('install-dismiss').addEventListener('click', () => {
            this.hideInstallPrompt();
        });
    }

    setupPWAFeatures() {
        // Install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPromptEvent = e;
            
            // Show install prompt after a delay
            setTimeout(() => {
                this.showInstallPrompt();
            }, 30000); // Show after 30 seconds
        });

        // App installed
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallPrompt();
        });

        // Handle URL parameters for shortcuts
        this.handleURLParameters();
    }

    handleURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const page = urlParams.get('page');

        if (action === 'start-session') {
            setTimeout(() => this.startSession(), 1000);
        } else if (page) {
            setTimeout(() => this.navigateToPage(page), 1000);
        }
    }

    initializeUI() {
        this.updateWelcomeMessage();
        this.updateMotivationalMessage();
        this.updateUI();
        
        // Update welcome message every minute
        setInterval(() => {
            this.updateWelcomeMessage();
        }, 60000);
    }

    updateWelcomeMessage() {
        const hour = new Date().getHours();
        let greeting, emoji;

        if (hour < 12) {
            greeting = 'Good morning';
            emoji = '🌅';
        } else if (hour < 17) {
            greeting = 'Good afternoon';
            emoji = '☀️';
        } else {
            greeting = 'Good evening';
            emoji = '🌙';
        }

        const profile = this.userDataService.getUserProfile();
        const welcomeText = `${greeting}, ${profile.userTitle}! ${emoji}`;
        
        document.getElementById('welcome-text').textContent = welcomeText;
    }

    updateMotivationalMessage() {
        const profile = this.userDataService.getUserProfile();
        const todayStats = this.userDataService.getTodayStats();
        const goalProgress = this.userDataService.getDailyGoalProgress();

        let message;
        if (goalProgress >= 100) {
            message = "🎉 Daily goal achieved! You're crushing it!";
        } else if (goalProgress >= 75) {
            message = "🔥 Almost there! You're so close to your goal!";
        } else if (goalProgress >= 50) {
            message = "💪 Great progress! Keep up the momentum!";
        } else if (todayStats.sessions > 0) {
            message = "🌟 Good start! Every session counts!";
        } else {
            message = "🚀 Ready to start your digital wellness journey?";
        }

        document.getElementById('motivational-text').textContent = message;
    }

    updateUI() {
        const profile = this.userDataService.getUserProfile();
        const todayStats = this.userDataService.getTodayStats();
        const levelProgress = this.userDataService.getLevelProgress();
        const unlockedAchievements = this.userDataService.getUnlockedAchievements();

        // Update stats
        document.getElementById('total-xp').textContent = profile.totalXP.toLocaleString();
        document.getElementById('current-streak').textContent = profile.currentStreak;
        document.getElementById('today-minutes').textContent = todayStats.offlineMinutes;
        document.getElementById('daily-goal-progress').textContent = `${this.userDataService.getDailyGoalProgress()}%`;

        // Update level info
        document.getElementById('level-badge').textContent = profile.userBadge;
        document.getElementById('level-title').textContent = profile.userTitle;
        document.getElementById('level-number').textContent = profile.level;
        document.getElementById('level-progress-fill').style.width = `${levelProgress.progress}%`;
        document.getElementById('current-level-xp').textContent = levelProgress.currentXP;
        document.getElementById('next-level-xp').textContent = levelProgress.nextLevelXP;

        // Update achievements count
        document.getElementById('achievements-count').textContent = unlockedAchievements.length;

        // Update session UI
        this.updateSessionUI();
        this.updateMotivationalMessage();
    }

    updateSessionUI() {
        const isActive = this.trackingService.isSessionActive();
        const startBtn = document.getElementById('start-session-btn');
        const endBtn = document.getElementById('end-session-btn');
        const statusText = document.getElementById('session-status-text');

        if (isActive) {
            startBtn.style.display = 'none';
            endBtn.style.display = 'flex';
            statusText.textContent = 'Session in progress...';
            this.updateSessionTimer(this.trackingService.getFormattedSessionTime());
        } else {
            startBtn.style.display = 'flex';
            endBtn.style.display = 'none';
            statusText.textContent = 'Ready to start';
            document.getElementById('session-timer').textContent = '00:00:00';
        }
    }

    updateSessionTimer(formattedTime) {
        document.getElementById('session-timer').textContent = formattedTime;
    }

    startSession() {
        const result = this.trackingService.startManualSession();
        if (result.success) {
            this.updateSessionUI();
            this.showNotification('Session started! 🚀', 'Stay focused and enjoy your offline time!');
        } else {
            this.showNotification('Session already active', 'You already have a session running.');
        }
    }

    endSession() {
        const result = this.trackingService.endManualSession();
        if (result.success) {
            this.updateSessionUI();
            this.handleSessionCompleted(result.session);
        } else {
            this.showNotification('No active session', 'Start a session first!');
        }
    }

    handleSessionCompleted(session) {
        const feedback = this.trackingService.generateSessionFeedback(session);
        
        // Show completion celebration
        this.showCelebration(
            `Session Complete! ${this.getQualityEmoji(feedback.quality)}`,
            `${feedback.message}\n\n⏱️ Duration: ${feedback.durationMinutes}m ${feedback.durationSeconds}s\n⚡ XP Earned: ${feedback.xpEarned}`
        );

        // Show notification
        this.showNotification(
            'Session completed! 🎉',
            `Great job! You earned ${feedback.xpEarned} XP in ${feedback.durationMinutes} minutes.`
        );
    }

    getQualityEmoji(quality) {
        const emojis = {
            excellent: '🌟',
            great: '🎯',
            good: '👍',
            fair: '🌱',
            needs_improvement: '💪'
        };
        return emojis[quality] || '🌟';
    }

    showCelebration(title, message) {
        document.getElementById('celebration-title').textContent = title;
        document.getElementById('celebration-message').textContent = message;
        document.getElementById('celebration-modal').style.display = 'flex';
        document.getElementById('modal-overlay').style.display = 'block';
    }

    hideCelebration() {
        document.getElementById('celebration-modal').style.display = 'none';
        document.getElementById('modal-overlay').style.display = 'none';
    }

    showInstallPrompt() {
        if (this.installPromptEvent) {
            document.getElementById('install-prompt').style.display = 'flex';
        }
    }

    hideInstallPrompt() {
        document.getElementById('install-prompt').style.display = 'none';
    }

    async installApp() {
        if (this.installPromptEvent) {
            this.installPromptEvent.prompt();
            const { outcome } = await this.installPromptEvent.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            
            this.installPromptEvent = null;
            this.hideInstallPrompt();
        }
    }

    navigateToPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });

        this.currentPage = page;

        // For now, just show a notification
        // In a full implementation, you'd show different page content
        const pageNames = {
            home: 'Home',
            achievements: 'Achievements',
            analytics: 'Analytics',
            social: 'Social',
            settings: 'Settings'
        };

        if (page !== 'home') {
            this.showNotification(`${pageNames[page]} Page`, `${pageNames[page]} feature coming soon!`);
        }
    }

    exportData() {
        const profile = this.userDataService.getUserProfile();
        const data = {
            exportDate: new Date().toISOString(),
            userProfile: profile,
            stats: this.trackingService.getSessionStats()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `unplug-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Data exported! 📤', 'Your data has been downloaded as a JSON file.');
    }

    showNotification(title, message) {
        // Simple notification system - could be enhanced with a proper notification component
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/icons/icon-192x192.png'
            });
        } else {
            // Fallback to console for now
            console.log(`${title}: ${message}`);
        }
    }

    checkOnboarding() {
        if (this.userDataService.needsOnboarding()) {
            // For now, just complete onboarding automatically
            // In a full implementation, you'd show an onboarding flow
            setTimeout(() => {
                this.userDataService.completeOnboarding();
                this.showCelebration(
                    'Welcome to Unplug! 🎉',
                    'Your digital wellness journey starts now. Take control of your screen time and build mindful habits!'
                );
            }, 2000);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new UnplugApp();
});

// Export for debugging
window.UnplugApp = UnplugApp;
