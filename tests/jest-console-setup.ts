/**
 * Jest Console Setup
 * Reduces console noise during testing by filtering out expected messages
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

// Messages to suppress during tests
const suppressedMessages = [
  'Receipt Validation: Validating iOS receipt',
  'Receipt Validation: Server request failed',
  'Receipt Validation: Falling back to local validation',
  'Receipt Validation: Performing local validation (demo mode)',
  'Real Monetization Service: Initialized successfully',
  'Real Monetization Service: Using fallback products',
  'Test environment detected - skipping platform-specific setup',
  'Level up!'
];

// Helper function to check if message should be suppressed
const shouldSuppressMessage = (message: string): boolean => {
  return suppressedMessages.some(suppressedMsg => 
    message.includes(suppressedMsg)
  );
};

// Override console methods to filter noise
console.log = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldSuppressMessage(message)) {
    originalConsole.log(...args);
  }
};

console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldSuppressMessage(message)) {
    originalConsole.error(...args);
  }
};

console.warn = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldSuppressMessage(message)) {
    originalConsole.warn(...args);
  }
};

console.info = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldSuppressMessage(message)) {
    originalConsole.info(...args);
  }
};

// Export original console for tests that need it
export { originalConsole };
