import { Observable, EventData } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import { TrackingService, TrackingSession } from '../services/tracking-service';
import { ThemeService } from '../services/theme-service';
import { MonetizationService } from '../services/monetization-service';
import { SubscriptionManager } from '../services/subscription-manager';
import { FeedbackService, FeedbackType } from '../services/feedback-service';
import { CelebrationOverlay, CelebrationData } from '../components/celebration-overlay';
import { NotificationService } from '../services/notification-service';
import { TutorialService } from '../services/tutorial-service';
import { TutorialOverlay } from '../components/tutorial-overlay';
import { FeatureUnlockService } from '../services/feature-unlock-service';
import { PerformanceUtils } from '../utils/performance-utils';

/**
 * Custom event interface for property changes
 * Extends EventData to include property name and value
 */
interface CustomPropertyChangeEventData extends EventData {
  propertyName: string;
  value: any;
}

/**
 * MainViewModel - Primary view model for the main application screen
 *
 * This view model orchestrates:
 * - User data display and real-time updates
 * - Session tracking controls and feedback
 * - Achievement and progression systems
 * - Tutorial and onboarding flows
 * - Feature unlock notifications
 * - Performance optimizations with debouncing
 * - Cross-service event coordination
 *
 * @extends Observable - Provides data binding for UI components
 */
export class MainViewModel extends Observable {
  // Core services for app functionality
  private userDataService: UserDataService;
  private trackingService: TrackingService;
  private themeService: ThemeService;
  private monetizationService: MonetizationService;
  private subscriptionManager: SubscriptionManager;
  private feedbackService: FeedbackService;
  public celebrationOverlay: CelebrationOverlay;
  private notificationService: NotificationService;
  private tutorialService: TutorialService;
  private tutorialOverlay: TutorialOverlay;
  private featureUnlockService: FeatureUnlockService;

  // Performance optimization utilities
  private updateDisplayDataDebounced: () => void;
  private eventListeners: Array<{ service: any; event: string; handler: Function }> = [];

  /**
   * Constructor initializes all services and sets up the view model
   * Uses delayed initialization to prevent blocking the UI thread
   */
  constructor() {
    super();

    // Initialize core services immediately
    this.userDataService = UserDataService.getInstance();
    this.trackingService = TrackingService.getInstance();

    // Create debounced update method to prevent excessive UI updates
    this.updateDisplayDataDebounced = PerformanceUtils.debounce(
      () => this.updateDisplayData(),
      100 // 100ms debounce
    );

    // Initialize basic display data
    this.updateDisplayData();

    // Initialize session feedback
    this.set('showSessionFeedback', false);

    // Defer heavy initialization to avoid blocking UI
    setTimeout(() => this.initializeServices(), 0);
    setTimeout(() => this.initializeFeatures(), 100);
    setTimeout(() => this.checkDelayedFeatures(), 2000);
  }

  private initializeServices(): void {
    this.themeService = ThemeService.getInstance();
    this.feedbackService = FeedbackService.getInstance();
    this.notificationService = NotificationService.getInstance();

    this.setupEventListeners();
    this.initializeNotifications();
  }

  private initializeFeatures(): void {
    this.monetizationService = MonetizationService.getInstance();
    this.subscriptionManager = SubscriptionManager.getInstance();
    this.tutorialService = TutorialService.getInstance();
    this.featureUnlockService = FeatureUnlockService.getInstance();

    // Create overlays
    this.celebrationOverlay = new CelebrationOverlay();
    this.tutorialOverlay = new TutorialOverlay();

    // Expose overlays for XML binding
    this.set('celebrationOverlay', this.celebrationOverlay);
    this.set('tutorialOverlay', this.tutorialOverlay);

    // Setup subscription event listeners now that subscriptionManager is initialized
    this.setupSubscriptionEventListeners();

    this.initializeMonetization();
    this.initializeTutorials();
    this.initializeFeatureUnlocks();
  }

  private checkDelayedFeatures(): void {
    this.checkSocialOnboarding();
    this.checkForTutorials();
  }

  private setupEventListeners(): void {
    this.userDataService.on('propertyChange', (args: CustomPropertyChangeEventData) => {
      if (args.propertyName === 'userProfile') {
        this.updateDisplayData();
      } else if (args.propertyName === 'achievementUnlocked') {
        this.showAchievementNotification(args.value);
      } else if (args.propertyName === 'levelUp') {
        this.showLevelUpCelebration(args.value.oldLevel, args.value.newLevel);
      } else if (args.propertyName === 'streakMilestone') {
        this.handleStreakMilestone(args.value.streak, args.value.isNewRecord);
      }
    });

    this.trackingService.on('propertyChange', (args: CustomPropertyChangeEventData) => {
      if (args.propertyName === 'sessionCompleted') {
        this.handleSessionCompleted(args.value);
      } else if (args.propertyName === 'sessionUpdated') {
        this.updateCurrentSession();
      } else if (args.propertyName === 'sessionStarted') {
        this.updateCurrentSession();
      }
    });
  }

  private setupSubscriptionEventListeners(): void {
    // Setup subscription manager event listeners separately
    // This is called after subscriptionManager is initialized
    if (this.subscriptionManager && this.subscriptionManager.on) {
      this.subscriptionManager.on('propertyChange', (args: CustomPropertyChangeEventData) => {
        if (args.propertyName === 'subscriptionExpiringSoon') {
          this.handleSubscriptionExpiringSoon(args.value);
        } else if (args.propertyName === 'subscriptionExpired') {
          this.handleSubscriptionExpired();
        }
      });
    }
  }

