import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import { TrackingService } from '../services/tracking-service';
import { PersonalizationService, UserPersonality } from '../services/personalization-service';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  actionText?: string;
  skipText?: string;
  recommendedValue?: any;
}

export class OnboardingViewModel extends Observable {
  private userDataService: UserDataService;
  private trackingService: TrackingService;
  private personalizationService: PersonalizationService;
  private currentStepIndex: number = 0;
  private steps: OnboardingStep[] = [];
  private userChoices: { [key: string]: any } = {};
  private userPersonality: UserPersonality | null = null;

  constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.trackingService = TrackingService.getInstance();
    this.personalizationService = PersonalizationService.getInstance();
    this.initializeSteps();
    this.updateCurrentStep();
    this.initializePersonalityChoices();
  }

  private initializePersonalityChoices(): void {
    this.set('personalityChoices', {
      motivation: null,
      tracking: null,
      social: null
    });
  }

  private initializeSteps(): void {
    this.steps = [
      {
        id: 'welcome',
        title: 'Welcome to Unplug! 🌟',
        description: 'Take control of your screen time and discover the joy of being offline. Let\'s get you started on your digital wellness journey.',
        icon: '🚀',
        actionText: 'Get Started'
      },
      {
        id: 'personality',
        title: 'Tell Us About You 🧠',
        description: 'Help us personalize your experience by answering a few quick questions about your preferences.',
        icon: '🎯',
        actionText: 'Continue'
      },
      {
        id: 'tracking_mode',
        title: 'Choose Your Tracking Mode 📱',
        description: this.trackingService.isAndroid()
          ? 'On Android, we can automatically track when your screen is off. This means effortless monitoring of your offline time!'
          : 'On iOS, you\'ll manually start and stop sessions. This gives you complete control over when to track your offline time.',
        icon: this.trackingService.isAndroid() ? '🤖' : '👆',
        actionText: 'Continue'
      },
      {
        id: 'daily_goal',
        title: 'Set Your Daily Goal 🎯',
        description: 'How much offline time would you like to aim for each day? You can always change this later in settings.',
        icon: '⏰',
        actionText: 'Set Goal'
      },
      {
        id: 'gamification',
        title: 'Level Up Your Life! 🏆',
        description: 'Earn XP for every minute offline, unlock achievements, build streaks, and level up! Turn your digital wellness into an engaging game.',
        icon: '🎮',
        actionText: 'Awesome!'
      },
      {
        id: 'notifications',
        title: 'Stay Motivated 🔔',
        description: 'Get gentle reminders and celebrate your achievements with notifications. We\'ll help you stay on track without being annoying.',
        icon: '📱',
        actionText: 'Enable Notifications',
        skipText: 'Skip for Now'
      },
      {
        id: 'ready',
        title: 'You\'re All Set! 🎉',
        description: 'Ready to start your first offline session? Remember, every minute counts towards building a healthier relationship with technology.',
        icon: '✨',
        actionText: 'Start My Journey'
      }
    ];
  }

  private updateCurrentStep(): void {
    const step = this.steps[this.currentStepIndex];
    this.set('currentStep', step);
    this.set('stepNumber', this.currentStepIndex + 1);
    this.set('totalSteps', this.steps.length);
    this.set('isFirstStep', this.currentStepIndex === 0);
    this.set('isLastStep', this.currentStepIndex === this.steps.length - 1);
    this.set('progressPercentage', ((this.currentStepIndex + 1) / this.steps.length) * 100);

    // Update step-specific properties
    this.updateStepSpecificData(step);
  }

  private updateStepSpecificData(step: OnboardingStep): void {
    switch (step.id) {
      case 'daily_goal':
        this.set('selectedGoal', 180); // Default 3 hours
        break;
      case 'tracking_mode':
        this.set('trackingMode', this.trackingService.isAndroid() ? 'automatic' : 'manual');
        this.set('isAndroid', this.trackingService.isAndroid());
        break;
      case 'ready':
        const userProfile = this.userDataService.getUserProfile();
        this.set('notificationsEnabled', userProfile.settings.notificationsEnabled);
        break;
    }
  }

  onNext(): void {
    const currentStep = this.steps[this.currentStepIndex];
    
    // Handle step-specific actions
    this.handleStepAction(currentStep);

    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.updateCurrentStep();
    } else {
      this.completeOnboarding();
    }
  }

  onPrevious(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.updateCurrentStep();
    }
  }

  onSkip(): void {
    const currentStep = this.steps[this.currentStepIndex];
    
    // Handle skip-specific logic
    if (currentStep.id === 'notifications') {
      // User chose to skip notifications
      this.userDataService.updateSettings({ notificationsEnabled: false });
    }

    this.onNext();
  }

  onPersonalityChoice(choiceKey: string): void {
    const [category, value] = choiceKey.split('_');
    const choices = this.get('personalityChoices');
    choices[category] = value;
    this.set('personalityChoices', choices);

    // Store choice for later personality assessment
    this.userChoices[category] = value;

    // If this is the personality step and all choices are made, generate recommendations
    if (this.currentStep.id === 'personality' &&
        choices.motivation && choices.tracking && choices.social) {
      this.generatePersonalizedRecommendations();
    }
  }

  private generatePersonalizedRecommendations(): void {
    // Map UI choices to personality assessment format
    const assessmentChoices = {
      dailyGoal: this.mapGoalFromPersonality(),
      gamificationInterest: this.mapGamificationFromPersonality(),
      socialInterest: this.userChoices.social,
      notificationFrequency: this.mapNotificationsFromPersonality()
    };

    // Generate personality profile
    this.userPersonality = this.personalizationService.assessPersonalityFromChoices(assessmentChoices);

    // Get personalized recommendations
    const recommendations = this.personalizationService.generatePersonalizedRecommendations(this.userPersonality);

    // Update steps with personalized content
    this.personalizeRemainingSteps(recommendations);

    // Store choices for later use
    Object.assign(this.userChoices, assessmentChoices);
  }

  private mapGoalFromPersonality(): number {
    const motivation = this.userChoices.motivation;
    const tracking = this.userChoices.tracking;

    if (motivation === 'competitive' || tracking === 'detailed') return 300; // 5 hours - ambitious
    if (motivation === 'minimal' || tracking === 'simple') return 120; // 2 hours - conservative
    return 180; // 3 hours - moderate
  }

  private mapGamificationFromPersonality(): string {
    const motivation = this.userChoices.motivation;
    if (motivation === 'competitive') return 'high';
    if (motivation === 'minimal') return 'low';
    return 'medium';
  }

  private mapNotificationsFromPersonality(): string {
    const motivation = this.userChoices.motivation;
    const social = this.userChoices.social;

    if (motivation === 'competitive' || social === 'high') return 'frequent';
    if (motivation === 'minimal') return 'gentle';
    return 'regular';
  }

  private personalizeRemainingSteps(recommendations: any[]): void {
    // Update daily goal step with recommendation
    const goalRec = recommendations.find(r => r.type === 'goal');
    if (goalRec) {
      const goalStep = this.steps.find(s => s.id === 'daily_goal');
      if (goalStep) {
        goalStep.description = `${goalRec.description}\n\n${goalRec.reasoning}`;
        goalStep.recommendedValue = goalRec.value;
      }
    }

    // Update gamification step based on personality
    const gamificationStep = this.steps.find(s => s.id === 'gamification');
    if (gamificationStep && this.userPersonality) {
      const personalizedSteps = this.personalizationService.getAdaptiveOnboardingSteps(this.userPersonality);
      const personalizedGamification = personalizedSteps.find(s => s.id === 'gamification');
      if (personalizedGamification) {
        gamificationStep.description = personalizedGamification.description;
      }
    }

    // Update notifications step
    const notificationStep = this.steps.find(s => s.id === 'notifications');
    if (notificationStep && this.userPersonality) {
      const personalizedSteps = this.personalizationService.getAdaptiveOnboardingSteps(this.userPersonality);
      const personalizedNotifications = personalizedSteps.find(s => s.id === 'notifications');
      if (personalizedNotifications) {
        notificationStep.description = personalizedNotifications.description;
      }
    }

    // Refresh current step display
    this.updateCurrentStep();
  }

  onGoalSelect(goalMinutes: number): void {
    this.set('selectedGoal', goalMinutes);
    this.userDataService.updateSettings({ dailyGoalMinutes: goalMinutes });
    this.userChoices.dailyGoal = goalMinutes;
  }

  private handleStepAction(step: OnboardingStep): void {
    switch (step.id) {
      case 'daily_goal':
        const selectedGoal = this.get('selectedGoal') || 180;
        this.userDataService.updateSettings({ dailyGoalMinutes: selectedGoal });
        break;
      case 'notifications':
        this.requestNotificationPermission();
        break;
    }
  }

  private async requestNotificationPermission(): Promise<void> {
    try {
      const { LocalNotifications } = require('@nativescript/local-notifications');
      const hasPermission = await LocalNotifications.hasPermission();
      
      if (!hasPermission) {
        const granted = await LocalNotifications.requestPermission();
        this.userDataService.updateSettings({ notificationsEnabled: granted });
      } else {
        this.userDataService.updateSettings({ notificationsEnabled: true });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      this.userDataService.updateSettings({ notificationsEnabled: false });
    }
  }

  private completeOnboarding(): void {
    // Save personality profile if generated
    if (this.userPersonality) {
      this.personalizationService.saveUserPersonality(this.userPersonality);
    }

    // Apply final personalized settings
    this.applyPersonalizedSettings();

    this.userDataService.completeOnboarding();

    // Navigate to main page
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate({
      moduleName: 'main-page',
      clearHistory: true,
      context: { startTutorial: true } // Signal to start the main app tutorial
    });

    // Show welcome notification
    this.showWelcomeNotification();
  }

  private applyPersonalizedSettings(): void {
    if (!this.userPersonality) return;

    const settings: any = {};

    // Apply notification preferences
    const notificationFreq = this.userChoices.notificationFrequency || 'regular';
    settings.reminderInterval = notificationFreq === 'frequent' ? 30 :
                               notificationFreq === 'gentle' ? 120 : 60;

    // Apply gamification preferences
    const gamificationLevel = this.userChoices.gamificationInterest || 'medium';
    settings.showAchievementAnimations = gamificationLevel !== 'low';
    settings.showLevelUpCelebrations = gamificationLevel === 'high';

    // Apply goal if set through personality assessment
    if (this.userChoices.dailyGoal) {
      settings.dailyGoalMinutes = this.userChoices.dailyGoal;
    }

    this.userDataService.updateSettings(settings);
  }

  private showWelcomeNotification(): void {
    try {
      const { LocalNotifications } = require('@nativescript/local-notifications');
      LocalNotifications.schedule([{
        id: Date.now(),
        title: "Welcome to Unplug! 🎉",
        body: "Your digital wellness journey starts now. Ready for your first offline session?",
        badge: 1
      }]);
    } catch (error) {
      console.error('Failed to show welcome notification:', error);
    }
  }

  // Getters for computed properties
  get currentStep(): OnboardingStep {
    return this.steps[this.currentStepIndex];
  }

  get canGoBack(): boolean {
    return this.currentStepIndex > 0;
  }

  get showSkipButton(): boolean {
    const step = this.steps[this.currentStepIndex];
    return !!step.skipText;
  }
}
