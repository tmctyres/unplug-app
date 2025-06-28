// Mock NativeScript modules for testing
global.android = {
  content: {
    Intent: {
      FLAG_ACTIVITY_NEW_TASK: 0x10000000
    }
  },
  provider: {
    Settings: {
      ACTION_USAGE_ACCESS_SETTINGS: 'android.settings.USAGE_ACCESS_SETTINGS'
    }
  }
} as any;
global.ios = {} as any;

// Mock ApplicationSettings
const mockApplicationSettings = {
  getString: jest.fn(),
  setString: jest.fn(),
  getBoolean: jest.fn(),
  setBoolean: jest.fn(),
  getNumber: jest.fn(),
  setNumber: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn()
};

// Mock Device
const mockDevice = {
  os: 'Android',
  osVersion: '10',
  model: 'Test Device',
  deviceType: 'Phone'
};

// Mock Application
const mockApplication = {
  run: jest.fn(),
  android: {
    on: jest.fn(),
    off: jest.fn()
  },
  ios: {
    on: jest.fn(),
    off: jest.fn()
  }
};

// Mock Utils
const mockUtils = {
  android: {
    getApplicationContext: jest.fn().mockReturnValue({
      startActivity: jest.fn()
    })
  }
};

// Mock LocalNotifications
const mockLocalNotifications = {
  schedule: jest.fn(),
  cancel: jest.fn(),
  hasPermission: jest.fn().mockResolvedValue(true),
  requestPermission: jest.fn().mockResolvedValue(true)
};

// Mock Dialogs
const mockDialogs = {
  alert: jest.fn(),
  confirm: jest.fn(),
  prompt: jest.fn()
};

// Mock MonetizationService
const mockMonetizationService = {
  initializeAdMob: jest.fn().mockResolvedValue(true),
  showBannerAd: jest.fn(),
  hideBannerAd: jest.fn(),
  showInterstitialAd: jest.fn(),
  showRewardedAd: jest.fn(),
  isAdMobInitialized: jest.fn().mockReturnValue(true),
  on: jest.fn(),
  off: jest.fn()
};

// Mock SubscriptionManager
const mockSubscriptionManager = {
  on: jest.fn(),
  off: jest.fn(),
  checkSubscriptionStatus: jest.fn(),
  isSubscriptionExpiringSoon: jest.fn().mockReturnValue(false),
  isSubscriptionExpired: jest.fn().mockReturnValue(false),
  notifyPropertyChange: jest.fn(),
  set: jest.fn()
};

