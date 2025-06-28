import { Observable } from '@nativescript/core';
import { UserDataService, DailyStats } from '../models/user-data';
import { TrackingService } from '../services/tracking-service';
import { MonetizationService } from '../services/monetization-service';

export interface WeeklyReportData {
  weekStart: Date;
  weekEnd: Date;
  totalOfflineMinutes: number;
  totalXP: number;
  totalSessions: number;
  goalAchievementRate: number;
  dailyBreakdown: DailyBreakdown[];
  achievements: any[];
  insights: WeeklyInsights;
}

export interface DailyBreakdown {
  date: Date;
  dayName: string;
  offlineMinutes: number;
  offlineTime: string;
  xpEarned: number;
  goalMet: boolean;
  progressPercent: number;
}

export interface WeeklyInsights {
  performance: string;
  goalProgress: string;
  nextWeekTip: string;
  comparison?: {
    offlineTimeChange: string;
    sessionsChange: string;
    offlineTimeChangeColor: string;
    sessionsChangeColor: string;
  };
}

export class WeeklyReportViewModel extends Observable {
  private userDataService: UserDataService;
  private trackingService: TrackingService;
  private monetizationService: MonetizationService;
  private currentWeekStart: Date;

  constructor() {
    super();
    
    this.userDataService = UserDataService.getInstance();
    this.trackingService = TrackingService.getInstance();
    this.monetizationService = MonetizationService.getInstance();
    
    // Start with current week
    this.currentWeekStart = this.getWeekStart(new Date());
    this.loadWeeklyReport();
  }

  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day; // Adjust to start on Sunday
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private getWeekEnd(weekStart: Date): Date {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  private loadWeeklyReport(): void {
    const weekEnd = this.getWeekEnd(this.currentWeekStart);
    const reportData = this.generateWeeklyReport(this.currentWeekStart, weekEnd);
    
    this.updateDisplayData(reportData);
  }

  private generateWeeklyReport(weekStart: Date, weekEnd: Date): WeeklyReportData {
    const userProfile = this.userDataService.getUserProfile();
    const allStats = userProfile.dailyStats;
    
    // Filter stats for the current week
    const weekStats = allStats.filter(stat => {
      const statDate = new Date(stat.date);
      return statDate >= weekStart && statDate <= weekEnd;
    });

    // Calculate totals
    const totalOfflineMinutes = weekStats.reduce((sum, stat) => sum + stat.offlineMinutes, 0);
    const totalXP = weekStats.reduce((sum, stat) => sum + stat.xpEarned, 0);
    const totalSessions = weekStats.reduce((sum, stat) => sum + Math.ceil(stat.offlineMinutes / 30), 0);
    
    // Calculate goal achievement rate
    const daysWithGoalMet = weekStats.filter(stat => 
      stat.offlineMinutes >= userProfile.settings.dailyGoalMinutes
    ).length;
    const goalAchievementRate = weekStats.length > 0 ? (daysWithGoalMet / 7) * 100 : 0;

    // Generate daily breakdown
    const dailyBreakdown = this.generateDailyBreakdown(weekStart, weekStats, userProfile.settings.dailyGoalMinutes);

    // Get achievements for this week
    const weekAchievements = userProfile.achievements.filter(achievement => {
      if (!achievement.unlockedAt) return false;
      const unlockDate = new Date(achievement.unlockedAt);
      return unlockDate >= weekStart && unlockDate <= weekEnd;
    });

    // Generate insights
    const insights = this.generateInsights(weekStats, totalOfflineMinutes, goalAchievementRate);

    return {
      weekStart,
      weekEnd,
      totalOfflineMinutes,
      totalXP,
      totalSessions,
      goalAchievementRate,
      dailyBreakdown,
      achievements: weekAchievements,
      insights
    };
  }

  private generateDailyBreakdown(weekStart: Date, weekStats: DailyStats[], dailyGoalMinutes: number): DailyBreakdown[] {
    const breakdown: DailyBreakdown[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      
      const dayStats = weekStats.find(stat => {
        const statDate = new Date(stat.date);
        return statDate.toDateString() === date.toDateString();
      });

      const offlineMinutes = dayStats ? dayStats.offlineMinutes : 0;
      const xpEarned = dayStats ? dayStats.xpEarned : 0;
      const goalMet = offlineMinutes >= dailyGoalMinutes;
      const progressPercent = Math.min(100, (offlineMinutes / dailyGoalMinutes) * 100);

      breakdown.push({
        date,
        dayName: dayNames[i],
        offlineMinutes,
        offlineTime: this.trackingService.formatDuration(offlineMinutes),
        xpEarned,
        goalMet,
        progressPercent
      });
    }

    return breakdown;
  }

  private generateInsights(weekStats: DailyStats[], totalOfflineMinutes: number, goalAchievementRate: number): WeeklyInsights {
    const avgDailyOffline = weekStats.length > 0 ? totalOfflineMinutes / 7 : 0;
    
    // Performance insight
    let performance = "";
    if (avgDailyOffline >= 180) { // 3+ hours average
      performance = "Excellent work! You're maintaining great offline habits with an average of " + 
                   this.trackingService.formatDuration(Math.round(avgDailyOffline)) + " per day.";
    } else if (avgDailyOffline >= 120) { // 2+ hours average
      performance = "Good progress! You're averaging " + 
                   this.trackingService.formatDuration(Math.round(avgDailyOffline)) + 
                   " of offline time per day. Keep building this habit!";
    } else if (avgDailyOffline >= 60) { // 1+ hour average
      performance = "You're making progress with " + 
                   this.trackingService.formatDuration(Math.round(avgDailyOffline)) + 
                   " average daily offline time. Try to gradually increase your sessions.";
    } else {
      performance = "Every journey starts with small steps. Focus on building consistent offline habits, even if just for short periods.";
    }

    // Goal progress insight
    let goalProgress = "";
    if (goalAchievementRate >= 80) {
      goalProgress = "Outstanding! You met your daily goal " + Math.round(goalAchievementRate) + "% of the time this week.";
    } else if (goalAchievementRate >= 60) {
      goalProgress = "Good consistency! You achieved your goal " + Math.round(goalAchievementRate) + "% of the time. Aim for 80%+ next week.";
    } else if (goalAchievementRate >= 40) {
      goalProgress = "You're building momentum with " + Math.round(goalAchievementRate) + "% goal achievement. Focus on consistency over perfection.";
    } else {
      goalProgress = "Consider adjusting your daily goal to be more achievable, then gradually increase it as you build the habit.";
    }

    // Next week tip
    const tips = [
      "Try setting specific times for offline sessions, like during meals or before bed.",
      "Use airplane mode instead of just putting your phone down to avoid temptation.",
      "Find engaging offline activities like reading, exercise, or creative hobbies.",
      "Start with shorter, more frequent sessions rather than trying for long periods.",
      "Create a dedicated charging station outside your bedroom for better sleep hygiene.",
      "Practice mindfulness or meditation during your offline time for added benefits."
    ];
    const nextWeekTip = tips[Math.floor(Math.random() * tips.length)];

    return {
      performance,
      goalProgress,
      nextWeekTip
    };
  }

  private updateDisplayData(reportData: WeeklyReportData): void {
    const userProfile = this.userDataService.getUserProfile();
    
    // Week navigation
    this.set('weekRangeText', this.formatWeekRange(reportData.weekStart, reportData.weekEnd));
    this.set('canGoToNextWeek', this.currentWeekStart < this.getWeekStart(new Date()));

    // Summary stats
    this.set('weeklyOfflineTime', this.trackingService.formatDuration(reportData.totalOfflineMinutes));
    this.set('weeklyXP', reportData.totalXP);
    this.set('weeklySessions', reportData.totalSessions);
    this.set('goalAchievementRate', Math.round(reportData.goalAchievementRate));

    // Weekly goal progress
    const weeklyGoalMinutes = userProfile.settings.dailyGoalMinutes * 7;
    const weeklyGoalProgress = Math.min(100, (reportData.totalOfflineMinutes / weeklyGoalMinutes) * 100);
    this.set('weeklyGoalProgress', weeklyGoalProgress);

    // Daily breakdown
    this.set('dailyStats', reportData.dailyBreakdown);

    // Achievements
    this.set('weeklyAchievements', reportData.achievements);

    // Insights
    this.set('performanceInsight', reportData.insights.performance);
    this.set('goalInsight', reportData.insights.goalProgress);
    this.set('nextWeekTip', reportData.insights.nextWeekTip);

    // Comparison with previous week
    this.loadPreviousWeekComparison(reportData);

    // Premium status
    this.set('isPremium', userProfile.settings.isPremium);
  }

  private loadPreviousWeekComparison(currentWeek: WeeklyReportData): void {
    const previousWeekStart = new Date(this.currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = this.getWeekEnd(previousWeekStart);
    
    const previousWeekData = this.generateWeeklyReport(previousWeekStart, previousWeekEnd);
    
    if (previousWeekData.totalOfflineMinutes > 0) {
      const offlineTimeDiff = currentWeek.totalOfflineMinutes - previousWeekData.totalOfflineMinutes;
      const sessionsDiff = currentWeek.totalSessions - previousWeekData.totalSessions;
      
      this.set('showComparison', true);
      this.set('offlineTimeChange', this.formatChange(offlineTimeDiff, 'time'));
      this.set('sessionsChange', this.formatChange(sessionsDiff, 'number'));
      this.set('offlineTimeChangeColor', offlineTimeDiff >= 0 ? '#10B981' : '#EF4444');
      this.set('sessionsChangeColor', sessionsDiff >= 0 ? '#10B981' : '#EF4444');
    } else {
      this.set('showComparison', false);
    }
  }

  private formatChange(diff: number, type: 'time' | 'number'): string {
    const sign = diff >= 0 ? '+' : '';
    if (type === 'time') {
      return sign + this.trackingService.formatDuration(Math.abs(diff));
    } else {
      return sign + diff.toString();
    }
  }

  private formatWeekRange(start: Date, end: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', options);
    return `${startStr} - ${endStr}`;
  }

  // Navigation methods
  onPreviousWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.loadWeeklyReport();
  }

  onNextWeek(): void {
    const nextWeek = new Date(this.currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    if (nextWeek <= this.getWeekStart(new Date())) {
      this.currentWeekStart = nextWeek;
      this.loadWeeklyReport();
    }
  }

  onNavigateBack(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  onExportReport(): void {
    const userProfile = this.userDataService.getUserProfile();
    
    if (!userProfile.settings.isPremium) {
      const { Dialogs } = require('@nativescript/core');
      Dialogs.alert({
        title: "Premium Feature",
        message: "Export functionality is available with Unplug Pro. Upgrade to access detailed reports and export options.",
        okButtonText: "OK"
      });
      return;
    }

    // Export logic would go here
    const { Dialogs } = require('@nativescript/core');
    Dialogs.alert({
      title: "Report Exported",
      message: "Your weekly report has been exported successfully!",
      okButtonText: "Great!"
    });
  }

  onUpgradeToPro(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate('views/subscription-page');
  }
}
