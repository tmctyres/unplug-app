import { Observable } from '@nativescript/core';
import { AnalyticsService } from '../services/analytics-service';
import { ComparisonAnalytics } from '../services/comparison-analytics';
import { ExportService } from '../services/export-service';
import { ChartFactory } from '../components/charts/chart-factory';
import { AnalyticsData } from '../models/analytics-data';

export class AnalyticsDetailViewModel extends Observable {
  private analyticsService: AnalyticsService;
  private comparisonAnalytics: ComparisonAnalytics;
  private exportService: ExportService;
  private chartId: string;
  private timeRange: string;
  private analyticsData: AnalyticsData | null = null;

  constructor(context: any) {
    super();
    this.analyticsService = AnalyticsService.getInstance();
    this.comparisonAnalytics = ComparisonAnalytics.getInstance();
    this.exportService = ExportService.getInstance();
    
    this.chartId = context?.chartId || 'daily_trend';
    this.timeRange = context?.timeRange || 'week';
    
    this.initializeDetailView();
  }

  private async initializeDetailView(): Promise<void> {
    try {
      this.set('isLoading', true);
      
      // Get analytics data
      this.analyticsData = this.analyticsService.getAnalyticsData();
      
      if (this.analyticsData) {
        this.loadDetailedChart();
        this.loadComparisons();
        this.loadTrendAnalysis();
        this.loadRelatedInsights();
      }
      
    } catch (error) {
      console.error('Failed to load analytics detail:', error);
      this.set('hasError', true);
      this.set('errorMessage', 'Failed to load detailed analytics');
    } finally {
      this.set('isLoading', false);
    }
  }

  private loadDetailedChart(): void {
    if (!this.analyticsData) return;

    let chartData: any = null;
    let chartTitle = '';
    let chartDescription = '';

    switch (this.chartId) {
      case 'daily_trend':
        const dailyData = this.analyticsData.dailyAnalytics.slice(-14); // Last 2 weeks
        chartData = ChartFactory.createTrendChart(dailyData, 'totalMinutes');
        chartTitle = 'Daily Minutes Trend';
        chartDescription = 'Your daily offline minutes over the past two weeks';
        break;

      case 'weekly_trend':
        const weeklyData = this.analyticsData.weeklyAnalytics.slice(-8); // Last 2 months
        chartData = ChartFactory.createWeeklyTrendChart(weeklyData);
        chartTitle = 'Weekly Progress Trend';
        chartDescription = 'Your weekly progress over the past two months';
        break;

      case 'session_analysis':
        const sessionData = this.analyticsData.dailyAnalytics.slice(-7);
        chartData = ChartFactory.createTrendChart(sessionData, 'sessionCount');
        chartTitle = 'Session Count Analysis';
        chartDescription = 'Number of sessions per day over the past week';
        break;

      case 'consistency_analysis':
        const consistencyData = this.analyticsData.weeklyAnalytics.slice(-6);
        chartData = this.createConsistencyChart(consistencyData);
        chartTitle = 'Consistency Analysis';
        chartDescription = 'Your consistency score over the past 6 weeks';
        break;

      default:
        chartData = ChartFactory.createTrendChart(this.analyticsData.dailyAnalytics.slice(-7), 'totalMinutes');
        chartTitle = 'Analytics Overview';
        chartDescription = 'General analytics overview';
    }

    this.set('chartData', chartData);
    this.set('chartTitle', chartTitle);
    this.set('chartDescription', chartDescription);
  }

  private loadComparisons(): void {
    if (!this.analyticsData) return;

    const comparisons = [];

    // Week over week comparison
    const weekComparison = this.analyticsService.getWeekOverWeekComparison();
    if (weekComparison) {
      comparisons.push({
        id: 'week_over_week',
        title: 'This Week vs Last Week',
        type: 'week',
        data: weekComparison,
        insights: weekComparison.insights
      });
    }

    // Month over month comparison
    const monthComparison = this.analyticsService.getMonthOverMonthComparison();
    if (monthComparison) {
      comparisons.push({
        id: 'month_over_month',
        title: 'This Month vs Last Month',
        type: 'month',
        data: monthComparison,
        insights: monthComparison.insights
      });
    }

    this.set('comparisons', comparisons);
    this.set('hasComparisons', comparisons.length > 0);
  }

  private loadTrendAnalysis(): void {
    if (!this.analyticsData) return;

    const trends = [];

    // Analyze different metrics
    const metrics = ['totalMinutes', 'sessionCount', 'averageSessionLength'];
    
    metrics.forEach(metric => {
      const trend = this.analyticsService.getTrendAnalysis(metric, 'weekly');
      if (trend && trend.significance !== 'low') {
        trends.push({
          metric,
          trend,
          title: this.getMetricDisplayName(metric),
          description: trend.description,
          recommendation: this.getTrendRecommendation(trend)
        });
      }
    });

    this.set('trends', trends);
    this.set('hasTrends', trends.length > 0);
  }

