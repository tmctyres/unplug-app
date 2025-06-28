/**
 * Real Monetization Service
 * Unified service for iOS App Store and Google Play Billing
 */

import { Observable, Device } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import { IOSStoreService, IOSProduct, IOSPurchaseResult } from './ios-store-service';
import { AndroidBillingService, AndroidProduct, AndroidPurchaseResult } from './android-billing-service';
import { SecurityUtils } from '../utils/security-utils';

export interface UnifiedProduct {
  id: string;
  name: string;
  price: string;
  duration: string;
  features: string[];
  platformProductId: string;
  currencyCode?: string;
  priceValue?: number;
}

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  expiryDate?: Date;
  error?: string;
  cancelled?: boolean;
}

export interface SubscriptionStatus {
  isActive: boolean;
  planId: string;
  planName: string;
  expiryDate?: Date;
  daysRemaining: number;
  autoRenew: boolean;
  platform: 'ios' | 'android' | 'unknown';
}

export class RealMonetizationService extends Observable {
  private static instance: RealMonetizationService;
  private userDataService: UserDataService;
  private iosStoreService: IOSStoreService;
  private androidBillingService: AndroidBillingService;
  private isInitialized: boolean = false;

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.iosStoreService = IOSStoreService.getInstance();
    this.androidBillingService = AndroidBillingService.getInstance();
    this.initialize();
  }

  static getInstance(): RealMonetizationService {
    if (!RealMonetizationService.instance) {
      RealMonetizationService.instance = new RealMonetizationService();
    }
    return RealMonetizationService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      console.log('Real Monetization Service: Initializing...');
      
      // Wait for platform-specific services to initialize
      await this.delay(1000);
      
      this.isInitialized = true;
      console.log('Real Monetization Service: Initialized successfully');
      
      // Load products
      await this.loadProducts();
      
    } catch (error) {
      console.error('Real Monetization Service: Initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async loadProducts(): Promise<UnifiedProduct[]> {
    try {
      let platformProducts: (IOSProduct | AndroidProduct)[] = [];

      if (Device.os === 'iOS' && this.iosStoreService.isAvailable()) {
        platformProducts = await this.iosStoreService.loadProducts();
      } else if (Device.os === 'Android' && this.androidBillingService.isAvailable()) {
        platformProducts = await this.androidBillingService.loadProducts();
      }

      // Convert platform products to unified format
      const unifiedProducts = this.convertToUnifiedProducts(platformProducts);

      // If no products were loaded from the store, use fallback products
      if (unifiedProducts.length === 0) {
        const fallbackProducts = this.getFallbackProducts();
        console.log(`Real Monetization Service: Using fallback products (${fallbackProducts.length} products)`);
        return fallbackProducts;
      }

      console.log(`Real Monetization Service: Loaded ${unifiedProducts.length} products`);
      return unifiedProducts;

    } catch (error) {
      console.error('Real Monetization Service: Failed to load products:', error);
      return this.getFallbackProducts();
    }
  }

  private convertToUnifiedProducts(platformProducts: (IOSProduct | AndroidProduct)[]): UnifiedProduct[] {
    const productMap = {
      'com.unplug.screentime.pro.monthly': {
        id: 'pro_monthly',
        name: 'Unplug Pro Monthly',
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
      'com.unplug.screentime.pro.yearly': {
        id: 'pro_yearly',
        name: 'Unplug Pro Yearly',
        duration: 'per year',
        features: [
          'All monthly features',
          'Save 44% compared to monthly',
          'Exclusive yearly achievements',
          'Early access to new features'
        ]
      },
      'com.unplug.screentime.pro.lifetime': {
        id: 'pro_lifetime',
        name: 'Unplug Pro Lifetime',
        duration: 'one-time purchase',
        features: [
          'All Pro features forever',
          'No recurring payments',
          'Lifetime updates',
          'VIP support'
        ]
      }
    };

    return platformProducts.map(product => {
      const productInfo = productMap[product.productId as keyof typeof productMap];
      
      return {
        id: productInfo?.id || product.productId,
        name: productInfo?.name || product.title,
        price: product.price,
        duration: productInfo?.duration || 'unknown',
        features: productInfo?.features || [],
        platformProductId: product.productId,
        currencyCode: 'currencyCode' in product ? product.currencyCode : 
                     'priceCurrencyCode' in product ? product.priceCurrencyCode : undefined,
        priceValue: 'priceValue' in product ? product.priceValue :
                   'priceAmountMicros' in product ? product.priceAmountMicros / 1000000 : undefined
      };
    });
  }

  private getFallbackProducts(): UnifiedProduct[] {
    // Fallback products when store is not available
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
        ],
        platformProductId: 'com.unplug.screentime.pro.monthly'
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
        ],
        platformProductId: 'com.unplug.screentime.pro.yearly'
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
        ],
        platformProductId: 'com.unplug.screentime.pro.lifetime'
      }
    ];
  }

  async purchaseSubscription(productId: string): Promise<PurchaseResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Monetization service not initialized'
      };
    }

    // Rate limiting
    if (!SecurityUtils.rateLimiter.isAllowed('purchase_subscription', 3, 300000)) {
      return {
        success: false,
        error: 'Too many purchase attempts. Please wait before trying again.'
      };
    }

    try {
      console.log(`Real Monetization Service: Purchasing ${productId}`);

      // Get the platform product ID
      const products = await this.loadProducts();
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      let result: PurchaseResult;

      if (Device.os === 'iOS' && this.iosStoreService.isAvailable()) {
        const iosResult = await this.iosStoreService.purchaseProduct(product.platformProductId);
        result = this.convertIOSResult(iosResult, productId);
      } else if (Device.os === 'Android' && this.androidBillingService.isAvailable()) {
        const androidResult = await this.androidBillingService.purchaseProduct(product.platformProductId);
        result = this.convertAndroidResult(androidResult, productId);
      } else {
        return {
          success: false,
          error: 'In-app purchases not available on this platform'
        };
      }

      if (result.success) {
        // Update user subscription status
        await this.updateUserSubscription(productId, result);
        
        // Notify listeners
        this.notifyPropertyChange('subscriptionPurchased', {
          productId,
          result,
          purchaseDate: new Date()
        });
      }

      return result;

    } catch (error) {
      console.error('Real Monetization Service: Purchase failed:', error);
      return {
        success: false,
        error: error.message || 'Purchase failed'
      };
    }
  }

  private convertIOSResult(iosResult: IOSPurchaseResult, productId: string): PurchaseResult {
    return {
      success: iosResult.success,
      productId: productId,
      transactionId: iosResult.transactionId,
      expiryDate: this.calculateExpiryDate(productId),
      error: iosResult.error,
      cancelled: iosResult.cancelled
    };
  }

  private convertAndroidResult(androidResult: AndroidPurchaseResult, productId: string): PurchaseResult {
    return {
      success: androidResult.success,
      productId: productId,
      transactionId: androidResult.orderId,
      expiryDate: this.calculateExpiryDate(productId),
      error: androidResult.error,
      cancelled: androidResult.cancelled
    };
  }

  private calculateExpiryDate(productId: string): Date {
    const now = new Date();
    
    switch (productId) {
      case 'pro_monthly':
        now.setMonth(now.getMonth() + 1);
        break;
      case 'pro_yearly':
        now.setFullYear(now.getFullYear() + 1);
        break;
      case 'pro_lifetime':
        now.setFullYear(now.getFullYear() + 100); // Effectively lifetime
        break;
    }
    
    return now;
  }

  private async updateUserSubscription(productId: string, result: PurchaseResult): Promise<void> {
    try {
      this.userDataService.updateSettings({
        isPremium: true,
        subscriptionType: productId as any,
        subscriptionExpiry: result.expiryDate,
        showAds: false,
        backupEnabled: true
      });

      // Store transaction securely
      const transactionData = {
        transactionId: result.transactionId,
        productId: productId,
        purchaseDate: new Date().toISOString(),
        expiryDate: result.expiryDate?.toISOString(),
        platform: Device.os,
        status: 'active'
      };

      SecurityUtils.secureStore.setItem(
        `transaction_${result.transactionId}`,
        JSON.stringify(transactionData)
      );

      console.log('Real Monetization Service: User subscription updated');

    } catch (error) {
      console.error('Real Monetization Service: Failed to update user subscription:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isAvailable(): boolean {
    return this.isInitialized && (
      (Device.os === 'iOS' && this.iosStoreService.isAvailable()) ||
      (Device.os === 'Android' && this.androidBillingService.isAvailable())
    );
  }

  getCurrentPlatform(): 'ios' | 'android' | 'unknown' {
    if (Device.os === 'iOS') return 'ios';
    if (Device.os === 'Android') return 'android';
    return 'unknown';
  }

  async restorePurchases(): Promise<{ success: boolean; restoredCount: number; error?: string }> {
    if (!this.isInitialized) {
      return {
        success: false,
        restoredCount: 0,
        error: 'Monetization service not initialized'
      };
    }

    try {
      console.log('Real Monetization Service: Restoring purchases');

      let restoredCount = 0;

      if (Device.os === 'iOS' && this.iosStoreService.isAvailable()) {
        const result = await this.iosStoreService.restorePurchases();

        if (result.success) {
          for (const purchase of result.purchases) {
            if (purchase.success && purchase.productId) {
              const productId = this.convertPlatformProductId(purchase.productId);
              await this.updateUserSubscription(productId, {
                success: true,
                productId,
                transactionId: purchase.transactionId,
                expiryDate: this.calculateExpiryDate(productId)
              });
              restoredCount++;
            }
          }
        }
      } else if (Device.os === 'Android' && this.androidBillingService.isAvailable()) {
        const result = await this.androidBillingService.queryPurchases();

        if (result.success) {
          for (const purchase of result.purchases) {
            if (purchase.success && purchase.productId) {
              const productId = this.convertPlatformProductId(purchase.productId);
              await this.updateUserSubscription(productId, {
                success: true,
                productId,
                transactionId: purchase.orderId,
                expiryDate: this.calculateExpiryDate(productId)
              });
              restoredCount++;
            }
          }
        }
      }

      console.log(`Real Monetization Service: Restored ${restoredCount} purchases`);

      return {
        success: true,
        restoredCount
      };

    } catch (error) {
      console.error('Real Monetization Service: Restore failed:', error);
      return {
        success: false,
        restoredCount: 0,
        error: error.message || 'Failed to restore purchases'
      };
    }
  }

  private convertPlatformProductId(platformProductId: string): string {
    const mapping = {
      'com.unplug.screentime.pro.monthly': 'pro_monthly',
      'com.unplug.screentime.pro.yearly': 'pro_yearly',
      'com.unplug.screentime.pro.lifetime': 'pro_lifetime'
    };

    return mapping[platformProductId as keyof typeof mapping] || platformProductId;
  }

  getSubscriptionStatus(): SubscriptionStatus {
    const settings = this.userDataService.getSettings();

    if (!settings.isPremium) {
      return {
        isActive: false,
        planId: 'free',
        planName: 'Free Plan',
        daysRemaining: 0,
        autoRenew: false,
        platform: 'unknown'
      };
    }

    const expiryDate = settings.subscriptionExpiry ? new Date(settings.subscriptionExpiry) : null;
    const now = new Date();
    const isActive = !expiryDate || expiryDate > now;
    const daysRemaining = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    const planNames = {
      'pro_monthly': 'Pro Monthly',
      'pro_yearly': 'Pro Yearly',
      'pro_lifetime': 'Pro Lifetime'
    };

    return {
      isActive,
      planId: settings.subscriptionType || 'unknown',
      planName: planNames[settings.subscriptionType as keyof typeof planNames] || 'Unknown Plan',
      expiryDate,
      daysRemaining,
      autoRenew: settings.subscriptionType !== 'pro_lifetime',
      platform: this.getCurrentPlatform()
    };
  }

  async validateSubscription(): Promise<{ isValid: boolean; error?: string }> {
    try {
      const status = this.getSubscriptionStatus();

      if (!status.isActive) {
        // Subscription expired, update user settings
        this.userDataService.updateSettings({
          isPremium: false,
          subscriptionType: null,
          subscriptionExpiry: null,
          showAds: true,
          backupEnabled: false
        });

        return { isValid: false, error: 'Subscription expired' };
      }

      // For lifetime subscriptions, always valid
      if (status.planId === 'pro_lifetime') {
        return { isValid: true };
      }

      // For recurring subscriptions, check with platform
      // In production, you would validate with your server and the platform's API
      console.log('Real Monetization Service: Subscription validation (simplified)');

      return { isValid: true };

    } catch (error) {
      console.error('Real Monetization Service: Validation failed:', error);
      return { isValid: false, error: error.message || 'Validation failed' };
    }
  }

  async cancelSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      // Note: Actual cancellation must be done through platform stores
      // This method provides guidance to users

      const platform = this.getCurrentPlatform();
      let instructions = '';

      if (platform === 'ios') {
        instructions = 'To cancel your subscription:\n\n1. Open Settings app\n2. Tap your name at the top\n3. Tap Subscriptions\n4. Find Unplug and tap it\n5. Tap Cancel Subscription';
      } else if (platform === 'android') {
        instructions = 'To cancel your subscription:\n\n1. Open Google Play Store\n2. Tap Menu → Subscriptions\n3. Find Unplug and tap it\n4. Tap Cancel subscription';
      } else {
        instructions = 'Please cancel your subscription through the app store where you purchased it.';
      }

      // Show instructions to user
      const { Dialogs } = require('@nativescript/core');
      await Dialogs.alert({
        title: 'Cancel Subscription',
        message: instructions,
        okButtonText: 'Got it'
      });

      return { success: true };

    } catch (error) {
      console.error('Real Monetization Service: Cancel guidance failed:', error);
      return { success: false, error: error.message || 'Failed to show cancellation instructions' };
    }
  }
}
