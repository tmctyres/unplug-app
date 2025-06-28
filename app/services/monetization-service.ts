import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';

/**
 * Interface for subscription plan configuration
 * Defines the structure for premium subscription offerings
 */
export interface SubscriptionPlan {
  id: string;           // Unique plan identifier
  name: string;         // Display name for the plan
  price: string;        // Formatted price string
  duration: string;     // Plan duration (monthly, yearly, lifetime)
  features: string[];   // List of features included in the plan
}

/**
 * Interface for AdMob configuration
 * Contains all necessary ad unit IDs and settings
 */
export interface AdConfig {
  bannerId: string;       // Banner ad unit ID
  interstitialId: string; // Interstitial ad unit ID
  rewardedId: string;     // Rewarded ad unit ID
  testMode: boolean;      // Whether to use test ads
}

/**
 * MonetizationService - Handles app monetization through ads and subscriptions
 *
 * This service provides:
 * - AdMob integration for banner, interstitial, and rewarded ads
 * - Subscription plan management and validation
 * - Premium feature access control
 * - Ad display logic based on user subscription status
 * - Revenue tracking and analytics integration
 *
 * @extends Observable - Emits events for monetization state changes
 */
export class MonetizationService extends Observable {
  private static instance: MonetizationService;
  private userDataService: UserDataService;
  private adConfig: AdConfig;
  private isAdMobInitialized: boolean = false;

