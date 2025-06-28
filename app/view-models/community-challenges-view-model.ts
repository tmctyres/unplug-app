import { Observable } from '@nativescript/core';
import { ChallengeService } from '../services/challenge-service';
import { SocialService } from '../services/social-service';
import { UserDataService } from '../models/user-data';
import { CommunityChallenge, ChallengeParticipation, Leaderboard } from '../models/social-data';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';

export class CommunityChallengesViewModel extends Observable {
  private challengeService: ChallengeService;
  private socialService: SocialService;
  private userDataService: UserDataService;
  private activeChallenges: CommunityChallenge[] = [];
  private userParticipations: ChallengeParticipation[] = [];
  private selectedTab: 'active' | 'my_challenges' | 'leaderboards' | 'social' = 'active';

  constructor() {
    super();
    this.challengeService = ChallengeService.getInstance();
    this.socialService = SocialService.getInstance();
    this.userDataService = UserDataService.getInstance();
    this.initializeChallenges();
    this.setupEventListeners();
  }

  private async initializeChallenges(): Promise<void> {
    try {
      this.set('isLoading', true);
      
      // Load challenges and participations
      this.activeChallenges = this.challengeService.getActiveChallenges();
      this.userParticipations = this.challengeService.getUserParticipations();
      
      this.loadChallengeData();
      
    } catch (error) {
      console.error('Failed to load challenges:', error);
      this.set('hasError', true);
      this.set('errorMessage', 'Failed to load community challenges');
    } finally {
      this.set('isLoading', false);
    }
  }

  private setupEventListeners(): void {
    this.challengeService.on('propertyChange', (args) => {
      if (isPropertyChangeEvent(args) &&
          (args.propertyName === 'challengeJoined' ||
           args.propertyName === 'challengeCompleted' ||
           args.propertyName === 'challengeLeft')) {
        this.loadChallengeData();
      }
    });
  }

  private loadChallengeData(): void {
    // Load active challenges
    this.loadActiveChallenges();
    
    // Load user's challenges
    this.loadUserChallenges();
    
    // Load leaderboards
    this.loadLeaderboards();
    
    // Update tab content
    this.updateTabContent();
  }

  private loadActiveChallenges(): void {
    const challenges = this.activeChallenges.map(challenge => {
      const participation = this.userParticipations.find(p => p.challengeId === challenge.id);
      const isParticipating = !!participation;
      const progress = participation ? participation.progressPercentage : 0;
      
      return {
        ...challenge,
        isParticipating,
        userProgress: progress,
        userParticipation: participation,
        timeRemaining: this.calculateTimeRemaining(challenge.endDate),
        difficultyColor: this.getDifficultyColor(challenge.difficulty),
        formattedTarget: this.formatTarget(challenge.target, challenge.unit),
        participantText: this.getParticipantText(challenge.participantCount)
      };
    });

    this.set('activeChallenges', challenges);
  }

  private loadUserChallenges(): void {
    const userChallenges = this.userParticipations.map(participation => {
      const challenge = this.activeChallenges.find(c => c.id === participation.challengeId);
      if (!challenge) return null;

      return {
        ...challenge,
        ...participation,
        progressText: this.getProgressText(participation),
        statusText: this.getStatusText(participation),
        statusColor: this.getStatusColor(participation),
        timeRemaining: this.calculateTimeRemaining(challenge.endDate),
        canComplete: participation.currentProgress >= participation.targetProgress,
        rewardsText: this.getRewardsText(participation.rewardsEarned)
      };
    }).filter(Boolean);

    this.set('userChallenges', userChallenges);
    this.set('hasUserChallenges', userChallenges.length > 0);
  }

  private loadLeaderboards(): void {
    const leaderboards = this.activeChallenges.map(challenge => {
      const leaderboard = this.challengeService.getChallengeLeaderboard(challenge.id);
      if (!leaderboard) return null;

      const userEntry = leaderboard.entries.find(entry => 
        entry.userId === this.socialService.getSocialProfile()?.userId
      );

      return {
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        challengeIcon: challenge.icon,
        challengeColor: challenge.color,
        entries: leaderboard.entries.slice(0, 10), // Top 10
        userRank: userEntry?.rank,
        userValue: userEntry?.value,
        totalParticipants: leaderboard.entries.length,
        lastUpdated: leaderboard.lastUpdated,
        formattedEntries: leaderboard.entries.slice(0, 10).map((entry, index) => ({
          ...entry,
          position: index + 1,
          displayName: entry.isAnonymous ? `Anonymous ${entry.rank}` : entry.displayName,
          formattedValue: this.formatValue(entry.value, challenge.unit),
          rankIcon: this.getRankIcon(index + 1),
          rankColor: this.getRankColor(index + 1)
        }))
      };
    }).filter(Boolean);

    this.set('leaderboards', leaderboards);
    this.set('hasLeaderboards', leaderboards.length > 0);
  }

