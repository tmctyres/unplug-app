import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';

export interface UserPersonality {
  type: 'achiever' | 'explorer' | 'socializer' | 'minimalist';
  traits: string[];
  preferences: PersonalizationPreferences;
}

export interface PersonalizationPreferences {
  motivationStyle: 'competitive' | 'collaborative' | 'personal' | 'zen';
  goalAmbition: 'conservative' | 'moderate' | 'ambitious' | 'extreme';
  socialEngagement: 'private' | 'selective' | 'active' | 'leader';
  gamificationLevel: 'minimal' | 'moderate' | 'high' | 'maximum';
  reminderFrequency: 'none' | 'gentle' | 'regular' | 'frequent';
  contentStyle: 'simple' | 'detailed' | 'visual' | 'data-driven';
}

export interface PersonalizedRecommendation {
  type: 'goal' | 'feature' | 'content' | 'reminder';
  title: string;
  description: string;
  value: any;
  reasoning: string;
  confidence: number; // 0-1
}

export class PersonalizationService extends Observable {
  private static instance: PersonalizationService;
  private userDataService: UserDataService;

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
  }

  static getInstance(): PersonalizationService {
    if (!PersonalizationService.instance) {
      PersonalizationService.instance = new PersonalizationService();
    }
    return PersonalizationService.instance;
  }

  // Personality Assessment
  assessPersonalityFromChoices(choices: { [key: string]: any }): UserPersonality {
    let achieverScore = 0;
    let explorerScore = 0;
    let socializerScore = 0;
    let minimalistScore = 0;

    // Analyze goal ambition
    const goalMinutes = choices.dailyGoal || 180;
    if (goalMinutes >= 360) achieverScore += 2;
    else if (goalMinutes >= 240) achieverScore += 1;
    else if (goalMinutes <= 60) minimalistScore += 2;
    else minimalistScore += 1;

    // Analyze gamification preferences
    if (choices.gamificationInterest === 'high') {
      achieverScore += 2;
      explorerScore += 1;
    } else if (choices.gamificationInterest === 'low') {
      minimalistScore += 2;
    }

    // Analyze social preferences
    if (choices.socialInterest === 'high') {
      socializerScore += 2;
      achieverScore += 1;
    } else if (choices.socialInterest === 'low') {
      minimalistScore += 1;
    }

    // Analyze notification preferences
    if (choices.notificationFrequency === 'frequent') {
      achieverScore += 1;
    } else if (choices.notificationFrequency === 'none') {
      minimalistScore += 1;
    }

    // Determine dominant personality type
    const scores = { achieverScore, explorerScore, socializerScore, minimalistScore };
    const maxScore = Math.max(...Object.values(scores));
    
    let personalityType: UserPersonality['type'];
    if (scores.achieverScore === maxScore) personalityType = 'achiever';
    else if (scores.socializerScore === maxScore) personalityType = 'socializer';
    else if (scores.explorerScore === maxScore) personalityType = 'explorer';
    else personalityType = 'minimalist';

    return this.createPersonalityProfile(personalityType, choices);
  }

  private createPersonalityProfile(type: UserPersonality['type'], choices: any): UserPersonality {
    const profiles = {
      achiever: {
        traits: ['goal-oriented', 'competitive', 'progress-focused', 'data-driven'],
        preferences: {
          motivationStyle: 'competitive' as const,
          goalAmbition: 'ambitious' as const,
          socialEngagement: 'active' as const,
          gamificationLevel: 'high' as const,
          reminderFrequency: 'regular' as const,
          contentStyle: 'data-driven' as const
        }
      },
      socializer: {
        traits: ['community-focused', 'collaborative', 'supportive', 'sharing'],
        preferences: {
          motivationStyle: 'collaborative' as const,
          goalAmbition: 'moderate' as const,
          socialEngagement: 'leader' as const,
          gamificationLevel: 'moderate' as const,
          reminderFrequency: 'gentle' as const,
          contentStyle: 'visual' as const
        }
      },
      explorer: {
        traits: ['curious', 'experimental', 'feature-loving', 'adaptive'],
        preferences: {
          motivationStyle: 'personal' as const,
          goalAmbition: 'moderate' as const,
          socialEngagement: 'selective' as const,
          gamificationLevel: 'maximum' as const,
          reminderFrequency: 'regular' as const,
          contentStyle: 'detailed' as const
        }
      },
      minimalist: {
        traits: ['simplicity-focused', 'distraction-free', 'intentional', 'zen'],
        preferences: {
          motivationStyle: 'zen' as const,
          goalAmbition: 'conservative' as const,
          socialEngagement: 'private' as const,
          gamificationLevel: 'minimal' as const,
          reminderFrequency: 'gentle' as const,
          contentStyle: 'simple' as const
        }
      }
    };

    return {
      type,
      traits: profiles[type].traits,
      preferences: profiles[type].preferences
    };
  }

  // Personalized Recommendations
  generatePersonalizedRecommendations(personality: UserPersonality): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Goal recommendations
    recommendations.push(this.getGoalRecommendation(personality));

    // Feature recommendations
    recommendations.push(...this.getFeatureRecommendations(personality));

    // Content recommendations
    recommendations.push(this.getContentRecommendation(personality));

    // Reminder recommendations
    recommendations.push(this.getReminderRecommendation(personality));

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  private getGoalRecommendation(personality: UserPersonality): PersonalizedRecommendation {
    const goalMap = {
      conservative: { minutes: 60, reasoning: 'Start small and build consistency' },
      moderate: { minutes: 180, reasoning: 'Balanced approach for steady progress' },
      ambitious: { minutes: 300, reasoning: 'Challenge yourself for maximum impact' },
      extreme: { minutes: 480, reasoning: 'Push your limits for transformation' }
    };

    const goal = goalMap[personality.preferences.goalAmbition];
    
    return {
      type: 'goal',
      title: `${goal.minutes / 60}h Daily Goal`,
      description: `Based on your ${personality.type} personality, we recommend ${goal.minutes} minutes daily.`,
      value: goal.minutes,
      reasoning: goal.reasoning,
      confidence: 0.8
    };
  }

  private getFeatureRecommendations(personality: UserPersonality): PersonalizedRecommendation[] {
    const featureMap = {
      achiever: [
        { feature: 'achievements', reason: 'Track your progress with detailed achievements' },
        { feature: 'leaderboards', reason: 'Compete with others to stay motivated' },
        { feature: 'analytics', reason: 'Analyze your data for optimization' }
      ],
      socializer: [
        { feature: 'circles', reason: 'Connect with like-minded people' },
        { feature: 'challenges', reason: 'Participate in group activities' },
        { feature: 'social_sharing', reason: 'Share your achievements' }
      ],
      explorer: [
        { feature: 'session_goals', reason: 'Experiment with different session types' },
        { feature: 'analytics', reason: 'Discover patterns in your behavior' },
        { feature: 'achievements', reason: 'Unlock all available features' }
      ],
      minimalist: [
        { feature: 'basic_tracking', reason: 'Simple, distraction-free tracking' },
        { feature: 'session_notes', reason: 'Reflect mindfully on your time' },
        { feature: 'zen_mode', reason: 'Minimal interface for focus' }
      ]
    };

    return featureMap[personality.type].map(item => ({
      type: 'feature' as const,
      title: item.feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: item.reason,
      value: item.feature,
      reasoning: `Perfect for ${personality.type} personalities`,
      confidence: 0.7
    }));
  }

  private getContentRecommendation(personality: UserPersonality): PersonalizedRecommendation {
    const contentMap = {
      simple: { style: 'Clean, minimal interface with essential information only' },
      detailed: { style: 'Comprehensive data with explanations and context' },
      visual: { style: 'Rich graphics, charts, and visual progress indicators' },
      'data-driven': { style: 'Numbers, statistics, and analytical insights' }
    };

    const content = contentMap[personality.preferences.contentStyle];
    
    return {
      type: 'content',
      title: `${personality.preferences.contentStyle} Interface`,
      description: content.style,
      value: personality.preferences.contentStyle,
      reasoning: `Matches your ${personality.type} preferences`,
      confidence: 0.6
    };
  }

  private getReminderRecommendation(personality: UserPersonality): PersonalizedRecommendation {
    const reminderMap = {
      none: { frequency: 0, description: 'No automatic reminders' },
      gentle: { frequency: 1, description: 'Subtle daily check-ins' },
      regular: { frequency: 2, description: 'Helpful progress updates' },
      frequent: { frequency: 3, description: 'Active motivation and tips' }
    };

    const reminder = reminderMap[personality.preferences.reminderFrequency];
    
    return {
      type: 'reminder',
      title: `${personality.preferences.reminderFrequency} Reminders`,
      description: reminder.description,
      value: reminder.frequency,
      reasoning: `Aligns with your ${personality.type} motivation style`,
      confidence: 0.5
    };
  }

  // Adaptive Content
  getAdaptiveOnboardingSteps(personality: UserPersonality): any[] {
    const baseSteps = this.getBaseOnboardingSteps();
    
    // Customize steps based on personality
    return baseSteps.map(step => {
      switch (step.id) {
        case 'welcome':
          return this.customizeWelcomeStep(step, personality);
        case 'daily_goal':
          return this.customizeGoalStep(step, personality);
        case 'gamification':
          return this.customizeGamificationStep(step, personality);
        case 'notifications':
          return this.customizeNotificationStep(step, personality);
        default:
          return step;
      }
    });
  }

  private getBaseOnboardingSteps(): any[] {
    return [
      { id: 'welcome', title: 'Welcome to Unplug! 🌟', description: '', icon: '🚀' },
      { id: 'personality', title: 'Tell Us About You', description: '', icon: '🧠' },
      { id: 'tracking_mode', title: 'Choose Your Tracking Mode', description: '', icon: '📱' },
      { id: 'daily_goal', title: 'Set Your Daily Goal', description: '', icon: '🎯' },
      { id: 'gamification', title: 'Gamification Preferences', description: '', icon: '🏆' },
      { id: 'notifications', title: 'Notification Settings', description: '', icon: '🔔' },
      { id: 'ready', title: 'You\'re All Set!', description: '', icon: '✨' }
    ];
  }

  private customizeWelcomeStep(step: any, personality: UserPersonality): any {
    const messages = {
      achiever: 'Ready to dominate your digital wellness goals? Let\'s build the ultimate offline routine!',
      socializer: 'Join a community of people transforming their relationship with technology together!',
      explorer: 'Discover powerful features and insights to optimize your digital wellness journey!',
      minimalist: 'Find peace and simplicity in your digital life with mindful offline time.'
    };

    return {
      ...step,
      description: messages[personality.type]
    };
  }

  private customizeGoalStep(step: any, personality: UserPersonality): any {
    const recommendations = this.generatePersonalizedRecommendations(personality);
    const goalRec = recommendations.find(r => r.type === 'goal');

    return {
      ...step,
      description: `${goalRec?.description} ${goalRec?.reasoning}`,
      recommendedValue: goalRec?.value
    };
  }

  private customizeGamificationStep(step: any, personality: UserPersonality): any {
    const descriptions = {
      achiever: 'Compete, achieve, and dominate! Unlock achievements, climb leaderboards, and track every metric.',
      socializer: 'Share achievements, join challenges, and celebrate progress with your community!',
      explorer: 'Discover all features! Unlock achievements, try different session types, and explore analytics.',
      minimalist: 'Keep it simple. Focus on your progress without distractions. Minimal gamification available.'
    };

    return {
      ...step,
      description: descriptions[personality.type]
    };
  }

  private customizeNotificationStep(step: any, personality: UserPersonality): any {
    const descriptions = {
      achiever: 'Stay on track with regular progress updates and achievement notifications.',
      socializer: 'Get notified about community activities, friend achievements, and group challenges.',
      explorer: 'Receive tips, feature discoveries, and insights about your offline patterns.',
      minimalist: 'Gentle, mindful reminders that respect your need for simplicity and peace.'
    };

    return {
      ...step,
      description: descriptions[personality.type]
    };
  }

  // Save and retrieve personality
  saveUserPersonality(personality: UserPersonality): void {
    const userProfile = this.userDataService.getUserProfile();
    userProfile.settings.personalityProfile = personality;
    this.userDataService.saveUserData();
  }

  getUserPersonality(): UserPersonality | null {
    const userProfile = this.userDataService.getUserProfile();
    return (userProfile.settings as any).personalityProfile || null;
  }
}
