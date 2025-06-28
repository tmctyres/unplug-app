import { Observable } from '@nativescript/core';
import { SecurityUtils } from '../utils/security-utils';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  targetMinutes: number;
  unlocked: boolean;
  unlockedAt?: Date;
  category: AchievementCategory;
  rarity: AchievementRarity;
  chainId?: string;
  chainOrder?: number;
  isHidden?: boolean;
  requirements?: AchievementRequirement[];
  progress?: number;
  maxProgress?: number;
  isTimeLimit?: boolean;
  expiresAt?: Date;
}

export enum AchievementCategory {
  TIME_BASED = 'time_based',
  STREAK = 'streak',
  MILESTONE = 'milestone',
  LEVEL = 'level',
  SPECIAL = 'special',
  SEASONAL = 'seasonal',
  COMBO = 'combo',
  TIME_OF_DAY = 'time_of_day',
  WEEKEND = 'weekend',
  SOCIAL = 'social'
}

export enum AchievementRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export interface AchievementRequirement {
  type: 'time' | 'streak' | 'level' | 'achievement' | 'day_of_week' | 'time_of_day';
  value: number | string | string[];
  operator?: 'gte' | 'lte' | 'eq' | 'in';
}

export interface AchievementChain {
  id: string;
  name: string;
  description: string;
  icon: string;
  achievements: string[];
  rewards?: {
    xp: number;
    title?: string;
    badge?: string;
  };
}

export interface SessionGoal {
  id: string;
  title: string;
  targetMinutes: number;
  description?: string;
  category: 'focus' | 'relaxation' | 'creativity' | 'exercise' | 'social' | 'learning' | 'custom';
  isActive: boolean;
  createdAt: Date;
  completedSessions: number;
  totalTargetSessions?: number;
}

export interface SessionNote {
  id: string;
  sessionDate: Date;
  sessionDuration: number;
  note: string;
  mood?: 'great' | 'good' | 'okay' | 'challenging';
  activities?: string[];
  goalId?: string;
  goalAchieved?: boolean;
  createdAt: Date;
}

export interface DailyStats {
  date: string;
  offlineMinutes: number;
  xpEarned: number;
  achievementsUnlocked: string[];
  sessionNotes?: SessionNote[];
  sessionCount?: number;
  goalCompletions?: number;
}

export interface LevelInfo {
  level: number;
  requiredXP: number;
  title: string;
  badge: string;
  xpMultiplier: number;
  unlockedFeatures: string[];
}

export interface UserProfile {
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalOfflineHours: number;
  joinDate: Date;
  achievements: Achievement[];
  achievementChains: AchievementChain[];
  dailyStats: DailyStats[];
  sessionNotes: SessionNote[];
  sessionGoals: SessionGoal[];
  analyticsData?: any; // Will be populated by AnalyticsService
  qualityStats?: {
    excellent: number;
    good: number;
    fair: number;
    short: number;
  };

  // Social data
  socialProfile?: any;
  friendships?: any[];
  circles?: any[];
  circleMemberships?: any[];
  socialNotifications?: any[];
  socialSettings?: any;

  // Additional social properties
  sharedAchievements?: any[];
  anonymousId?: string;
  isPremium?: boolean;

  // Challenge and community properties
  activeChallenges?: any[];
  challengeParticipations?: any[];
  circleInvites?: any[];
  circlePosts?: { [circleId: string]: any[] };

  // Onboarding and tutorial properties
  hasCompletedSocialOnboarding?: boolean;
  socialOnboardingProgress?: any;

  settings: UserSettings;
  userTitle: string;
  userBadge: string;
  xpMultiplier: number;
  totalSessions: number;
  weekendSessions: number;
  morningMeditations: number;
  eveningWinddowns: number;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  darkMode: boolean;
  dailyGoalMinutes: number;
  reminderInterval: number;
  isPremium: boolean;
  subscriptionType: 'free' | 'pro_monthly' | 'pro_yearly' | 'pro_lifetime';
  subscriptionExpiry?: Date;
  showAds: boolean;
  backupEnabled: boolean;
  exportFormat: 'pdf' | 'json';
  minimumSessionMinutes: number;
  hasCompletedOnboarding: boolean;
  preferredTheme: string;
  tutorialProgress?: TutorialProgress;
  featureUnlocks?: FeatureUnlockState;
  personalityProfile?: any;
}

export interface TutorialProgress {
  completedTutorials: string[];
  dismissedTooltips: string[];
  lastTutorialDate?: Date;
  tutorialPreferences: {
    showTooltips: boolean;
    autoAdvance: boolean;
    animationSpeed: 'slow' | 'normal' | 'fast';
  };
}

export interface FeatureUnlockState {
  unlockedFeatures: string[];
  pendingUnlocks: string[];
  unlockHistory: FeatureUnlock[];
}

export interface FeatureUnlock {
  featureId: string;
  unlockedAt: Date;
  trigger: 'level' | 'achievement' | 'session_count' | 'manual';
  triggerValue?: any;
}

/**
 * UserDataService - Singleton service for managing user data, achievements, and progression
 *
 * This service handles:
 * - User profile management and persistence
 * - Achievement system and unlocking logic
 * - XP and leveling system with progressive requirements
 * - Daily statistics tracking and streak management
 * - Session notes and goals management
 * - Settings management with secure storage
 *
 * @extends Observable - Allows other components to listen for data changes
 */
export class UserDataService extends Observable {
  private static instance: UserDataService;
  private userProfile: UserProfile;
  private readonly STORAGE_KEY = 'offtime_user_data';

  /**
   * Progressive leveling system with increasing XP requirements
   * Each level requires more XP than the previous, creating meaningful progression
   */
  private levelSystem: LevelInfo[];

  /**
   * Private constructor to enforce singleton pattern
   * Initializes the level system and loads existing user data
   */
  private constructor() {
    super();
    this.initializeLevelSystem();
    this.loadUserData();
  }

  /**
   * Gets the singleton instance of UserDataService
   * @returns The singleton UserDataService instance
   */
  static getInstance(): UserDataService {
    if (!UserDataService.instance) {
      UserDataService.instance = new UserDataService();
    }
    return UserDataService.instance;
  }