  private updateTabContent(): void {
    switch (this.selectedTab) {
      case 'active':
        this.set('tabTitle', '🎯 Active Challenges');
        this.set('tabDescription', 'Join community challenges and compete with others');
        break;
      case 'my_challenges':
        this.set('tabTitle', '📊 My Challenges');
        this.set('tabDescription', 'Track your progress and view your achievements');
        break;
      case 'leaderboards':
        this.set('tabTitle', '🏆 Leaderboards');
        this.set('tabDescription', 'See how you rank against other participants');
        break;
      case 'social':
        this.set('tabTitle', '👥 Social');
        this.set('tabDescription', 'Connect with friends and join circles');
        break;
    }
  }

  // Public methods for UI interaction
  onTabChange(tab: 'active' | 'my_challenges' | 'leaderboards' | 'social'): void {
    this.selectedTab = tab;
    this.set('selectedTab', tab);
    this.updateTabContent();
  }

  async onJoinChallenge(challengeId: string): Promise<void> {
    try {
      this.set('isJoining', challengeId);
      
      await this.challengeService.joinChallenge(challengeId);
      
      this.showSuccess('Successfully joined the challenge!');
      this.loadChallengeData();
      
    } catch (error) {
      console.error('Failed to join challenge:', error);
      this.showError('Failed to join challenge: ' + error.message);
    } finally {
      this.set('isJoining', null);
    }
  }

  async onLeaveChallenge(challengeId: string): Promise<void> {
    try {
      const { Dialogs } = require('@nativescript/core');
      
      const result = await Dialogs.confirm({
        title: 'Leave Challenge',
        message: 'Are you sure you want to leave this challenge? Your progress will be lost.',
        okButtonText: 'Leave',
        cancelButtonText: 'Cancel'
      });

      if (result) {
        await this.challengeService.leaveChallenge(challengeId);
        this.showSuccess('Left the challenge');
        this.loadChallengeData();
      }
      
    } catch (error) {
      console.error('Failed to leave challenge:', error);
      this.showError('Failed to leave challenge');
    }
  }

