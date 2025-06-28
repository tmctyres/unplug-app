import { Observable } from '@nativescript/core';
import { SocialOnboardingService, OnboardingStep, OnboardingProgress, OnboardingChoice } from '../services/social-onboarding-service';
import { UserDataService } from '../models/user-data';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';
import { SecurityUtils } from '../utils/security-utils';

export class SocialOnboardingViewModel extends Observable {
  private socialOnboardingService: SocialOnboardingService;
  private userDataService: UserDataService;
  private currentStep: OnboardingStep | null = null;
  private progress: OnboardingProgress;

  constructor() {
    super();
    this.socialOnboardingService = SocialOnboardingService.getInstance();
    this.userDataService = UserDataService.getInstance();
    this.initializeOnboarding();
    this.setupEventListeners();
  }

  private async initializeOnboarding(): Promise<void> {
    try {
      this.set('isLoading', true);
      
      // Load current progress and step
      this.loadCurrentState();
      
      // Check if onboarding should be shown
      if (!this.socialOnboardingService.shouldShowOnboarding()) {
        this.completeOnboarding();
        return;
      }
      
    } catch (error) {
      console.error('Failed to initialize onboarding:', error);
      this.set('hasError', true);
      this.set('errorMessage', 'Failed to load onboarding');
    } finally {
      this.set('isLoading', false);
    }
  }

  private setupEventListeners(): void {
    this.socialOnboardingService.on('propertyChange', (args) => {
      if (!isPropertyChangeEvent(args)) return;

      switch (args.propertyName) {
        case 'stepCompleted':
        case 'stepSkipped':
        case 'stepChanged':
          this.loadCurrentState();
          break;
        case 'choiceUpdated':
          this.updateChoiceDisplay();
          break;
        case 'setupDataUpdated':
          this.updateSetupDataDisplay();
          break;
      }
    });
  }

  private loadCurrentState(): void {
    this.progress = this.socialOnboardingService.getProgress();
    this.currentStep = this.socialOnboardingService.getCurrentStep();
    
    this.set('progress', this.progress);
    this.set('currentStep', this.currentStep);
    this.set('progressPercentage', this.socialOnboardingService.getProgressPercentage());
    this.set('isLastStep', this.progress.currentStepIndex === this.progress.totalSteps - 1);
    this.set('isFirstStep', this.progress.currentStepIndex === 0);
    
    if (this.currentStep) {
      this.loadStepData();
    }
  }

  private loadStepData(): void {
    if (!this.currentStep) return;

    // Set step-specific data
    this.set('stepTitle', this.currentStep.title);
    this.set('stepDescription', this.currentStep.description);
    this.set('stepIcon', this.currentStep.icon);
    this.set('stepType', this.currentStep.type);
    this.set('actionText', this.currentStep.actionText || 'Continue');
    this.set('canSkip', this.currentStep.isOptional);
    
    // Load choices if available
    if (this.currentStep.choices) {
      this.set('stepChoices', this.currentStep.choices);
      this.set('hasChoices', true);
    } else {
      this.set('hasChoices', false);
    }
    
    // Load setup data if available
    if (this.currentStep.setupData) {
      this.set('setupData', this.currentStep.setupData);
      this.set('hasSetupData', true);
    } else {
      this.set('hasSetupData', false);
    }
    
    // Set step-specific UI properties
    this.updateStepUI();
  }

  private updateStepUI(): void {
    if (!this.currentStep) return;

    switch (this.currentStep.id) {
      case 'welcome':
        this.set('showWelcomeAnimation', true);
        break;
      case 'profile_setup':
        this.loadProfileSetupData();
        break;
      case 'privacy_settings':
        this.loadPrivacyChoices();
        break;
      case 'discover_features':
        this.loadFeaturesList();
        break;
      case 'create_circle':
        this.loadCircleOptions();
        break;
      case 'community_guidelines':
        this.loadGuidelines();
        break;
      case 'completion':
        this.set('showCompletionAnimation', true);
        break;
    }
  }

