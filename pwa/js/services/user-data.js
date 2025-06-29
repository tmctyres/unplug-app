/**
 * UserDataService - Web version of the user data management service
 * Handles user profiles, achievements, XP system, and data persistence
 */

class UserDataService {
    constructor() {
        this.STORAGE_KEY = 'unplug_user_data';
        this.userProfile = null;
        this.eventListeners = new Map();
        this.levelSystem = this.initializeLevelSystem();
        this.achievementDefinitions = this.initializeAchievements();
        
        this.loadUserData();
    }

    // Singleton pattern
    static getInstance() {
        if (!UserDataService.instance) {
            UserDataService.instance = new UserDataService();
        }
        return UserDataService.instance;
    }

    // Event system for reactive updates
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
                    console.error('Error in event listener:', error);
                }
            });
        }
    }

    // Data persistence
    loadUserData() {
        try {
            const savedData = localStorage.getItem(this.STORAGE_KEY);
            if (savedData) {
                this.userProfile = JSON.parse(savedData);
                // Convert date strings back to Date objects
                this.userProfile.joinDate = new Date(this.userProfile.joinDate);
                this.userProfile.dailyStats = this.userProfile.dailyStats.map(stat => ({
                    ...stat,
                    date: new Date(stat.date)
                }));
                this.userProfile.sessionNotes = this.userProfile.sessionNotes.map(note => ({
                    ...note,
                    date: new Date(note.date)
                }));
            } else {
                this.initializeNewUser();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.initializeNewUser();
        }
    }

    saveUserData() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userProfile));
            this.emit('userDataSaved', this.userProfile);
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    initializeNewUser() {
        const defaultLevel = this.levelSystem[0];
        this.userProfile = {
            totalXP: 0,
            level: 1,
            currentStreak: 0,
            longestStreak: 0,
            totalOfflineHours: 0,
            joinDate: new Date(),
            achievements: this.getDefaultAchievements(),
            dailyStats: [],
            sessionNotes: [],
            sessionGoals: this.getDefaultSessionGoals(),
            userTitle: defaultLevel.title,
            userBadge: defaultLevel.badge,
            xpMultiplier: defaultLevel.xpMultiplier,
            totalSessions: 0,
            weekendSessions: 0,
            morningMeditations: 0,
            eveningWinddowns: 0,
            settings: {
                notificationsEnabled: true,
                darkMode: false,
                dailyGoalMinutes: 180, // 3 hours default
                reminderInterval: 60, // 1 hour
                isPremium: false,
                subscriptionType: 'free',
                showAds: false, // PWA doesn't show ads
                backupEnabled: false,
                exportFormat: 'json',
                minimumSessionMinutes: 5,
                hasCompletedOnboarding: false,
                preferredTheme: 'default'
            }
        };
        this.saveUserData();
    }

    // Level system
    initializeLevelSystem() {
        return [
            { level: 1, title: "Digital Seedling", badge: "🌱", xpRequired: 0, xpMultiplier: 1.0 },
            { level: 2, title: "Mindful Sprout", badge: "🌿", xpRequired: 100, xpMultiplier: 1.1 },
            { level: 3, title: "Focused Sapling", badge: "🌳", xpRequired: 250, xpMultiplier: 1.2 },
            { level: 4, title: "Balanced Tree", badge: "🌲", xpRequired: 500, xpMultiplier: 1.3 },
            { level: 5, title: "Zen Garden", badge: "🎋", xpRequired: 1000, xpMultiplier: 1.4 },
            { level: 6, title: "Digital Monk", badge: "🧘", xpRequired: 2000, xpMultiplier: 1.5 },
            { level: 7, title: "Offline Oracle", badge: "🔮", xpRequired: 4000, xpMultiplier: 1.6 },
            { level: 8, title: "Mindfulness Master", badge: "🏆", xpRequired: 8000, xpMultiplier: 1.7 },
            { level: 9, title: "Digital Sage", badge: "👑", xpRequired: 15000, xpMultiplier: 1.8 },
            { level: 10, title: "Enlightened Being", badge: "✨", xpRequired: 30000, xpMultiplier: 2.0 }
        ];
    }

    // Achievement system
    initializeAchievements() {
        return {
            'first_session': {
                id: 'first_session',
                title: 'First Steps',
                description: 'Complete your first offline session',
                icon: '🚀',
                category: 'milestone',
                rarity: 'common',
                xpReward: 50,
                unlocked: false
            },
            'streak_3': {
                id: 'streak_3',
                title: 'Getting Started',
                description: 'Maintain a 3-day streak',
                icon: '🔥',
                category: 'streak',
                rarity: 'common',
                xpReward: 100,
                unlocked: false
            },
            'streak_7': {
                id: 'streak_7',
                title: 'Week Warrior',
                description: 'Maintain a 7-day streak',
                icon: '⚡',
                category: 'streak',
                rarity: 'uncommon',
                xpReward: 200,
                unlocked: false
            },
            'session_30min': {
                id: 'session_30min',
                title: 'Half Hour Hero',
                description: 'Complete a 30-minute session',
                icon: '⏰',
                category: 'duration',
                rarity: 'common',
                xpReward: 75,
                unlocked: false
            },
            'session_60min': {
                id: 'session_60min',
                title: 'Hour of Power',
                description: 'Complete a 60-minute session',
                icon: '💪',
                category: 'duration',
                rarity: 'uncommon',
                xpReward: 150,
                unlocked: false
            },
            'total_10_hours': {
                id: 'total_10_hours',
                title: 'Ten Hour Triumph',
                description: 'Accumulate 10 hours of offline time',
                icon: '🎯',
                category: 'milestone',
                rarity: 'uncommon',
                xpReward: 300,
                unlocked: false
            },
            'level_5': {
                id: 'level_5',
                title: 'Zen Garden',
                description: 'Reach level 5',
                icon: '🎋',
                category: 'level',
                rarity: 'rare',
                xpReward: 500,
                unlocked: false
            }
        };
    }

    getDefaultAchievements() {
        const achievements = {};
        Object.keys(this.achievementDefinitions).forEach(key => {
            achievements[key] = { ...this.achievementDefinitions[key] };
        });
        return achievements;
    }

    getDefaultSessionGoals() {
        return [
            {
                id: 'focus_30',
                title: 'Focus Session',
                description: 'Stay offline for 30 minutes',
                targetMinutes: 30,
                icon: '🎯',
                isActive: true
            },
            {
                id: 'deep_work_60',
                title: 'Deep Work',
                description: 'Complete 1 hour of focused time',
                targetMinutes: 60,
                icon: '💼',
                isActive: false
            },
            {
                id: 'meditation_15',
                title: 'Quick Meditation',
                description: 'Take a 15-minute mindful break',
                targetMinutes: 15,
                icon: '🧘',
                isActive: false
            }
        ];
    }

    // Public API methods
    getUserProfile() {
        return this.userProfile;
    }

    addXP(amount) {
        const multipliedAmount = Math.floor(amount * this.userProfile.xpMultiplier);
        this.userProfile.totalXP += multipliedAmount;
        
        // Check for level up
        const newLevel = this.calculateLevel(this.userProfile.totalXP);
        if (newLevel > this.userProfile.level) {
            this.levelUp(newLevel);
        }
        
        this.saveUserData();
        this.emit('xpAdded', { amount: multipliedAmount, totalXP: this.userProfile.totalXP });
        return multipliedAmount;
    }

    calculateLevel(totalXP) {
        for (let i = this.levelSystem.length - 1; i >= 0; i--) {
            if (totalXP >= this.levelSystem[i].xpRequired) {
                return this.levelSystem[i].level;
            }
        }
        return 1;
    }

    levelUp(newLevel) {
        const oldLevel = this.userProfile.level;
        const levelData = this.levelSystem.find(l => l.level === newLevel);
        
        this.userProfile.level = newLevel;
        this.userProfile.userTitle = levelData.title;
        this.userProfile.userBadge = levelData.badge;
        this.userProfile.xpMultiplier = levelData.xpMultiplier;
        
        // Check for level achievement
        const levelAchievement = `level_${newLevel}`;
        if (this.userProfile.achievements[levelAchievement] && !this.userProfile.achievements[levelAchievement].unlocked) {
            this.unlockAchievement(levelAchievement);
        }
        
        this.emit('levelUp', { oldLevel, newLevel, levelData });
    }

    unlockAchievement(achievementId) {
        if (this.userProfile.achievements[achievementId] && !this.userProfile.achievements[achievementId].unlocked) {
            this.userProfile.achievements[achievementId].unlocked = true;
            this.userProfile.achievements[achievementId].unlockedAt = new Date();
            
            const achievement = this.userProfile.achievements[achievementId];
            this.addXP(achievement.xpReward);
            
            this.saveUserData();
            this.emit('achievementUnlocked', achievement);
            return true;
        }
        return false;
    }

    completeSession(sessionData) {
        const { duration, startTime, endTime } = sessionData;
        const durationMinutes = Math.floor(duration / 60000); // Convert ms to minutes
        
        // Add XP (1 XP per minute)
        this.addXP(durationMinutes);
        
        // Update stats
        this.userProfile.totalSessions++;
        this.userProfile.totalOfflineHours += durationMinutes / 60;
        
        // Update daily stats
        this.updateDailyStats(durationMinutes);
        
        // Check for achievements
        this.checkSessionAchievements(durationMinutes);
        
        // Update streak
        this.updateStreak();
        
        this.saveUserData();
        this.emit('sessionCompleted', { duration: durationMinutes, xpEarned: durationMinutes });
    }

    updateDailyStats(minutes) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let todayStats = this.userProfile.dailyStats.find(stat => 
            stat.date.getTime() === today.getTime()
        );
        
        if (!todayStats) {
            todayStats = {
                date: today,
                offlineMinutes: 0,
                sessions: 0,
                xpEarned: 0
            };
            this.userProfile.dailyStats.push(todayStats);
        }
        
        todayStats.offlineMinutes += minutes;
        todayStats.sessions++;
        todayStats.xpEarned += minutes;
    }

    updateStreak() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const todayStats = this.userProfile.dailyStats.find(stat => 
            stat.date.getTime() === today.getTime()
        );
        
        const yesterdayStats = this.userProfile.dailyStats.find(stat => 
            stat.date.getTime() === yesterday.getTime()
        );
        
        if (todayStats && todayStats.sessions > 0) {
            if (yesterdayStats && yesterdayStats.sessions > 0) {
                this.userProfile.currentStreak++;
            } else {
                this.userProfile.currentStreak = 1;
            }
            
            if (this.userProfile.currentStreak > this.userProfile.longestStreak) {
                this.userProfile.longestStreak = this.userProfile.currentStreak;
            }
            
            // Check streak achievements
            this.checkStreakAchievements();
        }
    }

    checkSessionAchievements(minutes) {
        // First session
        if (this.userProfile.totalSessions === 1) {
            this.unlockAchievement('first_session');
        }
        
        // Duration achievements
        if (minutes >= 30) {
            this.unlockAchievement('session_30min');
        }
        if (minutes >= 60) {
            this.unlockAchievement('session_60min');
        }
        
        // Total time achievements
        if (this.userProfile.totalOfflineHours >= 10) {
            this.unlockAchievement('total_10_hours');
        }
    }

    checkStreakAchievements() {
        if (this.userProfile.currentStreak >= 3) {
            this.unlockAchievement('streak_3');
        }
        if (this.userProfile.currentStreak >= 7) {
            this.unlockAchievement('streak_7');
        }
    }

    getTodayStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayStats = this.userProfile.dailyStats.find(stat => 
            stat.date.getTime() === today.getTime()
        );
        
        return todayStats || { offlineMinutes: 0, sessions: 0, xpEarned: 0 };
    }

    getDailyGoalProgress() {
        const todayStats = this.getTodayStats();
        const goalMinutes = this.userProfile.settings.dailyGoalMinutes;
        return Math.min(100, Math.round((todayStats.offlineMinutes / goalMinutes) * 100));
    }

    getUnlockedAchievements() {
        return Object.values(this.userProfile.achievements).filter(achievement => achievement.unlocked);
    }

    getLevelProgress() {
        const currentLevel = this.levelSystem.find(l => l.level === this.userProfile.level);
        const nextLevel = this.levelSystem.find(l => l.level === this.userProfile.level + 1);
        
        if (!nextLevel) {
            return { progress: 100, currentXP: this.userProfile.totalXP, nextLevelXP: currentLevel.xpRequired };
        }
        
        const currentLevelXP = this.userProfile.totalXP - currentLevel.xpRequired;
        const nextLevelXP = nextLevel.xpRequired - currentLevel.xpRequired;
        const progress = Math.round((currentLevelXP / nextLevelXP) * 100);
        
        return {
            progress: Math.min(100, progress),
            currentXP: currentLevelXP,
            nextLevelXP: nextLevelXP,
            totalCurrentXP: this.userProfile.totalXP,
            totalNextLevelXP: nextLevel.xpRequired
        };
    }

    needsOnboarding() {
        return !this.userProfile.settings.hasCompletedOnboarding;
    }

    completeOnboarding() {
        this.userProfile.settings.hasCompletedOnboarding = true;
        this.saveUserData();
        this.emit('onboardingCompleted', true);
    }
}

// Export for use in other modules
window.UserDataService = UserDataService;
