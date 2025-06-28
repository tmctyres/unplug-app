import { EventData, Page } from '@nativescript/core';
import { AnalyticsDashboardViewModel } from '../view-models/analytics-dashboard-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new AnalyticsDashboardViewModel();
}
