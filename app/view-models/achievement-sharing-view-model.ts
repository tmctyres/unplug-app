import { Observable } from '@nativescript/core';
import { AchievementSharingService, ShareTemplate, ShareableAchievement } from '../services/achievement-sharing-service';
import { UserDataService } from '../models/user-data';

export class AchievementSharingViewModel extends Observable {
  private achievementSharingService: AchievementSharingService;
  private userDataService: UserDataService;
  private achievement: any;
  private shareTemplates: ShareTemplate[] = [];
  private selectedTemplateId: string = '';
  private customizations: any = {};

  constructor(context: any) {
    super();
    this.achievementSharingService = AchievementSharingService.getInstance();
    this.userDataService = UserDataService.getInstance();
    
    this.achievement = context?.achievement;
    if (!this.achievement) {
      throw new Error('Achievement is required');
    }
    
    this.initializeSharing();
  }

  private async initializeSharing(): Promise<void> {
    try {
      this.set('isLoading', true);
      
      // Load share templates
      this.loadShareTemplates();
      
      // Set default template
      this.selectDefaultTemplate();
      
      // Load achievement data
      this.loadAchievementData();
      
    } catch (error) {
      console.error('Failed to initialize sharing:', error);
      this.set('hasError', true);
      this.set('errorMessage', 'Failed to load sharing options');
    } finally {
      this.set('isLoading', false);
    }
  }

  private loadShareTemplates(): void {
    // Get templates for this achievement category
    const category = this.getAchievementCategory();
    this.shareTemplates = this.achievementSharingService.getShareTemplates(category);
    
    // Add general templates if category-specific ones are limited
    if (this.shareTemplates.length < 3) {
      const generalTemplates = this.achievementSharingService.getShareTemplates('achievement');
      this.shareTemplates = [...this.shareTemplates, ...generalTemplates];
    }
    
    // Remove duplicates
    this.shareTemplates = this.shareTemplates.filter((template, index, self) => 
      index === self.findIndex(t => t.id === template.id)
    );
    
    this.set('shareTemplates', this.shareTemplates);
  }

  private selectDefaultTemplate(): void {
    if (this.shareTemplates.length > 0) {
      // Select first non-premium template, or first template if all are premium
      const freeTemplate = this.shareTemplates.find(t => !t.isPremium);
      this.selectedTemplateId = freeTemplate ? freeTemplate.id : this.shareTemplates[0].id;
      this.set('selectedTemplateId', this.selectedTemplateId);
      this.onTemplateSelected(this.selectedTemplateId);
    }
  }

  private loadAchievementData(): void {
    const achievementData = {
      ...this.achievement,
      formattedDate: this.formatDate(this.achievement.unlockedAt),
      rarityColor: this.getRarityColor(this.achievement.rarity),
      rarityText: this.getRarityText(this.achievement.rarity),
      categoryText: this.getCategoryText(this.achievement.category)
    };
    
    this.set('achievement', achievementData);
  }

  private getAchievementCategory(): string {
    if (this.achievement.category) return this.achievement.category;
    
    // Infer category from achievement properties
    if (this.achievement.title.toLowerCase().includes('level')) return 'level';
    if (this.achievement.title.toLowerCase().includes('streak')) return 'streak';
    if (this.achievement.title.toLowerCase().includes('milestone')) return 'milestone';
    
    return 'achievement';
  }

  // Public methods for UI interaction
  onTemplateSelected(templateId: string): void {
    this.selectedTemplateId = templateId;
    this.set('selectedTemplateId', templateId);
    
    const template = this.shareTemplates.find(t => t.id === templateId);
    if (template) {
      this.set('selectedTemplate', template);
      this.generatePreview();
    }
  }

  onCustomizeTemplate(): void {
    this.showCustomizationDialog();
  }

  async onShareAchievement(): Promise<void> {
    try {
      this.set('isSharing', true);
      
      const template = this.shareTemplates.find(t => t.id === this.selectedTemplateId);
      if (!template) throw new Error('No template selected');
      
      // Check if premium template and user has access
      if (template.isPremium && !this.userDataService.getUserProfile().isPremium) {
        this.showPremiumRequired();
        return;
      }
      
      // Share the achievement
      await this.achievementSharingService.shareAchievement(
        this.achievement, 
        this.selectedTemplateId, 
        this.customizations
      );
      
      this.showSuccess('Achievement shared successfully!');
      this.onBack();
      
    } catch (error) {
      console.error('Failed to share achievement:', error);
      this.showError('Failed to share achievement: ' + error.message);
    } finally {
      this.set('isSharing', false);
    }
  }

  onSaveTemplate(): void {
    // Save current customizations as a new template
    this.showSaveTemplateDialog();
  }

  onPreviewFullscreen(): void {
    // Show fullscreen preview
    this.showFullscreenPreview();
  }

