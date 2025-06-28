import { Observable } from '@nativescript/core';
import { 
  ComparisonMetrics, 
  TimeRange, 
  DailyAnalytics, 
  WeeklyAnalytics, 
  MonthlyAnalytics,
  PersonalBest,
  TrendAnalysis
} from '../models/analytics-data';
import { UserDataService } from '../models/user-data';

export interface ComparisonPeriod {
  id: string;
  name: string;
  current: TimeRange;
  previous: TimeRange;
  type: 'week' | 'month' | 'quarter' | 'year';
}

export interface PersonalBestEvent {
  category: string;
  oldValue: number;
  newValue: number;
  improvement: number;
  date: Date;
  significance: 'minor' | 'major' | 'milestone';
}

export class ComparisonAnalytics extends Observable {
  private static instance: ComparisonAnalytics;
  private userDataService: UserDataService;
  private personalBests: PersonalBest[] = [];

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
  }

  static getInstance(): ComparisonAnalytics {
    if (!ComparisonAnalytics.instance) {
      ComparisonAnalytics.instance = new ComparisonAnalytics();
    }
    return ComparisonAnalytics.instance;
  }

  // Week-over-Week Comparison
  getWeekOverWeekComparison(currentWeekData: WeeklyAnalytics, previousWeekData: WeeklyAnalytics): ComparisonMetrics {
    const current = {
      period: {
        start: new Date(currentWeekData.weekStart),
        end: new Date(new Date(currentWeekData.weekStart).getTime() + 6 * 24 * 60 * 60 * 1000)
      },
      totalMinutes: currentWeekData.totalMinutes,
      sessionCount: currentWeekData.sessionCount,
      averageLength: currentWeekData.averageSessionLength,
      goalCompletions: currentWeekData.goalCompletions,
      consistencyScore: currentWeekData.patterns.consistencyScore
    };

    const previous = {
      period: {
        start: new Date(previousWeekData.weekStart),
        end: new Date(new Date(previousWeekData.weekStart).getTime() + 6 * 24 * 60 * 60 * 1000)
      },
      totalMinutes: previousWeekData.totalMinutes,
      sessionCount: previousWeekData.sessionCount,
      averageLength: previousWeekData.averageSessionLength,
      goalCompletions: previousWeekData.goalCompletions,
      consistencyScore: previousWeekData.patterns.consistencyScore
    };

    const changes = this.calculateChanges(current, previous);
    const insights = this.generateComparisonInsights(current, previous, 'week');

    return { current, previous, changes, insights };
  }

  // Month-over-Month Comparison
  getMonthOverMonthComparison(currentMonthData: MonthlyAnalytics, previousMonthData: MonthlyAnalytics): ComparisonMetrics {
    const current = {
      period: {
        start: new Date(currentMonthData.month + '-01'),
        end: new Date(new Date(currentMonthData.month + '-01').getFullYear(), 
                     new Date(currentMonthData.month + '-01').getMonth() + 1, 0)
      },
      totalMinutes: currentMonthData.totalMinutes,
      sessionCount: currentMonthData.sessionCount,
      averageLength: currentMonthData.averageSessionLength,
      goalCompletions: currentMonthData.goalCompletions,
      consistencyScore: this.calculateMonthlyConsistency(currentMonthData)
    };

    const previous = {
      period: {
        start: new Date(previousMonthData.month + '-01'),
        end: new Date(new Date(previousMonthData.month + '-01').getFullYear(), 
                     new Date(previousMonthData.month + '-01').getMonth() + 1, 0)
      },
      totalMinutes: previousMonthData.totalMinutes,
      sessionCount: previousMonthData.sessionCount,
      averageLength: previousMonthData.averageSessionLength,
      goalCompletions: previousMonthData.goalCompletions,
      consistencyScore: this.calculateMonthlyConsistency(previousMonthData)
    };

    const changes = this.calculateChanges(current, previous);
    const insights = this.generateComparisonInsights(current, previous, 'month');

    return { current, previous, changes, insights };
  }

  // Personal Best Tracking
  checkForPersonalBests(newData: DailyAnalytics | WeeklyAnalytics | MonthlyAnalytics): PersonalBestEvent[] {
    const events: PersonalBestEvent[] = [];
    const userProfile = this.userDataService.getUserProfile();
    
    // Check different categories of personal bests
    if ('longestSession' in newData) {
      // Daily data
      const dailyData = newData as DailyAnalytics;
      
      // Longest single session
      const currentLongestSession = this.getCurrentPersonalBest('longest_session');
      if (dailyData.longestSession > (currentLongestSession?.value || 0)) {
        events.push(this.createPersonalBestEvent(
          'longest_session',
          currentLongestSession?.value || 0,
          dailyData.longestSession,
          new Date(dailyData.date)
        ));
      }

      // Most daily minutes
      const currentMostDaily = this.getCurrentPersonalBest('most_daily_minutes');
      if (dailyData.totalMinutes > (currentMostDaily?.value || 0)) {
        events.push(this.createPersonalBestEvent(
          'most_daily_minutes',
          currentMostDaily?.value || 0,
          dailyData.totalMinutes,
          new Date(dailyData.date)
        ));
      }

      // Most daily sessions
      const currentMostSessions = this.getCurrentPersonalBest('most_daily_sessions');
      if (dailyData.sessionCount > (currentMostSessions?.value || 0)) {
        events.push(this.createPersonalBestEvent(
          'most_daily_sessions',
          currentMostSessions?.value || 0,
          dailyData.sessionCount,
          new Date(dailyData.date)
        ));
      }
    }

    if ('weekStart' in newData) {
      // Weekly data
      const weeklyData = newData as WeeklyAnalytics;
      
      // Most weekly minutes
      const currentMostWeekly = this.getCurrentPersonalBest('most_weekly_minutes');
      if (weeklyData.totalMinutes > (currentMostWeekly?.value || 0)) {
        events.push(this.createPersonalBestEvent(
          'most_weekly_minutes',
          currentMostWeekly?.value || 0,
          weeklyData.totalMinutes,
          new Date(weeklyData.weekStart)
        ));
      }

      // Best consistency score
      const currentBestConsistency = this.getCurrentPersonalBest('best_consistency');
      if (weeklyData.patterns.consistencyScore > (currentBestConsistency?.value || 0)) {
        events.push(this.createPersonalBestEvent(
          'best_consistency',
          currentBestConsistency?.value || 0,
          weeklyData.patterns.consistencyScore,
          new Date(weeklyData.weekStart)
        ));
      }
    }

    // Check streak records
    const currentStreakRecord = this.getCurrentPersonalBest('longest_streak');
    if (userProfile.currentStreak > (currentStreakRecord?.value || 0)) {
      events.push(this.createPersonalBestEvent(
        'longest_streak',
        currentStreakRecord?.value || 0,
        userProfile.currentStreak,
        new Date()
      ));
    }

    // Update personal bests and emit events
    events.forEach(event => {
      this.updatePersonalBest(event);
      this.emitPersonalBestEvent(event);
    });

    return events;
  }

  // Trend Analysis
  analyzeTrend(data: (DailyAnalytics | WeeklyAnalytics | MonthlyAnalytics)[], metric: string, periods: number = 4): TrendAnalysis | null {
    if (data.length < periods) return null;

    const recentData = data.slice(-periods);
    const values = recentData.map(item => item[metric] || 0);
    
    // Calculate linear regression
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Determine trend direction and strength
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const totalChange = ((lastValue - firstValue) / firstValue) * 100;

    let direction: 'increasing' | 'decreasing' | 'stable';
    let strength: 'weak' | 'moderate' | 'strong';
    let significance: 'low' | 'medium' | 'high';

    if (Math.abs(totalChange) < 5) {
      direction = 'stable';
      strength = 'weak';
      significance = 'low';
    } else if (totalChange > 0) {
      direction = 'increasing';
      strength = totalChange > 25 ? 'strong' : totalChange > 10 ? 'moderate' : 'weak';
      significance = totalChange > 20 ? 'high' : totalChange > 10 ? 'medium' : 'low';
    } else {
      direction = 'decreasing';
      strength = totalChange < -25 ? 'strong' : totalChange < -10 ? 'moderate' : 'weak';
      significance = totalChange < -20 ? 'high' : totalChange < -10 ? 'medium' : 'low';
    }

    return {
      metric,
      direction,
      strength,
      confidence: Math.min(n / 6, 1),
      timeframe: `${n} periods`,
      significance,
      description: `${metric} has been ${direction} ${strength}ly over the past ${n} periods`
    };
  }

  // Helper Methods
  private calculateChanges(current: any, previous: any): any {
    const calculatePercentageChange = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      minutesChange: calculatePercentageChange(current.totalMinutes, previous.totalMinutes),
      sessionCountChange: calculatePercentageChange(current.sessionCount, previous.sessionCount),
      averageLengthChange: calculatePercentageChange(current.averageLength, previous.averageLength),
      goalCompletionsChange: calculatePercentageChange(current.goalCompletions, previous.goalCompletions),
      consistencyChange: calculatePercentageChange(current.consistencyScore, previous.consistencyScore)
    };
  }

  private generateComparisonInsights(current: any, previous: any, period: string): string[] {
    const insights: string[] = [];
    const changes = this.calculateChanges(current, previous);

    // Minutes insights
    if (changes.minutesChange > 20) {
      insights.push(`🚀 Excellent! You increased your ${period}ly minutes by ${Math.round(changes.minutesChange)}%`);
    } else if (changes.minutesChange > 10) {
      insights.push(`📈 Great progress! Your ${period}ly minutes improved by ${Math.round(changes.minutesChange)}%`);
    } else if (changes.minutesChange < -20) {
      insights.push(`📉 Your ${period}ly minutes decreased by ${Math.round(Math.abs(changes.minutesChange))}%. Consider what might have changed.`);
    }

    // Consistency insights
    if (changes.consistencyChange > 15) {
      insights.push(`🎯 Your consistency improved significantly this ${period}!`);
    } else if (changes.consistencyChange < -15) {
      insights.push(`⚠️ Your consistency dropped this ${period}. Try to maintain regular sessions.`);
    }

    // Session count insights
    if (changes.sessionCountChange > 25) {
      insights.push(`🔥 You're on fire! ${Math.round(changes.sessionCountChange)}% more sessions this ${period}!`);
    }

    // Goal completion insights
    if (changes.goalCompletionsChange > 0) {
      insights.push(`🏆 You completed ${Math.round(changes.goalCompletionsChange)}% more goals this ${period}!`);
    }

    return insights.slice(0, 3); // Limit to top 3 insights
  }

  private calculateMonthlyConsistency(monthData: MonthlyAnalytics): number {
    const weeklyConsistencies = monthData.weeklyBreakdown.map(week => week.patterns.consistencyScore);
    return weeklyConsistencies.reduce((sum, score) => sum + score, 0) / weeklyConsistencies.length;
  }

  private getCurrentPersonalBest(category: string): PersonalBest | null {
    return this.personalBests.find(best => best.category === category) || null;
  }

  private createPersonalBestEvent(category: string, oldValue: number, newValue: number, date: Date): PersonalBestEvent {
    const improvement = oldValue > 0 ? ((newValue - oldValue) / oldValue) * 100 : 100;
    
    let significance: 'minor' | 'major' | 'milestone';
    if (improvement > 50 || this.isMilestoneValue(newValue, category)) {
      significance = 'milestone';
    } else if (improvement > 20) {
      significance = 'major';
    } else {
      significance = 'minor';
    }

    return {
      category,
      oldValue,
      newValue,
      improvement,
      date,
      significance
    };
  }

  private isMilestoneValue(value: number, category: string): boolean {
    const milestones = {
      'longest_session': [60, 120, 180, 240], // 1h, 2h, 3h, 4h
      'most_daily_minutes': [120, 240, 360, 480], // 2h, 4h, 6h, 8h
      'longest_streak': [7, 14, 30, 60, 100], // 1w, 2w, 1m, 2m, 100d
      'most_weekly_minutes': [600, 1200, 1800, 2400] // 10h, 20h, 30h, 40h
    };

    return milestones[category]?.includes(value) || false;
  }

  private updatePersonalBest(event: PersonalBestEvent): void {
    const existingIndex = this.personalBests.findIndex(best => best.category === event.category);
    
    const newBest: PersonalBest = {
      id: `${event.category}_${Date.now()}`,
      category: event.category as any,
      title: this.getPersonalBestTitle(event.category),
      value: event.newValue,
      unit: this.getPersonalBestUnit(event.category),
      date: event.date,
      previousBest: event.oldValue > 0 ? {
        value: event.oldValue,
        date: existingIndex >= 0 ? this.personalBests[existingIndex].date : new Date()
      } : undefined,
      improvement: event.improvement
    };

    if (existingIndex >= 0) {
      this.personalBests[existingIndex] = newBest;
    } else {
      this.personalBests.push(newBest);
    }

    // Save to user data
    this.userDataService.updatePersonalBests(this.personalBests);
  }

  private emitPersonalBestEvent(event: PersonalBestEvent): void {
    this.notifyPropertyChange('personalBestAchieved', event);
  }

  private getPersonalBestTitle(category: string): string {
    const titles = {
      'longest_session': 'Longest Session',
      'most_daily_minutes': 'Most Daily Minutes',
      'most_daily_sessions': 'Most Daily Sessions',
      'most_weekly_minutes': 'Most Weekly Minutes',
      'longest_streak': 'Longest Streak',
      'best_consistency': 'Best Consistency'
    };
    return titles[category] || category;
  }

  private getPersonalBestUnit(category: string): string {
    const units = {
      'longest_session': 'minutes',
      'most_daily_minutes': 'minutes',
      'most_daily_sessions': 'sessions',
      'most_weekly_minutes': 'minutes',
      'longest_streak': 'days',
      'best_consistency': '%'
    };
    return units[category] || '';
  }

  // Public methods
  getPersonalBests(): PersonalBest[] {
    return [...this.personalBests];
  }

  getComparisonPeriods(): ComparisonPeriod[] {
    const now = new Date();
    
    return [
      {
        id: 'this_week_vs_last',
        name: 'This Week vs Last Week',
        type: 'week',
        current: {
          start: this.getWeekStart(now),
          end: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)
        },
        previous: {
          start: new Date(this.getWeekStart(now).getTime() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(this.getWeekStart(now).getTime() - 1 * 24 * 60 * 60 * 1000)
        }
      },
      {
        id: 'this_month_vs_last',
        name: 'This Month vs Last Month',
        type: 'month',
        current: {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        },
        previous: {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0)
        }
      }
    ];
  }

  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }
}
