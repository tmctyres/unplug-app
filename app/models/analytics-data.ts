export interface TimeRange {
  start: Date;
  end: Date;
}

export interface SessionPattern {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  hourOfDay: number; // 0-23
  duration: number; // minutes
  goalId?: string;
  mood?: string;
  activities?: string[];
  date: Date;
}

export interface DailyAnalytics {
  date: string; // YYYY-MM-DD format
  totalMinutes: number;
  sessionCount: number;
  averageSessionLength: number;
  longestSession: number;
  shortestSession: number;
  goalCompletions: number;
  xpEarned: number;
  achievementsUnlocked: number;
  streakDay: number;
  mood?: string; // Most common mood of the day
  topActivities: string[]; // Most common activities
  timeDistribution: HourlyDistribution[];
}

export interface HourlyDistribution {
  hour: number; // 0-23
  minutes: number;
  sessionCount: number;
}

export interface WeeklyAnalytics {
  weekStart: string; // YYYY-MM-DD format (Monday)
  totalMinutes: number;
  sessionCount: number;
  averageSessionLength: number;
  goalCompletions: number;
  xpEarned: number;
  achievementsUnlocked: number;
  streakDays: number;
  dailyBreakdown: DailyAnalytics[];
  bestDay: {
    date: string;
    minutes: number;
    reason: string;
  };
  patterns: {
    mostProductiveDay: number; // 0-6
    mostProductiveHour: number; // 0-23
    averageDailyGoal: number;
    consistencyScore: number; // 0-100
  };
}

export interface MonthlyAnalytics {
  month: string; // YYYY-MM format
  totalMinutes: number;
  sessionCount: number;
  averageSessionLength: number;
  goalCompletions: number;
  xpEarned: number;
  achievementsUnlocked: number;
  maxStreak: number;
  weeklyBreakdown: WeeklyAnalytics[];
  trends: {
    minutesChange: number; // vs previous month
    sessionCountChange: number;
    averageLengthChange: number;
    consistencyChange: number;
  };
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  type: 'streak' | 'total_time' | 'session_count' | 'goal_completion' | 'level_up' | 'achievement';
  title: string;
  description: string;
  value: number;
  date: Date;
  icon: string;
}

export interface UserBehaviorPattern {
  userId: string;
  patternType: 'time_preference' | 'duration_preference' | 'goal_preference' | 'activity_preference';
  pattern: {
    preferredDays: number[]; // Days of week user is most active
    preferredHours: number[]; // Hours of day user is most active
    preferredDuration: {
      min: number;
      max: number;
      average: number;
    };
    preferredGoals: string[]; // Most completed goal IDs
    preferredActivities: string[]; // Most selected activities
    preferredMoods: string[]; // Most common moods
  };
  confidence: number; // 0-1, how confident we are in this pattern
  lastUpdated: Date;
}

export interface PredictiveInsight {
  id: string;
  type: 'success_prediction' | 'optimal_timing' | 'goal_recommendation' | 'habit_formation';
  title: string;
  description: string;
  confidence: number; // 0-1
  actionable: boolean;
  recommendation?: string;
  data: any; // Specific data for the insight type
  createdAt: Date;
  expiresAt?: Date;
}

export interface ComparisonMetrics {
  current: {
    period: TimeRange;
    totalMinutes: number;
    sessionCount: number;
    averageLength: number;
    goalCompletions: number;
    consistencyScore: number;
  };
  previous: {
    period: TimeRange;
    totalMinutes: number;
    sessionCount: number;
    averageLength: number;
    goalCompletions: number;
    consistencyScore: number;
  };
  changes: {
    minutesChange: number; // percentage
    sessionCountChange: number;
    averageLengthChange: number;
    goalCompletionsChange: number;
    consistencyChange: number;
  };
  insights: string[]; // Generated insights about the changes
}

export interface PersonalBest {
  id: string;
  category: 'longest_session' | 'most_daily_minutes' | 'longest_streak' | 'most_weekly_sessions' | 'fastest_goal_completion';
  title: string;
  value: number;
  unit: string;
  date: Date;
  previousBest?: {
    value: number;
    date: Date;
  };
  improvement?: number; // How much better than previous best
}

export interface AnalyticsPreferences {
  defaultTimeRange: 'week' | 'month' | 'quarter' | 'year';
  showComparisons: boolean;
  showPredictions: boolean;
  showPersonalBests: boolean;
  chartAnimations: boolean;
  insightNotifications: boolean;
  weekStartsOn: 'sunday' | 'monday';
}

export interface AnalyticsData {
  userId: string;
  dailyAnalytics: DailyAnalytics[];
  weeklyAnalytics: WeeklyAnalytics[];
  monthlyAnalytics: MonthlyAnalytics[];
  behaviorPatterns: UserBehaviorPattern[];
  predictiveInsights: PredictiveInsight[];
  personalBests: PersonalBest[];
  preferences: AnalyticsPreferences;
  lastCalculated: Date;
}

// Utility types for chart data
export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
  metadata?: any;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area' | 'pie';
}

export interface ChartConfig {
  title: string;
  subtitle?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  series: ChartSeries[];
  timeRange?: TimeRange;
  showLegend?: boolean;
  showGrid?: boolean;
  animated?: boolean;
}

// Insight generation types
export interface InsightRule {
  id: string;
  name: string;
  description: string;
  condition: (data: AnalyticsData) => boolean;
  generate: (data: AnalyticsData) => PredictiveInsight | null;
  priority: number; // Higher = more important
  category: 'performance' | 'habit' | 'motivation' | 'optimization';
}

export interface TrendAnalysis {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number;
  timeframe: string;
  significance: 'low' | 'medium' | 'high';
  description: string;
}
