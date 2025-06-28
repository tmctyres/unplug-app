import { Observable, Device } from '@nativescript/core';
import { UserDataService } from '../models/user-data';

export interface NotificationTemplate {
  id: string;
  title: string;
  body: string;
  category: 'motivation' | 'reminder' | 'achievement' | 'streak' | 'goal' | 'tip';
  personalizable: boolean;
  conditions?: NotificationCondition[];
}

export interface NotificationCondition {
  type: 'time_of_day' | 'streak_length' | 'goal_progress' | 'last_session' | 'user_level';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between';
  value: any;
}

export interface ScheduledNotification {
  id: string;
  templateId: string;
  scheduledTime: Date;
  personalizedTitle: string;
  personalizedBody: string;
  sent: boolean;
}

export class NotificationService extends Observable {
  private static instance: NotificationService;
  private userDataService: UserDataService;
  private notificationTemplates: NotificationTemplate[] = [];
  private scheduledNotifications: ScheduledNotification[] = [];
  private isInitialized: boolean = false;

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.initializeTemplates();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const { LocalNotifications } = require('@nativescript/local-notifications');
      
      // Request permission
      const hasPermission = await LocalNotifications.hasPermission();
      if (!hasPermission) {
        const granted = await LocalNotifications.requestPermission();
        if (!granted) {
          console.log('Notification permission denied');
          return false;
        }
      }

      this.isInitialized = true;
      this.scheduleSmartNotifications();
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  private initializeTemplates(): void {
    this.notificationTemplates = [
      // Morning motivation
      {
        id: 'morning_motivation',
        title: 'Good morning, {userName}! 🌅',
        body: 'Ready to start your day with some mindful offline time? Your {currentStreak}-day streak is waiting!',
        category: 'motivation',
        personalizable: true,
        conditions: [
          { type: 'time_of_day', operator: 'between', value: [7, 10] }
        ]
      },
      
      // Evening wind-down
      {
        id: 'evening_winddown',
        title: 'Time to unwind 🌙',
        body: 'Consider ending your day with some peaceful offline time. You\'ve earned {todayXP} XP today!',
        category: 'reminder',
        personalizable: true,
        conditions: [
          { type: 'time_of_day', operator: 'between', value: [19, 22] }
        ]
      },

      // Goal progress reminders
      {
        id: 'goal_progress_50',
        title: 'Halfway there! 🎯',
        body: 'You\'re 50% towards your daily goal of {dailyGoal}. Keep going!',
        category: 'goal',
        personalizable: true,
        conditions: [
          { type: 'goal_progress', operator: 'equals', value: 50 }
        ]
      },

      // Streak protection
      {
        id: 'streak_protection',
        title: 'Protect your streak! 🔥',
        body: 'Don\'t let your {currentStreak}-day streak end today. Just {remainingMinutes} more minutes to reach your goal!',
        category: 'streak',
        personalizable: true,
        conditions: [
          { type: 'streak_length', operator: 'greater_than', value: 2 },
          { type: 'goal_progress', operator: 'less_than', value: 100 }
        ]
      },

      // Achievement hints
      {
        id: 'achievement_hint',
        title: 'Achievement within reach! 🏆',
        body: 'You\'re close to unlocking "{nextAchievement}". Just {minutesNeeded} more minutes!',
        category: 'achievement',
        personalizable: true
      },

      // Level up motivation
      {
        id: 'level_up_motivation',
        title: 'Level up soon! ⭐',
        body: 'Only {xpNeeded} XP until you reach Level {nextLevel} and become a {nextTitle}!',
        category: 'motivation',
        personalizable: true,
        conditions: [
          { type: 'user_level', operator: 'greater_than', value: 1 }
        ]
      },

      // Gentle reminders for inactive users
      {
        id: 'gentle_reminder',
        title: 'We miss you! 💙',
        body: 'It\'s been a while since your last session. Even 15 minutes of offline time can make a difference.',
        category: 'reminder',
        personalizable: false,
        conditions: [
          { type: 'last_session', operator: 'greater_than', value: 2 } // 2 days
        ]
      },

      // Tips and insights
      {
        id: 'weekly_tip',
        title: 'Weekly Tip 💡',
        body: 'Did you know? Users who track their offline activities are 40% more likely to reach their goals. Try adding notes to your sessions!',
        category: 'tip',
        personalizable: false
      }
    ];
  }

