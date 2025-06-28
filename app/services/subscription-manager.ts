import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';

export interface SubscriptionInfo {
  isActive: boolean;
  planId: string;
  planName: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending_cancellation';
  purchaseDate: Date;
  expiryDate: Date;
  nextBillingDate?: Date;
  autoRenew: boolean;
  transactionId?: string;
  daysRemaining: number;
}

export interface BillingHistory {
  transactionId: string;
  planId: string;
  amount: string;
  date: Date;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
}

export class SubscriptionManager extends Observable {
  private static instance: SubscriptionManager;
  private userDataService: UserDataService;
  private checkInterval: any;

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.startPeriodicCheck();
  }

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  getSubscriptionInfo(): SubscriptionInfo | null {
    const userProfile = this.userDataService.getUserProfile();
    
    if (!userProfile.settings.isPremium) {
      return null;
    }

    const now = new Date();
    const expiryDate = userProfile.settings.subscriptionExpiry 
      ? new Date(userProfile.settings.subscriptionExpiry) 
      : null;

    if (!expiryDate) {
      return null;
    }

    const isActive = now < expiryDate;
    const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Get transaction info
    const transactions = this.getTransactionHistory();
    const latestTransaction = transactions.length > 0 ? transactions[transactions.length - 1] : null;

    return {
      isActive,
      planId: userProfile.settings.subscriptionType,
      planName: this.getPlanDisplayName(userProfile.settings.subscriptionType),
      status: this.getSubscriptionStatus(isActive, expiryDate, userProfile.settings.subscriptionType),
      purchaseDate: latestTransaction ? new Date(latestTransaction.date) : new Date(),
      expiryDate,
      nextBillingDate: this.getNextBillingDate(userProfile.settings.subscriptionType, expiryDate),
      autoRenew: userProfile.settings.subscriptionType !== 'pro_lifetime',
      transactionId: latestTransaction?.transactionId,
      daysRemaining
    };
  }

  private getPlanDisplayName(planId: string): string {
    switch (planId) {
      case 'pro_monthly':
        return 'Monthly Pro';
      case 'pro_yearly':
        return 'Yearly Pro';
      case 'pro_lifetime':
        return 'Lifetime Pro';
      default:
        return 'Unknown Plan';
    }
  }

  private getSubscriptionStatus(isActive: boolean, expiryDate: Date, planId: string): 'active' | 'expired' | 'cancelled' | 'pending_cancellation' {
    if (planId === 'pro_lifetime') {
      return 'active';
    }

    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (!isActive) {
      return 'expired';
    }

    // Check if cancellation is pending (would be stored in user settings in real app)
    const cancellationPending = this.isCancellationPending();
    if (cancellationPending) {
      return 'pending_cancellation';
    }

    return 'active';
  }

  private getNextBillingDate(planId: string, currentExpiry: Date): Date | undefined {
    if (planId === 'pro_lifetime') {
      return undefined; // No billing for lifetime
    }

    // In a real app, this would come from the app store
    return currentExpiry;
  }

  private isCancellationPending(): boolean {
    // In a real app, this would check with the app store
    const cancellationData = localStorage?.getItem('unplug_cancellation_pending');
    return cancellationData === 'true';
  }

  getTransactionHistory(): BillingHistory[] {
    const transactions = JSON.parse(localStorage?.getItem('unplug_transactions') || '[]');
    return transactions.map((t: any) => ({
      transactionId: t.transactionId,
      planId: t.planId,
      amount: this.getPlanPrice(t.planId),
      date: new Date(t.purchaseDate),
      status: t.status || 'completed'
    }));
  }

  private getPlanPrice(planId: string): string {
    switch (planId) {
      case 'pro_monthly':
        return '$2.99';
      case 'pro_yearly':
        return '$19.99';
      case 'pro_lifetime':
        return '$49.99';
      default:
        return '$0.00';
    }
  }

  async cancelSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriptionInfo = this.getSubscriptionInfo();
      
      if (!subscriptionInfo || !subscriptionInfo.isActive) {
        return { success: false, error: 'No active subscription found' };
      }

      if (subscriptionInfo.planId === 'pro_lifetime') {
        return { success: false, error: 'Lifetime subscriptions cannot be cancelled' };
      }

      // In a real app, this would call the app store APIs
      // For now, we'll mark it as pending cancellation
      localStorage?.setItem('unplug_cancellation_pending', 'true');
      
      this.notifyPropertyChange('subscriptionCancelled', {
        planId: subscriptionInfo.planId,
        expiryDate: subscriptionInfo.expiryDate
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return { success: false, error: 'Failed to cancel subscription' };
    }
  }

  async reactivateSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove cancellation pending flag
      localStorage?.removeItem('unplug_cancellation_pending');
      
      this.notifyPropertyChange('subscriptionReactivated', {});
      
      return { success: true };
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      return { success: false, error: 'Failed to reactivate subscription' };
    }
  }

  private startPeriodicCheck(): void {
    // Check subscription status every hour
    this.checkInterval = setInterval(() => {
      this.checkSubscriptionExpiry();
    }, 60 * 60 * 1000);

    // Also check immediately
    this.checkSubscriptionExpiry();
  }

  private checkSubscriptionExpiry(): void {
    const subscriptionInfo = this.getSubscriptionInfo();
    
    if (!subscriptionInfo) {
      return;
    }

    const now = new Date();
    const expiryDate = subscriptionInfo.expiryDate;
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Notify about upcoming expiry
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      this.notifyPropertyChange('subscriptionExpiringSoon', {
        daysRemaining: daysUntilExpiry,
        planId: subscriptionInfo.planId
      });
    }

    // Handle expired subscription
    if (now >= expiryDate && subscriptionInfo.planId !== 'pro_lifetime') {
      this.handleSubscriptionExpiry();
    }
  }

  private handleSubscriptionExpiry(): void {
    console.log('Subscription has expired');
    
    // Downgrade to free plan
    this.userDataService.updateSettings({
      isPremium: false,
      subscriptionType: 'free',
      subscriptionExpiry: undefined,
      showAds: true,
      backupEnabled: false
    });

    this.notifyPropertyChange('subscriptionExpired', {});
  }

  getUsageStatistics(): any {
    // Return usage stats that might be relevant for subscription decisions
    const userProfile = this.userDataService.getUserProfile();
    const subscriptionInfo = this.getSubscriptionInfo();
    
    if (!subscriptionInfo) {
      return null;
    }

    const daysSinceSubscription = Math.floor(
      (new Date().getTime() - subscriptionInfo.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      daysSinceSubscription,
      totalOfflineHours: userProfile.totalOfflineHours,
      achievementsUnlocked: userProfile.achievements.filter(a => a.unlocked).length,
      currentStreak: userProfile.currentStreak,
      longestStreak: userProfile.longestStreak,
      averageDailyOfflineTime: daysSinceSubscription > 0 
        ? Math.round((userProfile.totalOfflineHours * 60) / daysSinceSubscription) 
        : 0
    };
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}
