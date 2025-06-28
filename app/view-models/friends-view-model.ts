import { Observable } from '@nativescript/core';
import { SocialService } from '../services/social-service';
import { UserDataService } from '../models/user-data';
import { SocialProfile, Friendship } from '../models/social-data';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';
import { SocialBackendClient } from '../services/social-backend-client';

export class FriendsViewModel extends Observable {
  private socialService: SocialService;
  private userDataService: UserDataService;
  private backendClient: SocialBackendClient;
  private friendsList: any[] = [];
  private pendingRequests: any[] = [];

  constructor() {
    super();
    this.socialService = SocialService.getInstance();
    this.userDataService = UserDataService.getInstance();
    this.backendClient = SocialBackendClient.getInstance();
    this.initializeFriends();
    this.setupEventListeners();
    this.loadRealFriends();
  }

  private async initializeFriends(): Promise<void> {
    try {
      this.set('isLoading', true);
      
      // Load friends and requests
      this.loadFriends();
      this.loadPendingRequests();
      
    } catch (error) {
      console.error('Failed to load friends:', error);
      this.set('hasError', true);
      this.set('errorMessage', 'Failed to load friends');
    } finally {
      this.set('isLoading', false);
    }
  }

  private setupEventListeners(): void {
    this.socialService.on('propertyChange', (args) => {
      if (isPropertyChangeEvent(args) &&
          (args.propertyName === 'friendshipUpdated' ||
           args.propertyName === 'friendRequestReceived' ||
           args.propertyName === 'friendRequestAccepted')) {
        this.loadFriends();
        this.loadPendingRequests();
      }
    });
  }

  private loadFriends(): void {
    const friendships = this.socialService.getFriendships();
    const acceptedFriends = friendships.filter(f => f.status === 'accepted');

    this.friendsList = acceptedFriends.map(friendship => {
      const friendId = friendship.friendId;
      return {
        userId: friendId,
        friendshipId: friendship.id,
        displayName: `Friend ${friendId.substring(0, 8)}`,
        level: Math.floor(Math.random() * 10) + 1,
        currentStreak: Math.floor(Math.random() * 30) + 1,
        isOnline: Math.random() > 0.5,
        lastActivity: this.getRandomLastActivity(),
        mutualFriends: Math.floor(Math.random() * 5),
        friendsSince: friendship.createdAt
      };
    });

    this.set('friendsList', this.friendsList);
    this.updateFriendsStats();
  }

  private loadPendingRequests(): void {
    const friendships = this.socialService.getFriendships();
    const pendingRequests = friendships.filter(f => f.status === 'pending' && f.requesterId !== this.socialService.getSocialProfile()?.userId);

    this.pendingRequests = pendingRequests.map(request => ({
      userId: request.requesterId,
      friendshipId: request.id,
      displayName: `User ${request.requesterId.substring(0, 8)}`,
      level: Math.floor(Math.random() * 10) + 1,
      mutualFriends: Math.floor(Math.random() * 3),
      timeAgo: this.getTimeAgo(request.createdAt),
      requestId: request.id
    }));

    this.set('pendingRequests', this.pendingRequests);
    this.updateFriendsStats();
  }

  private updateFriendsStats(): void {
    const stats = {
      totalFriends: this.friendsList.length,
      onlineFriends: this.friendsList.filter(f => f.isOnline).length,
      pendingRequests: this.pendingRequests.length,
      mutualFriends: this.friendsList.reduce((sum, f) => sum + f.mutualFriends, 0)
    };

    this.set('friendsStats', stats);
  }