// Mock FeedbackService
const mockFeedbackService = {
  showSessionFeedback: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

// Mock CelebrationOverlay
const mockCelebrationOverlay = {
  showCelebration: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

// Mock NotificationService
const mockNotificationService = {
  sendImmediateNotification: jest.fn(),
  rescheduleNotifications: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

// Mock TutorialService
const mockTutorialService = {
  startTutorial: jest.fn(),
  checkForPendingTutorials: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

// Mock TutorialOverlay
const mockTutorialOverlay = {
  showTutorial: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

// Mock FeatureUnlockService
const mockFeatureUnlockService = {
  checkForUnlocks: jest.fn().mockReturnValue([]),
  getNextUnlockableFeatures: jest.fn().mockReturnValue([]),
  on: jest.fn(),
  off: jest.fn(),
  userDataService: {
    saveUserData: jest.fn()
  }
};

// Mock SecurityUtils
const mockSecurityUtils = {
  rateLimiter: {
    isAllowed: jest.fn().mockReturnValue(true),
    reset: jest.fn()
  },
  secureStore: {
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  }
};

// Mock SocialOnboardingService
const mockSocialOnboardingService = {
  getInstance: jest.fn(() => ({
    checkOnboardingStatus: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }))
};

// Set up module mocks
jest.mock('@nativescript/core', () => ({
  Observable: class Observable {
    private _listeners: { [key: string]: Function[] } = {};
    
    on(eventName: string, callback: Function) {
      if (!this._listeners[eventName]) {
        this._listeners[eventName] = [];
      }
      this._listeners[eventName].push(callback);
    }
    
    off(eventName: string, callback?: Function) {
      if (callback && this._listeners[eventName]) {
        const index = this._listeners[eventName].indexOf(callback);
        if (index > -1) {
          this._listeners[eventName].splice(index, 1);
        }
      } else {
        delete this._listeners[eventName];
      }
    }
    
    notifyPropertyChange(propertyName: string, value: any) {
      if (this._listeners['propertyChange']) {
        this._listeners['propertyChange'].forEach(callback => {
          callback({ propertyName, value });
        });
      }
    }
    
    set(propertyName: string, value: any) {
      (this as any)[propertyName] = value;
      this.notifyPropertyChange(propertyName, value);
    }
  },
  ApplicationSettings: mockApplicationSettings,
  Device: mockDevice,
  Application: mockApplication,
  Utils: mockUtils,
  Dialogs: mockDialogs
}));

// Mock require calls for various modules
const originalRequire = require;
(global as any).require = jest.fn((moduleName: string) => {
  if (moduleName === '@nativescript/local-notifications') {
    return { LocalNotifications: mockLocalNotifications };
  }
  if (moduleName === '../services/monetization-service') {
    return { MonetizationService: { getInstance: () => mockMonetizationService } };
  }
  if (moduleName === '../services/subscription-manager') {
    return { SubscriptionManager: { getInstance: () => mockSubscriptionManager } };
  }
  if (moduleName === '../services/feedback-service') {
    return { FeedbackService: { getInstance: () => mockFeedbackService } };
  }
  if (moduleName === '../components/celebration-overlay') {
    return { CelebrationOverlay: { getInstance: () => mockCelebrationOverlay } };
  }
  if (moduleName === '../services/notification-service') {
    return { NotificationService: { getInstance: () => mockNotificationService } };
  }
  if (moduleName === '../services/tutorial-service') {
    return { TutorialService: { getInstance: () => mockTutorialService } };
  }
  if (moduleName === '../components/tutorial-overlay') {
    return { TutorialOverlay: { getInstance: () => mockTutorialOverlay } };
  }
  if (moduleName === '../services/feature-unlock-service') {
    return { FeatureUnlockService: { getInstance: () => mockFeatureUnlockService } };
  }
  if (moduleName === '@nativescript/core') {
    return {
      Observable: class Observable {
        private _listeners: { [key: string]: Function[] } = {};

        on(eventName: string, callback: Function) {
          if (!this._listeners[eventName]) {
            this._listeners[eventName] = [];
          }
          this._listeners[eventName].push(callback);
        }

        off(eventName: string, callback?: Function) {
          if (callback && this._listeners[eventName]) {
            const index = this._listeners[eventName].indexOf(callback);
            if (index > -1) {
              this._listeners[eventName].splice(index, 1);
            }
          } else {
            delete this._listeners[eventName];
          }
        }

        notifyPropertyChange(propertyName: string, value: any) {
          if (this._listeners['propertyChange']) {
            this._listeners['propertyChange'].forEach(callback => {
              callback({ propertyName, value });
            });
          }
        }

        set(propertyName: string, value: any) {
          (this as any)[propertyName] = value;
          this.notifyPropertyChange(propertyName, value);
        }
      },
      ApplicationSettings: mockApplicationSettings,
      Device: mockDevice,
      Application: mockApplication,
      Utils: mockUtils,
      Dialogs: mockDialogs,
      Frame: {
        topmost: () => ({
          navigate: jest.fn()
        })
      }
    };
  }
  return originalRequire(moduleName);
});

// Mock SecurityUtils
jest.mock('../app/utils/security-utils', () => ({
  SecurityUtils: mockSecurityUtils
}));

// Mock SocialOnboardingService
jest.mock('../app/services/social-onboarding-service', () => ({
  SocialOnboardingService: mockSocialOnboardingService
}));

// Export mocks for use in tests
export {
  mockApplicationSettings,
  mockDevice,
  mockApplication,
  mockUtils,
  mockLocalNotifications,
  mockDialogs,
  mockMonetizationService,
  mockSubscriptionManager,
  mockFeedbackService,
  mockCelebrationOverlay,
  mockNotificationService,
  mockTutorialService,
  mockTutorialOverlay,
  mockFeatureUnlockService,
  mockSecurityUtils,
  mockSocialOnboardingService
};
