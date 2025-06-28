import { Observable, Application } from '@nativescript/core';
import { UserDataService } from '../models/user-data';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  gradient: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  category: 'default' | 'nature' | 'ocean' | 'sunset' | 'seasonal' | 'minimal';
  colors: ThemeColors;
  isDark: boolean;
  isSeasonalLimited?: boolean;
  availableFrom?: Date;
  availableTo?: Date;
}

export class ThemeService extends Observable {
  private static instance: ThemeService;
  private userDataService: UserDataService;
  private currentThemeId: string = 'default_light';
  private availableThemes: Theme[] = [];



  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.initializeThemes();
    this.initializeCurrentTheme();
  }

  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private initializeThemes(): void {
    this.availableThemes = [
      // Default themes
      {
        id: 'default_light',
        name: 'Default Light',
        description: 'Clean and bright default theme',
        category: 'default',
        isDark: false,
        colors: {
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          accent: '#06B6D4',
          background: '#F9FAFB',
          surface: '#FFFFFF',
          text: '#111827',
          textSecondary: '#6B7280',
          border: '#E5E7EB',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#06B6D4',
          gradient: 'linear-gradient(135deg, #3B82F6, #8B5CF6)'
        }
      },
      {
        id: 'default_dark',
        name: 'Default Dark',
        description: 'Sleek dark theme for night owls',
        category: 'default',
        isDark: true,
        colors: {
          primary: '#60A5FA',
          secondary: '#A78BFA',
          accent: '#22D3EE',
          background: '#111827',
          surface: '#1F2937',
          text: '#F9FAFB',
          textSecondary: '#9CA3AF',
          border: '#374151',
          success: '#34D399',
          warning: '#FBBF24',
          error: '#F87171',
          info: '#22D3EE',
          gradient: 'linear-gradient(135deg, #60A5FA, #A78BFA)'
        }
      },
      // Nature themes
      {
        id: 'forest_light',
        name: 'Forest Breeze',
        description: 'Inspired by peaceful forest walks',
        category: 'nature',
        isDark: false,
        colors: {
          primary: '#059669',
          secondary: '#0D9488',
          accent: '#84CC16',
          background: '#F0FDF4',
          surface: '#FFFFFF',
          text: '#064E3B',
          textSecondary: '#047857',
          border: '#BBF7D0',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#0D9488',
          gradient: 'linear-gradient(135deg, #059669, #0D9488)'
        }
      },
      {
        id: 'forest_dark',
        name: 'Deep Forest',
        description: 'Dark forest theme for evening sessions',
        category: 'nature',
        isDark: true,
        colors: {
          primary: '#34D399',
          secondary: '#2DD4BF',
          accent: '#A3E635',
          background: '#064E3B',
          surface: '#065F46',
          text: '#ECFDF5',
          textSecondary: '#A7F3D0',
          border: '#047857',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#2DD4BF',
          gradient: 'linear-gradient(135deg, #34D399, #2DD4BF)'
        }
      },
      // Ocean themes
      {
        id: 'ocean_light',
        name: 'Ocean Waves',
        description: 'Calming ocean blues and whites',
        category: 'ocean',
        isDark: false,
        colors: {
          primary: '#0EA5E9',
          secondary: '#0284C7',
          accent: '#06B6D4',
          background: '#F0F9FF',
          surface: '#FFFFFF',
          text: '#0C4A6E',
          textSecondary: '#0369A1',
          border: '#BAE6FD',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#06B6D4',
          gradient: 'linear-gradient(135deg, #0EA5E9, #0284C7)'
        }
      },
      {
        id: 'ocean_dark',
        name: 'Deep Ocean',
        description: 'Mysterious depths of the ocean',
        category: 'ocean',
        isDark: true,
        colors: {
          primary: '#38BDF8',
          secondary: '#0EA5E9',
          accent: '#22D3EE',
          background: '#0C4A6E',
          surface: '#075985',
          text: '#F0F9FF',
          textSecondary: '#7DD3FC',
          border: '#0369A1',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#22D3EE',
          gradient: 'linear-gradient(135deg, #38BDF8, #0EA5E9)'
        }
      },
      // Sunset themes
      {
        id: 'sunset_warm',
        name: 'Golden Sunset',
        description: 'Warm sunset colors for relaxation',
        category: 'sunset',
        isDark: false,
        colors: {
          primary: '#F97316',
          secondary: '#EAB308',
          accent: '#F59E0B',
          background: '#FFFBEB',
          surface: '#FFFFFF',
          text: '#92400E',
          textSecondary: '#D97706',
          border: '#FED7AA',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#06B6D4',
          gradient: 'linear-gradient(135deg, #F97316, #EAB308)'
        }
      },
      {
        id: 'sunset_purple',
        name: 'Purple Twilight',
        description: 'Magical purple sunset vibes',
        category: 'sunset',
        isDark: true,
        colors: {
          primary: '#A855F7',
          secondary: '#C084FC',
          accent: '#E879F9',
          background: '#581C87',
          surface: '#6B21A8',
          text: '#FAF5FF',
          textSecondary: '#DDD6FE',
          border: '#7C3AED',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#06B6D4',
          gradient: 'linear-gradient(135deg, #A855F7, #C084FC)'
        }
      }
    ];

    // Add seasonal themes
    this.addSeasonalThemes();
  }

  private addSeasonalThemes(): void {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11

    // Spring theme (March-May)
    if (currentMonth >= 2 && currentMonth <= 4) {
      this.availableThemes.push({
        id: 'spring_bloom',
        name: 'Spring Bloom',
        description: 'Fresh spring colors with blooming flowers',
        category: 'seasonal',
        isDark: false,
        isSeasonalLimited: true,
        availableFrom: new Date(now.getFullYear(), 2, 1), // March 1st
        availableTo: new Date(now.getFullYear(), 4, 31), // May 31st
        colors: {
          primary: '#EC4899',
          secondary: '#F472B6',
          accent: '#84CC16',
          background: '#FDF2F8',
          surface: '#FFFFFF',
          text: '#831843',
          textSecondary: '#BE185D',
          border: '#FBCFE8',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#06B6D4',
          gradient: 'linear-gradient(135deg, #EC4899, #F472B6)'
        }
      });
    }

    // Summer theme (June-August)
    if (currentMonth >= 5 && currentMonth <= 7) {
      this.availableThemes.push({
        id: 'summer_bright',
        name: 'Summer Bright',
        description: 'Vibrant summer sunshine theme',
        category: 'seasonal',
        isDark: false,
        isSeasonalLimited: true,
        availableFrom: new Date(now.getFullYear(), 5, 1), // June 1st
        availableTo: new Date(now.getFullYear(), 7, 31), // August 31st
        colors: {
          primary: '#FACC15',
          secondary: '#FDE047',
          accent: '#F97316',
          background: '#FEFCE8',
          surface: '#FFFFFF',
          text: '#713F12',
          textSecondary: '#A16207',
          border: '#FEF3C7',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#06B6D4',
          gradient: 'linear-gradient(135deg, #FACC15, #FDE047)'
        }
      });
    }

    // Autumn theme (September-November)
    if (currentMonth >= 8 && currentMonth <= 10) {
      this.availableThemes.push({
        id: 'autumn_leaves',
        name: 'Autumn Leaves',
        description: 'Warm autumn colors and falling leaves',
        category: 'seasonal',
        isDark: false,
        isSeasonalLimited: true,
        availableFrom: new Date(now.getFullYear(), 8, 1), // September 1st
        availableTo: new Date(now.getFullYear(), 10, 30), // November 30th
        colors: {
          primary: '#DC2626',
          secondary: '#EA580C',
          accent: '#D97706',
          background: '#FEF2F2',
          surface: '#FFFFFF',
          text: '#7F1D1D',
          textSecondary: '#B91C1C',
          border: '#FECACA',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#06B6D4',
          gradient: 'linear-gradient(135deg, #DC2626, #EA580C)'
        }
      });
    }

    // Winter theme (December-February)
    if (currentMonth >= 11 || currentMonth <= 1) {
      this.availableThemes.push({
        id: 'winter_frost',
        name: 'Winter Frost',
        description: 'Cool winter blues and whites',
        category: 'seasonal',
        isDark: false,
        isSeasonalLimited: true,
        availableFrom: new Date(now.getFullYear(), 11, 1), // December 1st
        availableTo: new Date(now.getFullYear() + 1, 1, 28), // February 28th
        colors: {
          primary: '#1E40AF',
          secondary: '#3B82F6',
          accent: '#06B6D4',
          background: '#F8FAFC',
          surface: '#FFFFFF',
          text: '#1E293B',
          textSecondary: '#475569',
          border: '#E2E8F0',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#06B6D4',
          gradient: 'linear-gradient(135deg, #1E40AF, #3B82F6)'
        }
      });
    }
  }

  private initializeCurrentTheme(): void {
    const userProfile = this.userDataService.getUserProfile();
    const preferredTheme = userProfile.settings.preferredTheme || 'default_light';

    // Check if preferred theme is still available (for seasonal themes)
    const theme = this.getThemeById(preferredTheme);
    if (theme && this.isThemeAvailable(theme)) {
      this.setTheme(preferredTheme);
    } else {
      // Fallback to default theme
      const fallbackTheme = userProfile.settings.darkMode ? 'default_dark' : 'default_light';
      this.setTheme(fallbackTheme);
    }

    // Listen for theme changes
    this.userDataService.on('propertyChange', (args) => {
      if ((args as any).propertyName === 'settings') {
        const settings = (args as any).value;
        if (settings.preferredTheme && settings.preferredTheme !== this.currentThemeId) {
          this.setTheme(settings.preferredTheme);
        }
      }
    });
  }

  setTheme(themeId: string): void {
    const theme = this.getThemeById(themeId);
    if (!theme || !this.isThemeAvailable(theme)) {
      console.warn(`Theme ${themeId} not found or not available`);
      return;
    }

    this.currentThemeId = themeId;

    // Update user settings
    this.userDataService.updateSettings({
      preferredTheme: themeId,
      darkMode: theme.isDark
    });

    // Apply theme to application
    this.applyThemeToApplication(theme);

    // Notify components about theme change
    this.notifyPropertyChange('themeChanged', { theme, colors: theme.colors });
  }

  getThemeById(themeId: string): Theme | null {
    return this.availableThemes.find(theme => theme.id === themeId) || null;
  }

  getCurrentTheme(): Theme | null {
    return this.getThemeById(this.currentThemeId);
  }

  getAvailableThemes(): Theme[] {
    return this.availableThemes.filter(theme => this.isThemeAvailable(theme));
  }

  getThemesByCategory(category: string): Theme[] {
    return this.getAvailableThemes().filter(theme => theme.category === category);
  }

  isThemeAvailable(theme: Theme): boolean {
    if (!theme.isSeasonalLimited) {
      return true;
    }

    const now = new Date();
    if (theme.availableFrom && theme.availableTo) {
      return now >= theme.availableFrom && now <= theme.availableTo;
    }

    return true;
  }

  private applyThemeToApplication(theme: Theme): void {
    try {
      // Set system appearance (iOS)
      if (Application.ios) {
        const window = Application.ios.window;
        if (window && window.overrideUserInterfaceStyle !== undefined) {
          window.overrideUserInterfaceStyle = theme.isDark ? 2 : 1; // 1 = light, 2 = dark
        }
      }

      // Set status bar style
      if (Application.android) {
        const activity = Application.android.startActivity || Application.android.foregroundActivity;
        if (activity) {
          const window = activity.getWindow();
          if (theme.isDark) {
            // Dark theme - light status bar content
            window.getDecorView().setSystemUiVisibility(0);
          } else {
            // Light theme - dark status bar content
            window.getDecorView().setSystemUiVisibility(8192); // SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
          }
        }
      }

      // Apply CSS variables for dynamic theming
      this.applyCSSVariables(theme.colors);

    } catch (error) {
      console.error('Error applying theme:', error);
    }
  }

  private applyCSSVariables(colors: ThemeColors): void {
    // In a real app, you would apply CSS custom properties
    // This is a simplified version for demonstration
    const cssVariables = `
      :root {
        --color-primary: ${colors.primary};
        --color-secondary: ${colors.secondary};
        --color-accent: ${colors.accent};
        --color-background: ${colors.background};
        --color-surface: ${colors.surface};
        --color-text: ${colors.text};
        --color-text-secondary: ${colors.textSecondary};
        --color-border: ${colors.border};
        --color-success: ${colors.success};
        --color-warning: ${colors.warning};
        --color-error: ${colors.error};
        --color-info: ${colors.info};
        --color-gradient: ${colors.gradient};
      }
    `;

    console.log('Applied CSS variables for theme:', this.currentThemeId);
  }

  getCurrentThemeId(): string {
    return this.currentThemeId;
  }

  getCurrentColors(): ThemeColors | null {
    const theme = this.getCurrentTheme();
    return theme ? theme.colors : null;
  }

  isDarkMode(): boolean {
    const theme = this.getCurrentTheme();
    return theme ? theme.isDark : false;
  }

  toggleDarkMode(): void {
    const currentTheme = this.getCurrentTheme();
    if (!currentTheme) return;

    // Find the opposite theme in the same category
    const targetIsDark = !currentTheme.isDark;
    const sameCategory = this.getThemesByCategory(currentTheme.category);
    const oppositeTheme = sameCategory.find(theme => theme.isDark === targetIsDark);

    if (oppositeTheme) {
      this.setTheme(oppositeTheme.id);
    } else {
      // Fallback to default themes
      const fallbackTheme = targetIsDark ? 'default_dark' : 'default_light';
      this.setTheme(fallbackTheme);
    }
  }

  // Helper methods for getting specific colors
  getPrimaryColor(): string {
    const colors = this.getCurrentColors();
    return colors ? colors.primary : '#3B82F6';
  }

  getSecondaryColor(): string {
    const colors = this.getCurrentColors();
    return colors ? colors.secondary : '#8B5CF6';
  }

  getAccentColor(): string {
    const colors = this.getCurrentColors();
    return colors ? colors.accent : '#06B6D4';
  }

  getBackgroundColor(): string {
    const colors = this.getCurrentColors();
    return colors ? colors.background : '#F9FAFB';
  }

  getSurfaceColor(): string {
    const colors = this.getCurrentColors();
    return colors ? colors.surface : '#FFFFFF';
  }

  getTextColor(): string {
    const colors = this.getCurrentColors();
    return colors ? colors.text : '#111827';
  }

  getSecondaryTextColor(): string {
    const colors = this.getCurrentColors();
    return colors ? colors.textSecondary : '#6B7280';
  }

  getGradient(): string {
    const colors = this.getCurrentColors();
    return colors ? colors.gradient : 'linear-gradient(135deg, #3B82F6, #8B5CF6)';
  }

  // Utility method to get appropriate text color for a background
  getContrastTextColor(backgroundColor: string): string {
    const colors = this.getCurrentColors();
    if (!colors) return '#111827';
    return this.isLightColor(backgroundColor) ? colors.text : colors.surface;
  }

  private isLightColor(color: string): boolean {
    // Simple light/dark detection - in a real app you'd use proper luminance calculation
    const lightColors = ['#FFFFFF', '#F9FAFB', '#F3F4F6', '#E5E7EB', '#FEF2F2', '#F0FDF4', '#F0F9FF', '#FFFBEB', '#FDF2F8', '#FEFCE8'];
    return lightColors.includes(color.toUpperCase());
  }

  // Method to create theme-aware gradients
  createGradient(type: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error'): string {
    const colors = this.getCurrentColors();
    if (!colors) return 'linear-gradient(135deg, #3B82F6, #8B5CF6)';

    switch (type) {
      case 'primary':
        return `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;
      case 'secondary':
        return `linear-gradient(135deg, ${colors.secondary}, ${colors.accent})`;
      case 'accent':
        return `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`;
      case 'success':
        return `linear-gradient(135deg, ${colors.success}, #059669)`;
      case 'warning':
        return `linear-gradient(135deg, ${colors.warning}, #D97706)`;
      case 'error':
        return `linear-gradient(135deg, ${colors.error}, #DC2626)`;
      default:
        return colors.gradient;
    }
  }

  // New methods for theme management
  getSeasonalThemes(): Theme[] {
    return this.getAvailableThemes().filter(theme => theme.category === 'seasonal');
  }

  hasSeasonalThemes(): boolean {
    return this.getSeasonalThemes().length > 0;
  }

  getThemePreview(themeId: string): { name: string; colors: ThemeColors } | null {
    const theme = this.getThemeById(themeId);
    return theme ? { name: theme.name, colors: theme.colors } : null;
  }

  // Method to automatically switch to seasonal theme if available
  autoSwitchToSeasonalTheme(): boolean {
    const seasonalThemes = this.getSeasonalThemes();
    if (seasonalThemes.length > 0) {
      const currentTheme = this.getCurrentTheme();
      const preferDark = currentTheme ? currentTheme.isDark : false;

      // Try to find a seasonal theme matching the current dark/light preference
      const matchingSeasonalTheme = seasonalThemes.find(theme => theme.isDark === preferDark) || seasonalThemes[0];

      this.setTheme(matchingSeasonalTheme.id);
      return true;
    }
    return false;
  }

  // Method to get theme-appropriate shadow
  getShadow(elevation: 'low' | 'medium' | 'high' = 'medium'): string {
    const isDark = this.isDarkMode();

    if (isDark) {
      // Darker shadows for dark theme
      switch (elevation) {
        case 'low':
          return '0 1px 3px rgba(0, 0, 0, 0.4)';
        case 'medium':
          return '0 4px 6px rgba(0, 0, 0, 0.3)';
        case 'high':
          return '0 10px 15px rgba(0, 0, 0, 0.4)';
        default:
          return '0 4px 6px rgba(0, 0, 0, 0.3)';
      }
    } else {
      // Lighter shadows for light theme
      switch (elevation) {
        case 'low':
          return '0 1px 3px rgba(0, 0, 0, 0.1)';
        case 'medium':
          return '0 4px 6px rgba(0, 0, 0, 0.1)';
        case 'high':
          return '0 10px 15px rgba(0, 0, 0, 0.1)';
        default:
          return '0 4px 6px rgba(0, 0, 0, 0.1)';
      }
    }
  }
}