  // Event handlers
  async onAcceptFriendRequest(userId: string): Promise<void> {
    try {
      const request = this.pendingRequests.find(r => r.userId === userId);
      if (request) {
        await this.socialService.acceptFriendRequest(request.friendshipId);
        this.loadFriends();
        this.loadPendingRequests();
      }
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  }

  async onDeclineFriendRequest(userId: string): Promise<void> {
    try {
      const request = this.pendingRequests.find(r => r.userId === userId);
      if (request) {
        await this.socialService.declineFriendRequest(request.friendshipId);
        this.loadPendingRequests();
      }
    } catch (error) {
      console.error('Failed to decline friend request:', error);
    }
  }

  onViewFriendProfile(userId: string): void {
    console.log('View friend profile:', userId);
    // In a real app, navigate to friend's profile
  }

  onFriendActions(userId: string): void {
    const { Dialogs } = require('@nativescript/core');
    
    Dialogs.action({
      title: 'Friend Actions',
      cancelButtonText: 'Cancel',
      actions: ['View Profile', 'Send Message', 'Remove Friend']
    }).then((result) => {
      switch (result) {
        case 'View Profile':
          this.onViewFriendProfile(userId);
          break;
        case 'Send Message':
          console.log('Send message to:', userId);
          break;
        case 'Remove Friend':
          this.onRemoveFriend(userId);
          break;
      }
    });
  }

  async onRemoveFriend(userId: string): Promise<void> {
    const { Dialogs } = require('@nativescript/core');

    const result = await Dialogs.confirm({
      title: 'Remove Friend',
      message: 'Are you sure you want to remove this friend?',
      okButtonText: 'Remove',
      cancelButtonText: 'Cancel'
    });

    if (result) {
      try {
        const friend = this.friendsList.find(f => f.userId === userId);
        if (friend) {
          await this.socialService.removeFriend(friend.friendshipId);
          this.loadFriends();
        }
      } catch (error) {
        console.error('Failed to remove friend:', error);
      }
    }
  }

  onFindFriends(): void {
    const { Dialogs } = require('@nativescript/core');
    
    Dialogs.prompt({
      title: 'Find Friends',
      message: 'Enter username or email to find friends:',
      okButtonText: 'Search',
      cancelButtonText: 'Cancel',
      inputType: 'text'
    }).then((result) => {
      if (result.result && result.text) {
        this.searchFriends(result.text);
      }
    });
  }

  private async searchFriends(query: string): Promise<void> {
    console.log('Searching for friends:', query);
    // In a real app, search for users and show results
  }

  onAddFriend(): void {
    this.onFindFriends();
  }

  onRefresh(): void {
    this.initializeFriends();
  }

  onBack(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  // Helper methods
  getLevelBadgeColor(level: number): string {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    return colors[level % colors.length];
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  private getRandomLastActivity(): string {
    const activities = [
      'Completed 45 min session',
      'Achieved new milestone',
      'Joined a challenge',
      'Shared an achievement',
      'Online now'
    ];
    return activities[Math.floor(Math.random() * activities.length)];
  }

  // Real backend integration methods
  private async loadRealFriends(): Promise<void> {
    try {
      if (!this.backendClient.isAuthenticated()) {
        console.log('Friends: User not authenticated, using local data');
        return;
      }

      this.set('isLoadingReal', true);
      this.set('backendError', '');

      const response = await this.backendClient.getFriends();

      if (response.success && response.data) {
        this.set('realFriends', response.data);
        this.set('hasRealData', true);
        console.log(`Friends: Loaded ${response.data.length} real friends`);
      } else {
        console.error('Friends: Failed to load real friends:', response.error);
        this.set('backendError', response.error || 'Failed to load friends');
        this.set('hasRealData', false);
      }
    } catch (error) {
      console.error('Friends: Error loading real friends:', error);
      this.set('backendError', error.message || 'Network error');
      this.set('hasRealData', false);
    } finally {
      this.set('isLoadingReal', false);
    }
  }

  async onSendRealFriendRequest(userId: string): Promise<void> {
    try {
      if (!this.backendClient.isAuthenticated()) {
        this.showError('Please login to send friend requests');
        return;
      }

      this.set('isSendingRequest', true);

      const response = await this.backendClient.sendFriendRequest(userId);

      if (response.success) {
        this.showSuccess('Friend request sent!');

        // Refresh friends list
        await this.loadRealFriends();

        // Emit event for other components
        this.notifyPropertyChange('friendRequestSent', {
          userId,
          request: response.data
        });
      } else {
        console.error('Friends: Failed to send friend request:', response.error);
        this.showError(response.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Friends: Error sending friend request:', error);
      this.showError(error.message || 'Network error');
    } finally {
      this.set('isSendingRequest', false);
    }
  }

  async onAcceptRealFriendRequest(friendshipId: string): Promise<void> {
    try {
      this.set('isAcceptingRequest', true);

      const response = await this.backendClient.acceptFriendRequest(friendshipId);

      if (response.success) {
        this.showSuccess('Friend request accepted!');

        // Refresh friends list
        await this.loadRealFriends();

        // Emit event for other components
        this.notifyPropertyChange('friendRequestAccepted', {
          friendshipId,
          friendship: response.data
        });
      } else {
        console.error('Friends: Failed to accept friend request:', response.error);
        this.showError(response.error || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Friends: Error accepting friend request:', error);
      this.showError(error.message || 'Network error');
    } finally {
      this.set('isAcceptingRequest', false);
    }
  }

  async onRefreshRealData(): Promise<void> {
    await this.loadRealFriends();
  }

  private showSuccess(message: string): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: 'Success! 🎉',
      message: message,
      okButtonText: 'Great!'
    });
  }

  private showError(message: string): void {
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: 'Error',
      message: message,
      okButtonText: 'OK'
    });
  }

  // Getters for UI binding
  get hasBackendConnection(): boolean {
    return this.backendClient.isAuthenticated();
  }

  get isUsingRealData(): boolean {
    return this.get('hasRealData') || false;
  }

  get realFriends(): any[] {
    return this.get('realFriends') || [];
  }
}
