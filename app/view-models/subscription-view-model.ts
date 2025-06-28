import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import { MonetizationService } from '../services/monetization-service';
import { SubscriptionManager } from '../services/subscription-manager';
import { RealMonetizationService, UnifiedProduct } from '../services/real-monetization-service';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';

export interface FeatureComparison {
  feature: string;
  freeStatus: string;
  proStatus: string;
}

export interface ProFeature {
  icon: string;
  title: string;
  description: string;
}

export class SubscriptionViewModel extends Observable {
  private userDataService: UserDataService;
  private monetizationService: MonetizationService;
  private subscriptionManager: SubscriptionManager;
  private realMonetizationService: RealMonetizationService;

  constructor() {
    super();

    this.userDataService = UserDataService.getInstance();
    this.monetizationService = MonetizationService.getInstance();
    this.subscriptionManager = SubscriptionManager.getInstance();
    this.realMonetizationService = RealMonetizationService.getInstance();

    this.setupEventListeners();
    this.loadSubscriptionData();
    this.loadRealProducts();
  }

  private setupEventListeners(): void {
    this.monetizationService.on('propertyChange', (args) => {
      if (isPropertyChangeEvent(args) && args.propertyName === 'subscriptionPurchased') {
        this.loadSubscriptionData();
        this.showPurchaseSuccess(args.value);
      }
    });

    this.realMonetizationService.on('propertyChange', (args) => {
      if (isPropertyChangeEvent(args) && args.propertyName === 'subscriptionPurchased') {
        this.loadSubscriptionData();
        this.showRealPurchaseSuccess(args.value);
      }
    });
  }

  private async loadRealProducts(): Promise<void> {
    try {
      if (this.realMonetizationService.isAvailable()) {
        console.log('Subscription View Model: Loading real products from store');
        const products = await this.realMonetizationService.loadProducts();
        this.set('realProducts', products);
        this.set('storeAvailable', true);
        this.set('currentPlatform', this.realMonetizationService.getCurrentPlatform());

        console.log(`Subscription View Model: Loaded ${products.length} real products`);
      } else {
        console.log('Subscription View Model: Real store not available, using mock products');
        this.set('storeAvailable', false);
        this.set('realProducts', []);
      }
    } catch (error) {
      console.error('Subscription View Model: Failed to load real products:', error);
      this.set('storeAvailable', false);
      this.set('realProducts', []);
    }
  }

  private loadSubscriptionData(): void {
    const subscriptionInfo = this.subscriptionManager.getSubscriptionInfo();
    const userProfile = this.userDataService.getUserProfile();

    if (subscriptionInfo) {
      // Set subscription info from manager
      this.set('isPremium', subscriptionInfo.isActive);
      this.set('subscriptionStatus', this.formatSubscriptionStatus(subscriptionInfo));
      this.set('subscriptionType', subscriptionInfo.planId);
      this.set('subscriptionExpiry', subscriptionInfo.expiryDate);
      this.set('nextBillingDate', subscriptionInfo.nextBillingDate?.toLocaleDateString() || 'N/A');
      this.set('daysRemaining', subscriptionInfo.daysRemaining);
      this.set('autoRenew', subscriptionInfo.autoRenew);
    } else {
      // No active subscription
      this.set('isPremium', false);
      this.set('subscriptionStatus', 'No active subscription');
      this.set('subscriptionType', 'free');
    }

    // Load feature comparison data
    this.loadFeatureComparison();
    this.loadProFeatures();
  }

  private formatSubscriptionStatus(info: any): string {
    switch (info.status) {
      case 'active':
        if (info.planId === 'pro_lifetime') {
          return 'Lifetime Pro - Active';
        }
        return `${info.planName} - ${info.daysRemaining} days remaining`;
      case 'pending_cancellation':
        return `${info.planName} - Cancelling at period end`;
      case 'expired':
        return 'Subscription Expired';
      default:
        return info.planName;
    }
  }

