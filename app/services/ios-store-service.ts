/**
 * iOS App Store Integration Service
 * Handles real In-App Purchases using StoreKit
 */

import { Observable, Device } from '@nativescript/core';
import { SecurityUtils } from '../utils/security-utils';

export interface IOSProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceLocale: string;
  currencyCode: string;
  priceValue: number;
}

export interface IOSPurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  receipt?: string;
  error?: string;
  cancelled?: boolean;
}

export interface IOSReceiptValidation {
  isValid: boolean;
  expiryDate?: Date;
  originalPurchaseDate?: Date;
  productId?: string;
  transactionId?: string;
  error?: string;
}

export class IOSStoreService extends Observable {
  private static instance: IOSStoreService;
  private isInitialized: boolean = false;
  private availableProducts: IOSProduct[] = [];
  private purchasePlugin: any;

  // Product IDs - these should match your App Store Connect configuration
  private readonly PRODUCT_IDS = {
    PRO_MONTHLY: 'com.unplug.screentime.pro.monthly',
    PRO_YEARLY: 'com.unplug.screentime.pro.yearly', 
    PRO_LIFETIME: 'com.unplug.screentime.pro.lifetime'
  };

  private constructor() {
    super();
    this.initializeStoreKit();
  }

  static getInstance(): IOSStoreService {
    if (!IOSStoreService.instance) {
      IOSStoreService.instance = new IOSStoreService();
    }
    return IOSStoreService.instance;
  }

  private async initializeStoreKit(): Promise<void> {
    try {
      // Only initialize on iOS
      if (Device.os !== 'iOS') {
        console.log('iOS Store Service: Not running on iOS, skipping initialization');
        return;
      }

      // Import the purchase plugin
      const { Purchase } = require('nativescript-purchase');
      this.purchasePlugin = Purchase;

      // Initialize the purchase plugin
      await this.purchasePlugin.init([
        this.PRODUCT_IDS.PRO_MONTHLY,
        this.PRODUCT_IDS.PRO_YEARLY,
        this.PRODUCT_IDS.PRO_LIFETIME
      ]);

      this.isInitialized = true;
      console.log('iOS Store Service: StoreKit initialized successfully');

      // Load available products
      await this.loadProducts();

    } catch (error) {
      console.error('iOS Store Service: Failed to initialize StoreKit:', error);
      this.isInitialized = false;
    }
  }

  async loadProducts(): Promise<IOSProduct[]> {
    if (!this.isInitialized || Device.os !== 'iOS') {
      console.log('iOS Store Service: Cannot load products - not initialized or not iOS');
      return [];
    }

    try {
      const products = await this.purchasePlugin.getProducts();
      
      this.availableProducts = products.map((product: any) => ({
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        priceLocale: product.priceLocale,
        currencyCode: product.currencyCode,
        priceValue: product.priceValue
      }));

      console.log(`iOS Store Service: Loaded ${this.availableProducts.length} products`);
      return this.availableProducts;

    } catch (error) {
      console.error('iOS Store Service: Failed to load products:', error);
      return [];
    }
  }

  getAvailableProducts(): IOSProduct[] {
    return this.availableProducts;
  }

  getProduct(productId: string): IOSProduct | null {
    return this.availableProducts.find(p => p.productId === productId) || null;
  }

  async purchaseProduct(productId: string): Promise<IOSPurchaseResult> {
    if (!this.isInitialized || Device.os !== 'iOS') {
      return {
        success: false,
        error: 'Store not available on this platform'
      };
    }

    // Rate limiting for purchase attempts
    if (!SecurityUtils.rateLimiter.isAllowed('ios_purchase', 3, 60000)) {
      return {
        success: false,
        error: 'Too many purchase attempts. Please wait a moment.'
      };
    }

    try {
      console.log(`iOS Store Service: Attempting to purchase ${productId}`);

      const result = await this.purchasePlugin.purchase(productId);

      if (result.success) {
        console.log('iOS Store Service: Purchase successful');
        
        // Validate the receipt
        const validation = await this.validateReceipt(result.receipt);
        
        if (validation.isValid) {
          return {
            success: true,
            productId: result.productId,
            transactionId: result.transactionId,
            receipt: result.receipt
          };
        } else {
          console.error('iOS Store Service: Receipt validation failed');
          return {
            success: false,
            error: 'Purchase verification failed'
          };
        }
      } else if (result.cancelled) {
        console.log('iOS Store Service: Purchase cancelled by user');
        return {
          success: false,
          cancelled: true
        };
      } else {
        console.error('iOS Store Service: Purchase failed:', result.error);
        return {
          success: false,
          error: result.error || 'Purchase failed'
        };
      }

    } catch (error) {
      console.error('iOS Store Service: Purchase error:', error);
      return {
        success: false,
        error: error.message || 'Purchase failed'
      };
    }
  }