  onViewChallengeDetails(challengeId: string): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate({
      moduleName: 'views/challenge-detail-page',
      context: { challengeId }
    });
  }

  onInviteFriends(challengeId: string): void {
    // Show friend invitation dialog
    this.showFriendInviteDialog(challengeId);
  }

  onShareChallenge(challengeId: string): void {
    const challenge = this.activeChallenges.find(c => c.id === challengeId);
    if (challenge) {
      const { SocialShare } = require('@nativescript/social-share');
      const shareText = `Join me in the "${challenge.title}" challenge on Unplug! ${challenge.description} #DigitalWellness #Challenge`;
      SocialShare.shareText(shareText, 'Join My Challenge!');
    }
  }

  onRefresh(): void {
    this.initializeChallenges();
  }

  onNavigateToCircles(): void {
    try {
      console.log('Navigating to circles page...');
      const { Frame } = require('@nativescript/core');
      Frame.topmost().navigate('views/circles-page');
    } catch (error) {
      console.error('Failed to navigate to circles:', error);
      this.showNavigationError('Circles');
    }
  }

  onNavigateToLeaderboards(): void {
    try {
      console.log('Navigating to leaderboards page...');
      const { Frame } = require('@nativescript/core');
      Frame.topmost().navigate('views/leaderboards-page');
    } catch (error) {
      console.error('Failed to navigate to leaderboards:', error);
      this.showNavigationError('Leaderboards');
    }
  }

  onNavigateToFriends(): void {
    try {
      console.log('Navigating to friends page...');
      const { Frame } = require('@nativescript/core');
      Frame.topmost().navigate('views/friends-page');
    } catch (error) {
      console.error('Failed to navigate to friends:', error);
      this.showNavigationError('Friends');
    }
  }

  onNavigateToAchievementSharing(): void {
    try {
      console.log('Navigating to achievement sharing page...');
      const { Frame, Dialogs } = require('@nativescript/core');

      // Get user's achievements to share
      const userProfile = this.userDataService.getUserProfile();
      const unlockedAchievements = userProfile.achievements.filter(a => a.unlocked);

      if (unlockedAchievements.length === 0) {
        // Show message if no achievements to share
        Dialogs.alert({
          title: 'No Achievements Yet',
          message: 'Complete some offline sessions to unlock achievements you can share!',
          okButtonText: 'Got it'
        });
        return;
      }

      // Navigate with the most recent achievement
      const latestAchievement = unlockedAchievements[unlockedAchievements.length - 1];
      console.log('Sharing achievement:', latestAchievement.title);
      Frame.topmost().navigate({
        moduleName: 'views/achievement-sharing-page',
        context: { achievement: latestAchievement }
      });
    } catch (error) {
      console.error('Failed to navigate to achievement sharing:', error);
      this.showNavigationError('Achievement Sharing');
    }
  }

  // Helper methods
  private calculateTimeRemaining(endDate: Date | string): string {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} left`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} left`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} left`;
    }
  }

  private getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'hard': return '#EF4444';
      case 'expert': return '#8B5CF6';
      default: return '#6B7280';
    }
  }

  private formatTarget(target: number, unit: string): string {
    switch (unit) {
      case 'minutes':
        if (target >= 60) {
          const hours = Math.floor(target / 60);
          const minutes = target % 60;
          return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
        return `${target}m`;
      case 'days':
        return `${target} day${target !== 1 ? 's' : ''}`;
      case 'sessions':
        return `${target} session${target !== 1 ? 's' : ''}`;
      default:
        return `${target} ${unit}`;
    }
  }

  private getParticipantText(count: number): string {
    if (count === 0) return 'Be the first to join!';
    if (count === 1) return '1 participant';
    return `${count} participants`;
  }

  private getProgressText(participation: ChallengeParticipation): string {
    const challenge = this.activeChallenges.find(c => c.id === participation.challengeId);
    if (!challenge) return '';

    const current = this.formatTarget(participation.currentProgress, challenge.unit);
    const target = this.formatTarget(participation.targetProgress, challenge.unit);
    return `${current} / ${target}`;
  }

  private getStatusText(participation: ChallengeParticipation): string {
    if (participation.isCompleted) return 'Completed';
    if (participation.progressPercentage >= 100) return 'Ready to Complete';
    if (participation.progressPercentage >= 75) return 'Almost There';
    if (participation.progressPercentage >= 25) return 'In Progress';
    return 'Just Started';
  }

  private getStatusColor(participation: ChallengeParticipation): string {
    if (participation.isCompleted) return '#10B981';
    if (participation.progressPercentage >= 75) return '#F59E0B';
    if (participation.progressPercentage >= 25) return '#3B82F6';
    return '#6B7280';
  }

  private getRewardsText(rewards: any[]): string {
    if (rewards.length === 0) return 'No rewards earned yet';
    if (rewards.length === 1) return `1 reward earned`;
    return `${rewards.length} rewards earned`;
  }

  private formatValue(value: number, unit: string): string {
    return this.formatTarget(value, unit);
  }

  private getRankIcon(position: number): string {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${position}`;
    }
  }

  private getRankColor(position: number): string {
    switch (position) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#6B7280';
    }
  }

  private showFriendInviteDialog(challengeId: string): void {
    // In a real implementation, this would show a friend selection dialog
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: 'Invite Friends',
      message: 'Friend invitation feature coming soon!',
      okButtonText: 'OK'
    });
  }

  private showSuccess(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'success', message });
  }

  private showError(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'error', message });
  }

  onBack(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  private showNavigationError(featureName: string): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: 'Navigation Error',
      message: `Unable to open ${featureName}. Please try again or restart the app.`,
      okButtonText: 'OK'
    });
  }

  // Getters for computed properties
  get tabOptions(): any[] {
    return [
      { id: 'active', name: 'Active', icon: '🎯' },
      { id: 'my_challenges', name: 'My Challenges', icon: '📊' },
      { id: 'leaderboards', name: 'Leaderboards', icon: '🏆' },
      { id: 'social', name: 'Social', icon: '👥' }
    ];
  }

  get challengeStats(): any {
    const totalChallenges = this.activeChallenges.length;
    const joinedChallenges = this.userParticipations.length;
    const completedChallenges = this.userParticipations.filter(p => p.isCompleted).length;
    
    return {
      totalChallenges,
      joinedChallenges,
      completedChallenges,
      completionRate: joinedChallenges > 0 ? Math.round((completedChallenges / joinedChallenges) * 100) : 0
    };
  }
}
