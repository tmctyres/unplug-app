import { Observable, Device, Utils } from '@nativescript/core';

export enum FeedbackType {
  SUCCESS = 'success',
  ACHIEVEMENT = 'achievement',
  LEVEL_UP = 'level_up',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  STREAK = 'streak',
  WARNING = 'warning',
  ERROR = 'error'
}

export enum HapticType {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export interface FeedbackConfig {
  haptic?: HapticType;
  sound?: boolean;
  visual?: boolean;
  notification?: boolean;
  duration?: number;
}

export class FeedbackService extends Observable {
  private static instance: FeedbackService;
  private isHapticSupported: boolean = false;
  private isSoundEnabled: boolean = true;
  private isVisualEnabled: boolean = true;

  private constructor() {
    super();
    this.initializeCapabilities();
  }

  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  private initializeCapabilities(): void {
    // Check if haptic feedback is supported
    if (Device.os === 'iOS') {
      this.isHapticSupported = true;
    } else if (Device.os === 'Android') {
      // Android haptic support varies by device
      this.isHapticSupported = true;
    }
  }

  async provideFeedback(type: FeedbackType, customConfig?: Partial<FeedbackConfig>): Promise<void> {
    const config = this.getFeedbackConfig(type, customConfig);
    
    const promises: Promise<void>[] = [];

    if (config.haptic && this.isHapticSupported) {
      promises.push(this.triggerHaptic(config.haptic));
    }

    if (config.sound && this.isSoundEnabled) {
      promises.push(this.playSound(type));
    }

    if (config.visual && this.isVisualEnabled) {
      promises.push(this.showVisualFeedback(type, config.duration));
    }

    if (config.notification) {
      promises.push(this.showNotification(type));
    }

    await Promise.all(promises);
  }

  private getFeedbackConfig(type: FeedbackType, customConfig?: Partial<FeedbackConfig>): FeedbackConfig {
    const defaultConfigs: Record<FeedbackType, FeedbackConfig> = {
      [FeedbackType.SUCCESS]: {
        haptic: HapticType.SUCCESS,
        sound: true,
        visual: true,
        notification: false,
        duration: 2000
      },
      [FeedbackType.ACHIEVEMENT]: {
        haptic: HapticType.SUCCESS,
        sound: true,
        visual: true,
        notification: true,
        duration: 3000
      },
      [FeedbackType.LEVEL_UP]: {
        haptic: HapticType.SUCCESS,
        sound: true,
        visual: true,
        notification: true,
        duration: 4000
      },
      [FeedbackType.SESSION_START]: {
        haptic: HapticType.LIGHT,
        sound: true,
        visual: true,
        notification: false,
        duration: 1500
      },
      [FeedbackType.SESSION_END]: {
        haptic: HapticType.MEDIUM,
        sound: true,
        visual: true,
        notification: false,
        duration: 2000
      },
      [FeedbackType.STREAK]: {
        haptic: HapticType.SUCCESS,
        sound: true,
        visual: true,
        notification: true,
        duration: 2500
      },
      [FeedbackType.WARNING]: {
        haptic: HapticType.WARNING,
        sound: false,
        visual: true,
        notification: false,
        duration: 1500
      },
      [FeedbackType.ERROR]: {
        haptic: HapticType.ERROR,
        sound: false,
        visual: true,
        notification: false,
        duration: 2000
      }
    };

    return { ...defaultConfigs[type], ...customConfig };
  }

  private async triggerHaptic(type: HapticType): Promise<void> {
    try {
      if (Device.os === 'iOS') {
        await this.triggerIOSHaptic(type);
      } else if (Device.os === 'Android') {
        await this.triggerAndroidHaptic(type);
      }
    } catch (error) {
      console.error('Failed to trigger haptic feedback:', error);
    }
  }

  private async triggerIOSHaptic(type: HapticType): Promise<void> {
    if (!Utils.ios) return;

    try {
      // Use iOS UIImpactFeedbackGenerator
      let feedbackGenerator: any;
      
      switch (type) {
        case HapticType.LIGHT:
          feedbackGenerator = UIImpactFeedbackGenerator.alloc().initWithStyle(UIImpactFeedbackStyle.Light);
          break;
        case HapticType.MEDIUM:
          feedbackGenerator = UIImpactFeedbackGenerator.alloc().initWithStyle(UIImpactFeedbackStyle.Medium);
          break;
        case HapticType.HEAVY:
          feedbackGenerator = UIImpactFeedbackGenerator.alloc().initWithStyle(UIImpactFeedbackStyle.Heavy);
          break;
        case HapticType.SUCCESS:
          feedbackGenerator = UINotificationFeedbackGenerator.alloc().init();
          feedbackGenerator.notificationOccurred(UINotificationFeedbackType.Success);
          return;
        case HapticType.WARNING:
          feedbackGenerator = UINotificationFeedbackGenerator.alloc().init();
          feedbackGenerator.notificationOccurred(UINotificationFeedbackType.Warning);
          return;
        case HapticType.ERROR:
          feedbackGenerator = UINotificationFeedbackGenerator.alloc().init();
          feedbackGenerator.notificationOccurred(UINotificationFeedbackType.Error);
          return;
        default:
          feedbackGenerator = UIImpactFeedbackGenerator.alloc().initWithStyle(UIImpactFeedbackStyle.Medium);
      }

      feedbackGenerator.prepare();
      feedbackGenerator.impactOccurred();
    } catch (error) {
      console.error('iOS haptic feedback error:', error);
    }
  }

