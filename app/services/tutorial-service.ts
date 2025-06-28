import { Observable, EventData } from '@nativescript/core';
import { UserDataService } from '../models/user-data';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector or element ID
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'tap' | 'highlight' | 'overlay' | 'none';
  nextTrigger?: 'auto' | 'manual' | 'interaction';
  delay?: number;
  skippable?: boolean;
  icon?: string;
}

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  steps: TutorialStep[];
  trigger: 'onboarding' | 'feature_unlock' | 'manual' | 'first_visit';
  priority: number;
  conditions?: TutorialCondition[];
}

export interface TutorialCondition {
  type: 'level' | 'achievement' | 'session_count' | 'feature_unlocked' | 'time_since_join';
  operator: 'gte' | 'lte' | 'eq' | 'neq';
  value: any;
}

export interface TooltipConfig {
  id: string;
  title: string;
  message: string;
  targetElement: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  showOnce?: boolean;
  dismissible?: boolean;
  autoHide?: number; // milliseconds
  icon?: string;
  actionText?: string;
  actionCallback?: () => void;
}

export class TutorialService extends Observable {
  private static instance: TutorialService;
  private userDataService: UserDataService;
  private activeTutorial: Tutorial | null = null;
  private currentStepIndex: number = 0;
  private activeTooltips: Map<string, TooltipConfig> = new Map();
  private tutorials: Tutorial[] = [];

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.initializeTutorials();
  }

  static getInstance(): TutorialService {
    if (!TutorialService.instance) {
      TutorialService.instance = new TutorialService();
    }
    return TutorialService.instance;
  }

  private initializeTutorials(): void {
    this.tutorials = [
      {
        id: 'main_app_tour',
        name: 'App Walkthrough',
        description: 'Learn the basics of using Unplug',
        trigger: 'onboarding',
        priority: 1,
        steps: [
          {
            id: 'welcome_main',
            title: 'Welcome to Unplug! 🌟',
            description: 'This is your main dashboard where you can track your offline time and see your progress.',
            position: 'center',
            action: 'overlay',
            nextTrigger: 'manual',
            skippable: true,
            icon: '👋'
          },
          {
            id: 'session_controls',
            title: 'Session Controls',
            description: 'Use these buttons to start and end your offline sessions. Track your digital wellness journey!',
            targetElement: '.session-controls',
            position: 'bottom',
            action: 'highlight',
            nextTrigger: 'manual',
            skippable: true,
            icon: '▶️'
          },
          {
            id: 'progress_display',
            title: 'Your Progress',
            description: 'Here you can see your current level, XP, and daily progress towards your goals.',
            targetElement: '.progress-section',
            position: 'top',
            action: 'highlight',
            nextTrigger: 'manual',
            skippable: true,
            icon: '📊'
          },
          {
            id: 'quick_actions',
            title: 'Quick Actions',
            description: 'Access achievements, analytics, and other features quickly from these buttons.',
            targetElement: '.quick-actions',
            position: 'top',
            action: 'highlight',
            nextTrigger: 'manual',
            skippable: true,
            icon: '⚡'
          },
          {
            id: 'settings_access',
            title: 'Customize Your Experience',
            description: 'Tap the settings icon to customize notifications, themes, and other preferences.',
            targetElement: '[text="⚙️"]',
            position: 'bottom',
            action: 'highlight',
            nextTrigger: 'manual',
            skippable: true,
            icon: '⚙️'
          },
          {
            id: 'tutorial_complete',
            title: 'You\'re Ready! 🎉',
            description: 'You now know the basics of Unplug. Start your first session and begin your digital wellness journey!',
            position: 'center',
            action: 'overlay',
            nextTrigger: 'manual',
            skippable: false,
            icon: '✨'
          }
        ]
      },
      {
        id: 'achievements_intro',
        name: 'Achievements Introduction',
        description: 'Learn about the achievement system',
        trigger: 'feature_unlock',
        priority: 2,
        conditions: [
          { type: 'session_count', operator: 'gte', value: 1 }
        ],
        steps: [
          {
            id: 'achievements_button',
            title: 'Achievements Unlocked! 🏆',
            description: 'You\'ve completed your first session! Tap here to see your achievements and track your progress.',
            targetElement: '[text="🏆 Achievements"]',
            position: 'top',
            action: 'highlight',
            nextTrigger: 'interaction',
            skippable: true,
            icon: '🏆'
          }
        ]
      },
      {
        id: 'analytics_intro',
        name: 'Analytics Introduction',
        description: 'Discover your usage patterns and insights',
        trigger: 'feature_unlock',
        priority: 3,
        conditions: [
          { type: 'session_count', operator: 'gte', value: 3 }
        ],
        steps: [
          {
            id: 'analytics_button',
            title: 'Analytics Unlocked! 📊',
            description: 'You\'ve completed several sessions! Check out your analytics to see patterns and insights.',
            targetElement: '[text="📊 Analytics"]',
            position: 'top',
            action: 'highlight',
            nextTrigger: 'interaction',
            skippable: true,
            icon: '📊'
          }
        ]
      },
      {
        id: 'social_intro',
        name: 'Social Features Introduction',
        description: 'Connect with the community',
        trigger: 'feature_unlock',
        priority: 4,
        conditions: [
          { type: 'level', operator: 'gte', value: 3 }
        ],
        steps: [
          {
            id: 'social_features',
            title: 'Social Features Unlocked! 👥',
            description: 'You\'ve reached level 3! You can now connect with friends, join circles, and compete on leaderboards.',
            targetElement: '.social-features',
            position: 'top',
            action: 'highlight',
            nextTrigger: 'manual',
            skippable: true,
            icon: '👥'
          }
        ]
      }
    ];
  }

  // Tutorial Management
  async startTutorial(tutorialId: string): Promise<void> {
    const tutorial = this.tutorials.find(t => t.id === tutorialId);
    if (!tutorial) {
      console.warn(`Tutorial ${tutorialId} not found`);
      return;
    }

    // Check if tutorial was already completed
    const progress = this.getTutorialProgress();
    if (progress.completedTutorials.includes(tutorialId)) {
      return;
    }

    // Check conditions
    if (!this.checkTutorialConditions(tutorial)) {
      return;
    }

    this.activeTutorial = tutorial;
    this.currentStepIndex = 0;
    await this.showCurrentStep();
  }

  private async showCurrentStep(): Promise<void> {
    if (!this.activeTutorial || this.currentStepIndex >= this.activeTutorial.steps.length) {
      this.completeTutorial();
      return;
    }

    const step = this.activeTutorial.steps[this.currentStepIndex];
    
    // Emit step event for UI to handle
    this.notify({
      eventName: 'tutorialStep',
      object: this,
      data: {
        tutorial: this.activeTutorial,
        step: step,
        stepIndex: this.currentStepIndex,
        totalSteps: this.activeTutorial.steps.length
      }
    });

    // Auto-advance if configured
    if (step.nextTrigger === 'auto') {
      setTimeout(() => {
        this.nextStep();
      }, step.delay || 3000);
    }
  }

  nextStep(): void {
    if (!this.activeTutorial) return;
    
    this.currentStepIndex++;
    this.showCurrentStep();
  }

  previousStep(): void {
    if (!this.activeTutorial || this.currentStepIndex <= 0) return;
    
    this.currentStepIndex--;
    this.showCurrentStep();
  }

  skipTutorial(): void {
    if (!this.activeTutorial) return;
    
    this.completeTutorial();
  }

  private completeTutorial(): void {
    if (!this.activeTutorial) return;

    const progress = this.getTutorialProgress();
    progress.completedTutorials.push(this.activeTutorial.id);
    progress.lastTutorialDate = new Date();
    this.saveTutorialProgress(progress);

    this.notify({
      eventName: 'tutorialCompleted',
      object: this,
      data: { tutorialId: this.activeTutorial.id }
    });

    this.activeTutorial = null;
    this.currentStepIndex = 0;
  }

  // Tooltip Management
  showTooltip(config: TooltipConfig): void {
    const progress = this.getTutorialProgress();

    // Check if tooltip was dismissed and should only show once
    if (config.showOnce && progress.dismissedTooltips.includes(config.id)) {
      return;
    }

    // Check if tooltips are enabled
    if (!progress.tutorialPreferences.showTooltips) {
      return;
    }

    // Don't show tooltips during active tutorials
    if (this.activeTutorial) {
      return;
    }

    this.activeTooltips.set(config.id, config);

    this.notify({
      eventName: 'showTooltip',
      object: this,
      data: config
    });

    // Auto-hide if configured
    if (config.autoHide) {
      setTimeout(() => {
        this.hideTooltip(config.id);
      }, config.autoHide);
    }
  }

  hideTooltip(tooltipId: string): void {
    this.activeTooltips.delete(tooltipId);
    
    this.notify({
      eventName: 'hideTooltip',
      object: this,
      data: { tooltipId }
    });
  }

  dismissTooltip(tooltipId: string): void {
    const progress = this.getTutorialProgress();
    if (!progress.dismissedTooltips.includes(tooltipId)) {
      progress.dismissedTooltips.push(tooltipId);
      this.saveTutorialProgress(progress);
    }
    
    this.hideTooltip(tooltipId);
  }

  // Utility Methods
  private checkTutorialConditions(tutorial: Tutorial): boolean {
    if (!tutorial.conditions) return true;

    const userProfile = this.userDataService.getUserProfile();
    
    return tutorial.conditions.every(condition => {
      let actualValue: any;
      
      switch (condition.type) {
        case 'level':
          actualValue = userProfile.level;
          break;
        case 'session_count':
          actualValue = userProfile.totalSessions;
          break;
        case 'achievement':
          actualValue = userProfile.achievements.filter(a => a.unlocked).length;
          break;
        case 'time_since_join':
          actualValue = Date.now() - userProfile.joinDate.getTime();
          break;
        default:
          return true;
      }

      switch (condition.operator) {
        case 'gte': return actualValue >= condition.value;
        case 'lte': return actualValue <= condition.value;
        case 'eq': return actualValue === condition.value;
        case 'neq': return actualValue !== condition.value;
        default: return true;
      }
    });
  }

  private getTutorialProgress() {
    const userProfile = this.userDataService.getUserProfile();
    return userProfile.settings.tutorialProgress || {
      completedTutorials: [],
      dismissedTooltips: [],
      tutorialPreferences: {
        showTooltips: true,
        autoAdvance: false,
        animationSpeed: 'normal'
      }
    };
  }

  private saveTutorialProgress(progress: any): void {
    const userProfile = this.userDataService.getUserProfile();
    userProfile.settings.tutorialProgress = progress;
    this.userDataService.saveUserData();
  }

  // Public API
  checkForAvailableTutorials(): void {
    const availableTutorials = this.tutorials
      .filter(tutorial => this.checkTutorialConditions(tutorial))
      .filter(tutorial => {
        const progress = this.getTutorialProgress();
        return !progress.completedTutorials.includes(tutorial.id);
      })
      .sort((a, b) => a.priority - b.priority);

    if (availableTutorials.length > 0) {
      this.startTutorial(availableTutorials[0].id);
    }
  }

  isTooltipActive(tooltipId: string): boolean {
    return this.activeTooltips.has(tooltipId);
  }

  getActiveTutorial(): Tutorial | null {
    return this.activeTutorial;
  }

  getCurrentStep(): TutorialStep | null {
    if (!this.activeTutorial) return null;
    return this.activeTutorial.steps[this.currentStepIndex] || null;
  }
}
