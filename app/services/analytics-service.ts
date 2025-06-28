import { Observable } from '@nativescript/core';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';
import { UserDataService } from '../models/user-data';
import { InsightsEngine } from './insights-engine';
import { ComparisonAnalytics } from './comparison-analytics';
import { PersonalBestCelebration } from '../components/personal-best-celebration';
import { 
  AnalyticsData, 
  DailyAnalytics, 
  WeeklyAnalytics, 
  MonthlyAnalytics,
  UserBehaviorPattern,
  PredictiveInsight,
  PersonalBest,
  ComparisonMetrics,
  TimeRange,
  SessionPattern,
  TrendAnalysis,
  InsightRule
} from '../models/analytics-data';

export class AnalyticsService extends Observable {
  private static instance: AnalyticsService;
  private userDataService: UserDataService;
  private analyticsData: AnalyticsData | null = null;
  private insightsEngine: InsightsEngine;
  private comparisonAnalytics: ComparisonAnalytics;
  private personalBestCelebration: PersonalBestCelebration;

  private constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.insightsEngine = InsightsEngine.getInstance();
    this.comparisonAnalytics = ComparisonAnalytics.getInstance();
    this.personalBestCelebration = new PersonalBestCelebration();
    this.setupPersonalBestListeners();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async initialize(): Promise<void> {
    await this.calculateAnalytics();
    this.setupDataListeners();
  }

  private setupDataListeners(): void {
    // Listen for new sessions and update analytics
    this.userDataService.on('propertyChange', (args: PropertyChangeEventData) => {
      if (isPropertyChangeEvent(args) && args.propertyName === 'userProfile') {
        this.scheduleAnalyticsUpdate();
      }
    });

    // Listen for session completion to check for personal bests
    this.userDataService.on('sessionCompleted', (args) => {
      if (isPropertyChangeEvent(args)) {
        this.checkForPersonalBestsOnSessionComplete(args.value);
      }
    });
  }

  private scheduleAnalyticsUpdate(): void {
    // Debounce analytics updates to avoid excessive calculations
    clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(() => {
      this.calculateAnalytics();
    }, 5000); // Update 5 seconds after last change
  }

  private updateTimeout: any;

  async calculateAnalytics(): Promise<AnalyticsData> {
    const userProfile = this.userDataService.getUserProfile();
    
    // Extract session patterns from daily stats and session notes
    const sessionPatterns = this.extractSessionPatterns(userProfile);
    
    // Calculate daily analytics
    const dailyAnalytics = this.calculateDailyAnalytics(userProfile);
    
    // Calculate weekly analytics
    const weeklyAnalytics = this.calculateWeeklyAnalytics(dailyAnalytics);
    
    // Calculate monthly analytics
    const monthlyAnalytics = this.calculateMonthlyAnalytics(weeklyAnalytics);
    
    // Analyze behavior patterns
    const behaviorPatterns = this.analyzeBehaviorPatterns(sessionPatterns);
    
    // Generate predictive insights using the insights engine
    const tempAnalyticsData = {
      userId: userProfile.userTitle || 'user',
      dailyAnalytics,
      weeklyAnalytics,
      monthlyAnalytics,
      behaviorPatterns,
      predictiveInsights: [],
      personalBests: [],
      preferences: {
        defaultTimeRange: 'week' as const,
        showComparisons: true,
        showPredictions: true,
        showPersonalBests: true,
        chartAnimations: true,
        insightNotifications: true,
        weekStartsOn: 'monday' as const
      },
      lastCalculated: new Date()
    };

    const predictiveInsights = this.insightsEngine.generateInsights(tempAnalyticsData);
    
    // Calculate personal bests and check for new records
    const personalBests = this.calculatePersonalBests(userProfile, dailyAnalytics);

    // Check for new personal bests in recent data
    if (dailyAnalytics.length > 0) {
      const recentDaily = dailyAnalytics[dailyAnalytics.length - 1];
      const personalBestEvents = this.comparisonAnalytics.checkForPersonalBests(recentDaily);
      this.handlePersonalBestEvents(personalBestEvents);
    }

    if (weeklyAnalytics.length > 0) {
      const recentWeekly = weeklyAnalytics[weeklyAnalytics.length - 1];
      const personalBestEvents = this.comparisonAnalytics.checkForPersonalBests(recentWeekly);
      this.handlePersonalBestEvents(personalBestEvents);
    }

    this.analyticsData = {
      userId: userProfile.userTitle || 'user',
      dailyAnalytics,
      weeklyAnalytics,
      monthlyAnalytics,
      behaviorPatterns,
      predictiveInsights,
      personalBests,
      preferences: {
        defaultTimeRange: 'week',
        showComparisons: true,
        showPredictions: true,
        showPersonalBests: true,
        chartAnimations: true,
        insightNotifications: true,
        weekStartsOn: 'monday'
      },
      lastCalculated: new Date()
    };

    // Store analytics data in user profile
    this.userDataService.updateAnalyticsData(this.analyticsData);
    
    // Emit analytics updated event
    this.notifyPropertyChange('analyticsUpdated', this.analyticsData);
    
    return this.analyticsData;
  }

