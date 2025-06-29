import { Logger } from '../../src/utils/logger';

describe('Logger Utility', () => {
  beforeEach(() => {
    // Clear any previous calls
    jest.clearAllMocks();
  });

  describe('Logger Instance', () => {
    it('should be defined', () => {
      expect(Logger).toBeDefined();
    });

    it('should have required logging methods', () => {
      expect(typeof Logger.info).toBe('function');
      expect(typeof Logger.error).toBe('function');
      expect(typeof Logger.warn).toBe('function');
      expect(typeof Logger.debug).toBe('function');
    });

    it('should log info messages', () => {
      const spy = jest.spyOn(Logger, 'info');
      Logger.info('Test info message');
      expect(spy).toHaveBeenCalledWith('Test info message');
    });

    it('should log error messages', () => {
      const spy = jest.spyOn(Logger, 'error');
      Logger.error('Test error message');
      expect(spy).toHaveBeenCalledWith('Test error message');
    });

    it('should log warning messages', () => {
      const spy = jest.spyOn(Logger, 'warn');
      Logger.warn('Test warning message');
      expect(spy).toHaveBeenCalledWith('Test warning message');
    });

    it('should log debug messages', () => {
      const spy = jest.spyOn(Logger, 'debug');
      Logger.debug('Test debug message');
      expect(spy).toHaveBeenCalledWith('Test debug message');
    });
  });

  describe('Logger Configuration', () => {
    it('should have correct service metadata', () => {
      expect(Logger.defaultMeta).toEqual({ service: 'unplug-backend' });
    });

    it('should have appropriate log level', () => {
      expect(Logger.level).toBeDefined();
      expect(typeof Logger.level).toBe('string');
    });
  });
});
