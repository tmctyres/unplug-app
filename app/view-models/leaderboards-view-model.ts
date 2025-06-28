import { Observable } from '@nativescript/core';
import { LeaderboardService, LeaderboardConfig } from '../services/leaderboard-service';
import { SocialService } from '../services/social-service';
import { UserDataService } from '../models/user-data';
import { Leaderboard, LeaderboardEntry } from '../models/social-data';
import { SocialBackendClient } from '../services/social-backend-client';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';

export class LeaderboardsViewModel extends Observable {
  private leaderboardService: LeaderboardService;
  private socialService: SocialService;
  private userDataService: UserDataService;
  private backendClient: SocialBackendClient;
  private leaderboardConfigs: LeaderboardConfig[] = [];
  private selectedLeaderboardId: string = 'weekly_minutes';

  constructor() {
    super();
    this.leaderboardService = LeaderboardService.getInstance();
    this.socialService = SocialService.getInstance();
    this.userDataService = UserDataService.getInstance();
    this.backendClient = SocialBackendClient.getInstance();
    this.initializeLeaderboards();
    this.setupEventListeners();
    this.loadRealLeaderboards();
  }

  private async initializeLeaderboards(): Promise<void> {
    try {
      this.set('isLoading', true);
      
      // Load leaderboard configurations
      this.leaderboardConfigs = this.leaderboardService.getLeaderboardConfigs();
      
      // Load leaderboard data
      this.loadLeaderboardData();
      
      // Check user participation status
      this.loadParticipationStatus();
      
    } catch (error) {
      console.error('Failed to load leaderboards:', error);
      this.set('hasError', true);
      this.set('errorMessage', 'Failed to load leaderboards');
    } finally {
      this.set('isLoading', false);
    }
  }

  private setupEventListeners(): void {
    this.leaderboardService.on('propertyChange', (args) => {
      if (isPropertyChangeEvent(args) &&
          (args.propertyName === 'leaderboardUpdated' ||
           args.propertyName === 'userLeaderboardsUpdated' ||
           args.propertyName === 'leaderboardParticipationChanged')) {
        this.loadLeaderboardData();
      }
    });
  }

  private loadLeaderboardData(): void {
    // Load all leaderboards
    this.loadLeaderboardList();
    
    // Load selected leaderboard details
    this.loadSelectedLeaderboard();
    
    // Load user stats
    this.loadUserStats();
  }

  private loadLeaderboardList(): void {
    const leaderboards = this.leaderboardConfigs.map(config => {
      const leaderboard = this.leaderboardService.getLeaderboard(config.id);
      const userRank = this.leaderboardService.getUserRank(config.id);
      const userValue = this.leaderboardService.getUserValue(config.id);
      
      return {
        ...config,
        userRank,
        userValue,
        userValueFormatted: userValue ? this.leaderboardService.formatValue(userValue, config.category) : 'N/A',
        userRankText: userRank ? this.leaderboardService.getRankIcon(userRank) : 'Not ranked',
        participantCount: leaderboard?.entries.length || 0,
        lastUpdated: leaderboard?.lastUpdated,
        isSelected: config.id === this.selectedLeaderboardId
      };
    });

    this.set('leaderboards', leaderboards);
  }

  private loadSelectedLeaderboard(): void {
    const leaderboard = this.leaderboardService.getLeaderboard(this.selectedLeaderboardId);
    const config = this.leaderboardConfigs.find(c => c.id === this.selectedLeaderboardId);
    
    if (!leaderboard || !config) return;

    // Get top entries
    const topEntries = this.leaderboardService.getTopEntries(this.selectedLeaderboardId, 50);
    
    // Format entries for display
    const formattedEntries = topEntries.map(entry => ({
      ...entry,
      displayName: entry.isAnonymous ? 
        (entry.displayName || `Anonymous ${entry.rank}`) : 
        (entry.displayName || entry.username || 'Unknown'),
      formattedValue: this.leaderboardService.formatValue(entry.value, config.category),
      rankIcon: this.leaderboardService.getRankIcon(entry.rank),
      rankColor: this.leaderboardService.getRankColor(entry.rank),
      isCurrentUser: entry.userId === (this.userDataService.getUserProfile().userTitle || 'user'),
      timeAgo: this.getTimeAgo(entry.lastActive)
    }));

    // Get user position
    const userPosition = this.leaderboardService.getUserPosition(this.selectedLeaderboardId);
    
    this.set('selectedLeaderboard', {
      ...config,
      entries: formattedEntries,
      totalParticipants: leaderboard.entries.length,
      lastUpdated: leaderboard.lastUpdated,
      userPosition
    });

    this.set('hasSelectedLeaderboard', true);
  }

