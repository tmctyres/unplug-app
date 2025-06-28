import { Observable } from '@nativescript/core';
import { CircleService } from '../services/circle-service';
import { SocialService } from '../services/social-service';
import { UserDataService } from '../models/user-data';
import { Circle, CircleMembership, CircleInvite, SocialPost } from '../models/social-data';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';

export class CirclesViewModel extends Observable {
  private circleService: CircleService;
  private socialService: SocialService;
  private userDataService: UserDataService;
  private userCircles: Circle[] = [];
  private circleInvites: CircleInvite[] = [];
  private selectedTab: 'my_circles' | 'invites' | 'discover' = 'my_circles';

  constructor() {
    super();
    this.circleService = CircleService.getInstance();
    this.socialService = SocialService.getInstance();
    this.userDataService = UserDataService.getInstance();
    this.initializeCircles();
    this.setupEventListeners();
  }

  private async initializeCircles(): Promise<void> {
    try {
      this.set('isLoading', true);
      
      // Load user's circles and invites
      this.userCircles = this.circleService.getUserCircles();
      this.circleInvites = this.circleService.getCircleInvites();
      
      this.loadCircleData();
      
    } catch (error) {
      console.error('Failed to load circles:', error);
      this.set('hasError', true);
      this.set('errorMessage', 'Failed to load circles');
    } finally {
      this.set('isLoading', false);
    }
  }

  private setupEventListeners(): void {
    this.circleService.on('propertyChange', (args) => {
      if (isPropertyChangeEvent(args) &&
          (args.propertyName === 'circleCreated' ||
           args.propertyName === 'circleJoined' ||
           args.propertyName === 'circleLeft' ||
           args.propertyName === 'inviteResponded')) {
        this.loadCircleData();
      }
    });
  }

  private loadCircleData(): void {
    // Load user's circles
    this.loadUserCircles();
    
    // Load pending invites
    this.loadPendingInvites();
    
    // Load discover suggestions
    this.loadDiscoverSuggestions();
    
    // Update tab content
    this.updateTabContent();
  }

  private loadUserCircles(): void {
    const circles = this.userCircles.map(circle => {
      const membership = this.circleService.getUserMembershipForCircle(circle.id);
      const recentPosts = this.circleService.getCirclePosts(circle.id).slice(0, 3);
      
      return {
        ...circle,
        membership,
        userRole: membership?.role || 'member',
        canInvite: this.circleService.canUserInviteToCircle(circle.id),
        recentActivity: this.getRecentActivityText(recentPosts),
        memberText: this.getMemberText(circle.memberCount),
        timeAgo: this.getTimeAgo(circle.createdAt),
        isActive: membership?.status === 'active'
      };
    });

    this.set('userCircles', circles);
    this.set('hasCircles', circles.length > 0);
  }

  private loadPendingInvites(): void {
    const invites = this.circleInvites
      .filter(invite => invite.status === 'pending')
      .map(invite => {
        // In a real app, we'd fetch circle details from backend
        return {
          ...invite,
          circleName: `Circle ${invite.circleId.substring(0, 8)}`,
          circleDescription: 'A digital wellness circle',
          inviterName: `User ${invite.fromUserId.substring(0, 8)}`,
          timeAgo: this.getTimeAgo(invite.createdAt),
          expiresIn: this.getTimeUntil(invite.expiresAt),
          isExpired: new Date(invite.expiresAt) <= new Date()
        };
      });

    this.set('pendingInvites', invites);
    this.set('hasPendingInvites', invites.length > 0);
    this.set('pendingInvitesCount', invites.length);
  }

  private loadDiscoverSuggestions(): void {
    // Create some sample circle suggestions
    const suggestions = [
      {
        id: 'family_circle',
        name: 'Family Digital Wellness',
        description: 'Help your family build healthy digital habits together',
        type: 'family',
        memberCount: 0,
        emoji: '👨‍👩‍👧‍👦',
        color: '#10B981',
        isTemplate: true
      },
      {
        id: 'study_circle',
        name: 'Study Focus Group',
        description: 'Stay focused during study sessions with fellow students',
        type: 'study_group',
        memberCount: 0,
        emoji: '📚',
        color: '#3B82F6',
        isTemplate: true
      },
      {
        id: 'work_circle',
        name: 'Workplace Wellness',
        description: 'Build better work-life balance with colleagues',
        type: 'colleagues',
        memberCount: 0,
        emoji: '💼',
        color: '#8B5CF6',
        isTemplate: true
      },
      {
        id: 'friends_circle',
        name: 'Friends Support Circle',
        description: 'Support each other in digital wellness goals',
        type: 'friends',
        memberCount: 0,
        emoji: '👥',
        color: '#F59E0B',
        isTemplate: true
      }
    ];

    this.set('discoverSuggestions', suggestions);
  }

  private updateTabContent(): void {
    switch (this.selectedTab) {
      case 'my_circles':
        this.set('tabTitle', '👥 My Circles');
        this.set('tabDescription', 'Your accountability groups and communities');
        break;
      case 'invites':
        this.set('tabTitle', '📨 Invitations');
        this.set('tabDescription', 'Pending circle invitations');
        break;
      case 'discover':
        this.set('tabTitle', '🔍 Discover');
        this.set('tabDescription', 'Find or create new circles');
        break;
    }
  }