  private updateDisplayData(): void {
    const profile = this.userDataService.getUserProfile();
    const todayStats = this.userDataService.getTodayStats();
    const currentSession = this.trackingService.getCurrentSession();

    this.set('userLevel', profile.level);
    this.set('totalXP', profile.totalXP);
    this.set('currentStreak', profile.currentStreak);
    this.set('longestStreak', profile.longestStreak);
    
    this.set('todayOfflineTime', todayStats ? this.trackingService.formatDuration(todayStats.offlineMinutes) : '0m');
    this.set('todayXP', todayStats ? todayStats.xpEarned : 0);
    
    this.set('dailyGoal', this.trackingService.formatDuration(profile.settings.dailyGoalMinutes));
    this.set('dailyProgress', todayStats ? Math.min(100, (todayStats.offlineMinutes / profile.settings.dailyGoalMinutes) * 100) : 0);

    this.set('trackingMode', this.trackingService.getTrackingMode());
    this.set('isSessionActive', this.trackingService.isSessionActive());
    this.set('isPremium', profile.settings.isPremium);
    
    if (currentSession && currentSession.isActive) {
      this.set('currentSessionDuration', this.trackingService.formatDuration(currentSession.duration));
    } else {
      this.set('currentSessionDuration', '');
    }

    // Calculate XP to next level using new progressive system
    const xpToNextLevel = this.userDataService.getXPForNextLevel();
    const levelProgress = this.userDataService.getLevelProgress();

    this.set('xpToNextLevel', xpToNextLevel);
    this.set('levelProgress', levelProgress);

    // Add new level-related properties
    this.set('userTitle', profile.userTitle);
    this.set('userBadge', profile.userBadge);
    this.set('xpMultiplier', profile.xpMultiplier);

    // Update feature unlock status for UI binding
    this.updateFeatureUnlockStatus();

    // Update next unlockable features
    const nextFeatures = this.getNextUnlockableFeatures();
    this.set('nextUnlockableFeatures', nextFeatures);
  }

  private updateFeatureUnlockStatus(): void {
    // Create a function that can be called from XML bindings
    this.set('isFeatureUnlocked', (featureId: string) => {
      return this.featureUnlockService.isFeatureUnlocked(featureId);
    });
  }

  private updateCurrentSession(): void {
    const currentSession = this.trackingService.getCurrentSession();
    this.set('isSessionActive', this.trackingService.isSessionActive());
    
    if (currentSession && currentSession.isActive) {
      this.set('currentSessionDuration', this.trackingService.formatDuration(currentSession.duration));
    } else {
      this.set('currentSessionDuration', '');
    }
  }

  private async handleSessionCompleted(session: TrackingSession): Promise<void> {
    const previousLevel = this.userDataService.getUserProfile().level;
    const previousAchievements = this.userDataService.getUserProfile().achievements.filter(a => a.unlocked).length;

    // Enhanced session processing with quality and goal tracking
    this.userDataService.addOfflineTime(session.duration, session.startTime);

    // Handle goal completion if session had a goal
    let goalCompleted = false;
    if (session.goalId) {
      this.handleGoalCompletion(session.goalId, session.duration);
      goalCompleted = true; // Assume goal was attempted
    }

    this.updateDisplayData();

    // Provide enhanced haptic and sound feedback
    if (this.feedbackService) {
      await this.feedbackService.sessionCompleted();
    }

    // Check for level up with enhanced celebration
    const currentLevel = this.userDataService.getUserProfile().level;
    if (currentLevel > previousLevel) {
      await this.handleLevelUp(previousLevel, currentLevel);
    }

    // Check for new achievements with better feedback
    const currentAchievements = this.userDataService.getUserProfile().achievements.filter(a => a.unlocked).length;
    if (currentAchievements > previousAchievements) {
      await this.handleNewAchievements(previousAchievements, currentAchievements);
    }

    // Show enhanced session completion celebration
    const sessionData = this.createEnhancedSessionData(session, goalCompleted);
    await this.showEnhancedSessionCelebration(sessionData);

    // Offer contextual session note based on quality
    this.offerContextualSessionNote(session);

    // Show smart completion notification
    this.showSessionCompletedNotification(session);

    // Show ad if appropriate (with better timing)
    setTimeout(() => {
      if (this.monetizationService.shouldShowAd('session_complete')) {
        this.showInterstitialAd();
      }
    }, 3000);

    // Check for feature unlocks and discoveries with staggered timing
    setTimeout(() => {
      this.checkForFeatureUnlocks();
    }, 2000);

    setTimeout(() => {
      this.checkFeatureDiscovery();
    }, 4000);

    // Auto-save progress
    setTimeout(() => {
      this.autoSaveProgress();
    }, 1000);
  }

  private createEnhancedSessionData(session: TrackingSession, goalCompleted: boolean): any {
    const userProfile = this.userDataService.getUserProfile();
    const xpEarned = session.duration; // Base XP calculation

    return {
      duration: session.duration,
      formattedDuration: this.trackingService.formatDuration(session.duration),
      quality: session.quality,
      xpEarned,
      goalCompleted,
      goalId: session.goalId,
      streak: userProfile.currentStreak,
      level: userProfile.level,
      totalSessions: userProfile.totalSessions,
      isPersonalBest: this.checkPersonalBest(session.duration),
      qualityMessage: this.getQualityMessage(session.quality),
      encouragementMessage: this.getEncouragementMessage(session)
    };
  }