  async restorePurchases(): Promise<{ success: boolean; purchases: IOSPurchaseResult[]; error?: string }> {
    if (!this.isInitialized || Device.os !== 'iOS') {
      return {
        success: false,
        purchases: [],
        error: 'Store not available on this platform'
      };
    }

    try {
      console.log('iOS Store Service: Restoring purchases');

      const result = await this.purchasePlugin.restorePurchases();
      
      if (result.success) {
        const validatedPurchases: IOSPurchaseResult[] = [];

        // Validate each restored purchase
        for (const purchase of result.purchases) {
          const validation = await this.validateReceipt(purchase.receipt);
          
          if (validation.isValid) {
            validatedPurchases.push({
              success: true,
              productId: purchase.productId,
              transactionId: purchase.transactionId,
              receipt: purchase.receipt
            });
          }
        }

        console.log(`iOS Store Service: Restored ${validatedPurchases.length} valid purchases`);
        
        return {
          success: true,
          purchases: validatedPurchases
        };
      } else {
        return {
          success: false,
          purchases: [],
          error: result.error || 'Failed to restore purchases'
        };
      }

    } catch (error) {
      console.error('iOS Store Service: Restore error:', error);
      return {
        success: false,
        purchases: [],
        error: error.message || 'Failed to restore purchases'
      };
    }
  }

  private async validateReceipt(receipt: string): Promise<IOSReceiptValidation> {
    try {
      // In production, you should validate receipts server-side
      // This is a simplified client-side validation for demo purposes
      
      if (!receipt) {
        return { isValid: false, error: 'No receipt provided' };
      }

      // Basic receipt format validation
      if (!receipt.startsWith('MIIT') && !receipt.startsWith('MII')) {
        return { isValid: false, error: 'Invalid receipt format' };
      }

      // For demo purposes, we'll assume the receipt is valid
      // In production, send this to your server for validation with Apple's servers
      console.log('iOS Store Service: Receipt validation (client-side demo)');

      return {
        isValid: true,
        originalPurchaseDate: new Date(),
        // Note: Real validation would extract these from the receipt
        expiryDate: this.calculateExpiryDate(receipt),
        productId: this.extractProductId(receipt),
        transactionId: this.generateTransactionId()
      };

    } catch (error) {
      console.error('iOS Store Service: Receipt validation error:', error);
      return {
        isValid: false,
        error: error.message || 'Receipt validation failed'
      };
    }
  }

  private calculateExpiryDate(receipt: string): Date {
    // This is a simplified calculation for demo purposes
    // In production, extract the actual expiry date from the receipt
    const now = new Date();
    
    // Default to 1 month for demo
    now.setMonth(now.getMonth() + 1);
    return now;
  }

  private extractProductId(receipt: string): string {
    // This is a simplified extraction for demo purposes
    // In production, parse the actual product ID from the receipt
    return this.PRODUCT_IDS.PRO_MONTHLY;
  }

  private generateTransactionId(): string {
    return `ios_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async canMakePayments(): Promise<boolean> {
    if (!this.isInitialized || Device.os !== 'iOS') {
      return false;
    }

    try {
      return await this.purchasePlugin.canMakePayments();
    } catch (error) {
      console.error('iOS Store Service: Cannot check payment capability:', error);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && Device.os === 'iOS';
  }

  getProductIds(): typeof this.PRODUCT_IDS {
    return this.PRODUCT_IDS;
  }
}
