import { Observable, View, StackLayout, Label, Button, GridLayout, Color } from '@nativescript/core';
import { PersonalBestEvent } from '../services/comparison-analytics';

export interface PersonalBestCelebrationData {
  event: PersonalBestEvent;
  title: string;
  message: string;
  icon: string;
  color: string;
  showConfetti: boolean;
}

export class PersonalBestCelebration extends Observable {
  private containerView: GridLayout | null = null;
  private celebrationData: PersonalBestCelebrationData | null = null;
  private isVisible: boolean = false;

  constructor() {
    super();
  }

  async showCelebration(data: PersonalBestCelebrationData): Promise<void> {
    if (this.isVisible) {
      await this.hideCelebration();
    }

    this.celebrationData = data;
    this.createCelebrationView();
    await this.animateIn();
    
    // Auto-hide after 5 seconds for minor achievements, 8 seconds for major/milestone
    const autoHideDelay = data.event.significance === 'minor' ? 5000 : 8000;
    setTimeout(() => {
      if (this.isVisible) {
        this.hideCelebration();
      }
    }, autoHideDelay);
  }

  private createCelebrationView(): void {
    if (!this.celebrationData) return;

    // Create overlay container
    this.containerView = new GridLayout();
    this.containerView.className = 'personal-best-overlay';
    this.containerView.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.containerView.width = { value: 100, unit: '%' };
    this.containerView.height = { value: 100, unit: '%' };
    this.containerView.opacity = 0;

    // Create celebration card
    const celebrationCard = new StackLayout();
    celebrationCard.className = 'personal-best-card bg-white rounded-2xl p-8 mx-8 shadow-lg';
    celebrationCard.horizontalAlignment = 'center';
    celebrationCard.verticalAlignment = 'middle';

    // Icon with animation potential
    const iconLabel = new Label();
    iconLabel.text = this.celebrationData.icon;
    iconLabel.className = 'personal-best-icon text-6xl text-center mb-4';
    iconLabel.color = new Color(this.celebrationData.color);

    // Title
    const titleLabel = new Label();
    titleLabel.text = this.celebrationData.title;
    titleLabel.className = 'personal-best-title text-2xl font-bold text-center text-gray-800 mb-2';
    titleLabel.textWrap = true;

    // Message
    const messageLabel = new Label();
    messageLabel.text = this.celebrationData.message;
    messageLabel.className = 'personal-best-message text-base text-center text-gray-600 mb-4';
    messageLabel.textWrap = true;

    // Achievement details
    const detailsContainer = this.createDetailsContainer();

    // Action buttons
    const buttonsContainer = this.createButtonsContainer();

    // Add all elements to card
    celebrationCard.addChild(iconLabel);
    celebrationCard.addChild(titleLabel);
    celebrationCard.addChild(messageLabel);
    celebrationCard.addChild(detailsContainer);
    celebrationCard.addChild(buttonsContainer);

    this.containerView.addChild(celebrationCard);

    // Add confetti effect for milestone achievements
    if (this.celebrationData.showConfetti) {
      this.addConfettiEffect();
    }
  }