  private async showEnhancedSessionCelebration(sessionData: any): Promise<void> {
    // Create multi-stage celebration based on session quality and achievements
    const celebrationStages = [];

    // Stage 1: Basic completion
    celebrationStages.push({
      type: 'session_complete',
      data: sessionData,
      duration: 2000
    });

    // Stage 2: Goal completion (if applicable)
    if (sessionData.goalCompleted) {
      celebrationStages.push({
        type: 'goal_complete',
        data: sessionData,
        duration: 1500
      });
    }

    // Stage 3: Personal best (if applicable)
    if (sessionData.isPersonalBest) {
      celebrationStages.push({
        type: 'personal_best',
        data: sessionData,
        duration: 2000
      });
    }

    // Show celebrations in sequence
    for (const stage of celebrationStages) {
      await this.celebrationOverlay.showCelebration(stage);
      await new Promise(resolve => setTimeout(resolve, stage.duration));
    }
  }

  private checkPersonalBest(duration: number): boolean {
    const userProfile = this.userDataService.getUserProfile();
    const recentSessions = userProfile.sessionNotes
      .slice(-10) // Last 10 sessions
      .map(note => note.sessionDuration);

    return duration > Math.max(...recentSessions, 0);
  }

  private getQualityMessage(quality: string): string {
    const messages = {
      excellent: "🌟 Exceptional focus! You're mastering mindfulness.",
      good: "👏 Great session! Your dedication is inspiring.",
      fair: "✨ Good progress! Every step counts.",
      short: "🌱 Nice start! Building habits takes time."
    };
    return messages[quality] || messages.fair;
  }

  private getEncouragementMessage(session: TrackingSession): string {
    const userProfile = this.userDataService.getUserProfile();
    const streak = userProfile.currentStreak;

    if (streak >= 30) return "🔥 You're on fire! 30+ day streak!";
    if (streak >= 7) return "💪 Week-long streak! Incredible consistency!";
    if (streak >= 3) return "🌟 Building momentum! Keep it up!";
    if (userProfile.totalSessions === 1) return "🎉 First session complete! Welcome to your journey!";

    return "🌱 Growing stronger with each session!";
  }

  private offerContextualSessionNote(session: TrackingSession): void {
    // Offer session note with context-aware prompts
    const prompts = this.generateContextualPrompts(session);
    this.set('sessionNotePrompts', prompts);
    this.set('showSessionNoteDialog', true);
  }

  private generateContextualPrompts(session: TrackingSession): string[] {
    const prompts = [];

    if (session.quality === 'excellent') {
      prompts.push("What made this session so effective?");
      prompts.push("How did you maintain such great focus?");
    } else if (session.quality === 'short') {
      prompts.push("What interrupted your session?");
      prompts.push("How can you extend your next session?");
    } else {
      prompts.push("How did this session feel?");
      prompts.push("What would you like to improve next time?");
    }

    if (session.goalId) {
      prompts.push("How well did you meet your session goal?");
    }

    return prompts;
  }

  private autoSaveProgress(): void {
    // Automatically save progress and sync if needed
    this.userDataService.saveUserData();

    // Trigger cloud sync if available
    if (this.userDataService.getUserProfile().settings.backupEnabled) {
      this.notifyPropertyChange('triggerCloudSync', true);
    }
  }

  private async initializeMonetization(): Promise<void> {
    try {
      await this.monetizationService.initializeAdMob();

      // Show banner ad if user is not premium
      const userProfile = this.userDataService.getUserProfile();
      if (!userProfile.settings.isPremium && userProfile.settings.showAds) {
        await this.monetizationService.showBannerAd('main-banner');
      }
    } catch (error) {
      console.error('Failed to initialize monetization:', error);
    }
  }

