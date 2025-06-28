import { Observable, Animation, EventData } from '@nativescript/core';
import { FeedbackType } from '../services/feedback-service';

export interface CelebrationData {
  type: FeedbackType;
  title: string;
  message: string;
  icon: string;
  reward?: string;
  duration?: number;
}

export class CelebrationOverlay extends Observable {
  private animationDuration: number = 3000;
  private isAnimating: boolean = false;

  constructor() {
    super();
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    this.set('isVisible', false);
    this.set('opacity', 0);
    this.set('iconScale', 0.5);
    this.set('showContinueButton', false);
    this.set('showReward', false);
  }

  async showCelebration(data: CelebrationData): Promise<void> {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.setupCelebrationData(data);
    
    // Show overlay
    this.set('isVisible', true);
    
    // Animate entrance
    await this.animateEntrance();
    
    // Auto-hide after duration or wait for user interaction
    if (data.duration && data.duration > 0) {
      setTimeout(() => {
        if (this.isAnimating) {
          this.hideCelebration();
        }
      }, data.duration);
    } else {
      this.set('showContinueButton', true);
    }
  }

  private setupCelebrationData(data: CelebrationData): void {
    this.set('celebrationIcon', data.icon);
    this.set('celebrationTitle', data.title);
    this.set('celebrationMessage', data.message);
    
    if (data.reward) {
      this.set('rewardText', data.reward);
      this.set('showReward', true);
    } else {
      this.set('showReward', false);
    }

    // Set celebration-specific styling
    this.setCelebrationStyle(data.type);
  }

  private setCelebrationStyle(type: FeedbackType): void {
    // Different visual styles based on celebration type
    switch (type) {
      case FeedbackType.ACHIEVEMENT:
        this.set('celebrationClass', 'achievement-celebration');
        break;
      case FeedbackType.LEVEL_UP:
        this.set('celebrationClass', 'levelup-celebration');
        break;
      case FeedbackType.STREAK:
        this.set('celebrationClass', 'streak-celebration');
        break;
      default:
        this.set('celebrationClass', 'default-celebration');
    }
  }

  private async animateEntrance(): Promise<void> {
    const animations: any[] = [];

    // Fade in overlay
    animations.push({
      target: this,
      opacity: 1,
      duration: 300,
      curve: 'easeOut'
    } as any);

    // Scale up icon with bounce effect
    animations.push({
      target: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 400,
      curve: 'spring'
    } as any);

    // Scale back to normal
    setTimeout(() => {
      const scaleBack = {
        target: this,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        curve: 'easeOut'
      } as any;
      
      new Animation([scaleBack]).play();
    }, 400);

    // Animate confetti particles
    this.animateConfetti();

    return new Promise((resolve) => {
      new Animation(animations).play().then(() => {
        resolve();
      });
    });
  }

  private animateConfetti(): void {
    // Simple confetti animation using CSS-like transforms
    // In a real implementation, you might use more sophisticated particle systems
    
    const particles = ['.confetti-1', '.confetti-2', '.confetti-3', '.confetti-4', '.confetti-5', '.confetti-6'];
    
    particles.forEach((particle, index) => {
      setTimeout(() => {
        // Animate each particle with random movement
        const randomX = Math.random() * 200 - 100; // -100 to 100
        const randomY = Math.random() * 100 - 50;   // -50 to 50
        
        // This would need to be implemented with actual view references
        // For now, we'll emit events that the UI can listen to
        this.notifyPropertyChange('confettiAnimation', {
          particle: index,
          x: randomX,
          y: randomY,
          delay: index * 100
        });
      }, index * 100);
    });
  }

  async hideCelebration(): Promise<void> {
    if (!this.isAnimating) return;

    // Animate exit
    const exitAnimation = {
      target: this,
      opacity: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 300,
      curve: 'easeIn'
    } as any;

    return new Promise((resolve) => {
      new Animation([exitAnimation]).play().then(() => {
        this.set('isVisible', false);
        this.set('showContinueButton', false);
        this.isAnimating = false;
        this.initializeDefaults();
        resolve();
      });
    });
  }

  onContinue(): void {
    this.hideCelebration();
  }

  // Static helper methods for common celebrations
  static createAchievementCelebration(achievementTitle: string, xpReward: number): CelebrationData {
    return {
      type: FeedbackType.ACHIEVEMENT,
      title: 'Achievement Unlocked!',
      message: achievementTitle,
      icon: '🏆',
      reward: `+${xpReward} XP earned!`,
      duration: 4000
    };
  }

  static createLevelUpCelebration(newLevel: number, newTitle: string): CelebrationData {
    return {
      type: FeedbackType.LEVEL_UP,
      title: 'Level Up!',
      message: `Welcome to Level ${newLevel}`,
      icon: '🎉',
      reward: `You are now a ${newTitle}!`,
      duration: 5000
    };
  }

  static createStreakCelebration(streakDays: number): CelebrationData {
    return {
      type: FeedbackType.STREAK,
      title: 'Streak Milestone!',
      message: `${streakDays} days of consistency!`,
      icon: '🔥',
      reward: 'Keep the momentum going!',
      duration: 3000
    };
  }

  static createSessionCelebration(duration: string, xpEarned: number): CelebrationData {
    return {
      type: FeedbackType.SESSION_END,
      title: 'Session Complete!',
      message: `You stayed offline for ${duration}`,
      icon: '✨',
      reward: `+${xpEarned} XP earned!`,
      duration: 3000
    };
  }
}
