import { Observable } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import { SocialService } from './social-service';
import { ExportService } from './export-service';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';

export interface ShareableAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  unlockedAt: Date;
  category: string;
  shareCount: number;
  isShared: boolean;
}

export interface AchievementGraphic {
  id: string;
  achievementId: string;
  template: 'minimal' | 'celebration' | 'milestone' | 'custom';
  theme: 'light' | 'dark' | 'gradient' | 'neon';
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  imageData: string; // Base64 encoded image
  dimensions: { width: number; height: number };
  createdAt: Date;
}

export interface ShareTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: 'achievement' | 'milestone' | 'streak' | 'level' | 'challenge';
  isPremium: boolean;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  layout: 'centered' | 'split' | 'banner' | 'card' | 'celebration' | 'milestone';
  animations: string[];
}

export class AchievementSharingService extends Observable {
  private static instance: AchievementSharingService;
  private userDataService: UserDataService;
  private socialService: SocialService;
  private exportService: ExportService;
  private shareTemplates: ShareTemplate[] = [];
  private sharedAchievements: ShareableAchievement[] = [];

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.socialService = SocialService.getInstance();
    this.exportService = ExportService.getInstance();
    this.initializeSharing();
  }

  static getInstance(): AchievementSharingService {
    if (!AchievementSharingService.instance) {
      AchievementSharingService.instance = new AchievementSharingService();
    }
    return AchievementSharingService.instance;
  }

  private async initializeSharing(): Promise<void> {
    try {
      // Load share templates
      this.createShareTemplates();
      
      // Load user's shared achievements
      this.loadSharedAchievements();
      
      // Setup event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize achievement sharing:', error);
    }
  }

  private createShareTemplates(): void {
    this.shareTemplates = [
      {
        id: 'minimal_light',
        name: 'Minimal Light',
        description: 'Clean and simple design with light background',
        preview: '🎯',
        category: 'achievement',
        isPremium: false,
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        accentColor: '#3B82F6',
        layout: 'centered',
        animations: ['fadeIn']
      },
      {
        id: 'celebration_gradient',
        name: 'Celebration Gradient',
        description: 'Vibrant gradient background with celebration elements',
        preview: '🎉',
        category: 'achievement',
        isPremium: false,
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        textColor: '#FFFFFF',
        accentColor: '#FFD700',
        layout: 'centered',
        animations: ['confetti', 'bounce']
      },
      {
        id: 'milestone_banner',
        name: 'Milestone Banner',
        description: 'Wide banner format perfect for major milestones',
        preview: '🏆',
        category: 'milestone',
        isPremium: true,
        backgroundColor: '#1F2937',
        textColor: '#FFFFFF',
        accentColor: '#F59E0B',
        layout: 'banner',
        animations: ['slideIn', 'glow']
      },
      {
        id: 'streak_fire',
        name: 'Streak Fire',
        description: 'Fiery design perfect for streak achievements',
        preview: '🔥',
        category: 'streak',
        isPremium: false,
        backgroundColor: 'linear-gradient(45deg, #FF6B6B, #FF8E53)',
        textColor: '#FFFFFF',
        accentColor: '#FFD93D',
        layout: 'split',
        animations: ['flame', 'pulse']
      },
      {
        id: 'level_crown',
        name: 'Level Crown',
        description: 'Royal design for level achievements',
        preview: '👑',
        category: 'level',
        isPremium: true,
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        textColor: '#FFFFFF',
        accentColor: '#FFD700',
        layout: 'card',
        animations: ['crown', 'sparkle']
      },
      {
        id: 'neon_glow',
        name: 'Neon Glow',
        description: 'Futuristic neon design with glowing effects',
        preview: '⚡',
        category: 'achievement',
        isPremium: true,
        backgroundColor: '#0F0F23',
        textColor: '#00FFFF',
        accentColor: '#FF00FF',
        layout: 'centered',
        animations: ['neonGlow', 'electric']
      }
    ];
  }

  private loadSharedAchievements(): void {
    const userProfile = this.userDataService.getUserProfile();
    this.sharedAchievements = userProfile.sharedAchievements || [];
  }

  private setupEventListeners(): void {
    // Listen for new achievements to offer sharing
    this.userDataService.on('achievementUnlocked', (args) => {
      if (isPropertyChangeEvent(args)) {
        this.handleNewAchievement(args.value);
      }
    });

    // Listen for level ups
    this.userDataService.on('levelUp', (args) => {
      if (isPropertyChangeEvent(args)) {
        this.handleLevelUp(args.value);
      }
    });

    // Listen for personal bests
    this.userDataService.on('personalBestAchieved', (args) => {
      if (isPropertyChangeEvent(args)) {
        this.handlePersonalBest(args.value);
      }
    });
  }

  // Achievement Sharing
  async shareAchievement(
    achievement: any, 
    templateId: string, 
    customizations?: Partial<ShareTemplate>
  ): Promise<AchievementGraphic> {
    try {
      // Get template
      const template = this.getTemplate(templateId);
      if (!template) throw new Error('Template not found');

      // Apply customizations
      const finalTemplate = { ...template, ...customizations };

      // Generate graphic
      const graphic = await this.generateAchievementGraphic(achievement, finalTemplate);

      // Create shareable content
      const shareableContent = this.createShareableContent(achievement, graphic);

      // Share the content
      await this.exportService.shareContent(shareableContent);

      // Track the share
      this.trackAchievementShare(achievement, templateId);

      this.notifyPropertyChange('achievementShared', { achievement, graphic });
      return graphic;

    } catch (error) {
      console.error('Failed to share achievement:', error);
      throw error;
    }
  }

  async generateAchievementGraphic(
    achievement: any, 
    template: ShareTemplate
  ): Promise<AchievementGraphic> {
    const userProfile = this.userDataService.getUserProfile();
    
    // Create graphic data
    const graphic: AchievementGraphic = {
      id: this.generateId(),
      achievementId: achievement.id,
      template: template.layout as any,
      theme: this.getThemeFromTemplate(template),
      backgroundColor: template.backgroundColor,
      textColor: template.textColor,
      accentColor: template.accentColor,
      imageData: await this.renderAchievementImage(achievement, template, userProfile),
      dimensions: this.getTemplateDimensions(template),
      createdAt: new Date()
    };

    return graphic;
  }

  private async renderAchievementImage(
    achievement: any, 
    template: ShareTemplate, 
    userProfile: any
  ): Promise<string> {
    // In a real implementation, this would use a graphics library to render the image
    // For now, we'll create an SVG representation
    
    const { width, height } = this.getTemplateDimensions(template);
    const userName = userProfile.userTitle || 'Digital Wellness Warrior';
    
    let svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${this.createGradientDefs(template)}
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="${this.getBackgroundFill(template)}" />
        
        <!-- Decorative Elements -->
        ${this.createDecorativeElements(template)}
        
        <!-- Achievement Icon -->
        <text x="${width/2}" y="${height/3}" text-anchor="middle" font-size="48" fill="${template.accentColor}">
          ${achievement.icon}
        </text>
        
        <!-- Achievement Title -->
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-size="24" font-weight="bold" fill="${template.textColor}">
          ${achievement.title}
        </text>
        
        <!-- Achievement Description -->
        <text x="${width/2}" y="${height/2 + 35}" text-anchor="middle" font-size="14" fill="${template.textColor}" opacity="0.8">
          ${achievement.description}
        </text>
        
        <!-- User Name -->
        <text x="${width/2}" y="${height - 40}" text-anchor="middle" font-size="16" fill="${template.textColor}" opacity="0.7">
          Achieved by ${userName}
        </text>
        
        <!-- App Branding -->
        <text x="${width/2}" y="${height - 15}" text-anchor="middle" font-size="12" fill="${template.textColor}" opacity="0.5">
          Unplug - Digital Wellness
        </text>
        
        <!-- Rarity Badge -->
        ${this.createRarityBadge(achievement, template, width)}
      </svg>
    `;

    // Convert SVG to base64
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  private createGradientDefs(template: ShareTemplate): string {
    if (!template.backgroundColor.includes('gradient')) return '';
    
    return `
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
    `;
  }

  private getBackgroundFill(template: ShareTemplate): string {
    if (template.backgroundColor.includes('gradient')) {
      return 'url(#bgGradient)';
    }
    return template.backgroundColor;
  }

  private createDecorativeElements(template: ShareTemplate): string {
    switch (template.layout) {
      case 'celebration':
        return this.createConfettiElements(template);
      case 'milestone':
        return this.createMilestoneElements(template);
      default:
        return '';
    }
  }

  private createConfettiElements(template: ShareTemplate): string {
    let elements = '';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 400;
      const y = Math.random() * 300;
      const color = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'][Math.floor(Math.random() * 4)];
      elements += `<circle cx="${x}" cy="${y}" r="3" fill="${color}" opacity="0.7" />`;
    }
    return elements;
  }

  private createMilestoneElements(template: ShareTemplate): string {
    return `
      <rect x="20" y="20" width="360" height="4" fill="${template.accentColor}" opacity="0.3" />
      <rect x="20" y="276" width="360" height="4" fill="${template.accentColor}" opacity="0.3" />
    `;
  }

  private createRarityBadge(achievement: any, template: ShareTemplate, width: number): string {
    const rarityColors = {
      common: '#6B7280',
      rare: '#3B82F6',
      epic: '#8B5CF6',
      legendary: '#F59E0B'
    };
    
    const color = rarityColors[achievement.rarity] || rarityColors.common;
    
    return `
      <rect x="${width - 80}" y="20" width="60" height="20" rx="10" fill="${color}" />
      <text x="${width - 50}" y="33" text-anchor="middle" font-size="10" fill="white" font-weight="bold">
        ${achievement.rarity.toUpperCase()}
      </text>
    `;
  }

  private getTemplateDimensions(template: ShareTemplate): { width: number; height: number } {
    switch (template.layout) {
      case 'banner':
        return { width: 800, height: 200 };
      case 'card':
        return { width: 300, height: 400 };
      case 'split':
        return { width: 600, height: 300 };
      default:
        return { width: 400, height: 300 };
    }
  }

  private getThemeFromTemplate(template: ShareTemplate): 'light' | 'dark' | 'gradient' | 'neon' {
    if (template.backgroundColor.includes('gradient')) return 'gradient';
    if (template.backgroundColor === '#0F0F23') return 'neon';
    if (template.backgroundColor === '#FFFFFF') return 'light';
    return 'dark';
  }

  private createShareableContent(achievement: any, graphic: AchievementGraphic): any {
    const userProfile = this.userDataService.getUserProfile();
    
    return {
      type: 'achievement',
      title: `🏆 Achievement Unlocked: ${achievement.title}`,
      description: `I just unlocked "${achievement.title}" in my digital wellness journey! ${achievement.description} #DigitalWellness #Achievement #Unplug`,
      imageData: graphic.imageData,
      hashtags: [
        '#DigitalWellness',
        '#Achievement',
        '#Unplug',
        '#Mindfulness',
        `#${achievement.rarity}Achievement`
      ],
      url: 'https://unplug.app' // App store link
    };
  }

  private trackAchievementShare(achievement: any, templateId: string): void {
    // Find or create shareable achievement record
    let sharedAchievement = this.sharedAchievements.find(sa => sa.id === achievement.id);
    
    if (!sharedAchievement) {
      sharedAchievement = {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        xpReward: achievement.xpReward,
        unlockedAt: achievement.unlockedAt,
        category: achievement.category || 'general',
        shareCount: 0,
        isShared: false
      };
      this.sharedAchievements.push(sharedAchievement);
    }
    
    sharedAchievement.shareCount++;
    sharedAchievement.isShared = true;
    
    // Update social profile
    const socialProfile = this.socialService.getSocialProfile();
    if (socialProfile) {
      socialProfile.achievementsShared++;
    }
    
    this.saveSharedAchievements();
  }

  private handleNewAchievement(achievement: any): void {
    // Auto-share if enabled in settings
    const socialSettings = this.socialService.getSocialSettings();
    if (socialSettings?.autoShareAchievements) {
      // Use default template for auto-sharing
      this.shareAchievement(achievement, 'minimal_light');
    } else {
      // Show sharing prompt
      this.showSharingPrompt(achievement);
    }
  }

  private handleLevelUp(levelData: any): void {
    const socialSettings = this.socialService.getSocialSettings();
    if (socialSettings?.autoShareMilestones) {
      // Create level achievement
      const levelAchievement = {
        id: `level_${levelData.newLevel}`,
        title: `Level ${levelData.newLevel} Reached!`,
        description: `Reached level ${levelData.newLevel} in digital wellness`,
        icon: '👑',
        rarity: 'rare',
        xpReward: 0,
        unlockedAt: new Date(),
        category: 'level'
      };
      
      this.shareAchievement(levelAchievement, 'level_crown');
    }
  }

  private handlePersonalBest(personalBest: any): void {
    const socialSettings = this.socialService.getSocialSettings();
    if (socialSettings?.autoShareMilestones) {
      // Create personal best achievement
      const pbAchievement = {
        id: `pb_${personalBest.category}_${Date.now()}`,
        title: 'New Personal Best!',
        description: personalBest.description,
        icon: '🎯',
        rarity: personalBest.significance === 'milestone' ? 'epic' : 'rare',
        xpReward: 0,
        unlockedAt: new Date(),
        category: 'personal_best'
      };
      
      this.shareAchievement(pbAchievement, 'milestone_banner');
    }
  }

  private showSharingPrompt(achievement: any): void {
    this.notifyPropertyChange('showSharingPrompt', { achievement });
  }

  private saveSharedAchievements(): void {
    const userProfile = this.userDataService.getUserProfile();
    userProfile.sharedAchievements = this.sharedAchievements;
    this.userDataService.saveUserData();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public methods
  getShareTemplates(category?: string): ShareTemplate[] {
    if (category) {
      return this.shareTemplates.filter(template => template.category === category);
    }
    return [...this.shareTemplates];
  }

  getTemplate(templateId: string): ShareTemplate | null {
    return this.shareTemplates.find(template => template.id === templateId) || null;
  }

  getSharedAchievements(): ShareableAchievement[] {
    return [...this.sharedAchievements];
  }

  getShareCount(): number {
    return this.sharedAchievements.reduce((total, achievement) => total + achievement.shareCount, 0);
  }

  async createCustomTemplate(templateData: Partial<ShareTemplate>): Promise<ShareTemplate> {
    const customTemplate: ShareTemplate = {
      id: this.generateId(),
      name: templateData.name || 'Custom Template',
      description: templateData.description || 'Custom achievement template',
      preview: templateData.preview || '🎨',
      category: templateData.category || 'achievement',
      isPremium: true,
      backgroundColor: templateData.backgroundColor || '#FFFFFF',
      textColor: templateData.textColor || '#1F2937',
      accentColor: templateData.accentColor || '#3B82F6',
      layout: templateData.layout || 'centered',
      animations: templateData.animations || ['fadeIn']
    };

    this.shareTemplates.push(customTemplate);
    return customTemplate;
  }

  async shareMultipleAchievements(achievements: any[], templateId: string): Promise<AchievementGraphic[]> {
    const graphics: AchievementGraphic[] = [];
    
    for (const achievement of achievements) {
      try {
        const graphic = await this.shareAchievement(achievement, templateId);
        graphics.push(graphic);
      } catch (error) {
        console.error('Failed to share achievement:', achievement.title, error);
      }
    }
    
    return graphics;
  }
}
