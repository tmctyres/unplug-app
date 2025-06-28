import { View, StackLayout, Label, GridLayout, Color } from '@nativescript/core';
import { BaseChart } from './base-chart';

export interface ProgressRingConfig {
  value: number; // 0-100
  maxValue?: number;
  percentage?: number;
  target?: number;
  size?: number; // diameter in pixels
  strokeWidth?: number;
  backgroundColor?: string;
  progressColor?: string;
  color?: string;
  textColor?: string;
  showValue?: boolean;
  showLabel?: boolean;
  showPercentage?: boolean;
  label?: string;
  title?: string;
  unit?: string;
  animated?: boolean;
}

export class ProgressRing extends GridLayout {
  private config: ProgressRingConfig;
  private container: GridLayout;
  private progressElement: Label;
  private valueLabel: Label;
  private descriptionLabel: Label;
  private currentValue: number = 0;

  constructor(config: ProgressRingConfig) {
    super();
    this.config = {
      size: 120,
      strokeWidth: 8,
      backgroundColor: '#E5E7EB',
      progressColor: '#3B82F6',
      textColor: '#1F2937',
      showValue: true,
      showLabel: true,
      animated: true,
      maxValue: 100,
      ...config
    };
    this.createRing();
  }

  private createRing(): void {
    // Create container
    this.container = new GridLayout();
    this.container.width = this.config.size;
    this.container.height = this.config.size;
    this.container.className = 'progress-ring-container';

    // Create background ring
    const backgroundRing = this.createRingElement(this.config.backgroundColor, 100);
    this.container.addChild(backgroundRing);

    // Create progress ring
    this.progressElement = this.createRingElement(this.config.progressColor, 0);
    this.container.addChild(this.progressElement);

    // Create center content
    const centerContent = new StackLayout();
    centerContent.className = 'progress-ring-center flex justify-center items-center';
    centerContent.width = this.config.size - (this.config.strokeWidth * 4);
    centerContent.height = this.config.size - (this.config.strokeWidth * 4);

    if (this.config.showValue) {
      this.valueLabel = new Label();
      this.valueLabel.text = this.formatValue(0);
      this.valueLabel.className = 'progress-value text-2xl font-bold text-center';
      this.valueLabel.color = new Color(this.config.textColor);
      centerContent.addChild(this.valueLabel);
    }

    if (this.config.showLabel && this.config.label) {
      this.descriptionLabel = new Label();
      this.descriptionLabel.text = this.config.label;
      this.descriptionLabel.className = 'progress-label text-sm text-center text-gray-600';
      this.descriptionLabel.textWrap = true;
      centerContent.addChild(this.descriptionLabel);
    }

    this.container.addChild(centerContent);
    this.addChild(this.container);
  }

  private createRingElement(color: string, percentage: number): Label {
    const ring = new Label();
    ring.className = 'progress-ring-element';
    
    // Create circular progress using Unicode characters and styling
    // This is a simplified approach - in a real app you'd use SVG or Canvas
    const circumference = 2 * Math.PI * (this.config.size / 2 - this.config.strokeWidth);
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    // Use NativeScript properties instead of CSS style
    ring.width = this.config.size;
    ring.height = this.config.size;
    ring.borderRadius = this.config.size / 2;
    ring.borderWidth = this.config.strokeWidth;
    ring.borderColor = new Color(color);
    ring.backgroundColor = new Color('transparent');

    return ring;
  }

  private formatValue(value: number): string {
    const displayValue = Math.round(value);
    if (this.config.unit) {
      return `${displayValue}${this.config.unit}`;
    }
    
    if (this.config.maxValue !== 100) {
      return `${displayValue}/${this.config.maxValue}`;
    }
    
    return `${displayValue}%`;
  }

  async setValue(newValue: number, animated: boolean = true): Promise<void> {
    const clampedValue = Math.max(0, Math.min(newValue, this.config.maxValue || 100));
    const percentage = (clampedValue / (this.config.maxValue || 100)) * 100;

    if (!animated || !this.config.animated) {
      this.currentValue = clampedValue;
      this.updateDisplay(percentage);
      return;
    }

    // Animate the value change
    const startValue = this.currentValue;
    const duration = 1000;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (clampedValue - startValue) * easedProgress;
        const currentPercentage = (currentValue / (this.config.maxValue || 100)) * 100;
        
        this.currentValue = currentValue;
        this.updateDisplay(currentPercentage);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }

  private updateDisplay(percentage: number): void {
    // Update progress ring (simplified)
    if (this.progressElement) {
      // In a real implementation, you'd update the stroke-dashoffset
      this.progressElement.opacity = Math.min(percentage / 100, 1);
    }

    // Update value label
    if (this.valueLabel) {
      this.valueLabel.text = this.formatValue(this.currentValue);
    }
  }

  getValue(): number {
    return this.currentValue;
  }

  setColor(color: string): void {
    this.config.progressColor = color;
    if (this.progressElement) {
      this.progressElement.color = new Color(color);
    }
  }

  setLabel(label: string): void {
    this.config.label = label;
    if (this.descriptionLabel) {
      this.descriptionLabel.text = label;
    }
  }

  // Animation methods
  async animateIn(): Promise<void> {
    if (!this.config.animated) return;

    this.container.opacity = 0;
    this.container.scaleX = 0.5;
    this.container.scaleY = 0.5;

    return this.container.animate({
      opacity: 1,
      scale: { x: 1, y: 1 },
      duration: 500,
      curve: 'easeOut'
    });
  }

  async pulse(): Promise<void> {
    if (!this.config.animated) return;

    return this.container.animate({
      scale: { x: 1.1, y: 1.1 },
      duration: 200,
      curve: 'easeOut'
    }).then(() => {
      return this.container.animate({
        scale: { x: 1, y: 1 },
        duration: 200,
        curve: 'easeIn'
      });
    });
  }

  // Static factory methods
  static create(config: ProgressRingConfig): ProgressRing {
    return new ProgressRing(config);
  }

  static createGoalProgress(current: number, target: number, label: string): ProgressRing {
    return new ProgressRing({
      value: current,
      maxValue: target,
      label: label,
      progressColor: '#10B981',
      unit: 'm'
    });
  }

  static createStreakProgress(currentStreak: number, targetStreak: number): ProgressRing {
    return new ProgressRing({
      value: currentStreak,
      maxValue: targetStreak,
      label: 'Day Streak',
      progressColor: '#F59E0B',
      unit: ''
    });
  }

  static createXPProgress(currentXP: number, nextLevelXP: number): ProgressRing {
    return new ProgressRing({
      value: currentXP,
      maxValue: nextLevelXP,
      label: 'XP to Next Level',
      progressColor: '#8B5CF6',
      unit: ''
    });
  }

  static createConsistencyScore(score: number): ProgressRing {
    let color = '#EF4444'; // Red for low scores
    if (score >= 70) color = '#10B981'; // Green for high scores
    else if (score >= 40) color = '#F59E0B'; // Yellow for medium scores

    return new ProgressRing({
      value: score,
      maxValue: 100,
      label: 'Consistency',
      progressColor: color,
      unit: '%'
    });
  }
}
