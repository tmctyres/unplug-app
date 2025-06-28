export interface SocialProfile {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  joinedAt: Date;
  isPublic: boolean;
  
  // Privacy settings
  showInLeaderboards: boolean;
  allowFriendRequests: boolean;
  shareAchievements: boolean;
  shareProgress: boolean;
  
  // Social stats
  friendsCount: number;
  circlesCount: number;
  challengesCompleted: number;
  achievementsShared: number;
  
  // Verification
  isVerified: boolean;
  verificationBadge?: string;
}

export interface Friendship {
  id: string;
  userId1: string;
  userId2: string;
  status: 'pending' | 'accepted' | 'blocked';
  initiatedBy: string;
  createdAt: Date;
  acceptedAt?: Date;

  // Additional properties for compatibility
  friendId?: string;
  requesterId?: string;

  // Friendship settings
  shareProgress: boolean;
  shareAchievements: boolean;
  allowChallenges: boolean;
  notificationsEnabled: boolean;
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  type: 'family' | 'friends' | 'colleagues' | 'study_group' | 'custom';
  isPrivate: boolean;
  
  // Circle management
  createdBy: string;
  createdAt: Date;
  memberCount: number;
  maxMembers: number;
  
  // Circle settings
  allowInvites: boolean;
  requireApproval: boolean;
  shareProgress: boolean;
  shareAchievements: boolean;
  
  // Circle image and theme
  avatar?: string;
  color: string;
  emoji: string;
}

export interface CircleMembership {
  id: string;
  circleId: string;
  userId: string;
  role: 'admin' | 'moderator' | 'member';
  status: 'pending' | 'active' | 'left' | 'removed';
  joinedAt: Date;
  invitedBy?: string;
  
  // Member settings
  notificationsEnabled: boolean;
  shareProgress: boolean;
  nickname?: string;
}

export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  type: 'weekly' | 'monthly' | 'seasonal' | 'special';
  category: 'minutes' | 'sessions' | 'streak' | 'goals' | 'consistency' | 'custom';
  
  // Challenge timing
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  
  // Challenge rules
  target: number;
  unit: string; // 'minutes', 'sessions', 'days', etc.
  rules: string[];
  
  // Participation
  participantCount: number;
  maxParticipants?: number;
  isPublic: boolean;
  requiresApproval: boolean;
  
  // Rewards
  rewards: ChallengeReward[];
  
  // Challenge metadata
  createdBy: string;
  createdAt: Date;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  
  // Visual
  icon: string;
  color: string;
  bannerImage?: string;
}

export interface ChallengeReward {
  id: string;
  type: 'badge' | 'xp' | 'title' | 'theme' | 'feature_unlock';
  name: string;
  description: string;
  value: number;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  
  // Reward criteria
  position?: number; // 1st, 2nd, 3rd place
  percentile?: number; // Top 10%, 25%, etc.
  threshold?: number; // Minimum achievement level
}

export interface ChallengeParticipation {
  id: string;
  challengeId: string;
  userId: string;
  joinedAt: Date;
  
  // Progress tracking
  currentProgress: number;
  targetProgress: number;
  progressPercentage: number;
  isCompleted: boolean;
  completedAt?: Date;
  
  // Ranking
  currentRank?: number;
  bestRank?: number;
  finalRank?: number;
  
  // Rewards earned
  rewardsEarned: ChallengeReward[];
  
  // Participation settings
  isPublic: boolean;
  shareProgress: boolean;
}

export interface Leaderboard {
  id: string;
  type: 'global' | 'friends' | 'circle' | 'challenge';
  category: 'weekly_minutes' | 'monthly_minutes' | 'current_streak' | 'total_sessions' | 'consistency' | 'level';
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time';
  
  // Leaderboard data
  entries: LeaderboardEntry[];
  lastUpdated: Date;
  
  // Settings
  isAnonymous: boolean;
  maxEntries: number;
  
  // Associated data
  circleId?: string;
  challengeId?: string;
}

export interface LeaderboardEntry {
  userId: string;
  username?: string; // null for anonymous
  displayName?: string; // null for anonymous
  avatar?: string; // null for anonymous
  
  // Stats
  value: number;
  rank: number;
  previousRank?: number;
  
  // Additional context
  streak?: number;
  level?: number;
  badge?: string;
  
  // Privacy
  isAnonymous: boolean;
  lastActive: Date;
}

export interface SocialPost {
  id: string;
  type: 'achievement' | 'milestone' | 'tip' | 'story' | 'challenge_update' | 'progress_share';
  userId: string;
  
