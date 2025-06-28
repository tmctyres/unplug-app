import { Observable, View, Color } from '@nativescript/core';
import { ChartConfig, ChartDataPoint, ChartSeries } from '../../models/analytics-data';

export abstract class BaseChart extends Observable {
  protected config: ChartConfig;
  protected containerView: View;
  protected animated: boolean = true;
  protected colors: string[] = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
  ];

  constructor(config: ChartConfig) {
    super();
    this.config = config;
    this.animated = config.animated !== false;
  }

  abstract render(container: View): void;
  abstract updateData(newConfig: ChartConfig): void;
  abstract animateIn(): Promise<void>;

  protected getColorForSeries(index: number): string {
    return this.colors[index % this.colors.length];
  }

  protected formatValue(value: number, unit?: string): string {
    if (unit === 'minutes') {
      if (value < 60) return `${Math.round(value)}m`;
      const hours = Math.floor(value / 60);
      const minutes = Math.round(value % 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    
    if (unit === 'percentage') {
      return `${Math.round(value)}%`;
    }
    
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    
    return Math.round(value).toString();
  }

  protected interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = new Color(color1);
    const c2 = new Color(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    
    return new Color(255, r, g, b).hex;
  }

  protected createGradient(startColor: string, endColor: string): string {
    return `linear-gradient(135deg, ${startColor}, ${endColor})`;
  }

  protected animateValue(
    startValue: number, 
    endValue: number, 
    duration: number, 
    callback: (value: number) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.animated) {
        callback(endValue);
        resolve();
        return;
      }

      const startTime = Date.now();
      const difference = endValue - startValue;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (difference * easedProgress);
        
        callback(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }

  protected getMaxValue(series: ChartSeries[]): number {
    let max = 0;
    series.forEach(s => {
      s.data.forEach(point => {
        if (typeof point.y === 'number' && point.y > max) {
          max = point.y;
        }
      });
    });
    return max;
  }

  protected getMinValue(series: ChartSeries[]): number {
    let min = Infinity;
    series.forEach(s => {
      s.data.forEach(point => {
        if (typeof point.y === 'number' && point.y < min) {
          min = point.y;
        }
      });
    });
    return min === Infinity ? 0 : min;
  }

  protected normalizeValue(value: number, min: number, max: number): number {
    if (max === min) return 0;
    return (value - min) / (max - min);
  }

  protected createSVGPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      // Create smooth curves using quadratic bezier curves
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      
      if (nextPoint) {
        const controlX = currentPoint.x;
        const controlY = currentPoint.y;
        const endX = (currentPoint.x + nextPoint.x) / 2;
        const endY = (currentPoint.y + nextPoint.y) / 2;
        
        path += ` Q ${controlX} ${controlY} ${endX} ${endY}`;
      } else {
        path += ` L ${currentPoint.x} ${currentPoint.y}`;
      }
    }
    
    return path;
  }

  protected debounce(func: Function, wait: number): Function {
    let timeout: any;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Public methods
  setAnimated(animated: boolean): void {
    this.animated = animated;
  }

  getConfig(): ChartConfig {
    return { ...this.config };
  }

  destroy(): void {
    // Cleanup method for removing event listeners, timers, etc.
    this.containerView = null;
  }
}
