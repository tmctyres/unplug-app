import { Observable } from '@nativescript/core';

/**
 * Base view model class that provides common functionality for all view models
 */
export abstract class BaseViewModel extends Observable {
  
  constructor() {
    super();
  }

  /**
   * Show a success message to the user
   */
  protected showSuccess(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'success', message });
  }

  /**
   * Show an error message to the user
   */
  protected showError(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'error', message });
  }

  /**
   * Show an info message to the user
   */
  protected showInfo(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'info', message });
  }

  /**
   * Show a warning message to the user
   */
  protected showWarning(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'warning', message });
  }

  /**
   * Navigate back to the previous page
   */
  protected navigateBack(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  /**
   * Navigate to a specific page
   */
  protected navigateTo(moduleName: string, context?: any, clearHistory: boolean = false): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate({
      moduleName,
      context,
      clearHistory
    });
  }

  /**
   * Show a confirmation dialog
   */
  protected async showConfirmDialog(
    title: string, 
    message: string, 
    okButtonText: string = 'OK', 
    cancelButtonText: string = 'Cancel'
  ): Promise<boolean> {
    const { Dialogs } = require('@nativescript/core');
    return await Dialogs.confirm({
      title,
      message,
      okButtonText,
      cancelButtonText
    });
  }

  /**
   * Show an alert dialog
   */
  protected async showAlert(
    title: string, 
    message: string, 
    okButtonText: string = 'OK'
  ): Promise<void> {
    const { Dialogs } = require('@nativescript/core');
    await Dialogs.alert({
      title,
      message,
      okButtonText
    });
  }

  /**
   * Format duration in minutes to human readable format
   */
  protected formatDuration(minutes: number): string {
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
   * Format a number with thousands separator
   */
  protected formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  }

  /**
   * Get time ago string from a date
   */
  protected getTimeAgo(date: Date | string): string {
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
   * Get level badge color based on level
   */
  protected getLevelBadgeColor(level: number): string {
    if (level >= 20) return '#F59E0B'; // Gold
    if (level >= 10) return '#8B5CF6'; // Purple
    if (level >= 5) return '#3B82F6';  // Blue
    return '#6B7280'; // Gray
  }

  /**
   * Get rarity color for achievements
   */
  protected getRarityColor(rarity: string): string {
    const colors = {
      common: '#6B7280',
      rare: '#3B82F6',
      epic: '#8B5CF6',
      legendary: '#F59E0B'
    };
    return colors[rarity.toLowerCase()] || colors.common;
  }

  /**
   * Capitalize first letter of a string
   */
  protected capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Debounce function calls
   */
  protected debounce(func: Function, wait: number): Function {
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
   * Safe property setter that only updates if value changed
   */
  protected safeSet(propertyName: string, value: any): void {
    const currentValue = this.get(propertyName);
    if (currentValue !== value) {
      this.set(propertyName, value);
    }
  }

  /**
   * Cleanup method to be called when view model is destroyed
   */
  public cleanup(): void {
    // Override in subclasses to perform cleanup
  }
}