  private createDetailsContainer(): View {
    const container = new StackLayout();
    container.className = 'personal-best-details bg-gray-50 rounded-lg p-4 mb-6';

    if (!this.celebrationData) return container;

    const event = this.celebrationData.event;

    // New value
    const newValueContainer = new GridLayout();
    newValueContainer.columns = '*, *';
    newValueContainer.className = 'mb-2';

    const newValueLabel = new Label();
    newValueLabel.text = 'New Record:';
    newValueLabel.className = 'text-sm text-gray-600';
    GridLayout.setColumn(newValueLabel, 0);

    const newValueText = new Label();
    newValueText.text = this.formatValue(event.newValue, event.category);
    newValueText.className = 'text-sm font-bold text-green-600 text-right';
    GridLayout.setColumn(newValueText, 1);

    newValueContainer.addChild(newValueLabel);
    newValueContainer.addChild(newValueText);

    // Previous best (if exists)
    if (event.oldValue > 0) {
      const oldValueContainer = new GridLayout();
      oldValueContainer.columns = '*, *';
      oldValueContainer.className = 'mb-2';

      const oldValueLabel = new Label();
      oldValueLabel.text = 'Previous Best:';
      oldValueLabel.className = 'text-sm text-gray-600';
      GridLayout.setColumn(oldValueLabel, 0);

      const oldValueText = new Label();
      oldValueText.text = this.formatValue(event.oldValue, event.category);
      oldValueText.className = 'text-sm text-gray-500 text-right';
      GridLayout.setColumn(oldValueText, 1);

      oldValueContainer.addChild(oldValueLabel);
      oldValueContainer.addChild(oldValueText);
      container.addChild(oldValueContainer);
    }

    container.addChild(newValueContainer);

    // Improvement percentage
    if (event.improvement > 0) {
      const improvementContainer = new GridLayout();
      improvementContainer.columns = '*, *';

      const improvementLabel = new Label();
      improvementLabel.text = 'Improvement:';
      improvementLabel.className = 'text-sm text-gray-600';
      GridLayout.setColumn(improvementLabel, 0);

      const improvementText = new Label();
      improvementText.text = `+${Math.round(event.improvement)}%`;
      improvementText.className = 'text-sm font-bold text-blue-600 text-right';
      GridLayout.setColumn(improvementText, 1);

      improvementContainer.addChild(improvementLabel);
      improvementContainer.addChild(improvementText);
      container.addChild(improvementContainer);
    }

    return container;
  }

  private createButtonsContainer(): View {
    const container = new GridLayout();
    container.columns = '*, *';
    container.className = 'gap-3';

    // Share button
    const shareButton = new Button();
    shareButton.text = '📤 Share';
    shareButton.className = 'btn btn-outline-primary';
    GridLayout.setColumn(shareButton, 0);
    shareButton.on('tap', () => this.onShare());

    // Continue button
    const continueButton = new Button();
    continueButton.text = '🎉 Awesome!';
    continueButton.className = 'btn btn-primary';
    GridLayout.setColumn(continueButton, 1);
    continueButton.on('tap', () => this.hideCelebration());

    container.addChild(shareButton);
    container.addChild(continueButton);

    return container;
  }

  private addConfettiEffect(): void {
    // Create confetti elements (simplified version)
    for (let i = 0; i < 20; i++) {
      const confetti = new Label();
      confetti.text = ['🎉', '🎊', '✨', '🌟', '💫'][Math.floor(Math.random() * 5)];
      confetti.className = 'confetti-piece absolute';
      confetti.fontSize = Math.random() * 20 + 15;
      confetti.opacity = 0.8;
      
      // Random position
      confetti.marginLeft = Math.random() * 300;
      confetti.marginTop = Math.random() * 200;
      
      this.containerView?.addChild(confetti);
      
      // Animate confetti falling
      setTimeout(() => {
        confetti.animate({
          translate: { x: (Math.random() - 0.5) * 100, y: 400 },
          opacity: 0,
          rotate: Math.random() * 360,
          duration: 3000,
          curve: 'easeOut'
        }).then(() => {
          if (confetti.parent && 'removeChild' in confetti.parent) {
            (confetti.parent as any).removeChild(confetti);
          }
        });
      }, Math.random() * 1000);
    }
  }

