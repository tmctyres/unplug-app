import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import { SocialService } from './social-service';
import { AnalyticsService } from './analytics-service';
import { 
  Leaderboard, 
  LeaderboardEntry,
  SocialSettings
} from '../models/social-data';

export interface LeaderboardConfig {
  id: string;
  name: string;
  description: string;
  category: 'weekly_minutes' | 'monthly_minutes' | 'current_streak' | 'total_sessions' | 'consistency' | 'level';
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time';
  isAnonymous: boolean;
  maxEntries: number;
  refreshInterval: number; // minutes
  icon: string;
  color: string;
}

export class LeaderboardService extends Observable {
  private static instance: LeaderboardService;
  private userDataService: UserDataService;
  private socialService: SocialService;
  private analyticsService: AnalyticsService;
  private leaderboards: Map<string, Leaderboard> = new Map();
  private leaderboardConfigs: LeaderboardConfig[] = [];
  private userAnonymousId: string = '';

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.socialService = SocialService.getInstance();
    this.analyticsService = AnalyticsService.getInstance();
    this.initializeLeaderboards();
  }

  static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  private async initializeLeaderboards(): Promise<void> {
    try {
      // Generate or load anonymous ID
      this.generateAnonymousId();
      
      // Create leaderboard configurations
      this.createLeaderboardConfigs();
      
      // Initialize leaderboards
      this.createLeaderboards();
      
      // Load sample data (in real app, this would come from backend)
      this.loadSampleLeaderboardData();
      
      // Setup refresh intervals
      this.setupRefreshIntervals();
      
      // Setup event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize leaderboards:', error);
    }
  }

  private generateAnonymousId(): void {
    const userProfile = this.userDataService.getUserProfile();
    
    if (!userProfile.anonymousId) {
      // Generate a unique anonymous ID
      const adjectives = ['Swift', 'Zen', 'Focused', 'Calm', 'Mindful', 'Balanced', 'Peaceful', 'Strong', 'Wise', 'Brave'];
      const nouns = ['Warrior', 'Master', 'Seeker', 'Guardian', 'Explorer', 'Champion', 'Sage', 'Phoenix', 'Tiger', 'Eagle'];
      
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const number = Math.floor(Math.random() * 999) + 1;
      
      userProfile.anonymousId = `${adjective}${noun}${number}`;
      this.userDataService.saveUserData();
    }
    
    this.userAnonymousId = userProfile.anonymousId;
  }

  private createLeaderboardConfigs(): void {
    this.leaderboardConfigs = [
      {
        id: 'weekly_minutes',
        name: 'Weekly Minutes',
        description: 'Most offline minutes this week',
        category: 'weekly_minutes',
        timeframe: 'weekly',
        isAnonymous: true,
        maxEntries: 100,
        refreshInterval: 60, // 1 hour
        icon: '⏱️',
        color: '#3B82F6'
      },
      {
        id: 'monthly_minutes',
        name: 'Monthly Minutes',
        description: 'Most offline minutes this month',
        category: 'monthly_minutes',
        timeframe: 'monthly',
        isAnonymous: true,
        maxEntries: 100,
        refreshInterval: 120, // 2 hours
        icon: '📅',
        color: '#10B981'
      },
      {
        id: 'current_streak',
        name: 'Longest Streaks',
        description: 'Current consecutive day streaks',
        category: 'current_streak',
        timeframe: 'all_time',
        isAnonymous: true,
        maxEntries: 50,
        refreshInterval: 180, // 3 hours
        icon: '🔥',
        color: '#F59E0B'
      },
      {
        id: 'total_sessions',
        name: 'Session Masters',
        description: 'Most total sessions completed',
        category: 'total_sessions',
        timeframe: 'all_time',
        isAnonymous: true,
        maxEntries: 100,
        refreshInterval: 240, // 4 hours
        icon: '🎯',
        color: '#8B5CF6'
      },
      {
        id: 'consistency_score',
        name: 'Consistency Champions',
        description: 'Highest consistency scores this month',
        category: 'consistency',
        timeframe: 'monthly',
        isAnonymous: true,
        maxEntries: 50,
        refreshInterval: 180, // 3 hours
        icon: '💎',
        color: '#06B6D4'
      },
      {
        id: 'level_leaders',
        name: 'Level Leaders',
        description: 'Highest levels achieved',
        category: 'level',
        timeframe: 'all_time',
        isAnonymous: true,
        maxEntries: 50,
        refreshInterval: 360, // 6 hours
        icon: '👑',
        color: '#EF4444'
      }
    ];
  }

  private createLeaderboards(): void {
    this.leaderboardConfigs.forEach(config => {
      const leaderboard: Leaderboard = {
        id: config.id,
        type: 'global',
        category: config.category,
        timeframe: config.timeframe,
        entries: [],
        lastUpdated: new Date(),
        isAnonymous: config.isAnonymous,
        maxEntries: config.maxEntries
      };
      
      this.leaderboards.set(config.id, leaderboard);
    });
  }

  private loadSampleLeaderboardData(): void {
    // Generate sample leaderboard data for demonstration
    this.leaderboardConfigs.forEach(config => {
      const leaderboard = this.leaderboards.get(config.id);
      if (!leaderboard) return;

      // Generate sample entries
      const sampleEntries: LeaderboardEntry[] = [];
      
      for (let i = 0; i < Math.min(config.maxEntries, 50); i++) {
        const entry: LeaderboardEntry = {
          userId: `user_${i}`,
          username: null, // Anonymous
          displayName: null, // Anonymous
          avatar: null, // Anonymous
          value: this.generateSampleValue(config.category, i),
          rank: i + 1,
          isAnonymous: true,
          lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random within last week
        };
        
        sampleEntries.push(entry);
      }
      
      // Add current user to leaderboard
      this.addUserToLeaderboard(config.id, leaderboard);
      
      // Sort entries by value
      leaderboard.entries = [...sampleEntries, ...leaderboard.entries]
        .sort((a, b) => b.value - a.value)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))
        .slice(0, config.maxEntries);
    });
  }

  private generateSampleValue(category: string, index: number): number {
    const baseValues = {
      'weekly_minutes': 300,
      'monthly_minutes': 1200,
      'current_streak': 15,
      'total_sessions': 50,
      'consistency': 85,
      'level': 8
    };
    
    const base = baseValues[category] || 100;
    const variation = Math.random() * 0.3 + 0.7; // 70-100% of base
    const rankMultiplier = Math.max(0.3, 1 - (index * 0.02)); // Decrease by rank
    
    return Math.round(base * variation * rankMultiplier);
  }

  private addUserToLeaderboard(leaderboardId: string, leaderboard: Leaderboard): void {
    const userProfile = this.userDataService.getUserProfile();
    const socialSettings = this.socialService.getSocialSettings();
    
    // Check if user wants to appear in leaderboards
    if (!socialSettings?.showInLeaderboards) return;

    let userValue = 0;
    
    // Calculate user's value for this leaderboard
    switch (leaderboard.category) {
      case 'weekly_minutes':
        userValue = this.calculateUserWeeklyMinutes();
        break;
      case 'monthly_minutes':
        userValue = this.calculateUserMonthlyMinutes();
        break;
      case 'current_streak':
        userValue = userProfile.currentStreak;
        break;
      case 'total_sessions':
        userValue = this.calculateUserTotalSessions();
        break;
      case 'consistency':
        userValue = this.calculateUserConsistencyScore();
        break;
      case 'level':
        userValue = userProfile.level;
        break;
    }

    const userEntry: LeaderboardEntry = {
      userId: userProfile.userTitle || 'user',
      username: leaderboard.isAnonymous ? null : this.socialService.getSocialProfile()?.username,
      displayName: leaderboard.isAnonymous ? this.userAnonymousId : this.socialService.getSocialProfile()?.displayName,
      avatar: leaderboard.isAnonymous ? null : this.socialService.getSocialProfile()?.avatar,
      value: userValue,
      rank: 1, // Will be calculated after sorting
      isAnonymous: leaderboard.isAnonymous,
      lastActive: new Date()
    };

    leaderboard.entries.push(userEntry);
  }

  private calculateUserWeeklyMinutes(): number {
    const analyticsData = this.analyticsService.getAnalyticsData();
    if (!analyticsData || analyticsData.weeklyAnalytics.length === 0) return 0;
    
    const latestWeek = analyticsData.weeklyAnalytics[analyticsData.weeklyAnalytics.length - 1];
    return latestWeek.totalMinutes;
  }

  private calculateUserMonthlyMinutes(): number {
    const analyticsData = this.analyticsService.getAnalyticsData();
    if (!analyticsData || analyticsData.monthlyAnalytics.length === 0) return 0;
    
    const latestMonth = analyticsData.monthlyAnalytics[analyticsData.monthlyAnalytics.length - 1];
    return latestMonth.totalMinutes;
  }

  private calculateUserTotalSessions(): number {
    const userProfile = this.userDataService.getUserProfile();
    return userProfile.dailyStats.reduce((total, day) => total + (day.sessionCount || 0), 0);
  }

  private calculateUserConsistencyScore(): number {
    const analyticsData = this.analyticsService.getAnalyticsData();
    if (!analyticsData || analyticsData.weeklyAnalytics.length === 0) return 0;
    
    const latestWeek = analyticsData.weeklyAnalytics[analyticsData.weeklyAnalytics.length - 1];
    return Math.round(latestWeek.patterns?.consistencyScore || 0);
  }

  private setupRefreshIntervals(): void {
    // In a real app, this would set up periodic refresh from backend
    this.leaderboardConfigs.forEach(config => {
      setInterval(() => {
        this.refreshLeaderboard(config.id);
      }, config.refreshInterval * 60 * 1000);
    });
  }

  private setupEventListeners(): void {
    // Listen for session completions to update leaderboards
    this.userDataService.on('sessionCompleted', () => {
      this.updateUserInLeaderboards();
    });

    // Listen for level ups
    this.userDataService.on('levelUp', () => {
      this.updateUserInLeaderboards();
    });

    // Listen for analytics updates
    this.analyticsService.on('analyticsUpdated', () => {
      this.updateUserInLeaderboards();
    });
  }

  private async refreshLeaderboard(leaderboardId: string): Promise<void> {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return;

    // In a real app, this would fetch fresh data from backend
    // For now, we'll just update the timestamp
    leaderboard.lastUpdated = new Date();
    
    this.notifyPropertyChange('leaderboardUpdated', { leaderboardId, leaderboard });
  }

  private updateUserInLeaderboards(): void {
    const socialSettings = this.socialService.getSocialSettings();
    if (!socialSettings?.showInLeaderboards) return;

    this.leaderboards.forEach((leaderboard, leaderboardId) => {
      // Find and update user entry
      const userEntry = leaderboard.entries.find(entry => 
        entry.userId === (this.userDataService.getUserProfile().userTitle || 'user')
      );

      if (userEntry) {
        // Update user's value
        switch (leaderboard.category) {
          case 'weekly_minutes':
            userEntry.value = this.calculateUserWeeklyMinutes();
            break;
          case 'monthly_minutes':
            userEntry.value = this.calculateUserMonthlyMinutes();
            break;
          case 'current_streak':
            userEntry.value = this.userDataService.getUserProfile().currentStreak;
            break;
          case 'total_sessions':
            userEntry.value = this.calculateUserTotalSessions();
            break;
          case 'consistency':
            userEntry.value = this.calculateUserConsistencyScore();
            break;
          case 'level':
            userEntry.value = this.userDataService.getUserProfile().level;
            break;
        }

        userEntry.lastActive = new Date();

        // Re-sort and update ranks
        leaderboard.entries = leaderboard.entries
          .sort((a, b) => b.value - a.value)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

        leaderboard.lastUpdated = new Date();
      }
    });

    this.notifyPropertyChange('userLeaderboardsUpdated', {});
  }

  // Public methods
  getLeaderboard(leaderboardId: string): Leaderboard | null {
    return this.leaderboards.get(leaderboardId) || null;
  }

  getAllLeaderboards(): Leaderboard[] {
    return Array.from(this.leaderboards.values());
  }

  getLeaderboardConfigs(): LeaderboardConfig[] {
    return [...this.leaderboardConfigs];
  }

  getUserRank(leaderboardId: string): number | null {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return null;

    const userEntry = leaderboard.entries.find(entry => 
      entry.userId === (this.userDataService.getUserProfile().userTitle || 'user')
    );

    return userEntry?.rank || null;
  }

  getUserValue(leaderboardId: string): number | null {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return null;

    const userEntry = leaderboard.entries.find(entry => 
      entry.userId === (this.userDataService.getUserProfile().userTitle || 'user')
    );

    return userEntry?.value || null;
  }

  getTopEntries(leaderboardId: string, count: number = 10): LeaderboardEntry[] {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return [];

    return leaderboard.entries.slice(0, count);
  }

  getUserPosition(leaderboardId: string): { rank: number; total: number; percentile: number } | null {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return null;

    const userRank = this.getUserRank(leaderboardId);
    if (!userRank) return null;

    const total = leaderboard.entries.length;
    const percentile = Math.round(((total - userRank + 1) / total) * 100);

    return { rank: userRank, total, percentile };
  }

  async toggleLeaderboardParticipation(participate: boolean): Promise<void> {
    const socialSettings = this.socialService.getSocialSettings();
    if (socialSettings) {
      await this.socialService.updateSocialSettings({
        showInLeaderboards: participate
      });

      if (participate) {
        // Add user to all leaderboards
        this.leaderboards.forEach((leaderboard, leaderboardId) => {
          this.addUserToLeaderboard(leaderboardId, leaderboard);
          
          // Re-sort
          leaderboard.entries = leaderboard.entries
            .sort((a, b) => b.value - a.value)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));
        });
      } else {
        // Remove user from all leaderboards
        this.leaderboards.forEach(leaderboard => {
          leaderboard.entries = leaderboard.entries.filter(entry => 
            entry.userId !== (this.userDataService.getUserProfile().userTitle || 'user')
          );
          
          // Update ranks
          leaderboard.entries = leaderboard.entries
            .map((entry, index) => ({ ...entry, rank: index + 1 }));
        });
      }

      this.notifyPropertyChange('leaderboardParticipationChanged', { participate });
    }
  }

  getAnonymousId(): string {
    return this.userAnonymousId;
  }

  regenerateAnonymousId(): void {
    const userProfile = this.userDataService.getUserProfile();
    delete userProfile.anonymousId;
    this.generateAnonymousId();
    this.updateUserInLeaderboards();
  }

  // Utility methods
  formatValue(value: number, category: string): string {
    switch (category) {
      case 'weekly_minutes':
      case 'monthly_minutes':
        if (value < 60) return `${value}m`;
        const hours = Math.floor(value / 60);
        const minutes = value % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      
      case 'current_streak':
        return `${value} day${value !== 1 ? 's' : ''}`;
      
      case 'total_sessions':
        return `${value} session${value !== 1 ? 's' : ''}`;
      
      case 'consistency':
        return `${value}%`;
      
      case 'level':
        return `Level ${value}`;
      
      default:
        return value.toString();
    }
  }

  getRankIcon(rank: number): string {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  }

  getRankColor(rank: number): string {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#6B7280';
    }
  }
}