  private async initializeNotifications(): Promise<void> {
    try {
      const userProfile = this.userDataService.getUserProfile();
      if (userProfile.settings.notificationsEnabled) {
        await this.notificationService.initialize();
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  private async showInterstitialAd(): Promise<void> {
    try {
      await this.monetizationService.showInterstitialAd();
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
    }
  }

  private showAchievementNotification(achievement: any): void {
    const { Dialogs } = require('@nativescript/core');

    const rarityEmoji = {
      'Common': '⚪',
      'Rare': '🔵',
      'Epic': '🟣',
      'Legendary': '🟡'
    };

    const categoryEmoji = {
      'Time-based': '⏰',
      'Streak': '🔥',
      'Milestone': '🏁',
      'Level': '⭐',
      'Time of Day': '🌅',
      'Weekend': '🏖️',
      'Combo': '🎯',
      'Seasonal': '🌿'
    };

    const emoji = rarityEmoji[achievement.rarityName] || '🏆';
    const catEmoji = categoryEmoji[achievement.categoryName] || '🎯';

    const message = `${emoji} ${achievement.rarityName} Achievement!\n${catEmoji} ${achievement.categoryName}\n\n${achievement.icon} ${achievement.title}\n\n${achievement.description}\n\n💰 +${achievement.actualXPReward} XP earned!\n${achievement.actualXPReward > achievement.xpReward ? `(${achievement.rarityName} bonus applied!)` : ''}`;

    Dialogs.alert({
      title: "🎉 Achievement Unlocked!",
      message: message,
      okButtonText: "Amazing!"
    }).then(() => {
      console.log(`Achievement notification shown: ${achievement.title} (${achievement.rarityName})`);
    });
  }

  private showSessionCompletedNotification(session: TrackingSession): void {
    const { LocalNotifications } = require('@nativescript/local-notifications');

    LocalNotifications.schedule([{
      id: Date.now(),
      title: "Great job! 🌟",
      body: `You stayed offline for ${this.trackingService.formatDuration(session.duration)}! Keep it up!`,
      badge: 1
    }]);
  }

  private async showEnhancedSessionCompletedNotification(session: TrackingSession): Promise<void> {
    const userProfile = this.userDataService.getUserProfile();
    const todayStats = this.userDataService.getTodayStats();
    const xpEarned = session.duration;

    // Create personalized completion message
    let title = "Great job! 🌟";
    let body = `You stayed offline for ${this.trackingService.formatDuration(session.duration)}!`;

    // Add personalized elements based on user progress
    if (userProfile.currentStreak >= 7) {
      title = `${userProfile.currentStreak}-day streak champion! 🔥`;
    } else if (todayStats && todayStats.offlineMinutes >= userProfile.settings.dailyGoalMinutes) {
      title = "Daily goal achieved! 🎯";
      body += " You've reached your daily goal!";
    } else if (xpEarned >= 60) {
      title = "Amazing session! ⭐";
      body += ` You earned ${xpEarned} XP!`;
    }

    // Add motivational context
    const progress = todayStats ? (todayStats.offlineMinutes / userProfile.settings.dailyGoalMinutes) * 100 : 0;
    if (progress >= 100) {
      body += " Time to celebrate your achievement!";
    } else if (progress >= 75) {
      body += " You're so close to your daily goal!";
    } else {
      body += " Keep building those healthy habits!";
    }

    await this.notificationService.sendImmediateNotification(title, body);

    // Reschedule smart notifications based on new progress
    this.notificationService.rescheduleNotifications();
  }

  private async handleLevelUp(previousLevel: number, newLevel: number): Promise<void> {
    const userProfile = this.userDataService.getUserProfile();

    // Provide feedback for level up
    if (this.feedbackService) {
      await this.feedbackService.celebrateLevelUp();
    }

    // Show level up celebration
    if (this.celebrationOverlay) {
      const celebrationData = CelebrationOverlay.createLevelUpCelebration(
        newLevel,
        userProfile.userTitle
      );
      await this.celebrationOverlay.showCelebration(celebrationData);
    }

    // Send personalized level up notification
    if (this.notificationService) {
      await this.notificationService.sendImmediateNotification(
        `Level ${newLevel} achieved! 🎉`,
        `Congratulations! You're now a ${userProfile.userTitle}. Your dedication to digital wellness is paying off!`
      );
    }
  }

  private async handleNewAchievements(previousCount: number, currentCount: number): Promise<void> {
    const achievements = this.userDataService.getUserProfile().achievements;
    const newAchievements = achievements.filter(a => a.unlocked).slice(previousCount);

    for (const achievement of newAchievements) {
      // Provide feedback for each achievement
      await this.feedbackService.celebrateAchievement();

      // Show achievement celebration
      const celebrationData = CelebrationOverlay.createAchievementCelebration(
        achievement.title,
        achievement.xpReward
      );
      await this.celebrationOverlay.showCelebration(celebrationData);

      // Send personalized achievement notification
      await this.notificationService.sendImmediateNotification(
        `Achievement unlocked! 🏆`,
        `"${achievement.title}" - ${achievement.description}. You earned ${achievement.xpReward} XP!`
      );

      // Small delay between multiple achievements
      if (newAchievements.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async handleStreakMilestone(streak: number, isNewRecord: boolean): Promise<void> {
    // Provide feedback for streak milestone
    await this.feedbackService.streakAchieved();

    // Show streak celebration
    const celebrationData = CelebrationOverlay.createStreakCelebration(streak);
    await this.celebrationOverlay.showCelebration(celebrationData);

    // Show additional feedback for new records
    if (isNewRecord) {
      this.showSessionFeedback('🏆', `New personal record! ${streak} day streak!`, 4000);
    }
  }

  private handleGoalCompletion(goalId: string, sessionDuration: number): void {
    const goalAchieved = this.userDataService.completeSessionGoal(goalId, sessionDuration);
    const goal = this.userDataService.getSessionGoalById(goalId);

    if (goalAchieved && goal) {
      this.showSessionFeedback(
        '🎯',
        `Goal "${goal.title}" achieved! You completed ${this.trackingService.formatDuration(sessionDuration)}.`,
        4000
      );
    } else if (goal) {
      const remaining = goal.targetMinutes - sessionDuration;
      this.showSessionFeedback(
        '⏱️',
        `Almost there! You needed ${remaining} more minutes to complete "${goal.title}".`,
        3000
      );
    }

    // Clear the current goal
    this.trackingService.clearCurrentGoal();
  }

  private offerSessionNote(sessionDuration: number): void {
    // Show a prompt asking if user wants to add a note
    setTimeout(() => {
      const { Dialogs } = require('@nativescript/core');
      Dialogs.confirm({
        title: "Add Session Note? 📝",
        message: "Would you like to add a note about what you did during your offline time? This helps track your progress and reflect on your experiences.",
        okButtonText: "Add Note",
        cancelButtonText: "Skip"
      }).then((result) => {
        if (result) {
          this.onNavigateToSessionNotes(sessionDuration);
        }
      });
    }, 2000); // Wait 2 seconds after celebration
  }

  public showSessionFeedback(icon: string, text: string, duration: number = 3000): void {
    this.set('sessionFeedbackIcon', icon);
    this.set('sessionFeedbackText', text);
    this.set('showSessionFeedback', true);

    setTimeout(() => {
      this.set('showSessionFeedback', false);
    }, duration);
  }

  /**
   * Starts a manual tracking session
   * Used primarily for iOS where automatic tracking is not available
   * Provides immediate feedback and updates the UI
   */
  async onStartSession(): Promise<void> {
    if (this.trackingService.startManualSession()) {
      if (this.feedbackService) {
        await this.feedbackService.sessionStarted();
      }
      this.showSessionFeedback('🚀', 'Session started! Time to unplug and focus.');
      this.updateCurrentSession();
    }
  }

  /**
   * Ends the current manual tracking session
   * Calculates session quality, awards XP, and triggers celebrations
   * Provides completion feedback to the user
   */
  async onEndSession(): Promise<void> {
    const session = this.trackingService.endManualSession();
    if (session) {
      this.showSessionFeedback('✨', `Great job! You stayed offline for ${this.trackingService.formatDuration(session.duration)}.`);
      await this.handleSessionCompleted(session);
    }
  }

  // Navigation methods
  onNavigateToAchievements(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/achievements-page');
  }

  onNavigateToStats(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/stats-page');
  }

  onNavigateToWeeklyReport(): void {
    const userProfile = this.userDataService.getUserProfile();

    if (!userProfile.settings.isPremium) {
      const { Dialogs } = require('@nativescript/core');
      Dialogs.confirm({
        title: "Premium Feature",
        message: "Weekly reports are available with Unplug Pro. Would you like to upgrade?",
        okButtonText: "Upgrade",
        cancelButtonText: "Cancel"
      }).then((result) => {
        if (result) {
          this.onNavigateToSubscription();
        }
      });
      return;
    }

    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/weekly-report-page');
  }

  onNavigateToSubscription(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/subscription-page');
  }

  private handleSubscriptionExpiringSoon(data: any): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "Subscription Expiring Soon",
      message: `Your ${data.planId} subscription expires in ${data.daysRemaining} days. Renew now to continue enjoying Pro features!`,
      okButtonText: "Renew Now"
    }).then(() => {
      this.onNavigateToSubscription();
    });
  }

  private handleSubscriptionExpired(): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "Subscription Expired",
      message: "Your Pro subscription has expired. You've been switched to the free plan. Upgrade again to restore Pro features!",
      okButtonText: "Upgrade"
    }).then(() => {
      this.onNavigateToSubscription();
    });

    // Refresh display to show free plan status
    this.updateDisplayData();
  }