  private extractSessionPatterns(userProfile: any): SessionPattern[] {
    const patterns: SessionPattern[] = [];
    
    // Extract from daily stats
    userProfile.dailyStats.forEach(stat => {
      const date = new Date(stat.date);
      
      // Estimate session patterns from daily data
      // This is simplified - in a real app you'd store individual session data
      if (stat.offlineMinutes > 0) {
        const sessionCount = Math.max(1, Math.floor(stat.offlineMinutes / 30)); // Estimate sessions
        const avgDuration = stat.offlineMinutes / sessionCount;
        
        for (let i = 0; i < sessionCount; i++) {
          patterns.push({
            dayOfWeek: date.getDay(),
            hourOfDay: 10 + (i * 4), // Estimate times throughout day
            duration: avgDuration,
            date: date,
            mood: stat.sessionNotes?.[i]?.mood,
            activities: stat.sessionNotes?.[i]?.activities
          });
        }
      }
    });

    // Extract from session notes for more detailed patterns
    userProfile.sessionNotes?.forEach(note => {
      const date = new Date(note.sessionDate);
      patterns.push({
        dayOfWeek: date.getDay(),
        hourOfDay: date.getHours(),
        duration: note.sessionDuration,
        date: date,
        goalId: note.goalId,
        mood: note.mood,
        activities: note.activities
      });
    });

    return patterns.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private calculateDailyAnalytics(userProfile: any): DailyAnalytics[] {
    return userProfile.dailyStats.map(stat => {
      const sessionNotes = stat.sessionNotes || [];
      const sessionCount = Math.max(1, sessionNotes.length || Math.floor(stat.offlineMinutes / 30));
      
      return {
        date: stat.date,
        totalMinutes: stat.offlineMinutes,
        sessionCount: sessionCount,
        averageSessionLength: stat.offlineMinutes / sessionCount,
        longestSession: Math.max(...sessionNotes.map(n => n.sessionDuration), stat.offlineMinutes / sessionCount),
        shortestSession: Math.min(...sessionNotes.map(n => n.sessionDuration), stat.offlineMinutes / sessionCount),
        goalCompletions: sessionNotes.filter(n => n.goalAchieved).length,
        xpEarned: stat.xpEarned,
        achievementsUnlocked: stat.achievementsUnlocked?.length || 0,
        streakDay: this.getStreakDayForDate(stat.date, userProfile),
        mood: this.getMostCommonMood(sessionNotes),
        topActivities: this.getTopActivities(sessionNotes),
        timeDistribution: this.calculateHourlyDistribution(sessionNotes)
      };
    });
  }

  private calculateWeeklyAnalytics(dailyAnalytics: DailyAnalytics[]): WeeklyAnalytics[] {
    const weeks = new Map<string, DailyAnalytics[]>();
    
    // Group daily analytics by week
    dailyAnalytics.forEach(day => {
      const date = new Date(day.date);
      const weekStart = this.getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, []);
      }
      weeks.get(weekKey)!.push(day);
    });