  /**
   * Private constructor to enforce singleton pattern
   * Initializes user data service and ad configuration
   */
  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.initializeAdConfig();
  }

  static getInstance(): MonetizationService {
    if (!MonetizationService.instance) {
      MonetizationService.instance = new MonetizationService();
    }
    return MonetizationService.instance;
  }

  private initializeAdConfig(): void {
    // In production, these would be your actual AdMob unit IDs
    this.adConfig = {
      bannerId: 'ca-app-pub-3940256099942544/6300978111', // Test banner ID
      interstitialId: 'ca-app-pub-3940256099942544/1033173712', // Test interstitial ID
      rewardedId: 'ca-app-pub-3940256099942544/5224354917', // Test rewarded ID
      testMode: true // Set to false in production
    };
  }

  async initializeAdMob(): Promise<boolean> {
    try {
      // In a real app, you would initialize AdMob here
      // const { AdMob } = require('@nativescript/admob');
      // await AdMob.init();
      
      this.isAdMobInitialized = true;
      console.log('AdMob initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AdMob:', error);
      return false;
    }
  }

  async showBannerAd(containerId: string): Promise<void> {
    const userProfile = this.userDataService.getUserProfile();
    
    // Don't show ads for premium users
    if (userProfile.settings.isPremium || !userProfile.settings.showAds) {
      return;
    }

    try {
      // In a real app, you would show banner ad here
      // const { AdMob } = require('@nativescript/admob');
      // await AdMob.showBanner({
      //   size: 'SMART_BANNER',
      //   margins: { bottom: 0 },
      //   androidBannerId: this.adConfig.bannerId,
      //   iosBannerId: this.adConfig.bannerId
      // });
      
      console.log('Banner ad would be shown here');
    } catch (error) {
      console.error('Failed to show banner ad:', error);
    }
  }

  async showInterstitialAd(): Promise<boolean> {
    const userProfile = this.userDataService.getUserProfile();
    
    // Don't show ads for premium users
    if (userProfile.settings.isPremium || !userProfile.settings.showAds) {
      return false;
    }

    try {
      // In a real app, you would show interstitial ad here
      // const { AdMob } = require('@nativescript/admob');
      // const result = await AdMob.showInterstitial({
      //   androidInterstitialId: this.adConfig.interstitialId,
      //   iosInterstitialId: this.adConfig.interstitialId
      // });
      
      console.log('Interstitial ad would be shown here');
      return true;
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }

  async showRewardedAd(): Promise<{ watched: boolean; reward?: any }> {
    try {
      // In a real app, you would show rewarded ad here
      // const { AdMob } = require('@nativescript/admob');
      // const result = await AdMob.showRewarded({
      //   androidRewardedId: this.adConfig.rewardedId,
      //   iosRewardedId: this.adConfig.rewardedId
      // });
      
      console.log('Rewarded ad would be shown here');
      
      // Simulate successful ad watch
      return {
        watched: true,
        reward: {
          type: 'bonus_xp',
          amount: 50
        }
      };
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      return { watched: false };
    }
  }

  getSubscriptionPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'pro_monthly',
        name: 'Unplug Pro Monthly',
        price: '$2.99',
        duration: 'per month',
        features: [
          'No advertisements',
          'Detailed weekly reports',
          'Complete achievement list',
          'Cloud backup & sync',
          'Advanced statistics',
          'Export data (PDF & JSON)',
          'Priority support'
        ]
      },
      {
        id: 'pro_yearly',
        name: 'Unplug Pro Yearly',
        price: '$19.99',
        duration: 'per year',
        features: [
          'All monthly features',
          'Save 44% compared to monthly',
          'Exclusive yearly achievements',
          'Early access to new features'
        ]
      },
      {
        id: 'pro_lifetime',
        name: 'Unplug Pro Lifetime',
        price: '$49.99',
        duration: 'one-time purchase',
        features: [
          'All Pro features forever',
          'No recurring payments',
          'Lifetime updates',
          'VIP support'
        ]
      }
    ];
  }

  async purchaseSubscription(planId: string): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    try {
      // In a real app, you would integrate with app store billing
      // For iOS: StoreKit
      // For Android: Google Play Billing

      console.log(`Attempting to purchase subscription: ${planId}`);

      // Simulate purchase validation
      const plan = this.getSubscriptionPlans().find(p => p.id === planId);
      if (!plan) {
        return { success: false, error: 'Invalid subscription plan' };
      }

      // Simulate network delay and potential failures
      await this.simulatePurchaseProcess(plan);

      // Simulate random failure (10% chance for demo purposes)
      if (Math.random() < 0.1) {
        const errors = [
          'Payment method declined',
          'Network connection failed',
          'App Store temporarily unavailable',
          'Insufficient funds'
        ];
        const randomError = errors[Math.floor(Math.random() * errors.length)];
        return { success: false, error: randomError };
      }

      // Generate transaction ID
      const transactionId = this.generateTransactionId();

      // Update user settings
      const expiryDate = new Date();
      if (planId === 'pro_monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (planId === 'pro_yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else if (planId === 'pro_lifetime') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 100); // Effectively lifetime
      }

      this.userDataService.updateSettings({
        isPremium: true,
        subscriptionType: planId as any,
        subscriptionExpiry: expiryDate,
        showAds: false,
        backupEnabled: true
      });

      // Store transaction for receipt validation
      this.storeTransaction(transactionId, planId, expiryDate);

      this.notifyPropertyChange('subscriptionPurchased', {
        plan,
        expiryDate,
        transactionId,
        purchaseDate: new Date()
      });

      return { success: true, transactionId };
    } catch (error) {
      console.error('Failed to purchase subscription:', error);
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }

  private async simulatePurchaseProcess(plan: SubscriptionPlan): Promise<void> {
    // Simulate the purchase flow steps
    console.log('1. Validating payment method...');
    await this.delay(500);

    console.log('2. Processing payment...');
    await this.delay(1000);

    console.log('3. Confirming subscription...');
    await this.delay(500);

    console.log(`4. Purchase completed for ${plan.name}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `unplug_${timestamp}_${random}`;
  }

  private storeTransaction(transactionId: string, planId: string, expiryDate: Date): void {
    const transactions = JSON.parse(localStorage?.getItem('unplug_transactions') || '[]');
    transactions.push({
      transactionId,
      planId,
      purchaseDate: new Date().toISOString(),
      expiryDate: expiryDate.toISOString(),
      status: 'active'
    });
    localStorage?.setItem('unplug_transactions', JSON.stringify(transactions));
  }

  async restorePurchases(): Promise<{ success: boolean; restored: number; purchases?: any[] }> {
    try {
      console.log('Restoring purchases...');

      // Simulate network delay
      await this.delay(1500);

      // Check for stored transactions (simulating app store receipt validation)
      const transactions = JSON.parse(localStorage?.getItem('unplug_transactions') || '[]');
      const activePurchases = transactions.filter((t: any) => {
        const expiry = new Date(t.expiryDate);
        return expiry > new Date() && t.status === 'active';
      });

      if (activePurchases.length > 0) {
        // Restore the most recent active purchase
        const latestPurchase = activePurchases[activePurchases.length - 1];

        this.userDataService.updateSettings({
          isPremium: true,
          subscriptionType: latestPurchase.planId as any,
          subscriptionExpiry: new Date(latestPurchase.expiryDate),
          showAds: false,
          backupEnabled: true
        });

        console.log(`Restored ${activePurchases.length} purchase(s)`);
        return {
          success: true,
          restored: activePurchases.length,
          purchases: activePurchases
        };
      } else {
        console.log('No active purchases found to restore');
        return { success: true, restored: 0 };
      }
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return { success: false, restored: 0 };
    }
  }

  isSubscriptionActive(): boolean {
    const userProfile = this.userDataService.getUserProfile();
    
    if (!userProfile.settings.isPremium) {
      return false;
    }

    // Check if subscription has expired
    if (userProfile.settings.subscriptionExpiry) {
      const now = new Date();
      const expiry = new Date(userProfile.settings.subscriptionExpiry);
      return now < expiry;
    }

    return true;
  }

  getSubscriptionStatus(): string {
    const userProfile = this.userDataService.getUserProfile();
    
    if (!userProfile.settings.isPremium) {
      return 'Free';
    }

    const subscriptionType = userProfile.settings.subscriptionType;
    const expiry = userProfile.settings.subscriptionExpiry;

    if (subscriptionType === 'pro_lifetime') {
      return 'Lifetime Pro';
    }

    if (expiry) {
      const expiryDate = new Date(expiry);
      const now = new Date();
      
      if (now >= expiryDate) {
        return 'Expired';
      }

      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (subscriptionType === 'pro_monthly') {
        return `Pro Monthly (${daysLeft} days left)`;
      } else if (subscriptionType === 'pro_yearly') {
        return `Pro Yearly (${daysLeft} days left)`;
      }
    }

    return 'Pro Active';
  }

  shouldShowAd(context: 'session_complete' | 'achievement_unlock' | 'app_open'): boolean {
    const userProfile = this.userDataService.getUserProfile();
    
    // Never show ads to premium users
    if (userProfile.settings.isPremium || !userProfile.settings.showAds) {
      return false;
    }

    // Implement ad frequency logic
    switch (context) {
      case 'session_complete':
        // Show ad after every 3rd session completion
        const todayStats = this.userDataService.getTodayStats();
        const sessionCount = todayStats ? Math.ceil(todayStats.offlineMinutes / 30) : 0;
        return sessionCount % 3 === 0;
        
      case 'achievement_unlock':
        // Show ad after achievement unlock (50% chance)
        return Math.random() < 0.5;
        
      case 'app_open':
        // Show ad on app open (25% chance)
        return Math.random() < 0.25;
        
      default:
        return false;
    }
  }
}
