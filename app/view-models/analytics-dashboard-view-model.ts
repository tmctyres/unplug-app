import { Observable } from '@nativescript/core';
import { AnalyticsService } from '../services/analytics-service';
import { UserDataService } from '../models/user-data';
import { ChartFactory } from '../components/charts/chart-factory';
import { ExportService, ExportOptions } from '../services/export-service';
import {
  AnalyticsData,
  DailyAnalytics,
  WeeklyAnalytics,
  MonthlyAnalytics,
  TimeRange,
  PredictiveInsight
} from '../models/analytics-data';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';

export class AnalyticsDashboardViewModel extends Observable {
  private analyticsService: AnalyticsService;
  private userDataService: UserDataService;
  private exportService: ExportService;
  private currentTimeRange: 'week' | 'month' | 'quarter' | 'year' = 'week';
  private analyticsData: AnalyticsData | null = null;

  constructor() {
    super();
    this.analyticsService = AnalyticsService.getInstance();
    this.userDataService = UserDataService.getInstance();
    this.exportService = ExportService.getInstance();
    this.initializeAnalytics();
    this.setupEventListeners();
    this.setupExportListeners();
  }

  private async initializeAnalytics(): Promise<void> {
    try {
      this.set('isLoading', true);
      
      // Initialize analytics service
      await this.analyticsService.initialize();
      
      // Load analytics data
      this.analyticsData = this.analyticsService.getAnalyticsData();
      
      if (this.analyticsData) {
        this.loadDashboardData();
      } else {
        // Calculate analytics if not available
        this.analyticsData = await this.analyticsService.calculateAnalytics();
        this.loadDashboardData();
      }
      
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
      this.set('hasError', true);
      this.set('errorMessage', 'Failed to load analytics data');
    } finally {
      this.set('isLoading', false);
    }
  }

  private setupEventListeners(): void {
    this.analyticsService.on('propertyChange', (args) => {
      if (isPropertyChangeEvent(args) && args.propertyName === 'analyticsUpdated') {
        this.analyticsData = args.value;
        this.loadDashboardData();
      }
    });
  }

  private loadDashboardData(): void {
    if (!this.analyticsData) return;

    // Load overview stats
    this.loadOverviewStats();
    
    // Load charts based on current time range
    this.loadChartsForTimeRange();
    
    // Load insights
    this.loadInsights();
    
    // Load progress rings
    this.loadProgressRings();
    
    // Load recent achievements
    this.loadRecentAchievements();
  }

  private loadOverviewStats(): void {
    if (!this.analyticsData) return;

    const timeRangeData = this.getDataForTimeRange();
    
    // Calculate overview metrics
    const totalMinutes = timeRangeData.reduce((sum, item) => sum + (item.totalMinutes || 0), 0);
    const totalSessions = timeRangeData.reduce((sum, item) => sum + (item.sessionCount || 0), 0);
    const averageSessionLength = totalSessions > 0 ? totalMinutes / totalSessions : 0;
    const goalCompletions = timeRangeData.reduce((sum, item) => sum + (item.goalCompletions || 0), 0);
    
    // Calculate changes from previous period
    const previousPeriodData = this.getPreviousPeriodData();
    const changes = this.calculateChanges(timeRangeData, previousPeriodData);

    this.set('overviewStats', {
      totalMinutes: Math.round(totalMinutes),
      totalSessions,
      averageSessionLength: Math.round(averageSessionLength),
      goalCompletions,
      changes
    });
  }

  private loadChartsForTimeRange(): void {
    if (!this.analyticsData) return;

    const charts = [];

    switch (this.currentTimeRange) {
      case 'week':
        charts.push(this.createWeeklyCharts());
        break;
      case 'month':
        charts.push(this.createMonthlyCharts());
        break;
      case 'quarter':
        charts.push(this.createQuarterlyCharts());
        break;
      case 'year':
        charts.push(this.createYearlyCharts());
        break;
    }

    this.set('charts', charts.flat());
  }