  private async animateIn(): Promise<void> {
    if (!this.containerView) return;

    this.isVisible = true;

    // Add to current page
    const { Frame } = require('@nativescript/core');
    const currentPage = Frame.topmost().currentPage;
    if (currentPage) {
      currentPage.addChild(this.containerView);
    }

    // Animate overlay
    await this.containerView.animate({
      opacity: 1,
      duration: 300,
      curve: 'easeOut'
    });

    // Animate card with bounce effect
    const card = this.containerView.getChildAt(0);
    if (card) {
      card.scaleX = 0.3;
      card.scaleY = 0.3;
      
      await card.animate({
        scale: { x: 1.1, y: 1.1 },
        duration: 400,
        curve: 'easeOut'
      });

      await card.animate({
        scale: { x: 1, y: 1 },
        duration: 200,
        curve: 'easeIn'
      });
    }

    // Pulse icon
    const icon = (card && 'getChildAt' in card) ? (card as any).getChildAt(0) : null;
    if (icon) {
      this.pulseIcon(icon);
    }
  }

  private async pulseIcon(icon: View): Promise<void> {
    // Continuous pulse animation
    const pulse = async () => {
      if (!this.isVisible) return;
      
      await icon.animate({
        scale: { x: 1.2, y: 1.2 },
        duration: 800,
        curve: 'easeInOut'
      });
      
      await icon.animate({
        scale: { x: 1, y: 1 },
        duration: 800,
        curve: 'easeInOut'
      });
      
      if (this.isVisible) {
        setTimeout(pulse, 500);
      }
    };
    
    pulse();
  }

  async hideCelebration(): Promise<void> {
    if (!this.containerView || !this.isVisible) return;

    this.isVisible = false;

    // Animate out
    await this.containerView.animate({
      opacity: 0,
      scale: { x: 0.8, y: 0.8 },
      duration: 300,
      curve: 'easeIn'
    });

    // Remove from page
    if (this.containerView.parent && 'removeChild' in this.containerView.parent) {
      (this.containerView.parent as any).removeChild(this.containerView);
    }

    this.containerView = null;
    this.celebrationData = null;
  }

  private onShare(): void {
    if (!this.celebrationData) return;

    const { SocialShare } = require('@nativescript/social-share');
    const event = this.celebrationData.event;
    
    const shareText = `🏆 New Personal Best! I just achieved ${this.formatValue(event.newValue, event.category)} in my digital wellness journey with Unplug! ${event.improvement > 0 ? `That's a ${Math.round(event.improvement)}% improvement!` : ''} #DigitalWellness #PersonalBest`;

    SocialShare.shareText(shareText, 'Check out my new personal best!');
  }

  private formatValue(value: number, category: string): string {
    switch (category) {
      case 'longest_session':
      case 'most_daily_minutes':
      case 'most_weekly_minutes':
        if (value < 60) return `${Math.round(value)} minutes`;
        const hours = Math.floor(value / 60);
        const minutes = Math.round(value % 60);
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      
      case 'longest_streak':
        return `${value} day${value !== 1 ? 's' : ''}`;
      
      case 'most_daily_sessions':
        return `${value} session${value !== 1 ? 's' : ''}`;
      
      case 'best_consistency':
        return `${Math.round(value)}%`;
      
      default:
        return value.toString();
    }
  }

  // Static factory methods
  static createPersonalBestCelebration(event: PersonalBestEvent): PersonalBestCelebrationData {
    const icons = {
      'longest_session': '⏱️',
      'most_daily_minutes': '📈',
      'most_daily_sessions': '🎯',
      'most_weekly_minutes': '📊',
      'longest_streak': '🔥',
      'best_consistency': '💎'
    };

    const colors = {
      'minor': '#3B82F6',
      'major': '#10B981',
      'milestone': '#F59E0B'
    };

    const titles = {
      'minor': 'New Personal Best!',
      'major': 'Amazing Achievement!',
      'milestone': 'Incredible Milestone!'
    };

    const messages = {
      'minor': 'You\'ve set a new personal record! Keep up the great work.',
      'major': 'This is a significant improvement! Your dedication is paying off.',
      'milestone': 'You\'ve reached an incredible milestone! This is truly exceptional.'
    };

    return {
      event,
      title: titles[event.significance],
      message: messages[event.significance],
      icon: icons[event.category] || '🏆',
      color: colors[event.significance],
      showConfetti: event.significance === 'milestone'
    };
  }
}
