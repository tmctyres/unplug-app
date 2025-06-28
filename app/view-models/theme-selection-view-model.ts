import { Observable } from '@nativescript/core';
import { ThemeService, Theme } from '../services/theme-service';
import { UserDataService } from '../models/user-data';

export class ThemeSelectionViewModel extends Observable {
  private themeService: ThemeService;
  private userDataService: UserDataService;

  constructor() {
    super();
    this.themeService = ThemeService.getInstance();
    this.userDataService = UserDataService.getInstance();
    this.loadThemes();
  }

  private loadThemes(): void {
    const availableThemes = this.themeService.getAvailableThemes();
    const currentThemeId = this.themeService.getCurrentThemeId();

    // Group themes by category
    const themeCategories = this.groupThemesByCategory(availableThemes);
    
    this.set('themeCategories', themeCategories);
    this.set('currentThemeId', currentThemeId);
    this.set('hasSeasonalThemes', this.themeService.hasSeasonalThemes());
  }

  private groupThemesByCategory(themes: Theme[]): any[] {
    const categories = new Map();

    themes.forEach(theme => {
      if (!categories.has(theme.category)) {
        categories.set(theme.category, {
          name: this.getCategoryDisplayName(theme.category),
          id: theme.category,
          themes: []
        });
      }
      categories.get(theme.category).themes.push(theme);
    });

    return Array.from(categories.values());
  }

  private getCategoryDisplayName(category: string): string {
    const displayNames = {
      'default': 'Default Themes',
      'nature': 'Nature Themes',
      'ocean': 'Ocean Themes',
      'sunset': 'Sunset Themes',
      'seasonal': 'Seasonal Themes',
      'minimal': 'Minimal Themes'
    };
    return displayNames[category] || category;
  }

  onThemeSelect(themeId: string): void {
    this.themeService.setTheme(themeId);
    this.set('currentThemeId', themeId);
    
    // Show feedback
    this.showThemeChangedFeedback(themeId);
  }

  private showThemeChangedFeedback(themeId: string): void {
    const theme = this.themeService.getThemeById(themeId);
    if (theme) {
      // Emit event for UI feedback
      this.notifyPropertyChange('themeChanged', {
        themeName: theme.name,
        message: `Switched to ${theme.name} theme`
      });
    }
  }

  onToggleDarkMode(): void {
    this.themeService.toggleDarkMode();
    this.set('currentThemeId', this.themeService.getCurrentThemeId());
  }

  onAutoSwitchSeasonal(): void {
    const switched = this.themeService.autoSwitchToSeasonalTheme();
    if (switched) {
      this.set('currentThemeId', this.themeService.getCurrentThemeId());
      this.showThemeChangedFeedback(this.themeService.getCurrentThemeId());
    } else {
      this.notifyPropertyChange('noSeasonalTheme', {
        message: 'No seasonal themes available right now'
      });
    }
  }

  getThemePreview(themeId: string): any {
    const preview = this.themeService.getThemePreview(themeId);
    if (preview) {
      return {
        name: preview.name,
        primaryColor: preview.colors.primary,
        secondaryColor: preview.colors.secondary,
        backgroundColor: preview.colors.background,
        textColor: preview.colors.text,
        gradient: preview.colors.gradient
      };
    }
    return null;
  }

  isCurrentTheme(themeId: string): boolean {
    return this.get('currentThemeId') === themeId;
  }

  onBack(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  // Getters for computed properties
  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  get currentThemeName(): string {
    const currentTheme = this.themeService.getCurrentTheme();
    return currentTheme ? currentTheme.name : 'Unknown';
  }

  get seasonalThemesCount(): number {
    return this.themeService.getSeasonalThemes().length;
  }
}
