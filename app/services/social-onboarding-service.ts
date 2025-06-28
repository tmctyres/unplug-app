import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import { SocialService } from './social-service';
import { CircleService } from './circle-service';
import { LeaderboardService } from './leaderboard-service';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'info' | 'action' | 'choice' | 'setup';
  isCompleted: boolean;
  isOptional: boolean;
  actionText?: string;
  choices?: OnboardingChoice[];
  setupData?: any;
}

export interface OnboardingChoice {
  id: string;
  title: string;
  description: string;
  icon: string;
  isSelected: boolean;
}

export interface OnboardingProgress {
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number;
  isCompleted: boolean;
  skippedSteps: string[];
}

export class SocialOnboardingService extends Observable {
  private static instance: SocialOnboardingService;
  private userDataService: UserDataService;
  private socialService: SocialService;
  private circleService: CircleService;
  private leaderboardService: LeaderboardService;
  private onboardingSteps: OnboardingStep[] = [];
  private currentProgress: OnboardingProgress;

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.socialService = SocialService.getInstance();
    this.circleService = CircleService.getInstance();
    this.leaderboardService = LeaderboardService.getInstance();
    this.initializeOnboarding();
  }

  static getInstance(): SocialOnboardingService {
    if (!SocialOnboardingService.instance) {
      SocialOnboardingService.instance = new SocialOnboardingService();
    }
    return SocialOnboardingService.instance;
  }

  private async initializeOnboarding(): Promise<void> {
    try {
      // Create onboarding steps
      this.createOnboardingSteps();
      
      // Load or create progress
      this.loadOnboardingProgress();
      
    } catch (error) {
      console.error('Failed to initialize social onboarding:', error);
    }
  }

  private createOnboardingSteps(): void {
    this.onboardingSteps = [
      {
        id: 'welcome',
        title: 'Welcome to the Community! 🌟',
        description: 'Connect with others on their digital wellness journey. Share achievements, get support, and discover new strategies together.',
        icon: '👋',
        type: 'info',
        isCompleted: false,
        isOptional: false,
        actionText: 'Get Started'
      },
      {
        id: 'profile_setup',
        title: 'Create Your Profile',
        description: 'Set up your social profile to connect with the community. Choose how you want to appear to others.',
        icon: '👤',
        type: 'setup',
        isCompleted: false,
        isOptional: false,
        actionText: 'Set Up Profile',
        setupData: {
          displayName: '',
          bio: '',
          isPublic: true,
          showInLeaderboards: true,
          autoShareAchievements: true
        }
      },
      {
        id: 'privacy_settings',
        title: 'Privacy & Sharing',
        description: 'Choose what you want to share and how visible you want to be in the community.',
        icon: '🔒',
        type: 'choice',
        isCompleted: false,
        isOptional: false,
        choices: [
          {
            id: 'public_profile',
            title: 'Public Profile',
            description: 'Others can find and connect with you',
            icon: '🌐',
            isSelected: true
          },
          {
            id: 'show_leaderboards',
            title: 'Join Leaderboards',
            description: 'Appear in anonymous leaderboards',
            icon: '🏆',
            isSelected: true
          },
          {
            id: 'auto_share_achievements',
            title: 'Auto-Share Achievements',
            description: 'Automatically share when you unlock achievements',
            icon: '🎉',
            isSelected: true
          },
          {
            id: 'share_progress',
            title: 'Share Progress Updates',
            description: 'Share session completions and milestones',
            icon: '📊',
            isSelected: false
          }
        ]
      },
      {
        id: 'discover_features',
        title: 'Discover Social Features',
        description: 'Learn about the different ways to connect and engage with the community.',
        icon: '🔍',
        type: 'info',
        isCompleted: false,
        isOptional: false,
        actionText: 'Explore Features'
      },
      {
        id: 'join_challenges',
        title: 'Join Community Challenges',
        description: 'Participate in weekly and monthly challenges to stay motivated and compete with others.',
        icon: '🎯',
        type: 'action',
        isCompleted: false,
        isOptional: true,
        actionText: 'Browse Challenges'
      },
      {
        id: 'create_circle',
        title: 'Create or Join Circles',
        description: 'Connect with friends, family, or like-minded individuals in private accountability groups.',
        icon: '👥',
        type: 'choice',
        isCompleted: false,
        isOptional: true,
        choices: [
          {
            id: 'create_family_circle',
            title: 'Family Circle',
            description: 'Create a circle for your family members',
            icon: '👨‍👩‍👧‍👦',
            isSelected: false
          },
          {
            id: 'create_friends_circle',
            title: 'Friends Circle',
            description: 'Create a circle for your friends',
            icon: '👥',
            isSelected: false
          },
          {
            id: 'create_study_circle',
            title: 'Study Group',
            description: 'Create a circle for study accountability',
            icon: '📚',
            isSelected: false
          },
          {
            id: 'skip_circles',
            title: 'Skip for Now',
            description: 'You can create circles later',
            icon: '⏭️',
            isSelected: false
          }
        ]
      },
      {
        id: 'community_guidelines',
        title: 'Community Guidelines',
        description: 'Learn about our community values and guidelines to ensure a positive experience for everyone.',
        icon: '📋',
        type: 'info',
        isCompleted: false,
        isOptional: false,
        actionText: 'Read Guidelines'
      },
      {
        id: 'first_post',
        title: 'Share Your First Post',
        description: 'Introduce yourself to the community or share a tip that has helped you in your digital wellness journey.',
        icon: '✍️',
        type: 'action',
        isCompleted: false,
        isOptional: true,
        actionText: 'Create Post'
      },
      {
        id: 'completion',
        title: 'Welcome to the Community! 🎉',
        description: 'You\'re all set! Start exploring, connecting, and sharing your digital wellness journey with others.',
        icon: '🎊',
        type: 'info',
        isCompleted: false,
        isOptional: false,
        actionText: 'Start Exploring'
      }
    ];
  }

  private loadOnboardingProgress(): void {
    const userProfile = this.userDataService.getUserProfile();
    
    if (userProfile.socialOnboardingProgress) {
      this.currentProgress = userProfile.socialOnboardingProgress;
      
      // Update step completion status
      this.onboardingSteps.forEach((step, index) => {
        step.isCompleted = index < this.currentProgress.currentStepIndex;
      });
    } else {
      this.currentProgress = {
        currentStepIndex: 0,
        totalSteps: this.onboardingSteps.length,
        completedSteps: 0,
        isCompleted: false,
        skippedSteps: []
      };
    }
  }

  // Public methods
  async startOnboarding(): Promise<void> {
    this.currentProgress.currentStepIndex = 0;
    this.currentProgress.completedSteps = 0;
    this.currentProgress.isCompleted = false;
    this.currentProgress.skippedSteps = [];
    
    this.saveProgress();
    this.notifyPropertyChange('onboardingStarted', { progress: this.currentProgress });
  }

  async completeCurrentStep(stepData?: any): Promise<void> {
    const currentStep = this.getCurrentStep();
    if (!currentStep) return;

    // Handle step-specific completion logic
    await this.handleStepCompletion(currentStep, stepData);

    // Mark step as completed
    currentStep.isCompleted = true;
    this.currentProgress.completedSteps++;

    // Move to next step
    if (this.currentProgress.currentStepIndex < this.onboardingSteps.length - 1) {
      this.currentProgress.currentStepIndex++;
    } else {
      this.currentProgress.isCompleted = true;
    }

    this.saveProgress();
    this.notifyPropertyChange('stepCompleted', { 
      step: currentStep, 
      progress: this.currentProgress 
    });
  }

  async skipCurrentStep(): Promise<void> {
    const currentStep = this.getCurrentStep();
    if (!currentStep || !currentStep.isOptional) return;

    this.currentProgress.skippedSteps.push(currentStep.id);

    // Move to next step
    if (this.currentProgress.currentStepIndex < this.onboardingSteps.length - 1) {
      this.currentProgress.currentStepIndex++;
    } else {
      this.currentProgress.isCompleted = true;
    }

    this.saveProgress();
    this.notifyPropertyChange('stepSkipped', { 
      step: currentStep, 
      progress: this.currentProgress 
    });
  }

  async goToPreviousStep(): Promise<void> {
    if (this.currentProgress.currentStepIndex > 0) {
      this.currentProgress.currentStepIndex--;
      
      // Mark current step as not completed
      const currentStep = this.getCurrentStep();
      if (currentStep) {
        currentStep.isCompleted = false;
        this.currentProgress.completedSteps = Math.max(0, this.currentProgress.completedSteps - 1);
      }

      this.saveProgress();
      this.notifyPropertyChange('stepChanged', { progress: this.currentProgress });
    }
  }

  async goToStep(stepIndex: number): Promise<void> {
    if (stepIndex >= 0 && stepIndex < this.onboardingSteps.length) {
      this.currentProgress.currentStepIndex = stepIndex;
      this.saveProgress();
      this.notifyPropertyChange('stepChanged', { progress: this.currentProgress });
    }
  }

  private async handleStepCompletion(step: OnboardingStep, stepData?: any): Promise<void> {
    switch (step.id) {
      case 'profile_setup':
        await this.handleProfileSetup(stepData);
        break;
      case 'privacy_settings':
        await this.handlePrivacySettings(step.choices);
        break;
      case 'join_challenges':
        await this.handleJoinChallenges();
        break;
      case 'create_circle':
        await this.handleCreateCircle(step.choices);
        break;
      case 'first_post':
        await this.handleFirstPost(stepData);
        break;
      case 'completion':
        await this.handleOnboardingCompletion();
        break;
    }
  }

  private async handleProfileSetup(profileData: any): Promise<void> {
    if (!profileData) return;

    const socialProfile = this.socialService.getSocialProfile();
    if (socialProfile) {
      // Update social profile
      socialProfile.displayName = profileData.displayName || socialProfile.displayName;
      socialProfile.bio = profileData.bio;
      socialProfile.isPublic = profileData.isPublic !== false;
    }

    // Update social settings
    await this.socialService.updateSocialSettings({
      profileVisibility: profileData.isPublic ? 'public' : 'private',
      showInLeaderboards: profileData.showInLeaderboards !== false,
      autoShareAchievements: profileData.autoShareAchievements !== false
    });
  }

  private async handlePrivacySettings(choices: OnboardingChoice[]): Promise<void> {
    if (!choices) return;

    const settings: any = {};
    
    choices.forEach(choice => {
      switch (choice.id) {
        case 'public_profile':
          settings.profileVisibility = choice.isSelected ? 'public' : 'private';
          break;
        case 'show_leaderboards':
          settings.showInLeaderboards = choice.isSelected;
          break;
        case 'auto_share_achievements':
          settings.autoShareAchievements = choice.isSelected;
          break;
        case 'share_progress':
          settings.shareSessionCompletions = choice.isSelected;
          break;
      }
    });

    await this.socialService.updateSocialSettings(settings);
    
    // Update leaderboard participation
    if (settings.showInLeaderboards !== undefined) {
      await this.leaderboardService.toggleLeaderboardParticipation(settings.showInLeaderboards);
    }
  }

  private async handleJoinChallenges(): Promise<void> {
    // This would typically navigate to challenges page
    // For now, we'll just mark as completed
  }

  private async handleCreateCircle(choices: OnboardingChoice[]): Promise<void> {
    if (!choices) return;

    const selectedChoice = choices.find(choice => choice.isSelected);
    if (!selectedChoice || selectedChoice.id === 'skip_circles') return;

    let circleData: any = {};

    switch (selectedChoice.id) {
      case 'create_family_circle':
        circleData = {
          name: 'My Family Circle',
          description: 'Digital wellness accountability for the whole family',
          type: 'family',
          emoji: '👨‍👩‍👧‍👦',
          color: '#10B981'
        };
        break;
      case 'create_friends_circle':
        circleData = {
          name: 'Friends Support Circle',
          description: 'Supporting each other in our digital wellness goals',
          type: 'friends',
          emoji: '👥',
          color: '#3B82F6'
        };
        break;
      case 'create_study_circle':
        circleData = {
          name: 'Study Focus Group',
          description: 'Staying focused during study sessions together',
          type: 'study_group',
          emoji: '📚',
          color: '#8B5CF6'
        };
        break;
    }

    if (Object.keys(circleData).length > 0) {
      await this.circleService.createCircle(circleData);
    }
  }

  private async handleFirstPost(postData: any): Promise<void> {
    // This would typically create a post through the community feed service
    // For now, we'll just mark as completed
  }

  private async handleOnboardingCompletion(): Promise<void> {
    // Mark onboarding as fully completed
    const userProfile = this.userDataService.getUserProfile();
    userProfile.hasCompletedSocialOnboarding = true;
    this.userDataService.saveUserData();

    // Award onboarding completion achievement
    // This would typically be handled by the achievement system
  }

  private saveProgress(): void {
    const userProfile = this.userDataService.getUserProfile();
    userProfile.socialOnboardingProgress = this.currentProgress;
    this.userDataService.saveUserData();
  }

  // Public getters
  getCurrentStep(): OnboardingStep | null {
    return this.onboardingSteps[this.currentProgress.currentStepIndex] || null;
  }

  getProgress(): OnboardingProgress {
    return { ...this.currentProgress };
  }

  getAllSteps(): OnboardingStep[] {
    return [...this.onboardingSteps];
  }

  isOnboardingCompleted(): boolean {
    return this.currentProgress.isCompleted;
  }

  hasStartedOnboarding(): boolean {
    return this.currentProgress.currentStepIndex > 0 || this.currentProgress.completedSteps > 0;
  }

  shouldShowOnboarding(): boolean {
    const userProfile = this.userDataService.getUserProfile();
    return !userProfile.hasCompletedSocialOnboarding && !this.isOnboardingCompleted();
  }

  getProgressPercentage(): number {
    return Math.round((this.currentProgress.completedSteps / this.currentProgress.totalSteps) * 100);
  }

  getStepByIndex(index: number): OnboardingStep | null {
    return this.onboardingSteps[index] || null;
  }

  updateStepChoice(stepId: string, choiceId: string, isSelected: boolean): void {
    const step = this.onboardingSteps.find(s => s.id === stepId);
    if (step && step.choices) {
      const choice = step.choices.find(c => c.id === choiceId);
      if (choice) {
        choice.isSelected = isSelected;
        this.notifyPropertyChange('choiceUpdated', { stepId, choiceId, isSelected });
      }
    }
  }

  updateStepSetupData(stepId: string, setupData: any): void {
    const step = this.onboardingSteps.find(s => s.id === stepId);
    if (step) {
      step.setupData = { ...step.setupData, ...setupData };
      this.notifyPropertyChange('setupDataUpdated', { stepId, setupData: step.setupData });
    }
  }
}
