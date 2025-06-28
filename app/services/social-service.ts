import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import {
  SocialProfile,
  Friendship,
  Circle,
  CircleMembership,
  SocialSettings,
  SocialNotification,
  SocialPost,
  SocialActivity,
  SocialStats
} from '../models/social-data';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';

export class SocialService extends Observable {
  private static instance: SocialService;
  private userDataService: UserDataService;
  private socialProfile: SocialProfile | null = null;
  private friendships: Friendship[] = [];
  private circles: Circle[] = [];
  private memberships: CircleMembership[] = [];
  private notifications: SocialNotification[] = [];
  private socialSettings: SocialSettings | null = null;

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.initializeSocialData();
  }

  static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  private async initializeSocialData(): Promise<void> {
    try {
      // Load or create social profile
      await this.loadSocialProfile();
      
      // Load social data
      await this.loadFriendships();
      await this.loadCircles();
      await this.loadNotifications();
      await this.loadSocialSettings();
      
      // Setup listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize social data:', error);
    }
  }

  private async loadSocialProfile(): Promise<void> {
    const userProfile = this.userDataService.getUserProfile();
    
    // Check if social profile exists
    let socialProfile = userProfile.socialProfile;
    
    if (!socialProfile) {
      // Create new social profile
      socialProfile = this.createDefaultSocialProfile(userProfile);
      userProfile.socialProfile = socialProfile;
      this.userDataService.saveUserData();
    }
    
    this.socialProfile = socialProfile;
    this.set('socialProfile', socialProfile);
  }

  private createDefaultSocialProfile(userProfile: any): SocialProfile {
    return {
      userId: userProfile.userTitle || 'user',
      username: this.generateUsername(userProfile.userTitle),
      displayName: userProfile.userTitle || 'Digital Wellness Warrior',
      joinedAt: new Date(),
      isPublic: false,
      
      // Privacy settings
      showInLeaderboards: true,
      allowFriendRequests: true,
      shareAchievements: true,
      shareProgress: false,
      
      // Social stats
      friendsCount: 0,
      circlesCount: 0,
      challengesCompleted: 0,
      achievementsShared: 0,
      
      // Verification
      isVerified: false
    };
  }

  private generateUsername(displayName?: string): string {
    const base = displayName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    const random = Math.floor(Math.random() * 9999);
    return `${base}${random}`;
  }

  private async loadFriendships(): Promise<void> {
    // In a real app, this would load from a backend
    this.friendships = this.userDataService.getUserProfile().friendships || [];
    this.set('friendships', this.friendships);
  }

  private async loadCircles(): Promise<void> {
    // In a real app, this would load from a backend
    this.circles = this.userDataService.getUserProfile().circles || [];
    this.memberships = this.userDataService.getUserProfile().circleMemberships || [];
    this.set('circles', this.circles);
    this.set('memberships', this.memberships);
  }

  private async loadNotifications(): Promise<void> {
    this.notifications = this.userDataService.getUserProfile().socialNotifications || [];
    this.set('notifications', this.notifications);
    this.set('unreadNotificationsCount', this.notifications.filter(n => !n.isRead).length);
  }

  private async loadSocialSettings(): Promise<void> {
    let settings = this.userDataService.getUserProfile().socialSettings;
    
    if (!settings) {
      settings = this.createDefaultSocialSettings();
      this.userDataService.getUserProfile().socialSettings = settings;
      this.userDataService.saveUserData();
    }
    
    this.socialSettings = settings;
    this.set('socialSettings', settings);
  }

  private createDefaultSocialSettings(): SocialSettings {
    return {
      userId: this.socialProfile?.userId || 'user',
      
      // Privacy settings
      profileVisibility: 'public',
      showInLeaderboards: true,
      allowFriendRequests: true,
      allowCircleInvites: true,
      allowChallengeInvites: true,
      
      // Sharing settings
      autoShareAchievements: true,
      autoShareMilestones: true,
      autoShareChallengeProgress: false,
      shareSessionCompletions: false,
      
      // Notification settings
      friendRequestNotifications: true,
      circleActivityNotifications: true,
      challengeUpdateNotifications: true,
      achievementLikeNotifications: true,
      leaderboardRankNotifications: true,
      
      // Discovery settings
      discoverableByUsername: true,
      discoverableByEmail: false,
      suggestToFriends: true,
      
      // Content settings
      allowCommentsOnPosts: true,
      moderateComments: false,
      hideFromSearch: false,
      
      updatedAt: new Date()
    };
  }

  private setupEventListeners(): void {
    // Listen for achievements to auto-share
    this.userDataService.on('achievementUnlocked', (args) => {
      if (isPropertyChangeEvent(args) && this.socialSettings?.autoShareAchievements) {
        this.shareAchievement(args.value);
      }
    });

    // Listen for session completions
    this.userDataService.on('sessionCompleted', (args) => {
      if (isPropertyChangeEvent(args) && this.socialSettings?.shareSessionCompletions) {
        this.createSessionActivity(args.value);
      }
    });

    // Listen for personal bests
    this.userDataService.on('personalBestAchieved', (args) => {
      if (isPropertyChangeEvent(args) && this.socialSettings?.autoShareMilestones) {
        this.shareMilestone(args.value);
      }
    });
  }

  // Friend Management
  async sendFriendRequest(targetUserId: string, message?: string): Promise<void> {
    const friendship: Friendship = {
      id: this.generateId(),
      userId1: this.socialProfile!.userId,
      userId2: targetUserId,
      status: 'pending',
      initiatedBy: this.socialProfile!.userId,
      createdAt: new Date(),
      shareProgress: true,
      shareAchievements: true,
      allowChallenges: true,
      notificationsEnabled: true
    };

    this.friendships.push(friendship);
    this.saveSocialData();

    // Create notification for target user
    this.createNotification(targetUserId, {
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${this.socialProfile!.displayName} wants to be your friend`,
      icon: '👥',
      fromUserId: this.socialProfile!.userId,
      targetId: friendship.id,
      actionText: 'View Request'
    });

    this.notifyPropertyChange('friendRequestSent', { targetUserId, friendship });
  }

  async acceptFriendRequest(friendshipId: string): Promise<void> {
    const friendship = this.friendships.find(f => f.id === friendshipId);
    if (friendship && friendship.status === 'pending') {
      friendship.status = 'accepted';
      friendship.acceptedAt = new Date();
      
      // Update friend counts
      this.socialProfile!.friendsCount++;
      
      this.saveSocialData();
      
      // Notify the requester
      this.createNotification(friendship.initiatedBy, {
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: `${this.socialProfile!.displayName} accepted your friend request`,
        icon: '✅',
        fromUserId: this.socialProfile!.userId,
        targetId: friendshipId
      });

      this.notifyPropertyChange('friendRequestAccepted', { friendship });
    }
  }

  async declineFriendRequest(friendshipId: string): Promise<void> {
    const index = this.friendships.findIndex(f => f.id === friendshipId && f.status === 'pending');
    if (index >= 0) {
      this.friendships.splice(index, 1);
      this.saveSocialData();
      this.notifyPropertyChange('friendRequestDeclined', { friendshipId });
    }
  }

  async removeFriend(friendshipId: string): Promise<void> {
    const index = this.friendships.findIndex(f => f.id === friendshipId);
    if (index >= 0) {
      this.friendships.splice(index, 1);
      this.socialProfile!.friendsCount = Math.max(0, this.socialProfile!.friendsCount - 1);
      this.saveSocialData();
      this.notifyPropertyChange('friendRemoved', { friendshipId });
    }
  }

  // Circle Management
  async createCircle(circleData: Partial<Circle>): Promise<Circle> {
    const circle: Circle = {
      id: this.generateId(),
      name: circleData.name || 'My Circle',
      description: circleData.description || '',
      type: circleData.type || 'custom',
      isPrivate: circleData.isPrivate || false,
      createdBy: this.socialProfile!.userId,
      createdAt: new Date(),
      memberCount: 1,
      maxMembers: circleData.maxMembers || 50,
      allowInvites: circleData.allowInvites !== false,
      requireApproval: circleData.requireApproval || false,
      shareProgress: circleData.shareProgress !== false,
      shareAchievements: circleData.shareAchievements !== false,
      color: circleData.color || '#3B82F6',
      emoji: circleData.emoji || '👥'
    };

    // Create membership for creator
    const membership: CircleMembership = {
      id: this.generateId(),
      circleId: circle.id,
      userId: this.socialProfile!.userId,
      role: 'admin',
      status: 'active',
      joinedAt: new Date(),
      notificationsEnabled: true,
      shareProgress: true
    };

    this.circles.push(circle);
    this.memberships.push(membership);
    this.socialProfile!.circlesCount++;
    
    this.saveSocialData();
    this.notifyPropertyChange('circleCreated', { circle });
    
    return circle;
  }

  async joinCircle(circleId: string): Promise<void> {
    const circle = this.circles.find(c => c.id === circleId);
    if (!circle) return;

    const membership: CircleMembership = {
      id: this.generateId(),
      circleId: circleId,
      userId: this.socialProfile!.userId,
      role: 'member',
      status: circle.requireApproval ? 'pending' : 'active',
      joinedAt: new Date(),
      notificationsEnabled: true,
      shareProgress: true
    };

    this.memberships.push(membership);
    
    if (!circle.requireApproval) {
      circle.memberCount++;
      this.socialProfile!.circlesCount++;
    }
    
    this.saveSocialData();
    this.notifyPropertyChange('circleJoined', { circle, membership });
  }

  // Social Posts and Activities
  async createPost(postData: Partial<SocialPost>): Promise<SocialPost> {
    const post: SocialPost = {
      id: this.generateId(),
      type: postData.type || 'story',
      userId: this.socialProfile!.userId,
      title: postData.title,
      content: postData.content || '',
      imageUrl: postData.imageUrl,
      createdAt: new Date(),
      isPublic: postData.isPublic !== false,
      allowComments: postData.allowComments !== false,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      achievementId: postData.achievementId,
      challengeId: postData.challengeId,
      circleId: postData.circleId,
      isReported: false,
      isHidden: false
    };

    // Save post (in real app, this would go to backend)
    this.saveSocialData();
    this.notifyPropertyChange('postCreated', { post });
    
    return post;
  }

  async shareAchievement(achievement: any): Promise<void> {
    const post = await this.createPost({
      type: 'achievement',
      title: `🏆 Achievement Unlocked: ${achievement.title}`,
      content: `I just unlocked "${achievement.title}"! ${achievement.description}`,
      achievementId: achievement.id,
      isPublic: true
    });

    this.socialProfile!.achievementsShared++;
    this.saveSocialData();
  }

  async shareMilestone(milestone: any): Promise<void> {
    const post = await this.createPost({
      type: 'milestone',
      title: `🎯 Milestone Reached!`,
      content: `Amazing! I've reached a new milestone: ${milestone.description}`,
      isPublic: true
    });
  }

  private async createSessionActivity(sessionData: any): Promise<void> {
    const activity: SocialActivity = {
      id: this.generateId(),
      userId: this.socialProfile!.userId,
      type: 'session_completed',
      description: `Completed a ${Math.round(sessionData.duration)} minute offline session`,
      value: sessionData.duration,
      unit: 'minutes',
      createdAt: new Date(),
      isPublic: this.socialSettings!.shareSessionCompletions,
      sessionId: sessionData.id,
      likesCount: 0,
      commentsCount: 0
    };

    // Save activity
    this.saveSocialData();
    this.notifyPropertyChange('activityCreated', { activity });
  }

  // Notifications
  async createNotification(userId: string, notificationData: Partial<SocialNotification>): Promise<void> {
    const notification: SocialNotification = {
      id: this.generateId(),
      userId: userId,
      type: notificationData.type!,
      title: notificationData.title!,
      message: notificationData.message!,
      icon: notificationData.icon!,
      createdAt: new Date(),
      isRead: false,
      fromUserId: notificationData.fromUserId,
      targetId: notificationData.targetId,
      targetType: notificationData.targetType,
      actionUrl: notificationData.actionUrl,
      actionText: notificationData.actionText
    };

    this.notifications.unshift(notification);
    this.set('unreadNotificationsCount', this.notifications.filter(n => !n.isRead).length);
    this.saveSocialData();
    this.notifyPropertyChange('notificationReceived', { notification });
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      this.set('unreadNotificationsCount', this.notifications.filter(n => !n.isRead).length);
      this.saveSocialData();
    }
  }

  async markAllNotificationsAsRead(): Promise<void> {
    this.notifications.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
      }
    });
    this.set('unreadNotificationsCount', 0);
    this.saveSocialData();
  }

  // Settings Management
  async updateSocialSettings(updates: Partial<SocialSettings>): Promise<void> {
    if (this.socialSettings) {
      Object.assign(this.socialSettings, updates);
      this.socialSettings.updatedAt = new Date();
      this.saveSocialData();
      this.notifyPropertyChange('socialSettingsUpdated', { settings: this.socialSettings });
    }
  }

  // Data Management
  private saveSocialData(): void {
    const userProfile = this.userDataService.getUserProfile();
    userProfile.socialProfile = this.socialProfile;
    userProfile.friendships = this.friendships;
    userProfile.circles = this.circles;
    userProfile.circleMemberships = this.memberships;
    userProfile.socialNotifications = this.notifications;
    userProfile.socialSettings = this.socialSettings;
    this.userDataService.saveUserData();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public getters
  getSocialProfile(): SocialProfile | null {
    return this.socialProfile;
  }

  getFriendships(): Friendship[] {
    return [...this.friendships];
  }

  getCircles(): Circle[] {
    return [...this.circles];
  }

  getNotifications(): SocialNotification[] {
    return [...this.notifications];
  }

  getSocialSettings(): SocialSettings | null {
    return this.socialSettings;
  }

  getUnreadNotificationsCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }
}