  private loadFeatureComparison(): void {
    const features: FeatureComparison[] = [
      {
        feature: "Basic offline tracking",
        freeStatus: "✅",
        proStatus: "✅"
      },
      {
        feature: "Achievement system",
        freeStatus: "Limited",
        proStatus: "✅ Complete"
      },
      {
        feature: "Daily statistics",
        freeStatus: "✅",
        proStatus: "✅"
      },
      {
        feature: "Weekly reports",
        freeStatus: "❌",
        proStatus: "✅"
      },
      {
        feature: "Data export (PDF/JSON)",
        freeStatus: "❌",
        proStatus: "✅"
      },
      {
        feature: "Cloud backup & sync",
        freeStatus: "❌",
        proStatus: "✅"
      },
      {
        feature: "Advanced analytics",
        freeStatus: "❌",
        proStatus: "✅"
      },
      {
        feature: "Custom goals & challenges",
        freeStatus: "❌",
        proStatus: "✅"
      },
      {
        feature: "Priority support",
        freeStatus: "❌",
        proStatus: "✅"
      },
      {
        feature: "Advertisements",
        freeStatus: "Yes",
        proStatus: "❌ None"
      }
    ];

    this.set('featureComparison', features);
  }

  private loadProFeatures(): void {
    const features: ProFeature[] = [
      {
        icon: "📊",
        title: "Detailed Weekly Reports",
        description: "Get comprehensive insights into your offline habits with beautiful charts and analytics"
      },
      {
        icon: "☁️",
        title: "Cloud Backup & Sync",
        description: "Never lose your progress. Sync across all your devices automatically"
      },
      {
        icon: "📤",
        title: "Data Export",
        description: "Export your data in PDF or JSON format for personal records or analysis"
      },
      {
        icon: "🎯",
        title: "Advanced Goal Setting",
        description: "Set custom challenges, weekly goals, and participate in seasonal events"
      },
      {
        icon: "📈",
        title: "Advanced Analytics",
        description: "Discover patterns in your usage with detailed charts and trend analysis"
      },
      {
        icon: "🚫",
        title: "Ad-Free Experience",
        description: "Enjoy a clean, distraction-free interface without any advertisements"
      },
      {
        icon: "🏆",
        title: "Exclusive Achievements",
        description: "Unlock special Pro-only achievements and badges for your dedication"
      },
      {
        icon: "💬",
        title: "Priority Support",
        description: "Get faster response times and dedicated support for any questions or issues"
      }
    ];

    this.set('proFeatures', features);
  }

  // Purchase Methods
  async onPurchaseMonthly(): Promise<void> {
    await this.handlePurchase('pro_monthly', 'Monthly Pro ($2.99/month)');
  }

  async onPurchaseYearly(): Promise<void> {
    await this.handlePurchase('pro_yearly', 'Yearly Pro ($19.99/year)');
  }

  async onPurchaseLifetime(): Promise<void> {
    await this.handlePurchase('pro_lifetime', 'Lifetime Pro ($49.99 one-time)');
  }

