/**
 * Security utilities for the Unplug app
 */

export class SecurityUtils {
  
  /**
   * Encrypt sensitive data before storage
   */
  static encryptData(data: string, key?: string): string {
    // Simple XOR encryption for demonstration
    // In production, use proper encryption libraries like crypto-js
    const encryptionKey = key || this.getDeviceKey();
    let encrypted = '';

    for (let i = 0; i < data.length; i++) {
      const keyChar = encryptionKey.charCodeAt(i % encryptionKey.length);
      const dataChar = data.charCodeAt(i);
      encrypted += String.fromCharCode(dataChar ^ keyChar);
    }

    try {
      return btoa(encrypted); // Base64 encode
    } catch (error) {
      // Fallback for invalid characters - use hex encoding
      return Array.from(encrypted)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
    }
  }

  /**
   * Decrypt sensitive data after retrieval
   */
  static decryptData(encryptedData: string, key?: string): string {
    try {
      const encryptionKey = key || this.getDeviceKey();
      let encrypted = '';

      // Try base64 decode first
      try {
        encrypted = atob(encryptedData);
      } catch {
        // If base64 fails, try hex decode
        if (encryptedData.length % 2 === 0) {
          encrypted = encryptedData.match(/.{2}/g)
            ?.map(hex => String.fromCharCode(parseInt(hex, 16)))
            .join('') || '';
        }
      }

      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = encryptionKey.charCodeAt(i % encryptionKey.length);
        const encryptedChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  /**
   * Generate a device-specific encryption key
   */
  private static getDeviceKey(): string {
    const { Device } = require('@nativescript/core');
    // Create a device-specific key based on device properties
    const deviceInfo = `${Device.uuid || 'unknown'}-${Device.model || 'unknown'}-${Device.os || 'unknown'}`;
    return this.hashString(deviceInfo);
  }

  /**
   * Simple hash function for strings
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Validate and sanitize user input
   */
  static sanitizeInput(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim();

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate numeric input
   */
  static isValidNumber(value: any, min?: number, max?: number): boolean {
    const num = Number(value);
    if (isNaN(num)) return false;
    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;
    return true;
  }

  /**
   * Generate a secure random ID
   */
  static generateSecureId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${randomPart}`;
  }

  /**
   * Check if the app is running in a secure environment
   */
  static isSecureEnvironment(): boolean {
    const { Device } = require('@nativescript/core');
    
    // Check for debugging/development indicators
    const isDevelopment = typeof global !== 'undefined' && 
                         (global as any).__DEV__ === true;
    
    // Check for jailbreak/root (basic detection)
    const isJailbroken = this.detectJailbreak();
    
    return !isDevelopment && !isJailbroken;
  }

  /**
   * Basic jailbreak/root detection
   */
  private static detectJailbreak(): boolean {
    const { Device } = require('@nativescript/core');
    
    if (Device.os === 'iOS') {
      // Basic iOS jailbreak detection
      try {
        const { File } = require('@nativescript/core');
        const jailbreakPaths = [
          '/Applications/Cydia.app',
          '/usr/sbin/sshd',
          '/bin/bash',
          '/etc/apt'
        ];
        
        for (const path of jailbreakPaths) {
          if (File.exists(path)) {
            return true;
          }
        }
      } catch (error) {
        // If we can't check, assume not jailbroken
      }
    } else if (Device.os === 'Android') {
      // Basic Android root detection
      try {
        const { File } = require('@nativescript/core');
        const rootPaths = [
          '/system/app/Superuser.apk',
          '/system/xbin/su',
          '/system/bin/su',
          '/sbin/su'
        ];
        
        for (const path of rootPaths) {
          if (File.exists(path)) {
            return true;
          }
        }
      } catch (error) {
        // If we can't check, assume not rooted
      }
    }
    
    return false;
  }

  /**
   * Secure data storage wrapper
   */
  static secureStore = {
    /**
     * Store data securely
     */
    setItem(key: string, value: string): void {
      const { ApplicationSettings } = require('@nativescript/core');
      const encryptedValue = SecurityUtils.encryptData(value);
      ApplicationSettings.setString(key, encryptedValue);
    },

    /**
     * Retrieve data securely
     */
    getItem(key: string): string | null {
      const { ApplicationSettings } = require('@nativescript/core');
      const encryptedValue = ApplicationSettings.getString(key);
      
      if (!encryptedValue) {
        return null;
      }
      
      return SecurityUtils.decryptData(encryptedValue);
    },

    /**
     * Remove data securely
     */
    removeItem(key: string): void {
      const { ApplicationSettings } = require('@nativescript/core');
      ApplicationSettings.remove(key);
    },

    /**
     * Check if key exists
     */
    hasItem(key: string): boolean {
      const { ApplicationSettings } = require('@nativescript/core');
      return ApplicationSettings.hasKey(key);
    }
  };

  /**
   * Rate limiting for sensitive operations
   */
  static rateLimiter = {
    attempts: new Map<string, { count: number; lastAttempt: number }>(),

    /**
     * Check if operation is allowed
     */
    isAllowed(operation: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
      const now = Date.now();
      const key = operation;
      const record = this.attempts.get(key);

      if (!record) {
        this.attempts.set(key, { count: 1, lastAttempt: now });
        return true;
      }

      // Reset if window has passed
      if (now - record.lastAttempt > windowMs) {
        this.attempts.set(key, { count: 1, lastAttempt: now });
        return true;
      }

      // Check if under limit
      if (record.count < maxAttempts) {
        record.count++;
        record.lastAttempt = now;
        return true;
      }

      return false;
    },

    /**
     * Reset rate limit for operation
     */
    reset(operation: string): void {
      this.attempts.delete(operation);
    }
  };

  /**
   * Content Security Policy helpers
   */
  static csp = {
    /**
     * Validate URL for safety
     */
    isValidUrl(url: string): boolean {
      try {
        const urlObj = new URL(url);
        // Only allow HTTPS and app-specific protocols
        return urlObj.protocol === 'https:' || 
               urlObj.protocol === 'file:' ||
               urlObj.protocol === 'app:';
      } catch {
        return false;
      }
    },

    /**
     * Sanitize HTML content
     */
    sanitizeHtml(html: string): string {
      // Remove script tags and event handlers
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/javascript:/gi, '');
    }
  };
}