  private scheduleSmartNotifications(): void {
    const userProfile = this.userDataService.getUserProfile();
    if (!userProfile.settings.notificationsEnabled) return;

    // Clear existing scheduled notifications
    this.clearScheduledNotifications();

    // Schedule notifications based on user behavior and preferences
    this.scheduleMotivationalNotifications();
    this.scheduleReminderNotifications();
    this.scheduleGoalProgressNotifications();
    this.scheduleStreakProtectionNotifications();
  }

  private scheduleMotivationalNotifications(): void {
    const userProfile = this.userDataService.getUserProfile();
    const now = new Date();

    // Morning motivation (if user has morning sessions)
    if (userProfile.morningMeditations > 0) {
      const morningTime = new Date();
      morningTime.setHours(8, 0, 0, 0);
      if (morningTime > now) {
        this.schedulePersonalizedNotification('morning_motivation', morningTime);
      }
    }

    // Evening wind-down
    const eveningTime = new Date();
    eveningTime.setHours(20, 0, 0, 0);
    if (eveningTime > now) {
      this.schedulePersonalizedNotification('evening_winddown', eveningTime);
    }
  }

  private scheduleReminderNotifications(): void {
    const userProfile = this.userDataService.getUserProfile();
    const reminderInterval = userProfile.settings.reminderInterval;
    const now = new Date();

    // Schedule reminder based on user's preferred interval
    const reminderTime = new Date(now.getTime() + reminderInterval * 60 * 1000);
    
    // Only schedule if it's during reasonable hours (9 AM - 9 PM)
    if (reminderTime.getHours() >= 9 && reminderTime.getHours() <= 21) {
      this.scheduleContextualReminder(reminderTime);
    }
  }

  private scheduleGoalProgressNotifications(): void {
    const todayStats = this.userDataService.getTodayStats();
    const userProfile = this.userDataService.getUserProfile();
    
    if (!todayStats) return;

    const progress = (todayStats.offlineMinutes / userProfile.settings.dailyGoalMinutes) * 100;
    
    // Schedule 50% progress notification if not reached yet
    if (progress < 50) {
      const estimatedTime = this.estimateTimeToReach50Percent();
      if (estimatedTime) {
        this.schedulePersonalizedNotification('goal_progress_50', estimatedTime);
      }
    }
  }

  private scheduleStreakProtectionNotifications(): void {
    const userProfile = this.userDataService.getUserProfile();
    
    if (userProfile.currentStreak >= 3) {
      const todayStats = this.userDataService.getTodayStats();
      const progress = todayStats ? 
        (todayStats.offlineMinutes / userProfile.settings.dailyGoalMinutes) * 100 : 0;

      if (progress < 100) {
        // Schedule streak protection notification for evening
        const protectionTime = new Date();
        protectionTime.setHours(21, 0, 0, 0);
        
        if (protectionTime > new Date()) {
          this.schedulePersonalizedNotification('streak_protection', protectionTime);
        }
      }
    }
  }

  private schedulePersonalizedNotification(templateId: string, scheduledTime: Date): void {
    const template = this.notificationTemplates.find(t => t.id === templateId);
    if (!template) return;

    const personalizedContent = this.personalizeNotification(template);
    
    const scheduledNotification: ScheduledNotification = {
      id: this.generateNotificationId(),
      templateId,
      scheduledTime,
      personalizedTitle: personalizedContent.title,
      personalizedBody: personalizedContent.body,
      sent: false
    };

    this.scheduledNotifications.push(scheduledNotification);
    this.scheduleNativeNotification(scheduledNotification);
  }

  private personalizeNotification(template: NotificationTemplate): { title: string; body: string } {
    if (!template.personalizable) {
      return { title: template.title, body: template.body };
    }

    const userProfile = this.userDataService.getUserProfile();
    const todayStats = this.userDataService.getTodayStats();
    
    const personalizedTitle = this.replacePersonalizationTokens(template.title, userProfile, todayStats);
    const personalizedBody = this.replacePersonalizationTokens(template.body, userProfile, todayStats);

    return { title: personalizedTitle, body: personalizedBody };
  }

