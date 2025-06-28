import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import { SocialService } from './social-service';
import {
  Circle,
  CircleMembership,
  CircleInvite,
  SocialPost,
  SocialActivity
} from '../models/social-data';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';

export class CircleService extends Observable {
  private static instance: CircleService;
  private userDataService: UserDataService;
  private socialService: SocialService;
  private userCircles: Circle[] = [];
  private userMemberships: CircleMembership[] = [];
  private circleInvites: CircleInvite[] = [];
  private circlePosts: Map<string, SocialPost[]> = new Map();

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.socialService = SocialService.getInstance();
    this.initializeCircles();
  }

  static getInstance(): CircleService {
    if (!CircleService.instance) {
      CircleService.instance = new CircleService();
    }
    return CircleService.instance;
  }

  private async initializeCircles(): Promise<void> {
    try {
      // Load user's circles and memberships
      await this.loadUserCircles();
      await this.loadCircleInvites();
      
      // Setup listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize circles:', error);
    }
  }

  private async loadUserCircles(): Promise<void> {
    const userProfile = this.userDataService.getUserProfile();
    this.userCircles = userProfile.circles || [];
    this.userMemberships = userProfile.circleMemberships || [];
    
    // Load circle posts for each circle
    this.userCircles.forEach(circle => {
      this.loadCirclePosts(circle.id);
    });
    
    this.set('userCircles', this.userCircles);
    this.set('userMemberships', this.userMemberships);
  }

  private async loadCircleInvites(): Promise<void> {
    const userProfile = this.userDataService.getUserProfile();
    this.circleInvites = userProfile.circleInvites || [];
    
    // Filter active invites
    const now = new Date();
    this.circleInvites = this.circleInvites.filter(invite => 
      invite.status === 'pending' && new Date(invite.expiresAt) > now
    );
    
    this.set('circleInvites', this.circleInvites);
    this.set('pendingInvitesCount', this.circleInvites.length);
  }

  private loadCirclePosts(circleId: string): void {
    // In a real app, this would load from backend
    // For now, we'll create some sample posts
    const posts: SocialPost[] = [];
    this.circlePosts.set(circleId, posts);
  }

  private setupEventListeners(): void {
    // Listen for session completions to share with circles
    this.userDataService.on('sessionCompleted', (args) => {
      if (isPropertyChangeEvent(args)) {
        this.handleSessionCompletion(args.value);
      }
    });

    // Listen for achievements to share with circles
    this.userDataService.on('achievementUnlocked', (args) => {
      if (isPropertyChangeEvent(args)) {
        this.handleAchievementUnlocked(args.value);
      }
    });

    // Listen for personal bests
    this.userDataService.on('personalBestAchieved', (args) => {
      if (isPropertyChangeEvent(args)) {
        this.handlePersonalBestAchieved(args.value);
      }
    });
  }

  // Circle Management
  async createCircle(circleData: Partial<Circle>): Promise<Circle> {
    const socialProfile = this.socialService.getSocialProfile();
    if (!socialProfile) throw new Error('Social profile not found');

    const circle: Circle = {
      id: this.generateId(),
      name: circleData.name || 'My Circle',
      description: circleData.description || '',
      type: circleData.type || 'custom',
      isPrivate: circleData.isPrivate !== false,
      createdBy: socialProfile.userId,
      createdAt: new Date(),
      memberCount: 1,
      maxMembers: circleData.maxMembers || 20,
      allowInvites: circleData.allowInvites !== false,
      requireApproval: circleData.requireApproval || false,
      shareProgress: circleData.shareProgress !== false,
      shareAchievements: circleData.shareAchievements !== false,
      color: circleData.color || this.getRandomColor(),
      emoji: circleData.emoji || this.getRandomEmoji(),
      avatar: circleData.avatar
    };

    // Create admin membership for creator
    const membership: CircleMembership = {
      id: this.generateId(),
      circleId: circle.id,
      userId: socialProfile.userId,
      role: 'admin',
      status: 'active',
      joinedAt: new Date(),
      notificationsEnabled: true,
      shareProgress: true
    };

    this.userCircles.push(circle);
    this.userMemberships.push(membership);
    this.circlePosts.set(circle.id, []);
    
    // Update social profile
    socialProfile.circlesCount++;
    
    this.saveCircleData();
    this.notifyPropertyChange('circleCreated', { circle });
    
    return circle;
  }

  async joinCircle(circleId: string, inviteCode?: string): Promise<void> {
    const socialProfile = this.socialService.getSocialProfile();
    if (!socialProfile) throw new Error('Social profile not found');

    // Check if already a member
    const existingMembership = this.userMemberships.find(m => m.circleId === circleId);
    if (existingMembership) throw new Error('Already a member of this circle');

    const circle = this.userCircles.find(c => c.id === circleId);
    if (!circle) throw new Error('Circle not found');

    // Check if circle is full
    if (circle.memberCount >= circle.maxMembers) {
      throw new Error('Circle is full');
    }

    const membership: CircleMembership = {
      id: this.generateId(),
      circleId: circleId,
      userId: socialProfile.userId,
      role: 'member',
      status: circle.requireApproval ? 'pending' : 'active',
      joinedAt: new Date(),
      notificationsEnabled: true,
      shareProgress: true
    };

    this.userMemberships.push(membership);
    
    if (!circle.requireApproval) {
      circle.memberCount++;
      socialProfile.circlesCount++;
      
      // Create welcome post
      await this.createCirclePost(circleId, {
        type: 'story',
        content: `${socialProfile.displayName} joined the circle! Welcome! 👋`,
        isPublic: false
      });
    }
    
    this.saveCircleData();
    this.notifyPropertyChange('circleJoined', { circle, membership });
  }

  async leaveCircle(circleId: string): Promise<void> {
    const socialProfile = this.socialService.getSocialProfile();
    if (!socialProfile) return;

    const membershipIndex = this.userMemberships.findIndex(m => 
      m.circleId === circleId && m.userId === socialProfile.userId
    );
    
    if (membershipIndex >= 0) {
      const membership = this.userMemberships[membershipIndex];
      this.userMemberships.splice(membershipIndex, 1);
      
      const circle = this.userCircles.find(c => c.id === circleId);
      if (circle) {
        circle.memberCount = Math.max(0, circle.memberCount - 1);
        
        // If user was admin and there are other members, transfer ownership
        if (membership.role === 'admin' && circle.memberCount > 0) {
          // In a real app, this would handle admin transfer
        }
        
        // Create farewell post
        await this.createCirclePost(circleId, {
          type: 'story',
          content: `${socialProfile.displayName} left the circle. We'll miss you! 👋`,
          isPublic: false
        });
      }
      
      socialProfile.circlesCount = Math.max(0, socialProfile.circlesCount - 1);
      this.saveCircleData();
      this.notifyPropertyChange('circleLeft', { circleId });
    }
  }

  // Invitation Management
  async inviteToCircle(circleId: string, targetUserId: string, message?: string): Promise<void> {
    const socialProfile = this.socialService.getSocialProfile();
    if (!socialProfile) throw new Error('Social profile not found');

    const circle = this.userCircles.find(c => c.id === circleId);
    if (!circle) throw new Error('Circle not found');

    // Check if user has permission to invite
    const membership = this.userMemberships.find(m => 
      m.circleId === circleId && m.userId === socialProfile.userId
    );
    if (!membership || (membership.role === 'member' && !circle.allowInvites)) {
      throw new Error('No permission to invite');
    }

    const invite: CircleInvite = {
      id: this.generateId(),
      circleId: circleId,
      fromUserId: socialProfile.userId,
      toUserId: targetUserId,
      message: message,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending'
    };

    // In a real app, this would be sent to the target user
    this.circleInvites.push(invite);
    
    // Create notification for target user
    this.socialService.createNotification(targetUserId, {
      type: 'circle_invite',
      title: 'Circle Invitation',
      message: `${socialProfile.displayName} invited you to join "${circle.name}"`,
      icon: '👥',
      fromUserId: socialProfile.userId,
      targetId: invite.id,
      actionText: 'View Invitation'
    });

    this.saveCircleData();
    this.notifyPropertyChange('inviteSent', { invite });
  }

  async respondToInvite(inviteId: string, accept: boolean): Promise<void> {
    const invite = this.circleInvites.find(i => i.id === inviteId);
    if (!invite || invite.status !== 'pending') return;

    invite.status = accept ? 'accepted' : 'declined';
    
    if (accept) {
      await this.joinCircle(invite.circleId);
    }
    
    // Notify inviter
    this.socialService.createNotification(invite.fromUserId, {
      type: 'circle_invite',
      title: 'Invitation Response',
      message: `Your circle invitation was ${accept ? 'accepted' : 'declined'}`,
      icon: accept ? '✅' : '❌',
      fromUserId: invite.toUserId
    });

    this.saveCircleData();
    this.notifyPropertyChange('inviteResponded', { invite, accepted: accept });
  }

  // Circle Posts and Activities
  async createCirclePost(circleId: string, postData: Partial<SocialPost>): Promise<SocialPost> {
    const socialProfile = this.socialService.getSocialProfile();
    if (!socialProfile) throw new Error('Social profile not found');

    const post: SocialPost = {
      id: this.generateId(),
      type: postData.type || 'story',
      userId: socialProfile.userId,
      title: postData.title,
      content: postData.content || '',
      imageUrl: postData.imageUrl,
      createdAt: new Date(),
      isPublic: false, // Circle posts are private to the circle
      allowComments: postData.allowComments !== false,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      circleId: circleId,
      isReported: false,
      isHidden: false
    };

    // Add to circle posts
    const circlePosts = this.circlePosts.get(circleId) || [];
    circlePosts.unshift(post);
    this.circlePosts.set(circleId, circlePosts);
    
    this.saveCircleData();
    this.notifyPropertyChange('circlePostCreated', { post, circleId });
    
    return post;
  }

  private async handleSessionCompletion(sessionData: any): Promise<void> {
    const socialProfile = this.socialService.getSocialProfile();
    if (!socialProfile) return;

    // Share with circles that have progress sharing enabled
    const activeCircles = this.getActiveCirclesWithProgressSharing();
    
    for (const circle of activeCircles) {
      await this.createCirclePost(circle.id, {
        type: 'progress_share',
        content: `Just completed a ${Math.round(sessionData.duration)} minute offline session! 🎯`,
        isPublic: false
      });
    }
  }

  private async handleAchievementUnlocked(achievement: any): Promise<void> {
    const socialProfile = this.socialService.getSocialProfile();
    if (!socialProfile) return;

    // Share with circles that have achievement sharing enabled
    const activeCircles = this.getActiveCirclesWithAchievementSharing();
    
    for (const circle of activeCircles) {
      await this.createCirclePost(circle.id, {
        type: 'achievement',
        title: `🏆 Achievement Unlocked!`,
        content: `I just unlocked "${achievement.title}"! ${achievement.description}`,
        achievementId: achievement.id,
        isPublic: false
      });
    }
  }

  private async handlePersonalBestAchieved(personalBest: any): Promise<void> {
    const socialProfile = this.socialService.getSocialProfile();
    if (!socialProfile) return;

    const activeCircles = this.getActiveCirclesWithAchievementSharing();
    
    for (const circle of activeCircles) {
      await this.createCirclePost(circle.id, {
        type: 'milestone',
        title: `🎯 New Personal Best!`,
        content: `I just achieved a new personal best: ${personalBest.description}! 🚀`,
        isPublic: false
      });
    }
  }

  // Helper Methods
  private getActiveCirclesWithProgressSharing(): Circle[] {
    return this.userCircles.filter(circle => {
      const membership = this.userMemberships.find(m => 
        m.circleId === circle.id && m.status === 'active'
      );
      return membership && membership.shareProgress && circle.shareProgress;
    });
  }

  private getActiveCirclesWithAchievementSharing(): Circle[] {
    return this.userCircles.filter(circle => {
      const membership = this.userMemberships.find(m => 
        m.circleId === circle.id && m.status === 'active'
      );
      return membership && circle.shareAchievements;
    });
  }

  private getRandomColor(): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
      '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private getRandomEmoji(): string {
    const emojis = ['👥', '🏠', '💪', '🎯', '🌟', '🚀', '💎', '🔥', '⭐', '🎉'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  private saveCircleData(): void {
    const userProfile = this.userDataService.getUserProfile();
    userProfile.circles = this.userCircles;
    userProfile.circleMemberships = this.userMemberships;
    userProfile.circleInvites = this.circleInvites;
    
    // Save circle posts
    userProfile.circlePosts = {};
    this.circlePosts.forEach((posts, circleId) => {
      userProfile.circlePosts[circleId] = posts;
    });
    
    this.userDataService.saveUserData();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public Getters
  getUserCircles(): Circle[] {
    return [...this.userCircles];
  }

  getUserMemberships(): CircleMembership[] {
    return [...this.userMemberships];
  }

  getCircleInvites(): CircleInvite[] {
    return [...this.circleInvites];
  }

  getCirclePosts(circleId: string): SocialPost[] {
    return [...(this.circlePosts.get(circleId) || [])];
  }

  getCircleById(circleId: string): Circle | null {
    return this.userCircles.find(c => c.id === circleId) || null;
  }

  getUserMembershipForCircle(circleId: string): CircleMembership | null {
    const socialProfile = this.socialService.getSocialProfile();
    if (!socialProfile) return null;
    
    return this.userMemberships.find(m => 
      m.circleId === circleId && m.userId === socialProfile.userId
    ) || null;
  }

  isUserMemberOfCircle(circleId: string): boolean {
    const membership = this.getUserMembershipForCircle(circleId);
    return membership?.status === 'active';
  }

  canUserInviteToCircle(circleId: string): boolean {
    const circle = this.getCircleById(circleId);
    const membership = this.getUserMembershipForCircle(circleId);
    
    if (!circle || !membership || membership.status !== 'active') return false;
    
    return membership.role === 'admin' || 
           (membership.role === 'moderator' && circle.allowInvites) ||
           (membership.role === 'member' && circle.allowInvites);
  }

  getPendingInvitesCount(): number {
    return this.circleInvites.filter(i => i.status === 'pending').length;
  }
}
