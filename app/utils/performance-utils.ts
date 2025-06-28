/**
 * Performance optimization utilities
 */

export class PerformanceUtils {
  private static memoCache = new Map<string, { value: any; timestamp: number; ttl: number }>();
  private static observerPool = new Set<any>();

  /**
   * Memoize function results with TTL (time to live)
   */
  static memoize<T extends (...args: any[]) => any>(
    fn: T,
    ttl: number = 60000, // 1 minute default
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      const cached = this.memoCache.get(key);
      
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.value;
      }
      
      const result = fn(...args);
      this.memoCache.set(key, {
        value: result,
        timestamp: Date.now(),
        ttl
      });
      
      return result;
    }) as T;
  }

  /**
   * Clear memoization cache
   */
  static clearMemoCache(): void {
    this.memoCache.clear();
  }

  /**
   * Clear expired memoization entries
   */
  static cleanupMemoCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.memoCache.entries()) {
      if (now - cached.timestamp >= cached.ttl) {
        this.memoCache.delete(key);
      }
    }
  }

  /**
   * Debounce function with automatic cleanup
   */
  static debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
    immediate: boolean = false
  ): T & { cancel: () => void } {
    let timeoutId: any;
    let lastArgs: Parameters<T>;
    
    const debounced = ((...args: Parameters<T>): void => {
      lastArgs = args;
      
      if (immediate && !timeoutId) {
        fn(...args);
      }
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (!immediate) {
          fn(...lastArgs);
        }
      }, delay);
    }) as T & { cancel: () => void };
    
    debounced.cancel = () => {
      clearTimeout(timeoutId);
      timeoutId = null;
    };
    
    return debounced;
  }

  /**
   * Throttle function with automatic cleanup
   */
  static throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number
  ): T & { cancel: () => void } {
    let inThrottle: boolean = false;
    let lastArgs: Parameters<T>;
    let timeoutId: any;
    
    const throttled = ((...args: Parameters<T>): void => {
      lastArgs = args;
      
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        
        timeoutId = setTimeout(() => {
          inThrottle = false;
          if (lastArgs) {
            throttled(...lastArgs);
            lastArgs = null as any;
          }
        }, limit);
      }
    }) as T & { cancel: () => void };
    
    throttled.cancel = () => {
      clearTimeout(timeoutId);
      inThrottle = false;
      lastArgs = null as any;
    };
    
    return throttled;
  }

  /**
   * Lazy initialization wrapper
   */
  static lazy<T>(factory: () => T): () => T {
    let instance: T;
    let initialized = false;
    
    return () => {
      if (!initialized) {
        instance = factory();
        initialized = true;
      }
      return instance;
    };
  }

  /**
   * Batch operations to reduce UI updates
   */
  static batch<T>(operations: (() => T)[]): T[] {
    const results: T[] = [];
    
    // Disable UI updates during batch
    const originalNotify = (global as any).notifyPropertyChange;
    const pendingNotifications: any[] = [];
    
    (global as any).notifyPropertyChange = (obj: any, propertyName: string, value: any) => {
      pendingNotifications.push({ obj, propertyName, value });
    };
    
    try {
      // Execute all operations
      for (const operation of operations) {
        results.push(operation());
      }
    } finally {
      // Restore original notify and flush pending notifications
      (global as any).notifyPropertyChange = originalNotify;
      
      // Group notifications by object to reduce updates
      const groupedNotifications = new Map();
      for (const notification of pendingNotifications) {
        if (!groupedNotifications.has(notification.obj)) {
          groupedNotifications.set(notification.obj, []);
        }
        groupedNotifications.get(notification.obj).push(notification);
      }
      
      // Send grouped notifications
      for (const [obj, notifications] of groupedNotifications) {
        for (const notification of notifications) {
          if (originalNotify) {
            originalNotify.call(obj, notification.propertyName, notification.value);
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Object pool for reusing objects
   */
  static createObjectPool<T>(
    factory: () => T,
    reset: (obj: T) => void,
    maxSize: number = 10
  ) {
    const pool: T[] = [];
    
    return {
      acquire(): T {
        if (pool.length > 0) {
          return pool.pop()!;
        }
        return factory();
      },
      
      release(obj: T): void {
        if (pool.length < maxSize) {
          reset(obj);
          pool.push(obj);
        }
      },
      
      clear(): void {
        pool.length = 0;
      }
    };
  }

  /**
   * Efficient array operations
   */
  static arrayUtils = {
    /**
     * Fast array deduplication using Set
     */
    unique<T>(array: T[]): T[] {
      return Array.from(new Set(array));
    },
    
    /**
     * Fast array intersection
     */
    intersect<T>(arr1: T[], arr2: T[]): T[] {
      const set2 = new Set(arr2);
      return arr1.filter(item => set2.has(item));
    },
    
    /**
     * Fast array difference
     */
    difference<T>(arr1: T[], arr2: T[]): T[] {
      const set2 = new Set(arr2);
      return arr1.filter(item => !set2.has(item));
    },
    
    /**
     * Chunk array into smaller arrays
     */
    chunk<T>(array: T[], size: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    }
  };

  /**
   * Memory usage monitoring
   */
  static memoryUtils = {
    /**
     * Get memory usage information (if available)
     */
    getMemoryInfo(): any {
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        return {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        };
      }
      return null;
    },
    
    /**
     * Force garbage collection (if available)
     */
    forceGC(): void {
      if (typeof global !== 'undefined' && (global as any).gc) {
        (global as any).gc();
      }
    }
  };

  /**
   * Cleanup utilities
   */
  static cleanup = {
    /**
     * Register cleanup function to be called on app exit
     */
    onExit(fn: () => void): void {
      if (typeof process !== 'undefined') {
        process.on('exit', fn);
        process.on('SIGINT', fn);
        process.on('SIGTERM', fn);
      }
    },
    
    /**
     * Clean up all performance utilities
     */
    cleanupAll(): void {
      this.clearMemoCache();
      this.cleanupMemoCache();
      this.observerPool.clear();
    }
  };
}