  // Content
  title?: string;
  content: string;
  imageUrl?: string;
  
  // Post metadata
  createdAt: Date;
  isPublic: boolean;
  allowComments: boolean;
  
  // Engagement
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  
  // Associated data
  achievementId?: string;
  challengeId?: string;
  circleId?: string;
  
  // Moderation
  isReported: boolean;
  isHidden: boolean;
  moderatedBy?: string;
  moderatedAt?: Date;
}

export interface SocialComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: Date;
  
  // Engagement
  likesCount: number;
  
  // Threading
  parentCommentId?: string;
  repliesCount: number;
  
  // Moderation
  isReported: boolean;
  isHidden: boolean;
}

export interface SocialLike {
  id: string;
  userId: string;
  targetType: 'post' | 'comment' | 'achievement';
  targetId: string;
  createdAt: Date;
}

export interface SocialNotification {
  id: string;
  userId: string;
  type: 'friend_request' | 'friend_accepted' | 'circle_invite' | 'challenge_invite' | 
        'achievement_like' | 'post_comment' | 'challenge_complete' | 'leaderboard_rank' |
        'milestone_reached' | 'streak_milestone';
  
  // Notification content
  title: string;
  message: string;
  icon: string;
  
  // Notification metadata
  createdAt: Date;
  isRead: boolean;
  readAt?: Date;
  
  // Associated data
  fromUserId?: string;
  targetId?: string;
  targetType?: string;
  
  // Action data
  actionUrl?: string;
  actionText?: string;
}

export interface SocialActivity {
  id: string;
  userId: string;
  type: 'session_completed' | 'achievement_unlocked' | 'challenge_joined' | 
        'challenge_completed' | 'friend_added' | 'circle_joined' | 'milestone_reached';
  
  // Activity data
  description: string;
  value?: number;
  unit?: string;
  
  // Activity metadata
  createdAt: Date;
  isPublic: boolean;
  
  // Associated data
  sessionId?: string;
  achievementId?: string;
  challengeId?: string;
  circleId?: string;
  
  // Engagement
  likesCount: number;
  commentsCount: number;
}

export interface SocialSettings {
  userId: string;
  
  // Privacy settings
  profileVisibility: 'public' | 'friends' | 'private';
  showInLeaderboards: boolean;
  allowFriendRequests: boolean;
  allowCircleInvites: boolean;
  allowChallengeInvites: boolean;
  
  // Sharing settings
  autoShareAchievements: boolean;
  autoShareMilestones: boolean;
  autoShareChallengeProgress: boolean;
  shareSessionCompletions: boolean;
  
  // Notification settings
  friendRequestNotifications: boolean;
  circleActivityNotifications: boolean;
  challengeUpdateNotifications: boolean;
  achievementLikeNotifications: boolean;
  leaderboardRankNotifications: boolean;
  
  // Discovery settings
  discoverableByUsername: boolean;
  discoverableByEmail: boolean;
  suggestToFriends: boolean;
  
  // Content settings
  allowCommentsOnPosts: boolean;
  moderateComments: boolean;
  hideFromSearch: boolean;
  
  // Updated timestamp
  updatedAt: Date;
}

export interface SocialStats {
  userId: string;
  
  // Social engagement
  totalFriends: number;
  totalCircles: number;
  totalChallengesJoined: number;
  totalChallengesCompleted: number;
  
  // Content stats
  totalPostsCreated: number;
  totalCommentsPosted: number;
  totalLikesGiven: number;
  totalLikesReceived: number;
  
  // Achievement stats
  totalAchievementsShared: number;
  totalMilestonesShared: number;
  
  // Leaderboard stats
  bestGlobalRank: number;
  currentGlobalRank: number;
  totalLeaderboardAppearances: number;
  
  // Challenge stats
  challengeWins: number;
  challengeTopThreeFinishes: number;
  challengeCompletionRate: number;
  
  // Calculated at
  lastCalculated: Date;
}

// Utility types for social features
export interface SocialSearchResult {
  type: 'user' | 'circle' | 'challenge';
  id: string;
  title: string;
  subtitle: string;
  avatar?: string;
  badge?: string;
  memberCount?: number;
  isJoined?: boolean;
}

export interface SocialFeed {
  posts: SocialPost[];
  hasMore: boolean;
  nextCursor?: string;
  lastUpdated: Date;
}

export interface CircleInvite {
  id: string;
  circleId: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface ChallengeInvite {
  id: string;
  challengeId: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}
