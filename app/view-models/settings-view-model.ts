import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import { TrackingService } from '../services/tracking-service';
import { ThemeService } from '../services/theme-service';
import { NotificationService } from '../services/notification-service';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';

export class SettingsViewModel extends Observable {
  private userDataService: UserDataService;
  private trackingService: TrackingService;
  private themeService: ThemeService;
  private notificationService: NotificationService;

  constructor() {
    super();
    
    this.userDataService = UserDataService.getInstance();
    this.trackingService = TrackingService.getInstance();
    this.themeService = ThemeService.getInstance();
    this.notificationService = NotificationService.getInstance();
    
    this.loadSettings();
    this.setupPropertyChangeListeners();
    this.setupThemeChangeListener();
  }

  private loadSettings(): void {
    const profile = this.userDataService.getUserProfile();
    const settings = profile.settings;

    this.set('dailyGoalMinutes', settings.dailyGoalMinutes);
    this.set('notificationsEnabled', settings.notificationsEnabled);
    this.set('reminderInterval', settings.reminderInterval);
    this.set('darkMode', settings.darkMode);
    this.set('isPremium', settings.isPremium);

    // Load theme information
    const currentTheme = this.themeService.getCurrentTheme();
    this.set('currentThemeName', currentTheme ? currentTheme.name : 'Default');

    this.updateDerivedProperties();
  }

  private setupPropertyChangeListeners(): void {
    this.on('propertyChange', (args) => {
      if (!isPropertyChangeEvent(args)) return;

      const propertyName = args.propertyName;
      const value = args.value;

      switch (propertyName) {
        case 'dailyGoalMinutes':
          this.userDataService.updateSettings({ dailyGoalMinutes: value });
          this.updateDerivedProperties();
          break;
        case 'notificationsEnabled':
          this.userDataService.updateSettings({ notificationsEnabled: value });
          this.handleNotificationSettingChange(value);
          break;
        case 'reminderInterval':
          this.userDataService.updateSettings({ reminderInterval: value });
          this.updateDerivedProperties();
          this.handleReminderIntervalChange(value);
          break;
        case 'darkMode':
          this.userDataService.updateSettings({ darkMode: value });
          this.applyTheme(value);
          break;
      }
    });
  }

  private updateDerivedProperties(): void {
    const dailyGoalMinutes = this.get('dailyGoalMinutes');
    const reminderInterval = this.get('reminderInterval');

    this.set('dailyGoalText', this.trackingService.formatDuration(dailyGoalMinutes));
    this.set('reminderIntervalText', this.trackingService.formatDuration(reminderInterval));
  }

  private applyTheme(isDark: boolean): void {
    const { Application } = require('@nativescript/core');
    
    if (isDark) {
      Application.systemAppearance = 'dark';
    } else {
      Application.systemAppearance = 'light';
    }
  }