  onBack(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  // Customization methods
  onBackgroundColorChange(color: string): void {
    this.customizations.backgroundColor = color;
    this.generatePreview();
  }

  onTextColorChange(color: string): void {
    this.customizations.textColor = color;
    this.generatePreview();
  }

  onAccentColorChange(color: string): void {
    this.customizations.accentColor = color;
    this.generatePreview();
  }

  onLayoutChange(layout: string): void {
    this.customizations.layout = layout;
    this.generatePreview();
  }

  // Helper methods
  private async generatePreview(): Promise<void> {
    try {
      const template = this.shareTemplates.find(t => t.id === this.selectedTemplateId);
      if (!template) return;
      
      const finalTemplate = { ...template, ...this.customizations };
      const graphic = await this.achievementSharingService.generateAchievementGraphic(
        this.achievement, 
        finalTemplate
      );
      
      this.set('previewImage', graphic.imageData);
      
    } catch (error) {
      console.error('Failed to generate preview:', error);
    }
  }

  private showCustomizationDialog(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate({
      moduleName: 'views/template-customization-page',
      context: { 
        templateId: this.selectedTemplateId,
        achievement: this.achievement,
        customizations: this.customizations
      }
    });
  }

  private showPremiumRequired(): void {
    const { Dialogs } = require('@nativescript/core');
    
    Dialogs.confirm({
      title: 'Premium Template',
      message: 'This template requires Unplug Pro. Would you like to upgrade?',
      okButtonText: 'Upgrade',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result) {
        this.navigateToSubscription();
      }
    });
  }

  private showSaveTemplateDialog(): void {
    const { Dialogs } = require('@nativescript/core');
    
    Dialogs.prompt({
      title: 'Save Template',
      message: 'Enter a name for your custom template:',
      okButtonText: 'Save',
      cancelButtonText: 'Cancel',
      defaultText: 'My Custom Template'
    }).then((result) => {
      if (result.result && result.text) {
        this.saveCustomTemplate(result.text);
      }
    });
  }

  private async saveCustomTemplate(name: string): Promise<void> {
    try {
      const baseTemplate = this.shareTemplates.find(t => t.id === this.selectedTemplateId);
      if (!baseTemplate) return;
      
      const customTemplate = await this.achievementSharingService.createCustomTemplate({
        ...baseTemplate,
        ...this.customizations,
        name: name,
        description: `Custom template based on ${baseTemplate.name}`
      });
      
      this.shareTemplates.push(customTemplate);
      this.set('shareTemplates', this.shareTemplates);
      this.showSuccess('Template saved successfully!');
      
    } catch (error) {
      console.error('Failed to save template:', error);
      this.showError('Failed to save template');
    }
  }

  private showFullscreenPreview(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate({
      moduleName: 'views/achievement-preview-page',
      context: { 
        achievement: this.achievement,
        templateId: this.selectedTemplateId,
        customizations: this.customizations
      }
    });
  }

  private navigateToSubscription(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/subscription-page');
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  private getRarityColor(rarity: string): string {
    const colors = {
      common: '#6B7280',
      rare: '#3B82F6',
      epic: '#8B5CF6',
      legendary: '#F59E0B'
    };
    return colors[rarity] || colors.common;
  }

  private getRarityText(rarity: string): string {
    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
  }

  private getCategoryText(category: string): string {
    const categories = {
      general: 'General Achievement',
      streak: 'Streak Achievement',
      level: 'Level Achievement',
      milestone: 'Milestone Achievement',
      challenge: 'Challenge Achievement',
      personal_best: 'Personal Best'
    };
    return categories[category] || 'Achievement';
  }

  private showSuccess(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'success', message });
  }

  private showError(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'error', message });
  }

  // Getters for computed properties
  get templateCategories(): any[] {
    const categories = [...new Set(this.shareTemplates.map(t => t.category))];
    return categories.map(category => ({
      id: category,
      name: this.getCategoryDisplayName(category),
      count: this.shareTemplates.filter(t => t.category === category).length
    }));
  }

  get availableLayouts(): any[] {
    return [
      { id: 'centered', name: 'Centered', icon: '⊙' },
      { id: 'split', name: 'Split', icon: '⫿' },
      { id: 'banner', name: 'Banner', icon: '▬' },
      { id: 'card', name: 'Card', icon: '▢' }
    ];
  }

  get colorPalettes(): any[] {
    return [
      { name: 'Ocean', colors: ['#667eea', '#764ba2', '#3B82F6'] },
      { name: 'Sunset', colors: ['#FF6B6B', '#FF8E53', '#F59E0B'] },
      { name: 'Forest', colors: ['#10B981', '#059669', '#065F46'] },
      { name: 'Royal', colors: ['#8B5CF6', '#7C3AED', '#5B21B6'] },
      { name: 'Fire', colors: ['#EF4444', '#DC2626', '#B91C1C'] }
    ];
  }

  private getCategoryDisplayName(category: string): string {
    const names = {
      achievement: 'Achievements',
      milestone: 'Milestones',
      streak: 'Streaks',
      level: 'Levels',
      challenge: 'Challenges'
    };
    return names[category] || category;
  }
}