  /**
   * Initializes the progressive leveling system
   * Creates 20 levels with increasing XP requirements and meaningful rewards
   * Each level provides:
   * - Unique title and badge
   * - XP multiplier bonuses
   * - Feature unlocks for enhanced gameplay
   */
  private initializeLevelSystem(): void {
    this.levelSystem = [
      { level: 1, requiredXP: 0, title: "Digital Novice", badge: "🌱", xpMultiplier: 1.0, unlockedFeatures: [] },
      { level: 2, requiredXP: 50, title: "Screen Breaker", badge: "📱", xpMultiplier: 1.0, unlockedFeatures: [] },
      { level: 3, requiredXP: 150, title: "Mindful Beginner", badge: "🧘", xpMultiplier: 1.1, unlockedFeatures: ["streak_bonus"] },
      { level: 4, requiredXP: 300, title: "Focus Finder", badge: "🎯", xpMultiplier: 1.1, unlockedFeatures: ["streak_bonus"] },
      { level: 5, requiredXP: 500, title: "Offline Explorer", badge: "🗺️", xpMultiplier: 1.2, unlockedFeatures: ["streak_bonus", "daily_bonus"] },
      { level: 6, requiredXP: 750, title: "Digital Minimalist", badge: "✨", xpMultiplier: 1.2, unlockedFeatures: ["streak_bonus", "daily_bonus"] },
      { level: 7, requiredXP: 1050, title: "Presence Practitioner", badge: "🌸", xpMultiplier: 1.3, unlockedFeatures: ["streak_bonus", "daily_bonus"] },
      { level: 8, requiredXP: 1400, title: "Mindfulness Warrior", badge: "⚔️", xpMultiplier: 1.3, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus"] },
      { level: 9, requiredXP: 1800, title: "Zen Apprentice", badge: "🕯️", xpMultiplier: 1.4, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus"] },
      { level: 10, requiredXP: 2250, title: "Balance Keeper", badge: "⚖️", xpMultiplier: 1.4, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus"] },
      { level: 11, requiredXP: 2750, title: "Serenity Seeker", badge: "🌊", xpMultiplier: 1.5, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus"] },
      { level: 12, requiredXP: 3300, title: "Digital Sage", badge: "🧙", xpMultiplier: 1.5, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus", "master_bonus"] },
      { level: 13, requiredXP: 3900, title: "Tranquility Master", badge: "🏔️", xpMultiplier: 1.6, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus", "master_bonus"] },
      { level: 14, requiredXP: 4550, title: "Mindful Guardian", badge: "🛡️", xpMultiplier: 1.6, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus", "master_bonus"] },
      { level: 15, requiredXP: 5250, title: "Enlightened Soul", badge: "💫", xpMultiplier: 1.7, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus", "master_bonus"] },
      { level: 16, requiredXP: 6000, title: "Wisdom Keeper", badge: "📿", xpMultiplier: 1.7, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus", "master_bonus"] },
      { level: 17, requiredXP: 6800, title: "Peace Ambassador", badge: "🕊️", xpMultiplier: 1.8, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus", "master_bonus"] },
      { level: 18, requiredXP: 7650, title: "Harmony Architect", badge: "🏛️", xpMultiplier: 1.8, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus", "master_bonus"] },
      { level: 19, requiredXP: 8550, title: "Stillness Sage", badge: "🌌", xpMultiplier: 1.9, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus", "master_bonus"] },
      { level: 20, requiredXP: 9500, title: "Unplug Legend", badge: "👑", xpMultiplier: 2.0, unlockedFeatures: ["streak_bonus", "daily_bonus", "achievement_bonus", "master_bonus", "legend_bonus"] }
    ];
  }

  private loadUserData(): void {
    // Try to load from secure storage first, fallback to regular storage for migration
    let savedData = SecurityUtils.secureStore.getItem(this.STORAGE_KEY);

    if (!savedData) {
      // Fallback to regular storage for existing users
      const { ApplicationSettings } = require('@nativescript/core');
      savedData = ApplicationSettings.getString(this.STORAGE_KEY);

      // If found in regular storage, migrate to secure storage
      if (savedData) {
        SecurityUtils.secureStore.setItem(this.STORAGE_KEY, savedData);
        ApplicationSettings.remove(this.STORAGE_KEY); // Remove from insecure storage
      }
    }

    if (savedData) {
      this.userProfile = JSON.parse(savedData);
      // Convert date strings back to Date objects
      this.userProfile.joinDate = new Date(this.userProfile.joinDate);
      this.userProfile.achievements.forEach(achievement => {
        if (achievement.unlockedAt) {
          achievement.unlockedAt = new Date(achievement.unlockedAt);
        }
      });

      // Migrate existing users to new leveling system
      this.migrateToNewLevelingSystem();
    } else {
      this.initializeNewUser();
    }
  }

  private migrateToNewLevelingSystem(): void {
    // Check if user needs migration (missing new fields)
    if (!this.userProfile.userTitle || !this.userProfile.userBadge || !this.userProfile.xpMultiplier) {
      // Recalculate level based on new system
      this.updateUserLevel();

      // Add missing user profile fields
      if (this.userProfile.totalSessions === undefined) this.userProfile.totalSessions = 0;
      if (this.userProfile.weekendSessions === undefined) this.userProfile.weekendSessions = 0;
      if (this.userProfile.morningMeditations === undefined) this.userProfile.morningMeditations = 0;
      if (this.userProfile.eveningWinddowns === undefined) this.userProfile.eveningWinddowns = 0;
      if (!this.userProfile.achievementChains) this.userProfile.achievementChains = this.getDefaultAchievementChains();
      if (!this.userProfile.sessionNotes) this.userProfile.sessionNotes = [];
      if (!this.userProfile.sessionGoals) this.userProfile.sessionGoals = this.getDefaultSessionGoals();

      // Add missing settings fields
      if (this.userProfile.settings.hasCompletedOnboarding === undefined) {
        this.userProfile.settings.hasCompletedOnboarding = true; // Existing users have completed onboarding
      }
      if (this.userProfile.settings.preferredTheme === undefined) {
        this.userProfile.settings.preferredTheme = 'default';
      }

      // Migrate existing achievements to new format
      this.userProfile.achievements.forEach(achievement => {
        if (!achievement.category) {
          // Assign categories based on achievement ID
          if (achievement.id.includes('level_')) {
            achievement.category = AchievementCategory.LEVEL;
            achievement.rarity = AchievementRarity.COMMON;
          } else if (achievement.id.includes('streak')) {
            achievement.category = AchievementCategory.STREAK;
            achievement.rarity = AchievementRarity.RARE;
          } else if (achievement.id.includes('session') || achievement.id.includes('master') || achievement.id.includes('champion')) {
            achievement.category = AchievementCategory.MILESTONE;
            achievement.rarity = AchievementRarity.EPIC;
          } else {
            achievement.category = AchievementCategory.TIME_BASED;
            achievement.rarity = AchievementRarity.COMMON;
          }
        }
      });

      // Add any missing achievements
      const existingAchievementIds = this.userProfile.achievements.map(a => a.id);
      const newAchievements = this.getDefaultAchievements().filter(a => !existingAchievementIds.includes(a.id));
      this.userProfile.achievements.push(...newAchievements);

      // Save the migrated data
      this.saveUserData();
    }
  }

  private initializeNewUser(): void {
    const defaultLevel = this.levelSystem[0];
    this.userProfile = {
      totalXP: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      totalOfflineHours: 0,
      joinDate: new Date(),
      achievements: this.getDefaultAchievements(),
      achievementChains: this.getDefaultAchievementChains(),
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
        showAds: true,
        backupEnabled: false,
        exportFormat: 'json',
        minimumSessionMinutes: 5,
        hasCompletedOnboarding: false, // Set to false to trigger onboarding
        preferredTheme: 'default',
        tutorialProgress: {
          completedTutorials: [],
          dismissedTooltips: [],
          tutorialPreferences: {
            showTooltips: true,
            autoAdvance: false,
            animationSpeed: 'normal'
          }
        },
        featureUnlocks: {
          unlockedFeatures: ['basic_tracking', 'session_controls'],
          pendingUnlocks: [],
          unlockHistory: []
        }
      }
    };
    this.saveUserData();
  }

  private getDefaultAchievements(): Achievement[] {
    return [
      // === TIME-BASED ACHIEVEMENTS (Common) ===
      {
        id: 'first_steps',
        title: 'First Steps',
        description: 'Complete your first 30 minutes offline',
        icon: '👶',
        xpReward: 50,
        targetMinutes: 30,
        unlocked: false,
        category: AchievementCategory.TIME_BASED,
        rarity: AchievementRarity.COMMON,
        chainId: 'time_mastery',
        chainOrder: 1
      },
      {
        id: 'first_hour',
        title: 'One Hour Hero',
        description: 'Stay offline for 1 hour in a single day',
        icon: '⏰',
        xpReward: 100,
        targetMinutes: 60,
        unlocked: false,
        category: AchievementCategory.TIME_BASED,
        rarity: AchievementRarity.COMMON,
        chainId: 'time_mastery',
        chainOrder: 2
      },
      {
        id: 'three_hours',
        title: 'Three Hour Champion',
        description: 'Stay offline for 3 hours in a single day',
        icon: '🏅',
        xpReward: 300,
        targetMinutes: 180,
        unlocked: false,
        category: AchievementCategory.TIME_BASED,
        rarity: AchievementRarity.RARE,
        chainId: 'time_mastery',
        chainOrder: 3
      },
      {
        id: 'six_hours',
        title: 'Six Hour Master',
        description: 'Stay offline for 6 hours in a single day',
        icon: '🎯',
        xpReward: 600,
        targetMinutes: 360,
        unlocked: false,
        category: AchievementCategory.TIME_BASED,
        rarity: AchievementRarity.EPIC,
        chainId: 'time_mastery',
        chainOrder: 4
      },
      {
        id: 'full_day',
        title: 'Digital Hermit',
        description: 'Stay offline for 24 hours straight',
        icon: '🏔️',
        xpReward: 2000,
        targetMinutes: 1440,
        unlocked: false,
        category: AchievementCategory.TIME_BASED,
        rarity: AchievementRarity.LEGENDARY,
        chainId: 'time_mastery',
        chainOrder: 5
      },
      // === STREAK ACHIEVEMENTS ===
      {
        id: 'three_day_streak',
        title: 'Consistency Champion',
        description: 'Maintain a 3-day streak',
        icon: '🔥',
        xpReward: 300,
        targetMinutes: 0,
        unlocked: false,
        category: AchievementCategory.STREAK,
        rarity: AchievementRarity.COMMON,
        chainId: 'streak_master',
        chainOrder: 1
      },
      {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: '⚡',
        xpReward: 700,
        targetMinutes: 0,
        unlocked: false,
        category: AchievementCategory.STREAK,
        rarity: AchievementRarity.RARE,
        chainId: 'streak_master',
        chainOrder: 2
      },
      {
        id: 'month_master',
        title: 'Month Master',
        description: 'Maintain a 30-day streak',
        icon: '🌙',
        xpReward: 2000,
        targetMinutes: 0,
        unlocked: false,
        category: AchievementCategory.STREAK,
        rarity: AchievementRarity.EPIC,
        chainId: 'streak_master',
        chainOrder: 3
      },
      {
        id: 'century_sage',
        title: 'Century Sage',
        description: 'Maintain a 100-day streak',
        icon: '💯',
        xpReward: 5000,
        targetMinutes: 0,
        unlocked: false,
        category: AchievementCategory.STREAK,
        rarity: AchievementRarity.LEGENDARY,
        chainId: 'streak_master',
        chainOrder: 4
      },
      // === MILESTONE ACHIEVEMENTS ===
      {
        id: 'session_master',
        title: 'Session Master',
        description: 'Complete 10 offline sessions',
        icon: '🌱',
        xpReward: 200,
        targetMinutes: -1,
        unlocked: false,
        category: AchievementCategory.MILESTONE,
        rarity: AchievementRarity.COMMON,
        chainId: 'session_explorer',
        chainOrder: 1
      },
      {
        id: 'session_veteran',
        title: 'Session Veteran',
        description: 'Complete 50 offline sessions',
        icon: '🌿',
        xpReward: 500,
        targetMinutes: -1,
        unlocked: false,
        category: AchievementCategory.MILESTONE,
        rarity: AchievementRarity.RARE,
        chainId: 'session_explorer',
        chainOrder: 2
      },
      {
        id: 'mindful_master',
        title: 'Mindful Master',
        description: 'Reach 50 hours total offline time',
        icon: '🧘‍♂️',
        xpReward: 2500,
        targetMinutes: 3000,
        unlocked: false,
        category: AchievementCategory.MILESTONE,
        rarity: AchievementRarity.EPIC,
        chainId: 'time_accumulator',
        chainOrder: 1
      },
      {
        id: 'unplug_champion',
        title: 'Unplug Champion',
        description: 'Achieve 100 hours total offline time',
        icon: '🏆',
        xpReward: 5000,
        targetMinutes: 6000,
        unlocked: false,
        category: AchievementCategory.MILESTONE,
        rarity: AchievementRarity.LEGENDARY,
        chainId: 'time_accumulator',
        chainOrder: 2
      },
      // === LEVEL-BASED ACHIEVEMENTS ===
      {
        id: 'level_5_master',
        title: 'Rising Star',
        description: 'Reach Level 5 - Offline Explorer',
        icon: '⭐',
        xpReward: 250,
        targetMinutes: -2,
        unlocked: false,
        category: AchievementCategory.LEVEL,
        rarity: AchievementRarity.COMMON
      },
      {
        id: 'level_10_expert',
        title: 'Balance Expert',
        description: 'Reach Level 10 - Balance Keeper',
        icon: '🌟',
        xpReward: 500,
        targetMinutes: -2,
        unlocked: false,
        category: AchievementCategory.LEVEL,
        rarity: AchievementRarity.RARE
      },
      {
        id: 'level_15_legend',
        title: 'Enlightened Being',
        description: 'Reach Level 15 - Enlightened Soul',
        icon: '✨',
        xpReward: 1000,
        targetMinutes: -2,
        unlocked: false,
        category: AchievementCategory.LEVEL,
        rarity: AchievementRarity.EPIC
      },
      {
        id: 'level_20_champion',
        title: 'Ultimate Legend',
        description: 'Reach Level 20 - Unplug Legend',
        icon: '👑',
        xpReward: 2000,
        targetMinutes: -2,
        unlocked: false,
        category: AchievementCategory.LEVEL,
        rarity: AchievementRarity.LEGENDARY
      },

      // === TIME OF DAY ACHIEVEMENTS ===
      {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Start 5 sessions before 8 AM',
        icon: '🌅',
        xpReward: 300,
        targetMinutes: -3,
        unlocked: false,
        category: AchievementCategory.TIME_OF_DAY,
        rarity: AchievementRarity.RARE,
        requirements: [
          { type: 'time_of_day', value: '06:00-08:00' }
        ]
      },
      {
        id: 'night_owl',
        title: 'Night Owl',
        description: 'Start 5 sessions after 10 PM',
        icon: '🦉',
        xpReward: 300,
        targetMinutes: -3,
        unlocked: false,
        category: AchievementCategory.TIME_OF_DAY,
        rarity: AchievementRarity.RARE,
        requirements: [
          { type: 'time_of_day', value: '22:00-23:59' }
        ]
      },
      {
        id: 'lunch_break_zen',
        title: 'Lunch Break Zen',
        description: 'Complete 10 sessions during lunch hours',
        icon: '🥗',
        xpReward: 400,
        targetMinutes: -3,
        unlocked: false,
        category: AchievementCategory.TIME_OF_DAY,
        rarity: AchievementRarity.RARE,
        requirements: [
          { type: 'time_of_day', value: '11:30-13:30' }
        ]
      },

      // === WEEKEND ACHIEVEMENTS ===
      {
        id: 'weekend_warrior',
        title: 'Weekend Warrior',
        description: 'Complete 4+ hour sessions on both weekend days',
        icon: '🏖️',
        xpReward: 600,
        targetMinutes: -4,
        unlocked: false,
        category: AchievementCategory.WEEKEND,
        rarity: AchievementRarity.EPIC,
        requirements: [
          { type: 'day_of_week', value: ['saturday', 'sunday'] },
          { type: 'time', value: 240, operator: 'gte' }
        ]
      },
      {
        id: 'sunday_serenity',
        title: 'Sunday Serenity',
        description: 'Complete 6+ hours offline every Sunday for a month',
        icon: '☮️',
        xpReward: 1000,
        targetMinutes: -4,
        unlocked: false,
        category: AchievementCategory.WEEKEND,
        rarity: AchievementRarity.LEGENDARY,
        requirements: [
          { type: 'day_of_week', value: ['sunday'] },
          { type: 'time', value: 360, operator: 'gte' }
        ]
      },

      // === COMBO ACHIEVEMENTS ===
      {
        id: 'perfect_week',
        title: 'Perfect Week',
        description: 'Meet daily goal every day for a week',
        icon: '💎',
        xpReward: 1500,
        targetMinutes: -5,
        unlocked: false,
        category: AchievementCategory.COMBO,
        rarity: AchievementRarity.EPIC
      },
      {
        id: 'triple_threat',
        title: 'Triple Threat',
        description: 'Complete morning, afternoon, and evening sessions in one day',
        icon: '🎯',
        xpReward: 500,
        targetMinutes: -5,
        unlocked: false,
        category: AchievementCategory.COMBO,
        rarity: AchievementRarity.RARE
      },

      // === SEASONAL ACHIEVEMENTS ===
      {
        id: 'new_year_resolution',
        title: 'New Year, New Me',
        description: 'Complete 31 days of digital wellness in January',
        icon: '🎊',
        xpReward: 2000,
        targetMinutes: -6,
        unlocked: false,
        category: AchievementCategory.SEASONAL,
        rarity: AchievementRarity.LEGENDARY,
        isTimeLimit: true,
        expiresAt: new Date(new Date().getFullYear(), 1, 31) // January 31st
      },
      {
        id: 'summer_solstice',
        title: 'Summer Solstice',
        description: 'Spend the longest day of the year mostly offline (12+ hours)',
        icon: '☀️',
        xpReward: 1200,
        targetMinutes: 720,
        unlocked: false,
        category: AchievementCategory.SEASONAL,
        rarity: AchievementRarity.EPIC,
        isTimeLimit: true
      },
      {
        id: 'digital_detox_week',
        title: 'Digital Detox Week',
        description: 'Complete a 7-day digital detox challenge',
        icon: '🌿',
        xpReward: 3000,
        targetMinutes: -6,
        unlocked: false,
        category: AchievementCategory.SEASONAL,
        rarity: AchievementRarity.LEGENDARY,
        isTimeLimit: true
      }
    ];
  }

  private getDefaultAchievementChains(): AchievementChain[] {
    return [
      {
        id: 'time_mastery',
        name: 'Time Mastery',
        description: 'Master the art of extended offline sessions',
        icon: '⏳',
        achievements: ['first_steps', 'first_hour', 'three_hours', 'six_hours', 'full_day'],
        rewards: {
          xp: 1000,
          title: 'Time Master',
          badge: '⏳'
        }
      },
      {
        id: 'streak_master',
        name: 'Streak Master',
        description: 'Build and maintain impressive streaks',
        icon: '🔥',
        achievements: ['three_day_streak', 'week_warrior', 'month_master', 'century_sage'],
        rewards: {
          xp: 2000,
          title: 'Streak Legend',
          badge: '🔥'
        }
      },
      {
        id: 'session_explorer',
        name: 'Session Explorer',
        description: 'Explore the depths of mindful sessions',
        icon: '🌱',
        achievements: ['session_master', 'session_veteran'],
        rewards: {
          xp: 500,
          title: 'Session Sage',
          badge: '🌱'
        }
      },
      {
        id: 'time_accumulator',
        name: 'Time Accumulator',
        description: 'Accumulate massive amounts of offline time',
        icon: '🏆',
        achievements: ['mindful_master', 'unplug_champion'],
        rewards: {
          xp: 3000,
          title: 'Time Collector',
          badge: '🏆'
        }
      }
    ];
  }

  getUserProfile(): UserProfile {
    return this.userProfile;
  }

  needsOnboarding(): boolean {
    return !this.userProfile.settings.hasCompletedOnboarding;
  }

  completeOnboarding(): void {
    this.userProfile.settings.hasCompletedOnboarding = true;
    this.saveUserData();
  }

  markTooltipDismissed(tooltipId: string): void {
    if (!this.userProfile.settings.tutorialProgress) {
      this.userProfile.settings.tutorialProgress = {
        completedTutorials: [],
        dismissedTooltips: [],
        tutorialPreferences: {
          showTooltips: true,
          autoAdvance: false,
          animationSpeed: 'normal'
        }
      };
    }

    if (!this.userProfile.settings.tutorialProgress.dismissedTooltips.includes(tooltipId)) {
      this.userProfile.settings.tutorialProgress.dismissedTooltips.push(tooltipId);
      this.saveUserData();
    }
  }

  updateAnalyticsData(analyticsData: any): void {
    this.userProfile.analyticsData = analyticsData;
    this.saveUserData();
  }

  getAnalyticsData(): any {
    return this.userProfile.analyticsData;
  }



  addSessionNote(sessionDuration: number, note: string, mood?: 'great' | 'good' | 'okay' | 'challenging', activities?: string[]): string {
    const sessionNote: SessionNote = {
      id: this.generateId(),
      sessionDate: new Date(),
      sessionDuration,
      note,
      mood,
      activities: activities || [],
      createdAt: new Date()
    };

    this.userProfile.sessionNotes.push(sessionNote);

    // Also add to today's stats for easy access
    const today = new Date().toDateString();
    let todayStats = this.userProfile.dailyStats.find(stat => stat.date === today);

    if (todayStats) {
      if (!todayStats.sessionNotes) {
        todayStats.sessionNotes = [];
      }
      todayStats.sessionNotes.push(sessionNote);
    }

    this.saveUserData();
    return sessionNote.id;
  }

  getSessionNotes(limit?: number): SessionNote[] {
    const notes = [...this.userProfile.sessionNotes].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return limit ? notes.slice(0, limit) : notes;
  }

  getSessionNotesByDate(date: Date): SessionNote[] {
    const dateString = date.toDateString();
    return this.userProfile.sessionNotes.filter(note =>
      new Date(note.sessionDate).toDateString() === dateString
    );
  }

  updateSessionNote(noteId: string, updates: Partial<SessionNote>): boolean {
    const noteIndex = this.userProfile.sessionNotes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) return false;

    Object.assign(this.userProfile.sessionNotes[noteIndex], updates);
    this.saveUserData();
    return true;
  }

  deleteSessionNote(noteId: string): boolean {
    const noteIndex = this.userProfile.sessionNotes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) return false;

    this.userProfile.sessionNotes.splice(noteIndex, 1);

    // Also remove from daily stats
    this.userProfile.dailyStats.forEach(stat => {
      if (stat.sessionNotes) {
        stat.sessionNotes = stat.sessionNotes.filter(note => note.id !== noteId);
      }
    });

    this.saveUserData();
    return true;
  }

  getSessionNotesStats(): { totalNotes: number; averageLength: number; mostCommonMood: string | null } {
    const notes = this.userProfile.sessionNotes;
    const totalNotes = notes.length;

    if (totalNotes === 0) {
      return { totalNotes: 0, averageLength: 0, mostCommonMood: null };
    }

    const averageLength = notes.reduce((sum, note) => sum + note.note.length, 0) / totalNotes;

    const moodCounts = notes.reduce((counts, note) => {
      if (note.mood) {
        counts[note.mood] = (counts[note.mood] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);

    const mostCommonMood = Object.keys(moodCounts).length > 0
      ? Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b)
      : null;

    return { totalNotes, averageLength: Math.round(averageLength), mostCommonMood };
  }

  private getDefaultSessionGoals(): SessionGoal[] {
    return [
      {
        id: this.generateId(),
        title: 'Quick Focus Break',
        targetMinutes: 15,
        description: 'Short focused break for mental clarity',
        category: 'focus',
        isActive: true,
        createdAt: new Date(),
        completedSessions: 0,
        totalTargetSessions: 10
      },
      {
        id: this.generateId(),
        title: 'Deep Work Session',
        targetMinutes: 60,
        description: 'Extended focus time for important tasks',
        category: 'focus',
        isActive: true,
        createdAt: new Date(),
        completedSessions: 0,
        totalTargetSessions: 5
      },
      {
        id: this.generateId(),
        title: 'Mindful Relaxation',
        targetMinutes: 30,
        description: 'Peaceful time for meditation or rest',
        category: 'relaxation',
        isActive: true,
        createdAt: new Date(),
        completedSessions: 0,
        totalTargetSessions: 7
      },
      {
        id: this.generateId(),
        title: 'Creative Flow',
        targetMinutes: 45,
        description: 'Uninterrupted time for creative pursuits',
        category: 'creativity',
        isActive: true,
        createdAt: new Date(),
        completedSessions: 0,
        totalTargetSessions: 3
      }
    ];
  }

  // Session Goals Management
  getSessionGoals(): SessionGoal[] {
    return this.userProfile.sessionGoals.filter(goal => goal.isActive);
  }

  getAllSessionGoals(): SessionGoal[] {
    return [...this.userProfile.sessionGoals];
  }

  getSessionGoalById(goalId: string): SessionGoal | null {
    return this.userProfile.sessionGoals.find(goal => goal.id === goalId) || null;
  }

  createSessionGoal(title: string, targetMinutes: number, description: string, category: SessionGoal['category']): string {
    const goal: SessionGoal = {
      id: this.generateId(),
      title,
      targetMinutes,
      description,
      category,
      isActive: true,
      createdAt: new Date(),
      completedSessions: 0
    };

    this.userProfile.sessionGoals.push(goal);
    this.saveUserData();
    return goal.id;
  }

  updateSessionGoal(goalId: string, updates: Partial<SessionGoal>): boolean {
    const goalIndex = this.userProfile.sessionGoals.findIndex(goal => goal.id === goalId);
    if (goalIndex === -1) return false;

    Object.assign(this.userProfile.sessionGoals[goalIndex], updates);
    this.saveUserData();
    return true;
  }

  deleteSessionGoal(goalId: string): boolean {
    const goalIndex = this.userProfile.sessionGoals.findIndex(goal => goal.id === goalId);
    if (goalIndex === -1) return false;

    this.userProfile.sessionGoals.splice(goalIndex, 1);
    this.saveUserData();
    return true;
  }

  completeSessionGoal(goalId: string, sessionDuration: number): boolean {
    const goal = this.getSessionGoalById(goalId);
    if (!goal) return false;

    // Check if session meets the goal target
    const goalAchieved = sessionDuration >= goal.targetMinutes;

    if (goalAchieved) {
      goal.completedSessions++;

      // Check if goal series is complete
      if (goal.totalTargetSessions && goal.completedSessions >= goal.totalTargetSessions) {
        this.notifyPropertyChange('goalSeriesCompleted', {
          goal,
          totalSessions: goal.completedSessions
        });
      }

      this.saveUserData();

      // Emit goal completion event
      this.notifyPropertyChange('goalCompleted', {
        goal,
        sessionDuration,
        isSeriesComplete: goal.totalTargetSessions ? goal.completedSessions >= goal.totalTargetSessions : false
      });
    }

    return goalAchieved;
  }

  getGoalProgress(goalId: string): { completed: number; target: number | null; percentage: number } {
    const goal = this.getSessionGoalById(goalId);
    if (!goal) return { completed: 0, target: null, percentage: 0 };

    const target = goal.totalTargetSessions;
    const completed = goal.completedSessions;
    const percentage = target ? Math.min((completed / target) * 100, 100) : 0;

    return { completed, target, percentage };
  }

  getGoalsByCategory(category: SessionGoal['category']): SessionGoal[] {
    return this.getSessionGoals().filter(goal => goal.category === category);
  }

  getRecommendedGoals(sessionDuration?: number): SessionGoal[] {
    const goals = this.getSessionGoals();

    if (sessionDuration) {
      // Recommend goals that match the session duration (within 15 minutes)
      return goals.filter(goal =>
        Math.abs(goal.targetMinutes - sessionDuration) <= 15
      ).sort((a, b) =>
        Math.abs(a.targetMinutes - sessionDuration) - Math.abs(b.targetMinutes - sessionDuration)
      );
    }

    // Return goals with lowest completion rates
    return goals.sort((a, b) => {
      const aProgress = this.getGoalProgress(a.id).percentage;
      const bProgress = this.getGoalProgress(b.id).percentage;
      return aProgress - bProgress;
    }).slice(0, 3);
  }



  updatePersonalBests(personalBests: any[]): void {
    if (!this.userProfile.analyticsData) {
      this.userProfile.analyticsData = {};
    }
    this.userProfile.analyticsData.personalBests = personalBests;
    this.saveUserData();
  }

  getPersonalBests(): any[] {
    return this.userProfile.analyticsData?.personalBests || [];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  addOfflineTime(minutes: number, sessionStartTime?: Date): void {
    const today = new Date().toDateString();
    let todayStats = this.userProfile.dailyStats.find(stat => stat.date === today);

    if (!todayStats) {
      todayStats = {
        date: today,
        offlineMinutes: 0,
        xpEarned: 0,
        achievementsUnlocked: []
      };
      this.userProfile.dailyStats.push(todayStats);
    }

    todayStats.offlineMinutes += minutes;
    this.userProfile.totalOfflineHours += minutes / 60;

    // Update session tracking
    this.userProfile.totalSessions++;

    // Track time-of-day and weekend sessions
    const sessionTime = sessionStartTime || new Date();
    this.updateSessionTracking(sessionTime, minutes);

    // Calculate XP with multipliers and bonuses
    const baseXP = minutes; // 1 XP per minute base
    const xpGained = this.calculateXPWithBonuses(baseXP);
    todayStats.xpEarned += xpGained;

    const previousLevel = this.userProfile.level;
    this.userProfile.totalXP += xpGained;

    // Update level using progressive system
    this.updateUserLevel();

    // Check for level up
    if (this.userProfile.level > previousLevel) {
      this.onLevelUp(previousLevel, this.userProfile.level);
    }

    // Check for streak milestones
    this.checkStreakMilestones();

    // Check for achievements
    this.checkAllAchievements(todayStats.offlineMinutes, sessionTime, minutes);

    // Update streak
    this.updateStreak();

    this.saveUserData();
    this.notifyPropertyChange('userProfile', this.userProfile);
  }

  private calculateXPWithBonuses(baseXP: number): number {
    let multipliedXP = baseXP * this.userProfile.xpMultiplier;

    // Streak bonus (if unlocked)
    if (this.userProfile.xpMultiplier > 1.0 && this.userProfile.currentStreak >= 3) {
      const streakBonus = Math.min(this.userProfile.currentStreak * 0.05, 0.5); // Max 50% bonus
      multipliedXP *= (1 + streakBonus);
    }

    // Daily goal bonus (if unlocked and goal met)
    const todayStats = this.getTodayStats();
    if (todayStats && this.hasUnlockedFeature('daily_bonus')) {
      const dailyGoalMinutes = this.userProfile.settings.dailyGoalMinutes;
      if (todayStats.offlineMinutes >= dailyGoalMinutes) {
        multipliedXP *= 1.25; // 25% bonus for meeting daily goal
      }
    }

    return Math.round(multipliedXP);
  }

  private updateUserLevel(): void {
    let newLevel = 1;

    // Find the highest level the user qualifies for
    for (let i = this.levelSystem.length - 1; i >= 0; i--) {
      if (this.userProfile.totalXP >= this.levelSystem[i].requiredXP) {
        newLevel = this.levelSystem[i].level;
        break;
      }
    }

    // Update user level and associated properties
    if (newLevel !== this.userProfile.level) {
      this.userProfile.level = newLevel;
      const levelInfo = this.getLevelInfo(newLevel);
      this.userProfile.userTitle = levelInfo.title;
      this.userProfile.userBadge = levelInfo.badge;
      this.userProfile.xpMultiplier = levelInfo.xpMultiplier;
    }
  }

  private onLevelUp(oldLevel: number, newLevel: number): void {
    // This method can be extended to trigger level-up celebrations
    // For now, we'll just log the level up
    console.log(`Level up! ${oldLevel} -> ${newLevel}`);

    // Unlock level-based achievements
    this.checkLevelBasedAchievements(newLevel);

    // Could trigger notifications, animations, etc.
    this.notifyPropertyChange('levelUp', { oldLevel, newLevel });
  }

  private hasUnlockedFeature(feature: string): boolean {
    const levelInfo = this.getLevelInfo(this.userProfile.level);
    return levelInfo.unlockedFeatures.includes(feature);
  }

  private checkLevelBasedAchievements(level: number): void {
    // Add level-based achievements here
    if (level >= 5) {
      this.unlockAchievement('level_5_master');
    }
    if (level >= 10) {
      this.unlockAchievement('level_10_expert');
    }
    if (level >= 15) {
      this.unlockAchievement('level_15_legend');
    }
    if (level >= 20) {
      this.unlockAchievement('level_20_champion');
    }
  }

  getLevelInfo(level: number): LevelInfo {
    const levelInfo = this.levelSystem.find(l => l.level === level);
    return levelInfo || this.levelSystem[0]; // Default to level 1 if not found
  }

  getXPForNextLevel(): number {
    const currentLevel = this.userProfile.level;
    const nextLevelInfo = this.levelSystem.find(l => l.level === currentLevel + 1);

    if (!nextLevelInfo) {
      return 0; // Max level reached
    }

    return nextLevelInfo.requiredXP - this.userProfile.totalXP;
  }

  getLevelProgress(): number {
    const currentLevel = this.userProfile.level;
    const currentLevelInfo = this.getLevelInfo(currentLevel);
    const nextLevelInfo = this.levelSystem.find(l => l.level === currentLevel + 1);

    if (!nextLevelInfo) {
      return 100; // Max level reached
    }

    const currentLevelXP = currentLevelInfo.requiredXP;
    const nextLevelXP = nextLevelInfo.requiredXP;
    const progressXP = this.userProfile.totalXP - currentLevelXP;
    const totalXPNeeded = nextLevelXP - currentLevelXP;

    return Math.min(100, (progressXP / totalXPNeeded) * 100);
  }

  // Achievement rarity helper methods
  getRarityColor(rarity: AchievementRarity): string {
    switch (rarity) {
      case AchievementRarity.COMMON: return '#6b7280'; // Gray
      case AchievementRarity.RARE: return '#3b82f6'; // Blue
      case AchievementRarity.EPIC: return '#8b5cf6'; // Purple
      case AchievementRarity.LEGENDARY: return '#f59e0b'; // Gold
      default: return '#6b7280';
    }
  }

  getRarityName(rarity: AchievementRarity): string {
    switch (rarity) {
      case AchievementRarity.COMMON: return 'Common';
      case AchievementRarity.RARE: return 'Rare';
      case AchievementRarity.EPIC: return 'Epic';
      case AchievementRarity.LEGENDARY: return 'Legendary';
      default: return 'Common';
    }
  }

  getCategoryName(category: AchievementCategory): string {
    switch (category) {
      case AchievementCategory.TIME_BASED: return 'Time-based';
      case AchievementCategory.STREAK: return 'Streak';
      case AchievementCategory.MILESTONE: return 'Milestone';
      case AchievementCategory.LEVEL: return 'Level';
      case AchievementCategory.SPECIAL: return 'Special';
      case AchievementCategory.SEASONAL: return 'Seasonal';
      case AchievementCategory.COMBO: return 'Combo';
      case AchievementCategory.TIME_OF_DAY: return 'Time of Day';
      case AchievementCategory.WEEKEND: return 'Weekend';
      case AchievementCategory.SOCIAL: return 'Social';
      default: return 'Unknown';
    }
  }

  getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return this.userProfile.achievements.filter(a => a.category === category);
  }

  getAchievementsByRarity(rarity: AchievementRarity): Achievement[] {
    return this.userProfile.achievements.filter(a => a.rarity === rarity);
  }

  getUnlockedAchievements(): Achievement[] {
    return this.userProfile.achievements.filter(a => a.unlocked);
  }

  getLockedAchievements(): Achievement[] {
    return this.userProfile.achievements.filter(a => !a.unlocked);
  }

  getAchievementProgress(achievement: Achievement): number {
    if (achievement.unlocked) return 100;

    switch (achievement.category) {
      case AchievementCategory.TIME_BASED:
        if (achievement.targetMinutes <= 1440) {
          const todayStats = this.getTodayStats();
          const progress = todayStats ? todayStats.offlineMinutes : 0;
          return Math.min(100, (progress / achievement.targetMinutes) * 100);
        } else {
          const totalMinutes = this.userProfile.totalOfflineHours * 60;
          return Math.min(100, (totalMinutes / achievement.targetMinutes) * 100);
        }
      case AchievementCategory.STREAK:
        const targetDays = achievement.id === 'three_day_streak' ? 3 :
                          achievement.id === 'week_warrior' ? 7 :
                          achievement.id === 'month_master' ? 30 :
                          achievement.id === 'century_sage' ? 100 : 1;
        return Math.min(100, (this.userProfile.currentStreak / targetDays) * 100);
      case AchievementCategory.MILESTONE:
        if (achievement.targetMinutes === -1) {
          const targetSessions = achievement.id === 'session_master' ? 10 :
                                 achievement.id === 'session_veteran' ? 50 : 1;
          return Math.min(100, (this.userProfile.totalSessions / targetSessions) * 100);
        }
        break;
      default:
        return 0;
    }
    return 0;
  }

  private updateSessionTracking(sessionTime: Date, minutes: number): void {
    const hour = sessionTime.getHours();
    const dayOfWeek = sessionTime.getDay(); // 0 = Sunday, 6 = Saturday

    // Track morning sessions (6 AM - 10 AM)
    if (hour >= 6 && hour < 10) {
      this.userProfile.morningMeditations++;
    }

    // Track evening sessions (6 PM - 10 PM)
    if (hour >= 18 && hour < 22) {
      this.userProfile.eveningWinddowns++;
    }

    // Track weekend sessions
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      this.userProfile.weekendSessions++;
    }
  }

  private checkAllAchievements(sessionMinutes: number, sessionTime: Date, totalMinutes: number): void {
    this.userProfile.achievements.forEach(achievement => {
      if (achievement.unlocked) return;

      let shouldUnlock = false;

      switch (achievement.category) {
        case AchievementCategory.TIME_BASED:
          shouldUnlock = this.checkTimeBasedAchievement(achievement);
          break;
        case AchievementCategory.STREAK:
          shouldUnlock = this.checkStreakAchievement(achievement);
          break;
        case AchievementCategory.MILESTONE:
          shouldUnlock = this.checkMilestoneAchievement(achievement);
          break;
        case AchievementCategory.LEVEL:
          shouldUnlock = this.checkLevelAchievement(achievement);
          break;
        case AchievementCategory.TIME_OF_DAY:
          shouldUnlock = this.checkTimeOfDayAchievement(achievement, sessionTime);
          break;
        case AchievementCategory.WEEKEND:
          shouldUnlock = this.checkWeekendAchievement(achievement, sessionTime, totalMinutes);
          break;
        case AchievementCategory.COMBO:
          shouldUnlock = this.checkComboAchievement(achievement);
          break;
        case AchievementCategory.SEASONAL:
          shouldUnlock = this.checkSeasonalAchievement(achievement);
          break;
      }

      if (shouldUnlock) {
        this.unlockAchievement(achievement.id);
      }
    });

    // Check achievement chains
    this.checkAchievementChains();
  }

  private checkTimeBasedAchievement(achievement: Achievement): boolean {
    if (achievement.targetMinutes <= 0) return false;

    const todayStats = this.getTodayStats();
    const todayOfflineMinutes = todayStats ? todayStats.offlineMinutes : 0;

    if (achievement.targetMinutes <= 1440) {
      // Daily achievements
      return todayOfflineMinutes >= achievement.targetMinutes;
    } else {
      // Total time achievements
      const totalOfflineMinutes = this.userProfile.totalOfflineHours * 60;
      return totalOfflineMinutes >= achievement.targetMinutes;
    }
  }

  private checkStreakAchievement(achievement: Achievement): boolean {
    const targetDays = achievement.id === 'three_day_streak' ? 3 :
                      achievement.id === 'week_warrior' ? 7 :
                      achievement.id === 'month_master' ? 30 :
                      achievement.id === 'century_sage' ? 100 : 0;

    return this.userProfile.currentStreak >= targetDays;
  }

  private checkMilestoneAchievement(achievement: Achievement): boolean {
    if (achievement.targetMinutes === -1) {
      // Session count achievements
      const targetSessions = achievement.id === 'session_master' ? 10 :
                             achievement.id === 'session_veteran' ? 50 : 0;
      return this.userProfile.totalSessions >= targetSessions;
    } else if (achievement.targetMinutes > 1440) {
      // Total time achievements
      const totalOfflineMinutes = this.userProfile.totalOfflineHours * 60;
      return totalOfflineMinutes >= achievement.targetMinutes;
    }
    return false;
  }

  private checkLevelAchievement(achievement: Achievement): boolean {
    const targetLevel = achievement.id === 'level_5_master' ? 5 :
                       achievement.id === 'level_10_expert' ? 10 :
                       achievement.id === 'level_15_legend' ? 15 :
                       achievement.id === 'level_20_champion' ? 20 : 0;

    return this.userProfile.level >= targetLevel;
  }

  private checkTimeOfDayAchievement(achievement: Achievement, sessionTime: Date): boolean {
    const hour = sessionTime.getHours();

    switch (achievement.id) {
      case 'early_bird':
        return hour >= 6 && hour < 8 && this.userProfile.morningMeditations >= 5;
      case 'night_owl':
        return hour >= 22 && this.userProfile.eveningWinddowns >= 5;
      case 'lunch_break_zen':
        return hour >= 11.5 && hour < 13.5 && this.userProfile.totalSessions >= 10;
      default:
        return false;
    }
  }

  private checkWeekendAchievement(achievement: Achievement, sessionTime: Date, minutes: number): boolean {
    const dayOfWeek = sessionTime.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    switch (achievement.id) {
      case 'weekend_warrior':
        return isWeekend && minutes >= 240 && this.userProfile.weekendSessions >= 2;
      case 'sunday_serenity':
        return dayOfWeek === 0 && minutes >= 360 && this.userProfile.weekendSessions >= 4;
      default:
        return false;
    }
  }

  private checkComboAchievement(achievement: Achievement): boolean {
    switch (achievement.id) {
      case 'perfect_week':
        // Check if user met daily goal for 7 consecutive days
        const recentStats = this.userProfile.dailyStats.slice(-7);
        return recentStats.length === 7 &&
               recentStats.every(stat => stat.offlineMinutes >= this.userProfile.settings.dailyGoalMinutes);
      case 'triple_threat':
        // Check if user had morning, afternoon, and evening sessions today
        return this.userProfile.morningMeditations > 0 &&
               this.userProfile.eveningWinddowns > 0 &&
               this.userProfile.totalSessions >= 3;
      default:
        return false;
    }
  }

  private checkSeasonalAchievement(achievement: Achievement): boolean {
    const now = new Date();

    // Check if achievement is still available (not expired)
    if (achievement.isTimeLimit && achievement.expiresAt && now > achievement.expiresAt) {
      return false;
    }

    switch (achievement.id) {
      case 'new_year_resolution':
        return now.getMonth() === 0 && this.userProfile.currentStreak >= 31;
      case 'summer_solstice':
        // Check if it's around summer solstice (June 20-22) and user has 12+ hours
        const isJune = now.getMonth() === 5;
        const isSolstice = now.getDate() >= 20 && now.getDate() <= 22;
        const todayStats = this.getTodayStats();
        const todayMinutes = todayStats ? todayStats.offlineMinutes : 0;
        return isJune && isSolstice && todayMinutes >= 720;
      case 'digital_detox_week':
        return this.userProfile.currentStreak >= 7;
      default:
        return false;
    }
  }

  private checkAchievementChains(): void {
    this.userProfile.achievementChains.forEach(chain => {
      const chainAchievements = chain.achievements.map(id =>
        this.userProfile.achievements.find(a => a.id === id)
      );

      const allUnlocked = chainAchievements.every(achievement =>
        achievement && achievement.unlocked
      );

      if (allUnlocked && chain.rewards) {
        // Award chain completion bonus
        this.userProfile.totalXP += chain.rewards.xp;

        // Could trigger special chain completion notification
        this.notifyPropertyChange('chainCompleted', chain);
      }
    });
  }

  private checkAchievements(sessionMinutes: number): void {
    this.userProfile.achievements.forEach(achievement => {
      if (achievement.unlocked) return;

      let shouldUnlock = false;

      // Daily time-based achievements
      if (achievement.targetMinutes > 0 && achievement.targetMinutes <= 1440) {
        const todayStats = this.getTodayStats();
        const todayOfflineMinutes = todayStats ? todayStats.offlineMinutes : 0;
        shouldUnlock = todayOfflineMinutes >= achievement.targetMinutes;
      }
      // Total time achievements (50+ hours)
      else if (achievement.targetMinutes > 1440) {
        const totalOfflineMinutes = this.userProfile.totalOfflineHours * 60;
        shouldUnlock = totalOfflineMinutes >= achievement.targetMinutes;
      }
      // Session count achievements
      else if (achievement.targetMinutes === -1) {
        const totalSessions = this.userProfile.dailyStats.reduce((sum, stat) => {
          // Estimate sessions (rough calculation: every 30+ minutes = 1 session)
          return sum + Math.ceil(stat.offlineMinutes / 30);
        }, 0);
        shouldUnlock = totalSessions >= 10; // For session_master
      }

      if (shouldUnlock) {
        this.unlockAchievement(achievement.id);
      }
    });

    // Check streak achievements
    if (this.userProfile.currentStreak >= 3) {
      this.unlockAchievement('three_day_streak');
    }
    if (this.userProfile.currentStreak >= 7) {
      this.unlockAchievement('week_warrior');
    }
  }

  private unlockAchievement(achievementId: string): void {
    const achievement = this.userProfile.achievements.find(a => a.id === achievementId);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date();

      // Award XP with rarity bonus
      let xpReward = achievement.xpReward;
      const rarityMultiplier = this.getRarityXPMultiplier(achievement.rarity);
      xpReward = Math.round(xpReward * rarityMultiplier);

      this.userProfile.totalXP += xpReward;

      const today = new Date().toDateString();
      const todayStats = this.userProfile.dailyStats.find(stat => stat.date === today);
      if (todayStats) {
        todayStats.achievementsUnlocked.push(achievementId);
        todayStats.xpEarned += xpReward;
      }

      // Enhanced notification with rarity and category info
      this.notifyPropertyChange('achievementUnlocked', {
        ...achievement,
        actualXPReward: xpReward,
        rarityName: this.getRarityName(achievement.rarity),
        categoryName: this.getCategoryName(achievement.category),
        rarityColor: this.getRarityColor(achievement.rarity)
      });
    }
  }

  private getRarityXPMultiplier(rarity: AchievementRarity): number {
    switch (rarity) {
      case AchievementRarity.COMMON: return 1.0;
      case AchievementRarity.RARE: return 1.2;
      case AchievementRarity.EPIC: return 1.5;
      case AchievementRarity.LEGENDARY: return 2.0;
      default: return 1.0;
    }
  }

  private updateStreak(): void {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStats = this.userProfile.dailyStats.find(stat => stat.date === today.toDateString());
    const yesterdayStats = this.userProfile.dailyStats.find(stat => stat.date === yesterday.toDateString());

    if (todayStats && todayStats.offlineMinutes >= this.userProfile.settings.dailyGoalMinutes) {
      if (yesterdayStats && yesterdayStats.offlineMinutes >= this.userProfile.settings.dailyGoalMinutes) {
        // Continue streak
        this.userProfile.currentStreak++;
      } else {
        // Start new streak
        this.userProfile.currentStreak = 1;
      }

      if (this.userProfile.currentStreak > this.userProfile.longestStreak) {
        this.userProfile.longestStreak = this.userProfile.currentStreak;
      }
    }
  }

  private checkStreakMilestones(): void {
    const streak = this.userProfile.currentStreak;
    const milestones = [3, 7, 14, 30, 60, 100];

    if (milestones.includes(streak)) {
      // Emit streak milestone event
      this.notifyPropertyChange('streakMilestone', {
        streak,
        isNewRecord: streak > this.userProfile.longestStreak
      });
    }
  }

  /**
   * Saves user data to secure storage
   * Uses SecurityUtils.secureStore for encrypted storage of sensitive user information
   * Called automatically after any data modifications to ensure persistence
   */
  saveUserData(): void {
    // Use secure storage for sensitive user data
    const userData = JSON.stringify(this.userProfile);
    SecurityUtils.secureStore.setItem(this.STORAGE_KEY, userData);
  }

  /**
   * Updates user settings with new values
   * @param newSettings - Partial settings object with values to update
   */
  updateSettings(newSettings: Partial<UserSettings>): void {
    this.userProfile.settings = { ...this.userProfile.settings, ...newSettings };
    this.saveUserData();
    this.notifyPropertyChange('settings', this.userProfile.settings);
  }

  /**
   * Gets the current user settings
   * @returns Current user settings object
   */
  getSettings(): UserSettings {
    return this.userProfile.settings;
  }

  /**
   * Calculates the user's level based on total XP
   * @param totalXP - The user's total experience points
   * @returns The calculated level
   */
  private calculateLevel(totalXP: number): number {
    // Progressive XP requirements: 50, 100, 200, 400, 800, etc.
    let level = 1;
    let xpRequired = 50;
    let totalRequired = 0;

    while (totalXP >= totalRequired + xpRequired) {
      totalRequired += xpRequired;
      level++;
      xpRequired *= 2; // Double XP requirement for next level
    }

    return level;
  }

  /**
   * Checks if the user has leveled up and handles level progression
   * Called after XP changes to determine if a level up has occurred
   */
  checkLevelUp(): void {
    const currentLevel = this.userProfile.level;
    const newLevel = this.calculateLevel(this.userProfile.totalXP);

    if (newLevel > currentLevel) {
      this.userProfile.level = newLevel;

      // Emit level up event
      this.notifyPropertyChange('levelUp', {
        oldLevel: currentLevel,
        newLevel: newLevel,
        totalXP: this.userProfile.totalXP
      });

      this.saveUserData();
    }
  }

  /**
   * Gets today's statistics
   * @returns Today's daily stats or null if no data exists
   */
  getTodayStats(): DailyStats | null {
    const today = new Date().toDateString();
    return this.userProfile.dailyStats.find(stat => stat.date === today) || null;
  }

  getWeeklyStats(): DailyStats[] {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return this.userProfile.dailyStats.filter(stat => {
      const statDate = new Date(stat.date);
      return statDate >= weekAgo;
    });
  }
}