  private loadProfileSetupData(): void {
    const userProfile = this.userDataService.getUserProfile();
    const setupData = this.currentStep?.setupData || {};
    
    this.set('profileSetup', {
      displayName: setupData.displayName || userProfile.userTitle || '',
      bio: setupData.bio || '',
      isPublic: setupData.isPublic !== false,
      showInLeaderboards: setupData.showInLeaderboards !== false,
      autoShareAchievements: setupData.autoShareAchievements !== false
    });
  }

  private loadPrivacyChoices(): void {
    // Choices are already loaded in loadStepData
    this.set('privacyExplanation', 'Your privacy is important. You can change these settings anytime in your profile.');
  }

  private loadFeaturesList(): void {
    const features = [
      {
        icon: '🏆',
        title: 'Leaderboards',
        description: 'Compete anonymously with others and climb the rankings'
      },
      {
        icon: '👥',
        title: 'Circles',
        description: 'Create private groups with friends and family for accountability'
      },
      {
        icon: '🎯',
        title: 'Challenges',
        description: 'Join community challenges and earn special rewards'
      },

      {
        icon: '🎉',
        title: 'Achievement Sharing',
        description: 'Create beautiful graphics to share your accomplishments'
      }
    ];
    
    this.set('socialFeatures', features);
  }

  private loadCircleOptions(): void {
    // Choices are already loaded in loadStepData
    this.set('circleExplanation', 'Circles are private groups where you can share progress and support each other.');
  }

  private loadGuidelines(): void {
    const guidelines = [
      {
        icon: '🤝',
        title: 'Be Respectful',
        description: 'Treat everyone with kindness and respect'
      },
      {
        icon: '💪',
        title: 'Be Supportive',
        description: 'Encourage others in their digital wellness journey'
      },
      {
        icon: '🎯',
        title: 'Stay On Topic',
        description: 'Keep discussions focused on digital wellness'
      },
      {
        icon: '🚫',
        title: 'No Spam',
        description: 'Avoid repetitive or promotional content'
      },
      {
        icon: '🔒',
        title: 'Respect Privacy',
        description: 'Don\'t share personal information without permission'
      }
    ];
    
    this.set('communityGuidelines', guidelines);
  }

  // Public methods for UI interaction
  async onContinue(): Promise<void> {
    try {
      this.set('isProcessing', true);
      
      let stepData: any = null;
      
      // Collect step-specific data
      if (this.currentStep?.type === 'setup') {
        stepData = this.collectSetupData();
      } else if (this.currentStep?.type === 'choice') {
        stepData = this.collectChoiceData();
      }
      
      await this.socialOnboardingService.completeCurrentStep(stepData);
      
      // Check if onboarding is completed
      if (this.socialOnboardingService.isOnboardingCompleted()) {
        this.completeOnboarding();
      }
      
    } catch (error) {
      console.error('Failed to continue onboarding:', error);
      this.showError('Failed to continue. Please try again.');
    } finally {
      this.set('isProcessing', false);
    }
  }

  async onSkip(): Promise<void> {
    try {
      this.set('isProcessing', true);
      await this.socialOnboardingService.skipCurrentStep();
      
      if (this.socialOnboardingService.isOnboardingCompleted()) {
        this.completeOnboarding();
      }
      
    } catch (error) {
      console.error('Failed to skip step:', error);
      this.showError('Failed to skip step. Please try again.');
    } finally {
      this.set('isProcessing', false);
    }
  }

  async onBack(): Promise<void> {
    try {
      await this.socialOnboardingService.goToPreviousStep();
    } catch (error) {
      console.error('Failed to go back:', error);
    }
  }

  onChoiceToggle(choiceId: string): void {
    if (!this.currentStep?.choices) return;
    
    const choice = this.currentStep.choices.find(c => c.id === choiceId);
    if (choice) {
      // For single-select choices (like circle creation), unselect others
      if (this.currentStep.id === 'create_circle') {
        this.currentStep.choices.forEach(c => c.isSelected = false);
      }
      
      choice.isSelected = !choice.isSelected;
      this.socialOnboardingService.updateStepChoice(this.currentStep.id, choiceId, choice.isSelected);
    }
  }

