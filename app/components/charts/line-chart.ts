import { View, StackLayout, Label, GridLayout, Color } from '@nativescript/core';
import { BaseChart } from './base-chart';
import { ChartConfig } from '../../models/analytics-data';

export class LineChart extends BaseChart {
  private chartContainer: GridLayout;
  private svgContainer: StackLayout;
  private chartWidth: number = 300;
  private chartHeight: number = 200;
  private padding = { top: 20, right: 20, bottom: 40, left: 50 };

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
    this.chartContainer.className = 'chart-container';

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
    
    // Create SVG-like container using StackLayout
    this.svgContainer = new StackLayout();
    this.svgContainer.className = 'svg-container';
    this.svgContainer.width = this.chartWidth;
    this.svgContainer.height = this.chartHeight;
    
    chartArea.addChild(this.svgContainer);
    this.chartContainer.addChild(chartArea);

    // Legend
    if (this.config.showLegend !== false) {
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

    // Calculate chart dimensions
    const plotWidth = this.chartWidth - this.padding.left - this.padding.right;
    const plotHeight = this.chartHeight - this.padding.top - this.padding.bottom;

    // Get data bounds
    const maxValue = this.getMaxValue(this.config.series);
    const minValue = Math.min(0, this.getMinValue(this.config.series));
    const maxDataPoints = Math.max(...this.config.series.map(s => s.data.length));

    // Draw grid lines
    this.drawGrid(plotWidth, plotHeight, maxValue, minValue);

    // Draw axes
    this.drawAxes(plotWidth, plotHeight, maxValue, minValue, maxDataPoints);

    // Draw series
    this.config.series.forEach((series, index) => {
      this.drawSeries(series, index, plotWidth, plotHeight, maxValue, minValue);
    });
  }

  private drawGrid(plotWidth: number, plotHeight: number, maxValue: number, minValue: number): void {
    const gridContainer = new StackLayout();
    gridContainer.className = 'chart-grid absolute';
    
    // Horizontal grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = this.padding.top + (plotHeight * i / gridLines);
      const gridLine = new Label();
      gridLine.text = '─'.repeat(50); // Simulate horizontal line
      gridLine.className = 'grid-line text-gray-200 absolute';
      gridLine.marginTop = y;
      gridLine.marginLeft = this.padding.left;
      gridContainer.addChild(gridLine);
    }

    this.svgContainer.addChild(gridContainer);
  }

  private drawAxes(plotWidth: number, plotHeight: number, maxValue: number, minValue: number, maxDataPoints: number): void {
    // Y-axis labels
    const yAxisContainer = new StackLayout();
    yAxisContainer.className = 'y-axis absolute';
    
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = maxValue - ((maxValue - minValue) * i / ySteps);
      const y = this.padding.top + (plotHeight * i / ySteps);
      
      const label = new Label();
      label.text = this.formatValue(value, this.getValueUnit());
      label.className = 'axis-label text-xs text-gray-500 text-right';
      label.width = this.padding.left - 10;
      label.marginTop = y - 8;
      label.marginLeft = 0;
      
      yAxisContainer.addChild(label);
    }

    // X-axis labels (simplified)
    const xAxisContainer = new StackLayout();
    xAxisContainer.orientation = 'horizontal';
    xAxisContainer.className = 'x-axis flex justify-between mt-2';
    xAxisContainer.marginTop = this.chartHeight - this.padding.bottom + 10;
    xAxisContainer.marginLeft = this.padding.left;
    xAxisContainer.width = plotWidth;

    // Show first, middle, and last data point labels
    if (this.config.series.length > 0 && this.config.series[0].data.length > 0) {
      const firstPoint = this.config.series[0].data[0];
      const lastPoint = this.config.series[0].data[this.config.series[0].data.length - 1];
      
      const firstLabel = new Label();
      firstLabel.text = this.formatXAxisLabel(firstPoint.x);
      firstLabel.className = 'axis-label text-xs text-gray-500';
      
      const lastLabel = new Label();
      lastLabel.text = this.formatXAxisLabel(lastPoint.x);
      lastLabel.className = 'axis-label text-xs text-gray-500';
      
      xAxisContainer.addChild(firstLabel);
      xAxisContainer.addChild(lastLabel);
    }

    this.svgContainer.addChild(yAxisContainer);
    this.svgContainer.addChild(xAxisContainer);
  }

  private drawSeries(series: any, index: number, plotWidth: number, plotHeight: number, maxValue: number, minValue: number): void {
    if (series.data.length === 0) return;

    const color = series.color || this.getColorForSeries(index);
    const seriesContainer = new StackLayout();
    seriesContainer.className = `series-${index} absolute`;

    // Create line path using positioned elements (simplified approach)
    series.data.forEach((point: any, pointIndex: number) => {
      if (pointIndex === 0) return; // Skip first point for line drawing

      const prevPoint = series.data[pointIndex - 1];
      const x1 = this.padding.left + (plotWidth * (pointIndex - 1) / (series.data.length - 1));
      const y1 = this.padding.top + plotHeight - (plotHeight * this.normalizeValue(prevPoint.y, minValue, maxValue));
      const x2 = this.padding.left + (plotWidth * pointIndex / (series.data.length - 1));
      const y2 = this.padding.top + plotHeight - (plotHeight * this.normalizeValue(point.y, minValue, maxValue));

      // Create line segment (simplified using positioned labels)
      const lineSegment = this.createLineSegment(x1, y1, x2, y2, color);
      seriesContainer.addChild(lineSegment);
    });

    // Add data points
    series.data.forEach((point: any, pointIndex: number) => {
      const x = this.padding.left + (plotWidth * pointIndex / (series.data.length - 1));
      const y = this.padding.top + plotHeight - (plotHeight * this.normalizeValue(point.y, minValue, maxValue));

      const dataPoint = new Label();
      dataPoint.text = '●';
      dataPoint.color = new Color(color);
      dataPoint.className = 'data-point text-sm absolute';
      dataPoint.marginLeft = x - 6;
      dataPoint.marginTop = y - 6;
      
      seriesContainer.addChild(dataPoint);
    });

    this.svgContainer.addChild(seriesContainer);
  }

  private createLineSegment(x1: number, y1: number, x2: number, y2: number, color: string): View {
    // This is a simplified line representation
    // In a real implementation, you'd use SVG or Canvas
    const line = new Label();
    line.text = '━';
    line.color = new Color(color);
    line.className = 'line-segment absolute';
    
    // Position the line segment
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    line.marginLeft = midX - 10;
    line.marginTop = midY - 2;
    
    // Calculate rotation (simplified)
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    line.rotate = angle;
    
    return line;
  }

  private formatXAxisLabel(value: any): string {
    if (value instanceof Date) {
      return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return value.toString();
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
    
    // Clear existing chart
    if (this.svgContainer) {
      this.svgContainer.removeChildren();
    }
    
    // Redraw with new data
    this.drawChart();
  }

  async animateIn(): Promise<void> {
    if (!this.animated || !this.chartContainer) return;

    // Animate chart container opacity
    this.chartContainer.opacity = 0;
    this.chartContainer.scaleX = 0.8;
    this.chartContainer.scaleY = 0.8;

    return this.chartContainer.animate({
      opacity: 1,
      scale: { x: 1, y: 1 },
      duration: 600,
      curve: 'easeOut'
    });
  }

  // Static factory method
  static create(config: ChartConfig): LineChart {
    return new LineChart(config);
  }
}
