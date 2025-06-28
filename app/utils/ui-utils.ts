/**
 * Utility functions for common UI operations
 */

export class UIUtils {
  
  /**
   * Common emoji mappings for different categories
   */
  static readonly EMOJIS = {
    rarity: {
      'Common': '⚪',
      'Rare': '🔵',
      'Epic': '🟣',
      'Legendary': '🟡'
    },
    category: {
      'Time-based': '⏰',
      'Streak': '🔥',
      'Milestone': '🏁',
      'Level': '⭐',
      'Time of Day': '🌅',
      'Weekend': '🏖️',
      'Combo': '🎯',
      'Seasonal': '🌿'
    },
    feedback: {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      celebration: '🎉',
      achievement: '🏆',
      level_up: '⭐',
      streak: '🔥'
    }
  };

  /**
   * Common color schemes
   */
  static readonly COLORS = {
    level: {
      1: '#6B7280',   // Gray
      5: '#3B82F6',   // Blue
      10: '#8B5CF6',  // Purple
      20: '#F59E0B'   // Gold
    },
    rarity: {
      common: '#6B7280',
      rare: '#3B82F6',
      epic: '#8B5CF6',
      legendary: '#F59E0B'
    },
    status: {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    }
  };

  /**
   * Get emoji for a given category and type
   */
  static getEmoji(category: keyof typeof UIUtils.EMOJIS, type: string): string {
    return UIUtils.EMOJIS[category]?.[type] || '🎯';
  }

  /**
   * Get color for a given category and type
   */
  static getColor(category: keyof typeof UIUtils.COLORS, type: string | number): string {
    const colorMap = UIUtils.COLORS[category];
    if (typeof type === 'number' && category === 'level') {
      // For levels, find the highest threshold that the level meets
      const thresholds = Object.keys(colorMap).map(Number).sort((a, b) => b - a);
      for (const threshold of thresholds) {
        if (type >= threshold) {
          return colorMap[threshold];
        }
      }
      return colorMap[1]; // Default to level 1 color
    }

    // Handle different color map structures
    if (category === 'rarity') {
      return colorMap[type] || (colorMap as any).common || '#6B7280';
    }

    return colorMap[type] || '#6B7280';
  }

  /**
   * Format large numbers with appropriate suffixes
   */
  static formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  }

  /**
   * Format duration in minutes to human readable format
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Get time ago string from a date
   */
  static getTimeAgo(date: Date | string): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  }

  /**
   * Get time until a future date
   */
  static getTimeUntil(date: Date | string): string {
    const now = new Date();
    const future = new Date(date);
    const diffMs = future.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
    if (diffHours > 0) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} left`;
    return 'Expires soon';
  }

  /**
   * Capitalize first letter of a string
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get greeting message based on time of day
   */
  static getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning! 🌅";
    if (hour < 17) return "Good afternoon! ☀️";
    return "Good evening! 🌙";
  }

  /**
   * Generate a random ID
   */
  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Debounce function calls
   */
  static debounce(func: Function, wait: number): Function {
    let timeout: any;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle(func: Function, limit: number): Function {
    let inThrottle: boolean;
    return function(...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Check if a value is empty (null, undefined, empty string, empty array, empty object)
   */
  static isEmpty(value: any): boolean {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format percentage with proper rounding
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }
}
