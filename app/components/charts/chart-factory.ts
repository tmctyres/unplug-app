import { View } from '@nativescript/core';
import { LineChart } from './line-chart';
import { BarChart } from './bar-chart';
import { ProgressRing } from './progress-ring';
import { ChartConfig, DailyAnalytics, WeeklyAnalytics, MonthlyAnalytics } from '../../models/analytics-data';

export class ChartFactory {
  
  // Line Charts
  static createTrendChart(dailyData: DailyAnalytics[], metric: 'totalMinutes' | 'sessionCount' | 'averageSessionLength'): LineChart {
    const metricNames = {
      totalMinutes: 'Daily Minutes',
      sessionCount: 'Daily Sessions',
      averageSessionLength: 'Average Session Length'
    };

    const units = {
      totalMinutes: 'minutes',
      sessionCount: '',
      averageSessionLength: 'minutes'
    };

    return LineChart.create({
      title: `${metricNames[metric]} Trend`,
      series: [{
        name: metricNames[metric],
        data: dailyData.map(day => ({
          x: new Date(day.date),
          y: day[metric],
          metadata: { unit: units[metric] }
        })),
        color: '#3B82F6',
        type: 'line'
      }],
      showLegend: false,
      animated: true
    });
  }

  static createComparisonChart(current: DailyAnalytics[], previous: DailyAnalytics[], metric: string): LineChart {
    return LineChart.create({
      title: `${metric} Comparison`,
      series: [
        {
          name: 'Current Period',
          data: current.map(day => ({
            x: new Date(day.date),
            y: day[metric] || 0
          })),
          color: '#3B82F6'
        },
        {
          name: 'Previous Period',
          data: previous.map(day => ({
            x: new Date(day.date),
            y: day[metric] || 0
          })),
          color: '#9CA3AF'
        }
      ],
      showLegend: true,
      animated: true
    });
  }

  static createWeeklyTrendChart(weeklyData: WeeklyAnalytics[]): LineChart {
    return LineChart.create({
      title: 'Weekly Progress',
      series: [
        {
          name: 'Total Minutes',
          data: weeklyData.map(week => ({
            x: new Date(week.weekStart),
            y: week.totalMinutes,
            metadata: { unit: 'minutes' }
          })),
          color: '#10B981'
        },
        {
          name: 'Sessions',
          data: weeklyData.map(week => ({
            x: new Date(week.weekStart),
            y: week.sessionCount * 10, // Scale for visibility
            metadata: { unit: 'sessions' }
          })),
          color: '#F59E0B'
        }
      ],
      showLegend: true,
      animated: true
    });
  }

  // Bar Charts
  static createWeeklyBarChart(weeklyData: WeeklyAnalytics[]): BarChart {
    return BarChart.createWeeklyComparison(
      weeklyData.map(week => ({
        week: new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        minutes: week.totalMinutes
      }))
    );
  }

  static createDailyBreakdownChart(dailyData: DailyAnalytics[]): BarChart {
    return BarChart.create({
      title: 'Daily Breakdown',
      series: [{
        name: 'Minutes',
        data: dailyData.map(day => ({
          x: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
          y: day.totalMinutes,
          metadata: {
            unit: 'minutes',
            sessions: day.sessionCount,
            date: day.date
          }
        })),
        color: '#8B5CF6',
        type: 'bar'
      }],
      showLegend: false,
      animated: true
    });
  }

  static createSessionDistributionChart(dailyData: DailyAnalytics[]): BarChart {
    return BarChart.create({
      title: 'Session Distribution',
      series: [{
        name: 'Sessions',
        data: dailyData.map(day => ({
          x: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
          y: day.sessionCount,
          metadata: {
            unit: 'sessions',
            totalMinutes: day.totalMinutes,
            date: day.date
          }
        })),
        color: '#F59E0B',
        type: 'bar'
      }],
      showLegend: false,
      animated: true
    });
  }

  // Progress Ring Charts
  static createDailyGoalRing(currentMinutes: number, goalMinutes: number): ProgressRing {
    const percentage = Math.min((currentMinutes / goalMinutes) * 100, 100);
    return ProgressRing.create({
      title: 'Daily Goal',
      percentage,
      value: currentMinutes,
      target: goalMinutes,
      unit: 'minutes',
      color: percentage >= 100 ? '#10B981' : '#3B82F6',
      showPercentage: true,
      animated: true
    });
  }

  static createStreakRing(currentStreak: number): ProgressRing {
    const maxStreak = 30; // Max display streak
    const percentage = Math.min((currentStreak / maxStreak) * 100, 100);
    return ProgressRing.create({
      title: 'Streak',
      percentage,
      value: currentStreak,
      target: maxStreak,
      unit: 'days',
      color: currentStreak >= 7 ? '#EF4444' : '#F59E0B',
      showPercentage: false,
      animated: true
    });
  }

  static createXPRing(currentXP: number, xpToNextLevel: number): ProgressRing {
    const totalXPForLevel = currentXP + xpToNextLevel;
    const percentage = xpToNextLevel > 0 ? (currentXP / totalXPForLevel) * 100 : 100;
    return ProgressRing.create({
      title: 'Level Progress',
      percentage,
      value: currentXP,
      target: totalXPForLevel,
      unit: 'XP',
      color: '#8B5CF6',
      showPercentage: true,
      animated: true
    });
  }