  private createWeeklyCharts(): any[] {
    const dailyData = this.analyticsData!.dailyAnalytics.slice(-7);
    
    return [
      {
        id: 'daily_trend',
        title: 'Daily Progress',
        type: 'line',
        chart: ChartFactory.createTrendChart(dailyData, 'totalMinutes'),
        description: 'Your daily offline minutes over the past week'
      },
      {
        id: 'daily_breakdown',
        title: 'Daily Breakdown',
        type: 'bar',
        chart: ChartFactory.createDailyBreakdownChart(dailyData),
        description: 'Sessions and minutes for each day'
      }
    ];
  }

  private createMonthlyCharts(): any[] {
    const weeklyData = this.analyticsData!.weeklyAnalytics.slice(-4);
    
    return [
      {
        id: 'weekly_trend',
        title: 'Weekly Progress',
        type: 'line',
        chart: ChartFactory.createWeeklyTrendChart(weeklyData),
        description: 'Your weekly progress over the past month'
      },
      {
        id: 'weekly_comparison',
        title: 'Weekly Comparison',
        type: 'bar',
        chart: ChartFactory.createWeeklyBarChart(weeklyData),
        description: 'Compare your weekly performance'
      }
    ];
  }

  private createQuarterlyCharts(): any[] {
    const monthlyData = this.analyticsData!.monthlyAnalytics.slice(-3);
    
    return [
      {
        id: 'monthly_comparison',
        title: 'Monthly Progress',
        type: 'bar',
        chart: ChartFactory.createMonthlyComparisonChart(monthlyData),
        description: 'Your progress over the past quarter'
      }
    ];
  }

  private createYearlyCharts(): any[] {
    const monthlyData = this.analyticsData!.monthlyAnalytics.slice(-12);
    
    return [
      {
        id: 'yearly_overview',
        title: 'Yearly Overview',
        type: 'bar',
        chart: ChartFactory.createMonthlyComparisonChart(monthlyData),
        description: 'Your progress throughout the year'
      }
    ];
  }

  private loadInsights(): void {
    if (!this.analyticsData) return;

    const insights = this.analyticsData.predictiveInsights.slice(0, 5);
    const insightCards = ChartFactory.createInsightCards(insights);
    
    this.set('insights', insights);
    this.set('insightCards', insightCards);
    this.set('hasInsights', insights.length > 0);
  }

  private loadProgressRings(): void {
    if (!this.analyticsData) return;

    const userProfile = this.userDataService.getUserProfile();
    const todayStats = this.userDataService.getTodayStats();
    
    const progressRings = [
      {
        id: 'daily_goal',
        title: 'Daily Goal',
        ring: ChartFactory.createDailyGoalRing(
          todayStats?.offlineMinutes || 0,
          userProfile.settings.dailyGoalMinutes
        )
      },
      {
        id: 'streak',
        title: 'Streak',
        ring: ChartFactory.createStreakRing(userProfile.currentStreak)
      },
      {
        id: 'xp_progress',
        title: 'Level Progress',
        ring: ChartFactory.createXPRing(
          userProfile.totalXP,
          this.userDataService.getXPForNextLevel()
        )
      },
      {
        id: 'consistency',
        title: 'Consistency',
        ring: ChartFactory.createConsistencyRing(this.analyticsData.weeklyAnalytics)
      }
    ];

    this.set('progressRings', progressRings);
  }

  private loadRecentAchievements(): void {
    const userProfile = this.userDataService.getUserProfile();
    const recentAchievements = userProfile.achievements
      .filter(achievement => achievement.unlocked)
      .sort((a, b) => new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime())
      .slice(0, 3);

    this.set('recentAchievements', recentAchievements);
    this.set('hasRecentAchievements', recentAchievements.length > 0);
  }