  onSetupDataChange(field: string, value: any): void {
    if (!this.currentStep?.setupData) return;

    // Input validation and sanitization
    let sanitizedValue = value;

    // Validate field name
    if (!field || typeof field !== 'string') {
      console.warn('Invalid field name provided');
      return;
    }

    // Sanitize based on field type
    if (typeof value === 'string') {
      // Sanitize string inputs
      sanitizedValue = SecurityUtils.sanitizeInput(value, 500);

      // Specific validation for common fields
      if (field === 'displayName' || field === 'username') {
        if (sanitizedValue.length < 2) {
          this.showError('Name must be at least 2 characters long');
          return;
        }
        if (sanitizedValue.length > 50) {
          this.showError('Name must be less than 50 characters');
          return;
        }
      }

      if (field === 'email') {
        if (!SecurityUtils.isValidEmail(sanitizedValue)) {
          this.showError('Please enter a valid email address');
          return;
        }
      }

      if (field === 'bio' || field === 'description') {
        if (sanitizedValue.length > 500) {
          this.showError('Description must be less than 500 characters');
          return;
        }
      }
    }

    // Rate limiting for setup data changes
    if (!SecurityUtils.rateLimiter.isAllowed('setup_data_change', 20, 60000)) {
      this.showError('Too many changes. Please wait a moment.');
      return;
    }

    const setupData = { [field]: sanitizedValue };
    this.socialOnboardingService.updateStepSetupData(this.currentStep.id, setupData);
  }

  onExitOnboarding(): void {
    const { Dialogs } = require('@nativescript/core');
    
    Dialogs.confirm({
      title: 'Exit Onboarding',
      message: 'Are you sure you want to exit? You can complete this later from your profile.',
      okButtonText: 'Exit',
      cancelButtonText: 'Continue'
    }).then((result) => {
      if (result) {
        this.completeOnboarding();
      }
    });
  }

  // Helper methods
  private collectSetupData(): any {
    if (this.currentStep?.id === 'profile_setup') {
      return this.get('profileSetup');
    }
    return null;
  }

  private collectChoiceData(): any {
    return this.currentStep?.choices || null;
  }

  private updateChoiceDisplay(): void {
    if (this.currentStep?.choices) {
      this.set('stepChoices', [...this.currentStep.choices]);
    }
  }

  private updateSetupDataDisplay(): void {
    if (this.currentStep?.setupData) {
      this.set('setupData', { ...this.currentStep.setupData });
    }
  }

  private completeOnboarding(): void {
    this.notifyPropertyChange('onboardingCompleted', {});
    
    // Navigate back to main app
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  private showError(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'error', message });
  }

  private showSuccess(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'success', message });
  }

  // Getters for computed properties
  get progressText(): string {
    return `Step ${this.progress.currentStepIndex + 1} of ${this.progress.totalSteps}`;
  }

  get canContinue(): boolean {
    if (!this.currentStep) return false;
    
    switch (this.currentStep.type) {
      case 'choice':
        // For circle creation, allow continuing even if no choice is made (skip option)
        if (this.currentStep.id === 'create_circle') return true;
        // For other choices, require at least one selection
        return this.currentStep.choices?.some(c => c.isSelected) || false;
      
      case 'setup':
        // For profile setup, require display name
        if (this.currentStep.id === 'profile_setup') {
          const profileSetup = this.get('profileSetup');
          return profileSetup?.displayName?.trim().length > 0;
        }
        return true;
      
      default:
        return true;
    }
  }

  get stepProgress(): number {
    return Math.round(((this.progress.currentStepIndex + 1) / this.progress.totalSteps) * 100);
  }

  get selectedChoicesText(): string {
    if (!this.currentStep?.choices) return '';

    const selected = this.currentStep.choices.filter(c => c.isSelected);
    if (selected.length === 0) return 'None selected';
    if (selected.length === 1) return selected[0].title;
    return `${selected.length} selected`;
  }


}