  private loadRelatedInsights(): void {
    if (!this.analyticsData) return;

    // Filter insights related to the current chart
    const allInsights = this.analyticsData.predictiveInsights;
    const relatedInsights = allInsights.filter(insight => {
      return this.isInsightRelatedToChart(insight, this.chartId);
    });

    this.set('relatedInsights', relatedInsights);
    this.set('hasRelatedInsights', relatedInsights.length > 0);
  }

  private createConsistencyChart(weeklyData: any[]): any {
    return {
      title: 'Consistency Score',
      series: [{
        name: 'Consistency %',
        data: weeklyData.map(week => ({
          x: new Date(week.weekStart),
          y: week.patterns.consistencyScore,
          metadata: { unit: 'percentage' }
        })),
        color: '#10B981',
        type: 'line'
      }],
      showLegend: false,
      animated: true
    };
  }

  private getMetricDisplayName(metric: string): string {
    const names = {
      'totalMinutes': 'Total Minutes',
      'sessionCount': 'Session Count',
      'averageSessionLength': 'Average Session Length',
      'goalCompletions': 'Goal Completions',
      'consistencyScore': 'Consistency Score'
    };
    return names[metric] || metric;
  }

  private getTrendRecommendation(trend: any): string {
    const { direction, strength, metric } = trend;
    
    if (direction === 'increasing' && strength === 'strong') {
      return `Excellent! Your ${metric} is trending strongly upward. Keep up the great work!`;
    } else if (direction === 'decreasing' && strength === 'strong') {
      return `Your ${metric} has been declining. Consider what might be affecting your routine and how to get back on track.`;
    } else if (direction === 'stable') {
      return `Your ${metric} has been consistent. This shows good discipline and routine.`;
    } else {
      return `Your ${metric} shows ${direction} ${strength} trends. Monitor this closely.`;
    }
  }

  private isInsightRelatedToChart(insight: any, chartId: string): boolean {
    const chartInsightMap = {
      'daily_trend': ['optimal_timing', 'consistency_improvement'],
      'weekly_trend': ['goal_achievement', 'trend_analysis'],
      'session_analysis': ['session_length_optimization', 'optimal_timing'],
      'consistency_analysis': ['consistency_improvement', 'habit_formation']
    };

    const relatedTypes = chartInsightMap[chartId] || [];
    return relatedTypes.includes(insight.type);
  }

  // Public methods for UI interaction
  onTimeRangeChange(newTimeRange: string): void {
    this.timeRange = newTimeRange;
    this.set('timeRange', newTimeRange);
    this.loadDetailedChart();
  }

  onExportChart(): void {
    try {
      const exportData = {
        chartId: this.chartId,
        chartTitle: this.get('chartTitle'),
        chartData: this.get('chartData'),
        timeRange: this.timeRange,
        comparisons: this.get('comparisons'),
        trends: this.get('trends')
      };

      const shareableContent = this.exportService.generateShareableContent('report', exportData);
      this.exportService.shareContent(shareableContent);
    } catch (error) {
      console.error('Failed to export chart:', error);
      this.showError('Failed to export chart');
    }
  }

  onShareInsight(insight: any): void {
    try {
      const shareableContent = this.exportService.generateShareableContent('insight', insight);
      this.exportService.shareContent(shareableContent);
    } catch (error) {
      console.error('Failed to share insight:', error);
      this.showError('Failed to share insight');
    }
  }

  onViewComparison(comparisonId: string): void {
    const comparison = this.get('comparisons').find(c => c.id === comparisonId);
    if (comparison) {
      this.set('selectedComparison', comparison);
      this.set('showComparisonDetail', true);
    }
  }

  onCloseComparisonDetail(): void {
    this.set('showComparisonDetail', false);
    this.set('selectedComparison', null);
  }

  onBack(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  // Utility methods
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

  getTrendIcon(direction: string): string {
    switch (direction) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '📊';
      default: return '📊';
    }
  }

  getTrendColor(direction: string, strength: string): string {
    if (direction === 'increasing') {
      return strength === 'strong' ? '#10B981' : '#84CC16';
    } else if (direction === 'decreasing') {
      return strength === 'strong' ? '#EF4444' : '#F97316';
    } else {
      return '#6B7280';
    }
  }

  private showError(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'error', message });
  }

  // Getters for computed properties
  get timeRangeOptions(): any[] {
    return [
      { id: 'week', name: 'Week', icon: '📅' },
      { id: 'month', name: 'Month', icon: '📊' },
      { id: 'quarter', name: 'Quarter', icon: '📈' },
      { id: 'year', name: 'Year', icon: '🗓️' }
    ];
  }

  get chartTypeOptions(): any[] {
    return [
      { id: 'daily_trend', name: 'Daily Trend', icon: '📈' },
      { id: 'weekly_trend', name: 'Weekly Trend', icon: '📊' },
      { id: 'session_analysis', name: 'Session Analysis', icon: '🎯' },
      { id: 'consistency_analysis', name: 'Consistency', icon: '💎' }
    ];
  }
}