  onNavigateToSettings(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/settings-page');
  }

  onNavigateToSessionNotes(sessionDuration?: number): void {
    const { Frame } = require('@nativescript/core');
    const context = sessionDuration ? { sessionDuration } : undefined;
    Frame.topmost().navigate({
      moduleName: 'views/session-notes-page',
      context
    });
  }

  onNavigateToSessionGoals(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/session-goals-page');
  }

  onNavigateToAnalyticsDashboard(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/analytics-dashboard-page');
  }

  onNavigateToCommunity(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/community-challenges-page');
  }

  onNavigateToCircles(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/circles-page');
  }

  onNavigateToSocialOnboarding(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/social-onboarding-page');
  }

  onNavigateToLeaderboards(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/leaderboards-page');
  }

  private checkSocialOnboarding(): void {
    // Check if user should see social onboarding
    const { SocialOnboardingService } = require('../services/social-onboarding-service');
    const onboardingService = SocialOnboardingService.getInstance();

    if (onboardingService.shouldShowOnboarding()) {
      // Show onboarding prompt
      this.showSocialOnboardingPrompt();
    }
  }

  private showSocialOnboardingPrompt(): void {
    const { Dialogs } = require('@nativescript/core');

    Dialogs.confirm({
      title: 'Join the Community! 🌟',
      message: 'Connect with others on their digital wellness journey. Share achievements, get support, and discover new strategies together.',
      okButtonText: 'Get Started',
      cancelButtonText: 'Maybe Later'
    }).then((result) => {
      if (result) {
        this.onNavigateToSocialOnboarding();
      }
    });
  }

  // Getters for computed properties
  get welcomeMessage(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning! 🌅";
    if (hour < 17) return "Good afternoon! ☀️";
    return "Good evening! 🌙";
  }

  get motivationalMessage(): string {
    const profile = this.userDataService.getUserProfile();
    const todayStats = this.userDataService.getTodayStats();
    
    if (!todayStats || todayStats.offlineMinutes === 0) {
      return "Ready to start your digital detox journey?";
    }
    
    if (todayStats.offlineMinutes >= profile.settings.dailyGoalMinutes) {
      return "🎉 You've reached your daily goal! Amazing work!";
    }
    
    const remaining = profile.settings.dailyGoalMinutes - todayStats.offlineMinutes;
    return `${this.trackingService.formatDuration(remaining)} left to reach your daily goal!`;
  }

  private showLevelUpCelebration(oldLevel: number, newLevel: number): void {
    const { Dialogs } = require('@nativescript/core');
    const levelInfo = this.userDataService.getLevelInfo(newLevel);

    const message = `🎉 Congratulations! 🎉\n\nYou've reached Level ${newLevel}!\n\n${levelInfo.badge} ${levelInfo.title}\n\nXP Multiplier: ${levelInfo.xpMultiplier}x\n\nKeep up the amazing work on your digital wellness journey!`;

    Dialogs.alert({
      title: "Level Up!",
      message: message,
      okButtonText: "Awesome!"
    }).then(() => {
      // Could trigger additional celebrations like confetti animation
      console.log(`Level up celebration shown: ${oldLevel} -> ${newLevel}`);
    });
  }

