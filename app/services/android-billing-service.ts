/**
 * Android Google Play Billing Service
 * Handles real In-App Purchases using Google Play Billing Library
 */

import { Observable, Device } from '@nativescript/core';
import { SecurityUtils } from '../utils/security-utils';

export interface AndroidProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  type: 'inapp' | 'subs';
}

export interface AndroidPurchaseResult {
  success: boolean;
  productId?: string;
  purchaseToken?: string;
  orderId?: string;
  packageName?: string;
  purchaseTime?: number;
  purchaseState?: number;
  error?: string;
  cancelled?: boolean;
}

export interface AndroidPurchaseValidation {
  isValid: boolean;
  expiryDate?: Date;
  purchaseDate?: Date;
  productId?: string;
  orderId?: string;
  error?: string;
}

export class AndroidBillingService extends Observable {
  private static instance: AndroidBillingService;
  private isInitialized: boolean = false;
  private availableProducts: AndroidProduct[] = [];
  private purchasePlugin: any;

  // Product IDs - these should match your Google Play Console configuration
  private readonly PRODUCT_IDS = {
    PRO_MONTHLY: 'com.unplug.screentime.pro.monthly',
    PRO_YEARLY: 'com.unplug.screentime.pro.yearly',
    PRO_LIFETIME: 'com.unplug.screentime.pro.lifetime'
  };

  private constructor() {
    super();
    this.initializeBilling();
  }

  static getInstance(): AndroidBillingService {
    if (!AndroidBillingService.instance) {
      AndroidBillingService.instance = new AndroidBillingService();
    }
    return AndroidBillingService.instance;
  }

  private async initializeBilling(): Promise<void> {
    try {
      // Only initialize on Android
      if (Device.os !== 'Android') {
        console.log('Android Billing Service: Not running on Android, skipping initialization');
        return;
      }

      // Import the purchase plugin
      const { Purchase } = require('nativescript-purchase');
      this.purchasePlugin = Purchase;

      // Initialize the billing client
      await this.purchasePlugin.init([
        this.PRODUCT_IDS.PRO_MONTHLY,
        this.PRODUCT_IDS.PRO_YEARLY,
        this.PRODUCT_IDS.PRO_LIFETIME
      ]);

      this.isInitialized = true;
      console.log('Android Billing Service: Google Play Billing initialized successfully');

      // Load available products
      await this.loadProducts();

    } catch (error) {
      console.error('Android Billing Service: Failed to initialize billing:', error);
      this.isInitialized = false;
    }
  }

  async loadProducts(): Promise<AndroidProduct[]> {
    if (!this.isInitialized || Device.os !== 'Android') {
      console.log('Android Billing Service: Cannot load products - not initialized or not Android');
      return [];
    }

    try {
      // Load both in-app products and subscriptions
      const inAppProducts = await this.purchasePlugin.getProducts('inapp');
      const subscriptions = await this.purchasePlugin.getProducts('subs');
      
      const allProducts = [...inAppProducts, ...subscriptions];

      this.availableProducts = allProducts.map((product: any) => ({
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        priceAmountMicros: product.priceAmountMicros,
        priceCurrencyCode: product.priceCurrencyCode,
        type: product.type
      }));

      console.log(`Android Billing Service: Loaded ${this.availableProducts.length} products`);
      return this.availableProducts;

    } catch (error) {
      console.error('Android Billing Service: Failed to load products:', error);
      return [];
    }
  }

  getAvailableProducts(): AndroidProduct[] {
    return this.availableProducts;
  }

  getProduct(productId: string): AndroidProduct | null {
    return this.availableProducts.find(p => p.productId === productId) || null;
  }

  async purchaseProduct(productId: string): Promise<AndroidPurchaseResult> {
    if (!this.isInitialized || Device.os !== 'Android') {
      return {
        success: false,
        error: 'Billing not available on this platform'
      };
    }

    // Rate limiting for purchase attempts
    if (!SecurityUtils.rateLimiter.isAllowed('android_purchase', 3, 60000)) {
      return {
        success: false,
        error: 'Too many purchase attempts. Please wait a moment.'
      };
    }

    try {
      console.log(`Android Billing Service: Attempting to purchase ${productId}`);

      const product = this.getProduct(productId);
      if (!product) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      const result = await this.purchasePlugin.purchase(productId, product.type);

      if (result.success) {
        console.log('Android Billing Service: Purchase successful');
        
        // Validate the purchase
        const validation = await this.validatePurchase(result);
        
        if (validation.isValid) {
          // Acknowledge the purchase (required for Google Play)
          await this.acknowledgePurchase(result.purchaseToken);
          
          return {
            success: true,
            productId: result.productId,
            purchaseToken: result.purchaseToken,
            orderId: result.orderId,
            packageName: result.packageName,
            purchaseTime: result.purchaseTime,
            purchaseState: result.purchaseState
          };
        } else {
          console.error('Android Billing Service: Purchase validation failed');
          return {
            success: false,
            error: 'Purchase verification failed'
          };
        }
      } else if (result.cancelled) {
        console.log('Android Billing Service: Purchase cancelled by user');
        return {
          success: false,
          cancelled: true
        };
      } else {
        console.error('Android Billing Service: Purchase failed:', result.error);
        return {
          success: false,
          error: result.error || 'Purchase failed'
        };
      }

    } catch (error) {
      console.error('Android Billing Service: Purchase error:', error);
      return {
        success: false,
        error: error.message || 'Purchase failed'
      };
    }
  }

