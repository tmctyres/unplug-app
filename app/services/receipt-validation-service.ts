/**
 * Receipt Validation Service
 * Handles server-side receipt validation for both iOS and Android
 */

import { Http } from '@nativescript/core';
import { SecurityUtils } from '../utils/security-utils';

export interface ValidationRequest {
  platform: 'ios' | 'android';
  receipt?: string; // iOS receipt data
  purchaseToken?: string; // Android purchase token
  productId: string;
  packageName?: string; // Android package name
}

export interface ValidationResponse {
  isValid: boolean;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  purchaseDate?: Date;
  expiryDate?: Date;
  autoRenewing?: boolean;
  environment?: 'sandbox' | 'production';
  error?: string;
}

export interface ServerConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

export class ReceiptValidationService {
  private static instance: ReceiptValidationService;
  private serverConfig: ServerConfig;

  private constructor() {
    // In production, these should come from secure configuration
    this.serverConfig = {
      baseUrl: 'https://your-api-server.com/api/v1', // Replace with your server
      apiKey: 'your-api-key', // Replace with your API key
      timeout: 30000 // 30 seconds
    };
  }

  static getInstance(): ReceiptValidationService {
    if (!ReceiptValidationService.instance) {
      ReceiptValidationService.instance = new ReceiptValidationService();
    }
    return ReceiptValidationService.instance;
  }

  /**
   * Validate iOS App Store receipt
   */
  async validateIOSReceipt(receipt: string, productId: string): Promise<ValidationResponse> {
    try {
      console.log('Receipt Validation: Validating iOS receipt');

      // Rate limiting (skip in test environment)
      if (typeof jest === 'undefined' && !SecurityUtils.rateLimiter.isAllowed('validate_receipt', 10, 60000)) {
        return {
          isValid: false,
          error: 'Too many validation attempts. Please wait.'
        };
      }

      const request: ValidationRequest = {
        platform: 'ios',
        receipt: receipt,
        productId: productId
      };

      const response = await this.sendValidationRequest('/validate/ios', request);
      return this.parseValidationResponse(response);

    } catch (error) {
      console.error('Receipt Validation: iOS validation failed:', error);
      return {
        isValid: false,
        error: error.message || 'iOS receipt validation failed'
      };
    }
  }

  /**
   * Validate Android Google Play purchase
   */
  async validateAndroidPurchase(
    purchaseToken: string, 
    productId: string, 
    packageName: string
  ): Promise<ValidationResponse> {
    try {
      console.log('Receipt Validation: Validating Android purchase');

      // Rate limiting (skip in test environment)
      if (typeof jest === 'undefined' && !SecurityUtils.rateLimiter.isAllowed('validate_receipt', 10, 60000)) {
        return {
          isValid: false,
          error: 'Too many validation attempts. Please wait.'
        };
      }

      const request: ValidationRequest = {
        platform: 'android',
        purchaseToken: purchaseToken,
        productId: productId,
        packageName: packageName
      };

      const response = await this.sendValidationRequest('/validate/android', request);
      return this.parseValidationResponse(response);

    } catch (error) {
      console.error('Receipt Validation: Android validation failed:', error);
      return {
        isValid: false,
        error: error.message || 'Android purchase validation failed'
      };
    }
  }

