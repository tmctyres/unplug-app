import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all social routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/social/friends:
 *   get:
 *     summary: Get user's friends list
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Friends list retrieved successfully
 */
router.get('/friends', asyncHandler(async (req: Request, res: Response) => {
  // Mock implementation for now
  const friends = [
    {
      id: '1',
      username: 'friend1',
      displayName: 'Friend One',
      avatarUrl: null,
      status: 'accepted',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      username: 'friend2',
      displayName: 'Friend Two',
      avatarUrl: null,
      status: 'accepted',
      createdAt: new Date().toISOString(),
    },
  ];

  res.json({
    success: true,
    message: 'Friends list retrieved successfully',
    data: friends,
  });
}));

/**
 * @swagger
 * /api/social/friends/request:
 *   post:
 *     summary: Send friend request
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       201:
 *         description: Friend request sent successfully
 */
router.post('/friends/request', [
  body('username').isLength({ min: 3, max: 50 }).trim(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { username } = req.body;
  const userId = req.user!.id;

  // Mock implementation
  const friendRequest = {
    id: Date.now().toString(),
    requesterId: userId,
    addresseeUsername: username,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    message: 'Friend request sent successfully',
    data: friendRequest,
  });
}));

/**
 * @swagger
 * /api/social/friends/{requestId}/accept:
 *   put:
 *     summary: Accept friend request
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request accepted successfully
 */
router.put('/friends/:requestId/accept', [
  param('requestId').notEmpty(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { requestId } = req.params;
  const userId = req.user!.id;

  // Mock implementation
  const friendship = {
    id: requestId,
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    message: 'Friend request accepted successfully',
    data: friendship,
  });
}));

/**
 * @swagger
 * /api/social/friends/{requestId}/reject:
 *   put:
 *     summary: Reject friend request
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request rejected successfully
 */
router.put('/friends/:requestId/reject', [
  param('requestId').notEmpty(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { requestId } = req.params;

  res.json({
    success: true,
    message: 'Friend request rejected successfully',
  });
}));

/**
 * @swagger
 * /api/social/profile:
 *   get:
 *     summary: Get user's social profile
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Social profile retrieved successfully
 */
router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Mock implementation
  const profile = {
    userId,
    showInLeaderboards: true,
    allowFriendRequests: true,
    shareAchievements: true,
    friendsCount: 5,
    achievementsCount: 12,
    totalXP: 2500,
  };

  res.json({
    success: true,
    message: 'Social profile retrieved successfully',
    data: profile,
  });
}));

/**
 * @swagger
 * /api/social/profile:
 *   put:
 *     summary: Update user's social profile settings
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               showInLeaderboards:
 *                 type: boolean
 *               allowFriendRequests:
 *                 type: boolean
 *               shareAchievements:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Social profile updated successfully
 */
router.put('/profile', [
  body('showInLeaderboards').optional().isBoolean(),
  body('allowFriendRequests').optional().isBoolean(),
  body('shareAchievements').optional().isBoolean(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const userId = req.user!.id;
  const updates = req.body;

  // Mock implementation
  const updatedProfile = {
    userId,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    message: 'Social profile updated successfully',
    data: updatedProfile,
  });
}));

export default router;
