import { View, StackLayout, Label, GridLayout, Color } from '@nativescript/core';
import { BaseChart } from './base-chart';
import { ChartConfig, ChartDataPoint } from '../../models/analytics-data';

export class BarChart extends BaseChart {
  private chartContainer: GridLayout;
  private barsContainer: StackLayout;
  private chartWidth: number = 300;
  private chartHeight: number = 200;
  private padding = { top: 20, right: 20, bottom: 60, left: 50 };

  constructor(config: ChartConfig) {
    super(config);
  }

  render(container: View): void {
    this.containerView = container;
    this.createChartStructure();
    this.drawChart();
  }

  private createChartStructure(): void {
    // Create main container
    this.chartContainer = new GridLayout();
    this.chartContainer.rows = 'auto, *, auto';
    this.chartContainer.className = 'bar-chart-container';

    // Title
    if (this.config.title) {
      const titleLabel = new Label();
      titleLabel.text = this.config.title;
      titleLabel.className = 'chart-title text-lg font-bold text-gray-800 text-center mb-2';
      GridLayout.setRow(titleLabel, 0);
      this.chartContainer.addChild(titleLabel);
    }

    // Chart area
    const chartArea = new StackLayout();
    chartArea.className = 'chart-area bg-white rounded-lg p-4';
    GridLayout.setRow(chartArea, 1);
    
    // Bars container
    this.barsContainer = new StackLayout();
    this.barsContainer.orientation = 'horizontal';
    this.barsContainer.className = 'bars-container flex justify-between items-end';
    this.barsContainer.width = this.chartWidth;
    this.barsContainer.height = this.chartHeight;
    
    chartArea.addChild(this.barsContainer);
    this.chartContainer.addChild(chartArea);

    // Legend
    if (this.config.showLegend !== false && this.config.series.length > 1) {
      const legend = this.createLegend();
      GridLayout.setRow(legend, 2);
      this.chartContainer.addChild(legend);
    }

    (this.containerView as StackLayout).addChild(this.chartContainer);
  }

  private createLegend(): View {
    const legendContainer = new StackLayout();
    legendContainer.orientation = 'horizontal';
    legendContainer.className = 'chart-legend flex justify-center mt-4';

    this.config.series.forEach((series, index) => {
      const legendItem = new StackLayout();
      legendItem.orientation = 'horizontal';
      legendItem.className = 'legend-item flex items-center mr-4';

      // Color indicator
      const colorBox = new Label();
      colorBox.text = '■';
      colorBox.color = new Color(series.color || this.getColorForSeries(index));
      colorBox.className = 'legend-color text-lg mr-2';

      // Series name
      const nameLabel = new Label();
      nameLabel.text = series.name;
      nameLabel.className = 'legend-name text-sm text-gray-600';

      legendItem.addChild(colorBox);
      legendItem.addChild(nameLabel);
      legendContainer.addChild(legendItem);
    });

    return legendContainer;
  }

  private drawChart(): void {
    if (this.config.series.length === 0) return;

    const maxValue = this.getMaxValue(this.config.series);
    const plotHeight = this.chartHeight - this.padding.top - this.padding.bottom;
    
    // Get all unique x-axis values
    const allXValues = new Set<string>();
    this.config.series.forEach(series => {
      series.data.forEach(point => {
        allXValues.add(String(point.x));
      });
    });
    
    const xValues = Array.from(allXValues);
    const barGroupWidth = (this.chartWidth - this.padding.left - this.padding.right) / xValues.length;
    const barWidth = this.config.series.length > 1 
      ? (barGroupWidth * 0.8) / this.config.series.length 
      : barGroupWidth * 0.8;

    // Draw bars for each x-value
    xValues.forEach((xValue, xIndex) => {
      const barGroup = this.createBarGroup(xValue, xIndex, barGroupWidth, barWidth, plotHeight, maxValue);
      this.barsContainer.addChild(barGroup);
    });
  }

  private createBarGroup(xValue: string, xIndex: number, groupWidth: number, barWidth: number, plotHeight: number, maxValue: number): View {
    const barGroup = new StackLayout();
    barGroup.className = 'bar-group';
    barGroup.width = groupWidth;
    barGroup.height = this.chartHeight;

    // Container for bars
    const barsContainer = new StackLayout();
    barsContainer.orientation = 'horizontal';
    barsContainer.className = 'bars flex justify-center items-end';
    barsContainer.height = plotHeight;

    // Create bars for each series
    this.config.series.forEach((series, seriesIndex) => {
      const dataPoint = series.data.find(point => String(point.x) === xValue);
      if (dataPoint) {
        const bar = this.createBar(dataPoint, seriesIndex, barWidth, plotHeight, maxValue);
        barsContainer.addChild(bar);
      }
    });

    // X-axis label
    const xLabel = new Label();
    xLabel.text = this.formatXAxisLabel(xValue);
    xLabel.className = 'x-axis-label text-xs text-gray-600 text-center mt-2';
    xLabel.textWrap = true;

    barGroup.addChild(barsContainer);
    barGroup.addChild(xLabel);

    return barGroup;
  }