  private getDataForTimeRange(): any[] {
    if (!this.analyticsData) return [];

    switch (this.currentTimeRange) {
      case 'week':
        return this.analyticsData.dailyAnalytics.slice(-7);
      case 'month':
        return this.analyticsData.weeklyAnalytics.slice(-4);
      case 'quarter':
        return this.analyticsData.monthlyAnalytics.slice(-3);
      case 'year':
        return this.analyticsData.monthlyAnalytics.slice(-12);
      default:
        return this.analyticsData.dailyAnalytics.slice(-7);
    }
  }

  private getPreviousPeriodData(): any[] {
    if (!this.analyticsData) return [];

    switch (this.currentTimeRange) {
      case 'week':
        return this.analyticsData.dailyAnalytics.slice(-14, -7);
      case 'month':
        return this.analyticsData.weeklyAnalytics.slice(-8, -4);
      case 'quarter':
        return this.analyticsData.monthlyAnalytics.slice(-6, -3);
      case 'year':
        return this.analyticsData.monthlyAnalytics.slice(-24, -12);
      default:
        return [];
    }
  }

  private calculateChanges(current: any[], previous: any[]): any {
    if (previous.length === 0) {
      return { totalMinutes: 0, sessionCount: 0, averageSessionLength: 0 };
    }

    const currentTotal = current.reduce((sum, item) => sum + (item.totalMinutes || 0), 0);
    const previousTotal = previous.reduce((sum, item) => sum + (item.totalMinutes || 0), 0);
    
    const currentSessions = current.reduce((sum, item) => sum + (item.sessionCount || 0), 0);
    const previousSessions = previous.reduce((sum, item) => sum + (item.sessionCount || 0), 0);
    
    const currentAvg = currentSessions > 0 ? currentTotal / currentSessions : 0;
    const previousAvg = previousSessions > 0 ? previousTotal / previousSessions : 0;

    return {
      totalMinutes: previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0,
      sessionCount: previousSessions > 0 ? ((currentSessions - previousSessions) / previousSessions) * 100 : 0,
      averageSessionLength: previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0
    };
  }

  // Public methods for UI interaction
  onTimeRangeChange(newTimeRange: 'week' | 'month' | 'quarter' | 'year'): void {
    this.currentTimeRange = newTimeRange;
    this.set('currentTimeRange', newTimeRange);
    this.loadChartsForTimeRange();
    this.loadOverviewStats();
  }

  onRefreshData(): void {
    this.initializeAnalytics();
  }

  onNavigateToDetailedView(chartId: string): void {
    // Navigate to detailed view for specific chart
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate({
      moduleName: 'views/analytics-detail-page',
      context: { chartId, timeRange: this.currentTimeRange }
    });
  }

  onShareInsight(insight: PredictiveInsight): void {
    try {
      const shareableContent = this.exportService.generateShareableContent('insight', insight);
      this.exportService.shareContent(shareableContent);
    } catch (error) {
      console.error('Failed to share insight:', error);
      this.showError('Failed to share insight');
    }
  }

  onShareProgress(): void {
    try {
      const userProfile = this.userDataService.getUserProfile();
      const overviewStats = this.get('overviewStats');

      const progressData = {
        totalMinutes: overviewStats.totalMinutes,
        streak: userProfile.currentStreak,
        level: userProfile.level,
        timeRange: this.currentTimeRange
      };

      const shareableContent = this.exportService.generateShareableContent('progress', progressData);
      this.exportService.shareContent(shareableContent);
    } catch (error) {
      console.error('Failed to share progress:', error);
      this.showError('Failed to share progress');
    }
  }

  onShareAchievement(achievement: any): void {
    try {
      const shareableContent = this.exportService.generateShareableContent('achievement', achievement);
      this.exportService.shareContent(shareableContent);
    } catch (error) {
      console.error('Failed to share achievement:', error);
      this.showError('Failed to share achievement');
    }
  }

  onExportReport(): void {
    // Show export options dialog
    this.showExportOptionsDialog();
  }

  onQuickExport(format: 'pdf' | 'image' | 'json'): void {
    const options: ExportOptions = {
      format,
      timeRange: this.currentTimeRange,
      includeCharts: true,
      includeInsights: true,
      includePersonalBests: true,
      includeComparisons: true,
      theme: 'light'
    };

    this.generateAndExportReport(options);
  }

