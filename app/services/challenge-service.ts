import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import { SocialService } from './social-service';
import {
  CommunityChallenge,
  ChallengeParticipation,
  ChallengeReward,
  Leaderboard,
  LeaderboardEntry,
  ChallengeInvite
} from '../models/social-data';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';

export class ChallengeService extends Observable {
  private static instance: ChallengeService;
  private userDataService: UserDataService;
  private socialService: SocialService;
  private activeChallenges: CommunityChallenge[] = [];
  private userParticipations: ChallengeParticipation[] = [];
  private challengeLeaderboards: Map<string, Leaderboard> = new Map();

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.socialService = SocialService.getInstance();
    this.initializeChallenges();
  }

  static getInstance(): ChallengeService {
    if (!ChallengeService.instance) {
      ChallengeService.instance = new ChallengeService();
    }
    return ChallengeService.instance;
  }

  private async initializeChallenges(): Promise<void> {
    try {
      // Load active challenges
      await this.loadActiveChallenges();
      
      // Load user participations
      await this.loadUserParticipations();
      
      // Create default challenges if none exist
      if (this.activeChallenges.length === 0) {
        await this.createDefaultChallenges();
      }
      
      // Setup listeners
      this.setupEventListeners();
      
      // Update challenge progress
      this.updateChallengeProgress();
      
    } catch (error) {
      console.error('Failed to initialize challenges:', error);
    }
  }

  private async loadActiveChallenges(): Promise<void> {
    // In a real app, this would load from backend
    const savedChallenges = this.userDataService.getUserProfile().activeChallenges || [];
    
    // Filter active challenges
    this.activeChallenges = savedChallenges.filter(challenge => {
      const now = new Date();
      const endDate = new Date(challenge.endDate);
      return endDate > now && challenge.isActive;
    });
    
    this.set('activeChallenges', this.activeChallenges);
  }

  private async loadUserParticipations(): Promise<void> {
    this.userParticipations = this.userDataService.getUserProfile().challengeParticipations || [];
    this.set('userParticipations', this.userParticipations);
  }

  private async createDefaultChallenges(): Promise<void> {
    const now = new Date();
    const weekStart = this.getWeekStart(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Weekly Challenge: 7-Day Consistency
    const weeklyChallenge = await this.createChallenge({
      title: '7-Day Consistency Challenge',
      description: 'Complete at least one offline session every day for 7 days straight',
      type: 'weekly',
      category: 'consistency',
      startDate: weekStart,
      endDate: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      target: 7,
      unit: 'days',
      rules: [
        'Complete at least one session per day',
        'Sessions must be at least 10 minutes long',
        'No skipping days allowed'
      ],
      difficulty: 'medium',
      icon: '🎯',
      color: '#3B82F6',
      rewards: [
        {
          id: 'consistency_badge',
          type: 'badge',
          name: 'Consistency Champion',
          description: 'Completed 7 days in a row',
          value: 0,
          icon: '🏆',
          rarity: 'rare',
          threshold: 7
        },
        {
          id: 'consistency_xp',
          type: 'xp',
          name: 'Consistency Bonus',
          description: 'Extra XP for consistency',
          value: 500,
          icon: '⭐',
          rarity: 'common',
          threshold: 7
        }
      ]
    });

    // Monthly Challenge: 1000 Minutes
    const monthlyChallenge = await this.createChallenge({
      title: '1000 Minutes Challenge',
      description: 'Accumulate 1000 minutes of offline time this month',
      type: 'monthly',
      category: 'minutes',
      startDate: monthStart,
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      target: 1000,
      unit: 'minutes',
      rules: [
        'All offline sessions count toward the total',
        'Minimum 5 minutes per session',
        'Progress tracked daily'
      ],
      difficulty: 'hard',
      icon: '⏱️',
      color: '#10B981',
      rewards: [
        {
          id: 'time_master_badge',
          type: 'badge',
          name: 'Time Master',
          description: 'Accumulated 1000+ minutes',
          value: 0,
          icon: '👑',
          rarity: 'epic',
          threshold: 1000
        },
        {
          id: 'time_master_xp',
          type: 'xp',
          name: 'Time Master Bonus',
          description: 'Massive XP bonus',
          value: 1000,
          icon: '💫',
          rarity: 'epic',
          threshold: 1000
        }
      ]
    });

    // Special Challenge: Weekend Warrior
    const weekendChallenge = await this.createChallenge({
      title: 'Weekend Warrior',
      description: 'Complete 3+ hours of offline time this weekend',
      type: 'special',
      category: 'minutes',
      startDate: this.getWeekendStart(now),
      endDate: this.getWeekendEnd(now),
      target: 180,
      unit: 'minutes',
      rules: [
        'Only Saturday and Sunday sessions count',
        'Minimum 30 minutes per session',
        'Complete at least 3 hours total'
      ],
      difficulty: 'medium',
      icon: '🌟',
      color: '#F59E0B',
      rewards: [
        {
          id: 'weekend_warrior_badge',
          type: 'badge',
          name: 'Weekend Warrior',
          description: 'Conquered the weekend',
          value: 0,
          icon: '⚔️',
          rarity: 'rare',
          threshold: 180
        }
      ]
    });

    this.saveChallengeData();
  }

  async createChallenge(challengeData: Partial<CommunityChallenge>): Promise<CommunityChallenge> {
    const challenge: CommunityChallenge = {
      id: this.generateId(),
      title: challengeData.title || 'New Challenge',
      description: challengeData.description || '',
      type: challengeData.type || 'weekly',
      category: challengeData.category || 'minutes',
      startDate: challengeData.startDate || new Date(),
      endDate: challengeData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      target: challengeData.target || 100,
      unit: challengeData.unit || 'minutes',
      rules: challengeData.rules || [],
      participantCount: 0,
      maxParticipants: challengeData.maxParticipants,
      isPublic: challengeData.isPublic !== false,
      requiresApproval: challengeData.requiresApproval || false,
      rewards: challengeData.rewards || [],
      createdBy: this.socialService.getSocialProfile()?.userId || 'system',
      createdAt: new Date(),
      tags: challengeData.tags || [],
      difficulty: challengeData.difficulty || 'medium',
      icon: challengeData.icon || '🎯',
      color: challengeData.color || '#3B82F6',
      bannerImage: challengeData.bannerImage
    };

    this.activeChallenges.push(challenge);
    this.createChallengeLeaderboard(challenge);
    this.saveChallengeData();
    
    this.notifyPropertyChange('challengeCreated', { challenge });
    return challenge;
  }

  async joinChallenge(challengeId: string): Promise<void> {
    const challenge = this.activeChallenges.find(c => c.id === challengeId);
    if (!challenge) return;

    // Check if already participating
    const existingParticipation = this.userParticipations.find(p => p.challengeId === challengeId);
    if (existingParticipation) return;

    // Check if challenge is full
    if (challenge.maxParticipants && challenge.participantCount >= challenge.maxParticipants) {
      throw new Error('Challenge is full');
    }

    const participation: ChallengeParticipation = {
      id: this.generateId(),
      challengeId: challengeId,
      userId: this.socialService.getSocialProfile()?.userId || 'user',
      joinedAt: new Date(),
      currentProgress: 0,
      targetProgress: challenge.target,
      progressPercentage: 0,
      isCompleted: false,
      rewardsEarned: [],
      isPublic: true,
      shareProgress: true
    };

    this.userParticipations.push(participation);
    challenge.participantCount++;
    
    // Update leaderboard
    this.updateChallengeLeaderboard(challengeId);
    
    this.saveChallengeData();
    this.notifyPropertyChange('challengeJoined', { challenge, participation });
  }

  async leaveChallenge(challengeId: string): Promise<void> {
    const participationIndex = this.userParticipations.findIndex(p => p.challengeId === challengeId);
    if (participationIndex >= 0) {
      this.userParticipations.splice(participationIndex, 1);
      
      const challenge = this.activeChallenges.find(c => c.id === challengeId);
      if (challenge) {
        challenge.participantCount = Math.max(0, challenge.participantCount - 1);
      }
      
      this.updateChallengeLeaderboard(challengeId);
      this.saveChallengeData();
      this.notifyPropertyChange('challengeLeft', { challengeId });
    }
  }

  private setupEventListeners(): void {
    // Listen for session completions to update challenge progress
    this.userDataService.on('sessionCompleted', (args) => {
      if (isPropertyChangeEvent(args)) {
        this.updateChallengeProgressFromSession(args.value);
      }
    });

    // Listen for daily stats updates
    this.userDataService.on('dailyStatsUpdated', (args) => {
      this.updateChallengeProgress();
    });
  }

  private updateChallengeProgressFromSession(sessionData: any): void {
    const now = new Date();
    
    this.userParticipations.forEach(participation => {
      const challenge = this.activeChallenges.find(c => c.id === participation.challengeId);
      if (!challenge || !this.isChallengeActive(challenge)) return;

      let progressIncrease = 0;

      switch (challenge.category) {
        case 'minutes':
          progressIncrease = sessionData.duration || 0;
          break;
        case 'sessions':
          progressIncrease = 1;
          break;
        case 'consistency':
          // Check if this is the first session today
          const today = now.toISOString().split('T')[0];
          const todayStats = this.userDataService.getTodayStats();
          if (todayStats && todayStats.sessionCount === 1) {
            progressIncrease = 1;
          }
          break;
      }

      if (progressIncrease > 0) {
        participation.currentProgress += progressIncrease;
        participation.progressPercentage = Math.min(
          (participation.currentProgress / participation.targetProgress) * 100,
          100
        );

        // Check if challenge is completed
        if (participation.currentProgress >= participation.targetProgress && !participation.isCompleted) {
          this.completeChallengeForUser(participation);
        }

        // Update leaderboard
        this.updateChallengeLeaderboard(challenge.id);
      }
    });

    this.saveChallengeData();
  }

  private updateChallengeProgress(): void {
    // Update all challenge progress based on current user stats
    this.userParticipations.forEach(participation => {
      const challenge = this.activeChallenges.find(c => c.id === participation.challengeId);
      if (!challenge || !this.isChallengeActive(challenge)) return;

      // Calculate progress based on challenge type and timeframe
      let currentProgress = 0;
      const userProfile = this.userDataService.getUserProfile();

      switch (challenge.category) {
        case 'minutes':
          currentProgress = this.calculateMinutesProgress(challenge);
          break;
        case 'sessions':
          currentProgress = this.calculateSessionsProgress(challenge);
          break;
        case 'consistency':
          currentProgress = this.calculateConsistencyProgress(challenge);
          break;
        case 'streak':
          currentProgress = userProfile.currentStreak;
          break;
      }

      participation.currentProgress = currentProgress;
      participation.progressPercentage = Math.min(
        (currentProgress / participation.targetProgress) * 100,
        100
      );

      // Check completion
      if (currentProgress >= participation.targetProgress && !participation.isCompleted) {
        this.completeChallengeForUser(participation);
      }
    });

    this.saveChallengeData();
  }

  private calculateMinutesProgress(challenge: CommunityChallenge): number {
    const userProfile = this.userDataService.getUserProfile();
    const challengeStart = new Date(challenge.startDate);
    const challengeEnd = new Date(challenge.endDate);

    // Sum minutes within challenge timeframe
    return userProfile.dailyStats
      .filter(stat => {
        const statDate = new Date(stat.date);
        return statDate >= challengeStart && statDate <= challengeEnd;
      })
      .reduce((total, stat) => total + stat.offlineMinutes, 0);
  }

  private calculateSessionsProgress(challenge: CommunityChallenge): number {
    const userProfile = this.userDataService.getUserProfile();
    const challengeStart = new Date(challenge.startDate);
    const challengeEnd = new Date(challenge.endDate);

    return userProfile.dailyStats
      .filter(stat => {
        const statDate = new Date(stat.date);
        return statDate >= challengeStart && statDate <= challengeEnd;
      })
      .reduce((total, stat) => total + (stat.sessionCount || 0), 0);
  }

  private calculateConsistencyProgress(challenge: CommunityChallenge): number {
    const userProfile = this.userDataService.getUserProfile();
    const challengeStart = new Date(challenge.startDate);
    const challengeEnd = new Date(challenge.endDate);

    const daysWithSessions = userProfile.dailyStats
      .filter(stat => {
        const statDate = new Date(stat.date);
        return statDate >= challengeStart && statDate <= challengeEnd && stat.offlineMinutes > 0;
      }).length;

    return daysWithSessions;
  }

  private completeChallengeForUser(participation: ChallengeParticipation): void {
    participation.isCompleted = true;
    participation.completedAt = new Date();

    const challenge = this.activeChallenges.find(c => c.id === participation.challengeId);
    if (!challenge) return;

    // Award rewards
    challenge.rewards.forEach(reward => {
      if (participation.currentProgress >= (reward.threshold || 0)) {
        participation.rewardsEarned.push(reward);
        this.awardReward(reward);
      }
    });

    // Update social profile
    const socialProfile = this.socialService.getSocialProfile();
    if (socialProfile) {
      socialProfile.challengesCompleted++;
    }

    // Create notification
    this.socialService.createNotification(participation.userId, {
      type: 'challenge_complete',
      title: 'Challenge Completed! 🎉',
      message: `Congratulations! You completed "${challenge.title}"`,
      icon: '🏆'
    });

    this.notifyPropertyChange('challengeCompleted', { challenge, participation });
  }

  private awardReward(reward: ChallengeReward): void {
    const userProfile = this.userDataService.getUserProfile();

    switch (reward.type) {
      case 'xp':
        userProfile.totalXP += reward.value;
        this.userDataService.checkLevelUp();
        break;
      case 'badge':
        // Add badge to achievements
        const achievement = {
          id: reward.id,
          title: reward.name,
          description: reward.description,
          icon: reward.icon,
          xpReward: 0,
          targetMinutes: 0,
          unlocked: true,
          unlockedAt: new Date(),
          category: 'SPECIAL' as any,
          rarity: reward.rarity as any
        };
        userProfile.achievements.push(achievement);
        break;
    }

    this.userDataService.saveUserData();
  }

  private createChallengeLeaderboard(challenge: CommunityChallenge): void {
    const leaderboard: Leaderboard = {
      id: `challenge_${challenge.id}`,
      type: 'challenge',
      category: challenge.category as any,
      timeframe: challenge.type === 'weekly' ? 'weekly' : 'monthly',
      entries: [],
      lastUpdated: new Date(),
      isAnonymous: false,
      maxEntries: 100,
      challengeId: challenge.id
    };

    this.challengeLeaderboards.set(challenge.id, leaderboard);
  }

  private updateChallengeLeaderboard(challengeId: string): void {
    const leaderboard = this.challengeLeaderboards.get(challengeId);
    if (!leaderboard) return;

    // Get all participations for this challenge
    const participations = this.userParticipations.filter(p => p.challengeId === challengeId);
    
    // Create leaderboard entries
    leaderboard.entries = participations
      .map((participation, index) => ({
        userId: participation.userId,
        username: this.socialService.getSocialProfile()?.username,
        displayName: this.socialService.getSocialProfile()?.displayName,
        value: participation.currentProgress,
        rank: index + 1,
        isAnonymous: !participation.isPublic,
        lastActive: new Date()
      }))
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    leaderboard.lastUpdated = new Date();
  }

  // Helper methods
  private isChallengeActive(challenge: CommunityChallenge): boolean {
    const now = new Date();
    return challenge.isActive && 
           new Date(challenge.startDate) <= now && 
           new Date(challenge.endDate) > now;
  }

  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  private getWeekendStart(date: Date): Date {
    const saturday = new Date(date);
    saturday.setDate(date.getDate() + (6 - date.getDay()));
    return saturday;
  }

  private getWeekendEnd(date: Date): Date {
    const sunday = new Date(date);
    sunday.setDate(date.getDate() + (7 - date.getDay()));
    return sunday;
  }

  private saveChallengeData(): void {
    const userProfile = this.userDataService.getUserProfile();
    userProfile.activeChallenges = this.activeChallenges;
    userProfile.challengeParticipations = this.userParticipations;
    this.userDataService.saveUserData();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public getters
  getActiveChallenges(): CommunityChallenge[] {
    return [...this.activeChallenges];
  }

  getUserParticipations(): ChallengeParticipation[] {
    return [...this.userParticipations];
  }

  getChallengeLeaderboard(challengeId: string): Leaderboard | null {
    return this.challengeLeaderboards.get(challengeId) || null;
  }

  getUserChallengeProgress(challengeId: string): ChallengeParticipation | null {
    return this.userParticipations.find(p => p.challengeId === challengeId) || null;
  }

  isUserParticipating(challengeId: string): boolean {
    return this.userParticipations.some(p => p.challengeId === challengeId);
  }
}
