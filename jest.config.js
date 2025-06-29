module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/app', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true
      }
    }]
  },
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/app/$1',
    '^@/(.*)$': '<rootDir>/app/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'app/**/*.ts',
    '!app/**/*.d.ts',
    '!app/app.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Fix async leaks and improve test performance
  testTimeout: 10000,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  // Reduce console noise
  silent: false,
  verbose: false,
  setupFiles: ['<rootDir>/tests/jest-console-setup.ts']
};