  private async triggerAndroidHaptic(type: HapticType): Promise<void> {
    if (!Utils.android) return;

    try {
      const context = Utils.android.getApplicationContext();
      const vibrator = context.getSystemService(android.content.Context.VIBRATOR_SERVICE);
      
      if (!vibrator || !vibrator.hasVibrator()) {
        return;
      }

      // Map haptic types to vibration patterns
      let pattern: number[];
      
      switch (type) {
        case HapticType.LIGHT:
          pattern = [0, 50];
          break;
        case HapticType.MEDIUM:
          pattern = [0, 100];
          break;
        case HapticType.HEAVY:
          pattern = [0, 200];
          break;
        case HapticType.SUCCESS:
          pattern = [0, 50, 50, 100];
          break;
        case HapticType.WARNING:
          pattern = [0, 100, 100, 100];
          break;
        case HapticType.ERROR:
          pattern = [0, 200, 100, 200];
          break;
        default:
          pattern = [0, 100];
      }

      if (android.os.Build.VERSION.SDK_INT >= 26) {
        // Use VibrationEffect for newer Android versions
        const vibrationEffect = android.os.VibrationEffect.createWaveform(pattern, -1);
        vibrator.vibrate(vibrationEffect);
      } else {
        // Fallback for older Android versions
        vibrator.vibrate(pattern, -1);
      }
    } catch (error) {
      console.error('Android haptic feedback error:', error);
    }
  }

  private async playSound(type: FeedbackType): Promise<void> {
    try {
      // For now, we'll use system sounds
      // In a full implementation, you'd load custom sound files
      
      if (Device.os === 'iOS' && Utils.ios) {
        let soundId: number;
        
        switch (type) {
          case FeedbackType.SUCCESS:
          case FeedbackType.ACHIEVEMENT:
          case FeedbackType.LEVEL_UP:
            soundId = 1057; // System sound for success
            break;
          case FeedbackType.SESSION_START:
            soundId = 1103; // System sound for begin
            break;
          case FeedbackType.SESSION_END:
            soundId = 1104; // System sound for end
            break;
          case FeedbackType.STREAK:
            soundId = 1057; // Success sound
            break;
          default:
            soundId = 1057;
        }
        
        // Play system sound
        if (typeof (global as any).AudioServicesPlaySystemSound !== 'undefined') {
          (global as any).AudioServicesPlaySystemSound(soundId);
        } else {
          console.log('iOS audio API not available - would play sound:', soundId);
        }
      }
      
      // Android system sounds would be implemented similarly
      // using MediaPlayer or SoundPool
      
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }

  private async showVisualFeedback(type: FeedbackType, duration: number = 2000): Promise<void> {
    // Emit event for UI components to handle visual feedback
    this.notifyPropertyChange('visualFeedback', {
      type,
      duration,
      timestamp: Date.now()
    });
  }

  private async showNotification(type: FeedbackType): Promise<void> {
    try {
      const { LocalNotifications } = require('@nativescript/local-notifications');
      
      const messages = {
        [FeedbackType.ACHIEVEMENT]: {
          title: "Achievement Unlocked! 🏆",
          body: "You've earned a new achievement!"
        },
        [FeedbackType.LEVEL_UP]: {
          title: "Level Up! 🎉",
          body: "Congratulations on reaching a new level!"
        },
        [FeedbackType.STREAK]: {
          title: "Streak Milestone! 🔥",
          body: "Your consistency is paying off!"
        }
      };

      const message = messages[type];
      if (message) {
        await LocalNotifications.schedule([{
          id: Date.now(),
          title: message.title,
          body: message.body,
          badge: 1
        }]);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Settings methods
  setHapticEnabled(enabled: boolean): void {
    this.isHapticSupported = this.isHapticSupported && enabled;
  }

  setSoundEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled;
  }

  setVisualEnabled(enabled: boolean): void {
    this.isVisualEnabled = enabled;
  }

  // Quick feedback methods for common scenarios
  async celebrateAchievement(): Promise<void> {
    await this.provideFeedback(FeedbackType.ACHIEVEMENT);
  }

  async celebrateLevelUp(): Promise<void> {
    await this.provideFeedback(FeedbackType.LEVEL_UP);
  }

  async sessionStarted(): Promise<void> {
    await this.provideFeedback(FeedbackType.SESSION_START);
  }

  async sessionCompleted(): Promise<void> {
    await this.provideFeedback(FeedbackType.SESSION_END);
  }

  async streakAchieved(): Promise<void> {
    await this.provideFeedback(FeedbackType.STREAK);
  }
}