  // Tutorial System Methods
  private initializeTutorials(): void {
    // Setup tutorial event listeners
    this.tutorialService.on('tutorialStep', (args: EventData & { data: any }) => {
      this.handleTutorialStep(args.data);
    });

    this.tutorialService.on('tutorialCompleted', (args: EventData & { data: any }) => {
      this.handleTutorialCompleted(args.data);
    });

    this.tutorialOverlay.on('tutorialNext', () => {
      this.tutorialService.nextStep();
    });

    this.tutorialOverlay.on('tutorialPrevious', () => {
      this.tutorialService.previousStep();
    });

    this.tutorialOverlay.on('tutorialSkip', () => {
      this.tutorialService.skipTutorial();
    });

    // Setup tooltip event listeners
    this.tutorialService.on('showTooltip', (args: EventData & { data: any }) => {
      this.handleShowTooltip(args.data);
    });

    this.tutorialService.on('hideTooltip', (args: EventData & { data: any }) => {
      this.handleHideTooltip(args.data);
    });
  }

  private checkForTutorials(): void {
    // Only check for tutorials if user has completed onboarding
    const userProfile = this.userDataService.getUserProfile();
    if (userProfile.settings.hasCompletedOnboarding) {
      this.tutorialService.checkForAvailableTutorials();
    }
  }

  private async handleTutorialStep(data: any): Promise<void> {
    const { tutorial, step, stepIndex, totalSteps } = data;

    // Show tutorial overlay with step data
    await this.tutorialOverlay.showTutorialStep(tutorial, step, stepIndex);
  }

  private async handleTutorialCompleted(data: any): Promise<void> {
    const { tutorialId } = data;

    // Hide tutorial overlay
    await this.tutorialOverlay.hideTutorial();

    // Show completion feedback
    this.showSessionFeedback('🎉', `Tutorial completed! You're getting the hang of Unplug.`);

    console.log(`Tutorial completed: ${tutorialId}`);
  }

  // Tutorial Event Handlers (called from XML)
  onTutorialNext(): void {
    this.tutorialService.nextStep();
  }

  onTutorialPrevious(): void {
    this.tutorialService.previousStep();
  }

  onTutorialSkip(): void {
    this.tutorialService.skipTutorial();
  }

  // Public method to manually start tutorials
  startTutorial(tutorialId: string): void {
    this.tutorialService.startTutorial(tutorialId);
  }

  // Check for pending tutorials and tooltips
  checkForPendingTutorials(): void {
    // Check for available tutorials
    this.tutorialService.checkForAvailableTutorials();

    // Check for feature unlock tooltips
    this.checkFeatureUnlockTooltips();

    // Check for contextual help tooltips
    this.checkContextualTooltips();
  }

  private checkFeatureUnlockTooltips(): void {
    const nextFeatures = this.getNextUnlockableFeatures();

    // Show tooltip for features that are close to being unlocked
    nextFeatures.forEach(feature => {
      if (feature.progress >= 80) { // 80% progress towards unlock
        this.showFeatureUnlockTooltip(feature);
      }
    });
  }

  private checkContextualTooltips(): void {
    const userProfile = this.userDataService.getUserProfile();
    const progress = userProfile.settings.tutorialProgress;

    if (!progress || !progress.tutorialPreferences.showTooltips) {
      return;
    }

    // Show contextual tooltips based on user behavior
    if (userProfile.totalSessions === 0) {
      this.showFirstSessionTooltip();
    } else if (userProfile.totalSessions === 1) {
      this.showSecondSessionTooltip();
    } else if (userProfile.currentStreak >= 3 && !progress.dismissedTooltips.includes('streak_celebration')) {
      this.showStreakCelebrationTooltip();
    }
  }

  private showFeatureUnlockTooltip(feature: any): void {
    const tooltipConfig = {
      id: `feature_unlock_${feature.id}`,
      title: `${feature.name} Almost Unlocked! 🎉`,
      message: `You're ${feature.progress.toFixed(0)}% of the way to unlocking ${feature.name}. ${feature.description}`,
      targetElement: '.feature-grid',
      position: 'top' as const,
      showOnce: true,
      dismissible: true,
      autoHide: 6000,
      icon: feature.icon
    };

    this.tutorialService.showTooltip(tooltipConfig);
  }

  private showFirstSessionTooltip(): void {
    const tooltipConfig = {
      id: 'first_session_help',
      title: 'Ready for Your First Session? 🌟',
      message: 'Tap "Start Session" to begin tracking your offline time. Every minute counts towards your digital wellness journey!',
      targetElement: '.session-controls',
      position: 'bottom' as const,
      showOnce: true,
      dismissible: true,
      autoHide: 8000,
      icon: '🚀',
      actionText: 'Got it!',
      actionCallback: () => {
        // Mark tooltip as seen
        this.userDataService.markTooltipDismissed('first_session_help');
      }
    };

    this.tutorialService.showTooltip(tooltipConfig);
  }

  private showSecondSessionTooltip(): void {
    const tooltipConfig = {
      id: 'second_session_help',
      title: 'Great Job! 🎯',
      message: 'You completed your first session! Try to build a streak by doing another session today.',
      targetElement: '.stats-section',
      position: 'top' as const,
      showOnce: true,
      dismissible: true,
      autoHide: 6000,
      icon: '🔥'
    };

    this.tutorialService.showTooltip(tooltipConfig);
  }