  private loadUserStats(): void {
    const userStats = this.leaderboardConfigs.map(config => {
      const userRank = this.leaderboardService.getUserRank(config.id);
      const userValue = this.leaderboardService.getUserValue(config.id);
      const userPosition = this.leaderboardService.getUserPosition(config.id);
      
      return {
        leaderboardId: config.id,
        name: config.name,
        icon: config.icon,
        color: config.color,
        userRank,
        userValue,
        userValueFormatted: userValue ? this.leaderboardService.formatValue(userValue, config.category) : 'N/A',
        userPercentile: userPosition?.percentile,
        isRanked: userRank !== null
      };
    }).filter(stat => stat.isRanked);

    this.set('userStats', userStats);
    this.set('hasUserStats', userStats.length > 0);
  }

  private loadParticipationStatus(): void {
    const socialSettings = this.socialService.getSocialSettings();
    const isParticipating = socialSettings?.showInLeaderboards || false;
    const anonymousId = this.leaderboardService.getAnonymousId();
    
    this.set('isParticipating', isParticipating);
    this.set('anonymousId', anonymousId);
  }

  // Public methods for UI interaction
  onSelectLeaderboard(leaderboardId: string): void {
    this.selectedLeaderboardId = leaderboardId;
    this.set('selectedLeaderboardId', leaderboardId);
    this.loadSelectedLeaderboard();
    this.loadLeaderboardList(); // Update selection state
  }

  async onToggleParticipation(): Promise<void> {
    try {
      const currentStatus = this.get('isParticipating');
      const newStatus = !currentStatus;
      
      if (!newStatus) {
        // Show confirmation dialog
        const { Dialogs } = require('@nativescript/core');
        const result = await Dialogs.confirm({
          title: 'Leave Leaderboards',
          message: 'Are you sure you want to stop participating in leaderboards? Your progress will be removed from all rankings.',
          okButtonText: 'Leave',
          cancelButtonText: 'Cancel'
        });
        
        if (!result) return;
      }
      
      this.set('isUpdatingParticipation', true);
      await this.leaderboardService.toggleLeaderboardParticipation(newStatus);
      
      this.set('isParticipating', newStatus);
      this.loadLeaderboardData();
      
      this.showSuccess(newStatus ? 'Joined leaderboards!' : 'Left leaderboards');
      
    } catch (error) {
      console.error('Failed to toggle participation:', error);
      this.showError('Failed to update participation');
    } finally {
      this.set('isUpdatingParticipation', false);
    }
  }

