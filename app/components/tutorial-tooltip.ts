import { Observable, Animation, View, EventData } from '@nativescript/core';
import { TooltipConfig } from '../services/tutorial-service';

export class TutorialTooltip extends Observable {
  private animationDuration: number = 300;
  private isAnimating: boolean = false;
  private config: TooltipConfig | null = null;
  private tooltipView: View | null = null;

  constructor() {
    super();
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    this.set('isVisible', false);
    this.set('opacity', 0);
    this.set('showOverlay', false);
    this.set('showArrow', true);
    this.set('showActions', false);
    this.set('dismissible', true);
    this.set('tooltipRow', 1);
    this.set('tooltipCol', 1);
    this.set('tooltipWidth', 280);
    this.set('arrowPosition', 'bottom');
  }

  async showTooltip(config: TooltipConfig, targetElement?: View, tooltipView?: View): Promise<void> {
    if (this.isAnimating) return;

    this.config = config;
    this.tooltipView = tooltipView || null;
    this.isAnimating = true;
    this.setupTooltipData(config);

    // Position tooltip relative to target element
    if (targetElement) {
      this.positionTooltip(config.position, targetElement);
    } else {
      this.centerTooltip();
    }

    // Show tooltip
    this.set('isVisible', true);

    // Animate entrance
    await this.animateEntrance();

    this.isAnimating = false;
  }

  async hideTooltip(): Promise<void> {
    if (this.isAnimating || !this.get('isVisible')) return;

    this.isAnimating = true;
    
    // Animate exit
    await this.animateExit();
    
    // Hide tooltip
    this.set('isVisible', false);
    this.isAnimating = false;
    this.config = null;
  }

  private setupTooltipData(config: TooltipConfig): void {
    this.set('title', config.title);
    this.set('message', config.message);
    this.set('icon', config.icon || '');
    this.set('actionText', config.actionText || '');
    this.set('dismissible', config.dismissible !== false);
    this.set('showActions', !!config.actionText);
    this.set('showOverlay', config.position === 'center');
  }

  private positionTooltip(position: string, targetElement: View): void {
    // Get target element position (simplified - in real implementation would use actual positioning)
    switch (position) {
      case 'top':
        this.set('tooltipRow', 0);
        this.set('tooltipCol', 1);
        this.set('arrowPosition', 'bottom');
        break;
      case 'bottom':
        this.set('tooltipRow', 2);
        this.set('tooltipCol', 1);
        this.set('arrowPosition', 'top');
        break;
      case 'left':
        this.set('tooltipRow', 1);
        this.set('tooltipCol', 0);
        this.set('arrowPosition', 'right');
        break;
      case 'right':
        this.set('tooltipRow', 1);
        this.set('tooltipCol', 2);
        this.set('arrowPosition', 'left');
        break;
      default:
        this.centerTooltip();
    }
  }

  private centerTooltip(): void {
    this.set('tooltipRow', 1);
    this.set('tooltipCol', 1);
    this.set('arrowPosition', 'none');
    this.set('showArrow', false);
    this.set('showOverlay', true);
  }

  private async animateEntrance(): Promise<void> {
    if (!this.tooltipView) return Promise.resolve();

    return new Promise((resolve) => {
      const animation = new Animation([
        {
          target: this.tooltipView,
          opacity: 1,
          duration: this.animationDuration,
          curve: 'easeOut'
        }
      ]);

      animation.play().then(() => {
        resolve();
      });
    });
  }

  private async animateExit(): Promise<void> {
    if (!this.tooltipView) return Promise.resolve();

    return new Promise((resolve) => {
      const animation = new Animation([
        {
          target: this.tooltipView,
          opacity: 0,
          duration: this.animationDuration,
          curve: 'easeIn'
        }
      ]);

      animation.play().then(() => {
        resolve();
      });
    });
  }

  // Event Handlers
  onDismiss(): void {
    this.notify({
      eventName: 'tooltipDismissed',
      object: this,
      data: { tooltipId: this.config?.id }
    });
    this.hideTooltip();
  }

  onAction(): void {
    if (this.config?.actionCallback) {
      this.config.actionCallback();
    }
    
    this.notify({
      eventName: 'tooltipAction',
      object: this,
      data: { tooltipId: this.config?.id }
    });
    
    this.hideTooltip();
  }

  // Static factory methods
  static createFeatureTooltip(
    id: string, 
    title: string, 
    message: string, 
    targetElement: string,
    position: 'top' | 'bottom' | 'left' | 'right' = 'bottom'
  ): TooltipConfig {
    return {
      id,
      title,
      message,
      targetElement,
      position,
      showOnce: true,
      dismissible: true,
      autoHide: 8000,
      icon: '💡'
    };
  }

  static createHelpTooltip(
    id: string,
    title: string,
    message: string,
    targetElement: string,
    actionText?: string,
    actionCallback?: () => void
  ): TooltipConfig {
    return {
      id,
      title,
      message,
      targetElement,
      position: 'bottom',
      showOnce: false,
      dismissible: true,
      icon: '❓',
      actionText,
      actionCallback
    };
  }

  static createWelcomeTooltip(
    id: string,
    title: string,
    message: string,
    actionText: string = 'Got it!',
    actionCallback?: () => void
  ): TooltipConfig {
    return {
      id,
      title,
      message,
      targetElement: '',
      position: 'center',
      showOnce: true,
      dismissible: true,
      icon: '👋',
      actionText,
      actionCallback
    };
  }
}