  private createBar(dataPoint: ChartDataPoint, seriesIndex: number, barWidth: number, plotHeight: number, maxValue: number): View {
    const barContainer = new StackLayout();
    barContainer.className = 'bar-container flex flex-col items-center';
    barContainer.width = barWidth;

    // Calculate bar height
    const normalizedValue = this.normalizeValue(dataPoint.y as number, 0, maxValue);
    const barHeight = Math.max(2, plotHeight * normalizedValue);

    // Value label (on top of bar)
    const valueLabel = new Label();
    valueLabel.text = this.formatValue(dataPoint.y as number, this.getValueUnit());
    valueLabel.className = 'bar-value text-xs text-gray-700 text-center mb-1';

    // Bar element
    const bar = new Label();
    bar.text = ''; // Empty text, styling will create the bar
    bar.width = barWidth - 4; // Small margin
    bar.height = 0; // Will be animated to barHeight
    bar.className = 'bar-element rounded-t';
    
    const color = this.config.series[seriesIndex].color || this.getColorForSeries(seriesIndex);
    bar.backgroundColor = color;

    // Store target height for animation
    (bar as any).targetHeight = barHeight;
    (bar as any).dataValue = dataPoint.y;

    barContainer.addChild(valueLabel);
    barContainer.addChild(bar);

    return barContainer;
  }

  private formatXAxisLabel(value: string): string {
    // Handle different x-axis value types
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date format
      const date = new Date(value);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    if (value.length > 8) {
      // Truncate long labels
      return value.substring(0, 8) + '...';
    }
    
    return value;
  }

  private getValueUnit(): string {
    // Try to determine unit from first series data
    if (this.config.series.length > 0 && this.config.series[0].data.length > 0) {
      const firstPoint = this.config.series[0].data[0];
      if (firstPoint.metadata?.unit) {
        return firstPoint.metadata.unit;
      }
    }
    return '';
  }

  updateData(newConfig: ChartConfig): void {
    this.config = newConfig;
    
    // Clear existing bars
    if (this.barsContainer) {
      this.barsContainer.removeChildren();
    }
    
    // Redraw with new data
    this.drawChart();
    
    // Animate new bars
    if (this.animated) {
      this.animateBars();
    }
  }

  async animateIn(): Promise<void> {
    if (!this.animated || !this.chartContainer) return;

    // First animate container
    this.chartContainer.opacity = 0;
    this.chartContainer.scaleY = 0.1;

    await this.chartContainer.animate({
      opacity: 1,
      scale: { x: 1, y: 1 },
      duration: 400,
      curve: 'easeOut'
    });

    // Then animate bars
    return this.animateBars();
  }

  private async animateBars(): Promise<void> {
    if (!this.barsContainer) return;

    const bars: View[] = [];
    
    // Collect all bar elements
    this.barsContainer.eachChild((child) => {
      if (child instanceof StackLayout) {
        child.eachChild((barGroup) => {
          if (barGroup instanceof StackLayout) {
            barGroup.eachChild((barContainer) => {
              if (barContainer instanceof StackLayout) {
                barContainer.eachChild((element) => {
                  if (element instanceof Label && element.className?.includes('bar-element')) {
                    bars.push(element);
                  }
                  return true;
                });
              }
              return true;
            });
          }
          return true;
        });
      }
      return true;
    });

    // Animate each bar with a slight delay
    const animationPromises = bars.map((bar, index) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const targetHeight = (bar as any).targetHeight || 0;
          bar.animate({
            height: targetHeight,
            duration: 600,
            curve: 'easeOut'
          }).then(() => resolve());
        }, index * 100);
      });
    });

    return Promise.all(animationPromises).then(() => {});
  }

  // Static factory methods
  static create(config: ChartConfig): BarChart {
    return new BarChart(config);
  }

  static createWeeklyComparison(weeklyData: { week: string; minutes: number }[]): BarChart {
    return new BarChart({
      title: 'Weekly Progress',
      series: [{
        name: 'Minutes',
        data: weeklyData.map(item => ({
          x: item.week,
          y: item.minutes,
          metadata: { unit: 'minutes' }
        })),
        color: '#3B82F6'
      }],
      showLegend: false
    });
  }

  static createGoalComparison(goals: { name: string; completed: number; target: number }[]): BarChart {
    return new BarChart({
      title: 'Goal Progress',
      series: [
        {
          name: 'Completed',
          data: goals.map(goal => ({ x: goal.name, y: goal.completed })),
          color: '#10B981'
        },
        {
          name: 'Target',
          data: goals.map(goal => ({ x: goal.name, y: goal.target })),
          color: '#E5E7EB'
        }
      ],
      showLegend: true
    });
  }

  static createDailyBreakdown(dailyData: { day: string; sessions: number; minutes: number }[]): BarChart {
    return new BarChart({
      title: 'Daily Activity',
      series: [
        {
          name: 'Sessions',
          data: dailyData.map(item => ({ x: item.day, y: item.sessions })),
          color: '#8B5CF6'
        },
        {
          name: 'Minutes',
          data: dailyData.map(item => ({ x: item.day, y: item.minutes })),
          color: '#06B6D4'
        }
      ],
      showLegend: true
    });
  }
}