  onRegenerateAnonymousId(): void {
    const { Dialogs } = require('@nativescript/core');
    
    Dialogs.confirm({
      title: 'Change Anonymous Name',
      message: 'This will generate a new anonymous name for you on leaderboards. Continue?',
      okButtonText: 'Change',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result) {
        this.leaderboardService.regenerateAnonymousId();
        this.loadParticipationStatus();
        this.loadLeaderboardData();
        this.showSuccess('Anonymous name changed!');
      }
    });
  }

  onViewUserProfile(userId: string): void {
    // In a real app, this would navigate to user profile
    // For anonymous leaderboards, this might show limited info
    console.log('View profile for user:', userId);
  }

  onShareLeaderboard(): void {
    const selectedLeaderboard = this.get('selectedLeaderboard');
    if (!selectedLeaderboard) return;

    const userPosition = selectedLeaderboard.userPosition;
    let shareText = `Check out the ${selectedLeaderboard.name} leaderboard on Unplug! 🏆`;
    
    if (userPosition) {
      shareText += ` I'm ranked #${userPosition.rank} out of ${userPosition.total} participants (top ${userPosition.percentile}%)!`;
    }
    
    shareText += ' #DigitalWellness #Leaderboard';

    const { SocialShare } = require('@nativescript/social-share');
    SocialShare.shareText(shareText, 'Leaderboard Achievement!');
  }

  onRefresh(): void {
    this.initializeLeaderboards();
  }

  onViewSettings(): void {
    this.showLeaderboardSettings();
  }

  // Helper methods
  private getTimeAgo(date: Date | string): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  }

  private showLeaderboardSettings(): void {
    const { Dialogs } = require('@nativescript/core');
    
    const options = [
      'Toggle Participation',
      'Change Anonymous Name',
      'Privacy Settings',
      'Cancel'
    ];
    
    Dialogs.action({
      title: 'Leaderboard Settings',
      actions: options,
      cancelButtonText: 'Cancel'
    }).then((result) => {
      switch (result) {
        case 'Toggle Participation':
          this.onToggleParticipation();
          break;
        case 'Change Anonymous Name':
          this.onRegenerateAnonymousId();
          break;
        case 'Privacy Settings':
          this.showPrivacySettings();
          break;
      }
    });
  }

  private showPrivacySettings(): void {
    const { Dialogs } = require('@nativescript/core');
    
    Dialogs.alert({
      title: 'Privacy Information',
      message: 'All leaderboards are anonymous. Your real name and profile information are never shown. You appear as "' + this.get('anonymousId') + '" to other users.',
      okButtonText: 'Got it'
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

  // Getters for computed properties
  get participationStatusText(): string {
    return this.get('isParticipating') ? 
      'You are participating in leaderboards' : 
      'You are not participating in leaderboards';
  }

  get participationButtonText(): string {
    return this.get('isParticipating') ? 'Leave Leaderboards' : 'Join Leaderboards';
  }

  get participationButtonClass(): string {
    return this.get('isParticipating') ? 
      'btn btn-outline-danger' : 
      'btn btn-primary';
  }

  get selectedLeaderboardTitle(): string {
    const selected = this.get('selectedLeaderboard');
    return selected ? `🏆 ${selected.name}` : '🏆 Leaderboards';
  }

  get userRankSummary(): string {
    const userStats = this.get('userStats') || [];
    if (userStats.length === 0) return 'Not ranked in any leaderboards';
    
    const topRanks = userStats
      .filter(stat => stat.userRank && stat.userRank <= 10)
      .length;
    
    if (topRanks > 0) {
      return `Top 10 in ${topRanks} leaderboard${topRanks !== 1 ? 's' : ''}`;
    }

    return `Ranked in ${userStats.length} leaderboard${userStats.length !== 1 ? 's' : ''}`;
  }

  // Real backend integration methods
  private async loadRealLeaderboards(): Promise<void> {
    try {
      if (!this.backendClient.isAuthenticated()) {
        console.log('Leaderboards: User not authenticated, using local data');
        return;
      }

      this.set('isLoadingReal', true);
      this.set('backendError', '');

      const response = await this.backendClient.getLeaderboards();

      if (response.success && response.data) {
        this.set('realLeaderboards', response.data);
        this.set('hasRealData', true);
        console.log(`Leaderboards: Loaded ${response.data.length} real leaderboards`);

        // Load entries for the first leaderboard
        if (response.data.length > 0) {
          await this.loadRealLeaderboardEntries(response.data[0].id);
        }
      } else {
        console.error('Leaderboards: Failed to load real leaderboards:', response.error);
        this.set('backendError', response.error || 'Failed to load leaderboards');
        this.set('hasRealData', false);
      }
    } catch (error) {
      console.error('Leaderboards: Error loading real leaderboards:', error);
      this.set('backendError', error.message || 'Network error');
      this.set('hasRealData', false);
    } finally {
      this.set('isLoadingReal', false);
    }
  }

  private async loadRealLeaderboardEntries(leaderboardId: string): Promise<void> {
    try {
      this.set('isLoadingEntries', true);

      const response = await this.backendClient.getLeaderboardEntries(leaderboardId, 100, 0);

      if (response.success && response.data) {
        this.set('realLeaderboardEntries', response.data);
        console.log(`Leaderboards: Loaded ${response.data.length} entries for ${leaderboardId}`);
      } else {
        console.error('Leaderboards: Failed to load entries:', response.error);
        this.set('realLeaderboardEntries', []);
      }
    } catch (error) {
      console.error('Leaderboards: Error loading entries:', error);
      this.set('realLeaderboardEntries', []);
    } finally {
      this.set('isLoadingEntries', false);
    }
  }

  async onSubmitRealScore(leaderboardId: string, value: number, isAnonymous: boolean = false): Promise<void> {
    try {
      if (!this.backendClient.isAuthenticated()) {
        this.showError('Please login to submit scores to leaderboards');
        return;
      }

      this.set('isSubmittingScore', true);

      const response = await this.backendClient.submitScore(leaderboardId, value, isAnonymous);

      if (response.success && response.data) {
        this.showSuccess(`Score submitted! You're ranked #${response.data.rank}`);

        // Refresh leaderboard entries
        await this.loadRealLeaderboardEntries(leaderboardId);

        // Emit event for other components
        this.notifyPropertyChange('scoreSubmitted', {
          leaderboardId,
          entry: response.data
        });
      } else {
        console.error('Leaderboards: Failed to submit score:', response.error);
        this.showError(response.error || 'Failed to submit score');
      }
    } catch (error) {
      console.error('Leaderboards: Error submitting score:', error);
      this.showError(error.message || 'Network error');
    } finally {
      this.set('isSubmittingScore', false);
    }
  }

  async onRefreshRealData(): Promise<void> {
    await this.loadRealLeaderboards();
  }

  async onSelectRealLeaderboard(leaderboardId: string): Promise<void> {
    this.set('selectedRealLeaderboardId', leaderboardId);
    await this.loadRealLeaderboardEntries(leaderboardId);
  }



  // Getters for UI binding
  get hasBackendConnection(): boolean {
    return this.backendClient.isAuthenticated();
  }

  get isUsingRealData(): boolean {
    return this.get('hasRealData') || false;
  }

  get realLeaderboards(): any[] {
    return this.get('realLeaderboards') || [];
  }

  get realLeaderboardEntries(): any[] {
    return this.get('realLeaderboardEntries') || [];
  }
}
