/**
 * Security configuration for the Unplug app
 */

export interface SecurityConfig {
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyRotationInterval: number; // in milliseconds
  };
  rateLimit: {
    enabled: boolean;
    maxAttempts: number;
    windowMs: number;
  };
  inputValidation: {
    enabled: boolean;
    maxStringLength: number;
    allowedCharacters: RegExp;
  };
  dataProtection: {
    encryptSensitiveData: boolean;
    secureStorage: boolean;
    dataRetentionDays: number;
  };
  networkSecurity: {
    enforceHttps: boolean;
    certificatePinning: boolean;
    allowedDomains: string[];
  };
  deviceSecurity: {
    jailbreakDetection: boolean;
    debuggerDetection: boolean;
    requireSecureEnvironment: boolean;
  };
}

export const SECURITY_CONFIG: SecurityConfig = {
  encryption: {
    enabled: true,
    algorithm: 'AES-256-GCM', // Note: Using XOR for demo, would use proper crypto in production
    keyRotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  rateLimit: {
    enabled: true,
    maxAttempts: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  inputValidation: {
    enabled: true,
    maxStringLength: 2000,
    allowedCharacters: /^[a-zA-Z0-9\s\-_.,!?@#$%&*()+=\[\]{}|\\:";'<>\/~`]*$/,
  },
  dataProtection: {
    encryptSensitiveData: true,
    secureStorage: true,
    dataRetentionDays: 365, // 1 year
  },
  networkSecurity: {
    enforceHttps: true,
    certificatePinning: false, // Would enable in production with proper certificates
    allowedDomains: [
      'localhost',
      '127.0.0.1',
      // Add your API domains here
    ],
  },
  deviceSecurity: {
    jailbreakDetection: true,
    debuggerDetection: false, // Disabled for development
    requireSecureEnvironment: false, // Would enable in production
  },
};

/**
 * Security policy definitions
 */
export const SECURITY_POLICIES = {
  // Password/PIN requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
  
  // Session management
  session: {
    maxDurationMs: 24 * 60 * 60 * 1000, // 24 hours
    inactivityTimeoutMs: 30 * 60 * 1000, // 30 minutes
    requireReauthentication: false,
  },
  
  // Data handling
  data: {
    maxBackupSize: 10 * 1024 * 1024, // 10MB
    compressionEnabled: true,
    anonymizeExports: true,
  },
  
  // Privacy settings
  privacy: {
    collectAnalytics: false,
    shareUsageData: false,
    allowCrashReporting: true,
    dataMinimization: true,
  },
};

/**
 * Security validation rules
 */
export const VALIDATION_RULES = {
  username: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    blockedWords: ['admin', 'root', 'system', 'test'],
  },
  
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
  },
  
  sessionNote: {
    minLength: 10,
    maxLength: 2000,
    allowedTags: [], // No HTML tags allowed
  },
  
  displayName: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s\-_.]+$/,
  },
  
  bio: {
    maxLength: 500,
    allowedTags: [], // No HTML tags allowed
  },
};

/**
 * Security error messages
 */
export const SECURITY_MESSAGES = {
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Please wait before trying again.',
  INVALID_INPUT: 'Invalid input detected. Please check your data.',
  ENCRYPTION_FAILED: 'Failed to secure your data. Please try again.',
  JAILBREAK_DETECTED: 'This app cannot run on modified devices for security reasons.',
  INSECURE_ENVIRONMENT: 'This app requires a secure environment to protect your data.',
  INVALID_SESSION: 'Your session has expired. Please restart the app.',
  DATA_CORRUPTION: 'Data integrity check failed. Please contact support.',
  NETWORK_ERROR: 'Secure connection could not be established.',
};

/**
 * Security event types for logging
 */
export enum SecurityEventType {
  AUTHENTICATION_SUCCESS = 'auth_success',
  AUTHENTICATION_FAILURE = 'auth_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_INPUT_DETECTED = 'invalid_input',
  JAILBREAK_DETECTED = 'jailbreak_detected',
  DATA_ENCRYPTION_FAILURE = 'encryption_failure',
  INSECURE_NETWORK_BLOCKED = 'insecure_network_blocked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

/**
 * Security utility functions
 */
export class SecurityConfigUtils {
  
  /**
   * Check if current environment meets security requirements
   */
  static isSecureEnvironment(): boolean {
    const config = SECURITY_CONFIG.deviceSecurity;
    
    if (config.requireSecureEnvironment) {
      // Add your security checks here
      return true; // Simplified for demo
    }
    
    return true;
  }
  
  /**
   * Get rate limit configuration for operation
   */
  static getRateLimitConfig(operation: string): { maxAttempts: number; windowMs: number } {
    const baseConfig = SECURITY_CONFIG.rateLimit;
    
    // Operation-specific overrides
    const overrides: Record<string, { maxAttempts: number; windowMs: number }> = {
      'login': { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 15 minutes
      'create_note': { maxAttempts: 20, windowMs: 60 * 1000 }, // 1 minute
      'export_data': { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 1 hour
      'setup_data_change': { maxAttempts: 30, windowMs: 60 * 1000 }, // 1 minute
    };
    
    return overrides[operation] || baseConfig;
  }
  
  /**
   * Validate input against security rules
   */
  static validateInput(input: string, type: keyof typeof VALIDATION_RULES): { isValid: boolean; error?: string } {
    const rules = VALIDATION_RULES[type];
    if (!rules) {
      return { isValid: false, error: 'Unknown validation type' };
    }

    if ('minLength' in rules && rules.minLength && input.length < rules.minLength) {
      return { isValid: false, error: `Minimum length is ${rules.minLength}` };
    }

    if ('maxLength' in rules && rules.maxLength && input.length > rules.maxLength) {
      return { isValid: false, error: `Maximum length is ${rules.maxLength}` };
    }

    if ('pattern' in rules && rules.pattern && !rules.pattern.test(input)) {
      return { isValid: false, error: 'Invalid format' };
    }
    
    if ('blockedWords' in rules && rules.blockedWords) {
      const lowerInput = input.toLowerCase();
      for (const word of rules.blockedWords) {
        if (lowerInput.includes(word.toLowerCase())) {
          return { isValid: false, error: 'Contains blocked content' };
        }
      }
    }
    
    return { isValid: true };
  }
}
