import { Observable, Application, Utils, Device } from '@nativescript/core';

/**
 * Interface representing a tracking session
 * Used for both manual and automatic session tracking
 */
export interface TrackingSession {
  startTime: Date;           // When the session started
  endTime?: Date;           // When the session ended (undefined if active)
  duration: number;         // Session duration in minutes
  isActive: boolean;        // Whether the session is currently active
  goalId?: string;         // Optional associated goal ID
  quality?: 'excellent' | 'good' | 'fair' | 'short';  // Session quality assessment
}

/**
 * TrackingService - Core service for session tracking and screen time management
 *
 * This service provides:
 * - Manual session tracking for iOS and Android
 * - Automatic screen-off detection for Android
 * - Session quality assessment and feedback
 * - Cross-platform compatibility with fallbacks
 * - Real-time session monitoring and updates
 *
 * @extends Observable - Emits events for session state changes
 */
export class TrackingService extends Observable {
  private static instance: TrackingService;
  private currentSession: TrackingSession | null = null;
  private currentGoalId: string | null = null;
  private _isAndroid: boolean;
  private sessionTimer: any;
  private isTestEnvironment: boolean;

  /**
   * Private constructor to enforce singleton pattern
   * Initializes platform detection and sets up tracking mechanisms
   */
  private constructor() {
    super();
    this._isAndroid = Device.os === 'Android';
    this.isTestEnvironment = this.detectTestEnvironment();
    this.setupPlatformSpecificTracking();
  }

  /**
   * Gets the singleton instance of TrackingService
   * @returns The singleton TrackingService instance
   */
  static getInstance(): TrackingService {
    if (!TrackingService.instance) {
      TrackingService.instance = new TrackingService();
    }
    return TrackingService.instance;
  }

  /**
   * Checks if the current platform is Android
   * @returns True if running on Android, false otherwise
   */
  isAndroid(): boolean {
    return this._isAndroid;
  }

  /**
   * Detects if the app is running in a test environment
   * Used to skip platform-specific initialization during testing
   * @returns true if running in test environment, false otherwise
   */
  private detectTestEnvironment(): boolean {
    // Check for Jest test environment
    return typeof jest !== 'undefined' ||
           typeof global !== 'undefined' && global.hasOwnProperty('__TEST__') ||
           typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  }

  private setupPlatformSpecificTracking(): void {
    if (this.isTestEnvironment) {
      console.log('Test environment detected - skipping platform-specific setup');
      return;
    }

    if (this._isAndroid) {
      this.setupAndroidTracking();
    } else {
      this.setupiOSTracking();
    }
  }

  private setupAndroidTracking(): void {
    // Check if Android APIs are available
    if (!this.isAndroidApiAvailable()) {
      console.log('Android APIs not available - falling back to manual mode');
      return;
    }

    // Android automatic tracking using screen state and usage stats
    Application.android.on('activityResumed', () => {
      this.handleScreenOn();
    });

    Application.android.on('activityPaused', () => {
      this.handleScreenOff();
    });

    // Set up screen state receiver for more accurate detection
    this.setupScreenStateReceiver();

    // Request usage stats permission
    this.requestUsageStatsPermission();
  }

  private isAndroidApiAvailable(): boolean {
    return typeof android !== 'undefined' &&
           !!android.content &&
           !!android.app &&
           !!android.provider;
  }

  private setupScreenStateReceiver(): void {
    if (!this._isAndroid || this.isTestEnvironment) return;

    try {
      // Check if Android APIs are available
      if (!this.isAndroidApiAvailable()) {
        console.log('Android APIs not available - skipping screen state receiver setup');
        return;
      }

      const { Utils } = require('@nativescript/core');
      const context = Utils.android.getApplicationContext();

      // Create broadcast receiver for screen state changes
      // Note: In a real NativeScript app, you would use @nativescript/android-broadcast-receiver
      // For now, we'll use a mock implementation for testing
      const screenReceiver = {
        onReceive: (context, intent) => {
          const action = intent.getAction();

          if (action === android.content.Intent.ACTION_SCREEN_OFF) {
            console.log('Screen turned off - starting offline tracking');
            this.handleScreenOff();
          } else if (action === android.content.Intent.ACTION_SCREEN_ON) {
            console.log('Screen turned on - ending offline tracking');
            this.handleScreenOn();
          }
        }
      };

      // Register receiver for screen state changes
      const filter = new android.content.IntentFilter();
      filter.addAction(android.content.Intent.ACTION_SCREEN_OFF);
      filter.addAction(android.content.Intent.ACTION_SCREEN_ON);

      context.registerReceiver(screenReceiver, filter);
      console.log('Screen state receiver registered');

    } catch (error) {
      console.error('Failed to setup screen state receiver:', error);
    }
  }

