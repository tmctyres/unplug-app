import { Observable, File, Folder, knownFolders, path } from '@nativescript/core';
import { AnalyticsData, DailyAnalytics, WeeklyAnalytics, MonthlyAnalytics } from '../models/analytics-data';
import { UserDataService } from '../models/user-data';

export interface ExportOptions {
  format: 'pdf' | 'json' | 'csv' | 'image';
  timeRange: 'week' | 'month' | 'quarter' | 'year' | 'all';
  includeCharts: boolean;
  includeInsights: boolean;
  includePersonalBests: boolean;
  includeComparisons: boolean;
  customTitle?: string;
  theme: 'light' | 'dark' | 'colorful';
}

export interface ShareableContent {
  type: 'achievement' | 'milestone' | 'progress' | 'insight' | 'report';
  title: string;
  description: string;
  imageData?: string; // Base64 encoded image
  hashtags: string[];
  url?: string;
}

export class ExportService extends Observable {
  private static instance: ExportService;
  private userDataService: UserDataService;

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
  }

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  // Export Analytics Report
  async exportAnalyticsReport(analyticsData: AnalyticsData, options: ExportOptions): Promise<string> {
    try {
      this.notifyPropertyChange('exportProgress', { status: 'starting', progress: 0 });

      switch (options.format) {
        case 'pdf':
          return await this.exportToPDF(analyticsData, options);
        case 'json':
          return await this.exportToJSON(analyticsData, options);
        case 'csv':
          return await this.exportToCSV(analyticsData, options);
        case 'image':
          return await this.exportToImage(analyticsData, options);
        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  private async exportToPDF(analyticsData: AnalyticsData, options: ExportOptions): Promise<string> {
    this.notifyPropertyChange('exportProgress', { status: 'generating_pdf', progress: 20 });

    // Generate HTML content for PDF
    const htmlContent = this.generateHTMLReport(analyticsData, options);
    
    this.notifyPropertyChange('exportProgress', { status: 'creating_pdf', progress: 60 });

    // In a real implementation, you'd use a PDF generation library
    // For now, we'll create an HTML file that can be converted to PDF
    const fileName = `unplug_analytics_${Date.now()}.html`;
    const documentsFolder = knownFolders.documents();
    const filePath = path.join(documentsFolder.path, fileName);

    const file = File.fromPath(filePath);
    await file.writeText(htmlContent);

    this.notifyPropertyChange('exportProgress', { status: 'complete', progress: 100 });
    
    return filePath;
  }

  private async exportToJSON(analyticsData: AnalyticsData, options: ExportOptions): Promise<string> {
    this.notifyPropertyChange('exportProgress', { status: 'generating_json', progress: 30 });

    const exportData = {
      exportedAt: new Date().toISOString(),
      timeRange: options.timeRange,
      userProfile: this.userDataService.getUserProfile(),
      analytics: this.filterAnalyticsData(analyticsData, options),
      metadata: {
        appVersion: '1.0.0',
        exportFormat: 'json',
        options: options
      }
    };

    const fileName = `unplug_data_${Date.now()}.json`;
    const documentsFolder = knownFolders.documents();
    const filePath = path.join(documentsFolder.path, fileName);

    const file = File.fromPath(filePath);
    await file.writeText(JSON.stringify(exportData, null, 2));

    this.notifyPropertyChange('exportProgress', { status: 'complete', progress: 100 });
    
    return filePath;
  }

  private async exportToCSV(analyticsData: AnalyticsData, options: ExportOptions): Promise<string> {
    this.notifyPropertyChange('exportProgress', { status: 'generating_csv', progress: 30 });

    let csvContent = '';

    // Daily analytics CSV
    if (options.timeRange === 'week' || options.timeRange === 'month' || options.timeRange === 'all') {
      csvContent += 'Daily Analytics\n';
      csvContent += 'Date,Total Minutes,Session Count,Average Length,Goal Completions,XP Earned\n';
      
      analyticsData.dailyAnalytics.forEach(day => {
        csvContent += `${day.date},${day.totalMinutes},${day.sessionCount},${day.averageSessionLength},${day.goalCompletions},${day.xpEarned}\n`;
      });
      csvContent += '\n';
    }

    // Weekly analytics CSV
    if (options.timeRange === 'month' || options.timeRange === 'quarter' || options.timeRange === 'all') {
      csvContent += 'Weekly Analytics\n';
      csvContent += 'Week Start,Total Minutes,Session Count,Average Length,Goal Completions,Consistency Score\n';
      
      analyticsData.weeklyAnalytics.forEach(week => {
        csvContent += `${week.weekStart},${week.totalMinutes},${week.sessionCount},${week.averageSessionLength},${week.goalCompletions},${week.patterns.consistencyScore}\n`;
      });
      csvContent += '\n';
    }

    const fileName = `unplug_analytics_${Date.now()}.csv`;
    const documentsFolder = knownFolders.documents();
    const filePath = path.join(documentsFolder.path, fileName);

    const file = File.fromPath(filePath);
    await file.writeText(csvContent);

    this.notifyPropertyChange('exportProgress', { status: 'complete', progress: 100 });
    
    return filePath;
  }

  private async exportToImage(analyticsData: AnalyticsData, options: ExportOptions): Promise<string> {
    this.notifyPropertyChange('exportProgress', { status: 'generating_image', progress: 40 });

    // Generate a summary image with key stats
    const imageData = await this.generateSummaryImage(analyticsData, options);
    
    const fileName = `unplug_summary_${Date.now()}.png`;
    const documentsFolder = knownFolders.documents();
    const filePath = path.join(documentsFolder.path, fileName);

    // In a real implementation, you'd save the actual image data
    // For now, we'll create a placeholder
    const file = File.fromPath(filePath);
    await file.writeText('Image placeholder - ' + JSON.stringify(imageData));

    this.notifyPropertyChange('exportProgress', { status: 'complete', progress: 100 });
    
    return filePath;
  }

  // Generate Shareable Content
  generateShareableContent(type: ShareableContent['type'], data: any): ShareableContent {
    switch (type) {
      case 'achievement':
        return this.createAchievementShare(data);
      case 'milestone':
        return this.createMilestoneShare(data);
      case 'progress':
        return this.createProgressShare(data);
      case 'insight':
        return this.createInsightShare(data);
      case 'report':
        return this.createReportShare(data);
      default:
        throw new Error('Unsupported share type');
    }
  }

  private createAchievementShare(achievement: any): ShareableContent {
    return {
      type: 'achievement',
      title: `🏆 Achievement Unlocked: ${achievement.title}`,
      description: `I just unlocked "${achievement.title}" in my digital wellness journey! ${achievement.description} #DigitalWellness #Achievement`,
      hashtags: ['#DigitalWellness', '#Achievement', '#Unplug', '#Mindfulness'],
      imageData: this.generateAchievementImage(achievement)
    };
  }

  private createMilestoneShare(milestone: any): ShareableContent {
    return {
      type: 'milestone',
      title: `🎯 Milestone Reached!`,
      description: `Amazing! I've reached a new milestone: ${milestone.description}. My digital wellness journey continues! #Milestone #DigitalWellness`,
      hashtags: ['#Milestone', '#DigitalWellness', '#Progress', '#Unplug'],
      imageData: this.generateMilestoneImage(milestone)
    };
  }

  private createProgressShare(progressData: any): ShareableContent {
    const { totalMinutes, streak, level } = progressData;
    const hours = Math.floor(totalMinutes / 60);
    
    return {
      type: 'progress',
      title: `📈 Digital Wellness Progress`,
      description: `This week I've spent ${hours} hours offline, maintained a ${streak}-day streak, and reached level ${level}! Taking control of my digital life with Unplug. #DigitalWellness #Progress`,
      hashtags: ['#DigitalWellness', '#Progress', '#Mindfulness', '#DigitalDetox'],
      imageData: this.generateProgressImage(progressData)
    };
  }

  private createInsightShare(insight: any): ShareableContent {
    return {
      type: 'insight',
      title: `💡 Digital Wellness Insight`,
      description: `${insight.title}: ${insight.description} ${insight.recommendation ? `Tip: ${insight.recommendation}` : ''} #DigitalWellness #Insight`,
      hashtags: ['#DigitalWellness', '#Insight', '#SelfImprovement', '#Mindfulness']
    };
  }

  private createReportShare(reportData: any): ShareableContent {
    return {
      type: 'report',
      title: `📊 My Digital Wellness Report`,
      description: `Check out my latest digital wellness analytics! I'm making great progress on my journey to a healthier relationship with technology. #DigitalWellness #Analytics`,
      hashtags: ['#DigitalWellness', '#Analytics', '#Progress', '#DigitalDetox'],
      imageData: this.generateReportImage(reportData)
    };
  }

  // Share Content
  async shareContent(content: ShareableContent, platforms: string[] = ['general']): Promise<void> {
    try {
      const { SocialShare } = require('@nativescript/social-share');
      
      let shareText = `${content.title}\n\n${content.description}`;
      
      if (content.hashtags.length > 0) {
        shareText += `\n\n${content.hashtags.join(' ')}`;
      }

      if (content.imageData) {
        // Share with image
        await SocialShare.shareText(shareText, content.title);
      } else {
        // Share text only
        await SocialShare.shareText(shareText, content.title);
      }

      this.notifyPropertyChange('shareComplete', { content, platforms });
      
    } catch (error) {
      console.error('Share failed:', error);
      throw error;
    }
  }

  // Helper Methods
  private generateHTMLReport(analyticsData: AnalyticsData, options: ExportOptions): string {
    const userProfile = this.userDataService.getUserProfile();
    const theme = options.theme || 'light';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${options.customTitle || 'Unplug Analytics Report'}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 20px;
            background: ${theme === 'dark' ? '#1F2937' : '#F9FAFB'};
            color: ${theme === 'dark' ? '#F9FAFB' : '#1F2937'};
        }
        .header { text-align: center; margin-bottom: 30px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { 
            background: ${theme === 'dark' ? '#374151' : 'white'}; 
            padding: 20px; border-radius: 12px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .stat-value { font-size: 2em; font-weight: bold; color: #3B82F6; }
        .stat-label { color: #6B7280; margin-top: 5px; }
        .insights { margin: 30px 0; }
        .insight { 
            background: linear-gradient(135deg, #3B82F6, #8B5CF6); 
            color: white; padding: 20px; border-radius: 12px; margin: 10px 0;
        }
        .footer { text-align: center; margin-top: 40px; color: #6B7280; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${options.customTitle || 'Digital Wellness Analytics Report'}</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
        <p>User: ${userProfile.userTitle || 'Anonymous'}</p>
    </div>
    
    <div class="stat-grid">
        ${this.generateStatsHTML(analyticsData, options)}
    </div>
    
    ${options.includeInsights ? this.generateInsightsHTML(analyticsData) : ''}
    
    <div class="footer">
        <p>Generated by Unplug - Digital Wellness Tracker</p>
        <p>Take control of your digital life</p>
    </div>
</body>
</html>`;
  }

  private generateStatsHTML(analyticsData: AnalyticsData, options: ExportOptions): string {
    const timeRangeData = this.getTimeRangeData(analyticsData, options.timeRange);
    const totalMinutes = timeRangeData.reduce((sum, item) => sum + (item.totalMinutes || 0), 0);
    const totalSessions = timeRangeData.reduce((sum, item) => sum + (item.sessionCount || 0), 0);
    const avgLength = totalSessions > 0 ? totalMinutes / totalSessions : 0;

    return `
        <div class="stat-card">
            <div class="stat-value">${this.formatDuration(totalMinutes)}</div>
            <div class="stat-label">Total Offline Time</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalSessions}</div>
            <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${this.formatDuration(avgLength)}</div>
            <div class="stat-label">Average Session</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${this.userDataService.getUserProfile().currentStreak}</div>
            <div class="stat-label">Current Streak</div>
        </div>
    `;
  }

  private generateInsightsHTML(analyticsData: AnalyticsData): string {
    if (!analyticsData.predictiveInsights.length) return '';

    const insightsHTML = analyticsData.predictiveInsights.slice(0, 3).map(insight => `
        <div class="insight">
            <h3>${insight.title}</h3>
            <p>${insight.description}</p>
            ${insight.recommendation ? `<p><strong>Recommendation:</strong> ${insight.recommendation}</p>` : ''}
        </div>
    `).join('');

    return `
        <div class="insights">
            <h2>Smart Insights</h2>
            ${insightsHTML}
        </div>
    `;
  }

  private filterAnalyticsData(analyticsData: AnalyticsData, options: ExportOptions): any {
    const filtered: any = {};

    if (options.timeRange !== 'all') {
      filtered.dailyAnalytics = this.getTimeRangeData(analyticsData, options.timeRange);
    } else {
      filtered.dailyAnalytics = analyticsData.dailyAnalytics;
      filtered.weeklyAnalytics = analyticsData.weeklyAnalytics;
      filtered.monthlyAnalytics = analyticsData.monthlyAnalytics;
    }

    if (options.includeInsights) {
      filtered.insights = analyticsData.predictiveInsights;
    }

    if (options.includePersonalBests) {
      filtered.personalBests = analyticsData.personalBests;
    }

    return filtered;
  }

  private getTimeRangeData(analyticsData: AnalyticsData, timeRange: string): any[] {
    switch (timeRange) {
      case 'week':
        return analyticsData.dailyAnalytics.slice(-7);
      case 'month':
        return analyticsData.dailyAnalytics.slice(-30);
      case 'quarter':
        return analyticsData.weeklyAnalytics.slice(-12);
      case 'year':
        return analyticsData.monthlyAnalytics.slice(-12);
      default:
        return analyticsData.dailyAnalytics;
    }
  }

  private generateAchievementImage(achievement: any): string {
    // In a real implementation, this would generate an actual image
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#3B82F6"/>
        <text x="200" y="150" text-anchor="middle" fill="white" font-size="24">${achievement.title}</text>
      </svg>
    `)}`;
  }

  private generateMilestoneImage(milestone: any): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#10B981"/>
        <text x="200" y="150" text-anchor="middle" fill="white" font-size="20">Milestone Reached!</text>
      </svg>
    `)}`;
  }

  private generateProgressImage(progressData: any): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#8B5CF6"/>
        <text x="200" y="150" text-anchor="middle" fill="white" font-size="18">Progress Update</text>
      </svg>
    `)}`;
  }

  private generateReportImage(reportData: any): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#F59E0B"/>
        <text x="200" y="150" text-anchor="middle" fill="white" font-size="20">Analytics Report</text>
      </svg>
    `)}`;
  }

  private generateSummaryImage(analyticsData: AnalyticsData, options: ExportOptions): any {
    // Generate summary data for image
    const timeRangeData = this.getTimeRangeData(analyticsData, options.timeRange);
    const totalMinutes = timeRangeData.reduce((sum, item) => sum + (item.totalMinutes || 0), 0);
    
    return {
      totalMinutes,
      timeRange: options.timeRange,
      theme: options.theme
    };
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  // Public utility methods
  getExportFormats(): { id: string; name: string; description: string }[] {
    return [
      { id: 'pdf', name: 'PDF Report', description: 'Comprehensive report with charts and insights' },
      { id: 'json', name: 'JSON Data', description: 'Raw data for developers and advanced users' },
      { id: 'csv', name: 'CSV Spreadsheet', description: 'Data in spreadsheet format for analysis' },
      { id: 'image', name: 'Summary Image', description: 'Visual summary perfect for sharing' }
    ];
  }

  getSharePlatforms(): { id: string; name: string; icon: string }[] {
    return [
      { id: 'general', name: 'Share', icon: '📤' },
      { id: 'twitter', name: 'Twitter', icon: '🐦' },
      { id: 'facebook', name: 'Facebook', icon: '📘' },
      { id: 'instagram', name: 'Instagram', icon: '📷' },
      { id: 'linkedin', name: 'LinkedIn', icon: '💼' }
    ];
  }
}
