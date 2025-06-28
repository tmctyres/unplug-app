import { Observable, ObservableArray } from '@nativescript/core';
import { UserDataService } from '../models/user-data';
import { TrackingService } from '../services/tracking-service';

export class StatsViewModel extends Observable {
  private userDataService: UserDataService;
  private trackingService: TrackingService;
  private _weeklyStats: ObservableArray<any>;

  constructor() {
    super();
    
    this.userDataService = UserDataService.getInstance();
    this.trackingService = TrackingService.getInstance();
    this._weeklyStats = new ObservableArray();
    
    this.loadStats();
  }

  private loadStats(): void {
    const profile = this.userDataService.getUserProfile();
    const weeklyData = this.userDataService.getWeeklyStats();

    // Overall stats
    this.set('totalOfflineHours', profile.totalOfflineHours);
    this.set('totalXP', profile.totalXP);
    this.set('currentStreak', profile.currentStreak);
    this.set('longestStreak', profile.longestStreak);
    this.set('achievementsUnlocked', profile.achievements.filter(a => a.unlocked).length);

    // Days since joined
    const daysSinceJoined = Math.floor((new Date().getTime() - profile.joinDate.getTime()) / (1000 * 60 * 60 * 24));
    this.set('daysSinceJoined', daysSinceJoined);

    // Weekly stats
    const weeklyOfflineMinutes = weeklyData.reduce((sum, day) => sum + day.offlineMinutes, 0);
    const weeklyXP = weeklyData.reduce((sum, day) => sum + day.xpEarned, 0);
    
    this.set('weeklyOfflineHours', weeklyOfflineMinutes / 60);
    this.set('weeklyXP', weeklyXP);

    // Average daily hours
    const totalDays = Math.max(daysSinceJoined, 1);
    const averageDailyHours = profile.totalOfflineHours / totalDays;
    this.set('averageDailyHours', averageDailyHours);

    // Goal completion rate
    const daysWithGoal = profile.dailyStats.filter(day => 
      day.offlineMinutes >= profile.settings.dailyGoalMinutes
    ).length;
    const goalCompletionRate = totalDays > 0 ? Math.round((daysWithGoal / totalDays) * 100) : 0;
    this.set('goalCompletionRate', goalCompletionRate);

    // Prepare weekly breakdown
    this.prepareWeeklyBreakdown(weeklyData);

    // Motivational message
    this.set('motivationalMessage', this.getMotivationalMessage(profile));
  }

  private prepareWeeklyBreakdown(weeklyData: any[]): void {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    
    this._weeklyStats.splice(0);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();
      
      const dayData = weeklyData.find(day => day.date === dateString);
      const dayName = dayNames[date.getDay()];
      
      this._weeklyStats.push({
        dayName: i === 0 ? 'Today' : dayName,
        formattedTime: dayData ? this.trackingService.formatDuration(dayData.offlineMinutes) : '0m',
        xpEarned: dayData ? dayData.xpEarned : 0,
        date: dateString
      });
    }
  }

  private getMotivationalMessage(profile: any): string {
    const messages = [
      "Every minute offline is a step towards digital wellness! 🌱",
      "You're building healthier habits one session at a time! 💪",
      "Your future self will thank you for this digital detox! 🙏",
      "Consistency is key - keep up the amazing work! ⭐",
      "You're proving that balance is possible in our digital world! ⚖️"
    ];

    if (profile.currentStreak >= 7) {
      return "Incredible! A week-long streak shows real commitment! 🔥";
    } else if (profile.currentStreak >= 3) {
      return "Great streak going! You're building momentum! 🚀";
    } else if (profile.totalOfflineHours >= 100) {
      return "Over 100 hours offline! You're a digital wellness champion! 🏆";
    }

    return messages[Math.floor(Math.random() * messages.length)];
  }

  get weeklyStats(): ObservableArray<any> {
    return this._weeklyStats;
  }
}