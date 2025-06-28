import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AchievementService } from '../services/achievement.service';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const achievementService = AchievementService.getInstance();

/**
 * @swagger
 * /api/achievements:
 *   post:
 *     summary: Submit a new achievement
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - achievementType
 *               - title
 *               - description
 *               - value
 *             properties:
 *               achievementType:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *               value:
 *                 type: number
 *               unit:
 *                 type: string
 *     responses:
 *       201:
 *         description: Achievement submitted successfully
 */
router.post('/', [
  body('achievementType').isLength({ min: 1, max: 100 }).trim(),
  body('title').isLength({ min: 1, max: 200 }).trim(),
  body('description').isLength({ min: 1, max: 500 }).trim(),
  body('icon').optional().isLength({ max: 10 }).trim(),
  body('value').isNumeric(),
  body('unit').optional().isLength({ max: 50 }).trim(),
], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const userId = req.user!.id;
  const achievementData = {
    ...req.body,
    userId,
  };

  // Mock implementation for now
  const achievement = {
    id: Date.now().toString(),
    ...achievementData,
    isShared: false,
    shareCount: 0,
    likesCount: 0,
    createdAt: new Date(),
  };

  res.status(201).json({
    success: true,
    message: 'Achievement submitted successfully',
    data: achievement,
  });
}));

/**
 * @swagger
 * /api/achievements/{achievementId}/share:
 *   post:
 *     summary: Share an achievement
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: achievementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Achievement shared successfully
 */
router.post('/:achievementId/share', [
  param('achievementId').notEmpty(),
], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { achievementId } = req.params;
  const userId = req.user!.id;

  const result = await achievementService.shareAchievement(achievementId, userId);

  res.json({
    success: true,
    message: 'Achievement shared successfully',
    data: result,
  });
}));

/**
 * @swagger
 * /api/achievements/shared:
 *   get:
 *     summary: Get shared achievements feed
 *     tags: [Achievements]
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
 *     responses:
 *       200:
 *         description: Shared achievements retrieved successfully
 */
router.get('/shared', [
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('offset').optional().isInt({ min: 0 }),
], optionalAuthMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const limit = parseInt(req.query['limit'] as string) || 20;
  const offset = parseInt(req.query['offset'] as string) || 0;
  const userId = req.user?.id;

  const achievements = await achievementService.getSharedAchievements(limit, offset, userId);

  res.json({
    success: true,
    message: 'Shared achievements retrieved successfully',
    data: achievements,
  });
}));

/**
 * @swagger
 * /api/achievements/{achievementId}/like:
 *   post:
 *     summary: Like or unlike an achievement
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: achievementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Achievement like status updated successfully
 */
router.post('/:achievementId/like', [
  param('achievementId').notEmpty(),
], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { achievementId } = req.params;
  const userId = req.user!.id;

  const result = await achievementService.toggleLike(achievementId, userId);

  res.json({
    success: true,
    message: `Achievement ${result.isLiked ? 'liked' : 'unliked'} successfully`,
    data: result,
  });
}));

/**
 * @swagger
 * /api/achievements/user/{userId}:
 *   get:
 *     summary: Get user's achievements
 *     tags: [Achievements]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: User achievements retrieved successfully
 */
router.get('/user/:userId', [
  param('userId').notEmpty(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('offset').optional().isInt({ min: 0 }),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { userId } = req.params;
  const limit = parseInt(req.query['limit'] as string) || 20;
  const offset = parseInt(req.query['offset'] as string) || 0;

  const achievements = await achievementService.getUserAchievements(userId, limit, offset);

  res.json({
    success: true,
    message: 'User achievements retrieved successfully',
    data: achievements,
  });
}));

/**
 * @swagger
 * /api/achievements/{achievementId}:
 *   get:
 *     summary: Get achievement details
 *     tags: [Achievements]
 *     parameters:
 *       - in: path
 *         name: achievementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Achievement details retrieved successfully
 */
router.get('/:achievementId', [
  param('achievementId').notEmpty(),
], optionalAuthMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { achievementId } = req.params;
  const userId = req.user?.id;

  const achievement = await achievementService.getAchievementById(achievementId, userId);

  res.json({
    success: true,
    message: 'Achievement details retrieved successfully',
    data: achievement,
  });
}));

export default router;