  static createConsistencyRing(weeklyData: WeeklyAnalytics[]): ProgressRing {
    const recentWeeks = weeklyData.slice(-4); // Last 4 weeks
    const avgConsistency = recentWeeks.reduce((sum, week) =>
      sum + (week.patterns?.consistencyScore || 0), 0) / recentWeeks.length;

    return ProgressRing.create({
      title: 'Consistency',
      percentage: avgConsistency * 100,
      value: Math.round(avgConsistency * 100),
      target: 100,
      unit: '%',
      color: avgConsistency >= 0.8 ? '#10B981' : avgConsistency >= 0.6 ? '#F59E0B' : '#EF4444',
      showPercentage: true,
      animated: true
    });
  }

  static createDailyBreakdown(dailyData: DailyAnalytics[]): BarChart {
    return BarChart.createDailyBreakdown(
      dailyData.slice(-7).map(day => ({
        day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
        sessions: day.sessionCount,
        minutes: day.totalMinutes
      }))
    );
  }

  static createGoalProgressChart(goals: any[]): BarChart {
    return BarChart.createGoalComparison(
      goals.map(goal => ({
        name: goal.title.substring(0, 8),
        completed: goal.completedSessions,
        target: goal.totalTargetSessions || 10
      }))
    );
  }

  static createMonthlyComparisonChart(monthlyData: MonthlyAnalytics[]): BarChart {
    return new BarChart({
      title: 'Monthly Comparison',
      series: [
        {
          name: 'Minutes',
          data: monthlyData.map(month => ({
            x: new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
            y: month.totalMinutes,
            metadata: { unit: 'minutes' }
          })),
          color: '#8B5CF6'
        },
        {
          name: 'Goals',
          data: monthlyData.map(month => ({
            x: new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
            y: month.goalCompletions * 10, // Scale for visibility
            metadata: { unit: 'goals' }
          })),
          color: '#06B6D4'
        }
      ],
      showLegend: true,
      animated: true
    });
  }



  static createGoalProgressRing(goal: any): ProgressRing {
    const progress = (goal.completedSessions / (goal.totalTargetSessions || 10)) * 100;
    return new ProgressRing({
      value: progress,
      maxValue: 100,
      label: goal.title,
      progressColor: '#10B981',
      unit: '%',
      size: 100
    });
  }

  // Specialized Charts
  static createHeatmapData(dailyData: DailyAnalytics[]): any[] {
    // Create heatmap data for showing activity patterns
    const heatmapData = [];
    const today = new Date();
    
    // Generate last 12 weeks of data
    for (let week = 11; week >= 0; week--) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (week * 7) + day - today.getDay());
        
        const dayData = dailyData.find(d => d.date === date.toISOString().split('T')[0]);
        const intensity = dayData ? Math.min(dayData.totalMinutes / 120, 1) : 0; // Normalize to 0-1
        
        weekData.push({
          date: date,
          value: dayData?.totalMinutes || 0,
          intensity: intensity,
          day: day,
          week: week
        });
      }
      heatmapData.push(weekData);
    }
    
    return heatmapData;
  }

  static createInsightCards(insights: any[]): View[] {
    // Create visual cards for displaying insights
    return insights.map(insight => {
      const card = new (require('@nativescript/core').StackLayout)();
      card.className = 'insight-card bg-white rounded-xl p-4 shadow-sm mb-3';
      
      // Icon based on insight type
      const iconMap = {
        'optimal_timing': '⏰',
        'success_prediction': '🎯',
        'goal_recommendation': '🏆',
        'habit_formation': '🔄'
      };
      
      const icon = new (require('@nativescript/core').Label)();
      icon.text = iconMap[insight.type] || '💡';
      icon.className = 'insight-icon text-2xl mb-2';
      
      const title = new (require('@nativescript/core').Label)();
      title.text = insight.title;
      title.className = 'insight-title text-base font-semibold text-gray-800 mb-1';
      
      const description = new (require('@nativescript/core').Label)();
      description.text = insight.description;
      description.className = 'insight-description text-sm text-gray-600 mb-2';
      description.textWrap = true;
      
      // Confidence indicator
      const confidence = new (require('@nativescript/core').Label)();
      confidence.text = `${Math.round(insight.confidence * 100)}% confidence`;
      confidence.className = 'insight-confidence text-xs text-blue-600';
      
      card.addChild(icon);
      card.addChild(title);
      card.addChild(description);
      card.addChild(confidence);
      
      return card;
    });
  }

  // Utility methods
  static getChartColors(): string[] {
    return [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316'  // Orange
    ];
  }

  static getMetricColor(metric: string): string {
    const colorMap = {
      'totalMinutes': '#3B82F6',
      'sessionCount': '#10B981',
      'averageSessionLength': '#F59E0B',
      'goalCompletions': '#8B5CF6',
      'xpEarned': '#06B6D4',
      'streakDays': '#EF4444',
      'consistencyScore': '#84CC16'
    };
    
    return colorMap[metric] || '#6B7280';
  }

  static formatChartValue(value: number, metric: string): string {
    switch (metric) {
      case 'totalMinutes':
      case 'averageSessionLength':
        if (value < 60) return `${Math.round(value)}m`;
        const hours = Math.floor(value / 60);
        const minutes = Math.round(value % 60);
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      
      case 'consistencyScore':
        return `${Math.round(value)}%`;
      
      case 'xpEarned':
        return `${Math.round(value)} XP`;
      
      default:
        return Math.round(value).toString();
    }
  }
}