  // Public methods for UI interaction
  onTabChange(tab: 'my_circles' | 'invites' | 'discover'): void {
    this.selectedTab = tab;
    this.set('selectedTab', tab);
    this.updateTabContent();
  }

  onCreateCircle(): void {
    this.showCreateCircleDialog();
  }

  onJoinCircle(circleId: string): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate({
      moduleName: 'views/circle-detail-page',
      context: { circleId, action: 'join' }
    });
  }

  onViewCircle(circleId: string): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate({
      moduleName: 'views/circle-detail-page',
      context: { circleId }
    });
  }

  async onLeaveCircle(circleId: string): Promise<void> {
    try {
      const { Dialogs } = require('@nativescript/core');
      
      const result = await Dialogs.confirm({
        title: 'Leave Circle',
        message: 'Are you sure you want to leave this circle? You can be re-invited later.',
        okButtonText: 'Leave',
        cancelButtonText: 'Cancel'
      });

      if (result) {
        await this.circleService.leaveCircle(circleId);
        this.showSuccess('Left the circle');
        this.loadCircleData();
      }
      
    } catch (error) {
      console.error('Failed to leave circle:', error);
      this.showError('Failed to leave circle');
    }
  }

  async onAcceptInvite(inviteId: string): Promise<void> {
    try {
      this.set('processingInvite', inviteId);
      await this.circleService.respondToInvite(inviteId, true);
      this.showSuccess('Joined the circle!');
      this.loadCircleData();
    } catch (error) {
      console.error('Failed to accept invite:', error);
      this.showError('Failed to join circle');
    } finally {
      this.set('processingInvite', null);
    }
  }

  async onDeclineInvite(inviteId: string): Promise<void> {
    try {
      this.set('processingInvite', inviteId);
      await this.circleService.respondToInvite(inviteId, false);
      this.showSuccess('Invitation declined');
      this.loadCircleData();
    } catch (error) {
      console.error('Failed to decline invite:', error);
      this.showError('Failed to decline invitation');
    } finally {
      this.set('processingInvite', null);
    }
  }

  onCreateFromTemplate(templateId: string): void {
    const template = this.get('discoverSuggestions').find(s => s.id === templateId);
    if (template) {
      this.showCreateCircleDialog(template);
    }
  }

  onInviteFriends(circleId: string): void {
    // Show friend invitation dialog
    this.showFriendInviteDialog(circleId);
  }

  onShareCircle(circleId: string): void {
    const circle = this.userCircles.find(c => c.id === circleId);
    if (circle) {
      const { SocialShare } = require('@nativescript/social-share');
      const shareText = `Join my "${circle.name}" circle on Unplug! Let's support each other in our digital wellness journey. #DigitalWellness #Accountability`;
      SocialShare.shareText(shareText, 'Join My Circle!');
    }
  }

  onRefresh(): void {
    this.initializeCircles();
  }

  // Helper methods
  private showCreateCircleDialog(template?: any): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate({
      moduleName: 'views/create-circle-page',
      context: { template }
    });
  }

  private showFriendInviteDialog(circleId: string): void {
    // In a real implementation, this would show a friend selection dialog
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: 'Invite Friends',
      message: 'Friend invitation feature coming soon!',
      okButtonText: 'OK'
    });
  }

  private getRecentActivityText(posts: SocialPost[]): string {
    if (posts.length === 0) return 'No recent activity';
    
    const latestPost = posts[0];
    const timeAgo = this.getTimeAgo(latestPost.createdAt);
    
    switch (latestPost.type) {
      case 'achievement':
        return `Achievement shared ${timeAgo}`;
      case 'progress_share':
        return `Progress update ${timeAgo}`;
      case 'milestone':
        return `Milestone reached ${timeAgo}`;
      default:
        return `Activity ${timeAgo}`;
    }
  }

  private getMemberText(count: number): string {
    if (count === 0) return 'No members yet';
    if (count === 1) return '1 member';
    return `${count} members`;
  }

  private getTimeAgo(date: Date | string): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  }

  private getTimeUntil(date: Date | string): string {
    const now = new Date();
    const future = new Date(date);
    const diffMs = future.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
    if (diffHours > 0) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} left`;
    return 'Expires soon';
  }

  private showSuccess(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'success', message });
  }

  private showError(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'error', message });
  }

  onBack(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  // Getters for computed properties
  get tabOptions(): any[] {
    return [
      { id: 'my_circles', name: 'My Circles', icon: '👥' },
      { id: 'invites', name: `Invites${this.get('pendingInvitesCount') > 0 ? ` (${this.get('pendingInvitesCount')})` : ''}`, icon: '📨' },
      { id: 'discover', name: 'Discover', icon: '🔍' }
    ];
  }

  get circleStats(): any {
    const totalCircles = this.userCircles.length;
    const activeCircles = this.userCircles.filter(c => 
      this.circleService.getUserMembershipForCircle(c.id)?.status === 'active'
    ).length;
    const adminCircles = this.userCircles.filter(c => 
      this.circleService.getUserMembershipForCircle(c.id)?.role === 'admin'
    ).length;
    
    return {
      totalCircles,
      activeCircles,
      adminCircles,
      pendingInvites: this.circleInvites.filter(i => i.status === 'pending').length
    };
  }
}