  // Action handlers
  onUpgradeToPremium(): void {
    const { Dialogs } = require('@nativescript/core');
    
    Dialogs.confirm({
      title: "Upgrade to Premium",
      message: "Unlock all premium features for $2.99?\n\n• Detailed reports\n• Complete achievements\n• Cloud backup\n• No ads\n• Advanced stats",
      okButtonText: "Purchase",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result) {
        // In a real app, this would integrate with app store billing
        this.simulatePremiumPurchase();
      }
    });
  }

  private simulatePremiumPurchase(): void {
    const { Dialogs } = require('@nativescript/core');
    
    // Simulate successful purchase
    this.userDataService.updateSettings({ isPremium: true });
    this.set('isPremium', true);
    
    Dialogs.alert({
      title: "🎉 Welcome to Premium!",
      message: "Thank you for your purchase! All premium features are now unlocked.",
      okButtonText: "Awesome!"
    });
  }

  onExportData(): void {
    const { Dialogs, Utils } = require('@nativescript/core');
    
    try {
      const profile = this.userDataService.getUserProfile();
      const exportData = {
        exportDate: new Date().toISOString(),
        version: "1.0.0",
        data: profile
      };
      
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // In a real app, this would save to device storage or share
      Dialogs.alert({
        title: "Data Exported",
        message: "Your data has been prepared for export. In a full app, this would be saved to your device or shared.",
        okButtonText: "OK"
      });
      
      console.log("Exported data:", jsonData);
    } catch (error) {
      Dialogs.alert({
        title: "Export Failed",
        message: "There was an error exporting your data. Please try again.",
        okButtonText: "OK"
      });
    }
  }

  onBackupData(): void {
    const { Dialogs } = require('@nativescript/core');
    
    if (!this.get('isPremium')) {
      Dialogs.alert({
        title: "Premium Required",
        message: "Cloud backup is a premium feature. Please upgrade to access this functionality.",
        okButtonText: "OK"
      });
      return;
    }

    // Simulate cloud backup
    Dialogs.alert({
      title: "Backup Complete",
      message: "Your data has been successfully backed up to the cloud!",
      okButtonText: "Great!"
    });
  }

  onRestoreData(): void {
    const { Dialogs } = require('@nativescript/core');
    
    if (!this.get('isPremium')) {
      Dialogs.alert({
        title: "Premium Required",
        message: "Cloud restore is a premium feature. Please upgrade to access this functionality.",
        okButtonText: "OK"
      });
      return;
    }

    Dialogs.confirm({
      title: "Restore Data",
      message: "This will replace your current data with the backup. Are you sure?",
      okButtonText: "Restore",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result) {
        Dialogs.alert({
          title: "Restore Complete",
          message: "Your data has been restored from the cloud backup!",
          okButtonText: "OK"
        });
      }
    });
  }

  onRateApp(): void {
    const { Utils } = require('@nativescript/core');
    
    // In a real app, this would open the app store
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "Rate Offtime Tracker",
      message: "Thank you for using Offtime Tracker! In a full app, this would open your device's app store.",
      okButtonText: "OK"
    });
  }

  onContactSupport(): void {
    const { Utils } = require('@nativescript/core');
    
    // In a real app, this would open email client
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "Contact Support",
      message: "Need help? In a full app, this would open your email client to contact support@offtimetracker.com",
      okButtonText: "OK"
    });
  }

  onPrivacyPolicy(): void {
    const { Utils } = require('@nativescript/core');
    
    // In a real app, this would open privacy policy URL
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "Privacy Policy",
      message: "In a full app, this would open our privacy policy in your browser.",
      okButtonText: "OK"
    });
  }

  onResetAllData(): void {
    const { Dialogs } = require('@nativescript/core');
    
    Dialogs.confirm({
      title: "⚠️ Reset All Data",
      message: "This will permanently delete all your progress, achievements, and settings. This action cannot be undone!\n\nAre you absolutely sure?",
      okButtonText: "Delete Everything",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result) {
        this.confirmDataReset();
      }
    });
  }

  private confirmDataReset(): void {
    const { Dialogs, ApplicationSettings } = require('@nativescript/core');
    
    Dialogs.confirm({
      title: "Final Confirmation",
      message: "Last chance! This will delete everything. Type 'DELETE' to confirm.",
      okButtonText: "DELETE",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result) {
        // Clear all stored data
        ApplicationSettings.clear();
        
        Dialogs.alert({
          title: "Data Reset Complete",
          message: "All data has been deleted. The app will restart with fresh data.",
          okButtonText: "OK"
        }).then(() => {
          // In a real app, you might restart or navigate to onboarding
          const { Frame } = require('@nativescript/core');
          Frame.topmost().navigate({
            moduleName: 'main-page',
            clearHistory: true
          });
        });
      }
    });
  }

  private setupThemeChangeListener(): void {
    this.themeService.on('propertyChange', (args) => {
      if (isPropertyChangeEvent(args) && args.propertyName === 'themeChanged') {
        const currentTheme = this.themeService.getCurrentTheme();
        this.set('currentThemeName', currentTheme ? currentTheme.name : 'Default');
      }
    });
  }

  private async handleNotificationSettingChange(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        // Initialize notifications when enabled
        await this.notificationService.initialize();
        this.showNotificationFeedback('Notifications enabled! You\'ll receive personalized reminders and celebrations.');
      } else {
        // Clear scheduled notifications when disabled
        this.notificationService.rescheduleNotifications();
        this.showNotificationFeedback('Notifications disabled. You can re-enable them anytime.');
      }
    } catch (error) {
      console.error('Failed to handle notification setting change:', error);
      this.showNotificationFeedback('Failed to update notification settings. Please try again.');
    }
  }

  private handleReminderIntervalChange(intervalMinutes: number): void {
    // Reschedule notifications with new interval
    if (this.get('notificationsEnabled')) {
      this.notificationService.rescheduleNotifications();
      this.showNotificationFeedback(`Reminder interval updated to ${this.formatReminderInterval(intervalMinutes)}.`);
    }
  }

  private showNotificationFeedback(message: string): void {
    // Show a temporary feedback message
    this.set('notificationFeedback', message);
    this.set('showNotificationFeedback', true);

    setTimeout(() => {
      this.set('showNotificationFeedback', false);
    }, 3000);
  }

  private formatReminderInterval(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        return `${hours}h ${remainingMinutes}m`;
      }
    }
  }

  onTestNotification(): void {
    if (this.get('notificationsEnabled')) {
      this.notificationService.sendImmediateNotification(
        'Test Notification 🔔',
        'This is how your notifications will look! Personalized and helpful.'
      );
      this.showNotificationFeedback('Test notification sent!');
    } else {
      this.showNotificationFeedback('Please enable notifications first.');
    }
  }

  onNavigateToThemeSelection(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/theme-selection-page');
  }
}