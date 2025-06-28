import { Observable } from '@nativescript/core';
import { 
  AnalyticsData, 
  PredictiveInsight, 
  UserBehaviorPattern, 
  DailyAnalytics, 
  WeeklyAnalytics,
  TrendAnalysis,
  InsightRule
} from '../models/analytics-data';

export class InsightsEngine extends Observable {
  private static instance: InsightsEngine;
  private insightRules: InsightRule[] = [];
  private lastAnalysis: Date | null = null;

  private constructor() {
    super();
    this.initializeInsightRules();
  }

  static getInstance(): InsightsEngine {
    if (!InsightsEngine.instance) {
      InsightsEngine.instance = new InsightsEngine();
    }
    return InsightsEngine.instance;
  }

  generateInsights(analyticsData: AnalyticsData): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];
    
    // Apply all insight rules
    this.insightRules.forEach(rule => {
      try {
        if (rule.condition(analyticsData)) {
          const insight = rule.generate(analyticsData);
          if (insight) {
            insights.push(insight);
          }
        }
      } catch (error) {
        console.error(`Error applying insight rule ${rule.id}:`, error);
      }
    });

    // Sort by priority and confidence
    return insights
      .sort((a, b) => {
        const ruleA = this.insightRules.find(r => r.id === a.type);
        const ruleB = this.insightRules.find(r => r.id === b.type);
        const priorityA = ruleA?.priority || 0;
        const priorityB = ruleB?.priority || 0;
        
        if (priorityA !== priorityB) {
          return priorityB - priorityA; // Higher priority first
        }
        return b.confidence - a.confidence; // Higher confidence first
      })
      .slice(0, 8); // Limit to top 8 insights
  }

  private initializeInsightRules(): void {
    this.insightRules = [
      // Optimal Timing Insights
      {
        id: 'optimal_timing',
        name: 'Optimal Timing Suggestion',
        description: 'Suggests best times for sessions based on historical success',
        condition: (data) => {
          const timePattern = data.behaviorPatterns.find(p => p.patternType === 'time_preference');
          return timePattern && timePattern.pattern.preferredHours.length > 0;
        },
        generate: (data) => {
          const timePattern = data.behaviorPatterns.find(p => p.patternType === 'time_preference');
          if (!timePattern) return null;

          const bestHour = timePattern.pattern.preferredHours[0];
          const successRate = Math.round(timePattern.confidence * 100);

          return {
            id: 'optimal_timing_' + Date.now(),
            type: 'optimal_timing',
            title: 'Perfect Time for Your Next Session',
            description: `You're ${successRate}% more successful when starting sessions around ${this.formatHour(bestHour)}.`,
            confidence: timePattern.confidence,
            actionable: true,
            recommendation: `Try starting your next session around ${this.formatHour(bestHour)} for best results.`,
            data: { 
              optimalHour: bestHour,
              successRate: successRate,
              preferredHours: timePattern.pattern.preferredHours
            },
            createdAt: new Date()
          };
        },
        priority: 9,
        category: 'optimization'
      },

      // Consistency Improvement
      {
        id: 'consistency_improvement',
        name: 'Consistency Improvement',
        description: 'Identifies opportunities to improve consistency',
        condition: (data) => {
          if (data.weeklyAnalytics.length === 0) return false;
          const latestWeek = data.weeklyAnalytics[data.weeklyAnalytics.length - 1];
          return latestWeek.patterns.consistencyScore < 70;
        },
        generate: (data) => {
          const latestWeek = data.weeklyAnalytics[data.weeklyAnalytics.length - 1];
          const consistencyScore = latestWeek.patterns.consistencyScore;
          const daysActive = latestWeek.dailyBreakdown.filter(day => day.totalMinutes > 0).length;
          const targetDays = 7 - daysActive;

          return {
            id: 'consistency_' + Date.now(),
            type: 'habit_formation',
            title: 'Boost Your Consistency',
            description: `You're active ${daysActive} days per week. Adding ${Math.min(targetDays, 2)} more day${targetDays > 1 ? 's' : ''} could improve your consistency by 20-30%.`,
            confidence: 0.8,
            actionable: true,
            recommendation: `Try adding sessions on ${this.suggestMissingDays(latestWeek.dailyBreakdown).join(' and ')}.`,
            data: {
              currentConsistency: consistencyScore,
              daysActive: daysActive,
              suggestedDays: this.suggestMissingDays(latestWeek.dailyBreakdown)
            },
            createdAt: new Date()
          };
        },
        priority: 7,
        category: 'habit'
      },

      // Streak Protection
      {
        id: 'streak_protection',
        name: 'Streak Protection Alert',
        description: 'Warns when streak is at risk',
        condition: (data) => {
          if (data.dailyAnalytics.length === 0) return false;
          const today = new Date().toISOString().split('T')[0];
          const todayData = data.dailyAnalytics.find(day => day.date === today);
          return !todayData || todayData.totalMinutes === 0;
        },
        generate: (data) => {
          // Find current streak from user data
          const streakDays = this.calculateCurrentStreak(data.dailyAnalytics);
          
          if (streakDays < 3) return null; // Only warn for meaningful streaks

          return {
            id: 'streak_protection_' + Date.now(),
            type: 'success_prediction',
            title: 'Protect Your Streak!',
            description: `Your ${streakDays}-day streak is at risk! Don't let all that progress go to waste.`,
            confidence: 0.9,
            actionable: true,
            recommendation: `Complete just one session today to keep your ${streakDays}-day streak alive.`,
            data: {
              currentStreak: streakDays,
              riskLevel: 'high'
            },
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
          };
        },
        priority: 10,
        category: 'motivation'
      },

      // Goal Achievement Prediction
      {
        id: 'goal_achievement',
        name: 'Goal Achievement Prediction',
        description: 'Predicts likelihood of achieving weekly/monthly goals',
        condition: (data) => {
          return data.weeklyAnalytics.length > 0 && data.dailyAnalytics.length >= 3;
        },
        generate: (data) => {
          const prediction = this.predictGoalAchievement(data);
          if (!prediction) return null;

          const { probability, timeRemaining, sessionsNeeded } = prediction;
          
          let title = 'Goal Achievement Outlook';
          let description = '';
          let recommendation = '';

          if (probability >= 80) {
            title = 'You\'re On Track! 🎯';
            description = `You have a ${Math.round(probability)}% chance of reaching your weekly goal.`;
            recommendation = 'Keep up the great work! You\'re doing amazing.';
          } else if (probability >= 50) {
            title = 'Push a Little Harder 💪';
            description = `You have a ${Math.round(probability)}% chance of reaching your goal. ${sessionsNeeded} more session${sessionsNeeded > 1 ? 's' : ''} would put you on track.`;
            recommendation = `Try to fit in ${sessionsNeeded} more session${sessionsNeeded > 1 ? 's' : ''} in the next ${timeRemaining} days.`;
          } else {
            title = 'Goal at Risk ⚠️';
            description = `Your weekly goal is challenging to reach with current pace. You'd need ${sessionsNeeded} more sessions.`;
            recommendation = 'Consider adjusting your goal or increasing session frequency.';
          }

          return {
            id: 'goal_achievement_' + Date.now(),
            type: 'success_prediction',
            title: title,
            description: description,
            confidence: Math.min(probability / 100 + 0.2, 0.9),
            actionable: true,
            recommendation: recommendation,
            data: {
              probability: probability,
              sessionsNeeded: sessionsNeeded,
              timeRemaining: timeRemaining
            },
            createdAt: new Date()
          };
        },
        priority: 8,
        category: 'performance'
      },

      // Session Length Optimization
      {
        id: 'session_length_optimization',
        name: 'Session Length Optimization',
        description: 'Suggests optimal session lengths based on success patterns',
        condition: (data) => {
          const durationPattern = data.behaviorPatterns.find(p => p.patternType === 'duration_preference');
          return durationPattern && data.dailyAnalytics.length >= 10;
        },
        generate: (data) => {
          const durationPattern = data.behaviorPatterns.find(p => p.patternType === 'duration_preference');
          if (!durationPattern) return null;

          const optimalDuration = Math.round(durationPattern.pattern.preferredDuration.average);
          const recentSessions = data.dailyAnalytics.slice(-7);
          const avgRecentDuration = recentSessions.reduce((sum, day) => sum + day.averageSessionLength, 0) / recentSessions.length;

          if (Math.abs(optimalDuration - avgRecentDuration) < 10) return null; // Already optimal

          const suggestion = optimalDuration > avgRecentDuration ? 'longer' : 'shorter';
          const difference = Math.abs(optimalDuration - avgRecentDuration);

          return {
            id: 'session_length_' + Date.now(),
            type: 'optimal_timing',
            title: 'Optimize Your Session Length',
            description: `Your most successful sessions average ${optimalDuration} minutes. Recent sessions have been ${Math.round(difference)} minutes ${suggestion === 'longer' ? 'shorter' : 'longer'}.`,
            confidence: durationPattern.confidence,
            actionable: true,
            recommendation: `Try aiming for ${suggestion} sessions around ${optimalDuration} minutes for better results.`,
            data: {
              optimalDuration: optimalDuration,
              currentAverage: Math.round(avgRecentDuration),
              suggestion: suggestion
            },
            createdAt: new Date()
          };
        },
        priority: 6,
        category: 'optimization'
      },

      // Trend Analysis
      {
        id: 'trend_analysis',
        name: 'Progress Trend Analysis',
        description: 'Analyzes progress trends and provides feedback',
        condition: (data) => {
          return data.weeklyAnalytics.length >= 3;
        },
        generate: (data) => {
          const trend = this.analyzeTrend(data.weeklyAnalytics, 'totalMinutes');
          if (!trend || trend.significance === 'low') return null;

          let title = '';
          let description = '';
          let recommendation = '';

          if (trend.direction === 'increasing' && trend.strength === 'strong') {
            title = 'Excellent Progress! 📈';
            description = `Your weekly minutes have been ${trend.direction} ${trend.strength}ly over the past few weeks.`;
            recommendation = 'You\'re building great momentum! Keep up this fantastic progress.';
          } else if (trend.direction === 'decreasing' && trend.strength !== 'weak') {
            title = 'Progress Declining 📉';
            description = `Your weekly minutes have been ${trend.direction} ${trend.strength}ly recently.`;
            recommendation = 'Consider what might be affecting your routine and how to get back on track.';
          } else if (trend.direction === 'stable') {
            title = 'Steady Progress 📊';
            description = 'Your weekly minutes have been consistent, which shows great discipline.';
            recommendation = 'Consistency is key! Consider gradually increasing your goals when ready.';
          } else {
            return null;
          }

          return {
            id: 'trend_analysis_' + Date.now(),
            type: 'success_prediction',
            title: title,
            description: description,
            confidence: trend.confidence,
            actionable: true,
            recommendation: recommendation,
            data: {
              trend: trend,
              metric: 'totalMinutes'
            },
            createdAt: new Date()
          };
        },
        priority: 5,
        category: 'performance'
      },

      // Personal Best Recognition
      {
        id: 'personal_best',
        name: 'Personal Best Recognition',
        description: 'Celebrates when user achieves personal bests',
        condition: (data) => {
          return data.personalBests.length > 0 && this.hasRecentPersonalBest(data.personalBests);
        },
        generate: (data) => {
          const recentBest = this.getMostRecentPersonalBest(data.personalBests);
          if (!recentBest) return null;

          const improvement = recentBest.improvement || 0;
          const improvementText = improvement > 0 ? ` (${Math.round(improvement)}% better than before!)` : '';

          return {
            id: 'personal_best_' + Date.now(),
            type: 'habit_formation',
            title: 'New Personal Best! 🏆',
            description: `You achieved a new ${recentBest.title.toLowerCase()}: ${recentBest.value} ${recentBest.unit}${improvementText}`,
            confidence: 1.0,
            actionable: false,
            recommendation: 'Celebrate this achievement! You\'re making real progress.',
            data: {
              category: recentBest.category,
              value: recentBest.value,
              improvement: improvement
            },
            createdAt: new Date()
          };
        },
        priority: 9,
        category: 'motivation'
      }
    ];
  }

  // Helper methods
  private formatHour(hour: number): string {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  }

  private suggestMissingDays(dailyBreakdown: any[]): string[] {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const inactiveDays = dailyBreakdown
      .map((day, index) => ({ day: dayNames[new Date(day.date).getDay()], active: day.totalMinutes > 0, index }))
      .filter(item => !item.active)
      .map(item => item.day);

    // Suggest weekdays first, then weekends
    const weekdays = inactiveDays.filter(day => !['Saturday', 'Sunday'].includes(day));
    const weekends = inactiveDays.filter(day => ['Saturday', 'Sunday'].includes(day));
    
    return [...weekdays.slice(0, 2), ...weekends.slice(0, 1)].slice(0, 2);
  }

  private calculateCurrentStreak(dailyAnalytics: DailyAnalytics[]): number {
    if (dailyAnalytics.length === 0) return 0;

    const sortedDays = dailyAnalytics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;

    for (const day of sortedDays) {
      if (day.totalMinutes > 0) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private predictGoalAchievement(data: AnalyticsData): any {
    if (data.weeklyAnalytics.length === 0) return null;

    const currentWeek = data.weeklyAnalytics[data.weeklyAnalytics.length - 1];
    const weeklyGoal = currentWeek.patterns.averageDailyGoal * 7; // Estimate weekly goal
    const currentProgress = currentWeek.totalMinutes;
    const daysElapsed = currentWeek.dailyBreakdown.filter(day => day.totalMinutes > 0).length;
    const daysRemaining = 7 - daysElapsed;

    if (daysRemaining <= 0) return null;

    const dailyAverage = currentProgress / Math.max(daysElapsed, 1);
    const projectedTotal = currentProgress + (dailyAverage * daysRemaining);
    const probability = Math.min((projectedTotal / weeklyGoal) * 100, 100);
    
    const minutesNeeded = Math.max(0, weeklyGoal - currentProgress);
    const sessionsNeeded = Math.ceil(minutesNeeded / (dailyAverage || 30));

    return {
      probability,
      timeRemaining: daysRemaining,
      sessionsNeeded: Math.max(0, sessionsNeeded),
      projectedTotal: Math.round(projectedTotal)
    };
  }

  private analyzeTrend(weeklyData: WeeklyAnalytics[], metric: string): TrendAnalysis | null {
    if (weeklyData.length < 3) return null;

    const values = weeklyData.slice(-4).map(week => week[metric] || 0);
    const firstHalf = values.slice(0, 2);
    const secondHalf = values.slice(2);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    let direction: 'increasing' | 'decreasing' | 'stable';
    let strength: 'weak' | 'moderate' | 'strong';
    let significance: 'low' | 'medium' | 'high';

    if (Math.abs(change) < 5) {
      direction = 'stable';
      strength = 'weak';
      significance = 'low';
    } else if (change > 0) {
      direction = 'increasing';
      strength = change > 20 ? 'strong' : change > 10 ? 'moderate' : 'weak';
      significance = change > 15 ? 'high' : change > 8 ? 'medium' : 'low';
    } else {
      direction = 'decreasing';
      strength = change < -20 ? 'strong' : change < -10 ? 'moderate' : 'weak';
      significance = change < -15 ? 'high' : change < -8 ? 'medium' : 'low';
    }

    return {
      metric,
      direction,
      strength,
      confidence: Math.min(weeklyData.length / 6, 1),
      timeframe: `${weeklyData.length} weeks`,
      significance,
      description: `${metric} has been ${direction} ${strength}ly over the past ${weeklyData.length} weeks`
    };
  }

  private hasRecentPersonalBest(personalBests: any[]): boolean {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return personalBests.some(best => new Date(best.date) > threeDaysAgo);
  }

  private getMostRecentPersonalBest(personalBests: any[]): any {
    return personalBests
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }

  // Public methods
  getInsightRules(): InsightRule[] {
    return [...this.insightRules];
  }

  addCustomInsightRule(rule: InsightRule): void {
    this.insightRules.push(rule);
  }

  removeInsightRule(ruleId: string): void {
    this.insightRules = this.insightRules.filter(rule => rule.id !== ruleId);
  }
}
