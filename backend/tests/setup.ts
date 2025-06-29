// Test setup for backend
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for testing
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3001';
process.env['JWT_SECRET'] = 'test-jwt-secret';
process.env['JWT_REFRESH_SECRET'] = 'test-jwt-refresh-secret';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_db';
process.env['REDIS_URL'] = 'redis://localhost:6379/1';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console.log in tests unless explicitly needed
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test timeout
jest.setTimeout(10000);

// Mock external services
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    }),
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    disconnect: jest.fn().mockResolvedValue(undefined)
  }));
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  })
}));

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 200 })
}));

// Export test utilities
export const mockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ...overrides
});

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = jest.fn();
