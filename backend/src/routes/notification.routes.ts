import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all notification routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user's notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('offset').optional().isInt({ min: 0 }),
  query('unreadOnly').optional().isBoolean(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const userId = req.user!.id;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const unreadOnly = req.query.unreadOnly === 'true';

  // Mock implementation
  const notifications = [
    {
      id: '1',
      type: 'friend_request',
      title: 'New Friend Request',
      message: 'digitaldetoxer sent you a friend request',
      data: {
        requesterId: 'user1',
        requesterUsername: 'digitaldetoxer',
      },
      isRead: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      type: 'achievement_like',
      title: 'Achievement Liked',
      message: 'mindfuluser liked your achievement "Level Master"',
      data: {
        achievementId: 'ach1',
        likerId: 'user2',
        likerUsername: 'mindfuluser',
      },
      isRead: true,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '3',
      type: 'leaderboard_rank',
      title: 'Leaderboard Update',
      message: 'You moved up to rank #5 in Weekly XP!',
      data: {
        leaderboardId: 'weekly_xp',
        newRank: 5,
        oldRank: 8,
      },
      isRead: false,
      createdAt: new Date(Date.now() - 10800000).toISOString(),
    },
  ];

  const filteredNotifications = unreadOnly 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  res.json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: {
      notifications: filteredNotifications.slice(offset, offset + limit),
      pagination: {
        limit,
        offset,
        total: filteredNotifications.length,
        hasMore: offset + limit < filteredNotifications.length,
      },
      unreadCount: notifications.filter(n => !n.isRead).length,
    },
  });
}));

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 */
router.put('/:notificationId/read', [
  param('notificationId').notEmpty(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { notificationId } = req.params;
  const userId = req.user!.id;

  // Mock implementation
  const notification = {
    id: notificationId,
    isRead: true,
    readAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    message: 'Notification marked as read successfully',
    data: notification,
  });
}));

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 */
router.put('/read-all', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Mock implementation
  const result = {
    markedAsRead: 3,
    timestamp: new Date().toISOString(),
  };

  res.json({
    success: true,
    message: 'All notifications marked as read successfully',
    data: result,
  });
}));

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 */
router.delete('/:notificationId', [
  param('notificationId').notEmpty(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { notificationId } = req.params;
  const userId = req.user!.id;

  res.json({
    success: true,
    message: 'Notification deleted successfully',
  });
}));

/**
 * @swagger
 * /api/notifications/settings:
 *   get:
 *     summary: Get notification settings
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification settings retrieved successfully
 */
router.get('/settings', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Mock implementation
  const settings = {
    friendRequests: true,
    achievementLikes: true,
    leaderboardUpdates: true,
    postComments: true,
    weeklyReports: true,
    pushNotifications: true,
    emailNotifications: false,
  };

  res.json({
    success: true,
    message: 'Notification settings retrieved successfully',
    data: settings,
  });
}));

/**
 * @swagger
 * /api/notifications/settings:
 *   put:
 *     summary: Update notification settings
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               friendRequests:
 *                 type: boolean
 *               achievementLikes:
 *                 type: boolean
 *               leaderboardUpdates:
 *                 type: boolean
 *               postComments:
 *                 type: boolean
 *               weeklyReports:
 *                 type: boolean
 *               pushNotifications:
 *                 type: boolean
 *               emailNotifications:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Notification settings updated successfully
 */
router.put('/settings', [
  body('friendRequests').optional().isBoolean(),
  body('achievementLikes').optional().isBoolean(),
  body('leaderboardUpdates').optional().isBoolean(),
  body('postComments').optional().isBoolean(),
  body('weeklyReports').optional().isBoolean(),
  body('pushNotifications').optional().isBoolean(),
  body('emailNotifications').optional().isBoolean(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const userId = req.user!.id;
  const updates = req.body;

  // Mock implementation
  const updatedSettings = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    message: 'Notification settings updated successfully',
    data: updatedSettings,
  });
}));

export default router;