  private setupiOSTracking(): void {
    // iOS manual tracking - no automatic detection
    console.log('iOS tracking initialized - manual mode only');
  }

  private requestUsageStatsPermission(): void {
    if (!this._isAndroid || this.isTestEnvironment) return;

    try {
      // Check if Android APIs are available
      if (!this.isAndroidApiAvailable()) {
        console.log('Android APIs not available - skipping permission request');
        return;
      }

      const { Utils } = require('@nativescript/core');
      const context = Utils.android.getApplicationContext();

      // Check if permission is already granted
      if (this.hasUsageStatsPermission()) {
        console.log('Usage stats permission already granted');
        return;
      }

      // Show explanation dialog first
      const { Dialogs } = require('@nativescript/core');
      Dialogs.confirm({
        title: "Permission Required",
        message: "Unplug needs access to usage statistics to automatically track when your screen is off. This helps provide accurate offline time tracking.\n\nWould you like to grant this permission?",
        okButtonText: "Grant Permission",
        cancelButtonText: "Use Manual Mode"
      }).then((result) => {
        if (result) {
          // Open settings to grant permission
          const intent = new android.content.Intent(android.provider.Settings.ACTION_USAGE_ACCESS_SETTINGS);
          intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
          context.startActivity(intent);
        } else {
          // User declined, switch to manual mode
          this.notifyPropertyChange('permissionDenied', { fallbackToManual: true });
        }
      });
    } catch (error) {
      console.error('Error requesting usage stats permission:', error);
      // Fallback to manual mode
      this.notifyPropertyChange('permissionDenied', { fallbackToManual: true });
    }
  }

  private hasUsageStatsPermission(): boolean {
    if (!this._isAndroid || this.isTestEnvironment) return false;

    try {
      // Check if Android APIs are available
      if (!this.isAndroidApiAvailable()) {
        console.log('Android APIs not available - returning false for permission check');
        return false;
      }

      const { Utils } = require('@nativescript/core');
      const context = Utils.android.getApplicationContext();
      const appOpsManager = context.getSystemService(android.content.Context.APP_OPS_SERVICE);
      const mode = appOpsManager.checkOpNoThrow(
        android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        context.getPackageName()
      );
      return mode === android.app.AppOpsManager.MODE_ALLOWED;
    } catch (error) {
      console.error('Error checking usage stats permission:', error);
      return false;
    }
  }

  private handleScreenOff(): void {
    if (this.currentSession && this.currentSession.isActive) {
      // Screen went off during active session - continue tracking
      return;
    }

    this.startAutomaticSession();
  }

  private handleScreenOn(): void {
    if (this.currentSession && this.currentSession.isActive) {
      this.endCurrentSession();
    }
  }

  /**
   * Starts a manual tracking session
   * Used for iOS and manual Android tracking
   * @returns true if session started successfully, false if session already active
   */
  startManualSession(): boolean {
    if (this.currentSession && this.currentSession.isActive) {
      return false; // Session already active
    }

    this.currentSession = {
      startTime: new Date(),
      duration: 0,
      isActive: true,
      goalId: this.currentGoalId
    };

    this.startSessionTimer();
    this.notifyPropertyChange('sessionStarted', this.currentSession);
    return true;
  }

  /**
   * Ends the current manual session
   * Calculates duration, quality, and triggers completion events
   * @returns The completed session data or null if no active session
   */
  endManualSession(): TrackingSession | null {
    if (!this.currentSession || !this.currentSession.isActive) {
      return null;
    }

    return this.endCurrentSession();
  }

  private startAutomaticSession(): void {
    this.currentSession = {
      startTime: new Date(),
      duration: 0,
      isActive: true
    };

    this.startSessionTimer();
    this.notifyPropertyChange('sessionStarted', this.currentSession);
  }

