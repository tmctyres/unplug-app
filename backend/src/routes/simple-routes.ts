import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Unplug Social Backend is running'
  });
});

// Mock auth endpoints
router.post('/auth/register', asyncHandler(async (req: Request, res: Response) => {
  const { username, email } = req.body;
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: { id: Date.now().toString(), username, email },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token'
    }
  });
}));

router.post('/auth/login', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: { id: Date.now().toString(), username: 'testuser', email },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token'
    }
  });
}));

// Mock leaderboards
router.get('/leaderboards', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: 'weekly_xp',
        name: 'Weekly XP',
        type: 'xp',
        category: 'weekly',
        timeframe: 'week'
      },
      {
        id: 'monthly_sessions',
        name: 'Monthly Sessions',
        type: 'sessions',
        category: 'monthly', 
        timeframe: 'month'
      }
    ]
  });
}));

router.get('/leaderboards/:id/entries', optionalAuthMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  res.json({
    success: true,
    data: [
      {
        id: '1',
        leaderboardId: id,
        userId: 'user1',
        username: 'topuser',
        displayName: 'Top User',
        value: 2500,
        rank: 1,
        isAnonymous: false
      },
      {
        id: '2', 
        leaderboardId: id,
        userId: 'user2',
        username: 'seconduser',
        displayName: 'Second User',
        value: 2000,
        rank: 2,
        isAnonymous: false
      }
    ]
  });
}));

// Mock achievements
router.get('/achievements/shared', optionalAuthMiddleware, asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        userId: 'user1',
        achievementType: 'level_up',
        title: 'Level Master',
        description: 'Reached level 10',
        icon: '🏆',
        value: 10,
        unit: 'level',
        isShared: true,
        shareCount: 5,
        likesCount: 12,
        user: {
          username: 'achiever',
          displayName: 'The Achiever',
          avatarUrl: null,
          isVerified: false
        },
        isLikedByUser: false,
        createdAt: new Date().toISOString()
      }
    ]
  });
}));

// Mock social endpoints
router.get('/social/friends', authMiddleware, asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        username: 'friend1',
        displayName: 'Friend One',
        status: 'accepted',
        createdAt: new Date().toISOString()
      }
    ]
  });
}));

// Mock posts
router.get('/posts', optionalAuthMiddleware, asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      posts: [
        {
          id: '1',
          type: 'achievement',
          content: 'Just reached level 10! 🎉',
          author: {
            id: 'user1',
            username: 'achiever',
            displayName: 'The Achiever'
          },
          likesCount: 15,
          commentsCount: 3,
          isLikedByUser: false,
          createdAt: new Date().toISOString()
        }
      ],
      pagination: {
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false
      }
    }
  });
}));

// Mock notifications
router.get('/notifications', authMiddleware, asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      notifications: [
        {
          id: '1',
          type: 'friend_request',
          title: 'New Friend Request',
          message: 'Someone sent you a friend request',
          isRead: false,
          createdAt: new Date().toISOString()
        }
      ],
      pagination: {
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false
      },
      unreadCount: 1
    }
  });
}));

export default router;