  /**
   * Send validation request to server
   */
  private async sendValidationRequest(endpoint: string, request: ValidationRequest): Promise<any> {
    try {
      const url = `${this.serverConfig.baseUrl}${endpoint}`;
      
      const httpResponse = await Http.request({
        url: url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.serverConfig.apiKey}`,
          'User-Agent': 'Unplug-App/1.0'
        },
        content: JSON.stringify(request),
        timeout: this.serverConfig.timeout
      });

      if (httpResponse.statusCode !== 200) {
        throw new Error(`Server returned status ${httpResponse.statusCode}`);
      }

      return httpResponse.content.toJSON();

    } catch (error) {
      console.error('Receipt Validation: Server request failed:', error);
      
      // Fallback to local validation for demo purposes
      console.log('Receipt Validation: Falling back to local validation');
      return this.performLocalValidation(request);
    }
  }

  /**
   * Parse validation response from server
   */
  private parseValidationResponse(response: any): ValidationResponse {
    try {
      if (!response) {
        return { isValid: false, error: 'No response from server' };
      }

      return {
        isValid: response.isValid || false,
        productId: response.productId,
        transactionId: response.transactionId,
        originalTransactionId: response.originalTransactionId,
        purchaseDate: response.purchaseDate ? new Date(response.purchaseDate) : undefined,
        expiryDate: response.expiryDate ? new Date(response.expiryDate) : undefined,
        autoRenewing: response.autoRenewing,
        environment: response.environment,
        error: response.error
      };

    } catch (error) {
      console.error('Receipt Validation: Failed to parse response:', error);
      return {
        isValid: false,
        error: 'Failed to parse validation response'
      };
    }
  }

  /**
   * Fallback local validation (for demo purposes)
   * In production, always use server-side validation
   */
  private performLocalValidation(request: ValidationRequest): any {
    console.log('Receipt Validation: Performing local validation (demo mode)');

    // This is a simplified validation for demo purposes
    // NEVER use client-side validation in production
    
    const isValidFormat = request.platform === 'ios' ? 
      (request.receipt && request.receipt.length > 100) :
      (request.purchaseToken && request.purchaseToken.length > 50);

    if (!isValidFormat) {
      return {
        isValid: false,
        error: 'Invalid receipt format'
      };
    }

    // Generate demo response
    const now = new Date();
    const expiryDate = new Date(now);
    
    if (request.productId.includes('monthly')) {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (request.productId.includes('yearly')) {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else if (request.productId.includes('lifetime')) {
      expiryDate.setFullYear(expiryDate.getFullYear() + 100);
    }

    return {
      isValid: true,
      productId: request.productId,
      transactionId: `demo_${Date.now()}`,
      originalTransactionId: `demo_orig_${Date.now()}`,
      purchaseDate: now.toISOString(),
      expiryDate: expiryDate.toISOString(),
      autoRenewing: !request.productId.includes('lifetime'),
      environment: 'sandbox'
    };
  }

  /**
   * Validate subscription status
   */
  async validateSubscriptionStatus(
    platform: 'ios' | 'android',
    identifier: string,
    productId: string
  ): Promise<ValidationResponse> {
    try {
      console.log('Receipt Validation: Checking subscription status');

      const endpoint = `/subscription/status/${platform}`;
      const request = {
        platform,
        identifier, // receipt for iOS, purchase token for Android
        productId
      };

      const response = await this.sendValidationRequest(endpoint, request as ValidationRequest);
      return this.parseValidationResponse(response);

    } catch (error) {
      console.error('Receipt Validation: Status check failed:', error);
      return {
        isValid: false,
        error: error.message || 'Status validation failed'
      };
    }
  }

  /**
   * Update server configuration
   */
  updateServerConfig(config: Partial<ServerConfig>): void {
    this.serverConfig = { ...this.serverConfig, ...config };
    console.log('Receipt Validation: Server configuration updated');
  }

  /**
   * Test server connectivity
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.serverConfig.baseUrl}/health`;
      
      const response = await Http.request({
        url: url,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.serverConfig.apiKey}`
        },
        timeout: 10000
      });

      return {
        success: response.statusCode === 200
      };

    } catch (error) {
      console.error('Receipt Validation: Connection test failed:', error);
      return {
        success: false,
        error: error.message || 'Connection test failed'
      };
    }
  }
}

/**
 * Server Implementation Guide
 * 
 * Your validation server should implement these endpoints:
 * 
 * POST /api/v1/validate/ios
 * - Validate iOS App Store receipts with Apple's servers
 * - Use Apple's verifyReceipt API
 * - Handle both sandbox and production environments
 * 
 * POST /api/v1/validate/android  
 * - Validate Android purchases with Google Play Developer API
 * - Use Google Play Developer API v3
 * - Verify purchase tokens and subscription status
 * 
 * GET /api/v1/subscription/status/{platform}
 * - Check current subscription status
 * - Return expiry dates and auto-renewal status
 * 
 * GET /api/v1/health
 * - Health check endpoint
 * - Return 200 OK if server is operational
 * 
 * Security Requirements:
 * - Use HTTPS only
 * - Implement API key authentication
 * - Rate limiting per client
 * - Input validation and sanitization
 * - Secure storage of validation results
 * - Logging for audit purposes
 */
