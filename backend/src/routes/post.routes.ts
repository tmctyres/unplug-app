import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get community posts feed
 *     tags: [Posts]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, achievements, updates, discussions]
 *           default: all
 *     responses:
 *       200:
 *         description: Posts feed retrieved successfully
 */
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('offset').optional().isInt({ min: 0 }),
  query('type').optional().isIn(['all', 'achievements', 'updates', 'discussions']),
], optionalAuthMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const type = req.query.type as string || 'all';
  const userId = req.user?.id;

  // Mock implementation
  const posts = [
    {
      id: '1',
      type: 'achievement',
      content: 'Just reached level 10! 🎉',
      author: {
        id: 'user1',
        username: 'digitaldetoxer',
        displayName: 'Digital Detoxer',
        avatarUrl: null,
      },
      achievement: {
        id: 'ach1',
        title: 'Level Master',
        description: 'Reached level 10',
        icon: '🏆',
      },
      likesCount: 15,
      commentsCount: 3,
      isLikedByUser: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      type: 'update',
      content: 'Had a great 2-hour offline session today. Feeling refreshed! 🌟',
      author: {
        id: 'user2',
        username: 'mindfuluser',
        displayName: 'Mindful User',
        avatarUrl: null,
      },
      likesCount: 8,
      commentsCount: 1,
      isLikedByUser: true,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  res.json({
    success: true,
    message: 'Posts feed retrieved successfully',
    data: {
      posts,
      pagination: {
        limit,
        offset,
        total: 25,
        hasMore: offset + limit < 25,
      },
    },
  });
}));

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - type
 *             properties:
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [update, discussion]
 *               achievementId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Post created successfully
 */
router.post('/', [
  body('content').isLength({ min: 1, max: 500 }).trim(),
  body('type').isIn(['update', 'discussion', 'achievement']),
  body('achievementId').optional().notEmpty(),
], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { content, type, achievementId } = req.body;
  const userId = req.user!.id;

  // Mock implementation
  const post = {
    id: Date.now().toString(),
    type,
    content,
    authorId: userId,
    author: {
      id: userId,
      username: req.user!.username,
      displayName: req.user!.username,
      avatarUrl: null,
    },
    achievementId: achievementId || null,
    likesCount: 0,
    commentsCount: 0,
    isLikedByUser: false,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    data: post,
  });
}));

/**
 * @swagger
 * /api/posts/{postId}/like:
 *   post:
 *     summary: Like or unlike a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post like status updated successfully
 */
router.post('/:postId/like', [
  param('postId').notEmpty(),
], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { postId } = req.params;
  const userId = req.user!.id;

  // Mock implementation
  const isLiked = Math.random() > 0.5; // Random for demo
  const likesCount = Math.floor(Math.random() * 20) + 1;

  res.json({
    success: true,
    message: `Post ${isLiked ? 'liked' : 'unliked'} successfully`,
    data: {
      postId,
      isLiked,
      likesCount,
    },
  });
}));

/**
 * @swagger
 * /api/posts/{postId}/comments:
 *   get:
 *     summary: Get post comments
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Post comments retrieved successfully
 */
router.get('/:postId/comments', [
  param('postId').notEmpty(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('offset').optional().isInt({ min: 0 }),
], optionalAuthMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { postId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;

  // Mock implementation
  const comments = [
    {
      id: '1',
      content: 'Congratulations! That\'s awesome! 🎉',
      author: {
        id: 'user3',
        username: 'supporter',
        displayName: 'Supporter',
        avatarUrl: null,
      },
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ];

  res.json({
    success: true,
    message: 'Post comments retrieved successfully',
    data: {
      comments,
      pagination: {
        limit,
        offset,
        total: 1,
        hasMore: false,
      },
    },
  });
}));

/**
 * @swagger
 * /api/posts/{postId}/comments:
 *   post:
 *     summary: Add comment to post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 */
router.post('/:postId/comments', [
  param('postId').notEmpty(),
  body('content').isLength({ min: 1, max: 200 }).trim(),
], authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user!.id;

  // Mock implementation
  const comment = {
    id: Date.now().toString(),
    postId,
    content,
    authorId: userId,
    author: {
      id: userId,
      username: req.user!.username,
      displayName: req.user!.username,
      avatarUrl: null,
    },
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: comment,
  });
}));

export default router;
