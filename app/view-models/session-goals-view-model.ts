import { Observable } from '@nativescript/core';
import { UserDataService, SessionGoal } from '../models/user-data';
import { TrackingService } from '../services/tracking-service';
import { PropertyChangeEventData, isPropertyChangeEvent } from '../models/event-types';

export class SessionGoalsViewModel extends Observable {
  private userDataService: UserDataService;
  private trackingService: TrackingService;
  private selectedGoalId: string | null = null;

  constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.trackingService = TrackingService.getInstance();
    this.loadSessionGoals();
    this.setupEventListeners();
  }

  private loadSessionGoals(): void {
    const goals = this.userDataService.getSessionGoals();
    const recommendedGoals = this.userDataService.getRecommendedGoals();
    
    this.set('sessionGoals', goals);
    this.set('recommendedGoals', recommendedGoals);
    this.set('hasGoals', goals.length > 0);
    this.set('selectedGoalId', null);
    
    // Group goals by category
    const goalsByCategory = this.groupGoalsByCategory(goals);
    this.set('goalCategories', goalsByCategory);
  }

  private groupGoalsByCategory(goals: SessionGoal[]): any[] {
    const categories = new Map();
    
    goals.forEach(goal => {
      if (!categories.has(goal.category)) {
        categories.set(goal.category, {
          name: this.getCategoryDisplayName(goal.category),
          id: goal.category,
          icon: this.getCategoryIcon(goal.category),
          goals: []
        });
      }
      categories.get(goal.category).goals.push(goal);
    });

    return Array.from(categories.values());
  }

  private getCategoryDisplayName(category: string): string {
    const displayNames = {
      'focus': 'Focus & Productivity',
      'relaxation': 'Rest & Relaxation',
      'creativity': 'Creative Time',
      'exercise': 'Physical Activity',
      'social': 'Social Connection',
      'learning': 'Learning & Growth',
      'custom': 'Custom Goals'
    };
    return displayNames[category] || category;
  }

  private getCategoryIcon(category: string): string {
    const icons = {
      'focus': '🎯',
      'relaxation': '🧘',
      'creativity': '🎨',
      'exercise': '🏃',
      'social': '👥',
      'learning': '📚',
      'custom': '⭐'
    };
    return icons[category] || '📝';
  }

  private setupEventListeners(): void {
    this.userDataService.on('propertyChange', (args) => {
      if (isPropertyChangeEvent(args)) {
        if (args.propertyName === 'goalCompleted') {
          this.handleGoalCompleted(args.value);
        } else if (args.propertyName === 'goalSeriesCompleted') {
          this.handleGoalSeriesCompleted(args.value);
        }
      }
    });
  }

  private handleGoalCompleted(data: any): void {
    this.loadSessionGoals(); // Refresh the goals list
    this.showGoalCompletedFeedback(data.goal, data.sessionDuration, data.isSeriesComplete);
  }

  private handleGoalSeriesCompleted(data: any): void {
    this.showGoalSeriesCompletedFeedback(data.goal, data.totalSessions);
  }

  onGoalSelect(goalId: string): void {
    this.set('selectedGoalId', goalId);
    const goal = this.userDataService.getSessionGoalById(goalId);
    
    if (goal) {
      this.notifyPropertyChange('goalSelected', {
        goal,
        progress: this.userDataService.getGoalProgress(goalId)
      });
    }
  }

  onStartSessionWithGoal(goalId: string): void {
    const goal = this.userDataService.getSessionGoalById(goalId);
    if (!goal) return;

    this.set('selectedGoalId', goalId);
    
    // Start session with goal context
    if (this.trackingService.isAndroid()) {
      // For Android, we'll track automatically but store the goal context
      this.trackingService.setCurrentGoal(goalId);
      this.showGoalStartedFeedback(goal);
    } else {
      // For iOS, start manual session with goal
      if (this.trackingService.startManualSession()) {
        this.trackingService.setCurrentGoal(goalId);
        this.showGoalStartedFeedback(goal);
      }
    }

    // Navigate back to main page
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  onCreateNewGoal(): void {
    this.set('isCreatingGoal', true);
    this.set('newGoalTitle', '');
    this.set('newGoalDescription', '');
    this.set('newGoalTargetMinutes', 30);
    this.set('newGoalCategory', 'focus');
    this.set('newGoalTargetSessions', 5);
  }

  onSaveNewGoal(): void {
    const title = this.get('newGoalTitle');
    const description = this.get('newGoalDescription');
    const targetMinutes = this.get('newGoalTargetMinutes');
    const category = this.get('newGoalCategory');
    const targetSessions = this.get('newGoalTargetSessions');

    if (!title || title.trim().length === 0) {
      this.showError('Please enter a goal title');
      return;
    }

    if (targetMinutes < 5 || targetMinutes > 480) {
      this.showError('Target duration must be between 5 minutes and 8 hours');
      return;
    }

    try {
      const goalId = this.userDataService.createSessionGoal(
        title.trim(),
        targetMinutes,
        description.trim(),
        category
      );

      // Update the goal with target sessions if specified
      if (targetSessions > 0) {
        this.userDataService.updateSessionGoal(goalId, { totalTargetSessions: targetSessions });
      }

      this.set('isCreatingGoal', false);
      this.loadSessionGoals();
      this.showSuccess('Goal created successfully!');
      
    } catch (error) {
      this.showError('Failed to create goal. Please try again.');
      console.error('Error creating session goal:', error);
    }
  }

  onCancelNewGoal(): void {
    this.set('isCreatingGoal', false);
  }

  onCategorySelect(categoryId: string): void {
    this.set('newGoalCategory', categoryId);
  }

  onEditGoal(goalId: string): void {
    // For now, just show goal details
    const goal = this.userDataService.getSessionGoalById(goalId);
    if (goal) {
      const { Dialogs } = require('@nativescript/core');
      const progress = this.getGoalProgress(goalId);
      Dialogs.alert({
        title: goal.title,
        message: `Target: ${this.formatDuration(goal.targetMinutes)}\nCategory: ${this.getCategoryDisplayName(goal.category)}\nProgress: ${progress.progressText}\n\nDescription: ${goal.description || 'No description'}`,
        okButtonText: "Close"
      });
    }
  }

  onDeleteGoal(goalId: string): void {
    const { Dialogs } = require('@nativescript/core');
    const goal = this.userDataService.getSessionGoalById(goalId);
    
    if (!goal) return;

    Dialogs.confirm({
      title: "Delete Goal",
      message: `Are you sure you want to delete "${goal.title}"? This action cannot be undone.`,
      okButtonText: "Delete",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result) {
        const success = this.userDataService.deleteSessionGoal(goalId);
        if (success) {
          this.loadSessionGoals();
          this.showSuccess('Goal deleted successfully');
        } else {
          this.showError('Failed to delete goal');
        }
      }
    });
  }

  getGoalProgress(goalId: string): any {
    const progress = this.userDataService.getGoalProgress(goalId);
    return {
      ...progress,
      progressText: progress.target 
        ? `${progress.completed}/${progress.target} sessions`
        : `${progress.completed} sessions completed`
    };
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  isGoalSelected(goalId: string): boolean {
    return this.get('selectedGoalId') === goalId;
  }

  getCategoryIconForGoal(category: string): string {
    return this.getCategoryIcon(category);
  }

  private showGoalStartedFeedback(goal: SessionGoal): void {
    this.showSuccess(`Started "${goal.title}" session! Target: ${this.formatDuration(goal.targetMinutes)}`);
  }

  private showGoalCompletedFeedback(goal: SessionGoal, sessionDuration: number, isSeriesComplete: boolean): void {
    let message = `Goal "${goal.title}" completed! You achieved ${this.formatDuration(sessionDuration)}.`;
    
    if (isSeriesComplete) {
      message += ` 🎉 You've completed the entire goal series!`;
    }
    
    this.showSuccess(message);
  }

  private showGoalSeriesCompletedFeedback(goal: SessionGoal, totalSessions: number): void {
    this.showSuccess(`🏆 Goal series "${goal.title}" completed! You finished all ${totalSessions} sessions. Amazing dedication!`);
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
  get canSaveGoal(): boolean {
    const title = this.get('newGoalTitle');
    const targetMinutes = this.get('newGoalTargetMinutes');
    return title && title.trim().length > 0 && targetMinutes >= 5 && targetMinutes <= 480;
  }

  get categoryOptions(): any[] {
    return [
      { id: 'focus', name: 'Focus & Productivity', icon: '🎯' },
      { id: 'relaxation', name: 'Rest & Relaxation', icon: '🧘' },
      { id: 'creativity', name: 'Creative Time', icon: '🎨' },
      { id: 'exercise', name: 'Physical Activity', icon: '🏃' },
      { id: 'social', name: 'Social Connection', icon: '👥' },
      { id: 'learning', name: 'Learning & Growth', icon: '📚' },
      { id: 'custom', name: 'Custom Goal', icon: '⭐' }
    ];
  }
}
