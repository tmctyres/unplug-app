import { EventData } from '@nativescript/core';

/**
 * Custom event interfaces for type-safe event handling
 * These extend the base EventData interface with specific property types
 */

/**
 * Property change event with typed property name and value
 */
export interface PropertyChangeEventData extends EventData {
  propertyName: string;
  value: any;
}

/**
 * User data related events
 */
export interface UserDataEventData extends EventData {
  propertyName: 'userProfile' | 'achievementUnlocked' | 'levelUp' | 'personalBestAchieved';
  value: any;
}

/**
 * Session related events
 */
export interface SessionEventData extends EventData {
  propertyName: 'sessionCompleted' | 'sessionStarted' | 'sessionCancelled';
  value: any;
}

/**
 * Social related events
 */
export interface SocialEventData extends EventData {
  propertyName: 'friendshipUpdated' | 'friendRequestReceived' | 'friendRequestAccepted' | 
                'circleCreated' | 'circleJoined' | 'circleLeft' | 'inviteResponded';
  value: any;
}

/**
 * Challenge related events
 */
export interface ChallengeEventData extends EventData {
  propertyName: 'challengeJoined' | 'challengeCompleted' | 'challengeLeft';
  value: any;
}

/**
 * Leaderboard related events
 */
export interface LeaderboardEventData extends EventData {
  propertyName: 'leaderboardUpdated' | 'userLeaderboardsUpdated' | 'leaderboardParticipationChanged';
  value: any;
}

/**
 * Analytics related events
 */
export interface AnalyticsEventData extends EventData {
  propertyName: 'analyticsUpdated' | 'exportProgress';
  value: any;
}

/**
 * Subscription related events
 */
export interface SubscriptionEventData extends EventData {
  propertyName: 'subscriptionPurchased' | 'subscriptionExpiringSoon' | 'subscriptionExpired';
  value: any;
}

/**
 * Goal related events
 */
export interface GoalEventData extends EventData {
  propertyName: 'goalCompleted' | 'goalSeriesCompleted';
  value: any;
}

/**
 * Settings related events
 */
export interface SettingsEventData extends EventData {
  propertyName: 'themeChanged' | string;
  value: any;
}

/**
 * Tutorial related events
 */
export interface TutorialEventData extends EventData {
  propertyName: 'tutorialStepCompleted' | 'tutorialCompleted' | 'tutorialSkipped';
  value: any;
}

/**
 * Social onboarding related events
 */
export interface SocialOnboardingEventData extends EventData {
  propertyName: 'stepCompleted' | 'onboardingCompleted' | 'profileCreated' | 'interestsSelected';
  value: any;
}

/**
 * Type guard functions to check event types
 */
export function isPropertyChangeEvent(event: EventData): event is PropertyChangeEventData {
  return 'propertyName' in event && 'value' in event;
}

export function isUserDataEvent(event: EventData): event is UserDataEventData {
  return isPropertyChangeEvent(event) && 
    ['userProfile', 'achievementUnlocked', 'levelUp', 'personalBestAchieved'].includes(event.propertyName);
}

export function isSessionEvent(event: EventData): event is SessionEventData {
  return isPropertyChangeEvent(event) && 
    ['sessionCompleted', 'sessionStarted', 'sessionCancelled'].includes(event.propertyName);
}

export function isSocialEvent(event: EventData): event is SocialEventData {
  return isPropertyChangeEvent(event) && 
    ['friendshipUpdated', 'friendRequestReceived', 'friendRequestAccepted', 
     'circleCreated', 'circleJoined', 'circleLeft', 'inviteResponded'].includes(event.propertyName);
}

export function isChallengeEvent(event: EventData): event is ChallengeEventData {
  return isPropertyChangeEvent(event) && 
    ['challengeJoined', 'challengeCompleted', 'challengeLeft'].includes(event.propertyName);
}

export function isLeaderboardEvent(event: EventData): event is LeaderboardEventData {
  return isPropertyChangeEvent(event) && 
    ['leaderboardUpdated', 'userLeaderboardsUpdated', 'leaderboardParticipationChanged'].includes(event.propertyName);
}

export function isAnalyticsEvent(event: EventData): event is AnalyticsEventData {
  return isPropertyChangeEvent(event) && 
    ['analyticsUpdated', 'exportProgress'].includes(event.propertyName);
}

export function isSubscriptionEvent(event: EventData): event is SubscriptionEventData {
  return isPropertyChangeEvent(event) && 
    ['subscriptionPurchased', 'subscriptionExpiringSoon', 'subscriptionExpired'].includes(event.propertyName);
}

export function isGoalEvent(event: EventData): event is GoalEventData {
  return isPropertyChangeEvent(event) && 
    ['goalCompleted', 'goalSeriesCompleted'].includes(event.propertyName);
}

export function isSettingsEvent(event: EventData): event is SettingsEventData {
  return isPropertyChangeEvent(event) && 
    (event.propertyName === 'themeChanged' || typeof event.propertyName === 'string');
}

export function isTutorialEvent(event: EventData): event is TutorialEventData {
  return isPropertyChangeEvent(event) && 
    ['tutorialStepCompleted', 'tutorialCompleted', 'tutorialSkipped'].includes(event.propertyName);
}

export function isSocialOnboardingEvent(event: EventData): event is SocialOnboardingEventData {
  return isPropertyChangeEvent(event) && 
    ['stepCompleted', 'onboardingCompleted', 'profileCreated', 'interestsSelected'].includes(event.propertyName);
}