  async queryPurchases(): Promise<{ success: boolean; purchases: AndroidPurchaseResult[]; error?: string }> {
    if (!this.isInitialized || Device.os !== 'Android') {
      return {
        success: false,
        purchases: [],
        error: 'Billing not available on this platform'
      };
    }

    try {
      console.log('Android Billing Service: Querying existing purchases');

      // Query both in-app purchases and subscriptions
      const inAppResult = await this.purchasePlugin.queryPurchases('inapp');
      const subsResult = await this.purchasePlugin.queryPurchases('subs');

      const allPurchases = [...(inAppResult.purchases || []), ...(subsResult.purchases || [])];
      const validatedPurchases: AndroidPurchaseResult[] = [];

      // Validate each purchase
      for (const purchase of allPurchases) {
        const validation = await this.validatePurchase(purchase);
        
        if (validation.isValid) {
          validatedPurchases.push({
            success: true,
            productId: purchase.productId,
            purchaseToken: purchase.purchaseToken,
            orderId: purchase.orderId,
            packageName: purchase.packageName,
            purchaseTime: purchase.purchaseTime,
            purchaseState: purchase.purchaseState
          });
        }
      }

      console.log(`Android Billing Service: Found ${validatedPurchases.length} valid purchases`);
      
      return {
        success: true,
        purchases: validatedPurchases
      };

    } catch (error) {
      console.error('Android Billing Service: Query purchases error:', error);
      return {
        success: false,
        purchases: [],
        error: error.message || 'Failed to query purchases'
      };
    }
  }

  private async validatePurchase(purchase: any): Promise<AndroidPurchaseValidation> {
    try {
      // In production, you should validate purchases server-side with Google Play Developer API
      // This is a simplified client-side validation for demo purposes
      
      if (!purchase.purchaseToken) {
        return { isValid: false, error: 'No purchase token provided' };
      }

      // Basic purchase validation
      if (purchase.purchaseState !== 1) { // 1 = PURCHASED
        return { isValid: false, error: 'Purchase not in purchased state' };
      }

      // For demo purposes, we'll assume the purchase is valid
      // In production, send this to your server for validation with Google Play Developer API
      console.log('Android Billing Service: Purchase validation (client-side demo)');

      return {
        isValid: true,
        purchaseDate: new Date(purchase.purchaseTime),
        expiryDate: this.calculateExpiryDate(purchase.productId),
        productId: purchase.productId,
        orderId: purchase.orderId
      };

    } catch (error) {
      console.error('Android Billing Service: Purchase validation error:', error);
      return {
        isValid: false,
        error: error.message || 'Purchase validation failed'
      };
    }
  }

  private async acknowledgePurchase(purchaseToken: string): Promise<void> {
    try {
      await this.purchasePlugin.acknowledgePurchase(purchaseToken);
      console.log('Android Billing Service: Purchase acknowledged');
    } catch (error) {
      console.error('Android Billing Service: Failed to acknowledge purchase:', error);
    }
  }

  private calculateExpiryDate(productId: string): Date {
    // This is a simplified calculation for demo purposes
    // In production, extract the actual expiry date from subscription details
    const now = new Date();
    
    if (productId.includes('monthly')) {
      now.setMonth(now.getMonth() + 1);
    } else if (productId.includes('yearly')) {
      now.setFullYear(now.getFullYear() + 1);
    } else if (productId.includes('lifetime')) {
      now.setFullYear(now.getFullYear() + 100); // Effectively lifetime
    }
    
    return now;
  }

  async isFeatureSupported(feature: string): Promise<boolean> {
    if (!this.isInitialized || Device.os !== 'Android') {
      return false;
    }

    try {
      return await this.purchasePlugin.isFeatureSupported(feature);
    } catch (error) {
      console.error('Android Billing Service: Cannot check feature support:', error);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && Device.os === 'Android';
  }

  getProductIds(): typeof this.PRODUCT_IDS {
    return this.PRODUCT_IDS;
  }
}
