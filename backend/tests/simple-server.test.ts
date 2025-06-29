import request from 'supertest';
import express from 'express';
import { createServer } from 'http';

// Mock the simple-server module
let app: express.Application;
let server: any;

beforeAll(async () => {
  // Import and create the simple server
  const { createSimpleServer } = await import('../src/simple-server');
  app = createSimpleServer();
  server = createServer(app);
});

afterAll(async () => {
  if (server) {
    server.close();
  }
});

describe('Simple Backend Server', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Root Endpoint', () => {
    it('should return server info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('API Endpoints', () => {
    describe('Leaderboards', () => {
      it('should return leaderboards list', async () => {
        const response = await request(app)
          .get('/api/leaderboards')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should return leaderboard entries', async () => {
        const response = await request(app)
          .get('/api/leaderboards/weekly/entries')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('Achievements', () => {
      it('should return shared achievements', async () => {
        const response = await request(app)
          .get('/api/achievements/shared')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('Posts', () => {
      it('should return community posts', async () => {
        const response = await request(app)
          .get('/api/posts')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('posts');
        expect(Array.isArray(response.body.data.posts)).toBe(true);
      });
    });

    describe('Authentication', () => {
      it('should handle user registration', async () => {
        const userData = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
        expect(response.body.data).toHaveProperty('user');
      });

      it('should handle user login', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
        expect(response.body.data).toHaveProperty('user');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-credentials');
    });
  });
});
