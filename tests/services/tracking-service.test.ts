import { TrackingService } from '../../app/services/tracking-service';
import { mockApplicationSettings, mockDevice } from '../setup';

describe('TrackingService', () => {
  let trackingService: TrackingService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (TrackingService as any).instance = null;
    trackingService = TrackingService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TrackingService.getInstance();
      const instance2 = TrackingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Platform Detection', () => {
    it('should detect Android platform', () => {
      mockDevice.os = 'Android';
      const service = TrackingService.getInstance();
      expect(service.getTrackingMode()).toBe('automatic');
    });

    it('should detect iOS platform', () => {
      mockDevice.os = 'iOS';
      // Reset singleton to test iOS behavior
      (TrackingService as any).instance = null;
      const service = TrackingService.getInstance();
      expect(service.getTrackingMode()).toBe('manual');
    });
  });

  describe('Manual Session Management', () => {
    it('should start a manual session successfully', () => {
      const result = trackingService.startManualSession();
      expect(result).toBe(true);
      expect(trackingService.isSessionActive()).toBe(true);
    });

    it('should not start a session if one is already active', () => {
      trackingService.startManualSession();
      const result = trackingService.startManualSession();
      expect(result).toBe(false);
    });

    it('should end a manual session and return session data', () => {
      trackingService.startManualSession();
      
      // Mock some time passing
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
      
      const session = trackingService.endManualSession();
      expect(session).toBeTruthy();
      expect(session?.isActive).toBe(false);
      expect(trackingService.isSessionActive()).toBe(false);
    });

    it('should return null when ending a session that is not active', () => {
      const session = trackingService.endManualSession();
      expect(session).toBeNull();
    });
  });

  describe('Duration Formatting', () => {
    it('should format minutes correctly', () => {
      expect(trackingService.formatDuration(30)).toBe('30m');
      expect(trackingService.formatDuration(45)).toBe('45m');
    });

    it('should format hours and minutes correctly', () => {
      expect(trackingService.formatDuration(60)).toBe('1h');
      expect(trackingService.formatDuration(90)).toBe('1h 30m');
      expect(trackingService.formatDuration(120)).toBe('2h');
    });

    it('should format days and hours correctly', () => {
      expect(trackingService.formatDuration(1440)).toBe('1d'); // 24 hours
      expect(trackingService.formatDuration(1500)).toBe('1d 1h'); // 25 hours
      expect(trackingService.formatDuration(2880)).toBe('2d'); // 48 hours
    });
  });

  describe('Session Events', () => {
    it('should emit sessionStarted event when starting a session', () => {
      const mockCallback = jest.fn();
      trackingService.on('propertyChange', mockCallback);
      
      trackingService.startManualSession();
      
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyName: 'sessionStarted',
          value: expect.objectContaining({
            isActive: true,
            duration: 0
          })
        })
      );
    });

    it('should emit sessionCompleted event when ending a long session', () => {
      const mockCallback = jest.fn();
      trackingService.on('propertyChange', mockCallback);
      
      trackingService.startManualSession();
      
      // Mock 6 minutes passing (minimum session length is 5 minutes)
      const originalDate = Date;
      const mockDate = jest.fn(() => ({
        getTime: () => originalDate.now() + 6 * 60 * 1000
      }));
      global.Date = mockDate as any;
      
      trackingService.endManualSession();
      
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyName: 'sessionCompleted'
        })
      );
      
      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('Current Session', () => {
    it('should return current session when active', () => {
      trackingService.startManualSession();
      const session = trackingService.getCurrentSession();
      
      expect(session).toBeTruthy();
      expect(session?.isActive).toBe(true);
    });

    it('should return null when no session is active', () => {
      const session = trackingService.getCurrentSession();
      expect(session).toBeNull();
    });
  });
});

// Setup fake timers for testing
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});
