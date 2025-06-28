# Unplug Social Backend

## Overview

This is the backend service for Unplug's social features, providing real-time leaderboards, community features, achievement sharing, and social interactions.

## Architecture

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with Socket.IO for real-time features
- **Database**: PostgreSQL with Redis for caching
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3 or compatible service
- **Real-time**: WebSocket connections via Socket.IO
- **API Documentation**: OpenAPI/Swagger

### Core Services
1. **User Service** - Authentication and profile management
2. **Social Service** - Friends, followers, and social connections
3. **Leaderboard Service** - Real-time rankings and competitions
4. **Achievement Service** - Achievement sharing and social validation
5. **Community Service** - Posts, comments, and social interactions
6. **Notification Service** - Real-time notifications and push messages
7. **Moderation Service** - Content moderation and safety

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW()
);
```

### Social Profiles Table
```sql
CREATE TABLE social_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    show_in_leaderboards BOOLEAN DEFAULT TRUE,
    allow_friend_requests BOOLEAN DEFAULT TRUE,
    share_achievements BOOLEAN DEFAULT TRUE,
    share_progress BOOLEAN DEFAULT FALSE,
    friends_count INTEGER DEFAULT 0,
    circles_count INTEGER DEFAULT 0,
    achievements_shared INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Friendships Table
```sql
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);
```

### Leaderboards Table
```sql
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    timeframe VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    max_entries INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Leaderboard Entries Table
```sql
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value DECIMAL(10,2) NOT NULL,
    rank INTEGER,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(leaderboard_id, user_id)
);
```

### Posts Table
```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    content TEXT NOT NULL,
    image_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    allow_comments BOOLEAN DEFAULT TRUE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    achievement_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Comments Table
```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Likes Table
```sql
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment', 'achievement')),
    target_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);
```

### Achievements Table
```sql
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    value DECIMAL(10,2),
    unit VARCHAR(20),
    unlocked_at TIMESTAMP NOT NULL,
    is_shared BOOLEAN DEFAULT FALSE,
    share_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(50),
    from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_id UUID,
    target_type VARCHAR(50),
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile

### Social Features
- `GET /api/social/profile/:userId` - Get user profile
- `PUT /api/social/profile` - Update user profile
- `GET /api/social/friends` - Get friends list
- `POST /api/social/friends/request` - Send friend request
- `PUT /api/social/friends/:friendshipId/accept` - Accept friend request
- `DELETE /api/social/friends/:friendshipId` - Remove friend/decline request

### Leaderboards
- `GET /api/leaderboards` - Get all leaderboards
- `GET /api/leaderboards/:id` - Get specific leaderboard
- `GET /api/leaderboards/:id/entries` - Get leaderboard entries
- `POST /api/leaderboards/:id/entries` - Submit user score
- `GET /api/leaderboards/user/:userId/ranks` - Get user's ranks across leaderboards

### Posts & Community
- `GET /api/posts` - Get community posts feed
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get specific post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `GET /api/posts/:id/comments` - Get post comments
- `POST /api/posts/:id/comments` - Add comment to post

### Achievements
- `GET /api/achievements` - Get user achievements
- `POST /api/achievements` - Submit new achievement
- `POST /api/achievements/:id/share` - Share achievement
- `GET /api/achievements/shared` - Get shared achievements feed
- `POST /api/achievements/:id/like` - Like shared achievement

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification

## Real-time Features

### WebSocket Events
- `user:online` - User comes online
- `user:offline` - User goes offline
- `leaderboard:updated` - Leaderboard rankings change
- `achievement:shared` - New achievement shared
- `post:created` - New community post
- `comment:added` - New comment on post
- `notification:new` - New notification for user
- `friend:request` - New friend request
- `friend:accepted` - Friend request accepted

## Security Features

### Authentication & Authorization
- JWT tokens with short expiration (15 minutes)
- Refresh tokens with longer expiration (7 days)
- Role-based access control (user, moderator, admin)
- Rate limiting on all endpoints
- Input validation and sanitization

### Data Protection
- Encrypted sensitive data at rest
- HTTPS only communication
- CORS configuration for frontend domains
- SQL injection prevention with parameterized queries
- XSS protection with content sanitization

### Privacy Controls
- User privacy settings enforcement
- Content visibility controls
- Data anonymization options
- GDPR compliance features
- User data export/deletion

## Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/unplug_social
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=unplug-assets
PUSH_NOTIFICATION_KEY=your-push-key
```

### Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Scaling Considerations
- Horizontal scaling with load balancer
- Database read replicas for performance
- Redis cluster for session management
- CDN for static assets
- Background job processing with Bull/Agenda
- Monitoring with Prometheus/Grafana

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## API Documentation

Once running, API documentation is available at:
- Development: http://localhost:3000/api-docs
- Production: https://api.unplug.app/api-docs