  private replacePersonalizationTokens(text: string, userProfile: any, todayStats: any): string {
    const tokens = {
      '{userName}': userProfile.userTitle || 'Digital Minimalist',
      '{currentStreak}': userProfile.currentStreak.toString(),
      '{todayXP}': todayStats ? todayStats.xpEarned.toString() : '0',
      '{dailyGoal}': this.formatDuration(userProfile.settings.dailyGoalMinutes),
      '{userLevel}': userProfile.level.toString(),
      '{nextLevel}': (userProfile.level + 1).toString(),
      '{nextTitle}': this.getNextLevelTitle(userProfile.level),
      '{xpNeeded}': this.userDataService.getXPForNextLevel().toString(),
      '{remainingMinutes}': this.getRemainingMinutesForGoal().toString(),
      '{nextAchievement}': this.getNextAchievementName(),
      '{minutesNeeded}': this.getMinutesNeededForNextAchievement().toString()
    };

    let result = text;
    Object.entries(tokens).forEach(([token, value]) => {
      result = result.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    return result;
  }

  private scheduleContextualReminder(scheduledTime: Date): void {
    // Choose reminder based on user's recent activity
    const userProfile = this.userDataService.getUserProfile();
    const recentNotes = userProfile.sessionNotes?.slice(-3) || [];
    
    let reminderTemplate = 'gentle_reminder';
    
    // Customize based on user behavior
    if (userProfile.currentStreak > 7) {
      reminderTemplate = 'streak_protection';
    } else if (recentNotes.length === 0) {
      reminderTemplate = 'weekly_tip';
    }

    this.schedulePersonalizedNotification(reminderTemplate, scheduledTime);
  }

  private async scheduleNativeNotification(notification: ScheduledNotification): Promise<void> {
    try {
      const { LocalNotifications } = require('@nativescript/local-notifications');
      
      await LocalNotifications.schedule([{
        id: parseInt(notification.id),
        title: notification.personalizedTitle,
        body: notification.personalizedBody,
        at: notification.scheduledTime,
        badge: 1
      }]);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  private clearScheduledNotifications(): void {
    try {
      const { LocalNotifications } = require('@nativescript/local-notifications');
      LocalNotifications.cancel(this.scheduledNotifications.map(n => parseInt(n.id)));
      this.scheduledNotifications = [];
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  // Helper methods
  private formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  private getNextLevelTitle(currentLevel: number): string {
    // This would integrate with your level system
    const titles = ['Digital Novice', 'Screen Breaker', 'Mindful Beginner', 'Focus Finder', 'Offline Explorer'];
    return titles[currentLevel] || 'Digital Master';
  }

  private getRemainingMinutesForGoal(): number {
    const userProfile = this.userDataService.getUserProfile();
    const todayStats = this.userDataService.getTodayStats();
    const currentMinutes = todayStats ? todayStats.offlineMinutes : 0;
    return Math.max(0, userProfile.settings.dailyGoalMinutes - currentMinutes);
  }

  private getNextAchievementName(): string {
    const achievements = this.userDataService.getUserProfile().achievements;
    const nextAchievement = achievements.find(a => !a.unlocked);
    return nextAchievement ? nextAchievement.title : 'Digital Master';
  }

  private getMinutesNeededForNextAchievement(): number {
    // Simplified calculation - would need more complex logic in real implementation
    return 30;
  }

  private estimateTimeToReach50Percent(): Date | null {
    // Simple estimation based on current progress and time of day
    const now = new Date();
    const estimatedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    return estimatedTime.getHours() < 22 ? estimatedTime : null;
  }

  private generateNotificationId(): string {
    return Date.now().toString();
  }

  // Public methods
  async sendImmediateNotification(title: string, body: string): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const { LocalNotifications } = require('@nativescript/local-notifications');
      await LocalNotifications.schedule([{
        id: Date.now(),
        title,
        body,
        badge: 1
      }]);
    } catch (error) {
      console.error('Failed to send immediate notification:', error);
    }
  }

  rescheduleNotifications(): void {
    this.scheduleSmartNotifications();
  }

  getScheduledNotifications(): ScheduledNotification[] {
    return [...this.scheduledNotifications];
  }
}
