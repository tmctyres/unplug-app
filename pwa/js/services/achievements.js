/**
 * Achievements Service - Unplug PWA
 * Manages achievement system and progress tracking
 */

class AchievementsService {
    constructor() {
        this.storageService = StorageService.getInstance();
        this.achievements = this.initializeAchievements();
        this.userAchievements = this.loadUserAchievements();
    }

    static getInstance() {
        if (!AchievementsService.instance) {
            AchievementsService.instance = new AchievementsService();
        }
        return AchievementsService.instance;
    }

    initializeAchievements() {
        return {
            'first_session': {
                id: 'first_session',
                name: 'First Steps',
                description: 'Complete your first offline session',
                icon: '🌱',
                requirement: 1,
                type: 'session_count',
                xpReward: 50,
                category: 'beginner'
            },
            'early_bird': {
                id: 'early_bird',
                name: 'Early Bird',
                description: 'Start a session before 8 AM',
                icon: '🌅',
                requirement: 1,
                type: 'early_session',
                xpReward: 25,
                category: 'time'
            },
            'night_owl': {
                id: 'night_owl',
                name: 'Night Owl',
                description: 'Complete a session after 10 PM',
                icon: '🦉',
                requirement: 1,
                type: 'late_session',
                xpReward: 25,
                category: 'time'
            },
            'digital_minimalist': {
                id: 'digital_minimalist',
                name: 'Digital Minimalist',
                description: 'Spend 2 hours offline in a single session',
                icon: '🧘',
                requirement: 120,
                type: 'session_duration',
                xpReward: 100,
                category: 'duration'
            },
            'streak_starter': {
                id: 'streak_starter',
                name: 'Streak Starter',
                description: 'Maintain a 3-day streak',
                icon: '🔥',
                requirement: 3,
                type: 'streak',
                xpReward: 75,
                category: 'consistency'
            },
            'week_warrior': {
                id: 'week_warrior',
                name: 'Week Warrior',
                description: 'Maintain a 7-day streak',
                icon: '⚔️',
                requirement: 7,
                type: 'streak',
                xpReward: 150,
                category: 'consistency'
            },
            'goal_crusher': {
                id: 'goal_crusher',
                name: 'Goal Crusher',
                description: 'Meet your daily goal 5 times',
                icon: '🎯',
                requirement: 5,
                type: 'daily_goals',
                xpReward: 100,
                category: 'goals'
            },
            'marathon_master': {
                id: 'marathon_master',
                name: 'Marathon Master',
                description: 'Complete a 4-hour session',
                icon: '🏃',
                requirement: 240,
                type: 'session_duration',
                xpReward: 200,
                category: 'duration'
            },
            'consistency_king': {
                id: 'consistency_king',
                name: 'Consistency King',
                description: 'Maintain a 30-day streak',
                icon: '👑',
                requirement: 30,
                type: 'streak',
                xpReward: 500,
                category: 'consistency'
            },
            'zen_master': {
                id: 'zen_master',
                name: 'Zen Master',
                description: 'Accumulate 100 hours of offline time',
                icon: '🧘‍♂️',
                requirement: 6000,
                type: 'total_minutes',
                xpReward: 1000,
                category: 'mastery'
            }
        };
    }

    loadUserAchievements() {
        return this.storageService.getItem('user_achievements', {});
    }

    saveUserAchievements() {
        this.storageService.setItem('user_achievements', this.userAchievements);
    }

    checkAchievements(userData) {
        const newAchievements = [];

        for (const [achievementId, achievement] of Object.entries(this.achievements)) {
            // Skip if already unlocked
            if (this.userAchievements[achievementId]) {
                continue;
            }

            let isUnlocked = false;

            switch (achievement.type) {
                case 'session_count':
                    isUnlocked = userData.totalSessions >= achievement.requirement;
                    break;
                case 'session_duration':
                    isUnlocked = userData.longestSession >= achievement.requirement;
                    break;
                case 'streak':
                    isUnlocked = userData.currentStreak >= achievement.requirement;
                    break;
                case 'daily_goals':
                    isUnlocked = userData.dailyGoalsMet >= achievement.requirement;
                    break;
                case 'total_minutes':
                    isUnlocked = userData.totalMinutes >= achievement.requirement;
                    break;
                case 'early_session':
                    // Check if any session started before 8 AM
                    isUnlocked = userData.hasEarlySession || false;
                    break;
                case 'late_session':
                    // Check if any session completed after 10 PM
                    isUnlocked = userData.hasLateSession || false;
                    break;
            }

            if (isUnlocked) {
                this.unlockAchievement(achievementId);
                newAchievements.push(achievement);
            }
        }

        return newAchievements;
    }

    unlockAchievement(achievementId) {
        if (!this.userAchievements[achievementId]) {
            this.userAchievements[achievementId] = {
                unlockedAt: new Date().toISOString(),
                viewed: false
            };
            this.saveUserAchievements();
            return true;
        }
        return false;
    }

    markAchievementAsViewed(achievementId) {
        if (this.userAchievements[achievementId]) {
            this.userAchievements[achievementId].viewed = true;
            this.saveUserAchievements();
        }
    }

    getUnlockedAchievements() {
        return Object.keys(this.userAchievements).map(id => ({
            ...this.achievements[id],
            unlockedAt: this.userAchievements[id].unlockedAt,
            viewed: this.userAchievements[id].viewed
        }));
    }

    getAchievementProgress(userData) {
        const progress = {};

        for (const [achievementId, achievement] of Object.entries(this.achievements)) {
            if (this.userAchievements[achievementId]) {
                progress[achievementId] = { completed: true, progress: 100 };
                continue;
            }

            let currentProgress = 0;

            switch (achievement.type) {
                case 'session_count':
                    currentProgress = Math.min(userData.totalSessions / achievement.requirement * 100, 100);
                    break;
                case 'session_duration':
                    currentProgress = Math.min(userData.longestSession / achievement.requirement * 100, 100);
                    break;
                case 'streak':
                    currentProgress = Math.min(userData.currentStreak / achievement.requirement * 100, 100);
                    break;
                case 'daily_goals':
                    currentProgress = Math.min(userData.dailyGoalsMet / achievement.requirement * 100, 100);
                    break;
                case 'total_minutes':
                    currentProgress = Math.min(userData.totalMinutes / achievement.requirement * 100, 100);
                    break;
                default:
                    currentProgress = 0;
            }

            progress[achievementId] = {
                completed: false,
                progress: Math.round(currentProgress)
            };
        }

        return progress;
    }

    getAchievementStats() {
        const total = Object.keys(this.achievements).length;
        const unlocked = Object.keys(this.userAchievements).length;
        
        return {
            total,
            unlocked,
            percentage: Math.round((unlocked / total) * 100)
        };
    }

    getAllAchievements() {
        return this.achievements;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementsService;
}
