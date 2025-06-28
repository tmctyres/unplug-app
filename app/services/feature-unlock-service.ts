import { Observable } from '@nativescript/core';
import { UserDataService, FeatureUnlock } from '../models/user-data';

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'core' | 'social' | 'analytics' | 'premium' | 'gamification';
  unlockConditions: UnlockCondition[];
  dependencies?: string[]; // Other features that must be unlocked first
  priority: number; // Lower numbers unlock first
  tutorialId?: string; // Tutorial to show when unlocked
  tooltipId?: string; // Tooltip to show when unlocked
}

export interface UnlockCondition {
  type: 'level' | 'achievement' | 'session_count' | 'total_time' | 'streak' | 'manual';
  operator: 'gte' | 'lte' | 'eq' | 'neq';
  value: any;
  description: string;
}

export class FeatureUnlockService extends Observable {
  private static instance: FeatureUnlockService;
  private userDataService: UserDataService;
  private features: FeatureDefinition[] = [];

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.initializeFeatures();
  }

  static getInstance(): FeatureUnlockService {
    if (!FeatureUnlockService.instance) {
      FeatureUnlockService.instance = new FeatureUnlockService();
    }
    return FeatureUnlockService.instance;
  }

  private initializeFeatures(): void {
    this.features = [
      // Core Features (always available)
      {
        id: 'basic_tracking',
        name: 'Basic Tracking',
        description: 'Start and stop offline sessions',
        icon: '⏱️',
        category: 'core',
        unlockConditions: [],
        priority: 1
      },
      {
        id: 'session_controls',
        name: 'Session Controls',
        description: 'Manual session management',
        icon: '▶️',
        category: 'core',
        unlockConditions: [],
        priority: 1
      },

      // Gamification Features
      {
        id: 'achievements',
        name: 'Achievements',
        description: 'Track your progress with achievements',
        icon: '🏆',
        category: 'gamification',
        unlockConditions: [
          { type: 'session_count', operator: 'gte', value: 1, description: 'Complete your first session' }
        ],
        priority: 2,
        tooltipId: 'achievements_intro'
      },
      {
        id: 'level_system',
        name: 'Level System',
        description: 'Gain XP and level up',
        icon: '📈',
        category: 'gamification',
        unlockConditions: [
          { type: 'session_count', operator: 'gte', value: 1, description: 'Complete your first session' }
        ],
        priority: 2
      },
      {
        id: 'streaks',
        name: 'Streak Tracking',
        description: 'Build daily consistency streaks',
        icon: '🔥',
        category: 'gamification',
        unlockConditions: [
          { type: 'session_count', operator: 'gte', value: 2, description: 'Complete 2 sessions' }
        ],
        priority: 3
      },

      // Analytics Features
      {
        id: 'basic_stats',
        name: 'Basic Statistics',
        description: 'View your daily progress',
        icon: '📊',
        category: 'analytics',
        unlockConditions: [
          { type: 'session_count', operator: 'gte', value: 1, description: 'Complete your first session' }
        ],
        priority: 2
      },
      {
        id: 'analytics_dashboard',
        name: 'Analytics Dashboard',
        description: 'Detailed insights and trends',
        icon: '📈',
        category: 'analytics',
        unlockConditions: [
          { type: 'session_count', operator: 'gte', value: 3, description: 'Complete 3 sessions' }
        ],
        dependencies: ['basic_stats'],
        priority: 4,
        tooltipId: 'analytics_intro'
      },
      {
        id: 'weekly_reports',
        name: 'Weekly Reports',
        description: 'Comprehensive weekly summaries',
        icon: '📋',
        category: 'analytics',
        unlockConditions: [
          { type: 'session_count', operator: 'gte', value: 7, description: 'Complete 7 sessions' }
        ],
        dependencies: ['analytics_dashboard'],
        priority: 6
      },

      // Social Features
      {
        id: 'social_profile',
        name: 'Social Profile',
        description: 'Create your community profile',
        icon: '👤',
        category: 'social',
        unlockConditions: [
          { type: 'level', operator: 'gte', value: 3, description: 'Reach level 3' }
        ],
        priority: 5,
        tooltipId: 'social_intro'
      },
      {
        id: 'circles',
        name: 'Accountability Circles',
        description: 'Join groups for motivation',
        icon: '👥',
        category: 'social',
        unlockConditions: [
          { type: 'level', operator: 'gte', value: 3, description: 'Reach level 3' }
        ],
        dependencies: ['social_profile'],
        priority: 5
      },
      {
        id: 'challenges',
        name: 'Community Challenges',
        description: 'Participate in group challenges',
        icon: '🎯',
        category: 'social',
        unlockConditions: [
          { type: 'level', operator: 'gte', value: 4, description: 'Reach level 4' }
        ],
        dependencies: ['circles'],
        priority: 6
      },
      {
        id: 'leaderboards',
        name: 'Leaderboards',
        description: 'Compete with others',
        icon: '🏆',
        category: 'social',
        unlockConditions: [
          { type: 'level', operator: 'gte', value: 5, description: 'Reach level 5' }
        ],
        dependencies: ['challenges'],
        priority: 7
      },

      // Advanced Features
      {
        id: 'session_goals',
        name: 'Session Goals',
        description: 'Set and track specific goals',
        icon: '🎯',
        category: 'gamification',
        unlockConditions: [
          { type: 'session_count', operator: 'gte', value: 5, description: 'Complete 5 sessions' }
        ],
        priority: 5
      },
      {
        id: 'session_notes',
        name: 'Session Notes',
        description: 'Reflect on your offline time',
        icon: '📝',
        category: 'analytics',
        unlockConditions: [
          { type: 'session_count', operator: 'gte', value: 3, description: 'Complete 3 sessions' }
        ],
        priority: 4
      },

      // Premium Features
      {
        id: 'premium_analytics',
        name: 'Premium Analytics',
        description: 'Advanced insights and exports',
        icon: '💎',
        category: 'premium',
        unlockConditions: [
          { type: 'session_count', operator: 'gte', value: 10, description: 'Complete 10 sessions' }
        ],
        priority: 8,
        tooltipId: 'premium_intro'
      }
    ];
  }

  // Check for newly unlocked features
  checkForUnlocks(): FeatureDefinition[] {
    const userProfile = this.userDataService.getUserProfile();
    const currentUnlocks = userProfile.settings.featureUnlocks?.unlockedFeatures || [];
    const newlyUnlocked: FeatureDefinition[] = [];

    for (const feature of this.features) {
      // Skip if already unlocked
      if (currentUnlocks.includes(feature.id)) {
        continue;
      }

      // Check if all conditions are met
      if (this.checkUnlockConditions(feature) && this.checkDependencies(feature)) {
        this.unlockFeature(feature);
        newlyUnlocked.push(feature);
      }
    }

    return newlyUnlocked;
  }

  private checkUnlockConditions(feature: FeatureDefinition): boolean {
    if (feature.unlockConditions.length === 0) {
      return true; // No conditions means always unlocked
    }

    const userProfile = this.userDataService.getUserProfile();

    return feature.unlockConditions.every(condition => {
      let actualValue: any;

      switch (condition.type) {
        case 'level':
          actualValue = userProfile.level;
          break;
        case 'session_count':
          actualValue = userProfile.totalSessions;
          break;
        case 'total_time':
          actualValue = userProfile.totalOfflineHours * 60; // Convert to minutes
          break;
        case 'streak':
          actualValue = userProfile.currentStreak;
          break;
        case 'achievement':
          actualValue = userProfile.achievements.filter(a => a.unlocked).length;
          break;
        case 'manual':
          return false; // Manual unlocks require explicit action
        default:
          return false;
      }

      switch (condition.operator) {
        case 'gte': return actualValue >= condition.value;
        case 'lte': return actualValue <= condition.value;
        case 'eq': return actualValue === condition.value;
        case 'neq': return actualValue !== condition.value;
        default: return false;
      }
    });
  }

  private checkDependencies(feature: FeatureDefinition): boolean {
    if (!feature.dependencies || feature.dependencies.length === 0) {
      return true;
    }

    const userProfile = this.userDataService.getUserProfile();
    const unlockedFeatures = userProfile.settings.featureUnlocks?.unlockedFeatures || [];

    return feature.dependencies.every(depId => unlockedFeatures.includes(depId));
  }

  private unlockFeature(feature: FeatureDefinition): void {
    const userProfile = this.userDataService.getUserProfile();
    
    if (!userProfile.settings.featureUnlocks) {
      userProfile.settings.featureUnlocks = {
        unlockedFeatures: [],
        pendingUnlocks: [],
        unlockHistory: []
      };
    }

    const unlock: FeatureUnlock = {
      featureId: feature.id,
      unlockedAt: new Date(),
      trigger: 'level', // Simplified - could be more specific
      triggerValue: userProfile.level
    };

    userProfile.settings.featureUnlocks.unlockedFeatures.push(feature.id);
    userProfile.settings.featureUnlocks.unlockHistory.push(unlock);

    this.userDataService.saveUserData();

    // Emit unlock event
    this.notify({
      eventName: 'featureUnlocked',
      object: this,
      data: { feature, unlock }
    });
  }

  // Public API
  isFeatureUnlocked(featureId: string): boolean {
    const userProfile = this.userDataService.getUserProfile();
    const unlockedFeatures = userProfile.settings.featureUnlocks?.unlockedFeatures || [];
    return unlockedFeatures.includes(featureId);
  }

  getUnlockedFeatures(): FeatureDefinition[] {
    const userProfile = this.userDataService.getUserProfile();
    const unlockedFeatures = userProfile.settings.featureUnlocks?.unlockedFeatures || [];
    return this.features.filter(f => unlockedFeatures.includes(f.id));
  }

  getLockedFeatures(): FeatureDefinition[] {
    const userProfile = this.userDataService.getUserProfile();
    const unlockedFeatures = userProfile.settings.featureUnlocks?.unlockedFeatures || [];
    return this.features.filter(f => !unlockedFeatures.includes(f.id));
  }

  getFeatureById(featureId: string): FeatureDefinition | undefined {
    return this.features.find(f => f.id === featureId);
  }

  getNextUnlockableFeatures(): FeatureDefinition[] {
    return this.getLockedFeatures()
      .filter(f => this.checkDependencies(f))
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3); // Return top 3 next features
  }

  manuallyUnlockFeature(featureId: string): boolean {
    const feature = this.getFeatureById(featureId);
    if (!feature || this.isFeatureUnlocked(featureId)) {
      return false;
    }

    this.unlockFeature(feature);
    return true;
  }
}