  private async handlePurchase(planId: string, planName: string): Promise<void> {
    try {
      // Show loading state
      this.showPurchaseLoading(planName);

      // Attempt purchase
      const result = await this.monetizationService.purchaseSubscription(planId);

      if (result.success) {
        // Purchase successful - data will be updated via event listener
        console.log(`Successfully purchased ${planName}`);
      } else {
        // Purchase failed
        this.showPurchaseError(result.error || 'Purchase failed. Please try again.');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      this.showPurchaseError('An unexpected error occurred. Please try again.');
    }
  }

  private showPurchaseLoading(planName: string): void {
    const { Dialogs } = require('@nativescript/core');
    // In a real app, you'd show a loading indicator
    console.log(`Processing purchase for ${planName}...`);
  }

  private showPurchaseSuccess(purchaseData: any): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "🎉 Welcome to Unplug Pro!",
      message: "Your subscription is now active. Enjoy all the Pro features and thank you for supporting digital wellness!",
      okButtonText: "Awesome!"
    }).then(() => {
      // Navigate back to main page
      this.onNavigateBack();
    });
  }

  private showPurchaseError(error: string): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "Purchase Failed",
      message: error,
      okButtonText: "OK"
    });
  }

  // Subscription Management Methods
  async onRestorePurchases(): Promise<void> {
    try {
      const result = await this.monetizationService.restorePurchases();
      
      if (result.success && result.restored > 0) {
        const { Dialogs } = require('@nativescript/core');
        Dialogs.alert({
          title: "Purchases Restored",
          message: `Successfully restored ${result.restored} purchase(s). Your Pro features are now active.`,
          okButtonText: "Great!"
        });
        this.loadSubscriptionData();
      } else {
        const { Dialogs } = require('@nativescript/core');
        Dialogs.alert({
          title: "No Purchases Found",
          message: "We couldn't find any previous purchases to restore.",
          okButtonText: "OK"
        });
      }
    } catch (error) {
      console.error('Restore purchases error:', error);
      const { Dialogs } = require('@nativescript/core');
      Dialogs.alert({
        title: "Restore Failed",
        message: "Unable to restore purchases. Please try again later.",
        okButtonText: "OK"
      });
    }
  }

  async onCancelSubscription(): Promise<void> {
    const { Dialogs } = require('@nativescript/core');
    const subscriptionInfo = this.subscriptionManager.getSubscriptionInfo();

    if (!subscriptionInfo) {
      Dialogs.alert({
        title: "No Subscription",
        message: "No active subscription found to cancel.",
        okButtonText: "OK"
      });
      return;
    }

    const result = await Dialogs.confirm({
      title: "Cancel Subscription",
      message: `Are you sure you want to cancel your ${subscriptionInfo.planName}? You'll lose access to Pro features at the end of your current billing period (${subscriptionInfo.expiryDate.toLocaleDateString()}).`,
      okButtonText: "Cancel Subscription",
      cancelButtonText: "Keep Subscription"
    });

    if (result) {
      await this.processCancellation();
    }
  }

  private async processCancellation(): Promise<void> {
    try {
      const result = await this.subscriptionManager.cancelSubscription();
      const { Dialogs } = require('@nativescript/core');

      if (result.success) {
        Dialogs.alert({
          title: "Subscription Cancelled",
          message: "Your subscription has been cancelled. You'll continue to have Pro access until the end of your current billing period.",
          okButtonText: "OK"
        });
        this.loadSubscriptionData(); // Refresh the display
      } else {
        Dialogs.alert({
          title: "Cancellation Failed",
          message: result.error || "Unable to cancel subscription. Please try again later.",
          okButtonText: "OK"
        });
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      const { Dialogs } = require('@nativescript/core');
      Dialogs.alert({
        title: "Error",
        message: "An unexpected error occurred. Please try again later.",
        okButtonText: "OK"
      });
    }
  }

  // Real monetization methods
  async onPurchaseReal(productId: string): Promise<void> {
    try {
      console.log(`Subscription View Model: Purchasing real product ${productId}`);

      this.set('isPurchasing', true);
      this.set('purchaseError', '');

      if (!this.realMonetizationService.isAvailable()) {
        throw new Error('In-app purchases are not available on this device');
      }

      const result = await this.realMonetizationService.purchaseSubscription(productId);

      if (result.success) {
        console.log('Subscription View Model: Real purchase successful');
        this.showRealPurchaseSuccess(result);
        this.loadSubscriptionData();
      } else if (result.cancelled) {
        console.log('Subscription View Model: Real purchase cancelled');
        // Don't show error for user cancellation
      } else {
        console.error('Subscription View Model: Real purchase failed:', result.error);
        this.set('purchaseError', result.error || 'Purchase failed');
        this.showPurchaseError(result.error || 'Purchase failed');
      }

    } catch (error) {
      console.error('Subscription View Model: Real purchase error:', error);
      this.set('purchaseError', error.message || 'Purchase failed');
      this.showPurchaseError(error.message || 'Purchase failed');
    } finally {
      this.set('isPurchasing', false);
    }
  }

  private showRealPurchaseSuccess(result: any): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "Purchase Successful! 🎉",
      message: `Welcome to Unplug Pro! Your subscription is now active and you have access to all premium features.`,
      okButtonText: "Awesome!"
    });
  }

  private showRestoreSuccess(count: number): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "Purchases Restored! ✅",
      message: `Successfully restored ${count} purchase${count > 1 ? 's' : ''}. Your Pro features are now active.`,
      okButtonText: "Great!"
    });
  }

  private showNoRestorablePurchases(): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "No Purchases Found",
      message: "We couldn't find any previous purchases to restore. If you believe this is an error, please contact support.",
      okButtonText: "OK"
    });
  }

  private showRestoreError(error: string): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "Restore Failed",
      message: `We couldn't restore your purchases: ${error}\n\nPlease try again or contact support.`,
      okButtonText: "OK"
    });
  }

  onContactSupport(): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.confirm({
      title: "Contact Support",
      message: "Would you like to send an email to our support team?",
      okButtonText: "Send Email",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result) {
        // In a real app, this would open the email client
        console.log('Opening email client for support...');
      }
    });
  }

  onShowFAQ(): void {
    const { Frame } = require('@nativescript/core');
    // In a real app, this would navigate to an FAQ page
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "FAQ",
      message: "Frequently Asked Questions page would open here. Common topics include billing, features, cancellation, and technical support.",
      okButtonText: "OK"
    });
  }

  onNavigateBack(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }
}