    return Array.from(weeks.entries()).map(([weekStart, days]) => {
      const totalMinutes = days.reduce((sum, day) => sum + day.totalMinutes, 0);
      const sessionCount = days.reduce((sum, day) => sum + day.sessionCount, 0);
      const bestDay = days.reduce((best, day) => 
        day.totalMinutes > best.totalMinutes ? day : best
      );

      return {
        weekStart,
        totalMinutes,
        sessionCount,
        averageSessionLength: sessionCount > 0 ? totalMinutes / sessionCount : 0,
        goalCompletions: days.reduce((sum, day) => sum + day.goalCompletions, 0),
        xpEarned: days.reduce((sum, day) => sum + day.xpEarned, 0),
        achievementsUnlocked: days.reduce((sum, day) => sum + day.achievementsUnlocked, 0),
        streakDays: days.filter(day => day.streakDay > 0).length,
        dailyBreakdown: days,
        bestDay: {
          date: bestDay.date,
          minutes: bestDay.totalMinutes,
          reason: this.getBestDayReason(bestDay)
        },
        patterns: {
          mostProductiveDay: this.getMostProductiveDay(days),
          mostProductiveHour: this.getMostProductiveHour(days),
          averageDailyGoal: totalMinutes / 7,
          consistencyScore: this.calculateConsistencyScore(days)
        }
      };
    });
  }

  private calculateMonthlyAnalytics(weeklyAnalytics: WeeklyAnalytics[]): MonthlyAnalytics[] {
    const months = new Map<string, WeeklyAnalytics[]>();
    
    // Group weekly analytics by month
    weeklyAnalytics.forEach(week => {
      const date = new Date(week.weekStart);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!months.has(monthKey)) {
        months.set(monthKey, []);
      }
      months.get(monthKey)!.push(week);
    });

    return Array.from(months.entries()).map(([month, weeks]) => {
      const totalMinutes = weeks.reduce((sum, week) => sum + week.totalMinutes, 0);
      const sessionCount = weeks.reduce((sum, week) => sum + week.sessionCount, 0);
      
      return {
        month,
        totalMinutes,
        sessionCount,
        averageSessionLength: sessionCount > 0 ? totalMinutes / sessionCount : 0,
        goalCompletions: weeks.reduce((sum, week) => sum + week.goalCompletions, 0),
        xpEarned: weeks.reduce((sum, week) => sum + week.xpEarned, 0),
        achievementsUnlocked: weeks.reduce((sum, week) => sum + week.achievementsUnlocked, 0),
        maxStreak: Math.max(...weeks.map(week => week.streakDays)),
        weeklyBreakdown: weeks,
        trends: this.calculateMonthlyTrends(month, weeks),
        milestones: this.calculateMilestones(weeks)
      };
    });
  }

  // Helper methods
  private getStreakDayForDate(date: string, userProfile: any): number {
    // Calculate what day of the current streak this date represents
    const targetDate = new Date(date);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= userProfile.currentStreak) {
      return userProfile.currentStreak - daysDiff;
    }
    return 0;
  }

  private getMostCommonMood(sessionNotes: any[]): string | undefined {
    if (!sessionNotes.length) return undefined;
    
    const moodCounts = sessionNotes.reduce((counts, note) => {
      if (note.mood) {
        counts[note.mood] = (counts[note.mood] || 0) + 1;
      }
      return counts;
    }, {});

    return Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b
    );
  }

  private getTopActivities(sessionNotes: any[]): string[] {
    const activityCounts = {};
    
    sessionNotes.forEach(note => {
      note.activities?.forEach(activity => {
        activityCounts[activity] = (activityCounts[activity] || 0) + 1;
      });
    });

    return Object.entries(activityCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([activity]) => activity);
  }

  private calculateHourlyDistribution(sessionNotes: any[]): any[] {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      minutes: 0,
      sessionCount: 0
    }));

    sessionNotes.forEach(note => {
      const hour = new Date(note.sessionDate).getHours();
      hourlyData[hour].minutes += note.sessionDuration;
      hourlyData[hour].sessionCount++;
    });

    return hourlyData;
  }

  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(date.setDate(diff));
  }

  private getBestDayReason(day: DailyAnalytics): string {
    if (day.goalCompletions > 0) return 'Most goals completed';
    if (day.longestSession > 60) return 'Longest session';
    if (day.sessionCount > 3) return 'Most sessions';
    return 'Highest total time';
  }

  private getMostProductiveDay(days: DailyAnalytics[]): number {
    const dayTotals = Array(7).fill(0);
    days.forEach(day => {
      const dayOfWeek = new Date(day.date).getDay();
      dayTotals[dayOfWeek] += day.totalMinutes;
    });
    return dayTotals.indexOf(Math.max(...dayTotals));
  }

  private getMostProductiveHour(days: DailyAnalytics[]): number {
    const hourTotals = Array(24).fill(0);
    days.forEach(day => {
      day.timeDistribution.forEach(hour => {
        hourTotals[hour.hour] += hour.minutes;
      });
    });
    return hourTotals.indexOf(Math.max(...hourTotals));
  }

  private calculateConsistencyScore(days: DailyAnalytics[]): number {
    const daysWithSessions = days.filter(day => day.totalMinutes > 0).length;
    return Math.round((daysWithSessions / days.length) * 100);
  }

  private calculateMonthlyTrends(month: string, weeks: WeeklyAnalytics[]): any {
    // This would compare with previous month - simplified for now
    return {
      minutesChange: 0,
      sessionCountChange: 0,
      averageLengthChange: 0,
      consistencyChange: 0
    };
  }

  private calculateMilestones(weeks: WeeklyAnalytics[]): any[] {
    // Generate milestones based on achievements in the month
    return [];
  }

  // Public methods for getting analytics data
  getAnalyticsData(): AnalyticsData | null {
    return this.analyticsData;
  }

  getDailyAnalytics(timeRange?: TimeRange): DailyAnalytics[] {
    if (!this.analyticsData) return [];
    
    if (timeRange) {
      return this.analyticsData.dailyAnalytics.filter(day => {
        const date = new Date(day.date);
        return date >= timeRange.start && date <= timeRange.end;
      });
    }
    
    return this.analyticsData.dailyAnalytics;
  }

  getWeeklyAnalytics(timeRange?: TimeRange): WeeklyAnalytics[] {
    if (!this.analyticsData) return [];
    return this.analyticsData.weeklyAnalytics;
  }

  getMonthlyAnalytics(timeRange?: TimeRange): MonthlyAnalytics[] {
    if (!this.analyticsData) return [];
    return this.analyticsData.monthlyAnalytics;
  }

  private analyzeBehaviorPatterns(sessionPatterns: SessionPattern[]): UserBehaviorPattern[] {
    const patterns: UserBehaviorPattern[] = [];

    if (sessionPatterns.length < 5) {
      // Not enough data for reliable patterns
      return patterns;
    }

    // Analyze time preferences
    const timePattern = this.analyzeTimePreferences(sessionPatterns);
    if (timePattern) patterns.push(timePattern);

    // Analyze duration preferences
    const durationPattern = this.analyzeDurationPreferences(sessionPatterns);
    if (durationPattern) patterns.push(durationPattern);

    // Analyze goal preferences
    const goalPattern = this.analyzeGoalPreferences(sessionPatterns);
    if (goalPattern) patterns.push(goalPattern);

    // Analyze activity preferences
    const activityPattern = this.analyzeActivityPreferences(sessionPatterns);
    if (activityPattern) patterns.push(activityPattern);

    return patterns;
  }

  private analyzeTimePreferences(patterns: SessionPattern[]): UserBehaviorPattern | null {
    const dayFrequency = Array(7).fill(0);
    const hourFrequency = Array(24).fill(0);

    patterns.forEach(pattern => {
      dayFrequency[pattern.dayOfWeek]++;
      hourFrequency[pattern.hourOfDay]++;
    });

    // Find preferred days (above average frequency)
    const avgDayFreq = dayFrequency.reduce((a, b) => a + b, 0) / 7;
    const preferredDays = dayFrequency
      .map((freq, day) => ({ day, freq }))
      .filter(item => item.freq > avgDayFreq * 1.2)
      .map(item => item.day);

    // Find preferred hours
    const avgHourFreq = hourFrequency.reduce((a, b) => a + b, 0) / 24;
    const preferredHours = hourFrequency
      .map((freq, hour) => ({ hour, freq }))
      .filter(item => item.freq > avgHourFreq * 1.5)
      .map(item => item.hour);

    if (preferredDays.length === 0 && preferredHours.length === 0) {
      return null;
    }

    return {
      userId: 'current_user',
      patternType: 'time_preference',
      pattern: {
        preferredDays,
        preferredHours,
        preferredDuration: { min: 0, max: 0, average: 0 },
        preferredGoals: [],
        preferredActivities: [],
        preferredMoods: []
      },
      confidence: Math.min(patterns.length / 20, 1), // More sessions = higher confidence
      lastUpdated: new Date()
    };
  }

  private analyzeDurationPreferences(patterns: SessionPattern[]): UserBehaviorPattern | null {
    const durations = patterns.map(p => p.duration).sort((a, b) => a - b);

    if (durations.length < 3) return null;

    const min = durations[0];
    const max = durations[durations.length - 1];
    const average = durations.reduce((a, b) => a + b, 0) / durations.length;

    return {
      userId: 'current_user',
      patternType: 'duration_preference',
      pattern: {
        preferredDays: [],
        preferredHours: [],
        preferredDuration: { min, max, average },
        preferredGoals: [],
        preferredActivities: [],
        preferredMoods: []
      },
      confidence: Math.min(patterns.length / 15, 1),
      lastUpdated: new Date()
    };
  }

  private analyzeGoalPreferences(patterns: SessionPattern[]): UserBehaviorPattern | null {
    const goalCounts = {};

    patterns.forEach(pattern => {
      if (pattern.goalId) {
        goalCounts[pattern.goalId] = (goalCounts[pattern.goalId] || 0) + 1;
      }
    });

    const preferredGoals = Object.entries(goalCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([goalId]) => goalId);

    if (preferredGoals.length === 0) return null;

    return {
      userId: 'current_user',
      patternType: 'goal_preference',
      pattern: {
        preferredDays: [],
        preferredHours: [],
        preferredDuration: { min: 0, max: 0, average: 0 },
        preferredGoals,
        preferredActivities: [],
        preferredMoods: []
      },
      confidence: Math.min(Object.keys(goalCounts).length / 5, 1),
      lastUpdated: new Date()
    };
  }

  private analyzeActivityPreferences(patterns: SessionPattern[]): UserBehaviorPattern | null {
    const activityCounts = {};
    const moodCounts = {};

    patterns.forEach(pattern => {
      pattern.activities?.forEach(activity => {
        activityCounts[activity] = (activityCounts[activity] || 0) + 1;
      });

      if (pattern.mood) {
        moodCounts[pattern.mood] = (moodCounts[pattern.mood] || 0) + 1;
      }
    });

    const preferredActivities = Object.entries(activityCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([activity]) => activity);

    const preferredMoods = Object.entries(moodCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 2)
      .map(([mood]) => mood);

    if (preferredActivities.length === 0 && preferredMoods.length === 0) return null;

    return {
      userId: 'current_user',
      patternType: 'activity_preference',
      pattern: {
        preferredDays: [],
        preferredHours: [],
        preferredDuration: { min: 0, max: 0, average: 0 },
        preferredGoals: [],
        preferredActivities,
        preferredMoods
      },
      confidence: Math.min((preferredActivities.length + preferredMoods.length) / 7, 1),
      lastUpdated: new Date()
    };
  }



  private calculatePersonalBests(userProfile: any, dailyAnalytics: DailyAnalytics[]): PersonalBest[] {
    const bests: PersonalBest[] = [];

    if (dailyAnalytics.length === 0) return bests;

    // Longest session
    const longestSession = Math.max(...dailyAnalytics.map(day => day.longestSession));
    const longestSessionDay = dailyAnalytics.find(day => day.longestSession === longestSession);

    if (longestSessionDay) {
      bests.push({
        id: 'longest_session',
        category: 'longest_session',
        title: 'Longest Session',
        value: longestSession,
        unit: 'minutes',
        date: new Date(longestSessionDay.date)
      });
    }

    // Most daily minutes
    const mostDailyMinutes = Math.max(...dailyAnalytics.map(day => day.totalMinutes));
    const bestDay = dailyAnalytics.find(day => day.totalMinutes === mostDailyMinutes);

    if (bestDay) {
      bests.push({
        id: 'most_daily_minutes',
        category: 'most_daily_minutes',
        title: 'Most Daily Minutes',
        value: mostDailyMinutes,
        unit: 'minutes',
        date: new Date(bestDay.date)
      });
    }

    // Longest streak
    bests.push({
      id: 'longest_streak',
      category: 'longest_streak',
      title: 'Longest Streak',
      value: userProfile.longestStreak,
      unit: 'days',
      date: new Date() // Would need to track when streak was achieved
    });

    return bests;
  }



  // Public methods for insights
  getPredictiveInsights(): PredictiveInsight[] {
    return this.analyticsData?.predictiveInsights || [];
  }

  getBehaviorPatterns(): UserBehaviorPattern[] {
    return this.analyticsData?.behaviorPatterns || [];
  }

  getPersonalBests(): PersonalBest[] {
    return this.analyticsData?.personalBests || [];
  }

  private setupPersonalBestListeners(): void {
    this.comparisonAnalytics.on('propertyChange', (args: PropertyChangeEventData) => {
      if (isPropertyChangeEvent(args) && args.propertyName === 'personalBestAchieved') {
        this.handlePersonalBestEvents([args.value]);
      }
    });
  }

  private handlePersonalBestEvents(events: any[]): void {
    events.forEach(event => {
      // Show celebration for significant achievements
      if (event.significance === 'major' || event.significance === 'milestone') {
        const celebrationData = PersonalBestCelebration.createPersonalBestCelebration(event);
        this.personalBestCelebration.showCelebration(celebrationData);
      }

      // Emit event for other components to handle
      this.notifyPropertyChange('personalBestAchieved', event);
    });
  }

  // Comparison methods
  getWeekOverWeekComparison(): any {
    if (!this.analyticsData || this.analyticsData.weeklyAnalytics.length < 2) return null;

    const current = this.analyticsData.weeklyAnalytics[this.analyticsData.weeklyAnalytics.length - 1];
    const previous = this.analyticsData.weeklyAnalytics[this.analyticsData.weeklyAnalytics.length - 2];

    return this.comparisonAnalytics.getWeekOverWeekComparison(current, previous);
  }

  getMonthOverMonthComparison(): any {
    if (!this.analyticsData || this.analyticsData.monthlyAnalytics.length < 2) return null;

    const current = this.analyticsData.monthlyAnalytics[this.analyticsData.monthlyAnalytics.length - 1];
    const previous = this.analyticsData.monthlyAnalytics[this.analyticsData.monthlyAnalytics.length - 2];

    return this.comparisonAnalytics.getMonthOverMonthComparison(current, previous);
  }

  getTrendAnalysis(metric: string, timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly'): any {
    if (!this.analyticsData) return null;

    let data: any[];
    switch (timeframe) {
      case 'daily':
        data = this.analyticsData.dailyAnalytics.slice(-7);
        break;
      case 'weekly':
        data = this.analyticsData.weeklyAnalytics.slice(-4);
        break;
      case 'monthly':
        data = this.analyticsData.monthlyAnalytics.slice(-6);
        break;
      default:
        data = this.analyticsData.weeklyAnalytics.slice(-4);
    }

    return this.comparisonAnalytics.analyzeTrend(data, metric);
  }

  getComparisonPeriods(): any[] {
    return this.comparisonAnalytics.getComparisonPeriods();
  }

  private checkForPersonalBestsOnSessionComplete(sessionData: any): void {
    // Create a daily analytics object from session data
    const today = new Date().toISOString().split('T')[0];
    const todayStats = this.userDataService.getTodayStats();

    if (todayStats) {
      const dailyAnalytics = {
        date: today,
        totalMinutes: todayStats.offlineMinutes,
        sessionCount: todayStats.sessionCount || 1,
        averageSessionLength: todayStats.offlineMinutes / (todayStats.sessionCount || 1),
        longestSession: sessionData.duration || todayStats.offlineMinutes,
        shortestSession: sessionData.duration || todayStats.offlineMinutes,
        goalCompletions: todayStats.goalCompletions || 0,
        xpEarned: todayStats.xpEarned || 0,
        achievementsUnlocked: 0,
        streakDay: this.userDataService.getUserProfile().currentStreak,
        mood: sessionData.mood,
        topActivities: sessionData.activities || [],
        timeDistribution: []
      };

      // Check for personal bests
      const personalBestEvents = this.comparisonAnalytics.checkForPersonalBests(dailyAnalytics);
      this.handlePersonalBestEvents(personalBestEvents);
    }
  }

  // Method to manually trigger analytics recalculation
  async recalculateAnalytics(): Promise<AnalyticsData> {
    return await this.calculateAnalytics();
  }

  // Method to get analytics summary for a specific time period
  getAnalyticsSummary(timeRange: 'week' | 'month' | 'quarter' | 'year'): any {
    if (!this.analyticsData) return null;

    let data: any[];
    switch (timeRange) {
      case 'week':
        data = this.analyticsData.dailyAnalytics.slice(-7);
        break;
      case 'month':
        data = this.analyticsData.dailyAnalytics.slice(-30);
        break;
      case 'quarter':
        data = this.analyticsData.weeklyAnalytics.slice(-12);
        break;
      case 'year':
        data = this.analyticsData.monthlyAnalytics.slice(-12);
        break;
      default:
        data = this.analyticsData.dailyAnalytics.slice(-7);
    }

    const totalMinutes = data.reduce((sum, item) => sum + (item.totalMinutes || 0), 0);
    const totalSessions = data.reduce((sum, item) => sum + (item.sessionCount || 0), 0);
    const avgLength = totalSessions > 0 ? totalMinutes / totalSessions : 0;
    const goalCompletions = data.reduce((sum, item) => sum + (item.goalCompletions || 0), 0);

    return {
      timeRange,
      totalMinutes: Math.round(totalMinutes),
      totalSessions,
      averageSessionLength: Math.round(avgLength),
      goalCompletions,
      dataPoints: data.length,
      period: {
        start: data.length > 0 ? data[0].date || data[0].weekStart || data[0].month : null,
        end: data.length > 0 ? data[data.length - 1].date || data[data.length - 1].weekStart || data[data.length - 1].month : null
      }
    };
  }
}