  private showStreakCelebrationTooltip(): void {
    const userProfile = this.userDataService.getUserProfile();
    const tooltipConfig = {
      id: 'streak_celebration',
      title: `${userProfile.currentStreak} Day Streak! 🔥`,
      message: 'Amazing! You\'re building a fantastic habit. Keep it up to unlock more achievements!',
      targetElement: '.streak-display',
      position: 'bottom' as const,
      showOnce: true,
      dismissible: true,
      autoHide: 5000,
      icon: '🔥'
    };

    this.tutorialService.showTooltip(tooltipConfig);
  }

  // Feature Unlock System Methods
  private initializeFeatureUnlocks(): void {
    // Setup feature unlock event listeners
    this.featureUnlockService.on('featureUnlocked', (args: EventData & { data: any }) => {
      this.handleFeatureUnlocked(args.data);
    });

    // Check for initial unlocks
    setTimeout(() => {
      this.checkForFeatureUnlocks();
    }, 1000);
  }

  private checkForFeatureUnlocks(): void {
    const newlyUnlocked = this.featureUnlockService.checkForUnlocks();

    if (newlyUnlocked.length > 0) {
      // Show unlock notifications for each new feature
      newlyUnlocked.forEach((feature, index) => {
        setTimeout(() => {
          this.showFeatureUnlockNotification(feature);
        }, index * 2000); // Stagger notifications by 2 seconds
      });
    }

    // Update UI to reflect new unlocks
    this.updateFeatureVisibility();
  }

  private handleFeatureUnlocked(data: any): void {
    const { feature, unlock } = data;
    console.log(`Feature unlocked: ${feature.name}`);

    // Show tutorial if feature has one
    if (feature.tutorialId) {
      setTimeout(() => {
        this.tutorialService.startTutorial(feature.tutorialId);
      }, 3000);
    }

    // Show tooltip if feature has one
    if (feature.tooltipId) {
      setTimeout(() => {
        this.showFeatureUnlockTooltip(feature);
      }, 1000);
    }
  }

  private showFeatureUnlockNotification(feature: any): void {
    this.showSessionFeedback(
      feature.icon,
      `🎉 New Feature Unlocked: ${feature.name}! ${feature.description}`
    );

    // Also show a more detailed dialog
    setTimeout(() => {
      const { Dialogs } = require('@nativescript/core');
      Dialogs.confirm({
        title: `${feature.icon} Feature Unlocked!`,
        message: `${feature.name}\n\n${feature.description}\n\nWould you like to explore this feature now?`,
        okButtonText: 'Explore',
        cancelButtonText: 'Later'
      }).then((result) => {
        if (result) {
          this.navigateToFeature(feature.id);
        }
      });
    }, 2000);
  }



  private getFeatureTargetElement(featureId: string): string {
    // Map feature IDs to their UI elements
    const elementMap: { [key: string]: string } = {
      'achievements': '[text="🏆 Achievements"]',
      'analytics_dashboard': '[text="📊 Analytics"]',
      'social_profile': '[text="🌟 Social Setup"]',
      'circles': '[text="👥 Circles"]',
      'challenges': '[text="🎯 Challenges"]',
      'leaderboards': '[text="🏆 Leaderboards"]',
      'session_goals': '[text="🎯 Session Goals"]',
      'session_notes': '[text="📝 Session Notes"]',
      'premium_analytics': '[text="💎 Upgrade Pro"]'
    };

    return elementMap[featureId] || '';
  }

  private navigateToFeature(featureId: string): void {
    // Navigate to the appropriate page based on feature ID
    switch (featureId) {
      case 'achievements':
        this.onNavigateToAchievements();
        break;
      case 'analytics_dashboard':
        this.onNavigateToAnalyticsDashboard();
        break;
      case 'social_profile':
      case 'circles':
      case 'challenges':
        this.onNavigateToSocialOnboarding();
        break;
      case 'leaderboards':
        this.onNavigateToLeaderboards();
        break;
      case 'session_goals':
        this.onNavigateToSessionGoals();
        break;
      case 'session_notes':
        this.onNavigateToSessionNotes();
        break;
      case 'premium_analytics':
        this.onNavigateToSubscription();
        break;
      default:
        console.log(`No navigation defined for feature: ${featureId}`);
    }
  }

  private updateFeatureVisibility(): void {
    // Update visibility of UI elements based on unlocked features
    this.updateDisplayData(); // This will refresh the UI with current unlock state

    // Update next unlockable features for the "Coming Soon" section
    const nextFeatures = this.getNextUnlockableFeatures();
    this.set('nextUnlockableFeatures', nextFeatures);
  }

  // Public API for checking feature unlocks
  isFeatureUnlocked(featureId: string): boolean {
    return this.featureUnlockService?.isFeatureUnlocked(featureId) || false;
  }

  getNextUnlockableFeatures(): any[] {
    return this.featureUnlockService?.getNextUnlockableFeatures() || [];
  }

  // Tooltip System Methods
  private handleShowTooltip(config: any): void {
    // For now, we'll use simple dialogs for tooltips
    // In a full implementation, you'd create a proper tooltip overlay
    const { Dialogs } = require('@nativescript/core');

    Dialogs.confirm({
      title: `${config.icon || '💡'} ${config.title}`,
      message: config.message,
      okButtonText: config.actionText || 'Got it!',
      cancelButtonText: 'Dismiss',
      neutralButtonText: config.dismissible ? 'Don\'t show again' : undefined
    }).then((result) => {
      if (result === undefined) { // Neutral button (Don't show again)
        this.tutorialService.dismissTooltip(config.id);
      } else if (result && config.actionCallback) {
        config.actionCallback();
      }
    });
  }