  private showExportOptionsDialog(): void {
    const { Dialogs } = require('@nativescript/core');

    const exportFormats = this.exportService.getExportFormats();
    const options = exportFormats.map(format => format.name);

    Dialogs.action({
      title: 'Export Analytics Report',
      message: 'Choose export format:',
      actions: options,
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result !== 'Cancel') {
        const selectedFormat = exportFormats.find(f => f.name === result);
        if (selectedFormat) {
          this.showExportCustomizationDialog(selectedFormat.id as any);
        }
      }
    });
  }

  private showExportCustomizationDialog(format: 'pdf' | 'json' | 'csv' | 'image'): void {
    // For now, use default options. In a full implementation, show customization dialog
    const options: ExportOptions = {
      format,
      timeRange: this.currentTimeRange,
      includeCharts: true,
      includeInsights: true,
      includePersonalBests: true,
      includeComparisons: true,
      theme: 'light',
      customTitle: `${this.userDataService.getUserProfile().userTitle || 'My'} Digital Wellness Report`
    };

    this.generateAndExportReport(options);
  }

  private async generateAndExportReport(options: ExportOptions): Promise<void> {
    try {
      this.set('isExporting', true);
      this.set('exportProgress', 0);

      if (!this.analyticsData) {
        throw new Error('No analytics data available');
      }

      // Export the report
      const filePath = await this.exportService.exportAnalyticsReport(this.analyticsData, options);

      this.showSuccess(`Report exported successfully to: ${filePath}`);

      // Offer to share the exported file
      this.offerToShareExportedFile(filePath, options.format);

    } catch (error) {
      console.error('Failed to export report:', error);
      this.showError('Failed to export report: ' + error.message);
    } finally {
      this.set('isExporting', false);
      this.set('exportProgress', 0);
    }
  }

  private offerToShareExportedFile(filePath: string, format: string): void {
    const { Dialogs } = require('@nativescript/core');

    Dialogs.confirm({
      title: 'Export Complete',
      message: `Your ${format.toUpperCase()} report has been saved. Would you like to share it?`,
      okButtonText: 'Share',
      cancelButtonText: 'Done'
    }).then((result) => {
      if (result) {
        this.shareExportedFile(filePath);
      }
    });
  }

  private async shareExportedFile(filePath: string): Promise<void> {
    try {
      const { SocialShare } = require('@nativescript/social-share');
      await SocialShare.shareText(
        'Check out my digital wellness analytics report from Unplug!',
        'Digital Wellness Report'
      );
    } catch (error) {
      console.error('Failed to share file:', error);
      this.showError('Failed to share file');
    }
  }

  private setupExportListeners(): void {
    this.exportService.on('propertyChange', (args) => {
      if (isPropertyChangeEvent(args) && args.propertyName === 'exportProgress') {
        this.set('exportProgress', args.value.progress);
        this.set('exportStatus', args.value.status);
      }
    });
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  formatChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${Math.round(change)}%`;
  }

  getChangeColor(change: number): string {
    if (change > 0) return '#10B981'; // Green
    if (change < 0) return '#EF4444'; // Red
    return '#6B7280'; // Gray
  }

  private showSuccess(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'success', message });
  }

  private showError(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'error', message });
  }

  onBack(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  // Getters for computed properties
  get timeRangeOptions(): any[] {
    return [
      { id: 'week', name: 'This Week', icon: '📅' },
      { id: 'month', name: 'This Month', icon: '📊' },
      { id: 'quarter', name: 'Quarter', icon: '📈' },
      { id: 'year', name: 'This Year', icon: '🗓️' }
    ];
  }

  get currentTimeRangeDisplay(): string {
    const options = this.timeRangeOptions;
    const current = options.find(option => option.id === this.currentTimeRange);
    return current ? current.name : 'This Week';
  }
}
