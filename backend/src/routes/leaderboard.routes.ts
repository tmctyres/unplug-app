import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { LeaderboardService } from '../services/leaderboard.service';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const leaderboardService = LeaderboardService.getInstance();

/**
 * @swagger
 * /api/leaderboards:
 *   get:
 *     summary: Get all available leaderboards
 *     tags: [Leaderboards]
 *     responses:
 *       200:
 *         description: Leaderboards retrieved successfully
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const leaderboards = await leaderboardService.getLeaderboards();

  res.json({
    success: true,
    message: 'Leaderboards retrieved successfully',
    data: leaderboards,
  });
}));

/**
 * @swagger
 * /api/leaderboards/{leaderboardId}/entries:
 *   get:
 *     summary: Get leaderboard entries
 *     tags: [Leaderboards]
 *     parameters:
 *       - in: path
 *         name: leaderboardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Leaderboard entries retrieved successfully
 */
router.get('/:leaderboardId/entries', [
  param('leaderboardId').notEmpty(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
], optionalAuthMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { leaderboardId } = req.params;
  const limit = parseInt(req.query['limit'] as string) || 50;
  const offset = parseInt(req.query['offset'] as string) || 0;
  const userId = req.user?.id;

  const entries = await leaderboardService.getLeaderboardEntries(
    leaderboardId,
    limit,
    offset,
    userId
  );

  res.json({
    success: true,
    message: 'Leaderboard entries retrieved successfully',
    data: entries,
  });
}));

/**
 * @swagger
 * /api/leaderboards/{leaderboardId}/entries:
 *   post:
 *     summary: Submit score to leaderboard
 *     tags: [Leaderboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leaderboardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: number
 *               isAnonymous:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Score submitted successfully
 */
router.post('/:leaderboardId/entries', [
  param('leaderboardId').notEmpty(),
  body('value').isNumeric(),
  body('isAnonymous').optional().isBoolean(),
], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { leaderboardId } = req.params;
  const { value, isAnonymous = false } = req.body;
  const userId = req.user!.id;

  const entry = await leaderboardService.submitScore(
    leaderboardId,
    userId,
    parseFloat(value),
    isAnonymous
  );

  res.status(201).json({
    success: true,
    message: 'Score submitted successfully',
    data: entry,
  });
}));

/**
 * @swagger
 * /api/leaderboards/user/{userId}/ranks:
 *   get:
 *     summary: Get user's ranks across all leaderboards
 *     tags: [Leaderboards]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User ranks retrieved successfully
 */
router.get('/user/:userId/ranks', [
  param('userId').notEmpty(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { userId } = req.params;

  const ranks = await leaderboardService.getUserRanks(userId);

  res.json({
    success: true,
    message: 'User ranks retrieved successfully',
    data: ranks,
  });
}));

/**
 * @swagger
 * /api/leaderboards/{leaderboardId}/user/{userId}/rank:
 *   get:
 *     summary: Get user's rank in specific leaderboard
 *     tags: [Leaderboards]
 *     parameters:
 *       - in: path
 *         name: leaderboardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User rank retrieved successfully
 */
router.get('/:leaderboardId/user/:userId/rank', [
  param('leaderboardId').notEmpty(),
  param('userId').notEmpty(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { leaderboardId, userId } = req.params;

  const rank = await leaderboardService.getUserRank(leaderboardId, userId);

  res.json({
    success: true,
    message: 'User rank retrieved successfully',
    data: rank,
  });
}));

export default router;