  private handleHideTooltip(data: any): void {
    // Handle tooltip hiding if needed
    console.log(`Tooltip hidden: ${data.tooltipId}`);
  }

  // Feature Discovery Methods
  private checkFeatureDiscovery(): void {
    const userProfile = this.userDataService.getUserProfile();

    // Check for new achievements tooltip
    if (userProfile.totalSessions >= 1 && !this.hasSeenTooltip('achievements_intro')) {
      this.showFeatureTooltip(
        'achievements_intro',
        'New Feature: Achievements! 🏆',
        'You\'ve completed your first session! Check out your achievements to see your progress and unlock rewards.',
        'View Achievements',
        () => this.onNavigateToAchievements()
      );
    }

    // Check for analytics tooltip
    if (userProfile.totalSessions >= 3 && !this.hasSeenTooltip('analytics_intro')) {
      this.showFeatureTooltip(
        'analytics_intro',
        'Analytics Available! 📊',
        'With multiple sessions completed, you can now view detailed analytics about your offline time patterns.',
        'View Analytics',
        () => this.onNavigateToAnalyticsDashboard()
      );
    }

    // Check for social features tooltip
    if (userProfile.level >= 3 && !this.hasSeenTooltip('social_intro')) {
      this.showFeatureTooltip(
        'social_intro',
        'Social Features Unlocked! 👥',
        'You\'ve reached level 3! Connect with others on their digital wellness journey through circles and challenges.',
        'Explore Social',
        () => this.onNavigateToSocialOnboarding()
      );
    }

    // Check for premium features tooltip
    if (userProfile.totalSessions >= 10 && !userProfile.settings.isPremium && !this.hasSeenTooltip('premium_intro')) {
      this.showFeatureTooltip(
        'premium_intro',
        'Unlock Premium Features! 💎',
        'You\'re a dedicated user! Upgrade to Premium for advanced analytics, cloud backup, and exclusive achievements.',
        'Learn More',
        () => this.onNavigateToSubscription()
      );
    }
  }

  private hasSeenTooltip(tooltipId: string): boolean {
    const progress = this.userDataService.getUserProfile().settings.tutorialProgress;
    return progress?.dismissedTooltips.includes(tooltipId) || false;
  }

  private showFeatureTooltip(
    id: string,
    title: string,
    message: string,
    actionText?: string,
    actionCallback?: () => void
  ): void {
    this.tutorialService.showTooltip({
      id,
      title,
      message,
      targetElement: '',
      position: 'top',
      showOnce: true,
      dismissible: true,
      autoHide: 10000,
      icon: '✨',
      actionText,
      actionCallback
    });
  }

  // Debug Methods (remove in production)
  onStartTutorialDebug(): void {
    const { Dialogs } = require('@nativescript/core');

    Dialogs.action({
      title: "🎓 Tutorial Debug",
      message: "Choose a tutorial to test:",
      actions: [
        "Main App Tour",
        "Reset Onboarding",
        "Test Feature Tooltip",
        "Check Feature Unlocks",
        "Cancel"
      ],
      cancelButtonText: "Cancel"
    }).then(result => {
      switch (result) {
        case "Main App Tour":
          this.startTutorial('main_app_tour');
          break;
        case "Reset Onboarding":
          this.resetOnboardingDebug();
          break;
        case "Test Feature Tooltip":
          this.testFeatureTooltip();
          break;
        case "Check Feature Unlocks":
          this.checkForFeatureUnlocks();
          break;
      }
    });
  }

  private resetOnboardingDebug(): void {
    // Reset onboarding status
    const userProfile = this.userDataService.getUserProfile();
    userProfile.settings.hasCompletedOnboarding = false;

    // Reset tutorial progress
    if (userProfile.settings.tutorialProgress) {
      userProfile.settings.tutorialProgress.completedTutorials = [];
      userProfile.settings.tutorialProgress.dismissedTooltips = [];
    }

    this.userDataService.saveUserData();

    // Navigate to onboarding
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate({
      moduleName: 'views/onboarding-page',
      clearHistory: true
    });
  }

  private testFeatureTooltip(): void {
    this.showFeatureTooltip(
      'test_tooltip',
      'Test Feature! 🧪',
      'This is a test tooltip to demonstrate the tooltip system. You can dismiss it or take action.',
      'Cool!',
      () => {
        this.showSessionFeedback('✅', 'Tooltip action triggered!');
      }
    );
  }

  // Performance optimization methods
  private addEventListenerTracked(service: any, event: string, handler: Function): void {
    service.on(event, handler);
    this.eventListeners.push({ service, event, handler });
  }

  // Cleanup method to prevent memory leaks
  public cleanup(): void {
    // Clean up event listeners
    for (const listener of this.eventListeners) {
      listener.service.off(listener.event, listener.handler);
    }
    this.eventListeners = [];

    // Cancel debounced functions
    if (this.updateDisplayDataDebounced && (this.updateDisplayDataDebounced as any).cancel) {
      (this.updateDisplayDataDebounced as any).cancel();
    }

    // Clean up performance utils
    PerformanceUtils.cleanup.cleanupAll();
  }

}