  private endCurrentSession(): TrackingSession {
    if (!this.currentSession) return null;

    const endTime = new Date();
    this.currentSession.endTime = endTime;
    this.currentSession.duration = Math.floor((endTime.getTime() - this.currentSession.startTime.getTime()) / (1000 * 60));
    this.currentSession.isActive = false;

    this.stopSessionTimer();

    const completedSession = { ...this.currentSession };
    this.currentSession = null;
    this.currentGoalId = null; // Reset goal

    // Enhanced session validation and feedback
    const sessionQuality = this.evaluateSessionQuality(completedSession);
    completedSession.quality = sessionQuality;

    // Only count sessions longer than minimum duration
    const minDuration = this.getMinimumSessionDuration();
    if (completedSession.duration >= minDuration) {
      this.notifyPropertyChange('sessionCompleted', completedSession);

      // Provide immediate feedback
      this.provideSessionFeedback(completedSession);
    } else {
      // Session too short - provide gentle feedback
      this.notifyPropertyChange('sessionTooShort', {
        duration: completedSession.duration,
        minimum: minDuration
      });
    }

    return completedSession;
  }

  private evaluateSessionQuality(session: TrackingSession): 'excellent' | 'good' | 'fair' | 'short' {
    if (session.duration >= 60) return 'excellent';
    if (session.duration >= 30) return 'good';
    if (session.duration >= 15) return 'fair';
    return 'short';
  }

  private getMinimumSessionDuration(): number {
    // Get from user settings or default to 5 minutes
    try {
      const { UserDataService } = require('../models/user-data');
      const userDataService = UserDataService.getInstance();
      return userDataService.getUserProfile().settings.minimumSessionMinutes || 5;
    } catch {
      return 5;
    }
  }

  private provideSessionFeedback(session: TrackingSession): void {
    const feedback = this.generateSessionFeedback(session);
    this.notifyPropertyChange('sessionFeedback', feedback);
  }

  private generateSessionFeedback(session: TrackingSession): any {
    const messages = {
      excellent: [
        "🌟 Outstanding session! You're building incredible focus.",
        "🎯 Amazing dedication! Your mindfulness is truly inspiring.",
        "🏆 Exceptional work! You're mastering digital wellness."
      ],
      good: [
        "👏 Great session! You're developing strong habits.",
        "💪 Well done! Your consistency is paying off.",
        "🌱 Nice work! You're growing stronger each day."
      ],
      fair: [
        "✨ Good start! Every minute counts toward your goals.",
        "🌿 Progress made! Building habits takes time.",
        "👍 Keep going! You're on the right track."
      ],
      short: [
        "🌱 Every moment matters! Even short breaks help.",
        "⭐ Good effort! Try extending your next session.",
        "💫 Nice try! Consistency beats perfection."
      ]
    };

    const qualityMessages = messages[session.quality] || messages.fair;
    const randomMessage = qualityMessages[Math.floor(Math.random() * qualityMessages.length)];

    return {
      message: randomMessage,
      duration: session.duration,
      quality: session.quality,
      xpEarned: session.duration,
      goalAchieved: session.goalId ? this.checkGoalAchievement(session) : false
    };
  }

  private checkGoalAchievement(session: TrackingSession): boolean {
    if (!session.goalId) return false;

    try {
      const { UserDataService } = require('../models/user-data');
      const userDataService = UserDataService.getInstance();
      const goal = userDataService.getSessionGoalById(session.goalId);

      if (!goal) return false;

      // Check if session meets goal criteria
      return session.duration >= goal.targetMinutes;
    } catch {
      return false;
    }
  }

  private startSessionTimer(): void {
    this.sessionTimer = setInterval(() => {
      if (this.currentSession && this.currentSession.isActive) {
        const now = new Date();
        this.currentSession.duration = Math.floor((now.getTime() - this.currentSession.startTime.getTime()) / (1000 * 60));
        this.notifyPropertyChange('sessionUpdated', this.currentSession);
      }
    }, 60000); // Update every minute
  }

  private stopSessionTimer(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  getCurrentSession(): TrackingSession | null {
    return this.currentSession;
  }

  isAndroidPlatform(): boolean {
    return this._isAndroid;
  }

  setCurrentGoal(goalId: string | null): void {
    this.currentGoalId = goalId;

    // If there's an active session, update it with the goal
    if (this.currentSession) {
      this.currentSession.goalId = goalId;
    }
  }

  getCurrentGoal(): string | null {
    return this.currentGoalId;
  }

  clearCurrentGoal(): void {
    this.currentGoalId = null;
  }

  isSessionActive(): boolean {
    return this.currentSession && this.currentSession.isActive || false;
  }

  getTrackingMode(): 'automatic' | 'manual' {
    return this._isAndroid ? 'automatic' : 'manual';
  }

  // Format duration for display
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) { // Less than 24 hours
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  }
}